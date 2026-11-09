/** Modelo de datos de SIGEI 3.0. Refleja las tablas de supabase/migrations. */

export type ID = string;

export type Rol = 'admin' | 'rector' | 'coordinador' | 'docente';

export interface Base {
  id: ID;
  created_at?: string;
  updated_at?: string;
  /** Institución a la que pertenece el registro (la asigna la capa de datos). */
  institucion_id?: ID;
}

/**
 * Usuario con sesión, visto desde la institución en la que está trabajando:
 * rol, docente vinculado y estado corresponden a esa institución.
 */
export interface Perfil {
  id: ID;
  nombre: string;
  email: string;
  es_superadmin: boolean;
  /** Institución actual ('' si todavía no tiene ninguna activa). */
  institucion_id: ID;
  rol: Rol;
  docente_id: ID | null;
  activo: boolean;
}

/** Persona vinculada a la institución actual (para Usuarios y roles, Tareas…). */
export interface Miembro {
  id: ID; // id del usuario
  nombre: string;
  email: string;
  rol: Rol;
  docente_id: ID | null;
  activo: boolean;
}

/** Institución a la que el usuario tiene acceso o ha pedido acceso. */
export interface MiInstitucion {
  id: ID;
  nombre: string;
  sigla: string;
  rol: Rol;
  /** false = solicitud pendiente de aprobación. */
  activo: boolean;
}

export interface ResumenInstitucion {
  institucion_id: ID;
  docentes: number;
  grupos: number;
  estudiantes: number;
  usuarios: number;
  pendientes: number;
}

export interface Sede extends Base {
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  principal: boolean;
}

export interface Area extends Base {
  nombre: string;
  color: string;
}

export interface Asignatura extends Base {
  nombre: string;
  area_id: ID | null;
}

export type EstadoDocente = 'activo' | 'licencia' | 'inactivo' | 'retirado';
export type Vinculacion = 'planta' | 'provisional' | 'temporal' | 'catedra' | 'contratista';

export interface Docente extends Base {
  documento: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string | null;
  genero: 'F' | 'M' | 'O' | '';
  area_id: ID | null;
  sede_id: ID | null;
  vinculacion: Vinculacion;
  escalafon: string;
  cargo: string;
  estado: EstadoDocente;
  carga_maxima: number;
  fecha_ingreso: string | null;
  notas: string;
}

export type Nivel = 'preescolar' | 'primaria' | 'secundaria' | 'media';
export type Jornada = 'manana' | 'tarde' | 'unica' | 'nocturna' | 'fin_de_semana';

/** Formato del nombre de los grupos: 6°1, 601, 6A o 6-1. */
export type FormatoGrupo = 'grado' | 'numero' | 'letra' | 'guion';

export interface Grado extends Base {
  nombre: string;
  nivel: Nivel;
  orden: number;
}

export interface Grupo extends Base {
  grado_id: ID;
  nombre: string;
  jornada: Jornada;
  sede_id: ID | null;
  director_id: ID | null;
  capacidad: number;
  estudiantes: number;
}

export interface Asignacion extends Base {
  docente_id: ID;
  grupo_id: ID;
  asignatura_id: ID;
  horas_semanales: number;
}

/** 1 = lunes … 6 = sábado */
export type Dia = 1 | 2 | 3 | 4 | 5 | 6;

export interface BloqueHorario extends Base {
  grupo_id: ID;
  asignatura_id: ID;
  docente_id: ID | null;
  dia: Dia;
  hora_inicio: string; // HH:MM
  hora_fin: string; // HH:MM
  aula: string;
}

export type TipoNovedad =
  | 'permiso_personal'
  | 'incapacidad'
  | 'calamidad'
  | 'licencia'
  | 'comision'
  | 'capacitacion'
  | 'otro';
export type EstadoNovedad = 'pendiente' | 'aprobada' | 'rechazada' | 'anulada';

export interface Novedad extends Base {
  docente_id: ID;
  tipo: TipoNovedad;
  fecha_inicio: string;
  fecha_fin: string;
  horas: number;
  motivo: string;
  estado: EstadoNovedad;
  reemplazo_id: ID | null;
  revisado_por: string | null;
  revisado_en: string | null;
  observacion_revision: string;
  creado_por: ID | null;
  /** Archivos de soporte (incapacidad, citación…), guardados en un espacio privado. */
  soportes?: Soporte[];
}

export interface Soporte {
  ruta: string;
  nombre: string;
  tipo: string;
  tamano: number;
}

export type TipoSeguimiento = 'visita_aula' | 'planeacion' | 'evaluacion' | 'entrevista' | 'otro';

export interface CriterioValorado {
  criterio: string;
  valor: number; // 1..4
}

export interface Seguimiento extends Base {
  docente_id: ID;
  grupo_id: ID | null;
  fecha: string;
  tipo: TipoSeguimiento;
  criterios: CriterioValorado[];
  fortalezas: string;
  oportunidades: string;
  compromisos: string;
  estado: 'borrador' | 'socializado';
  observador: string;
}

export type TipoEvento = 'academico' | 'institucional' | 'cultural' | 'deportivo' | 'reunion' | 'festivo' | 'otro';

export interface Evento extends Base {
  titulo: string;
  tipo: TipoEvento;
  fecha_inicio: string;
  fecha_fin: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  lugar: string;
  responsable: string;
  descripcion: string;
}

export type Prioridad = 'baja' | 'normal' | 'alta';
export type Audiencia = 'todos' | 'docentes' | 'directivos';

export interface Comunicado extends Base {
  titulo: string;
  contenido: string;
  prioridad: Prioridad;
  audiencia: Audiencia;
  fijado: boolean;
  autor: string;
  publicado_en: string;
}

export type EstadoTarea = 'pendiente' | 'en_progreso' | 'hecha';

export interface Tarea extends Base {
  titulo: string;
  descripcion: string;
  estado: EstadoTarea;
  prioridad: Prioridad;
  fecha_limite: string | null;
  responsable_id: ID | null;
  creado_por: ID | null;
}

export interface Actividad {
  id: ID;
  created_at: string;
  usuario: string;
  accion: 'crear' | 'editar' | 'eliminar';
  tabla: string;
  registro_id: string | null;
  resumen: string;
}

/** Institución educativa y su configuración. */
export interface Institucion extends Base {
  nombre: string;
  activa: boolean;
  sigla: string;
  codigo_dane: string;
  nit: string;
  municipio: string;
  rector: string;
  anio_lectivo: number;
  periodos: number;
  logo_url: string;
  franjas: Franja[];
  criterios_seguimiento: string[];
  formato_grupo: FormatoGrupo;
  jornadas: Jornada[];
}

/** Configuración institucional (alias histórico). */
export type Ajustes = Institucion;

export interface Franja {
  inicio: string;
  fin: string;
  descanso?: boolean;
}

/** Mapa tabla → tipo de registro. */
export interface Tablas {
  instituciones: Institucion;
  sedes: Sede;
  areas: Area;
  asignaturas: Asignatura;
  docentes: Docente;
  grados: Grado;
  grupos: Grupo;
  asignaciones: Asignacion;
  horarios: BloqueHorario;
  novedades: Novedad;
  seguimientos: Seguimiento;
  eventos: Evento;
  comunicados: Comunicado;
  tareas: Tarea;
}

/** Tablas cuyos registros pertenecen a una institución. */
export const TABLAS_INSTITUCIONALES = [
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
] as const satisfies readonly (keyof Tablas)[];

export type Tabla = keyof Tablas;
export type Nuevo<T> = Omit<T, 'id' | 'created_at' | 'updated_at'> & { id?: ID };
