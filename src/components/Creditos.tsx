import { ANIO_DERECHOS, DERECHOS, FRANJA_ALIADOS as F, PROYECTO, TITULAR } from '@/lib/creditos';
import { cx } from '@/lib/utils';

const BASE = import.meta.env.BASE_URL;

/** Franja de logos de los aliados: marina en el tema claro y blanca en el oscuro. */
function Logos({ alto, className }: { alto: number; className?: string }) {
  const estilo = { height: alto, width: Math.round((alto * F.ancho) / F.alto) };
  return (
    <div className={cx('max-w-full', className)}>
      <img src={BASE + F.claro} alt={F.alt} style={estilo} className="max-w-full object-contain dark:hidden" />
      <img src={BASE + F.oscuro} alt={F.alt} style={estilo} className="hidden max-w-full object-contain dark:block" />
    </div>
  );
}

/**
 * Titular de los derechos y aliados de SIGEI TIC.
 * - ingreso: logos y la leyenda completa.
 * - legal: pie de las páginas legales.
 * - menu: versión compacta para el final del menú lateral.
 */
export function Creditos({ variante, className }: { variante: 'ingreso' | 'legal' | 'menu'; className?: string }) {
  if (variante === 'menu')
    return (
      <div className={cx('px-6 pb-3', className)}>
        <Logos alto={30} className="mb-1.5" />
        <p className="text-[11px] leading-snug text-muted" title={DERECHOS}>
          © {ANIO_DERECHOS} {TITULAR} · Proyecto {PROYECTO}
        </p>
      </div>
    );
  return (
    <div className={cx('flex flex-col items-center gap-3 text-center', className)}>
      <Logos alto={variante === 'ingreso' ? 64 : 48} />
      <p className={cx('max-w-xl text-xs leading-relaxed text-muted', variante === 'legal' && 'sm:text-left')}>{DERECHOS}</p>
    </div>
  );
}
