import type { Actividad, ID, MiInstitucion, Miembro, Nuevo, Perfil, ResumenInstitucion, Rol, Tabla, Tablas } from '../types';

/**
 * Contrato único de acceso a datos. La app nunca habla directamente con Supabase
 * ni con localStorage: lo hace a través de un DataProvider. Así el modo demo y el
 * modo nube se comportan igual.
 *
 * Los datos institucionales siempre se leen y escriben en la institución fijada
 * con fijarInstitucion(); la tabla de instituciones no se filtra.
 */
export interface DataProvider {
  readonly modo: 'supabase' | 'demo';
  fijarInstitucion(id: ID | null): void;
  list<T extends Tabla>(tabla: T): Promise<Tablas[T][]>;
  create<T extends Tabla>(tabla: T, datos: Nuevo<Tablas[T]>): Promise<Tablas[T]>;
  update<T extends Tabla>(tabla: T, id: ID, cambios: Partial<Tablas[T]>): Promise<Tablas[T]>;
  remove(tabla: Tabla, id: ID): Promise<void>;
  /** Inserta varios registros en la institución actual (restauración de respaldos). */
  bulkUpsert<T extends Tabla>(tabla: T, filas: Tablas[T][]): Promise<void>;
  actividad(limite?: number): Promise<Actividad[]>;

  /* Personas de la institución actual */
  miembros(): Promise<Miembro[]>;
  actualizarMiembro(usuarioId: ID, cambios: Partial<Pick<Miembro, 'rol' | 'docente_id' | 'activo'>>): Promise<void>;
  quitarMiembro(usuarioId: ID): Promise<void>;
  /** Agrega por correo a alguien ya registrado. */
  agregarMiembro(correo: string, rol: Rol): Promise<'agregado' | 'no_registrado'>;

  /* Plataforma (superadministrador) */
  resumenInstituciones(): Promise<ResumenInstitucion[]>;
  agregarMiembroEn(institucionId: ID, correo: string, rol: Rol): Promise<'agregado' | 'no_registrado'>;
}

export interface Sesion {
  perfil: Perfil;
  /** Instituciones a las que tiene acceso o ha pedido acceso. */
  instituciones: MiInstitucion[];
}

export interface InstitucionPublica {
  id: ID;
  nombre: string;
  municipio: string;
}

export interface AuthProvider {
  readonly modo: 'supabase' | 'demo';
  sesionActual(): Promise<Sesion | null>;
  onCambio(cb: (s: Sesion | null) => void): () => void;
  ingresar(email: string, clave: string): Promise<Sesion>;
  /** Cambia la institución de trabajo y devuelve la sesión recalculada. */
  cambiarInstitucion(id: ID): Promise<Sesion>;
  /** Recalcula la sesión (por ejemplo, tras activar una membresía). */
  refrescar(): Promise<Sesion | null>;
  institucionesPublicas(): Promise<InstitucionPublica[]>;
  solicitarAcceso(institucionId: ID): Promise<void>;
  registrarse?(nombre: string, email: string, clave: string, institucionId?: ID): Promise<void>;
  recuperarClave?(email: string): Promise<void>;
  /** Cambia la contraseña del usuario con sesión activa. */
  cambiarClave?(nueva: string): Promise<void>;
  /** Avisa cuando el usuario llega desde el enlace de recuperar contraseña. */
  onRecuperacion?(cb: () => void): () => void;
  ingresarDemo?(rol: Rol | 'superadmin'): Promise<Sesion>;
  salir(): Promise<void>;
}

/** Tablas que se incluyen en un respaldo de una institución, en orden de dependencia. */
export const TABLAS_RESPALDO: Tabla[] = [
  'sedes',
  'areas',
  'asignaturas',
  'docentes',
  'grados',
  'grupos',
  'asignaciones',
  'horarios',
  'novedades',
  'seguimientos',
  'eventos',
  'comunicados',
  'tareas',
];

/** Campos que apuntan a otros registros (para copiar respaldos con identificadores nuevos). */
export const CAMPOS_RELACION = [
  'area_id',
  'sede_id',
  'docente_id',
  'grado_id',
  'grupo_id',
  'director_id',
  'asignatura_id',
  'reemplazo_id',
] as const;

/** Clave de localStorage con la última institución usada por cada usuario. */
export const claveInstitucion = (usuarioId: ID) => `sigei.institucion.${usuarioId}`;

export function institucionGuardada(usuarioId: ID): ID | null {
  try {
    return localStorage.getItem(claveInstitucion(usuarioId));
  } catch {
    return null;
  }
}

export function guardarInstitucion(usuarioId: ID, id: ID) {
  try {
    localStorage.setItem(claveInstitucion(usuarioId), id);
  } catch {
    /* sin almacenamiento */
  }
}

/** Arma la sesión a partir del perfil global y las instituciones disponibles. */
export function armarSesion(
  base: { id: ID; nombre: string; email: string; es_superadmin: boolean },
  instituciones: (MiInstitucion & { docente_id: ID | null })[],
  preferida?: ID | null,
): Sesion {
  const usables = instituciones.filter((i) => i.activo);
  const actual = usables.find((i) => i.id === preferida) ?? usables[0];
  const perfil: Perfil = {
    ...base,
    institucion_id: actual?.id ?? '',
    rol: actual?.rol ?? 'docente',
    docente_id: actual?.docente_id ?? null,
    activo: !!actual,
  };
  if (actual) guardarInstitucion(base.id, actual.id);
  return {
    perfil,
    instituciones: instituciones.map(({ docente_id: _d, ...i }) => (void _d, i)),
  };
}
