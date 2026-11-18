import { describe, expect, it } from 'vitest';
import { areaEquivalente, asignaturaEquivalente, nivelesTexto, PLAN_MEN } from './planEstudios';
import type { Area, Asignatura } from './types';

describe('plan de estudios del MEN', () => {
  it('trae las 9 áreas obligatorias de la Ley 115 y las de la media', () => {
    expect(PLAN_MEN.filter((a) => a.norma.includes('art. 23'))).toHaveLength(9);
    expect(PLAN_MEN.filter((a) => a.norma.includes('art. 31')).map((a) => a.nombre)).toEqual(['Ciencias Económicas y Políticas', 'Filosofía']);
    // Sin asignaturas repetidas.
    const nombres = PLAN_MEN.flatMap((a) => a.asignaturas.map((s) => s.nombre));
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it('reconoce áreas y asignaturas que la institución ya tiene con otro nombre', () => {
    const areas = [{ id: 'a1', nombre: 'Ciencias Naturales', color: '' }, { id: 'a2', nombre: 'Humanidades', color: '' }] as Area[];
    const asignaturas = [
      { id: 's1', nombre: 'Religión', area_id: null },
      { id: 's2', nombre: 'Educación Física', area_id: null },
    ] as Asignatura[];
    const nat = PLAN_MEN.find((a) => a.nombre.startsWith('Ciencias Naturales'))!;
    expect(areaEquivalente(nat, areas)?.id).toBe('a1');
    const rel = PLAN_MEN.find((a) => a.nombre === 'Educación Religiosa')!.asignaturas[0];
    expect(asignaturaEquivalente(rel, asignaturas)?.id).toBe('s1');
    // «Física» (ciencias) no se confunde con «Educación Física».
    const fisica = nat.asignaturas.find((s) => s.nombre === 'Física')!;
    expect(asignaturaEquivalente(fisica, asignaturas)).toBeUndefined();
  });

  it('describe los niveles', () => {
    expect(nivelesTexto(['primaria', 'secundaria', 'media'])).toBe('Primaria a media');
    expect(nivelesTexto(['secundaria', 'media'])).toBe('Secundaria y media');
    expect(nivelesTexto(['media'])).toBe('Media');
  });
});
