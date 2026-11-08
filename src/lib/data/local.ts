import type { Actividad, ID, Nuevo, Perfil, Rol, Tabla, Tablas } from '../types';
import type { AuthProvider, DataProvider, Sesion } from './provider';
import { crearDatosDemo } from './seed';

/**
 * Modo demo: guarda todo en localStorage de este navegador. Se usa cuando no hay
 * variables de Supabase configuradas, para probar SIGEI sin servidor.
 */
const PREFIJO = 'sigei.demo.';
const CLAVE_SESION = 'sigei.demo.sesion';
const CLAVE_LISTO = 'sigei.demo.listo';

function leer<T>(clave: string, defecto: T): T {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : defecto;
  } catch {
    return defecto;
  }
}

function escribir(clave: string, valor: unknown) {
  localStorage.setItem(clave, JSON.stringify(valor));
}

export function uid(): ID {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function resumenDe(fila: Record<string, unknown>): string {
  const nombre = [fila.nombres, fila.apellidos].filter(Boolean).join(' ');
  return String(fila.titulo ?? fila.nombre ?? (nombre || fila.tipo || fila.id || ''));
}

export function sembrarSiHaceFalta() {
  if (localStorage.getItem(CLAVE_LISTO)) return;
  const datos = crearDatosDemo();
  for (const [tabla, filas] of Object.entries(datos)) escribir(PREFIJO + tabla, filas);
  escribir(PREFIJO + 'actividad', []);
  localStorage.setItem(CLAVE_LISTO, '1');
}

export function reiniciarDemo() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIJO) && k !== CLAVE_SESION)
    .forEach((k) => localStorage.removeItem(k));
  sembrarSiHaceFalta();
}

const espera = () => new Promise((r) => setTimeout(r, 60));

export class LocalDataProvider implements DataProvider {
  readonly modo = 'demo' as const;
  constructor(private usuarioActual: () => string) {
    sembrarSiHaceFalta();
  }

  private registrar(accion: Actividad['accion'], tabla: Tabla, fila: Record<string, unknown>) {
    if (tabla === 'perfiles') return;
    const log = leer<Actividad[]>(PREFIJO + 'actividad', []);
    log.unshift({
      id: uid(),
      created_at: new Date().toISOString(),
      usuario: this.usuarioActual(),
      accion,
      tabla,
      registro_id: String(fila.id ?? ''),
      resumen: resumenDe(fila),
    });
    escribir(PREFIJO + 'actividad', log.slice(0, 500));
  }

  async list<T extends Tabla>(tabla: T): Promise<Tablas[T][]> {
    await espera();
    return leer<Tablas[T][]>(PREFIJO + tabla, []);
  }

  async create<T extends Tabla>(tabla: T, datos: Nuevo<Tablas[T]>): Promise<Tablas[T]> {
    await espera();
    const filas = leer<Tablas[T][]>(PREFIJO + tabla, []);
    const ahora = new Date().toISOString();
    const fila = { ...datos, id: datos.id ?? uid(), created_at: ahora, updated_at: ahora } as unknown as Tablas[T];
    filas.push(fila);
    escribir(PREFIJO + tabla, filas);
    this.registrar('crear', tabla, fila as unknown as Record<string, unknown>);
    return fila;
  }

  async update<T extends Tabla>(tabla: T, id: ID, cambios: Partial<Tablas[T]>): Promise<Tablas[T]> {
    await espera();
    const filas = leer<Tablas[T][]>(PREFIJO + tabla, []);
    const i = filas.findIndex((f) => f.id === id);
    if (i < 0) throw new Error('El registro ya no existe.');
    filas[i] = { ...filas[i], ...cambios, id, updated_at: new Date().toISOString() };
    escribir(PREFIJO + tabla, filas);
    this.registrar('editar', tabla, filas[i] as unknown as Record<string, unknown>);
    return filas[i];
  }

  async remove(tabla: Tabla, id: ID): Promise<void> {
    await espera();
    const filas = leer<{ id: ID }[]>(PREFIJO + tabla, []);
    const fila = filas.find((f) => f.id === id);
    escribir(
      PREFIJO + tabla,
      filas.filter((f) => f.id !== id),
    );
    if (fila) this.registrar('eliminar', tabla, fila as unknown as Record<string, unknown>);
  }

  async bulkUpsert<T extends Tabla>(tabla: T, nuevas: Tablas[T][]): Promise<void> {
    const filas = leer<Tablas[T][]>(PREFIJO + tabla, []);
    const porId = new Map(filas.map((f) => [f.id, f]));
    for (const n of nuevas) porId.set(n.id, { ...porId.get(n.id), ...n });
    escribir(PREFIJO + tabla, [...porId.values()]);
  }

  async actividad(limite = 200): Promise<Actividad[]> {
    await espera();
    return leer<Actividad[]>(PREFIJO + 'actividad', []).slice(0, limite);
  }
}

const NOMBRES_DEMO: Record<Rol, string> = {
  admin: 'Administración SIGEI',
  rector: 'Rectoría',
  coordinador: 'Coordinación Académica',
  docente: '',
};

export class LocalAuthProvider implements AuthProvider {
  readonly modo = 'demo' as const;
  private oyentes = new Set<(s: Sesion | null) => void>();

  async sesionActual(): Promise<Sesion | null> {
    return leer<Sesion | null>(CLAVE_SESION, null);
  }

  onCambio(cb: (s: Sesion | null) => void) {
    this.oyentes.add(cb);
    return () => {
      this.oyentes.delete(cb);
    };
  }

  private emitir(s: Sesion | null) {
    this.oyentes.forEach((cb) => cb(s));
  }

  async ingresar(): Promise<Sesion> {
    return this.ingresarDemo('admin');
  }

  async ingresarDemo(rol: Rol): Promise<Sesion> {
    sembrarSiHaceFalta();
    let perfil: Perfil;
    const perfiles = leer<Perfil[]>(PREFIJO + 'perfiles', []);
    const existente = perfiles.find((p) => p.rol === rol);
    if (existente) {
      perfil = existente;
    } else {
      const docentes = leer<Tablas['docentes'][]>(PREFIJO + 'docentes', []);
      const doc = rol === 'docente' ? docentes[0] : undefined;
      perfil = {
        id: uid(),
        nombre: doc ? `${doc.nombres} ${doc.apellidos}` : NOMBRES_DEMO[rol],
        email: doc ? doc.email : `${rol}@demo.sigei`,
        rol,
        docente_id: doc?.id ?? null,
        activo: true,
      };
      escribir(PREFIJO + 'perfiles', [...perfiles, perfil]);
    }
    const sesion = { perfil };
    escribir(CLAVE_SESION, sesion);
    this.emitir(sesion);
    return sesion;
  }

  async salir() {
    localStorage.removeItem(CLAVE_SESION);
    this.emitir(null);
  }
}
