import type {
  Audiencia,
  EstadoDocente,
  EstadoNovedad,
  EstadoTarea,
  FormatoGrupo,
  Jornada,
  Nivel,
  Prioridad,
  Rol,
  TipoEvento,
  TipoNovedad,
  TipoSeguimiento,
  Vinculacion,
} from './types';

export type Tono = 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'info' | 'violet' | 'lime';

export interface Opcion<V extends string = string> {
  valor: V;
  etiqueta: string;
  tono?: Tono;
}

const op = <V extends string>(valor: V, etiqueta: string, tono?: Tono): Opcion<V> => ({ valor, etiqueta, tono });

export const ROLES: Opcion<Rol>[] = [
  op('admin', 'Administrador', 'violet'),
  op('rector', 'Rectoría', 'brand'),
  op('coordinador', 'Coordinación', 'info'),
  op('docente', 'Docente', 'neutral'),
];

export const ESTADOS_DOCENTE: Opcion<EstadoDocente>[] = [
  op('activo', 'Activo', 'ok'),
  op('licencia', 'En licencia', 'warn'),
  op('inactivo', 'Inactivo', 'neutral'),
  op('retirado', 'Retirado', 'danger'),
];

export const VINCULACIONES: Opcion<Vinculacion>[] = [
  op('planta', 'Planta'),
  op('provisional', 'Provisional'),
  op('temporal', 'Temporal'),
  op('catedra', 'Hora cátedra'),
  op('contratista', 'Contratista'),
];

export const NIVELES: Opcion<Nivel>[] = [
  op('preescolar', 'Preescolar', 'lime'),
  op('primaria', 'Básica primaria', 'info'),
  op('secundaria', 'Básica secundaria', 'brand'),
  op('media', 'Media', 'violet'),
];

export const JORNADAS: Opcion<Jornada>[] = [
  op('manana', 'Mañana'),
  op('tarde', 'Tarde'),
  op('unica', 'Única'),
  op('nocturna', 'Nocturna'),
  op('fin_de_semana', 'Fin de semana'),
];

export const FORMATOS_GRUPO: { valor: FormatoGrupo; etiqueta: string; ejemplo: string }[] = [
  { valor: 'grado', etiqueta: 'Grado y número', ejemplo: '6°1, 6°2, 11°1' },
  { valor: 'numero', etiqueta: 'Numérico', ejemplo: '601, 602, 1101' },
  { valor: 'letra', etiqueta: 'Grado y letra', ejemplo: '6A, 6B, 11A' },
  { valor: 'guion', etiqueta: 'Grado, guion y número', ejemplo: '6-1, 6-2, 11-1' },
];

/**
 * Grados oficiales en Colombia (preescolar, básica y media), con el código corto
 * que se usa en el nombre de los grupos.
 */
export const GRADOS_COLOMBIA: { nombre: string; nivel: Nivel; orden: number; codigo: string }[] = [
  { nombre: 'Prejardín', nivel: 'preescolar', orden: 0, codigo: 'PJ' },
  { nombre: 'Jardín', nivel: 'preescolar', orden: 1, codigo: 'J' },
  { nombre: 'Transición', nivel: 'preescolar', orden: 2, codigo: '0' },
  { nombre: 'Primero', nivel: 'primaria', orden: 3, codigo: '1' },
  { nombre: 'Segundo', nivel: 'primaria', orden: 4, codigo: '2' },
  { nombre: 'Tercero', nivel: 'primaria', orden: 5, codigo: '3' },
  { nombre: 'Cuarto', nivel: 'primaria', orden: 6, codigo: '4' },
  { nombre: 'Quinto', nivel: 'primaria', orden: 7, codigo: '5' },
  { nombre: 'Sexto', nivel: 'secundaria', orden: 8, codigo: '6' },
  { nombre: 'Séptimo', nivel: 'secundaria', orden: 9, codigo: '7' },
  { nombre: 'Octavo', nivel: 'secundaria', orden: 10, codigo: '8' },
  { nombre: 'Noveno', nivel: 'secundaria', orden: 11, codigo: '9' },
  { nombre: 'Décimo', nivel: 'media', orden: 12, codigo: '10' },
  { nombre: 'Undécimo', nivel: 'media', orden: 13, codigo: '11' },
];

export const TIPOS_NOVEDAD: Opcion<TipoNovedad>[] = [
  op('permiso_personal', 'Permiso personal'),
  op('incapacidad', 'Incapacidad médica'),
  op('calamidad', 'Calamidad doméstica'),
  op('licencia', 'Licencia'),
  op('comision', 'Comisión de servicio'),
  op('capacitacion', 'Capacitación'),
  op('otro', 'Otro'),
];

export const ESTADOS_NOVEDAD: Opcion<EstadoNovedad>[] = [
  op('pendiente', 'Pendiente', 'warn'),
  op('aprobada', 'Aprobada', 'ok'),
  op('rechazada', 'Rechazada', 'danger'),
  op('anulada', 'Anulada', 'neutral'),
];

export const TIPOS_SEGUIMIENTO: Opcion<TipoSeguimiento>[] = [
  op('visita_aula', 'Visita de aula'),
  op('planeacion', 'Revisión de planeación'),
  op('evaluacion', 'Evaluación de desempeño'),
  op('entrevista', 'Entrevista'),
  op('otro', 'Otro'),
];

export const TIPOS_EVENTO: Opcion<TipoEvento>[] = [
  op('academico', 'Académico', 'brand'),
  op('institucional', 'Institucional', 'info'),
  op('cultural', 'Cultural', 'violet'),
  op('deportivo', 'Deportivo', 'warn'),
  op('reunion', 'Reunión', 'neutral'),
  op('festivo', 'Festivo', 'danger'),
  op('otro', 'Otro', 'lime'),
];

export const PRIORIDADES: Opcion<Prioridad>[] = [
  op('baja', 'Baja', 'neutral'),
  op('normal', 'Normal', 'info'),
  op('alta', 'Alta', 'danger'),
];

export const AUDIENCIAS: Opcion<Audiencia>[] = [
  op('todos', 'Toda la comunidad'),
  op('docentes', 'Docentes'),
  op('directivos', 'Directivos'),
];

export const ESTADOS_TAREA: Opcion<EstadoTarea>[] = [
  op('pendiente', 'Por hacer', 'neutral'),
  op('en_progreso', 'En curso', 'info'),
  op('hecha', 'Hecha', 'ok'),
];

export const DIAS = [
  { valor: 1, corto: 'Lun', largo: 'Lunes' },
  { valor: 2, corto: 'Mar', largo: 'Martes' },
  { valor: 3, corto: 'Mié', largo: 'Miércoles' },
  { valor: 4, corto: 'Jue', largo: 'Jueves' },
  { valor: 5, corto: 'Vie', largo: 'Viernes' },
  { valor: 6, corto: 'Sáb', largo: 'Sábado' },
] as const;

export function etiqueta<V extends string>(lista: Opcion<V>[], valor: V | null | undefined): string {
  return lista.find((o) => o.valor === valor)?.etiqueta ?? (valor || '—');
}

export function tono<V extends string>(lista: Opcion<V>[], valor: V | null | undefined): Tono {
  return lista.find((o) => o.valor === valor)?.tono ?? 'neutral';
}
