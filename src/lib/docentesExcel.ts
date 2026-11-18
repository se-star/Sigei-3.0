/**
 * Plantilla, descarga e importación de docentes en Excel.
 * La lectura es pura (`analizarFilas`) para poder probarla; la escritura y la
 * lectura de archivos cargan las librerías solo cuando se usan.
 */
import { ESTADOS_DOCENTE, VINCULACIONES } from './catalogos';
import { normalizarDocumento } from './data/provider';
import type { Area, Docente, EstadoDocente, Nuevo, Sede, Vinculacion } from './types';
import { norm } from './utils';

type Campo = keyof Pick<
  Docente,
  | 'documento'
  | 'nombres'
  | 'apellidos'
  | 'email'
  | 'telefono'
  | 'fecha_nacimiento'
  | 'genero'
  | 'area_id'
  | 'sede_id'
  | 'vinculacion'
  | 'escalafon'
  | 'cargo'
  | 'estado'
  | 'carga_maxima'
  | 'fecha_ingreso'
>;

interface Columna {
  campo: Campo;
  titulo: string;
  obligatoria?: boolean;
  ancho: number;
  /** Otros nombres de encabezado aceptados al importar. */
  alias?: string[];
  ayuda: string;
}

export const COLUMNAS: Columna[] = [
  { campo: 'documento', titulo: 'Documento', obligatoria: true, ancho: 16, alias: ['cedula', 'numero de documento', 'identificacion', 'cc'], ayuda: 'Número de documento, sin puntos ni espacios.' },
  { campo: 'nombres', titulo: 'Nombres', obligatoria: true, ancho: 22, alias: ['nombre'], ayuda: 'Nombres del docente.' },
  { campo: 'apellidos', titulo: 'Apellidos', obligatoria: true, ancho: 22, alias: ['apellido'], ayuda: 'Apellidos del docente.' },
  { campo: 'email', titulo: 'Correo', ancho: 30, alias: ['correo electronico', 'email', 'e-mail'], ayuda: 'Con este correo el docente entra a SIGEI.' },
  { campo: 'telefono', titulo: 'Teléfono', ancho: 16, alias: ['celular', 'telefono celular'], ayuda: 'Número de contacto.' },
  { campo: 'fecha_nacimiento', titulo: 'Fecha de nacimiento', ancho: 18, alias: ['nacimiento'], ayuda: 'AAAA-MM-DD o DD/MM/AAAA.' },
  { campo: 'genero', titulo: 'Género', ancho: 11, alias: ['sexo'], ayuda: 'F, M u O.' },
  { campo: 'area_id', titulo: 'Área', ancho: 20, alias: ['area'], ayuda: 'Nombre del área, como aparece en SIGEI.' },
  { campo: 'sede_id', titulo: 'Sede', ancho: 20, ayuda: 'Nombre de la sede, como aparece en SIGEI.' },
  { campo: 'vinculacion', titulo: 'Vinculación', ancho: 15, alias: ['tipo de vinculacion'], ayuda: VINCULACIONES.map((v) => v.etiqueta).join(', ') + '.' },
  { campo: 'escalafon', titulo: 'Escalafón', ancho: 11, ayuda: 'Por ejemplo 2A o 14.' },
  { campo: 'cargo', titulo: 'Cargo', ancho: 20, ayuda: 'Si se deja vacío: Docente de aula.' },
  { campo: 'estado', titulo: 'Estado', ancho: 12, ayuda: ESTADOS_DOCENTE.map((v) => v.etiqueta).join(', ') + '. Si se deja vacío: Activo.' },
  { campo: 'carga_maxima', titulo: 'Carga máxima', ancho: 13, alias: ['carga maxima semanal', 'horas maximas'], ayuda: 'Horas semanales, de 0 a 60. Si se deja vacío: 22.' },
  { campo: 'fecha_ingreso', titulo: 'Fecha de ingreso', ancho: 16, alias: ['ingreso'], ayuda: 'AAAA-MM-DD o DD/MM/AAAA.' },
];

const GENEROS: Record<string, Docente['genero']> = {
  f: 'F',
  femenino: 'F',
  mujer: 'F',
  m: 'M',
  masculino: 'M',
  hombre: 'M',
  o: 'O',
  otro: 'O',
};

export type Celda = string | number | boolean | Date | null | undefined;

export interface FilaImportada {
  /** Número de fila en el archivo (como lo ve la persona en Excel). */
  fila: number;
  datos: Nuevo<Docente>;
  /** Campos que venían con valor en el archivo (al actualizar, solo se cambian esos). */
  presentes: Campo[];
  existente?: Docente;
  errores: string[];
  avisos: string[];
}

const clave = (s: string) => norm(s).replace(/\*/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const texto = (v: Celda): string => {
  if (v == null) return '';
  if (v instanceof Date) return aISO(v) ?? '';
  return String(v).trim();
};

function aISO(d: Date): string | null {
  if (isNaN(d.getTime())) return null;
  // Las fechas de Excel llegan a medianoche UTC.
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const dia = d.getUTCDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Convierte una celda de fecha (Date, número de Excel o texto) a AAAA-MM-DD. */
export function fechaDeCelda(v: Celda): string | null | 'invalida' {
  if (v == null || v === '') return null;
  if (v instanceof Date) return aISO(v) ?? 'invalida';
  if (typeof v === 'number') {
    // Número de serie de Excel (días desde 1899-12-30).
    if (v < 1 || v > 80000) return 'invalida';
    return aISO(new Date(Math.round((v - 25569) * 86400000)));
  }
  const s = String(v).trim();
  let y: number, m: number, d: number;
  let r = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (r) [y, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else if ((r = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) [d, m, y] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else return 'invalida';
  const f = new Date(Date.UTC(y, m - 1, d));
  if (f.getUTCFullYear() !== y || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d || y < 1900) return 'invalida';
  return aISO(f);
}

/**
 * Interpreta las filas de una hoja (con encabezados) y prepara los docentes a
 * crear o actualizar, con los errores y avisos de cada fila.
 */
export function analizarFilas(
  hoja: Celda[][],
  ctx: { areas: Area[]; sedes: Sede[]; existentes: Docente[] },
): { filas: FilaImportada[]; error?: string } {
  // Encabezado: la primera de las 10 primeras filas que tenga «Documento».
  const iEnc = hoja.slice(0, 10).findIndex((f) => f.some((c) => clave(texto(c)) === 'documento' || COLUMNAS[0].alias!.includes(clave(texto(c)))));
  if (iEnc < 0) return { filas: [], error: 'No encontramos la fila de encabezados. Use la plantilla de SIGEI: la primera fila debe tener la columna «Documento».' };
  const enc = hoja[iEnc].map((c) => clave(texto(c)));
  const pos = new Map<Campo, number>();
  for (const col of COLUMNAS) {
    const nombres = [clave(col.titulo), ...(col.alias ?? []).map(clave)];
    const i = enc.findIndex((e) => nombres.includes(e));
    if (i >= 0) pos.set(col.campo, i);
  }
  const faltan = COLUMNAS.filter((c) => c.obligatoria && !pos.has(c.campo)).map((c) => c.titulo);
  if (faltan.length) return { filas: [], error: `Faltan las columnas: ${faltan.join(', ')}.` };

  const porDoc = new Map(ctx.existentes.map((d) => [normalizarDocumento(d.documento), d]));
  const vistos = new Map<string, number>();
  const filas: FilaImportada[] = [];

  hoja.slice(iEnc + 1).forEach((celdas, k) => {
    const fila = iEnc + k + 2;
    const val = (c: Campo) => (pos.has(c) ? celdas[pos.get(c)!] : undefined);
    if (COLUMNAS.every((c) => texto(val(c.campo)) === '')) return; // fila vacía
    const errores: string[] = [];
    const avisos: string[] = [];
    const presentes = COLUMNAS.filter((c) => texto(val(c.campo)) !== '').map((c) => c.campo);

    const documento = normalizarDocumento(typeof val('documento') === 'number' ? String(Math.trunc(val('documento') as number)) : texto(val('documento')));
    const nombres = texto(val('nombres'));
    const apellidos = texto(val('apellidos'));
    if (!documento) errores.push('Falta el documento.');
    else if (!/^[0-9A-Za-z]{3,20}$/.test(documento)) errores.push(`Documento no válido: «${documento}».`);
    if (!nombres) errores.push('Faltan los nombres.');
    if (!apellidos) errores.push('Faltan los apellidos.');
    if (documento && vistos.has(documento)) errores.push(`El documento se repite en la fila ${vistos.get(documento)}.`);
    else if (documento) vistos.set(documento, fila);

    const email = texto(val('email')).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.push(`Correo no válido: «${email}».`);

    const fecha = (c: Campo, nombre: string) => {
      const f = fechaDeCelda(val(c) as Celda);
      if (f === 'invalida') {
        avisos.push(`${nombre} no reconocida; quedará vacía.`);
        return null;
      }
      return f;
    };

    const generoTxt = clave(texto(val('genero')));
    const genero = generoTxt ? GENEROS[generoTxt] : '';
    if (generoTxt && !genero) avisos.push(`Género «${texto(val('genero'))}» no reconocido; use F, M u O.`);

    const buscar = <T extends { id: string; nombre: string }>(lista: T[], nombre: string, que: string) => {
      if (!nombre) return null;
      const x = lista.find((a) => clave(a.nombre) === clave(nombre));
      if (!x) avisos.push(`${que} «${nombre}» no existe en SIGEI; quedará sin ${que.toLowerCase()}.`);
      return x?.id ?? null;
    };

    const opcion = <V extends string>(lista: { valor: V; etiqueta: string }[], v: string, defecto: V, que: string): V => {
      if (!v) return defecto;
      const x = lista.find((o) => clave(o.valor) === clave(v) || clave(o.etiqueta) === clave(v));
      if (!x) {
        avisos.push(`${que} «${v}» no reconocido; se usará «${lista.find((o) => o.valor === defecto)?.etiqueta}».`);
        return defecto;
      }
      return x.valor;
    };

    const cargaTxt = texto(val('carga_maxima'));
    let carga = 22;
    if (cargaTxt) {
      const n = Number(cargaTxt.replace(',', '.'));
      if (!Number.isFinite(n) || n < 0 || n > 60) errores.push(`Carga máxima no válida: «${cargaTxt}» (de 0 a 60).`);
      else carga = Math.round(n);
    }

    const datos: Nuevo<Docente> = {
      documento,
      nombres,
      apellidos,
      email,
      telefono: texto(val('telefono')),
      fecha_nacimiento: fecha('fecha_nacimiento', 'Fecha de nacimiento'),
      genero: genero || '',
      area_id: buscar(ctx.areas, texto(val('area_id')), 'Área'),
      sede_id: buscar(ctx.sedes, texto(val('sede_id')), 'Sede'),
      vinculacion: opcion<Vinculacion>(VINCULACIONES, texto(val('vinculacion')), 'planta', 'Vinculación'),
      escalafon: texto(val('escalafon')),
      cargo: texto(val('cargo')) || 'Docente de aula',
      estado: opcion<EstadoDocente>(ESTADOS_DOCENTE, texto(val('estado')), 'activo', 'Estado'),
      carga_maxima: carga,
      fecha_ingreso: fecha('fecha_ingreso', 'Fecha de ingreso'),
      notas: '',
    };
    filas.push({ fila, datos, presentes, existente: documento ? porDoc.get(documento) : undefined, errores, avisos });
  });
  return { filas };
}

/** Cambios para actualizar un docente existente: solo los campos que traía el archivo. */
export function cambiosDe(f: FilaImportada): Partial<Docente> {
  const c: Partial<Docente> = {};
  for (const campo of f.presentes) (c as Record<string, unknown>)[campo] = f.datos[campo];
  delete c.documento;
  return c;
}

/* ───────── Archivos ───────── */

/** Lee la primera hoja de un .xlsx o un .csv. */
export async function leerArchivo(archivo: File): Promise<Celda[][]> {
  if (/\.csv$/i.test(archivo.name) || archivo.type === 'text/csv') return leerCSV(await archivo.text());
  const { readSheet } = await import('read-excel-file/browser');
  return (await readSheet(archivo)) as Celda[][];
}

/** CSV con coma o punto y coma, con comillas. */
export function leerCSV(contenido: string): Celda[][] {
  const t = contenido.replace(/^﻿/, '');
  const primera = t.split(/\r?\n/, 1)[0] ?? '';
  const sep = (primera.match(/;/g)?.length ?? 0) > (primera.match(/,/g)?.length ?? 0) ? ';' : ',';
  const filas: Celda[][] = [];
  let fila: string[] = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (comillas) {
      if (ch === '"' && t[i + 1] === '"') (campo += '"'), i++;
      else if (ch === '"') comillas = false;
      else campo += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) fila.push(campo), (campo = '');
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = '';
    } else campo += ch;
  }
  if (campo || fila.length) fila.push(campo), filas.push(fila);
  return filas;
}

const ENCABEZADO = { fontWeight: 'bold' as const, backgroundColor: '#0A1F44', color: '#FFFFFF' };

async function escribir(hojas: { sheet: string; data: unknown[][]; columns: { width: number }[] }[], nombre: string) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await writeXlsxFile(hojas as any).toFile(nombre);
}

function hojaInstrucciones(areas: Area[], sedes: Sede[]) {
  const fila = (a: string, b = '', c = '') => [{ value: a, fontWeight: 'bold' as const }, b, c];
  return {
    sheet: 'Instrucciones',
    columns: [{ width: 24 }, { width: 14 }, { width: 70 }],
    data: [
      [{ value: 'Cómo llenar la plantilla de docentes de SIGEI TIC', fontWeight: 'bold' as const, fontSize: 14 }],
      ['Llene la hoja «Docentes», una fila por docente, sin cambiar los encabezados. Luego, en SIGEI: Docentes › ⋯ › Importar desde Excel.'],
      ['Si el documento ya existe en SIGEI, puede elegir actualizar ese docente con los datos del archivo.'],
      [],
      [
        { value: 'Columna', ...ENCABEZADO },
        { value: 'Obligatoria', ...ENCABEZADO },
        { value: 'Qué escribir', ...ENCABEZADO },
      ],
      ...COLUMNAS.map((c) => fila(c.titulo, c.obligatoria ? 'Sí' : 'No', c.ayuda)),
      [],
      fila('Áreas de la institución', '', areas.map((a) => a.nombre).join(', ') || 'Aún no hay áreas creadas.'),
      fila('Sedes de la institución', '', sedes.map((s) => s.nombre).join(', ') || 'Aún no hay sedes creadas.'),
      [],
      fila('Ejemplo', '', '1032456789 · Laura Marcela · Restrepo Gil · laura@colegio.edu.co · 3001234567 · 1985-03-18 · F · Matemáticas · Planta · 2A'),
    ],
  };
}

const encabezados = () => COLUMNAS.map((c) => ({ value: c.obligatoria ? `${c.titulo} *` : c.titulo, ...ENCABEZADO }));

/** Plantilla vacía para cargar varios docentes. */
export async function descargarPlantilla(areas: Area[], sedes: Sede[]) {
  await escribir(
    [
      { sheet: 'Docentes', columns: COLUMNAS.map((c) => ({ width: c.ancho })), data: [encabezados()] },
      hojaInstrucciones(areas, sedes),
    ],
    'plantilla-docentes-sigei.xlsx',
  );
}

/** Lista de docentes en el mismo formato de la plantilla (se puede volver a importar), más sus horas asignadas. */
export async function descargarDocentes(docentes: Docente[], ctx: { areas: Area[]; sedes: Sede[]; horas: Map<string, number> }, nombre = 'docentes-sigei.xlsx') {
  const nombreDe = <T extends { id: string; nombre: string }>(l: T[], id: string | null) => l.find((x) => x.id === id)?.nombre ?? '';
  const etiquetaDe = (l: { valor: string; etiqueta: string }[], v: string) => l.find((o) => o.valor === v)?.etiqueta ?? v;
  const filas = docentes.map((d) =>
    COLUMNAS.map((c) => {
      switch (c.campo) {
        case 'area_id':
          return nombreDe(ctx.areas, d.area_id);
        case 'sede_id':
          return nombreDe(ctx.sedes, d.sede_id);
        case 'vinculacion':
          return etiquetaDe(VINCULACIONES, d.vinculacion);
        case 'estado':
          return etiquetaDe(ESTADOS_DOCENTE, d.estado);
        case 'carga_maxima':
          return d.carga_maxima;
        case 'documento':
          return { value: d.documento, type: String };
        default:
          return (d[c.campo] as string | null) ?? '';
      }
    }).concat([ctx.horas.get(d.id) ?? 0]),
  );
  await escribir(
    [
      {
        sheet: 'Docentes',
        columns: [...COLUMNAS.map((c) => ({ width: c.ancho })), { width: 16 }],
        data: [[...encabezados(), { value: 'Horas asignadas', ...ENCABEZADO }], ...filas],
      },
    ],
    nombre,
  );
}
