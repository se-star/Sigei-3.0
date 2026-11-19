/**
 * Créditos institucionales de SIGEI TIC: titular de los derechos y aliados del
 * proyecto. Se muestran en el ingreso, el menú lateral y las páginas legales.
 */

export interface Aliado {
  nombre: string;
  /** Ruta del logo dentro de public/ ('' mientras no se haya cargado el archivo oficial). */
  logo: string;
}

export const TITULAR = 'Centro de Ciencia y Tecnología de Antioquia';
export const PROYECTO = 'ALFATIC';
export const FINANCIADOR = 'Fundación Fraternidad Medellín';
export const ANIO_DERECHOS = 2026;

export const ALIADOS: Aliado[] = [
  { nombre: TITULAR, logo: '' },
  { nombre: FINANCIADOR, logo: '' },
];

export const DERECHOS = `Todos los derechos reservados para el ${TITULAR} en el marco del proyecto ${PROYECTO}, financiado por la ${FINANCIADOR}. ${ANIO_DERECHOS}.`;
