/**
 * Lógica del programador de clases (asignación académica sobre el horario):
 * qué hay en cada franja y cómo se mantiene la asignación al día con las
 * clases que se programan o se quitan.
 */
import type { Asignacion, BloqueHorario, Dia, Franja, ID } from './types';
import { duracionHoras, seSolapan } from './utils';

/** Horas de clase que cuenta un bloque (una franja = 1 hora de clase, aunque dure 50 o 55 minutos). */
export const horasDe = (b: { hora_inicio: string; hora_fin: string }) => Math.max(1, Math.round(duracionHoras(b.hora_inicio, b.hora_fin)));

export const claveCelda = (dia: Dia, f: Pick<Franja, 'inicio'>) => `${dia}|${f.inicio}`;

export interface Combinacion {
  docente_id: ID;
  grupo_id: ID;
  asignatura_id: ID;
}

export type EstadoCelda =
  | { tipo: 'libre' }
  /** Ya es una clase de la combinación elegida (docente + grupo + asignatura). */
  | { tipo: 'propia'; bloque: BloqueHorario }
  /** El docente ya tiene clase a esa hora (en otro grupo u otra asignatura). */
  | { tipo: 'docente'; bloque: BloqueHorario }
  /** El grupo ya tiene clase a esa hora con otra asignatura o docente. */
  | { tipo: 'grupo'; bloque: BloqueHorario }
  /** El aula elegida ya está ocupada a esa hora. */
  | { tipo: 'aula'; bloque: BloqueHorario };

/** Qué hay en una franja de un día para el docente y el grupo elegidos. */
export function estadoCelda(
  dia: Dia,
  f: Franja,
  horarios: BloqueHorario[],
  sel: { docente_id?: ID; grupo_id?: ID; asignatura_id?: ID; aula?: string },
): EstadoCelda {
  const rango = { hora_inicio: f.inicio, hora_fin: f.fin };
  const aqui = horarios.filter((h) => h.dia === dia && seSolapan(h, rango));
  const propia = aqui.find(
    (h) => !!sel.asignatura_id && h.docente_id === sel.docente_id && h.grupo_id === sel.grupo_id && h.asignatura_id === sel.asignatura_id,
  );
  if (propia) return { tipo: 'propia', bloque: propia };
  const delDocente = sel.docente_id ? aqui.find((h) => h.docente_id === sel.docente_id) : undefined;
  if (delDocente) return { tipo: 'docente', bloque: delDocente };
  const delGrupo = sel.grupo_id ? aqui.find((h) => h.grupo_id === sel.grupo_id) : undefined;
  if (delGrupo) return { tipo: 'grupo', bloque: delGrupo };
  const aula = sel.aula?.trim().toLowerCase();
  const delAula = aula ? aqui.find((h) => h.aula && h.aula.trim().toLowerCase() === aula) : undefined;
  if (delAula) return { tipo: 'aula', bloque: delAula };
  return { tipo: 'libre' };
}

/** Horas programadas en el horario para una combinación docente + grupo + asignatura. */
export function horasProgramadas(c: Combinacion, horarios: BloqueHorario[]): number {
  return horarios
    .filter((h) => h.docente_id === c.docente_id && h.grupo_id === c.grupo_id && h.asignatura_id === c.asignatura_id)
    .reduce((s, h) => s + horasDe(h), 0);
}

export type CambioAsignacion =
  | { accion: 'nada' }
  | { accion: 'crear'; horas: number }
  | { accion: 'editar'; id: ID; horas: number }
  | { accion: 'eliminar'; id: ID };

/**
 * Mantiene la asignación académica al día con el horario:
 *  - si no existe y quedan clases, se crea con esas horas;
 *  - si quedan más horas programadas que asignadas, sube a lo programado;
 *  - si se quitaron clases y la asignación coincidía con lo programado, baja con
 *    ellas (y se elimina si ya no queda ninguna). Si tenía más horas de las
 *    programadas (horas aún por ubicar), se respeta.
 */
export function sincronizarAsignacion(asig: Asignacion | undefined, antes: number, despues: number): CambioAsignacion {
  if (!asig) return despues > 0 ? { accion: 'crear', horas: despues } : { accion: 'nada' };
  if (despues > asig.horas_semanales) return { accion: 'editar', id: asig.id, horas: despues };
  if (despues < antes && asig.horas_semanales === antes)
    return despues > 0 ? { accion: 'editar', id: asig.id, horas: despues } : { accion: 'eliminar', id: asig.id };
  return { accion: 'nada' };
}
