import { ALIADOS, ANIO_DERECHOS, DERECHOS, PROYECTO, TITULAR } from '@/lib/creditos';
import { cx } from '@/lib/utils';

const BASE = import.meta.env.BASE_URL;

/** Logos de los aliados sobre fondo blanco, para que conserven sus colores también en el tema oscuro. */
function Logos({ alto, className }: { alto: number; className?: string }) {
  const conLogo = ALIADOS.filter((a) => a.logo);
  if (!conLogo.length) return null;
  return (
    <ul className={cx('flex flex-wrap items-center justify-center gap-2', className)} aria-label="Aliados del proyecto">
      {conLogo.map((a) => (
        <li key={a.nombre} className="rounded-xl bg-white px-3 py-2 ring-1 ring-black/5">
          <img src={BASE + a.logo} alt={a.nombre} style={{ height: alto }} className="w-auto object-contain" loading="lazy" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Titular de los derechos y aliados de SIGEI TIC.
 * - ingreso: logos medianos y la leyenda completa.
 * - legal: pie de las páginas legales.
 * - menu: versión compacta para el final del menú lateral.
 */
export function Creditos({ variante, className }: { variante: 'ingreso' | 'legal' | 'menu'; className?: string }) {
  if (variante === 'menu')
    return (
      <div className={cx('px-6 pb-3', className)}>
        <Logos alto={22} className="mb-2 justify-start gap-1.5" />
        <p className="text-[11px] leading-snug text-muted" title={DERECHOS}>
          © {ANIO_DERECHOS} {TITULAR} · Proyecto {PROYECTO}
        </p>
      </div>
    );
  return (
    <div className={cx('flex flex-col items-center gap-3 text-center', className)}>
      <Logos alto={variante === 'ingreso' ? 40 : 32} />
      <p className={cx('max-w-xl text-xs leading-relaxed text-muted', variante === 'legal' && 'sm:text-left')}>{DERECHOS}</p>
    </div>
  );
}
