import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Actividad, ID, MiInstitucion, Miembro, Nuevo, ResumenInstitucion, Rol, Soporte, Tabla, Tablas } from '../types';
import { TABLAS_INSTITUCIONALES } from '../types';
import { armarSesion, institucionGuardada, nombreSeguro, normalizarDocumento, type AuthProvider, type DataProvider, type InstitucionPublica, type Sesion } from './provider';
import { esErrorDeRed, hostDe, mensajeSinConexion } from './conexion';

/**
 * Modo nube: Supabase (PostgreSQL + Auth). El esquema, las políticas RLS y los
 * disparadores de auditoría están en supabase/migrations.
 */
let host = '';

/** Convierte errores de red en un mensaje claro en español. */
function traducir(e: unknown): Error {
  if (esErrorDeRed(e)) return new Error(mensajeSinConexion(host));
  const msg = String((e as { message?: string })?.message ?? e);
  if (/invalid api key|no api key/i.test(msg))
    return new Error('La clave guardada en VITE_SUPABASE_ANON_KEY no es válida para este proyecto. Copie de nuevo la clave publishable o anon.');
  return e instanceof Error ? e : new Error(String((e as { message?: string })?.message ?? e));
}

export function crearCliente(url: string, anonKey: string): SupabaseClient {
  host = hostDe(url);
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
  if (esErrorDeRed(error)) throw traducir(error);
  if (error.code === '42501') throw new Error('No tiene permisos para realizar esta acción.');
  if (error.code === '23505') throw new Error('Ya existe un registro con esos datos.');
  if (error.code === '23503') throw new Error('Este registro está relacionado con otros datos y no se puede eliminar.');
  if (error.code === '42P01' || /relation .* does not exist|Could not find the table/i.test(error.message))
    throw new Error('La base de datos no está actualizada. Ejecute en Supabase la migración más reciente (supabase/migrations).');
  throw new Error(error.message);
}

const esInstitucional = (t: string) => (TABLAS_INSTITUCIONALES as readonly string[]).includes(t);

export class SupabaseDataProvider implements DataProvider {
  readonly modo = 'supabase' as const;
  private inst: ID | null = null;
  constructor(private sb: SupabaseClient) {}

  fijarInstitucion(id: ID | null) {
    this.inst = id;
  }

  private exigirInstitucion(): ID {
    if (!this.inst) throw new Error('Elija una institución para continuar.');
    return this.inst;
  }

  async list<T extends Tabla>(tabla: T): Promise<Tablas[T][]> {
    let q = this.sb.from(tabla).select('*');
    if (esInstitucional(tabla)) q = q.eq('institucion_id', this.exigirInstitucion());
    const { data, error } = await q.order('created_at', { ascending: true });
    fallo(error);
    return (data ?? []) as Tablas[T][];
  }

  async create<T extends Tabla>(tabla: T, datos: Nuevo<Tablas[T]>): Promise<Tablas[T]> {
    const fila = esInstitucional(tabla) ? { ...datos, institucion_id: this.exigirInstitucion() } : datos;
    const { data, error } = await this.sb.from(tabla).insert(fila).select().single();
    fallo(error);
    return data as Tablas[T];
  }

  async update<T extends Tabla>(tabla: T, id: ID, cambios: Partial<Tablas[T]>): Promise<Tablas[T]> {
    const { id: _i, created_at: _c, updated_at: _u, institucion_id: _n, ...resto } = cambios as Record<string, unknown>;
    void _i;
    void _c;
    void _u;
    void _n;
    let q = this.sb.from(tabla).update(resto).eq('id', id);
    if (esInstitucional(tabla)) q = q.eq('institucion_id', this.exigirInstitucion());
    const { data, error } = await q.select().single();
    fallo(error);
    return data as Tablas[T];
  }

  async remove(tabla: Tabla, id: ID): Promise<void> {
    let q = this.sb.from(tabla).delete().eq('id', id);
    if (esInstitucional(tabla)) q = q.eq('institucion_id', this.exigirInstitucion());
    const { error } = await q;
    fallo(error);
  }

  async bulkUpsert<T extends Tabla>(tabla: T, filas: Tablas[T][]): Promise<void> {
    const inst = esInstitucional(tabla) ? this.exigirInstitucion() : null;
    const marcadas = inst ? filas.map((f) => ({ ...f, institucion_id: inst })) : filas;
    for (let i = 0; i < marcadas.length; i += 500) {
      const { error } = await this.sb.from(tabla).upsert(marcadas.slice(i, i + 500));
      fallo(error);
    }
  }

  async actividad(limite = 200): Promise<Actividad[]> {
    const { data, error } = await this.sb
      .from('actividad')
      .select('*')
      .eq('institucion_id', this.exigirInstitucion())
      .order('created_at', { ascending: false })
      .limit(limite);
    fallo(error);
    return (data ?? []) as Actividad[];
  }

  async miembros(): Promise<Miembro[]> {
    const { data, error } = await this.sb
      .from('membresias')
      .select('usuario_id, rol, docente_id, activo, perfiles(nombre, email)')
      .eq('institucion_id', this.exigirInstitucion());
    fallo(error);
    type Fila = { usuario_id: ID; rol: Rol; docente_id: ID | null; activo: boolean; perfiles: { nombre: string; email: string } | null };
    return ((data ?? []) as unknown as Fila[]).map((m) => ({
      id: m.usuario_id,
      nombre: m.perfiles?.nombre ?? '—',
      email: m.perfiles?.email ?? '',
      rol: m.rol,
      docente_id: m.docente_id,
      activo: m.activo,
    }));
  }

  async actualizarMiembro(usuarioId: ID, cambios: Partial<Pick<Miembro, 'rol' | 'docente_id' | 'activo'>>) {
    const { error } = await this.sb
      .from('membresias')
      .update(cambios)
      .eq('usuario_id', usuarioId)
      .eq('institucion_id', this.exigirInstitucion());
    fallo(error);
  }

  async quitarMiembro(usuarioId: ID) {
    const { error } = await this.sb.from('membresias').delete().eq('usuario_id', usuarioId).eq('institucion_id', this.exigirInstitucion());
    fallo(error);
  }

  async agregarMiembro(correo: string, rol: Rol) {
    return this.agregarMiembroEn(this.exigirInstitucion(), correo, rol);
  }

  async agregarMiembroEn(institucionId: ID, correo: string, rol: Rol): Promise<'agregado' | 'no_registrado'> {
    const { data, error } = await this.sb.rpc('agregar_miembro', { inst: institucionId, correo, nuevo_rol: rol });
    fallo(error);
    return data as 'agregado' | 'no_registrado';
  }

  async subirSoporte(archivo: File, docenteId: ID): Promise<Soporte> {
    const inst = this.exigirInstitucion();
    const ruta = `${inst}/${docenteId}/${crypto.randomUUID().slice(0, 8)}-${nombreSeguro(archivo.name)}`;
    const { error } = await this.sb.storage.from('soportes').upload(ruta, archivo, { contentType: archivo.type, upsert: false });
    if (error) {
      if (/bucket not found/i.test(error.message)) throw new Error('Falta activar los soportes: ejecute en Supabase la migración 0003_acceso_docentes.sql.');
      if (/row-level security|unauthorized|403/i.test(error.message)) throw new Error('No tiene permiso para adjuntar soportes a esta solicitud.');
      if (/exceeded|too large|413/i.test(error.message)) throw new Error(`“${archivo.name}” supera el tamaño permitido (5 MB).`);
      throw traducir(error);
    }
    return { ruta, nombre: archivo.name, tipo: archivo.type, tamano: archivo.size };
  }

  async urlSoporte(ruta: string): Promise<string> {
    const { data, error } = await this.sb.storage.from('soportes').createSignedUrl(ruta, 300);
    if (error || !data) throw new Error('No fue posible abrir el soporte. Puede que ya no exista o que no tenga permiso para verlo.');
    return data.signedUrl;
  }

  async borrarSoportes(rutas: string[]) {
    if (!rutas.length) return;
    await this.sb.storage.from('soportes').remove(rutas);
  }

  async resumenInstituciones(): Promise<ResumenInstitucion[]> {
    const { data, error } = await this.sb.rpc('resumen_instituciones');
    fallo(error);
    return ((data ?? []) as ResumenInstitucion[]).map((r) => ({
      ...r,
      docentes: Number(r.docentes),
      grupos: Number(r.grupos),
      estudiantes: Number(r.estudiantes),
      usuarios: Number(r.usuarios),
      pendientes: Number(r.pendientes),
    }));
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

  /** Arma la sesión: perfil global + instituciones con su rol en cada una. */
  private async perfilDe(userId: string, preferida?: ID | null): Promise<Sesion | null> {
    // Vincula la cuenta con los registros docentes que tengan su correo (si la base ya tiene la función).
    await this.sb.rpc('vincular_mis_docentes').then(
      () => undefined,
      () => undefined,
    );
    const { data: p, error } = await this.sb.from('perfiles').select('id, nombre, email, es_superadmin').eq('id', userId).maybeSingle();
    if (error) {
      if (/column .*es_superadmin|does not exist/i.test(error.message))
        throw new Error('La base de datos no está actualizada. Ejecute en Supabase la migración 0002_multiples_instituciones.sql.');
      throw traducir(error);
    }
    if (!p) return null;
    const { data: ms, error: e2 } = await this.sb
      .from('membresias')
      .select('institucion_id, rol, docente_id, activo, instituciones(nombre, sigla, activa)')
      .eq('usuario_id', userId);
    if (e2) throw traducir(e2);
    type Fila = { institucion_id: ID; rol: Rol; docente_id: ID | null; activo: boolean; instituciones: { nombre: string; sigla: string; activa: boolean } | null };
    const mias = (ms ?? []) as unknown as Fila[];
    let lista: (MiInstitucion & { docente_id: ID | null })[] = mias
      .filter((m) => m.instituciones && (m.instituciones.activa || p.es_superadmin))
      .map((m) => ({ id: m.institucion_id, nombre: m.instituciones!.nombre, sigla: m.instituciones!.sigla, rol: m.rol, docente_id: m.docente_id, activo: m.activo }));
    if (p.es_superadmin) {
      // El superadministrador puede entrar a todas, como administrador si no tiene otro rol.
      const { data: todas } = await this.sb.from('instituciones').select('id, nombre, sigla').order('nombre');
      lista = (todas ?? []).map((i) => {
        const m = lista.find((x) => x.id === i.id);
        return { id: i.id, nombre: i.nombre, sigla: i.sigla, rol: m && m.activo ? m.rol : 'admin', docente_id: m?.docente_id ?? null, activo: true };
      });
    }
    return armarSesion(p, lista, preferida ?? institucionGuardada(userId));
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
      if (esErrorDeRed(error) || /api key/i.test(error.message)) throw traducir(error);
      if (error.message.includes('Invalid login')) throw new Error('Correo o contraseña incorrectos.');
      if (error.message.includes('Email not confirmed')) throw new Error('Debe confirmar su correo antes de ingresar.');
      throw new Error(error.message);
    }
    const sesion = await this.perfilDe(data.user.id);
    if (!sesion) throw new Error('Su usuario no tiene un perfil asignado en SIGEI.');
    return sesion;
  }

  private async usuarioId(): Promise<ID> {
    const { data } = await this.sb.auth.getSession();
    if (!data.session) throw new Error('Su sesión terminó. Ingrese de nuevo.');
    return data.session.user.id;
  }

  async cambiarInstitucion(id: ID): Promise<Sesion> {
    const s = await this.perfilDe(await this.usuarioId(), id);
    if (!s || s.perfil.institucion_id !== id) throw new Error('No tiene acceso a esa institución.');
    return s;
  }

  async refrescar() {
    const { data } = await this.sb.auth.getSession();
    return data.session ? this.perfilDe(data.session.user.id) : null;
  }

  async institucionesPublicas(): Promise<InstitucionPublica[]> {
    const { data, error } = await this.sb.rpc('instituciones_publicas');
    if (error) throw traducir(error);
    return (data ?? []) as InstitucionPublica[];
  }

  async solicitarAcceso(institucionId: ID) {
    const { error } = await this.sb.from('membresias').insert({ usuario_id: await this.usuarioId(), institucion_id: institucionId });
    if (error?.code === '23505') throw new Error('Ya tiene acceso o una solicitud pendiente en esa institución.');
    fallo(error);
  }

  /** Llama a la función del servidor acceso-docente y traduce sus errores. */
  private async accesoDocente<T>(cuerpo: Record<string, string>): Promise<T> {
    const { data, error } = await this.sb.functions.invoke('acceso-docente', { body: cuerpo });
    if (error) {
      const ctx = (error as { context?: Response }).context;
      let mensaje = '';
      let estado = 0;
      if (ctx && typeof ctx.json === 'function') {
        estado = ctx.status;
        try {
          const j = await ctx.json();
          mensaje = j?.error ?? j?.message ?? '';
        } catch {
          /* respuesta sin JSON */
        }
      }
      if (estado === 404 && /function was not found|not found/i.test(mensaje))
        throw new Error('El ingreso con documento aún no está activado. Pida a la administración de SIGEI que instale la función acceso-docente.');
      if (mensaje) throw new Error(mensaje);
      if (esErrorDeRed(error)) throw traducir(error);
      throw new Error('No fue posible completar el ingreso. Intente de nuevo en un momento.');
    }
    return data as T;
  }

  async solicitarCodigoDocente(documento: string) {
    return this.accesoDocente<{ destinos: string[] }>({ accion: 'enviar', documento: normalizarDocumento(documento) });
  }

  async ingresarConCodigo(documento: string, codigo: string): Promise<Sesion> {
    const t = await this.accesoDocente<{ access_token: string; refresh_token: string }>({
      accion: 'verificar',
      documento: normalizarDocumento(documento),
      codigo: codigo.replace(/\D/g, ''),
    });
    const { data, error } = await this.sb.auth.setSession({ access_token: t.access_token, refresh_token: t.refresh_token });
    if (error || !data.user) throw new Error('No fue posible abrir la sesión. Pida un código nuevo.');
    const sesion = await this.perfilDe(data.user.id);
    if (!sesion) throw new Error('Su usuario no tiene un perfil en SIGEI.');
    return sesion;
  }

  async registrarse(nombre: string, email: string, clave: string, institucionId?: ID) {
    const { error } = await this.sb.auth.signUp({
      email,
      password: clave,
      options: { data: { nombre, institucion_id: institucionId ?? '' }, emailRedirectTo: urlDeRetorno() },
    });
    if (error) {
      if (error.message.toLowerCase().includes('already registered')) throw new Error('Ya existe una cuenta con ese correo. Use “Ingresar” o recupere su contraseña.');
      throw traducir(error);
    }
  }

  async recuperarClave(email: string) {
    const { error } = await this.sb.auth.resetPasswordForEmail(email, { redirectTo: urlDeRetorno() });
    if (error) throw traducir(error);
  }

  async salir() {
    await this.sb.auth.signOut();
  }
}
