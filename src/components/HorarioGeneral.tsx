import { Fragment } from 'react';
import { Coffee, Plus } from 'lucide-react';
import { DIAS } from '@/lib/catalogos';
import type { BloqueHorario, Dia, Franja, ID } from '@/lib/types';
import { cx, seSolapan } from '@/lib/utils';

export interface ColumnaGeneral {
  id: ID;
  titulo: string;
  subtitulo?: string;
}

/**
 * Horario general de la institución: una columna por grupo (o por docente) y
 * una fila por bloque de cada día. Pensado para ver de un vistazo, e imprimir,
 * el horario de toda la institución.
 */
export function HorarioGeneral({
  bloques,
  franjas,
  dias,
  columnas,
  porColumna,
  color,
  linea1,
  linea2,
  onCelda,
  onBloque,
  onColumna,
}: {
  bloques: BloqueHorario[];
  franjas: Franja[];
  dias: Dia[];
  columnas: ColumnaGeneral[];
  /** Columna a la que pertenece un bloque (grupo_id o docente_id). */
  porColumna: (b: BloqueHorario) => ID | null;
  color: (b: BloqueHorario) => string | undefined;
  linea1: (b: BloqueHorario) => string;
  linea2: (b: BloqueHorario) => string;
  onCelda?: (dia: Dia, f: Franja, columna: ID) => void;
  onBloque?: (b: BloqueHorario) => void;
  onColumna?: (id: ID) => void;
}) {
  const clases = franjas.filter((f) => !f.descanso);
  // Índice: columna → día → bloques, para no recorrer todo en cada celda.
  const indice = new Map<string, BloqueHorario[]>();
  for (const b of bloques) {
    const col = porColumna(b);
    if (!col) continue;
    const k = `${col}|${b.dia}`;
    indice.set(k, [...(indice.get(k) ?? []), b]);
  }
  const celda = (col: ID, dia: Dia, f: Franja) =>
    (indice.get(`${col}|${dia}`) ?? []).filter((b) => seSolapan(b, { hora_inicio: f.inicio, hora_fin: f.fin }));

  return (
    <div className="scrollbar-thin relative max-h-[calc(100dvh-220px)] overflow-auto rounded-[20px] border border-line print:max-h-none print:overflow-visible print:border-0">
      <table className="w-full border-separate border-spacing-0 text-xs print:table-fixed print:text-[7px]">
        <thead>
          <tr>
            <th
              scope="col"
              colSpan={2}
              className="sticky top-0 left-0 z-30 min-w-[112px] border-r print:w-[52px] print:min-w-0 border-b border-line bg-surface-2 px-2 py-2 text-left text-[11px] font-semibold tracking-wide text-muted uppercase"
            >
              Día · bloque
            </th>
            {columnas.map((c) => (
              <th key={c.id} scope="col" className="sticky top-0 z-20 min-w-[112px] border-b print:min-w-0 print:px-0.5 border-line bg-surface-2 px-1.5 py-2 text-center">
                {onColumna ? (
                  <button type="button" onClick={() => onColumna(c.id)} className="w-full rounded-lg px-1 hover:text-brand" title={`Ver el horario de ${c.titulo}`}>
                    <span className="block truncate text-[13px] font-semibold print:text-[8px]">{c.titulo}</span>
                    {c.subtitulo && <span className="block truncate text-[10px] font-normal text-muted print:hidden">{c.subtitulo}</span>}
                  </button>
                ) : (
                  <>
                    <span className="block truncate text-[13px] font-semibold">{c.titulo}</span>
                    {c.subtitulo && <span className="block truncate text-[10px] font-normal text-muted">{c.subtitulo}</span>}
                  </>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dias.map((dia, di) => {
            const nombreDia = DIAS.find((x) => x.valor === dia)?.largo ?? '';
            const filas = franjas;
            return (
              <Fragment key={dia}>
                {filas.map((f, fi) => {
                  const primera = fi === 0;
                  const ultima = fi === filas.length - 1;
                  const borde = cx(ultima && di < dias.length - 1 && 'border-b-2 border-b-line-strong');
                  return (
                    <tr key={`${dia}-${f.inicio}`} className="break-inside-avoid">
                      {primera && (
                        <th
                          scope="rowgroup"
                          rowSpan={filas.length}
                          className={cx(
                            'sticky left-0 z-10 w-9 border-r border-line bg-surface align-middle print:w-4',
                            di < dias.length - 1 && 'border-b-2 border-b-line-strong',
                          )}
                        >
                          <span className="inline-block -rotate-180 text-[11px] font-semibold tracking-[0.18em] text-ink-2 uppercase [writing-mode:vertical-rl]">
                            {nombreDia}
                          </span>
                        </th>
                      )}
                      {f.descanso ? (
                        <>
                          <th scope="row" className={cx('sticky left-9 z-10 border-r border-line bg-surface px-2 text-left', borde)}>
                            <span className="flex items-center gap-1 py-1 text-[10px] font-semibold tracking-wide text-muted uppercase">
                              <Coffee className="size-3" /> {f.inicio}
                            </span>
                          </th>
                          <td colSpan={columnas.length} className={cx('bg-surface-2/60', borde)} />
                        </>
                      ) : (
                        <>
                          <th scope="row" className={cx('sticky left-9 z-10 min-w-[76px] border-r border-b border-line/60 bg-surface px-2 py-1 text-left print:min-w-0 print:px-0.5', borde)}>
                            <span className="block text-[11px] font-semibold text-brand print:text-[7px]">B{clases.indexOf(f) + 1}</span>
                            <span className="block text-[10px] text-muted tabular-nums print:text-[6px]">
                              {f.inicio}–{f.fin}
                            </span>
                          </th>
                          {columnas.map((c) => {
                            const aqui = celda(c.id, dia, f);
                            const choque = aqui.length > 1;
                            return (
                              <td key={c.id} className={cx('h-[46px] border-b border-line/60 p-0.5 align-top print:h-auto', borde)}>
                                {aqui.length === 0 ? (
                                  onCelda ? (
                                    <button
                                      type="button"
                                      onClick={() => onCelda(dia, f, c.id)}
                                      aria-label={`Programar clase de ${c.titulo} el ${nombreDia} en el bloque ${clases.indexOf(f) + 1}`}
                                      className="group grid size-full min-h-[42px] place-items-center rounded-lg text-muted transition hover:bg-brand-soft/50 hover:text-brand print:hidden"
                                    >
                                      <Plus className="size-3.5 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
                                    </button>
                                  ) : null
                                ) : (
                                  <div className={cx('flex h-full flex-col gap-0.5', choque && 'rounded-lg ring-2 ring-danger')}>
                                    {aqui.map((b) => {
                                      const c2 = color(b) ?? 'var(--brand)';
                                      const contenido = (
                                        <>
                                          <span className="block truncate text-[11.5px] leading-tight font-semibold print:overflow-visible print:text-[7px] print:hyphens-auto print:whitespace-normal">{linea1(b)}</span>
                                          <span className="block truncate text-[10px] leading-tight text-muted print:text-[6px]">{linea2(b)}</span>
                                        </>
                                      );
                                      const estilo = { background: `color-mix(in srgb, ${c2} 16%, var(--surface))`, borderLeft: `3px solid ${c2}` };
                                      return onBloque ? (
                                        <button
                                          key={b.id}
                                          type="button"
                                          onClick={() => onBloque(b)}
                                          title={`${linea1(b)} · ${linea2(b)}${b.aula ? ` · ${b.aula}` : ''}`}
                                          className="block w-full min-w-0 flex-1 rounded-md px-1.5 py-1 text-left transition hover:brightness-95"
                                          style={estilo}
                                        >
                                          {contenido}
                                        </button>
                                      ) : (
                                        <div key={b.id} className="min-w-0 flex-1 rounded-md px-1.5 py-1" style={estilo} title={`${linea1(b)} · ${linea2(b)}`}>
                                          {contenido}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </>
                      )}
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
