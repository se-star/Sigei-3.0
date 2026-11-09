import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Actividad, ID, Nuevo, Perfil, Tabla, Tablas } from '../types';
import type { AuthProvider, DataProvider, Sesion } from './provider';

/**
 * Modo nube: Supabase (PostgreSQL + Auth). El esquema, las políticas RLS y los
 * disparadores de auditoría están en supabase/migrations.
 */
export function crearCliente(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // PKCE devuelve el código en ?code=… y deja libre el # que usa el enrutador.
      flowType: 'pkce',
    },
  });
}

function fallo(error: { message: string; code?: string } | null): asserts error is null {
  if (!error) return;
  if (error.code === '42501') throw new Error('No tiene permisos para realizar esta acción.');
  if (error.code === '23505') throw new Error('Ya existe un registro con esos datos.');
  if (error.code === '23503') throw new Error('Este registro está relacionado con otros datos y no se puede eliminar.');
  throw new Error(error.message);
}

export class SupabaseDataProvider implements DataProvider {
  readonly modo = 'supabase' as const;
  constructor(private sb: SupabaseClient) {}

  async list<T extends Tabla>(tabla: T): Promise<Tablas[T][]> {
    const { data, error } = await this.sb.from(tabla).select('*').order('created_at', { ascending: true });
    fallo(error);
    return (data ?? []) as Tablas[T][];
  }

  async create<T extends Tabla>(tabla: T, datos: Nuevo<Tablas[T]>): Promise<Tablas[T]> {
    const { data, error } = await this.sb.from(tabla).insert(datos).select().single();
    fallo(error);
    return data as Tablas[T];
  }

  async update<T extends Tabla>(tabla: T, id: ID, cambios: Partial<Tablas[T]>): Promise<Tablas[T]> {
    const { id: _ignorado, created_at: _c, updated_at: _u, ...resto } = cambios as Record<string, unknown>;
    void _ignorado;
    void _c;
    void _u;
    const { data, error } = await this.sb.from(tabla).update(resto).eq('id', id).select().single();
    fallo(error);
    return data as Tablas[T];
  }

  async remove(tabla: Tabla, id: ID): Promise<void> {
    const { error } = await this.sb.from(tabla).delete().eq('id', id);
    fallo(error);
  }

  async bulkUpsert<T extends Tabla>(tabla: T, filas: Tablas[T][]): Promise<void> {
    for (let i = 0; i < filas.length; i += 500) {
      const { error } = await this.sb.from(tabla).upsert(filas.slice(i, i + 500));
      fallo(error);
    }
  }

  async actividad(limite = 200): Promise<Actividad[]> {
    const { data, error } = await this.sb
      .from('actividad')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite);
    fallo(error);
    return (data ?? []) as Actividad[];
  }
}

/** Dirección de esta app (sin el #), a la que regresan los enlaces de los correos. */
function urlDeRetorno() {
  return window.location.origin + window.location.pathname;
}

export class SupabaseAuthProvider implements AuthProvider {
  readonly modo = 'supabase' as const;
  private recuperando = false;
  private oyentesRecuperacion = new Set<() => void>();

  constructor(private sb: SupabaseClient) {
    // Se registra al crear el cliente para no perder el evento si llega antes de montar la UI.
    sb.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') {
        this.recuperando = true;
        this.oyentesRecuperacion.forEach((cb) => cb());
      }
    });
  }

  onRecuperacion(cb: () => void) {
    this.oyentesRecuperacion.add(cb);
    if (this.recuperando) cb();
    return () => {
      this.oyentesRecuperacion.delete(cb);
    };
  }

  async cambiarClave(nueva: string) {
    const { error } = await this.sb.auth.updateUser({ password: nueva });
    if (error) {
      if (error.message.toLowerCase().includes('different from the old')) throw new Error('La contraseña nueva debe ser distinta de la anterior.');
      if (error.message.toLowerCase().includes('at least')) throw new Error('La contraseña es demasiado corta.');
      throw new Error(error.message);
    }
    this.recuperando = false;
  }

  private async perfilDe(userId: string): Promise<Sesion | null> {
    const { data, error } = await this.sb.from('perfiles').select('*').eq('id', userId).maybeSingle();
    if (error || !data) return null;
    const perfil = data as Perfil;
    if (!perfil.activo) {
      await this.sb.auth.signOut();
      throw new Error('Su cuenta aún no ha sido activada o fue desactivada. Comuníquese con la administración.');
    }
    return { perfil };
  }

  async sesionActual(): Promise<Sesion | null> {
    const { data } = await this.sb.auth.getSession();
    if (!data.session) return null;
    return this.perfilDe(data.session.user.id);
  }

  onCambio(cb: (s: Sesion | null) => void) {
    const { data } = this.sb.auth.onAuthStateChange((evento, session) => {
      if (evento === 'SIGNED_OUT' || !session) return cb(null);
      if (evento === 'SIGNED_IN' || evento === 'USER_UPDATED' || evento === 'PASSWORD_RECOVERY') {
        // Fuera del callback para no bloquear el cliente de auth.
        setTimeout(() => {
          this.perfilDe(session.user.id)
            .then(cb)
            .catch(() => cb(null));
        }, 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }

  async ingresar(email: string, clave: string): Promise<Sesion> {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password: clave });
    if (error) {
      if (error.message.includes('Invalid login')) throw new Error('Correo o contraseña incorrectos.');
      if (error.message.includes('Email not confirmed')) throw new Error('Debe confirmar su correo antes de ingresar.');
      throw new Error(error.message);
    }
    const sesion = await this.perfilDe(data.user.id);
    if (!sesion) throw new Error('Su usuario no tiene un perfil asignado en SIGEI.');
    return sesion;
  }

  async registrarse(nombre: string, email: string, clave: string) {
    const { error } = await this.sb.auth.signUp({
      email,
      password: clave,
      options: { data: { nombre }, emailRedirectTo: urlDeRetorno() },
    });
    if (error) throw new Error(error.message);
  }

  async recuperarClave(email: string) {
    const { error } = await this.sb.auth.resetPasswordForEmail(email, { redirectTo: urlDeRetorno() });
    if (error) throw new Error(error.message);
  }

  async salir() {
    await this.sb.auth.signOut();
  }
}
