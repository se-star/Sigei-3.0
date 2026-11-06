import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Cake,
  CalendarDays,
  Clock3,
  ListTodo,
  Megaphone,
  Pin,
  Plus,
  UserMinus,
  UsersRound,
  Network,
} from 'lucide-react';
import { Avatar, Boton, Esqueleto, Insignia, Tarjeta } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAjustes, useTabla } from '@/hooks/useDatos';
import { DIAS, etiqueta, PRIORIDADES, tono, TIPOS_EVENTO, TIPOS_NOVEDAD } from '@/lib/catalogos';
import {
  ausentesEn,
  cx,
  diasParaCumple,
  fechaCorta,
  fechaDia,
  hace,
  horaBonita,
  hoyISO,
  nombreDocente,
  nombreGrupo,
  porId,
  sumarDias,
  desdeISO,
} from '@/lib/utils';

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export default function Inicio() {
  const { perfil, editar } = useAuth();
  const ajustes = useAjustes();
  const { data: docentes, isLoading } = useTabla('docentes');
  const { data: grupos = [] } = useTabla('grupos');
  const { data: grados = [] } = useTabla('grados');
  const { data: novedades = [] } = useTabla('novedades');
  const { data: eventos = [] } = useTabla('eventos');
  const { data: comunicados = [] } = useTabla('comunicados');
  const { data: tareas = [] } = useTabla('tareas');
  const { data: horarios = [] } = useTabla('horarios');
  const { data: asignaturas = [] } = useTabla('asignaturas');
  const { data: asignaciones = [] } = useTabla('asignaciones');
  const { data: areas = [] } = useTabla('areas');

  const hoy = hoyISO();
  const docs = useMemo(() => porId(docentes), [docentes]);
  const activos = (docentes ?? []).filter((d) => d.estado === 'activo');
  const ausentes = ausentesEn(novedades, hoy);
  const directivo = perfil?.rol !== 'docente';
  // Un docente solo ve el estado de sus propias solicitudes.
  const pendientes = novedades.filter((n) => n.estado === 'pendiente' && (directivo || n.docente_id === perfil?.docente_id));
  const estudiantes = grupos.reduce((s, g) => s + (g.estudiantes || 0), 0);
  const proximos = eventos
    .filter((e) => (e.fecha_fin || e.fecha_inicio) >= hoy && e.fecha_inicio <= sumarDias(hoy, 21))
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? ''))
    .slice(0, 5);
  const avisos = [...comunicados]
    .sort((a, b) => Number(b.fijado) - Number(a.fijado) || b.publicado_en.localeCompare(a.publicado_en))
    .slice(0, 3);
  const misTareas = tareas
    .filter((t) => t.estado !== 'hecha' && (!t.responsable_id || t.responsable_id === perfil?.id))
    .sort((a, b) => (a.fecha_limite ?? '9').localeCompare(b.fecha_limite ?? '9'))
    .slice(0, 4);
  const cumples = (docentes ?? [])
    .filter((d) => d.estado !== 'retirado' && d.fecha_nacimiento)
    .map((d) => ({ d, en: diasParaCumple(d.fecha_nacimiento!) }))
    .filter((x) => x.en <= 30)
    .sort((a, b) => a.en - b.en)
    .slice(0, 5);

  const diaSemana = desdeISO(hoy).getDay(); // 0 domingo
  const misClases = perfil?.docente_id
    ? horarios
        .filter((h) => h.docente_id === perfil.docente_id && h.dia === diaSemana)
        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    : [];

  const cargaPorArea = useMemo(() => {
    const asg = porId(asignaturas);
    const mapa = new Map<string, number>();
    for (const a of asignaciones) {
      const areaId = asg.get(a.asignatura_id)?.area_id;
      if (areaId) mapa.set(areaId, (mapa.get(areaId) ?? 0) + a.horas_semanales);
    }
    return areas
      .map((a) => ({ area: a, horas: mapa.get(a.id) ?? 0 }))
      .filter((x) => x.horas > 0)
      .sort((a, b) => b.horas - a.horas);
  }, [asignaciones, asignaturas, areas]);
  const maxArea = Math.max(1, ...cargaPorArea.map((x) => x.horas));

  const primerNombre = perfil?.nombre.split(' ')[0] ?? '';

  return (
    <div className="flex flex-col gap-6">
      {/* Bienvenida */}
      <section className="anim-rise relative overflow-hidden rounded-3xl bg-[#0d2b28] px-6 py-7 text-white sm:px-8 dark:bg-[#0f2a27]">
        <div
          aria-hidden
          className="absolute -right-24 -bottom-32 size-80 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #bef264, transparent 65%)' }}
        />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-lime">{fechaDia(hoy)}</p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">
              {saludo()}, {primerNombre}
            </h1>
            <p className="mt-2 max-w-xl text-white/70">
              {ajustes.institucion} · Año lectivo {ajustes.anio_lectivo}
              {ausentes.length > 0 && (
                <>
                  {' '}
                  · <strong className="text-white">{ausentes.length}</strong>{' '}
                  {ausentes.length === 1 ? 'docente ausente hoy' : 'docentes ausentes hoy'}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/novedades?nueva=1">
              <Boton variante="lima" icono={<Plus className="size-4" />}>
                Registrar novedad
              </Boton>
            </Link>
            {editar('calendario') && (
              <Link to="/calendario?nuevo=1">
                <Boton variante="secundario" className="border-white/15 bg-white/10 text-white hover:bg-white/20" icono={<CalendarDays className="size-4" />}>
                  Nuevo evento
                </Boton>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador cargando={isLoading} icono={UsersRound} etiqueta="Docentes activos" valor={activos.length} pie={`${(docentes ?? []).length} en total`} to="/docentes" />
        <Indicador cargando={isLoading} icono={Network} etiqueta="Grupos" valor={grupos.length} pie={`${estudiantes.toLocaleString('es-CO')} estudiantes`} to="/grupos" />
        <Indicador
          cargando={isLoading}
          icono={Bell}
          etiqueta={directivo ? 'Novedades por revisar' : 'Mis solicitudes pendientes'}
          valor={pendientes.length}
          pie={pendientes.length ? (directivo ? 'Requieren respuesta' : 'En revisión') : 'Todo al día'}
          resaltar={directivo && pendientes.length > 0}
          to="/novedades"
        />
        <Indicador cargando={isLoading} icono={UserMinus} etiqueta="Ausentes hoy" valor={ausentes.length} pie={`${ausentes.filter((a) => a.reemplazo_id).length} con reemplazo`} to="/novedades" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          {perfil?.docente_id && (
            <Tarjeta titulo="Mis clases de hoy" icono={<Clock3 className="size-4" />} accion={<VerTodo to="/horarios?mio=1" />}>
              {misClases.length === 0 ? (
                <p className="text-sm text-muted">No tiene clases programadas para hoy.</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {misClases.map((c) => (
                    <li key={c.id} className="flex items-center gap-4 rounded-xl bg-surface-2 px-4 py-2.5">
                      <span className="w-28 text-sm font-semibold tabular-nums">
                        {c.hora_inicio}–{c.hora_fin}
                      </span>
                      <span className="flex-1 font-medium">{asignaturas.find((a) => a.id === c.asignatura_id)?.nombre}</span>
                      <span className="text-sm text-muted">{nombreGrupo(grupos.find((g) => g.id === c.grupo_id), grados)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Tarjeta>
          )}

          <Tarjeta titulo="Ausencias de hoy" icono={<UserMinus className="size-4" />} accion={<VerTodo to="/novedades" />}>
            {ausentes.length === 0 ? (
              <p className="text-sm text-muted">Todo el equipo docente está disponible hoy.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {ausentes.map((n) => {
                  const d = docs.get(n.docente_id);
                  const r = n.reemplazo_id ? docs.get(n.reemplazo_id) : undefined;
                  return (
                    <li key={n.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <Avatar nombre={nombreDocente(d)} tam={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{nombreDocente(d)}</p>
                        <p className="text-sm text-muted">
                          {etiqueta(TIPOS_NOVEDAD, n.tipo)} · hasta {fechaCorta(n.fecha_fin)}
                        </p>
                      </div>
                      {r ? (
                        <Insignia tono="ok">Reemplazo: {nombreDocente(r, true)}</Insignia>
                      ) : (
                        <Insignia tono="warn">Sin reemplazo</Insignia>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Tarjeta>

          <div className="grid gap-6 md:grid-cols-2">
            <Tarjeta titulo="Próximos eventos" icono={<CalendarDays className="size-4" />} accion={<VerTodo to="/calendario" />}>
              {proximos.length === 0 ? (
                <p className="text-sm text-muted">No hay eventos en las próximas tres semanas.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {proximos.map((e) => {
                    const f = desdeISO(e.fecha_inicio);
                    return (
                      <li key={e.id} className="flex items-center gap-3">
                        <div
                          className={cx(
                            'flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5',
                            e.fecha_inicio === hoy ? 'bg-lime text-lime-ink' : 'bg-surface-2',
                          )}
                        >
                          <span className="text-[10px] font-bold uppercase">{DIAS[(f.getDay() + 6) % 7]?.corto ?? 'Dom'}</span>
                          <span className="font-display text-lg leading-none font-bold">{f.getDate()}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{e.titulo}</p>
                          <p className="truncate text-xs text-muted">
                            {e.hora_inicio ? horaBonita(e.hora_inicio) : 'Todo el día'}
                            {e.lugar && ` · ${e.lugar}`}
                          </p>
                        </div>
                        <Insignia tono={tono(TIPOS_EVENTO, e.tipo)}>{etiqueta(TIPOS_EVENTO, e.tipo)}</Insignia>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Tarjeta>

            <Tarjeta titulo="Carga académica por área" accion={<VerTodo to="/asignacion" />}>
              {cargaPorArea.length === 0 ? (
                <p className="text-sm text-muted">Aún no hay asignación académica registrada.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {cargaPorArea.slice(0, 6).map(({ area, horas }) => (
                    <li key={area.id}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="truncate font-medium">{area.nombre}</span>
                        <span className="font-semibold tabular-nums">{horas} h</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-3">
                        <div className="h-full rounded-full" style={{ width: `${(horas / maxArea) * 100}%`, background: area.color }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Tarjeta titulo="Comunicados" icono={<Megaphone className="size-4" />} accion={<VerTodo to="/comunicados" />}>
            {avisos.length === 0 ? (
              <p className="text-sm text-muted">No hay comunicados publicados.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {avisos.map((c) => (
                  <li key={c.id} className="border-l-2 pl-3" style={{ borderColor: c.prioridad === 'alta' ? 'var(--danger)' : 'var(--line-strong)' }}>
                    <p className="flex items-center gap-1.5 font-semibold">
                      {c.fijado && <Pin className="size-3.5 text-brand" />}
                      {c.titulo}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted">{c.contenido}</p>
                    <p className="mt-1 text-xs text-muted">
                      {c.autor} · {hace(c.publicado_en)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta titulo="Mis tareas" icono={<ListTodo className="size-4" />} accion={<VerTodo to="/tareas" />}>
            {misTareas.length === 0 ? (
              <p className="text-sm text-muted">No tiene tareas pendientes. ¡Bien!</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {misTareas.map((t) => {
                  const vencida = t.fecha_limite && t.fecha_limite < hoy;
                  return (
                    <li key={t.id} className="flex items-start gap-3">
                      <span className={cx('mt-1.5 size-2 shrink-0 rounded-full', t.prioridad === 'alta' ? 'bg-danger' : t.prioridad === 'normal' ? 'bg-info' : 'bg-line-strong')} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{t.titulo}</p>
                        {t.fecha_limite && (
                          <p className={cx('text-xs', vencida ? 'font-semibold text-danger' : 'text-muted')}>
                            {vencida ? 'Venció' : 'Vence'} {fechaCorta(t.fecha_limite)}
                          </p>
                        )}
                      </div>
                      <Insignia tono={tono(PRIORIDADES, t.prioridad)}>{etiqueta(PRIORIDADES, t.prioridad)}</Insignia>
                    </li>
                  );
                })}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta titulo="Cumpleaños" icono={<Cake className="size-4" />}>
            {cumples.length === 0 ? (
              <p className="text-sm text-muted">Sin cumpleaños en los próximos 30 días.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {cumples.map(({ d, en }) => (
                  <li key={d.id}>
                    <Link to={`/docentes/${d.id}`} className="flex items-center gap-3 rounded-xl hover:bg-surface-2">
                      <Avatar nombre={nombreDocente(d)} tam={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{nombreDocente(d, true)}</span>
                        <span className="block text-xs text-muted">{fechaCorta(d.fecha_nacimiento)}</span>
                      </span>
                      {en === 0 ? <Insignia tono="lime">¡Hoy!</Insignia> : <span className="text-xs text-muted">en {en} d</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}

function Indicador({
  icono: I,
  etiqueta,
  valor,
  pie,
  to,
  resaltar,
  cargando,
}: {
  icono: typeof Bell;
  etiqueta: string;
  valor: number;
  pie: string;
  to: string;
  resaltar?: boolean;
  cargando?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cx(
        'card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand/40 sm:p-5',
        resaltar && 'border-warn/40 bg-warn-soft/40',
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cx('grid size-9 place-items-center rounded-xl', resaltar ? 'bg-warn-soft text-warn' : 'bg-brand-soft text-brand-soft-ink')}>
          <I className="size-[18px]" />
        </span>
        <ArrowRight className="size-4 text-muted opacity-0 transition group-hover:opacity-100" />
      </div>
      {cargando ? (
        <Esqueleto className="h-9 w-16" />
      ) : (
        <p className="font-display text-3xl leading-none font-extrabold tabular-nums sm:text-4xl">{valor}</p>
      )}
      <div>
        <p className="text-sm font-semibold">{etiqueta}</p>
        <p className="text-xs text-muted">{pie}</p>
      </div>
    </Link>
  );
}

function VerTodo({ to }: { to: string }) {
  return (
    <Link to={to} className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
      Ver todo <ArrowRight className="size-3" />
    </Link>
  );
}
