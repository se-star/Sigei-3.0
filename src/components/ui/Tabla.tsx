import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '@/lib/utils';

export interface Columna<T> {
  id: string;
  titulo: string;
  celda: (fila: T) => ReactNode;
  /** Valor para ordenar; si falta, la columna no se puede ordenar. */
  orden?: (fila: T) => string | number;
  className?: string;
  /** Ocultar en pantallas pequeñas. */
  ocultarMovil?: boolean;
}

export function Tabla<T extends { id: string }>({
  filas,
  columnas,
  onFila,
  porPagina = 15,
  vacio,
}: {
  filas: T[];
  columnas: Columna<T>[];
  onFila?: (f: T) => void;
  porPagina?: number;
  vacio?: ReactNode;
}) {
  const [orden, setOrden] = useState<{ id: string; asc: boolean } | null>(null);
  const [pagina, setPagina] = useState(0);

  const ordenadas = useMemo(() => {
    if (!orden) return filas;
    const col = columnas.find((c) => c.id === orden.id);
    if (!col?.orden) return filas;
    const f = col.orden;
    return [...filas].sort((a, b) => {
      const va = f(a);
      const vb = f(b);
      const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
      return orden.asc ? r : -r;
    });
  }, [filas, columnas, orden]);

  const paginas = Math.max(1, Math.ceil(ordenadas.length / porPagina));
  const pag = Math.min(pagina, paginas - 1);
  const visibles = ordenadas.slice(pag * porPagina, (pag + 1) * porPagina);

  if (!filas.length && vacio) return <>{vacio}</>;

  return (
    <div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              {columnas.map((c) => (
                <th
                  key={c.id}
                  scope="col"
                  className={cx(
                    'px-4 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-muted uppercase first:pl-5 last:pr-5',
                    c.ocultarMovil && 'hidden md:table-cell',
                    c.className,
                  )}
                >
                  {c.orden ? (
                    <button
                      className="inline-flex items-center gap-1 uppercase hover:text-ink"
                      onClick={() =>
                        setOrden((o) => (o?.id === c.id ? (o.asc ? { id: c.id, asc: false } : null) : { id: c.id, asc: true }))
                      }
                    >
                      {c.titulo}
                      {orden?.id === c.id &&
                        (orden.asc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </button>
                  ) : (
                    c.titulo
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => (
              <tr
                key={f.id}
                onClick={onFila ? () => onFila(f) : undefined}
                onKeyDown={onFila ? (e) => e.key === 'Enter' && onFila(f) : undefined}
                tabIndex={onFila ? 0 : undefined}
                className={cx(
                  'border-b border-line/70 last:border-0',
                  onFila && 'cursor-pointer transition hover:bg-surface-2/70 focus-visible:bg-surface-2',
                )}
              >
                {columnas.map((c) => (
                  <td
                    key={c.id}
                    className={cx(
                      'px-4 py-3 align-middle first:pl-5 last:pr-5',
                      c.ocultarMovil && 'hidden md:table-cell',
                      c.className,
                    )}
                  >
                    {c.celda(f)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginas > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm text-muted">
          <span className="tabular-nums">
            {pag * porPagina + 1}–{Math.min((pag + 1) * porPagina, ordenadas.length)} de {ordenadas.length}
          </span>
          <div className="flex gap-1">
            <button
              className="grid size-8 place-items-center rounded-lg hover:bg-surface-2 disabled:opacity-40"
              onClick={() => setPagina(pag - 1)}
              disabled={pag === 0}
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              className="grid size-8 place-items-center rounded-lg hover:bg-surface-2 disabled:opacity-40"
              onClick={() => setPagina(pag + 1)}
              disabled={pag >= paginas - 1}
              aria-label="Página siguiente"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
