import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cx } from '@/lib/utils';

export interface OpcionMenu {
  texto: string;
  descripcion?: string;
  icono?: ReactNode;
  onClick: () => void;
}

/** Botón «⋯» (u otro contenido) que despliega un menú de acciones. */
export function MenuMas({
  opciones,
  etiqueta = 'Más opciones',
  className,
  disparador,
  claseDisparador,
  titulo,
  alinear = 'derecha',
}: {
  opciones: OpcionMenu[];
  etiqueta?: string;
  className?: string;
  /** Contenido del botón en lugar del ícono «⋯». */
  disparador?: ReactNode;
  claseDisparador?: string;
  /** Encabezado opcional dentro del menú. */
  titulo?: ReactNode;
  alinear?: 'izquierda' | 'derecha';
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      const items = [...(caja.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
      const i = items.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === 'Escape') {
        setAbierto(false);
        boton.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[(i + 1) % items.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[(i - 1 + items.length) % items.length]?.focus();
      }
    };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    caja.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  if (!opciones.length) return null;
  return (
    <div ref={caja} className={cx('relative', className)}>
      <button
        ref={boton}
        type="button"
        aria-label={etiqueta}
        title={disparador ? undefined : etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
        className={
          claseDisparador ??
          cx(
            'grid size-10 place-items-center rounded-full border border-line bg-surface text-ink shadow-chip transition hover:border-line-strong',
            abierto && 'border-line-strong',
          )
        }
      >
        {disparador ?? <MoreHorizontal className="size-5" />}
      </button>
      {abierto && (
        <div
          role="menu"
          aria-label={etiqueta}
          className={cx(
            'anim-fade absolute z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-[20px] border border-line bg-surface p-1.5 shadow-pop',
            alinear === 'derecha' ? 'right-0' : 'left-0',
          )}
        >
          {titulo && <div className="px-3 pt-2 pb-1.5 text-xs text-muted">{titulo}</div>}
          {opciones.map((o) => (
            <button
              key={o.texto}
              type="button"
              role="menuitem"
              onClick={() => {
                setAbierto(false);
                o.onClick();
              }}
              className="flex w-full items-start gap-3 rounded-[14px] px-3 py-2.5 text-left transition hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
            >
              {o.icono && <span className="mt-0.5 text-muted">{o.icono}</span>}
              <span className="min-w-0">
                <span className="block text-sm font-medium">{o.texto}</span>
                {o.descripcion && <span className="block text-xs text-muted">{o.descripcion}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
