import type { ReactNode } from 'react';
import { Coffee, Plus } from 'lucide-react';
import { DIAS } from '@/lib/catalogos';
import type { BloqueHorario, Dia, Franja } from '@/lib/types';
import { cx, seSolapan } from '@/lib/utils';

/**
 * Cuadrícula semanal (franjas × días). Cada bloque se ubica en la franja con la
 * que se solapa. Si una celda tiene más de un bloque se marca como choque.
 */
export function HorarioSemanal({
  bloques,
  franjas,
  render,
  onCelda,
  onBloque,
  color,
}: {
  bloques: BloqueHorario[];
  franjas: Franja[];
  render: (b: BloqueHorario) => ReactNode;
  color?: (b: BloqueHorario) => string | undefined;
  onCelda?: (dia: Dia, f: Franja) => void;
  onBloque?: (b: BloqueHorario) => void;
}) {
  const conSabado = bloques.some((b) => b.dia === 6);
  const dias = DIAS.filter((d) => d.valor <= (conSabado ? 6 : 5));
  const filas = franjas.length ? franjas : [{ inicio: '07:00', fin: '08:00' }];

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-1.5 text-sm">
        <thead>
          <tr>
            <th className="w-24" />
            {dias.map((d) => (
              <th key={d.valor} scope="col" className="pb-1 text-xs font-semibold tracking-wider text-muted uppercase">
                <span className="hidden sm:inline">{d.largo}</span>
                <span className="sm:hidden">{d.corto}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.inicio}>
              <th scope="row" className="pr-1 text-right align-top text-xs font-semibold text-muted tabular-nums">
                <span className="block pt-2">{f.inicio}</span>
                <span className="block font-normal opacity-70">{f.fin}</span>
              </th>
              {f.descanso ? (
                <td colSpan={dias.length}>
                  <div className="flex h-9 items-center justify-center gap-2 rounded-xl bg-surface-2/60 text-xs font-semibold tracking-wide text-muted uppercase">
                    <Coffee className="size-3.5" /> Descanso
                  </div>
                </td>
              ) : (
                dias.map((d) => {
                  const celda = bloques.filter(
                    (b) => b.dia === d.valor && seSolapan(b, { hora_inicio: f.inicio, hora_fin: f.fin }),
                  );
                  const choque = celda.length > 1;
                  return (
                    <td key={d.valor} className="h-[68px] align-top">
                      {celda.length === 0 ? (
                        onCelda ? (
                          <button
                            onClick={() => onCelda(d.valor as Dia, f)}
                            className="group grid h-full min-h-[64px] w-full place-items-center rounded-xl border border-dashed border-line text-muted transition hover:border-brand hover:bg-brand-soft/40 hover:text-brand"
                            aria-label={`Agregar clase el ${d.largo} a las ${f.inicio}`}
                          >
                            <Plus className="size-4 opacity-0 transition group-hover:opacity-100" />
                          </button>
                        ) : (
                          <div className="h-full min-h-[64px] rounded-xl bg-surface-2/40" />
                        )
                      ) : (
                        <div className={cx('flex h-full flex-col gap-1', choque && 'rounded-xl ring-2 ring-danger ring-offset-1 ring-offset-surface')}>
                          {celda.map((b) => {
                            const c = color?.(b) ?? 'var(--brand)';
                            return (
                              <button
                                key={b.id}
                                onClick={onBloque ? () => onBloque(b) : undefined}
                                disabled={!onBloque}
                                className="flex min-h-[64px] w-full flex-1 flex-col justify-center rounded-xl px-2.5 py-1.5 text-left transition enabled:hover:brightness-95 disabled:cursor-default"
                                style={{ background: `color-mix(in srgb, ${c} 14%, var(--surface))`, borderLeft: `3px solid ${c}` }}
                              >
                                {render(b)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
