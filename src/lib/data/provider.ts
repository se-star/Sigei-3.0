import type { Actividad, ID, Nuevo, Perfil, Rol, Tabla, Tablas } from '../types';

/**
 * Contrato único de acceso a datos. La app nunca habla directamente con Supabase
 * ni con localStorage: lo hace a través de un DataProvider. Así el modo demo y el
 * modo nube se comportan igual.
 */
export interface DataProvider {
  readonly modo: 'supabase' | 'demo';
  list<T extends Tabla>(tabla: T): Promise<Tablas[T][]>;
  create<T extends Tabla>(tabla: T, datos: Nuevo<Tablas[T]>): Promise<Tablas[T]>;
  update<T extends Tabla>(tabla: T, id: ID, cambios: Partial<Tablas[T]>): Promise<Tablas[T]>;
  remove(tabla: Tabla, id: ID): Promise<void>;
  /** Inserta varios registros (importaciones y restauración de respaldos). */
  bulkUpsert<T extends Tabla>(tabla: T, filas: Tablas[T][]): Promise<void>;
  actividad(limite?: number): Promise<Actividad[]>;
}

export interface Sesion {
  perfil: Perfil;
}

export interface AuthProvider {
  readonly modo: 'supabase' | 'demo';
  sesionActual(): Promise<Sesion | null>;
  onCambio(cb: (s: Sesion | null) => void): () => void;
  ingresar(email: string, clave: string): Promise<Sesion>;
  registrarse?(nombre: string, email: string, clave: string): Promise<void>;
  recuperarClave?(email: string): Promise<void>;
  /** Cambia la contraseña del usuario con sesión activa. */
  cambiarClave?(nueva: string): Promise<void>;
  /** Avisa cuando el usuario llega desde el enlace de recuperar contraseña. */
  onRecuperacion?(cb: () => void): () => void;
  ingresarDemo?(rol: Rol): Promise<Sesion>;
  salir(): Promise<void>;
}

/** Tablas que se incluyen en un respaldo completo, en orden de dependencia. */
export const TABLAS_RESPALDO: Tabla[] = [
  'ajustes',
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
