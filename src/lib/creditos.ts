/**
 * Créditos institucionales de SIGEI TIC: titular de los derechos y aliados del
 * proyecto. Se muestran en el ingreso, el menú lateral y las páginas legales.
 */

export const TITULAR = 'Centro de Ciencia y Tecnología de Antioquia';
export const PROYECTO = 'ALFATIC';
export const FINANCIADOR = 'Fundación Fraternidad Medellín';
export const ANIO_DERECHOS = 2026;

/**
 * Franja oficial de logos (Alfabetización TIC, CTA y Fundación Fraternidad Medellín),
 * en public/aliados/. La blanca es la original; la marina es la misma pieza para fondos claros.
 */
export const FRANJA_ALIADOS = {
  claro: 'aliados/aliados-marino.png',
  oscuro: 'aliados/aliados-blanco.png',
  ancho: 650,
  alto: 115,
  alt: `Alfabetización TIC, ${TITULAR} (CTA) y ${FINANCIADOR}`,
};

export const DERECHOS = `Todos los derechos reservados para el ${TITULAR} en el marco del proyecto ${PROYECTO}, financiado por la ${FINANCIADOR}. ${ANIO_DERECHOS}.`;
