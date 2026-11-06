import type { Rol } from './types';

/**
 * Matriz de permisos por módulo. "ver" muestra el módulo en el menú;
 * "editar" habilita crear, modificar y eliminar. Las mismas reglas están
 * reforzadas en la base de datos con políticas RLS (supabase/migrations).
 */
export type Modulo =
  | 'inicio'
  | 'docentes'
  | 'grupos'
  | 'asignacion'
  | 'horarios'
  | 'novedades'
  | 'seguimiento'
  | 'calendario'
  | 'comunicados'
  | 'tareas'
  | 'reportes'
  | 'usuarios'
  | 'sedes'
  | 'actividad'
  | 'configuracion';

type Nivel = 'no' | 'ver' | 'editar';

const MATRIZ: Record<Modulo, Record<Rol, Nivel>> = {
  inicio: { admin: 'editar', rector: 'editar', coordinador: 'editar', docente: 'ver' },
  docentes: { admin: 'editar', rector: 'editar', coordinador: 'editar', docente: 'ver' },
  grupos: { admin: 'editar', rector: 'editar', coordinador: 'editar', docente: 'ver' },
  asignacion: { admin: 'editar', rector: 'editar', coordinador: 'editar', docente: 'ver' },
  horarios: { admin: 'editar', rector: 'editar', coordinador: 'editar', docente: 'ver' },
  // Los docentes pueden radicar sus propias novedades; solo directivos aprueban.
  novedades: { admin: 'editar', rector: 'editar', coordinador: 'editar', docente: 'ver' },
  seguimiento: { admin: 'editar', rector: 'editar', coordinador: 'editar', docente: 'ver' },
  calendario: { admin: 'editar', rector: 'editar', coordinador: 'editar', docente: 'ver' },
  comunicados: { admin: 'editar', rector: 'editar', coordinador: 'editar', docente: 'ver' },
  tareas: { admin: 'editar', rector: 'editar', coordinador: 'editar', docente: 'editar' },
  reportes: { admin: 'editar', rector: 'editar', coordinador: 'editar', docente: 'no' },
  usuarios: { admin: 'editar', rector: 'ver', coordinador: 'no', docente: 'no' },
  sedes: { admin: 'editar', rector: 'editar', coordinador: 'ver', docente: 'ver' },
  actividad: { admin: 'editar', rector: 'ver', coordinador: 'no', docente: 'no' },
  configuracion: { admin: 'editar', rector: 'editar', coordinador: 'no', docente: 'no' },
};

export function puedeVer(rol: Rol | undefined, m: Modulo): boolean {
  return !!rol && MATRIZ[m][rol] !== 'no';
}

export function puedeEditar(rol: Rol | undefined, m: Modulo): boolean {
  return !!rol && MATRIZ[m][rol] === 'editar';
}

/** ¿Puede aprobar o rechazar novedades? */
export function puedeAprobar(rol: Rol | undefined): boolean {
  return rol === 'admin' || rol === 'rector' || rol === 'coordinador';
}

export function nivel(rol: Rol, m: Modulo): Nivel {
  return MATRIZ[m][rol];
}

export const MODULOS = Object.keys(MATRIZ) as Modulo[];
