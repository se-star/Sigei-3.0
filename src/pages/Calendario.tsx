import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarPlus, ChevronLeft, ChevronRight, Clock3, Download, MapPin, Plus, Trash2, UserRound } from 'lucide-react';
import { AreaTexto, Boton, Campo, Encabezado, Entrada, Insignia, Modal, Selector, Tarjeta } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMutar, useTabla } from '@/hooks/useDatos';
import { useConfirmar } from '@/hooks/useConfirmar';
import { useToast } from '@/hooks/useToast';
import { DIAS, etiqueta, tono, TIPOS_EVENTO } from '@/lib/catalogos';
import type { Evento, Nuevo, TipoEvento } from '@/lib/types';
import { aISO, cx, descargarArchivo, fechaDia, horaBonita, hoyISO, rangoActivo, sumarDias } from '@/lib/utils';

const COLOR_TIPO: Record<TipoEvento, string> = {
  academico: 'var(--brand)',
  institucional: 'var(--info)',
  cultural: 'var(--violet)',
  deportivo: 'var(--warn)',
  reunion: 'var(--ink-2)',
  festivo: 'var(--danger)',
  otro: 'var(--muted)',
};

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function exportarICS(eventos: Evento[], nombre: string) {
  const f = (d: string) => d.replace(/-/g, '');
  const hm = (h: string) => h.replace(':', '') + '00';
  const esc = (s: string) => s.replace(/[\\;,]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
  const lineas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SIGEI 3.0//ES', `X-WR-CALNAME:${esc(nombre)}`];
  for (const e of eventos) {
    lineas.push('BEGIN:VEVENT', `UID:${e.id}@sigei`, `SUMMARY:${esc(e.titulo)}`);
    if (e.hora_inicio) {
      lineas.push(`DTSTART:${f(e.fecha_inicio)}T${hm(e.hora_inicio)}`);
      lineas.push(`DTEND:${f(e.fecha_fin || e.fecha_inicio)}T${hm(e.hora_fin || e.hora_inicio)}`);
    } else {
      // En eventos de día completo DTEND es exclusivo: el día siguiente al último.
      lineas.push(`DTSTART;VALUE=DATE:${f(e.fecha_inicio)}`, `DTEND;VALUE=DATE:${f(sumarDias(e.fecha_fin || e.fecha_inicio, 1))}`);
    }
    if (e.lugar) lineas.push(`LOCATION:${esc(e.lugar)}`);
    if (e.descripcion) lineas.push(`DESCRIPTION:${esc(e.descripcion)}`);
    lineas.push('END:VEVENT');
  }
  lineas.push('END:VCALENDAR');
  descargarArchivo('calendario-institucional.ics', lineas.join('\r\n'), 'text/calendar;charset=utf-8');
}

export default function Calendario() {
  const { editar } = useAuth();
  const puede = editar('calendario');
  const [params, setParams] = useSearchParams();
  const { data: eventos = [] } = useTabla('eventos');
  const hoy = hoyISO();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [diaSel, setDiaSel] = useState(hoy);
  const [tipos, setTipos] = useState<TipoEvento[]>([]);
  const [form, setForm] = useState<{ abierto: boolean; evento?: Evento; fecha?: string }>({ abierto: false });

  useEffect(() => {
    if (params.get('nuevo')) {
      setForm({ abierto: true, fecha: hoy });
      setParams({}, { replace: true });
    }
  }, [params, setParams, hoy]);

  const filtrados = eventos.filter((e) => !tipos.length || tipos.includes(e.tipo));
  const celdas = useMemo(() => {
    const primero = new Date(cursor.y, cursor.m, 1);
    const offset = (primero.getDay() + 6) % 7; // semana inicia lunes
    const inicio = new Date(cursor.y, cursor.m, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return { iso: aISO(d), dia: d.getDate(), delMes: d.getMonth() === cursor.m, finde: d.getDay() === 0 || d.getDay() === 6 };
    });
  }, [cursor]);
  const semanas = celdas[35].delMes ? 6 : 5;

  const delDia = (iso: string) =>
    filtrados.filter((e) => rangoActivo(e.fecha_inicio, e.fecha_fin, iso)).sort((a, b) => (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? ''));
  const eventosSel = delDia(diaSel);

  const mover = (n: number) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const irHoy = () => {
    const d = new Date();
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setDiaSel(hoy);
  };

  return (
    <>
      <Encabezado
        titulo={puede ? 'Calendario institucional' : 'Actividades académicas'}
        descripcion={puede ? 'Cronograma de actividades, reuniones y fechas clave del año lectivo.' : 'Las actividades y fechas clave de su institución, mes a mes.'}
        acciones={
          <>
            <Boton variante="secundario" icono={<Download className="size-4" />} onClick={() => exportarICS(filtrados, 'Calendario institucional')} title="Importe el archivo en Google Calendar u Outlook">
              Exportar .ics
            </Boton>
            {puede && (
              <Boton icono={<Plus className="size-4" />} onClick={() => setForm({ abierto: true, fecha: diaSel })}>
                Nuevo evento
              </Boton>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo">
        {TIPOS_EVENTO.map((t) => {
          const activo = tipos.includes(t.valor);
          return (
            <button
              key={t.valor}
              onClick={() => setTipos(activo ? tipos.filter((x) => x !== t.valor) : [...tipos, t.valor])}
              aria-pressed={activo}
              className={cx(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition',
                activo ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink-2 hover:border-line-strong',
              )}
            >
              <span className="size-2 rounded-full" style={{ background: COLOR_TIPO[t.valor] }} />
              {t.etiqueta}
            </button>
          );
        })}
        {tipos.length > 0 && (
          <button onClick={() => setTipos([])} className="px-2 text-xs text-ink underline underline-offset-2">
            Ver todos
          </button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="card overflow-hidden">
          <header className="flex items-center gap-2 border-b border-line px-5 py-3.5">
            <h2 className="flex-1 font-display text-xl font-semibold">
              {MESES[cursor.m]} <span className="text-muted">{cursor.y}</span>
            </h2>
            <Boton variante="secundario" tam="sm" onClick={irHoy}>
              Hoy
            </Boton>
            <Boton variante="fantasma" tam="icono" onClick={() => mover(-1)} aria-label="Mes anterior">
              <ChevronLeft className="size-5" />
            </Boton>
            <Boton variante="fantasma" tam="icono" onClick={() => mover(1)} aria-label="Mes siguiente">
              <ChevronRight className="size-5" />
            </Boton>
          </header>
          <div className="grid grid-cols-7 border-b border-line bg-surface-2/50">
            {[...DIAS, { valor: 7, corto: 'Dom', largo: 'Domingo' }].map((d) => (
              <div key={d.valor} className="py-2 text-center text-[11px] font-semibold tracking-wider text-muted uppercase">
                {d.corto}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {celdas.slice(0, semanas * 7).map((c) => {
              const evs = delDia(c.iso);
              const sel = c.iso === diaSel;
              return (
                <button
                  key={c.iso}
                  onClick={() => setDiaSel(c.iso)}
                  onDoubleClick={() => puede && setForm({ abierto: true, fecha: c.iso })}
                  aria-label={`${fechaDia(c.iso)}, ${evs.length} eventos`}
                  aria-pressed={sel}
                  className={cx(
                    'flex min-h-[64px] flex-col gap-1 border-r border-b border-line p-1.5 text-left transition sm:min-h-[104px] sm:p-2 [&:nth-child(7n)]:border-r-0',
                    !c.delMes && 'bg-surface-2/40 text-muted',
                    c.finde && c.delMes && 'bg-surface-2/20',
                    sel ? 'bg-brand-soft/60' : 'hover:bg-surface-2/70',
                  )}
                >
                  <span
                    className={cx(
                      'grid size-7 place-items-center rounded-full text-sm font-semibold tabular-nums',
                      c.iso === hoy && 'bg-brand text-brand-ink',
                    )}
                  >
                    {c.dia}
                  </span>
                  <span className="hidden flex-col gap-0.5 sm:flex">
                    {evs.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className="truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                        style={{ background: `color-mix(in srgb, ${COLOR_TIPO[e.tipo]} 16%, var(--surface))`, color: 'var(--ink)' }}
                      >
                        {e.titulo}
                      </span>
                    ))}
                    {evs.length > 3 && <span className="px-1 text-[11px] font-semibold text-muted">+{evs.length - 3} más</span>}
                  </span>
                  <span className="flex gap-0.5 sm:hidden">
                    {evs.slice(0, 4).map((e) => (
                      <span key={e.id} className="size-1.5 rounded-full" style={{ background: COLOR_TIPO[e.tipo] }} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <Tarjeta
          titulo={fechaDia(diaSel)}
          accion={
            puede && (
              <Boton variante="fantasma" tam="icono" onClick={() => setForm({ abierto: true, fecha: diaSel })} aria-label="Agregar evento este día">
                <CalendarPlus className="size-4" />
              </Boton>
            )
          }
        >
          {eventosSel.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Sin eventos este día.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {eventosSel.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => setForm({ abierto: true, evento: e })}
                    disabled={!puede}
                    className="w-full rounded-xl border border-line p-3.5 text-left transition enabled:hover:shadow-pop"
                    style={{ borderLeft: `4px solid ${COLOR_TIPO[e.tipo]}` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{e.titulo}</p>
                      <Insignia tono={tono(TIPOS_EVENTO, e.tipo)}>{etiqueta(TIPOS_EVENTO, e.tipo)}</Insignia>
                    </div>
                    <div className="mt-2 flex flex-col gap-1 text-sm text-ink-2">
                      <span className="flex items-center gap-1.5">
                        <Clock3 className="size-3.5 text-muted" />
                        {e.hora_inicio ? `${horaBonita(e.hora_inicio)}${e.hora_fin ? ` – ${horaBonita(e.hora_fin)}` : ''}` : 'Todo el día'}
                      </span>
                      {e.lugar && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-3.5 text-muted" />
                          {e.lugar}
                        </span>
                      )}
                      {e.responsable && (
                        <span className="flex items-center gap-1.5">
                          <UserRound className="size-3.5 text-muted" />
                          {e.responsable}
                        </span>
                      )}
                    </div>
                    {e.descripcion && <p className="mt-2 text-sm text-muted">{e.descripcion}</p>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <FormEvento {...form} onCerrar={() => setForm({ abierto: false })} />
    </>
  );
}

function FormEvento({ abierto, evento, fecha, onCerrar }: { abierto: boolean; evento?: Evento; fecha?: string; onCerrar: () => void }) {
  const { crear, editar, eliminar } = useMutar('eventos');
  const confirmar = useConfirmar();
  const toast = useToast();
  const vacio: Nuevo<Evento> = { titulo: '', tipo: 'academico', fecha_inicio: hoyISO(), fecha_fin: null, hora_inicio: null, hora_fin: null, lugar: '', responsable: '', descripcion: '' };
  const [v, setV] = useState(vacio);
  const [todoDia, setTodoDia] = useState(false);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));
  useEffect(() => {
    if (!abierto) return;
    const base = evento ?? { ...vacio, fecha_inicio: fecha ?? hoyISO(), hora_inicio: '07:00', hora_fin: '08:00' };
    setV(base);
    setTodoDia(!base.hora_inicio);
  }, [abierto, evento, fecha]);

  const guardar = async () => {
    if (!v.titulo.trim()) return toast.error('Escriba el nombre del evento.');
    if (v.fecha_fin && v.fecha_fin < v.fecha_inicio) return toast.error('La fecha final no puede ser anterior a la inicial.');
    if (!todoDia && v.hora_inicio && v.hora_fin && v.hora_fin <= v.hora_inicio) return toast.error('La hora final debe ser posterior a la inicial.');
    const datos = {
      ...v,
      titulo: v.titulo.trim(),
      fecha_fin: v.fecha_fin && v.fecha_fin !== v.fecha_inicio ? v.fecha_fin : null,
      hora_inicio: todoDia ? null : v.hora_inicio || null,
      hora_fin: todoDia ? null : v.hora_fin || null,
    };
    try {
      if (evento) await editar.mutateAsync({ id: evento.id, cambios: datos });
      else await crear.mutateAsync(datos);
      toast.ok(evento ? 'Evento actualizado.' : 'Evento creado.');
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  const borrar = async () => {
    if (!evento || !(await confirmar({ titulo: 'Eliminar evento', texto: `¿Eliminar “${evento.titulo}”?`, confirmar: 'Eliminar', peligro: true }))) return;
    try {
      await eliminar.mutateAsync(evento.id);
      toast.ok('Evento eliminado.');
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={evento ? 'Editar evento' : 'Nuevo evento'}
      pie={
        <>
          {evento && (
            <Boton variante="fantasma" className="mr-auto text-danger hover:bg-danger-soft" icono={<Trash2 className="size-4" />} onClick={borrar}>
              Eliminar
            </Boton>
          )}
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={crear.isPending || editar.isPending}>
            Guardar
          </Boton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre del evento" requerido className="sm:col-span-2">
          {(id) => <Entrada id={id} value={v.titulo} onChange={(e) => set('titulo', e.target.value)} />}
        </Campo>
        <Campo etiqueta="Tipo">
          {(id) => (
            <Selector id={id} value={v.tipo} onChange={(e) => set('tipo', e.target.value as TipoEvento)}>
              {TIPOS_EVENTO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </Selector>
          )}
        </Campo>
        <Campo etiqueta="Lugar">
          {(id) => <Entrada id={id} value={v.lugar} onChange={(e) => set('lugar', e.target.value)} />}
        </Campo>
        <Campo etiqueta="Fecha de inicio" requerido>
          {(id) => <Entrada id={id} type="date" value={v.fecha_inicio} onChange={(e) => set('fecha_inicio', e.target.value)} />}
        </Campo>
        <Campo etiqueta="Fecha de fin" ayuda="Déjela vacía si es de un solo día.">
          {(id) => <Entrada id={id} type="date" min={v.fecha_inicio} value={v.fecha_fin ?? ''} onChange={(e) => set('fecha_fin', e.target.value || null)} />}
        </Campo>
        <label className="flex items-center gap-2.5 text-sm font-medium sm:col-span-2">
          <input type="checkbox" checked={todoDia} onChange={(e) => setTodoDia(e.target.checked)} className="size-4 accent-[var(--brand)]" />
          Todo el día
        </label>
        {!todoDia && (
          <>
            <Campo etiqueta="Hora de inicio">
              {(id) => <Entrada id={id} type="time" value={v.hora_inicio ?? ''} onChange={(e) => set('hora_inicio', e.target.value)} />}
            </Campo>
            <Campo etiqueta="Hora de fin">
              {(id) => <Entrada id={id} type="time" value={v.hora_fin ?? ''} onChange={(e) => set('hora_fin', e.target.value)} />}
            </Campo>
          </>
        )}
        <Campo etiqueta="Responsable" className="sm:col-span-2">
          {(id) => <Entrada id={id} value={v.responsable} onChange={(e) => set('responsable', e.target.value)} />}
        </Campo>
        <Campo etiqueta="Descripción" className="sm:col-span-2">
          {(id) => <AreaTexto id={id} value={v.descripcion} onChange={(e) => set('descripcion', e.target.value)} rows={3} />}
        </Campo>
      </div>
    </Modal>
  );
}
