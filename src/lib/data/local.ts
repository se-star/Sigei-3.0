import type { Actividad, ID, MiInstitucion, Miembro, Nuevo, ResumenInstitucion, Rol, Tabla, Tablas } from '../types';
import { TABLAS_INSTITUCIONALES } from '../types';
import { armarSesion, institucionGuardada, type AuthProvider, type DataProvider, type InstitucionPublica, type Sesion } from './provider';
import { crearDatosDemo, DEMO_ALMENDROS, DEMO_SAN_RAFAEL } from './seed';

/**
 * Modo demo: guarda todo en localStorage de este navegador. Se usa cuando no hay
 * variables de Supabase configuradas, para probar SIGEI sin servidor. Imita el
 * modelo de la nube: varias instituciones, membresías y un superadministrador.
 */
const PREFIJO = 'sigei.demo.';
const VERSION = '2'; // cambia cuando cambia la forma de los datos de ejemplo
const CLAVE_SESION = 'sigei.demo.sesion';
const CLAVE_LISTO = 'sigei.demo.listo';

interface PerfilDemo {
  id: ID;
  nombre: string;
  email: string;
  es_superadmin: boolean;
}
interface MembresiaDemo {
  usuario_id: ID;
  institucion_id: ID;
  rol: Rol;
  docente_id: ID | null;
  activo: boolean;
}

function leer<T>(clave: string, defecto: T): T {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : defecto;
  } catch {
    return defecto;
  }
}

function escribir(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* almacenamiento lleno o bloqueado: el modo demo sigue en memoria de la página */
  }
}

export function uid(): ID {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const esInstitucional = (t: string) => (TABLAS_INSTITUCIONALES as readonly string[]).includes(t);

function resumenDe(fila: Record<string, unknown>): string {
  const nombre = [fila.nombres, fila.apellidos].filter(Boolean).join(' ');
  return String(fila.titulo ?? fila.nombre ?? (nombre || fila.tipo || fila.id || ''));
}

export function sembrarSiHaceFalta() {
  if (localStorage.getItem(CLAVE_LISTO) === VERSION) return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIJO))
    .forEach((k) => localStorage.removeItem(k));
  const a = crearDatosDemo(DEMO_ALMENDROS);
  const b = crearDatosDemo(DEMO_SAN_RAFAEL);
  for (const tabla of Object.keys(a) as (keyof typeof a)[]) {
    escribir(PREFIJO + tabla, [...a[tabla], ...b[tabla]]);
  }
  escribir(PREFIJO + 'actividad', []);
  escribir(PREFIJO + 'perfiles', []);
  escribir(PREFIJO + 'membresias', []);
  localStorage.setItem(CLAVE_LISTO, VERSION);
}

export function reiniciarDemo() {
  localStorage.removeItem(CLAVE_LISTO);
  const sesion = localStorage.getItem(CLAVE_SESION);
  sembrarSiHaceFalta();
  if (sesion) localStorage.setItem(CLAVE_SESION, sesion);
}

const espera = () => new Promise((r) => setTimeout(r, 60));

export class LocalDataProvider implements DataProvider {
  readonly modo = 'demo' as const;
  private inst: ID | null = null;

  constructor(private usuarioActual: () => string) {
    sembrarSiHaceFalta();
  }

  fijarInstitucion(id: ID | null) {
    this.inst = id;
  }

  private registrar(accion: Actividad['accion'], tabla: Tabla, fila: Record<string, unknown>) {
    const inst = tabla === 'instituciones' ? String(fila.id) : this.inst;
    if (!inst) return;
    const log = leer<(Actividad & { institucion_id: ID })[]>(PREFIJO + 'actividad', []);
    log.unshift({
      id: uid(),
      institucion_id: inst,
      created_at: new Date().toISOString(),
      usuario: this.usuarioActual(),
      accion,
      tabla,
      registro_id: String(fila.id ?? ''),
      resumen: resumenDe(fila),
    });
    escribir(PREFIJO + 'actividad', log.slice(0, 1000));
  }

  private todas<T extends Tabla>(tabla: T): Tablas[T][] {
    return leer<Tablas[T][]>(PREFIJO + tabla, []);
  }

  async list<T extends Tabla>(tabla: T): Promise<Tablas[T][]> {
    await espera();
    const filas = this.todas(tabla);
    if (!esInstitucional(tabla)) return filas;
    return filas.filter((f) => f.institucion_id === this.inst);
  }

  async create<T extends Tabla>(tabla: T, datos: Nuevo<Tablas[T]>): Promise<Tablas[T]> {
    await espera();
    const filas = this.todas(tabla);
    const ahora = new Date().toISOString();
    const fila = {
      ...datos,
      ...(esInstitucional(tabla) ? { institucion_id: this.inst } : {}),
      id: datos.id ?? uid(),
      created_at: ahora,
      updated_at: ahora,
    } as unknown as Tablas[T];
    filas.push(fila);
    escribir(PREFIJO + tabla, filas);
    this.registrar('crear', tabla, fila as unknown as Record<string, unknown>);
    return fila;
  }

  async update<T extends Tabla>(tabla: T, id: ID, cambios: Partial<Tablas[T]>): Promise<Tablas[T]> {
    await espera();
    const filas = this.todas(tabla);
    const i = filas.findIndex((f) => f.id === id && (!esInstitucional(tabla) || f.institucion_id === this.inst));
    if (i < 0) throw new Error('El registro ya no existe.');
    const { institucion_id: _ignorada, ...resto } = cambios as Record<string, unknown>;
    void _ignorada;
    filas[i] = { ...filas[i], ...resto, id, updated_at: new Date().toISOString() };
    escribir(PREFIJO + tabla, filas);
    this.registrar('editar', tabla, filas[i] as unknown as Record<string, unknown>);
    return filas[i];
  }

  async remove(tabla: Tabla, id: ID): Promise<void> {
    await espera();
    const filas = this.todas(tabla) as { id: ID; institucion_id?: ID }[];
    const fila = filas.find((f) => f.id === id && (!esInstitucional(tabla) || f.institucion_id === this.inst));
    if (!fila) return;
    escribir(
      PREFIJO + tabla,
      filas.filter((f) => f !== fila),
    );
    if (tabla === 'instituciones') {
      // Al eliminar una institución se van con ella sus datos y membresías.
      for (const t of TABLAS_INSTITUCIONALES)
        escribir(PREFIJO + t, (this.todas(t) as { institucion_id?: ID }[]).filter((f) => f.institucion_id !== id));
      escribir(PREFIJO + 'membresias', leer<MembresiaDemo[]>(PREFIJO + 'membresias', []).filter((m) => m.institucion_id !== id));
      return;
    }
    this.registrar('eliminar', tabla, fila as unknown as Record<string, unknown>);
  }

  async bulkUpsert<T extends Tabla>(tabla: T, nuevas: Tablas[T][]): Promise<void> {
    const filas = this.todas(tabla);
    const porId = new Map(filas.map((f) => [f.id, f]));
    for (const n of nuevas) porId.set(n.id, { ...porId.get(n.id), ...n, ...(esInstitucional(tabla) ? { institucion_id: this.inst } : {}) } as Tablas[T]);
    escribir(PREFIJO + tabla, [...porId.values()]);
  }

  async actividad(limite = 200): Promise<Actividad[]> {
    await espera();
    return leer<(Actividad & { institucion_id: ID })[]>(PREFIJO + 'actividad', [])
      .filter((a) => a.institucion_id === this.inst)
      .slice(0, limite);
  }

  async miembros(): Promise<Miembro[]> {
    await espera();
    const perfiles = leer<PerfilDemo[]>(PREFIJO + 'perfiles', []);
    return leer<MembresiaDemo[]>(PREFIJO + 'membresias', [])
      .filter((m) => m.institucion_id === this.inst)
      .map((m) => {
        const p = perfiles.find((x) => x.id === m.usuario_id);
        return { id: m.usuario_id, nombre: p?.nombre ?? '—', email: p?.email ?? '', rol: m.rol, docente_id: m.docente_id, activo: m.activo };
      });
  }

  async actualizarMiembro(usuarioId: ID, cambios: Partial<Pick<Miembro, 'rol' | 'docente_id' | 'activo'>>) {
    await espera();
    const lista = leer<MembresiaDemo[]>(PREFIJO + 'membresias', []);
    const m = lista.find((x) => x.usuario_id === usuarioId && x.institucion_id === this.inst);
    if (!m) throw new Error('La persona ya no está vinculada a esta institución.');
    Object.assign(m, cambios);
    escribir(PREFIJO + 'membresias', lista);
  }

  async quitarMiembro(usuarioId: ID) {
    await espera();
    escribir(
      PREFIJO + 'membresias',
      leer<MembresiaDemo[]>(PREFIJO + 'membresias', []).filter((m) => !(m.usuario_id === usuarioId && m.institucion_id === this.inst)),
    );
  }

  async agregarMiembro(correo: string, rol: Rol) {
    if (!this.inst) throw new Error('Elija una institución.');
    return this.agregarMiembroEn(this.inst, correo, rol);
  }

  async agregarMiembroEn(institucionId: ID, correo: string, rol: Rol): Promise<'agregado' | 'no_registrado'> {
    await espera();
    const p = leer<PerfilDemo[]>(PREFIJO + 'perfiles', []).find((x) => x.email.toLowerCase() === correo.trim().toLowerCase());
    if (!p) return 'no_registrado';
    const lista = leer<MembresiaDemo[]>(PREFIJO + 'membresias', []);
    const m = lista.find((x) => x.usuario_id === p.id && x.institucion_id === institucionId);
    if (m) Object.assign(m, { rol, activo: true });
    else lista.push({ usuario_id: p.id, institucion_id: institucionId, rol, docente_id: null, activo: true });
    escribir(PREFIJO + 'membresias', lista);
    return 'agregado';
  }

  async resumenInstituciones(): Promise<ResumenInstitucion[]> {
    await espera();
    const docentes = this.todas('docentes');
    const grupos = this.todas('grupos');
    const membresias = leer<MembresiaDemo[]>(PREFIJO + 'membresias', []);
    return this.todas('instituciones').map((i) => ({
      institucion_id: i.id,
      docentes: docentes.filter((d) => d.institucion_id === i.id && d.estado !== 'retirado').length,
      grupos: grupos.filter((g) => g.institucion_id === i.id).length,
      estudiantes: grupos.filter((g) => g.institucion_id === i.id).reduce((s, g) => s + g.estudiantes, 0),
      usuarios: membresias.filter((m) => m.institucion_id === i.id && m.activo).length,
      pendientes: membresias.filter((m) => m.institucion_id === i.id && !m.activo).length,
    }));
  }
}

/* ───────── Autenticación demo ───────── */

type RolDemo = Rol | 'superadmin';

/** Usuarios de ejemplo y sus membresías. Laura es docente en las dos instituciones. */
const USUARIOS_DEMO: Record<RolDemo, { id: ID; nombre: string; email: string; super?: boolean; membresias: Omit<MembresiaDemo, 'usuario_id'>[] }> = {
  superadmin: { id: 'demo-super', nombre: 'Superadministración', email: 'super@demo.sigei', super: true, membresias: [] },
  admin: {
    id: 'demo-admin',
    nombre: 'Administración IELA',
    email: 'admin@demo.sigei',
    membresias: [{ institucion_id: 'iela', rol: 'admin', docente_id: null, activo: true }],
  },
  rector: {
    id: 'demo-rector',
    nombre: 'Rectoría IELA',
    email: 'rector@demo.sigei',
    membresias: [{ institucion_id: 'iela', rol: 'rector', docente_id: null, activo: true }],
  },
  coordinador: {
    id: 'demo-coord',
    nombre: 'Coordinación Académica',
    email: 'coordinacion@demo.sigei',
    membresias: [
      { institucion_id: 'iela', rol: 'coordinador', docente_id: null, activo: true },
      { institucion_id: 'iesr', rol: 'coordinador', docente_id: null, activo: true },
    ],
  },
  docente: {
    id: 'demo-docente',
    nombre: 'Laura Marcela Restrepo Gil',
    email: 'laura.restrepo@demo.sigei',
    membresias: [
      { institucion_id: 'iela', rol: 'docente', docente_id: 'Laura Marcela', activo: true },
      { institucion_id: 'iesr', rol: 'docente', docente_id: 'Laura Marcela', activo: true },
    ],
  },
};

export class LocalAuthProvider implements AuthProvider {
  readonly modo = 'demo' as const;
  private oyentes = new Set<(s: Sesion | null) => void>();

  private usuario(): PerfilDemo | null {
    return leer<PerfilDemo | null>(CLAVE_SESION, null);
  }

  private construir(preferida?: ID | null): Sesion | null {
    const u = this.usuario();
    if (!u) return null;
    const perfiles = leer<PerfilDemo[]>(PREFIJO + 'perfiles', []);
    const p = perfiles.find((x) => x.id === u.id) ?? u;
    const insts = leer<Tablas['instituciones'][]>(PREFIJO + 'instituciones', []);
    const mias = leer<MembresiaDemo[]>(PREFIJO + 'membresias', []).filter((m) => m.usuario_id === p.id);
    const lista: (MiInstitucion & { docente_id: ID | null })[] = p.es_superadmin
      ? insts.map((i) => {
          const m = mias.find((x) => x.institucion_id === i.id);
          return { id: i.id, nombre: i.nombre, sigla: i.sigla, rol: m?.rol ?? 'admin', docente_id: m?.docente_id ?? null, activo: true };
        })
      : mias
          .map((m) => {
            const i = insts.find((x) => x.id === m.institucion_id);
            return i && i.activa ? { id: i.id, nombre: i.nombre, sigla: i.sigla, rol: m.rol, docente_id: m.docente_id, activo: m.activo } : null;
          })
          .filter((x): x is MiInstitucion & { docente_id: ID | null } => !!x);
    return armarSesion(p, lista, preferida ?? institucionGuardada(p.id));
  }

  async sesionActual(): Promise<Sesion | null> {
    return this.construir();
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

  async ingresarDemo(rol: RolDemo): Promise<Sesion> {
    sembrarSiHaceFalta();
    const def = USUARIOS_DEMO[rol];
    const perfiles = leer<PerfilDemo[]>(PREFIJO + 'perfiles', []);
    if (!perfiles.some((p) => p.id === def.id)) {
      perfiles.push({ id: def.id, nombre: def.nombre, email: def.email, es_superadmin: !!def.super });
      escribir(PREFIJO + 'perfiles', perfiles);
      const membresias = leer<MembresiaDemo[]>(PREFIJO + 'membresias', []);
      const docentes = leer<Tablas['docentes'][]>(PREFIJO + 'docentes', []);
      for (const m of def.membresias) {
        if (membresias.some((x) => x.usuario_id === def.id && x.institucion_id === m.institucion_id)) continue;
        // En los usuarios de ejemplo, docente_id trae el nombre; se resuelve al registro de esa institución.
        const doc = m.docente_id ? docentes.find((d) => d.institucion_id === m.institucion_id && d.nombres === m.docente_id) : undefined;
        membresias.push({ ...m, docente_id: doc?.id ?? null, usuario_id: def.id });
      }
      escribir(PREFIJO + 'membresias', membresias);
    }
    escribir(CLAVE_SESION, { id: def.id, nombre: def.nombre, email: def.email, es_superadmin: !!def.super });
    const s = this.construir()!;
    this.emitir(s);
    return s;
  }

  async cambiarInstitucion(id: ID): Promise<Sesion> {
    const s = this.construir(id);
    if (!s || s.perfil.institucion_id !== id) throw new Error('No tiene acceso a esa institución.');
    return s;
  }

  async refrescar() {
    return this.construir();
  }

  async institucionesPublicas(): Promise<InstitucionPublica[]> {
    return leer<Tablas['instituciones'][]>(PREFIJO + 'instituciones', [])
      .filter((i) => i.activa)
      .map((i) => ({ id: i.id, nombre: i.nombre, municipio: i.municipio }));
  }

  async solicitarAcceso(institucionId: ID) {
    const u = this.usuario();
    if (!u) throw new Error('Inicie sesión primero.');
    const lista = leer<MembresiaDemo[]>(PREFIJO + 'membresias', []);
    if (lista.some((m) => m.usuario_id === u.id && m.institucion_id === institucionId)) throw new Error('Ya tiene acceso o una solicitud en esa institución.');
    lista.push({ usuario_id: u.id, institucion_id: institucionId, rol: 'docente', docente_id: null, activo: false });
    escribir(PREFIJO + 'membresias', lista);
  }

  async salir() {
    localStorage.removeItem(CLAVE_SESION);
    this.emitir(null);
  }
}
