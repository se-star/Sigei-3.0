import type { BloqueHorario, Docente, Grado, Grupo, ID, Novedad } from './types';

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ');
}

/* ───────── Fechas ───────── */

export function hoyISO(): string {
  return aISO(new Date());
}

export function aISO(d: Date): string {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

export function desdeISO(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function sumarDias(s: string, n: number): string {
  const d = desdeISO(s);
  d.setDate(d.getDate() + n);
  return aISO(d);
}

const fmtCorta = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });
const fmtLarga = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtDia = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtHora = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' });

export function fechaCorta(s: string | null | undefined): string {
  return s ? fmtCorta.format(desdeISO(s)).replace('.', '') : '—';
}
export function fechaLarga(s: string | null | undefined): string {
  return s ? fmtLarga.format(desdeISO(s)) : '—';
}
export function fechaDia(s: string): string {
  const t = fmtDia.format(desdeISO(s));
  return t.charAt(0).toUpperCase() + t.slice(1);
}
export function fechaHora(iso: string): string {
  const d = new Date(iso);
  return `${fmtCorta.format(d).replace('.', '')} · ${fmtHora.format(d)}`;
}

export function hace(iso: string): string {
  const seg = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return 'hace un momento';
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  return fechaCorta(iso.slice(0, 10));
}

/** Días entre dos fechas ISO (incluyendo ambos extremos). */
export function diasEntre(a: string, b: string): number {
  return Math.round((desdeISO(b).getTime() - desdeISO(a).getTime()) / 86400000) + 1;
}

export function rangoActivo(inicio: string, fin: string | null | undefined, dia: string): boolean {
  return inicio <= dia && (fin || inicio) >= dia;
}

/** Próximo cumpleaños en días (0 = hoy). */
export function diasParaCumple(fechaNac: string, hoy = hoyISO()): number {
  const h = desdeISO(hoy);
  const n = desdeISO(fechaNac);
  let prox = new Date(h.getFullYear(), n.getMonth(), n.getDate());
  if (prox < h) prox = new Date(h.getFullYear() + 1, n.getMonth(), n.getDate());
  return Math.round((prox.getTime() - h.getTime()) / 86400000);
}

export function edad(fechaNac: string, hoy = hoyISO()): number {
  const h = desdeISO(hoy);
  const n = desdeISO(fechaNac);
  let e = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e--;
  return e;
}

/* ───────── Horas ───────── */

export function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function duracionHoras(inicio: string, fin: string): number {
  return Math.max(0, (aMinutos(fin) - aMinutos(inicio)) / 60);
}

export function horaBonita(hhmm: string | null | undefined): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suf = h >= 12 ? 'p. m.' : 'a. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suf}`;
}

export function seSolapan(a: { hora_inicio: string; hora_fin: string }, b: { hora_inicio: string; hora_fin: string }) {
  return aMinutos(a.hora_inicio) < aMinutos(b.hora_fin) && aMinutos(b.hora_inicio) < aMinutos(a.hora_fin);
}

export interface Choque {
  tipo: 'docente' | 'grupo' | 'aula';
  con: BloqueHorario;
}

/** Busca choques de un bloque contra el resto del horario institucional. */
export function choquesDe(bloque: Omit<BloqueHorario, 'id'> & { id?: ID }, todos: BloqueHorario[]): Choque[] {
  const out: Choque[] = [];
  for (const otro of todos) {
    if (otro.id === bloque.id || otro.dia !== bloque.dia || !seSolapan(bloque, otro)) continue;
    if (otro.grupo_id === bloque.grupo_id) out.push({ tipo: 'grupo', con: otro });
    else if (bloque.docente_id && otro.docente_id === bloque.docente_id) out.push({ tipo: 'docente', con: otro });
    else if (bloque.aula && otro.aula && otro.aula.trim().toLowerCase() === bloque.aula.trim().toLowerCase())
      out.push({ tipo: 'aula', con: otro });
  }
  return out;
}

/* ───────── Nombres ───────── */

export function nombreDocente(d: Pick<Docente, 'nombres' | 'apellidos'> | undefined | null, corto = false): string {
  if (!d) return '—';
  if (corto) return `${d.nombres.split(' ')[0]} ${d.apellidos.split(' ')[0]}`;
  return `${d.nombres} ${d.apellidos}`;
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length > 2 ? 2 : 1][0]).toUpperCase();
}

/** Abreviatura para el distintivo de una institución: su sigla (hasta 4 letras) o sus iniciales. */
export function abreviatura(i: { sigla?: string; nombre: string }): string {
  const sigla = (i.sigla ?? '').trim();
  return sigla ? sigla.slice(0, 4).toUpperCase() : iniciales(i.nombre);
}

export function nombreGrupo(g: Grupo | undefined, grados: Grado[]): string {
  if (!g) return '—';
  const gr = grados.find((x) => x.id === g.grado_id);
  return gr ? `${g.nombre} · ${gr.nombre}` : g.nombre;
}

export function porId<T extends { id: ID }>(lista: T[] | undefined): Map<ID, T> {
  return new Map((lista ?? []).map((x) => [x.id, x]));
}

/** Normaliza texto para búsquedas sin tildes ni mayúsculas. */
export function norm(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function coincide(q: string, ...campos: (string | null | undefined)[]): boolean {
  const t = norm(q).trim();
  if (!t) return true;
  const texto = norm(campos.join(' '));
  return t.split(/\s+/).every((p) => texto.includes(p));
}

/* ───────── Reglas de negocio ───────── */

/** Docentes ausentes en una fecha según novedades aprobadas. */
export function ausentesEn(novedades: Novedad[], dia: string): Novedad[] {
  return novedades.filter((n) => n.estado === 'aprobada' && rangoActivo(n.fecha_inicio, n.fecha_fin, dia));
}

/** Color de avatar estable a partir de un texto. */
// Tonos tierra apagados: los avatares no compiten con el acento violeta.
const PALETA_AVATAR = ['#665a54', '#8a7563', '#6f7d6b', '#9a6f5a', '#5d6870', '#332f2d', '#7a7268', '#866a72'];
export function colorDe(texto: string): string {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return PALETA_AVATAR[h % PALETA_AVATAR.length];
}

/* ───────── Exportación ───────── */

export function descargarCSV(nombre: string, columnas: string[], filas: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + [columnas, ...filas].map((f) => f.map(esc).join(';')).join('\r\n');
  descargarArchivo(`${nombre}.csv`, csv, 'text/csv;charset=utf-8');
}

export function descargarArchivo(nombre: string, contenido: string, tipo: string) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
