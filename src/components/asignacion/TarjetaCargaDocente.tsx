import { Link } from 'react-router-dom';
import { CalendarRange, Pencil, Plus, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { MenuMas } from '@/components/ui/MenuMas';
import type { Area, Asignacion, Asignatura, Docente, Grado, Grupo, ID } from '@/lib/types';
import { cx, nombreDocente } from '@/lib/utils';

export interface AccionesCarga {
  onProgramar: (inicial: { docente: ID; grupo?: ID; asignatura?: ID }) => void;
  onEditar: (a: Asignacion) => void;
  onBorrar: (a: Asignacion) => void;
}

/** Anillo con las horas asignadas frente a la carga máxima. */
function AnilloCarga({ horas, max }: { horas: number; max: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, horas / max) : 0;
  const exceso = horas > max;
  const color = exceso ? 'var(--danger)' : horas === max && max > 0 ? 'var(--ok)' : 'var(--brand)';
  return (
    <div className="relative grid size-[60px] shrink-0 place-items-center" role="img" aria-label={`${horas} de ${max} horas`}>
      <svg viewBox="0 0 54 54" className="absolute inset-0 size-full -rotate-90">
        <circle cx="27" cy="27" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="5" />
        <circle
          cx="27"
          cy="27"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="relative text-center leading-none">
        <span className={cx('block font-display text-[17px] font-semibold tabular-nums', exceso && 'text-danger')}>{horas}</span>
        <span className="block text-[10px] text-muted tabular-nums">/{max} h</span>
      </span>
    </div>
  );
}

/**
 * Tarjeta de la carga académica de un docente: las asignaturas agrupadas, cada
 * una con sus grupos como etiquetas (en vez de una fila por grupo).
 */
export function TarjetaCargaDocente({
  d,
  suyas,
  horas,
  programadas,
  asignaturas,
  areas,
  grupos,
  grados,
  puede,
  acciones,
}: {
  d: Docente;
  suyas: Asignacion[];
  horas: number;
  programadas: (a: Asignacion) => number;
  asignaturas: Map<ID, Asignatura>;
  areas: Map<ID, Area>;
  grupos: Map<ID, Grupo>;
  grados: Map<ID, Grado>;
  puede: boolean;
  acciones: AccionesCarga;
}) {
  const max = d.carga_maxima;
  const exceso = horas - max;
  const enHorario = suyas.reduce((s, a) => s + Math.min(programadas(a), a.horas_semanales), 0);
  const porGrupo = (x: Asignacion, y: Asignacion) => {
    const gx = grupos.get(x.grupo_id);
    const gy = grupos.get(y.grupo_id);
    return (grados.get(gx?.grado_id ?? '')?.orden ?? 0) - (grados.get(gy?.grado_id ?? '')?.orden ?? 0) || (gx?.nombre ?? '').localeCompare(gy?.nombre ?? '', 'es', { numeric: true });
  };

  // Asignaturas agrupadas: «Ética y Valores · 9 grupos · 9 h».
  const porAsignatura = [...new Set(suyas.map((a) => a.asignatura_id))]
    .map((id) => {
      const lista = suyas.filter((a) => a.asignatura_id === id).sort(porGrupo);
      return { id, s: asignaturas.get(id), lista, horas: lista.reduce((t, a) => t + a.horas_semanales, 0) };
    })
    .sort((a, b) => b.horas - a.horas || (a.s?.nombre ?? '').localeCompare(b.s?.nombre ?? ''));
  const nGrupos = new Set(suyas.map((a) => a.grupo_id)).size;
  const area = areas.get(d.area_id ?? '');

  const estado =
    max <= 0
      ? null
      : exceso > 0
        ? { texto: `Excede ${exceso} h`, clase: 'bg-danger-soft text-danger' }
        : exceso === 0
          ? { texto: 'Carga completa', clase: 'bg-ok-soft text-ok' }
          : { texto: `Disponible ${-exceso} h`, clase: 'bg-surface-2 text-ink-2' };

  return (
    <article className={cx('card flex flex-col overflow-visible p-5', exceso > 0 && 'ring-1 ring-danger/30')}>
      <header className="flex items-start gap-3">
        <Avatar nombre={nombreDocente(d)} tam={42} />
        <div className="min-w-0 flex-1">
          <Link to={`/docentes/${d.id}`} className="line-clamp-2 leading-snug font-semibold hover:text-brand" title={nombreDocente(d)}>
            {nombreDocente(d)}
          </Link>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
            {area && <span className="size-2 shrink-0 rounded-full" style={{ background: area.color }} />}
            {area?.nombre ?? 'Sin área'}
          </p>
        </div>
        <AnilloCarga horas={horas} max={max} />
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        {estado && <span className={cx('rounded-full px-2.5 py-1 font-semibold', estado.clase)}>{estado.texto}</span>}
        {suyas.length > 0 && (
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-muted">
            {porAsignatura.length} {porAsignatura.length === 1 ? 'asignatura' : 'asignaturas'} · {nGrupos} {nGrupos === 1 ? 'grupo' : 'grupos'}
          </span>
        )}
        {suyas.length > 0 && enHorario < horas && (
          <span className="rounded-full bg-warn-soft px-2.5 py-1 text-warn" title="Horas asignadas que aún no están en el horario">
            {horas - enHorario} h sin horario
          </span>
        )}
      </div>

      {suyas.length === 0 ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-[20px] border border-dashed border-line px-4 py-6 text-center">
          <p className="text-sm font-medium">Sin asignaturas</p>
          <p className="mt-0.5 text-xs text-muted">Tiene {max} h disponibles.</p>
          {puede && (
            <button
              type="button"
              onClick={() => acciones.onProgramar({ docente: d.id })}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-brand-ink transition hover:brightness-110"
            >
              <CalendarRange className="size-3.5" /> Programar clases
            </button>
          )}
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {porAsignatura.map(({ id, s, lista, horas: h }) => {
            const color = areas.get(s?.area_id ?? '')?.color ?? 'var(--line-strong)';
            return (
              <li key={id} className="rounded-[18px] p-3" style={{ background: `color-mix(in srgb, ${color} 8%, var(--surface))` }}>
                <div className="flex items-baseline gap-2">
                  <span className="size-2.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: color }} />
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={s?.nombre}>
                    {s?.nombre ?? 'Asignatura eliminada'}
                  </p>
                  <span className="shrink-0 text-xs text-muted tabular-nums">
                    {lista.length > 1 ? `${lista.length} grupos · ` : ''}
                    {h} h
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 pl-[18px]">
                  {lista.map((a) => {
                    const g = grupos.get(a.grupo_id);
                    const prog = programadas(a);
                    const falta = prog < a.horas_semanales;
                    const texto = (
                      <>
                        {g?.nombre ?? '—'}
                        {(a.horas_semanales > 1 || falta) && (
                          <span className={cx('font-normal tabular-nums', falta ? 'text-warn' : 'text-muted')}>
                            {falta ? `${prog}/${a.horas_semanales}` : a.horas_semanales}h
                          </span>
                        )}
                      </>
                    );
                    const clase = cx(
                      'inline-flex items-center gap-1 rounded-full border bg-surface px-2.5 py-0.5 text-xs font-semibold transition',
                      falta ? 'border-dashed border-warn/60' : 'border-transparent shadow-chip',
                      puede && 'hover:border-line-strong',
                    );
                    const info = `${g?.nombre ?? ''}: ${prog} de ${a.horas_semanales} h en el horario`;
                    if (!puede)
                      return (
                        <span key={a.id} className={clase} title={info}>
                          {texto}
                        </span>
                      );
                    return (
                      <MenuMas
                        key={a.id}
                        etiqueta={`${s?.nombre ?? 'Asignatura'} en ${g?.nombre ?? 'grupo'}`}
                        disparador={texto}
                        claseDisparador={clase}
                        alinear="izquierda"
                        titulo={info}
                        opciones={[
                          {
                            texto: 'Programar en el horario',
                            icono: <CalendarRange className="size-4" />,
                            onClick: () => acciones.onProgramar({ docente: d.id, grupo: a.grupo_id, asignatura: a.asignatura_id }),
                          },
                          { texto: 'Editar horas o docente', icono: <Pencil className="size-4" />, onClick: () => acciones.onEditar(a) },
                          { texto: 'Quitar asignación', icono: <Trash2 className="size-4" />, onClick: () => acciones.onBorrar(a) },
                        ]}
                      />
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {puede && suyas.length > 0 && (
        <button
          type="button"
          onClick={() => acciones.onProgramar({ docente: d.id })}
          className="mt-3 flex items-center justify-center gap-1.5 rounded-full border border-dashed border-line py-2 text-xs font-semibold text-muted transition hover:border-brand hover:text-brand"
        >
          <Plus className="size-3.5" /> Agregar asignatura
        </button>
      )}
    </article>
  );
}
