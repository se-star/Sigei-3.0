/**
 * Áreas y asignaturas del plan de estudios de las instituciones oficiales de
 * Colombia, según el Ministerio de Educación Nacional (MEN):
 *  - Ley 115 de 1994, art. 23: nueve áreas obligatorias y fundamentales de la
 *    educación básica (y art. 31: en la media académica, además, ciencias
 *    económicas, políticas y filosofía).
 *  - Lineamientos curriculares de preescolar: dimensiones del desarrollo.
 *  - Cátedras y proyectos de ley: Historia de Colombia (Ley 1874 de 2017),
 *    Cátedra de la Paz (Ley 1732 de 2014), Cátedra de Estudios Afrocolombianos
 *    (Decreto 1122 de 1998), Emprendimiento (Ley 1014 de 2006) y Educación
 *    Ambiental (Ley 115 de 1994, art. 14).
 * Cada institución define en su PEI cómo organiza las asignaturas dentro de
 * cada área; esta lista es el punto de partida más común.
 */
import type { Area, Asignatura, Nivel } from './types';
import { norm } from './utils';

export interface AsignaturaMEN {
  nombre: string;
  niveles: Nivel[];
  /** Otros nombres con que suele aparecer (para no duplicarla). */
  alias?: string[];
  nota?: string;
}

export interface AreaMEN {
  nombre: string;
  /** Nombre como lo trae la norma, si es distinto. */
  nombreLegal?: string;
  norma: string;
  color: string;
  alias?: string[];
  asignaturas: AsignaturaMEN[];
}

const B: Nivel[] = ['primaria', 'secundaria', 'media'];

export const PLAN_MEN: AreaMEN[] = [
  {
    nombre: 'Ciencias Naturales y Educación Ambiental',
    norma: 'Ley 115 de 1994, art. 23',
    color: '#4f8f5e',
    alias: ['Ciencias Naturales', 'Naturales'],
    asignaturas: [
      { nombre: 'Ciencias Naturales', niveles: ['primaria', 'secundaria'], alias: ['Naturales'] },
      { nombre: 'Biología', niveles: ['secundaria', 'media'] },
      { nombre: 'Química', niveles: ['secundaria', 'media'] },
      { nombre: 'Física', niveles: ['secundaria', 'media'] },
      { nombre: 'Educación Ambiental', niveles: B, nota: 'Proyecto obligatorio (Ley 115, art. 14).' },
    ],
  },
  {
    nombre: 'Ciencias Sociales',
    nombreLegal: 'Ciencias Sociales, Historia, Geografía, Constitución Política y Democracia',
    norma: 'Ley 115 de 1994, art. 23',
    color: '#8f7aa8',
    alias: ['Sociales', 'Ciencias Sociales, Historia, Geografía, Constitución Política y Democracia'],
    asignaturas: [
      { nombre: 'Ciencias Sociales', niveles: B, alias: ['Sociales'] },
      { nombre: 'Historia de Colombia', niveles: B, alias: ['Historia'], nota: 'Ley 1874 de 2017.' },
      { nombre: 'Geografía', niveles: ['secundaria'] },
      { nombre: 'Constitución Política y Democracia', niveles: ['secundaria', 'media'], alias: ['Constitución Política', 'Democracia'] },
      { nombre: 'Cátedra de la Paz', niveles: B, nota: 'Ley 1732 de 2014.' },
      { nombre: 'Cátedra de Estudios Afrocolombianos', niveles: B, alias: ['Estudios Afrocolombianos'], nota: 'Decreto 1122 de 1998.' },
    ],
  },
  {
    nombre: 'Educación Artística y Cultural',
    norma: 'Ley 115 de 1994, art. 23',
    color: '#b56f86',
    alias: ['Educación Artística', 'Artística', 'Artes'],
    asignaturas: [
      { nombre: 'Educación Artística', niveles: B, alias: ['Artística', 'Artes'] },
      { nombre: 'Música', niveles: B },
      { nombre: 'Artes Plásticas', niveles: B, alias: ['Dibujo'] },
      { nombre: 'Danza', niveles: B, alias: ['Danzas'] },
      { nombre: 'Teatro', niveles: B },
    ],
  },
  {
    nombre: 'Educación Ética y en Valores Humanos',
    norma: 'Ley 115 de 1994, art. 23',
    color: '#c08a3e',
    alias: ['Ética y Valores', 'Ética', 'Educación Ética'],
    asignaturas: [{ nombre: 'Ética y Valores Humanos', niveles: B, alias: ['Ética y Valores', 'Ética', 'Educación Ética y en Valores Humanos'] }],
  },
  {
    nombre: 'Educación Física, Recreación y Deportes',
    norma: 'Ley 115 de 1994, art. 23',
    color: '#d0703a',
    alias: ['Educación Física', 'Física y Deportes'],
    asignaturas: [{ nombre: 'Educación Física', niveles: B, alias: ['Educación Física, Recreación y Deportes', 'Deportes'] }],
  },
  {
    nombre: 'Educación Religiosa',
    norma: 'Ley 115 de 1994, art. 23 · Ley 133 de 1994',
    color: '#8a8580',
    alias: ['Religión'],
    asignaturas: [{ nombre: 'Educación Religiosa', niveles: B, alias: ['Religión'], nota: 'Se respeta la libertad de cultos: el estudiante puede no cursarla.' }],
  },
  {
    nombre: 'Humanidades',
    nombreLegal: 'Humanidades, Lengua Castellana e Idiomas Extranjeros',
    norma: 'Ley 115 de 1994, art. 23',
    color: '#b0784a',
    alias: ['Humanidades, Lengua Castellana e Idiomas Extranjeros', 'Lengua Castellana', 'Lenguaje'],
    asignaturas: [
      { nombre: 'Lengua Castellana', niveles: B, alias: ['Español', 'Lenguaje', 'Castellano'] },
      { nombre: 'Inglés', niveles: B, alias: ['Idioma Extranjero', 'Lengua Extranjera'], nota: 'Idioma extranjero (Programa Nacional de Bilingüismo).' },
      { nombre: 'Lectura Crítica', niveles: ['media'], alias: ['Comprensión Lectora'] },
    ],
  },
  {
    nombre: 'Matemáticas',
    norma: 'Ley 115 de 1994, art. 23',
    color: '#4f7a86',
    asignaturas: [
      { nombre: 'Matemáticas', niveles: B },
      { nombre: 'Geometría', niveles: B },
      { nombre: 'Estadística', niveles: B },
      { nombre: 'Álgebra', niveles: ['secundaria'] },
      { nombre: 'Trigonometría', niveles: ['media'] },
      { nombre: 'Cálculo', niveles: ['media'], alias: ['Precálculo'] },
    ],
  },
  {
    nombre: 'Tecnología e Informática',
    norma: 'Ley 115 de 1994, art. 23',
    color: '#5a77a8',
    alias: ['Tecnología', 'Informática'],
    asignaturas: [
      { nombre: 'Tecnología e Informática', niveles: B, alias: ['Tecnología', 'Informática'] },
      { nombre: 'Emprendimiento', niveles: B, nota: 'Ley 1014 de 2006.' },
    ],
  },
  {
    nombre: 'Ciencias Económicas y Políticas',
    norma: 'Ley 115 de 1994, art. 31 (media académica)',
    color: '#7a8f3e',
    alias: ['Ciencias Económicas', 'Ciencias Políticas', 'Economía y Política'],
    asignaturas: [{ nombre: 'Ciencias Económicas y Políticas', niveles: ['media'], alias: ['Economía', 'Ciencias Políticas', 'Economía y Política'] }],
  },
  {
    nombre: 'Filosofía',
    norma: 'Ley 115 de 1994, art. 31 (media académica)',
    color: '#6b6fa8',
    asignaturas: [{ nombre: 'Filosofía', niveles: ['media'] }],
  },
  {
    nombre: 'Preescolar: dimensiones del desarrollo',
    norma: 'Lineamientos curriculares de preescolar (MEN)',
    color: '#c27aa0',
    alias: ['Preescolar', 'Dimensiones'],
    asignaturas: [
      { nombre: 'Dimensión Cognitiva', niveles: ['preescolar'] },
      { nombre: 'Dimensión Comunicativa', niveles: ['preescolar'] },
      { nombre: 'Dimensión Corporal', niveles: ['preescolar'] },
      { nombre: 'Dimensión Estética', niveles: ['preescolar'] },
      { nombre: 'Dimensión Ética', niveles: ['preescolar'] },
      { nombre: 'Dimensión Socioafectiva', niveles: ['preescolar'], alias: ['Dimensión Socio-afectiva'] },
      { nombre: 'Dimensión Espiritual', niveles: ['preescolar'] },
    ],
  },
];

const clave = (s: string) => norm(s).replace(/[^a-z0-9]+/g, ' ').trim();

/** Área de la institución que corresponde a un área del MEN (por nombre o alias). */
export function areaEquivalente(a: AreaMEN, areas: Area[]): Area | undefined {
  const nombres = [a.nombre, a.nombreLegal, ...(a.alias ?? [])].filter(Boolean).map((x) => clave(x!));
  return areas.find((x) => nombres.includes(clave(x.nombre)));
}

/** Asignatura de la institución que ya cubre una del MEN (por nombre o alias, en cualquier área). */
export function asignaturaEquivalente(s: AsignaturaMEN, asignaturas: Asignatura[]): Asignatura | undefined {
  const nombres = [s.nombre, ...(s.alias ?? [])].map(clave);
  return asignaturas.find((x) => nombres.includes(clave(x.nombre)));
}

const NIVEL_CORTO: Record<Nivel, string> = { preescolar: 'Preescolar', primaria: 'Primaria', secundaria: 'Secundaria', media: 'Media' };

/** «Primaria a media», «Secundaria y media», «Media»… */
export function nivelesTexto(n: Nivel[]): string {
  const orden: Nivel[] = ['preescolar', 'primaria', 'secundaria', 'media'];
  const l = orden.filter((x) => n.includes(x));
  if (l.length === 1) return NIVEL_CORTO[l[0]];
  if (l.length === 2) return `${NIVEL_CORTO[l[0]]} y ${NIVEL_CORTO[l[1]].toLowerCase()}`;
  return `${NIVEL_CORTO[l[0]]} a ${NIVEL_CORTO[l[l.length - 1]].toLowerCase()}`;
}
