import { describe, expect, it } from 'vitest';
import type { Asignacion, BloqueHorario } from './types';
import { estadoCelda, horasDe, horasProgramadas, sincronizarAsignacion } from './programador';

const bloque = (p: Partial<BloqueHorario>): BloqueHorario => ({
  id: 'b',
  grupo_id: 'g1',
  asignatura_id: 'mat',
  docente_id: 'd1',
  dia: 1,
  hora_inicio: '08:00',
  hora_fin: '08:50',
  aula: '',
  ...p,
});
const asig = (horas: number): Asignacion => ({ id: 'a', docente_id: 'd1', grupo_id: 'g1', asignatura_id: 'mat', horas_semanales: horas });
const f = { inicio: '08:00', fin: '08:50' };

describe('programador de clases', () => {
  it('una franja de 50 minutos cuenta como una hora de clase', () => {
    expect(horasDe({ hora_inicio: '08:00', hora_fin: '08:50' })).toBe(1);
    expect(horasDe({ hora_inicio: '08:00', hora_fin: '10:00' })).toBe(2);
  });

  it('distingue la clase propia, el docente ocupado, el grupo ocupado y el aula', () => {
    const sel = { docente_id: 'd1', grupo_id: 'g1', asignatura_id: 'mat' };
    expect(estadoCelda(1, f, [bloque({ id: 'p' })], sel).tipo).toBe('propia');
    expect(estadoCelda(1, f, [bloque({ grupo_id: 'g2' })], sel).tipo).toBe('docente');
    expect(estadoCelda(1, f, [bloque({ docente_id: 'd2', asignatura_id: 'esp' })], sel).tipo).toBe('grupo');
    expect(estadoCelda(1, f, [bloque({ docente_id: 'd2', grupo_id: 'g2', aula: 'Lab 1' })], { ...sel, aula: 'lab 1' }).tipo).toBe('aula');
    expect(estadoCelda(2, f, [bloque({})], sel).tipo).toBe('libre');
    // Sin asignatura elegida, la clase del mismo docente y grupo se ve como ocupada
    expect(estadoCelda(1, f, [bloque({})], { docente_id: 'd1', grupo_id: 'g1' }).tipo).toBe('docente');
  });

  it('cuenta las horas programadas de la combinación', () => {
    const h = [bloque({ id: '1' }), bloque({ id: '2', dia: 2 }), bloque({ id: '3', grupo_id: 'g2' })];
    expect(horasProgramadas({ docente_id: 'd1', grupo_id: 'g1', asignatura_id: 'mat' }, h)).toBe(2);
  });

  it('mantiene la asignación al día con el horario', () => {
    expect(sincronizarAsignacion(undefined, 0, 3)).toEqual({ accion: 'crear', horas: 3 });
    expect(sincronizarAsignacion(undefined, 0, 0)).toEqual({ accion: 'nada' });
    // Más programadas que asignadas: sube
    expect(sincronizarAsignacion(asig(2), 2, 4)).toEqual({ accion: 'editar', id: 'a', horas: 4 });
    // Asignadas 4, programadas 1 → 3: aún por ubicar, no cambia
    expect(sincronizarAsignacion(asig(4), 1, 3)).toEqual({ accion: 'nada' });
    // Coincidía con lo programado y se quitan clases: baja
    expect(sincronizarAsignacion(asig(3), 3, 2)).toEqual({ accion: 'editar', id: 'a', horas: 2 });
    expect(sincronizarAsignacion(asig(3), 3, 0)).toEqual({ accion: 'eliminar', id: 'a' });
    // Tenía horas por ubicar y se quita una clase: se respeta
    expect(sincronizarAsignacion(asig(4), 2, 1)).toEqual({ accion: 'nada' });
  });
});
