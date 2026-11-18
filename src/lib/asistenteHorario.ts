/**
 * Asistente del programador de clases: entiende una frase corta como
 * «Matemáticas 7°2 bloques 1 y 2 lunes y jueves, Natalia» y propone las
 * franjas a marcar. Cada franja de clase es un bloque (bloque 1 = primera
 * franja de clase del día, sin contar los descansos). Funciona sin servicios
 * externos: busca en el texto los nombres de asignaturas, grupos, grados,
 * docentes, días y bloques que existen en la institución.
 */
import { PLAN_MEN } from './planEstudios';
import { estadoCelda, type EstadoCelda } from './programador';
import type { Asignacion, Asignatura, BloqueHorario, Dia, Docente, Franja, Grado, Grupo, ID } from './types';
import { gradoDelCatalogo, norm } from './utils';

export interface Interpretacion {
  asignatura?: Asignatura;
  grupo?: Grupo;
  /** Grado nombrado sin decir el grupo, cuando tiene varios grupos. */
  grado?: Grado;
  gruposDelGrado: Grupo[];
  docente?: Docente;
  /** El docente salió de la asignación académica del grupo (no se nombró). */
  docenteSugerido?: boolean;
  bloques: number[];
  dias: Dia[];
  horas?: number;
}

const limpiar = (s: string) => ` ${norm(s).replace(/[°º]/g, ' ° ').replace(/[^a-z0-9°ñ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const NUMEROS: Record<string, number> = {
  uno: 1, una: 1, primer: 1, primero: 1, primera: 1,
  dos: 2, segundo: 2, segunda: 2,
  tres: 3, tercer: 3, tercero: 3, tercera: 3,
  cuatro: 4, cuarto: 4, cuarta: 4,
  cinco: 5, quinto: 5, quinta: 5,
  seis: 6, sexto: 6, sexta: 6,
  siete: 7, septimo: 7, septima: 7,
  ocho: 8, octavo: 8, octava: 8,
  nueve: 9, noveno: 9, novena: 9,
  diez: 10, decimo: 10, decima: 10,
};
const ORDINALES = ['primer', 'primero', 'primera', 'segundo', 'segunda', 'tercer', 'tercero', 'tercera', 'cuarto', 'cuarta', 'quinto', 'quinta', 'sexto', 'sexta', 'septimo', 'septima', 'octavo', 'octava'];
const VACIAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'san', 'santa']);
const NUM = `(?:\\d{1,2}|${Object.keys(NUMEROS).join('|')})`;
const valor = (t: string) => (/^\d+$/.test(t) ? Number(t) : NUMEROS[t]);

const DIAS_TXT: [string, Dia][] = [
  ['lunes', 1], ['martes', 2], ['miercoles', 3], ['jueves', 4], ['viernes', 5], ['sabado', 6], ['sabados', 6],
];

/** Lee los números de una lista como «1, 2 y 3», «1 a 3» o «1-3». */
function numerosDe(lista: string): number[] {
  const out: number[] = [];
  const re = new RegExp(`(${NUM})(?:\\s*(?:a|al|hasta)\\s*(${NUM}))?`, 'g');
  for (const m of lista.matchAll(re)) {
    const a = valor(m[1]);
    const b = m[2] ? valor(m[2]) : a;
    if (!a || !b) continue;
    for (let i = Math.min(a, b); i <= Math.max(a, b) && i - Math.min(a, b) < 12; i++) out.push(i);
  }
  return out;
}

export function interpretar(
  texto: string,
  ctx: { asignaturas: Asignatura[]; grupos: Grupo[]; grados: Grado[]; docentes: Docente[]; asignaciones: Asignacion[] },
): Interpretacion {
  let t = limpiar(texto);
  const quitar = (re: RegExp) => {
    t = t.replace(re, ' ');
  };
  const r: Interpretacion = { bloques: [], dias: [], gruposDelGrado: [] };

  // Bloques: «bloque 1», «bloques 1 y 2», «bloques 1 a 3», «primer bloque», «1 bloque» no cuenta.
  // Un número seguido de «horas» o «clases» es una cantidad, no un bloque: «bloque 3 2 horas».
  const NB = `${NUM}(?! (?:horas?|clases?|h) )`;
  const lista = `${NB}(?:\\s*(?:,|y|e|a|al|hasta)?\\s*${NB})*`;
  for (const m of t.matchAll(new RegExp(` (?:bloques?|franjas?) (${lista})(?= )`, 'g'))) r.bloques.push(...numerosDe(m[1]));
  quitar(new RegExp(` (?:bloques?|franjas?) (${lista})(?= )`, 'g'));
  // «primer bloque», «segunda hora» (solo ordinales: «una hora» es una cantidad)
  const ordinal = new RegExp(` (${ORDINALES.join('|')}) (?:bloque|franja|hora)(?= )`, 'g');
  for (const m of t.matchAll(ordinal)) r.bloques.push(NUMEROS[m[1]]);
  quitar(ordinal);
  r.bloques = [...new Set(r.bloques)].sort((a, b) => a - b);

  // Cantidad: «4 horas», «2 clases»
  const h = t.match(new RegExp(` (${NUM}) (?:horas?|clases?|h)(?= )`));
  if (h) {
    r.horas = valor(h[1]);
    quitar(new RegExp(` (${NUM}) (?:horas?|clases?|h)(?= )`, 'g'));
  }

  // Días: «lunes y miércoles», «de lunes a viernes», «toda la semana»
  const rango = t.match(/ (lunes|martes|miercoles|jueves|viernes) a (martes|miercoles|jueves|viernes|sabado) /);
  if (rango) {
    const a = DIAS_TXT.find((d) => d[0] === rango[1])![1];
    const b = DIAS_TXT.find((d) => d[0] === rango[2])![1];
    for (let i = a; i <= b; i++) r.dias.push(i as Dia);
    quitar(new RegExp(` ${rango[1]} a ${rango[2]} `));
  }
  if (/ toda la semana | todos los dias /.test(t)) {
    r.dias.push(1, 2, 3, 4, 5);
    quitar(/ toda la semana | todos los dias /);
  }
  for (const [nombre, d] of DIAS_TXT)
    if (t.includes(` ${nombre} `)) {
      r.dias.push(d);
      quitar(new RegExp(` ${nombre} `, 'g'));
    }
  r.dias = [...new Set(r.dias)].sort((a, b) => a - b);

  // Grupo: «7°2», «7-2», «7 2», «10B», «0A»… (el nombre más largo primero)
  const porLargo = [...ctx.grupos].sort((a, b) => b.nombre.length - a.nombre.length);
  for (const g of porLargo) {
    const partes = limpiar(g.nombre).trim().split(' ').filter((p) => p !== '°');
    const pedazos = partes.flatMap((p) => p.match(/\d+|[a-zñ]+/g) ?? []);
    if (!pedazos.length) continue;
    const re = new RegExp(` (?:grupo |curso )?${pedazos.map(escapar).join('\\s*°?\\s*(?:-\\s*)?')}(?= )`);
    if (re.test(t)) {
      r.grupo = g;
      quitar(re);
      break;
    }
  }

  // Grado: «séptimo», «grado 7», «transición»
  if (!r.grupo) {
    const grados = [...ctx.grados].sort((a, b) => b.nombre.length - a.nombre.length);
    for (const gr of grados) {
      const n = limpiar(gr.nombre).trim();
      const re = new RegExp(` (?:grado )?${escapar(n)}(?= )`);
      const codigo = gradoDelCatalogo(gr.nombre)?.codigo;
      const reNum = codigo !== undefined ? new RegExp(` grado ${escapar(norm(codigo))}(?= )`) : /$^/;
      if (re.test(t) || reNum.test(t)) {
        r.grado = gr;
        r.gruposDelGrado = ctx.grupos.filter((g) => g.grado_id === gr.id).sort((a, b) => a.nombre.localeCompare(b.nombre));
        if (r.gruposDelGrado.length === 1) {
          r.grupo = r.gruposDelGrado[0];
          r.gruposDelGrado = [];
        }
        quitar(re);
        quitar(reNum);
        break;
      }
    }
  }

  // Asignatura: el nombre más largo que aparezca; después alias del MEN; después un comienzo de palabra («mate», «sociales»).
  const asigs = [...ctx.asignaturas].sort((a, b) => b.nombre.length - a.nombre.length);
  r.asignatura = asigs.find((s) => t.includes(limpiar(s.nombre)));
  if (!r.asignatura) {
    for (const area of PLAN_MEN)
      for (const s of area.asignaturas)
        for (const alias of [s.nombre, ...(s.alias ?? [])])
          if (!r.asignatura && t.includes(limpiar(alias))) {
            const nombres = [s.nombre, ...(s.alias ?? [])].map((x) => limpiar(x));
            r.asignatura = asigs.find((x) => nombres.includes(limpiar(x.nombre)));
          }
  }
  if (!r.asignatura) {
    const palabras = t.trim().split(' ').filter((p) => p.length >= 4);
    r.asignatura = asigs.find((s) => {
      const ps = limpiar(s.nombre).trim().split(' ').filter((p) => p.length >= 4);
      return palabras.some((p) => ps.some((x) => x.startsWith(p)));
    });
  }
  if (r.asignatura) quitar(new RegExp(escapar(limpiar(r.asignatura.nombre)).replace(/^ | $/g, ''), 'g'));

  // Docente: dos palabras de su nombre, o un apellido que no se repita.
  const palabras = new Set(t.trim().split(' '));
  const candidatos = ctx.docentes
    .filter((d) => d.estado !== 'retirado')
    .map((d) => {
      const nombres = limpiar(d.nombres).trim().split(' ').filter((p) => p.length >= 3 && !VACIAS.has(p));
      const apellidos = limpiar(d.apellidos).trim().split(' ').filter((p) => p.length >= 3 && !VACIAS.has(p));
      const n = nombres.filter((p) => palabras.has(p)).length;
      const a = apellidos.filter((p) => palabras.has(p)).length;
      return { d, puntos: n + a * 1.5, n, a };
    })
    .filter((c) => c.n + c.a > 0)
    .sort((a, b) => b.puntos - a.puntos);
  if (candidatos.length && (candidatos.length === 1 || candidatos[0].puntos > candidatos[1].puntos)) r.docente = candidatos[0].d;

  // Sin docente en la frase: el que tiene la asignación de esa asignatura en el grupo.
  if (!r.docente && r.grupo && r.asignatura) {
    const a = ctx.asignaciones.find((x) => x.grupo_id === r.grupo!.id && x.asignatura_id === r.asignatura!.id);
    const d = a && ctx.docentes.find((x) => x.id === a.docente_id);
    if (d) {
      r.docente = d;
      r.docenteSugerido = true;
    }
  }
  return r;
}

export interface Marca {
  dia: Dia;
  franja: Franja;
}

export interface Propuesta {
  marcas: Marca[];
  avisos: string[];
}

const nombreDia = (d: Dia) => ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d];

/**
 * Elige las franjas a marcar:
 *  - con días y bloques: exactamente esos;
 *  - con bloques y sin días: busca los días en que todos esos bloques están libres,
 *    tantos como haga falta para las horas pedidas (o las que faltan por ubicar);
 *  - sin bloques: la primera franja libre de cada día, repartiendo en días distintos.
 */
export function proponer(
  pedido: Pick<Interpretacion, 'bloques' | 'dias' | 'horas'>,
  ctx: {
    franjas: Franja[];
    horarios: BloqueHorario[];
    sel: { docente_id: ID; grupo_id: ID; asignatura_id: ID; aula?: string };
    /** Horas que faltan por ubicar de la asignación (si existe). */
    pendientes?: number;
    diasSemana?: Dia[];
  },
): Propuesta {
  const clases = ctx.franjas.filter((f) => !f.descanso);
  const diasSemana = ctx.diasSemana ?? [1, 2, 3, 4, 5];
  const avisos: string[] = [];
  const marcas: Marca[] = [];
  const estado = (dia: Dia, f: Franja): EstadoCelda => estadoCelda(dia, f, ctx.horarios, ctx.sel);
  const libre = (dia: Dia, f: Franja) => estado(dia, f).tipo === 'libre';
  const yaTiene = (dia: Dia) => ctx.horarios.some((h) => h.dia === dia && h.grupo_id === ctx.sel.grupo_id && h.asignatura_id === ctx.sel.asignatura_id);
  const describir = (e: EstadoCelda) =>
    e.tipo === 'propia' ? 'ya tiene esta clase' : e.tipo === 'docente' ? 'el docente tiene otra clase' : e.tipo === 'grupo' ? 'el grupo tiene otra clase' : e.tipo === 'aula' ? 'el aula está ocupada' : '';

  const fuera = pedido.bloques.filter((b) => b < 1 || b > clases.length);
  if (fuera.length) avisos.push(`El día tiene ${clases.length} bloques de clase: no existe el bloque ${fuera.join(', ')}.`);
  const bloques = pedido.bloques.filter((b) => b >= 1 && b <= clases.length).map((b) => clases[b - 1]);

  if (pedido.dias.length && bloques.length) {
    for (const dia of pedido.dias)
      for (const f of bloques) {
        const e = estado(dia, f);
        if (e.tipo === 'libre') marcas.push({ dia, franja: f });
        else avisos.push(`El ${nombreDia(dia)} en el bloque ${clases.indexOf(f) + 1} no se puede: ${describir(e)}.`);
      }
    return { marcas, avisos };
  }

  if (pedido.dias.length) {
    // Días sin bloques: las primeras franjas libres de cada día.
    const porDia = Math.max(1, Math.ceil((pedido.horas ?? pedido.dias.length) / pedido.dias.length));
    for (const dia of pedido.dias) {
      const libres = clases.filter((f) => libre(dia, f)).slice(0, porDia);
      if (!libres.length) avisos.push(`El ${nombreDia(dia)} no tiene franjas libres para el docente y el grupo.`);
      else if (libres.length < porDia) avisos.push(`El ${nombreDia(dia)} solo tiene ${libres.length} franja${libres.length === 1 ? '' : 's'} libre${libres.length === 1 ? '' : 's'}.`);
      marcas.push(...libres.map((f) => ({ dia, franja: f })));
    }
    return { marcas, avisos };
  }

  // Sin días: repartir en la semana.
  const objetivo = pedido.horas ?? (ctx.pendientes && ctx.pendientes > 0 ? ctx.pendientes : Math.max(1, bloques.length));
  const tam = Math.max(1, bloques.length);
  const unidades = Math.ceil(objetivo / tam);
  // Primero los días donde el grupo aún no ve la asignatura.
  const orden = [...diasSemana].sort((a, b) => Number(yaTiene(a)) - Number(yaTiene(b)) || a - b);
  const usados = new Set<Dia>();
  for (const dia of orden) {
    if (usados.size >= unidades) break;
    if (bloques.length) {
      if (bloques.every((f) => libre(dia, f))) {
        marcas.push(...bloques.map((f) => ({ dia, franja: f })));
        usados.add(dia);
      }
    } else {
      const f = clases.find((x) => libre(dia, x));
      if (f) {
        marcas.push({ dia, franja: f });
        usados.add(dia);
      }
    }
  }
  if (usados.size < unidades) {
    const donde = bloques.length ? ` en ${bloques.length === 1 ? 'el bloque' : 'los bloques'} ${pedido.bloques.filter((b) => b <= clases.length).join(' y ')}` : '';
    avisos.push(
      usados.size
        ? `Solo encontré ${usados.size} ${usados.size === 1 ? 'día libre' : 'días libres'}${donde} para el docente y el grupo.`
        : `No encontré días libres${donde} para el docente y el grupo.`,
    );
  }
  return { marcas: marcas.sort((a, b) => a.dia - b.dia || a.franja.inicio.localeCompare(b.franja.inicio)), avisos };
}
