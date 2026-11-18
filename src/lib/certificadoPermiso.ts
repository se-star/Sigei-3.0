/**
 * Certificado de autorización de permiso en PDF (se descarga en SIGEI y se
 * adjunta al correo de aprobación). Se arma con pdf-lib y las fuentes
 * estándar del PDF, así que no depende de archivos externos.
 */
import { DIAS } from './catalogos';
import type { Franja, Novedad } from './types';
import { diasEntre } from './utils';

/* ───────── Textos ───────── */

/** Número de radicado estable para una novedad: PERM-AAAAMMDD-XXXX. */
export function radicado(n: Pick<Novedad, 'id' | 'created_at' | 'fecha_inicio'>): string {
  const fecha = diaColombia(n.created_at ?? n.fecha_inicio).replace(/-/g, '');
  const codigo = n.id.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(-4).padStart(4, '0');
  return `PERM-${fecha}-${codigo}`;
}

/** Fecha (AAAA-MM-DD) en Colombia de una fecha u hora guardada en UTC. */
export function diaColombia(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** «17 de noviembre de 2026» */
export function fechaLarga(iso: string): string {
  const [a, m, d] = diaColombia(iso).split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

/** «17/11/2026» */
export function fechaNumerica(iso: string): string {
  const [a, m, d] = diaColombia(iso).split('-');
  return `${d}/${m}/${a}`;
}

/** «17 de noviembre de 2026» o «del 17 al 19 de noviembre de 2026 (3 días)». */
export function fechasPermiso(n: Pick<Novedad, 'fecha_inicio' | 'fecha_fin'>): string {
  if (!n.fecha_fin || n.fecha_fin === n.fecha_inicio) return fechaLarga(n.fecha_inicio);
  const [a1, m1, d1] = n.fecha_inicio.split('-').map(Number);
  const [a2, m2, d2] = n.fecha_fin.split('-').map(Number);
  const dias = diasEntre(n.fecha_inicio, n.fecha_fin);
  const desde = a1 !== a2 ? fechaLarga(n.fecha_inicio) : m1 !== m2 ? `${d1} de ${MESES[m1 - 1]}` : String(d1);
  return `Del ${desde} al ${d2} de ${MESES[m2 - 1]} de ${a2} (${dias} ${dias === 1 ? 'día' : 'días'})`;
}

/** «Jornada completa (06:30 a 12:30)» o «3 horas». */
export function horarioPermiso(n: Pick<Novedad, 'horas'>, franjas: Franja[]): string {
  if (n.horas > 0) return `${n.horas} ${n.horas === 1 ? 'hora' : 'horas'}`;
  const clases = franjas.filter((f) => !f.descanso);
  if (!clases.length) return 'Jornada completa';
  return `Jornada completa (${franjas[0].inicio} a ${franjas[franjas.length - 1].fin})`;
}

export function soportePosterior(n: Pick<Novedad, 'tipo' | 'soportes'>): string {
  if (n.soportes?.length) return 'No se exige soporte posterior.';
  if (n.tipo === 'incapacidad') return 'Debe entregar la incapacidad a coordinación a su regreso.';
  if (n.tipo === 'calamidad') return 'Debe entregar el soporte de la calamidad a su regreso.';
  return 'No se exige soporte posterior.';
}

export const nombreDia = (iso: string) => DIAS.find((d) => d.valor === new Date(`${iso}T12:00:00`).getDay())?.largo ?? '';

/* ───────── Datos del certificado ───────── */

export interface DatosCertificado {
  radicado: string;
  institucion: { nombre: string; municipio: string; dependencia: string; logo?: Uint8Array | null };
  docente: { nombre: string; documento: string; correo: string; sede: string };
  tipo: string;
  fechas: string;
  horario: string;
  motivo: string;
  soportePrevio: string;
  soportePosterior: string;
  reemplazo?: string;
  observacion?: string;
  solicitadoEn: string; // ISO
  autorizadoPor: { nombre: string; cargo: string };
  autorizadoEn: string; // ISO
}

/* ───────── PDF ───────── */

/** Caracteres que las fuentes estándar del PDF (WinAnsi) no pueden escribir se cambian por equivalentes. */
const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
export function aWinAnsi(s: string): string {
  return [...(s ?? '')]
    .map((c) => {
      const code = c.codePointAt(0)!;
      if ((code >= 32 && code < 127) || (code >= 160 && code <= 255) || WIN_ANSI_EXTRA.includes(c)) return c;
      if (c === '\n' || c === '\t') return ' ';
      const base = c.normalize('NFD').replace(/[̀-ͯ]/g, '');
      return [...base].every((x) => x.codePointAt(0)! < 256) ? base : '';
    })
    .join('');
}

type PDFLib = typeof import('pdf-lib');

const AZUL: [number, number, number] = [0x2e / 255, 0x3a / 255, 0xb0 / 255];
const TINTA: [number, number, number] = [0.11, 0.13, 0.17];
const GRIS: [number, number, number] = [0.42, 0.45, 0.5];
const LINEA: [number, number, number] = [0.85, 0.87, 0.91];

/**
 * Genera el PDF. Recibe el módulo pdf-lib ya cargado para que la descarga en el
 * navegador lo cargue solo cuando se necesita.
 */
export async function generarCertificado(lib: PDFLib, d: DatosCertificado): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = lib;
  const doc = await PDFDocument.create();
  doc.setTitle(`Certificado ${d.radicado}`);
  doc.setSubject('Certificado de autorización de permiso');
  doc.setCreator('SIGEI TIC');
  doc.setProducer('SIGEI TIC');
  doc.setLanguage('es-CO');
  const pagina = doc.addPage([612, 792]);
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const M = 56;
  const ancho = 612 - 2 * M;
  const color = (c: [number, number, number]) => rgb(c[0], c[1], c[2]);
  let y = 792 - 60;

  const texto = (t: string, x: number, yy: number, o: { tam?: number; bold?: boolean; c?: [number, number, number] } = {}) =>
    pagina.drawText(aWinAnsi(t), { x, y: yy, size: o.tam ?? 10, font: o.bold ? negrita : normal, color: color(o.c ?? TINTA) });
  const medir = (t: string, tam: number, bold = false) => (bold ? negrita : normal).widthOfTextAtSize(aWinAnsi(t), tam);
  const centrado = (t: string, yy: number, o: { tam?: number; bold?: boolean; c?: [number, number, number] } = {}) =>
    texto(t, (612 - medir(t, o.tam ?? 10, o.bold)) / 2, yy, o);
  /** Parte un texto en líneas que caben en un ancho. */
  const partir = (t: string, tam: number, max: number, bold = false): string[] => {
    const lineas: string[] = [];
    for (const parrafo of aWinAnsi(t).split(/\n/)) {
      let actual = '';
      for (const palabra of parrafo.split(/\s+/).filter(Boolean)) {
        const prueba = actual ? `${actual} ${palabra}` : palabra;
        if (medir(prueba, tam, bold) <= max || !actual) actual = prueba;
        else {
          lineas.push(actual);
          actual = palabra;
        }
      }
      lineas.push(actual);
    }
    return lineas;
  };
  const linea = (yy: number, x1 = M, x2 = 612 - M, c: [number, number, number] = LINEA, grosor = 0.8) =>
    pagina.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness: grosor, color: color(c) });

  // Encabezado: escudo, institución y dependencia.
  let xTexto = M;
  if (d.institucion.logo?.length) {
    try {
      const b = d.institucion.logo;
      const img = b[0] === 0x89 && b[1] === 0x50 ? await doc.embedPng(b) : await doc.embedJpg(b);
      const esc = Math.min(48 / img.width, 48 / img.height);
      pagina.drawImage(img, { x: M, y: y - 34, width: img.width * esc, height: img.height * esc });
      xTexto = M + 62;
    } catch {
      /* logo no válido: se omite */
    }
  }
  texto(d.institucion.nombre.toUpperCase(), xTexto, y, { tam: 14, bold: true });
  texto([d.institucion.municipio, d.institucion.dependencia].filter(Boolean).join(' · '), xTexto, y - 17, { tam: 9.5, c: GRIS });
  y -= 52;
  linea(y);

  // Título
  y -= 34;
  centrado('CERTIFICADO DE AUTORIZACIÓN DE PERMISO', y, { tam: 15, bold: true, c: AZUL });
  y -= 18;
  centrado(`Radicado ${d.radicado} · Solicitud del ${fechaNumerica(d.solicitadoEn)}`, y, { tam: 9.5, c: GRIS });

  // Párrafo con partes en negrita.
  y -= 34;
  const partes: [string, boolean][] = [
    [`La ${d.institucion.dependencia.toLowerCase() || 'rectoría'} de`, false],
    [d.institucion.nombre.toUpperCase(), true],
    ['certifica que, una vez revisada la solicitud presentada por el/la docente', false],
    [d.docente.nombre.toUpperCase(), true],
    [`, identificado(a) con documento No.`, false],
    [d.docente.documento || '—', true],
    [',', false],
    ['AUTORIZÓ', true],
    ['el permiso que se detalla a continuación, en las condiciones aquí indicadas.', false],
  ];
  const palabras = partes.flatMap(([t, b]) => aWinAnsi(t).split(/\s+/).filter(Boolean).map((p) => ({ p, b })));
  const tam = 10.5;
  const interlinea = 16;
  let fila: { p: string; b: boolean }[] = [];
  const anchoFila = (f: typeof fila) => f.reduce((s, w, i) => s + medir(w.p, tam, w.b) + (i && !/^[,.]/.test(w.p) ? medir(' ', tam) : 0), 0);
  const dibujarFila = (f: typeof fila, justificar: boolean) => {
    const huecos = f.filter((w, i) => i && !/^[,.]/.test(w.p)).length;
    const extra = justificar && huecos ? (ancho - anchoFila(f)) / huecos : 0;
    let x = M;
    f.forEach((w, i) => {
      if (i && !/^[,.]/.test(w.p)) x += medir(' ', tam) + extra;
      texto(w.p, x, y, { tam, bold: w.b });
      x += medir(w.p, tam, w.b);
    });
    y -= interlinea;
  };
  for (const w of palabras) {
    if (fila.length && anchoFila([...fila, w]) > ancho) {
      dibujarFila(fila, true);
      fila = [];
    }
    fila.push(w);
  }
  if (fila.length) dibujarFila(fila, false);

  // Tabla de datos
  y -= 14;
  const filas: [string, string][] = [
    ['Docente', d.docente.nombre.toUpperCase()],
    ['Documento', d.docente.documento || '—'],
    ['Correo', d.docente.correo || '—'],
    ['Sede', d.docente.sede || '—'],
    ['Tipo de permiso', d.tipo],
    ['Fecha(s)', d.fechas],
    ['Horario', d.horario],
    ['Motivo', d.motivo || '—'],
    ...(d.reemplazo ? ([['Reemplazo', d.reemplazo]] as [string, string][]) : []),
    ['Soporte previo', d.soportePrevio],
    ['Soporte posterior', d.soportePosterior],
    ...(d.observacion ? ([['Observaciones', d.observacion]] as [string, string][]) : []),
  ];
  const col = 150;
  const tamT = 10;
  const pad = 8;
  const arriba = y;
  for (const [etq, valor] of filas) {
    const lineas = partir(valor, tamT, ancho - col - 2 * pad);
    const alto = Math.max(1, lineas.length) * 13 + 2 * pad - 2;
    texto(etq, M + pad, y - pad - 8, { tam: tamT, bold: true });
    lineas.forEach((l, i) => texto(l, M + col + pad, y - pad - 8 - i * 13, { tam: tamT }));
    y -= alto;
    linea(y);
  }
  // Bordes de la tabla
  linea(arriba);
  pagina.drawLine({ start: { x: M, y: arriba }, end: { x: M, y }, thickness: 0.8, color: color(LINEA) });
  pagina.drawLine({ start: { x: M + col, y: arriba }, end: { x: M + col, y }, thickness: 0.8, color: color(LINEA) });
  pagina.drawLine({ start: { x: 612 - M, y: arriba }, end: { x: 612 - M, y }, thickness: 0.8, color: color(LINEA) });

  // Firmas
  y -= 74;
  const mitad = (ancho - 24) / 2;
  linea(y, M, M + mitad, TINTA, 0.9);
  linea(y, M + mitad + 24, 612 - M, TINTA, 0.9);
  const centroIzq = M + mitad / 2;
  const centroDer = M + mitad + 24 + mitad / 2;
  const enCentro = (t: string, cx: number, yy: number, o: { tam?: number; bold?: boolean; c?: [number, number, number] } = {}) =>
    texto(t, cx - medir(t, o.tam ?? 10, o.bold) / 2, yy, o);
  enCentro(d.autorizadoPor.nombre, centroIzq, y - 15, { tam: 10.5 });
  enCentro(d.autorizadoPor.cargo, centroIzq, y - 28, { tam: 8.5, c: GRIS });
  enCentro(fechaLarga(d.autorizadoEn), centroDer, y - 15, { tam: 10.5 });
  enCentro('Fecha de autorización', centroDer, y - 28, { tam: 8.5, c: GRIS });

  // Pie
  y -= 62;
  linea(y);
  centrado(`Documento generado por SIGEI TIC · Para verificarlo, la institución puede consultar el radicado ${d.radicado}.`, y - 16, {
    tam: 8,
    c: GRIS,
  });

  return doc.save();
}

/** Uint8Array → base64 (para enviar el PDF a la función de correo). */
export function aBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/* ───────── Armar los datos desde SIGEI ───────── */

export const CARGO_REVISOR: Record<string, { cargo: string; dependencia: string }> = {
  rector: { cargo: 'Rector(a)', dependencia: 'Rectoría' },
  coordinador: { cargo: 'Coordinador(a)', dependencia: 'Coordinación' },
  admin: { cargo: 'Directivo(a)', dependencia: 'Rectoría' },
};

export function datosCertificado(a: {
  n: Novedad;
  docente: { nombres: string; apellidos: string; documento: string; email: string } | undefined;
  sede?: string;
  institucion: { nombre: string; municipio: string; logo?: Uint8Array | null };
  franjas: Franja[];
  tipo: string;
  reemplazo?: string;
  revisor: { nombre: string; rol: string };
}): DatosCertificado {
  const { n } = a;
  const cargo = CARGO_REVISOR[a.revisor.rol] ?? CARGO_REVISOR.rector;
  const soportes = n.soportes ?? [];
  return {
    radicado: radicado(n),
    institucion: { ...a.institucion, dependencia: cargo.dependencia },
    docente: {
      nombre: a.docente ? `${a.docente.nombres} ${a.docente.apellidos}`.trim() : '—',
      documento: a.docente?.documento ?? '',
      correo: a.docente?.email ?? '',
      sede: a.sede ?? '',
    },
    tipo: a.tipo,
    fechas: fechasPermiso(n),
    horario: horarioPermiso(n, a.franjas),
    motivo: n.motivo,
    soportePrevio: soportes.length ? `Aportado (${soportes.map((s) => s.nombre).join(', ')})` : 'No aportado',
    soportePosterior: soportePosterior(n),
    reemplazo: a.reemplazo,
    observacion: n.observacion_revision || undefined,
    solicitadoEn: n.created_at ?? n.fecha_inicio,
    autorizadoPor: { nombre: a.revisor.nombre || n.revisado_por || '—', cargo: cargo.cargo },
    autorizadoEn: n.revisado_en ?? new Date().toISOString(),
  };
}
