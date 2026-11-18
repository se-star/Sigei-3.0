import { describe, expect, it } from 'vitest';
import type { Asignacion, Asignatura, BloqueHorario, Docente, Franja, Grado, Grupo } from './types';
import { interpretar, proponer } from './asistenteHorario';

const grados: Grado[] = [
  { id: 'g7', nombre: 'Séptimo', nivel: 'secundaria', orden: 9 },
  { id: 'g10', nombre: 'Décimo', nivel: 'media', orden: 12 },
  { id: 'g1', nombre: 'Primero', nivel: 'primaria', orden: 3 },
];
const grupo = (id: string, nombre: string, grado_id: string): Grupo => ({ id, nombre, grado_id, jornada: 'manana', sede_id: null, director_id: null, capacidad: 40, estudiantes: 30 } as Grupo);
const grupos = [grupo('71', '7°1', 'g7'), grupo('72', '7°2', 'g7'), grupo('10a', '10A', 'g10'), grupo('11', '1°1', 'g1')];
const asignaturas: Asignatura[] = [
  { id: 'mat', nombre: 'Matemáticas', area_id: 'a' },
  { id: 'ef', nombre: 'Educación Física', area_id: 'b' },
  { id: 'fis', nombre: 'Física', area_id: 'c' },
  { id: 'lc', nombre: 'Lengua Castellana', area_id: 'd' },
  { id: 'soc', nombre: 'Ciencias Sociales', area_id: 'e' },
];
const doc = (id: string, nombres: string, apellidos: string) => ({ id, nombres, apellidos, estado: 'activo' } as Docente);
const docentes = [doc('nat', 'Natalia', 'Agudelo Castaño'), doc('car', 'Carlos Andrés', 'Pérez Ríos'), doc('ana', 'Ana María', 'Pérez Gómez')];
const asignaciones: Asignacion[] = [{ id: 'x', docente_id: 'car', grupo_id: '72', asignatura_id: 'soc', horas_semanales: 3 }];
const ctx = { asignaturas, grupos, grados, docentes, asignaciones };

describe('asistente: interpretar la frase', () => {
  it('entiende asignatura, grupo, bloques, días y docente', () => {
    const r = interpretar('Matemáticas 7°2 bloques 1 y 2 lunes y jueves, Natalia', ctx);
    expect(r.asignatura?.id).toBe('mat');
    expect(r.grupo?.id).toBe('72');
    expect(r.bloques).toEqual([1, 2]);
    expect(r.dias).toEqual([1, 4]);
    expect(r.docente?.id).toBe('nat');
  });

  it('acepta otras formas de escribir el grupo, los bloques y los días', () => {
    expect(interpretar('mate 7-2 primer bloque', ctx)).toMatchObject({ asignatura: { id: 'mat' }, grupo: { id: '72' }, bloques: [1] });
    expect(interpretar('fisica 10a bloques 3 a 5 de lunes a miercoles', ctx)).toMatchObject({ asignatura: { id: 'fis' }, grupo: { id: '10a' }, bloques: [3, 4, 5], dias: [1, 2, 3] });
    expect(interpretar('Educación física en 1°1, segunda hora', ctx)).toMatchObject({ asignatura: { id: 'ef' }, grupo: { id: '11' }, bloques: [2] });
    expect(interpretar('Español 7°1 4 horas', ctx)).toMatchObject({ asignatura: { id: 'lc' }, grupo: { id: '71' }, horas: 4, bloques: [] });
  });

  it('un grado con varios grupos pide elegir; con uno solo lo toma', () => {
    const r = interpretar('Matemáticas séptimo bloque 2', ctx);
    expect(r.grupo).toBeUndefined();
    expect(r.grado?.id).toBe('g7');
    expect(r.gruposDelGrado.map((g) => g.id)).toEqual(['71', '72']);
    expect(interpretar('Física décimo bloque 1', ctx).grupo?.id).toBe('10a');
  });

  it('el docente: nombre y apellido, apellido repetido no basta, o el de la asignación', () => {
    expect(interpretar('Física 10A Ana Pérez', ctx).docente?.id).toBe('ana');
    expect(interpretar('Física 10A Pérez', ctx).docente).toBeUndefined();
    const r = interpretar('Sociales 7°2 bloque 3', ctx);
    expect(r.asignatura?.id).toBe('soc');
    expect(r.docente?.id).toBe('car');
    expect(r.docenteSugerido).toBe(true);
  });
});

const franjas: Franja[] = [
  { inicio: '07:00', fin: '08:00' },
  { inicio: '08:00', fin: '09:00' },
  { inicio: '09:00', fin: '09:30', descanso: true },
  { inicio: '09:30', fin: '10:30' },
];
const b = (p: Partial<BloqueHorario>): BloqueHorario => ({ id: Math.random().toString(), grupo_id: '72', asignatura_id: 'soc', docente_id: 'car', dia: 1, hora_inicio: '07:00', hora_fin: '08:00', aula: '', ...p });
const sel = { docente_id: 'nat', grupo_id: '72', asignatura_id: 'mat' };

describe('asistente: proponer franjas', () => {
  it('días y bloques: exactamente esos, y avisa los ocupados', () => {
    const r = proponer({ bloques: [1, 3], dias: [1, 2] }, { franjas, horarios: [b({ dia: 1 })], sel });
    expect(r.marcas.map((m) => `${m.dia}-${m.franja.inicio}`)).toEqual(['1-09:30', '2-07:00', '2-09:30']);
    expect(r.avisos[0]).toMatch(/lunes en el bloque 1.*grupo tiene otra clase/);
  });

  it('el bloque 3 salta el descanso', () => {
    expect(proponer({ bloques: [3], dias: [5] }, { franjas, horarios: [], sel }).marcas[0].franja.inicio).toBe('09:30');
  });

  it('bloques sin días: reparte en días libres según las horas que faltan', () => {
    const r = proponer({ bloques: [1, 2], dias: [] }, { franjas, horarios: [b({ dia: 1, hora_inicio: '08:00', hora_fin: '09:00' })], sel, pendientes: 4 });
    // 4 horas en bloques dobles → 2 días; el lunes está ocupado en el bloque 2
    expect([...new Set(r.marcas.map((m) => m.dia))]).toEqual([2, 3]);
    expect(r.marcas).toHaveLength(4);
    expect(r.avisos).toEqual([]);
  });

  it('sin bloques ni días: la primera franja libre de días distintos', () => {
    const r = proponer({ bloques: [], dias: [], horas: 3 }, { franjas, horarios: [b({ dia: 1 })], sel });
    expect(r.marcas.map((m) => `${m.dia}-${m.franja.inicio}`)).toEqual(['1-08:00', '2-07:00', '3-07:00']);
  });

  it('avisa cuando no alcanza o el bloque no existe', () => {
    const lleno = [1, 2, 3, 4, 5].map((d) => b({ dia: d as 1, docente_id: 'nat', grupo_id: '71' }));
    expect(proponer({ bloques: [1], dias: [] }, { franjas, horarios: lleno, sel }).avisos[0]).toMatch(/No encontré días libres en el bloque 1/);
    expect(proponer({ bloques: [9], dias: [1] }, { franjas, horarios: [], sel }).avisos[0]).toMatch(/3 bloques de clase/);
  });
});

describe('asistente: bloques y cantidades juntos', () => {
  it('«bloque 3 2 horas» es el bloque 3 dos veces por semana', () => {
    expect(interpretar('Física 7°2 bloque 3 2 horas', ctx)).toMatchObject({ bloques: [3], horas: 2 });
    expect(interpretar('Física 7°2 bloques 1, 2 y 4', ctx).bloques).toEqual([1, 2, 4]);
  });
});
