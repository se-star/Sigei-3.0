/**
 * Informe de permisos por rango de fechas: por docente y por tipo, con días
 * hábiles, horas y clases afectadas dentro del rango. Se ve en Reportes y se
 * descarga en Excel (hojas «Resumen» y «Detalle»).
 */
import { radicado, soportePendiente } from './certificadoPermiso';
import type { BloqueHorario, Docente, ID, Novedad } from './types';
import { desdeISO, sumarDias } from './utils';

export interface FilaDocente {
  docente_id: ID;
  permisos: number;
  dias: number;
  horas: number;
  clases: number;
  porTipo: Record<string, number>;
}

export interface FilaDetalle {
  n: Novedad;
  /** Fechas del permiso dentro del rango. */
  desde: string;
  hasta: string;
  dias: number;
  clases: number;
}

export interface InformePermisos {
  desde: string;
  hasta: string;
  docentes: FilaDocente[];
  detalle: FilaDetalle[];
  total: { permisos: number; dias: number; horas: number; clases: number; sinReemplazo: number; soportePendiente: number };
  porTipo: Record<string, number>;
}

/** Días de lunes a viernes entre dos fechas (incluidas). */
export function diasHabiles(desde: string, hasta: string): number {
  let n = 0;
  for (let f = desde, i = 0; f <= hasta && i < 800; f = sumarDias(f, 1), i++) {
    const d = desdeISO(f).getDay();
    if (d >= 1 && d <= 5) n++;
  }
  return n;
}

/** Clases del docente que caen entre dos fechas (según su horario semanal). */
export function clasesEntre(docenteId: ID, desde: string, hasta: string, horarios: BloqueHorario[]): number {
  const suyas = horarios.filter((h) => h.docente_id === docenteId);
  if (!suyas.length) return 0;
  let n = 0;
  for (let f = desde, i = 0; f <= hasta && i < 800; f = sumarDias(f, 1), i++) {
    const d = desdeISO(f).getDay();
    n += suyas.filter((h) => h.dia === d).length;
  }
  return n;
}

/** Permisos aprobados que se cruzan con el rango, recortados a él. */
export function armarInforme(novedades: Novedad[], horarios: BloqueHorario[], desde: string, hasta: string): InformePermisos {
  const detalle: FilaDetalle[] = novedades
    .filter((n) => n.estado === 'aprobada' && n.fecha_inicio <= hasta && (n.fecha_fin || n.fecha_inicio) >= desde)
    .map((n) => {
      const d = n.fecha_inicio > desde ? n.fecha_inicio : desde;
      const h = (n.fecha_fin || n.fecha_inicio) < hasta ? n.fecha_fin || n.fecha_inicio : hasta;
      return { n, desde: d, hasta: h, dias: n.horas > 0 ? 0 : diasHabiles(d, h), clases: clasesEntre(n.docente_id, d, h, horarios) };
    })
    .sort((a, b) => a.n.fecha_inicio.localeCompare(b.n.fecha_inicio));

  const porDocente = new Map<ID, FilaDocente>();
  const porTipo: Record<string, number> = {};
  for (const f of detalle) {
    const fila = porDocente.get(f.n.docente_id) ?? { docente_id: f.n.docente_id, permisos: 0, dias: 0, horas: 0, clases: 0, porTipo: {} };
    fila.permisos++;
    fila.dias += f.dias;
    fila.horas += f.n.horas || 0;
    fila.clases += f.clases;
    fila.porTipo[f.n.tipo] = (fila.porTipo[f.n.tipo] ?? 0) + 1;
    porDocente.set(f.n.docente_id, fila);
    porTipo[f.n.tipo] = (porTipo[f.n.tipo] ?? 0) + 1;
  }
  const docentes = [...porDocente.values()].sort((a, b) => b.dias - a.dias || b.horas - a.horas || b.permisos - a.permisos);
  return {
    desde,
    hasta,
    docentes,
    detalle,
    porTipo,
    total: {
      permisos: detalle.length,
      dias: docentes.reduce((s, x) => s + x.dias, 0),
      horas: docentes.reduce((s, x) => s + x.horas, 0),
      clases: docentes.reduce((s, x) => s + x.clases, 0),
      sinReemplazo: detalle.filter((f) => !f.n.reemplazo_id && f.clases > 0).length,
      soportePendiente: detalle.filter((f) => soportePendiente(f.n)).length,
    },
  };
}

const ENCABEZADO = { fontWeight: 'bold' as const, backgroundColor: '#0A1F44', color: '#FFFFFF' };
const fecha = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
};

/** Descarga el informe en Excel: hoja «Resumen» por docente y hoja «Detalle» por permiso. */
export async function descargarInforme(
  inf: InformePermisos,
  ctx: { docentes: Docente[]; tipos: { valor: string; etiqueta: string }[]; institucion: string },
  nombre = `informe-permisos-${inf.desde}-a-${inf.hasta}.xlsx`,
) {
  const doc = (id: ID | null) => ctx.docentes.find((d) => d.id === id);
  const nombreDoc = (id: ID | null) => {
    const d = doc(id);
    return d ? `${d.nombres} ${d.apellidos}` : '';
  };
  const tipos = ctx.tipos.filter((t) => inf.porTipo[t.valor]);
  const etq = (v: string) => ctx.tipos.find((t) => t.valor === v)?.etiqueta ?? v;
  const titulo = [{ value: `${ctx.institucion} · Informe de permisos del ${fecha(inf.desde)} al ${fecha(inf.hasta)}`, fontWeight: 'bold' as const, fontSize: 13 }];

  const resumen = [
    titulo,
    [],
    [
      ...['Docente', 'Documento', 'Permisos', 'Días hábiles', 'Horas', 'Clases afectadas'].map((v) => ({ value: v, ...ENCABEZADO })),
      ...tipos.map((t) => ({ value: t.etiqueta, ...ENCABEZADO })),
    ],
    ...inf.docentes.map((f) => [
      nombreDoc(f.docente_id),
      { value: doc(f.docente_id)?.documento ?? '', type: String },
      f.permisos,
      f.dias,
      f.horas,
      f.clases,
      ...tipos.map((t) => f.porTipo[t.valor] ?? 0),
    ]),
    [
      { value: 'Total', fontWeight: 'bold' as const },
      '',
      ...[inf.total.permisos, inf.total.dias, inf.total.horas, inf.total.clases, ...tipos.map((t) => inf.porTipo[t.valor])].map((v) => ({ value: v, fontWeight: 'bold' as const })),
    ],
  ];

  const detalle = [
    titulo,
    [],
    [
      'Radicado',
      'Docente',
      'Documento',
      'Tipo',
      'Desde',
      'Hasta',
      'Días hábiles en el periodo',
      'Horas',
      'Clases afectadas en el periodo',
      'Reemplazo',
      'Soporte',
      'Autorizado por',
      'Fecha de autorización',
      'Motivo',
    ].map((v) => ({ value: v, ...ENCABEZADO })),
    ...inf.detalle.map((f) => [
      radicado(f.n),
      nombreDoc(f.n.docente_id),
      { value: doc(f.n.docente_id)?.documento ?? '', type: String },
      etq(f.n.tipo),
      fecha(f.n.fecha_inicio),
      fecha(f.n.fecha_fin || f.n.fecha_inicio),
      f.dias,
      f.n.horas || 0,
      f.clases,
      nombreDoc(f.n.reemplazo_id),
      soportePendiente(f.n) ? 'Pendiente' : f.n.soportes?.length ? 'Aportado' : 'No requerido',
      f.n.revisado_por ?? '',
      f.n.revisado_en ? fecha(f.n.revisado_en) : '',
      f.n.motivo,
    ]),
  ];

  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (writeXlsxFile as any)(
    [
      { sheet: 'Resumen', columns: [{ width: 34 }, { width: 16 }, { width: 11 }, { width: 13 }, { width: 9 }, { width: 17 }, ...tipos.map(() => ({ width: 18 }))], data: resumen },
      {
        sheet: 'Detalle',
        columns: [24, 32, 16, 22, 12, 12, 16, 9, 18, 28, 14, 26, 14, 50].map((width) => ({ width })),
        data: detalle,
      },
    ],
  ).toFile(nombre);
}
