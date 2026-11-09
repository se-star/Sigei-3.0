import { describe, expect, it } from 'vitest';
import type { BloqueHorario, Novedad } from './types';
import { ausentesEn, choquesDe, coincide, diasEntre, diasParaCumple, edad, iniciales, seSolapan, sumarDias } from './utils';
import { puedeAprobar, puedeEditar, puedeVer } from './permisos';

const bloque = (p: Partial<BloqueHorario>): BloqueHorario => ({
  id: 'x',
  grupo_id: 'g1',
  asignatura_id: 'a1',
  docente_id: 'd1',
  dia: 1,
  hora_inicio: '07:00',
  hora_fin: '08:00',
  aula: '',
  ...p,
});

describe('horarios', () => {
  it('detecta solapamiento y respeta bordes', () => {
    expect(seSolapan({ hora_inicio: '07:00', hora_fin: '08:00' }, { hora_inicio: '07:30', hora_fin: '08:30' })).toBe(true);
    expect(seSolapan({ hora_inicio: '07:00', hora_fin: '08:00' }, { hora_inicio: '08:00', hora_fin: '09:00' })).toBe(false);
  });

  it('encuentra choques de docente, grupo y aula', () => {
    const todos = [
      bloque({ id: 'b1', grupo_id: 'g2', docente_id: 'd1' }),
      bloque({ id: 'b2', grupo_id: 'g1', docente_id: 'd2' }),
      bloque({ id: 'b3', grupo_id: 'g3', docente_id: 'd3', aula: 'Lab' }),
      bloque({ id: 'b4', grupo_id: 'g4', docente_id: 'd1', dia: 2 }),
    ];
    const nuevo = bloque({ id: undefined as unknown as string, aula: 'lab ' });
    const tipos = choquesDe(nuevo, todos).map((c) => `${c.tipo}:${c.con.id}`);
    expect(tipos).toEqual(['docente:b1', 'grupo:b2', 'aula:b3']);
  });

  it('no se reporta a sí mismo al editar', () => {
    const b = bloque({ id: 'b1' });
    expect(choquesDe(b, [b])).toHaveLength(0);
  });
});

describe('fechas', () => {
  it('suma días cruzando meses', () => {
    expect(sumarDias('2026-01-31', 1)).toBe('2026-02-01');
    expect(diasEntre('2026-03-01', '2026-03-03')).toBe(3);
  });
  it('calcula cumpleaños y edad', () => {
    expect(diasParaCumple('1990-11-06', '2026-11-06')).toBe(0);
    expect(diasParaCumple('1990-11-05', '2026-11-06')).toBe(364);
    expect(edad('1990-11-07', '2026-11-06')).toBe(35);
  });
  it('lista ausentes solo con novedades aprobadas vigentes', () => {
    const n = (p: Partial<Novedad>) => ({ estado: 'aprobada', fecha_inicio: '2026-11-01', fecha_fin: '2026-11-10', ...p }) as Novedad;
    const lista = [n({ id: '1' }), n({ id: '2', estado: 'pendiente' }), n({ id: '3', fecha_fin: '2026-11-05' })];
    expect(ausentesEn(lista, '2026-11-06').map((x) => x.id)).toEqual(['1']);
  });
});

describe('texto', () => {
  it('busca sin tildes y por palabras', () => {
    expect(coincide('maria lopez', 'María José', 'López')).toBe(true);
    expect(coincide('mate', 'Ciencias')).toBe(false);
  });
  it('genera iniciales', () => {
    expect(iniciales('Laura Marcela Restrepo Gil')).toBe('LR');
    expect(iniciales('Rectoría')).toBe('RE');
  });
});

describe('permisos', () => {
  it('aplica la matriz por rol', () => {
    expect(puedeVer('docente', 'usuarios')).toBe(false);
    expect(puedeVer('docente', 'horarios')).toBe(true);
    expect(puedeEditar('docente', 'horarios')).toBe(false);
    expect(puedeEditar('coordinador', 'horarios')).toBe(true);
    expect(puedeEditar('coordinador', 'configuracion')).toBe(false);
    expect(puedeAprobar('docente')).toBe(false);
    expect(puedeAprobar('rector')).toBe(true);
    expect(puedeVer(undefined, 'inicio')).toBe(false);
  });
});

describe('nombres de grupos', () => {
  it('sigue el formato de la institución', async () => {
    const { nombreGrupoSegun } = await import('./utils');
    expect(nombreGrupoSegun('Sexto', 1, 'grado')).toBe('6°1');
    expect(nombreGrupoSegun('Undécimo', 2, 'numero')).toBe('1102');
    expect(nombreGrupoSegun('séptimo', 3, 'letra')).toBe('7C');
    expect(nombreGrupoSegun('Transición', 1, 'guion')).toBe('0-1');
    expect(nombreGrupoSegun('Jardín', 1, 'grado')).toBe('J°1');
    expect(nombreGrupoSegun('Aceleración', 1, 'grado')).toBeNull();
  });
  it('sugiere el siguiente nombre libre', async () => {
    const { sugerirNombreGrupo } = await import('./utils');
    expect(sugerirNombreGrupo('Sexto', ['6°1', '6°2'], 'grado')).toBe('6°3');
    expect(sugerirNombreGrupo('Sexto', ['6°1', '6°3'], 'grado')).toBe('6°2');
    expect(sugerirNombreGrupo('Octavo', ['801'], 'numero')).toBe('802');
    expect(sugerirNombreGrupo('Grado especial', [], 'grado')).toBeNull();
  });
});
