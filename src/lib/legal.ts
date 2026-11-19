/**
 * Datos de las páginas legales: versión vigente de la política, quién opera la
 * plataforma y qué guarda SIGEI en el navegador.
 *
 * Cada institución educativa es la RESPONSABLE del tratamiento de los datos de
 * su personal (Ley 1581 de 2012, art. 3). Quien opera SIGEI TIC es ENCARGADO:
 * trata los datos por cuenta de la institución.
 */
import type { Institucion } from './types';

/**
 * Versión vigente de los términos y la política. Al cambiarla, cada persona
 * debe aceptarlas de nuevo al ingresar. Cámbiela solo con cambios sustanciales.
 */
export const VERSION_POLITICAS = '2026-11-19';

const env = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Quién opera la plataforma. Se configura al publicar con las variables
 * VITE_OPERADOR_NOMBRE, VITE_OPERADOR_ID (NIT o cédula), VITE_OPERADOR_CORREO y
 * VITE_OPERADOR_CIUDAD (GitHub → Settings → Secrets and variables → Actions → Variables).
 */
export const OPERADOR = {
  nombre: env(import.meta.env.VITE_OPERADOR_NOMBRE),
  identificacion: env(import.meta.env.VITE_OPERADOR_ID),
  correo: env(import.meta.env.VITE_OPERADOR_CORREO),
  ciudad: env(import.meta.env.VITE_OPERADOR_CIUDAD),
};

/** Nombre con que se presenta al operador en los textos. */
export const nombreOperador = () => OPERADOR.nombre || 'el equipo que opera SIGEI TIC';

/** Datos de la institución responsable que se muestran en las políticas. */
export interface Responsable {
  nombre: string;
  nit: string;
  direccion: string;
  municipio: string;
  telefono: string;
  correo: string;
  rector: string;
}

export function responsableDe(i: Partial<Institucion> | null | undefined): Responsable | null {
  if (!i?.nombre) return null;
  return {
    nombre: i.nombre,
    nit: i.nit ?? '',
    direccion: i.direccion ?? '',
    municipio: i.municipio ?? '',
    telefono: i.telefono ?? '',
    correo: i.correo_datos ?? '',
    rector: i.rector ?? '',
  };
}

/** Qué le falta a la institución para que su política quede completa. */
export function faltantesResponsable(r: Responsable | null): string[] {
  if (!r) return [];
  const f: string[] = [];
  if (!r.nit) f.push('NIT');
  if (!r.direccion) f.push('dirección');
  if (!r.telefono) f.push('teléfono');
  if (!r.correo) f.push('correo para datos personales');
  return f;
}

export interface Almacenamiento {
  clave: string;
  para: string;
  tipo: 'Necesario' | 'Preferencia';
  dura: string;
}

/**
 * Todo lo que SIGEI guarda en el navegador (almacenamiento local; no usa cookies).
 * Si agrega una clave nueva en el código, añádala aquí.
 */
export const ALMACENAMIENTO: Almacenamiento[] = [
  {
    clave: 'sb-…-auth-token',
    para: 'Mantiene abierta su sesión de forma segura y completa el ingreso con enlace o recuperación de contraseña (lo crea el servicio de autenticación).',
    tipo: 'Necesario',
    dura: 'Hasta que cierre sesión',
  },
  {
    clave: 'sigei.institucion.…',
    para: 'Recuerda la última institución en la que trabajó.',
    tipo: 'Necesario',
    dura: 'Hasta que la borre',
  },
  {
    clave: 'sigei.leidas.…',
    para: 'Recuerda qué avisos ya leyó.',
    tipo: 'Necesario',
    dura: 'Hasta que la borre',
  },
  {
    clave: 'sigei.politicas.…',
    para: 'Respaldo de su aceptación de esta política, solo si la base de datos aún no la registra.',
    tipo: 'Necesario',
    dura: 'Hasta que la borre',
  },
  {
    clave: 'sigei.theme',
    para: 'Tema claro u oscuro que usted eligió.',
    tipo: 'Preferencia',
    dura: 'Hasta que la borre',
  },
  {
    clave: 'sigei.menu',
    para: 'Menú lateral abierto o reducido.',
    tipo: 'Preferencia',
    dura: 'Hasta que la borre',
  },
  {
    clave: 'sigei.vista.docentes',
    para: 'Vista de tabla o tarjetas en Docentes.',
    tipo: 'Preferencia',
    dura: 'Hasta que la borre',
  },
  {
    clave: 'sigei.ingreso',
    para: 'Última pestaña usada en la pantalla de ingreso.',
    tipo: 'Preferencia',
    dura: 'Hasta que la borre',
  },
  {
    clave: 'sigei.demo.…',
    para: 'Solo en el modo de demostración: los datos de ejemplo viven en su navegador.',
    tipo: 'Necesario',
    dura: 'Hasta que la borre',
  },
];

export type DocLegal = 'privacidad' | 'terminos' | 'cookies';

export const DOCS_LEGALES: { v: DocLegal; t: string; corto: string }[] = [
  {
    v: 'privacidad',
    t: 'Política de tratamiento de datos personales',
    corto: 'Privacidad',
  },
  { v: 'terminos', t: 'Términos y condiciones de uso', corto: 'Términos' },
  { v: 'cookies', t: 'Política de cookies y almacenamiento', corto: 'Cookies' },
];

/** «19 de noviembre de 2026» a partir de AAAA-MM-DD. */
export function fechaVersion(v = VERSION_POLITICAS) {
  const [a, m, d] = v.split('-').map(Number);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${d} de ${meses[m - 1]} de ${a}`;
}
