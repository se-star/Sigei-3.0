import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CalendarDays, ChevronRight, Clock3, ListTodo, Megaphone, Paperclip, Pin, Plus, School, UserRoundX } from 'lucide-react';
import { useMisGrupos } from './MiGrupo';
import { Insignia, Tarjeta, Vacio } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAjustes, useTabla } from '@/hooks/useDatos';
import { DIAS, ESTADOS_NOVEDAD, etiqueta, PRIORIDADES, tono, TIPOS_EVENTO, TIPOS_NOVEDAD } from '@/lib/catalogos';
import type { BloqueHorario } from '@/lib/types';
import { aMinutos, cx, desdeISO, fechaCorta, fechaDia, hace, horaBonita, hoyISO, nombreGrupo, porId } from '@/lib/utils';

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

/** Minutos desde la medianoche, actualizados cada minuto. */
function useAhora() {
  const calcular = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };
  const [ahora, setAhora] = useState(calcular);
  useEffect(() => {
    const t = setInterval(() => setAhora(calcular()), 60_000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}

function duracion(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Inicio del docente: su día, sus solicitudes y lo que pasa en la institución este mes. */
export default function InicioDocente() {
  const { perfil } = useAuth();
  const ajustes = useAjustes();
  const ahora = useAhora();
  const { data: horarios = [] } = useTabla('horarios');
  const { data: asignaturas = [] } = useTabla('asignaturas');
  const { data: grupos = [] } = useTabla('grupos');
  const { data: grados = [] } = useTabla('grados');
  const { data: novedades = [] } = useTabla('novedades');
  const { data: eventos = [] } = useTabla('eventos');
  const { data: comunicados = [] } = useTabla('comunicados');
  const { data: tareas = [] } = useTabla('tareas');

  const hoy = hoyISO();
  const asg = porId(asignaturas);
  const grs = porId(grupos);
  const dia = desdeISO(hoy).getDay();
  const mias = horarios.filter((h) => h.docente_id && h.docente_id === perfil?.docente_id);
  const deHoy = mias.filter((h) => h.dia === dia).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  const actual = deHoy.find((c) => aMinutos(c.hora_inicio) <= ahora && ahora < aMinutos(c.hora_fin));
  const siguiente = deHoy.find((c) => aMinutos(c.hora_inicio) > ahora);

  const misSolicitudes = novedades
    .filter((n) => n.docente_id === perfil?.docente_id)
    .sort((a, b) => (b.created_at ?? b.fecha_inicio).localeCompare(a.created_at ?? a.fecha_inicio))
    .slice(0, 4);
  const mes = hoy.slice(0, 7);
  const actividades = eventos
    .filter((e) => (e.fecha_fin || e.fecha_inicio) >= hoy && e.fecha_inicio.slice(0, 7) <= mes)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? ''))
    .slice(0, 6);
  const avisos = [...comunicados]
    .sort((a, b) => Number(b.fijado) - Number(a.fijado) || b.publicado_en.localeCompare(a.publicado_en))
    .slice(0, 3);
  const misTareas = tareas
    .filter((t) => t.estado !== 'hecha' && (t.responsable_id === perfil?.id || t.creado_por === perfil?.id))
    .sort((a, b) => (a.fecha_limite ?? '9').localeCompare(b.fecha_limite ?? '9'))
    .slice(0, 4);

  const nombreClase = (c: BloqueHorario) => `${asg.get(c.asignatura_id)?.nombre ?? 'Clase'} · ${grs.get(c.grupo_id)?.nombre ?? ''}`;
  const misGrupos = useMisGrupos();
  const accesos = [
    { to: '/novedades?nueva=1', texto: 'Solicitar permiso', icono: Plus },
    { to: '/horarios', texto: 'Mi horario', icono: Clock3 },
    ...(misGrupos.length ? [{ to: '/mi-grupo', texto: `Mi grupo ${misGrupos[0].nombre}`, icono: School }] : []),
    { to: '/calendario', texto: 'Actividades', icono: CalendarDays },
    { to: '/comunicados', texto: 'Comunicados', icono: Megaphone },
  ];

  return (
    <div className="flex flex-col gap-10">
      <section className="anim-rise flex flex-col items-center px-2 pt-6 pb-2 text-center sm:pt-10">
        <p className="text-[15px] text-muted">{fechaDia(hoy)}</p>
        <h1 className="mt-2 text-[40px] font-semibold sm:text-[56px]">
          {saludo()}, {perfil?.nombre.split(' ')[0]}
        </h1>
        <p className="mt-3 max-w-xl text-[16px] text-ink-2">
          {ajustes.nombre}
          {deHoy.length > 0 ? ` · Hoy tiene ${deHoy.length} ${deHoy.length === 1 ? 'clase' : 'clases'}` : ' · Hoy no tiene clases programadas'}
        </p>
        <nav className="mt-6 flex max-w-3xl flex-wrap justify-center gap-2" aria-label="Accesos rápidos">
          {accesos.map((x) => (
            <Link
              key={x.to}
              to={x.to}
              className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pr-4 pl-1.5 text-[15px] shadow-chip transition hover:shadow-pop"
            >
              <span className="grid size-7 place-items-center rounded-full bg-surface-2">
                <x.icono className="size-4" strokeWidth={1.75} />
              </span>
              {x.texto}
            </Link>
          ))}
        </nav>
      </section>

      {!perfil?.docente_id && (
        <div className="card">
          <Vacio
            icono={<UserRoundX className="size-6" />}
            titulo="Su cuenta no está vinculada a un registro docente"
            texto="Para ver su horario y solicitar permisos, pida a la coordinación que revise que su correo en el directorio de docentes sea el mismo con el que ingresa."
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          {/* Ahora y lo que sigue */}
          <section className={cx('card p-6', actual && 'bg-ink text-bg')}>
            {actual ? (
              <>
                <p className="text-sm opacity-70">En clase ahora · termina en {duracion(aMinutos(actual.hora_fin) - ahora)}</p>
                <p className="mt-1 text-[26px] font-semibold tracking-tight">{nombreClase(actual)}</p>
                <p className="mt-1 text-sm opacity-70">
                  {actual.hora_inicio}–{actual.hora_fin}
                  {actual.aula && ` · ${actual.aula}`}
                  {siguiente && ` · Después: ${nombreClase(siguiente)} a las ${horaBonita(siguiente.hora_inicio)}`}
                </p>
              </>
            ) : siguiente ? (
              <>
                <p className="text-sm text-muted">Próxima clase · en {duracion(aMinutos(siguiente.hora_inicio) - ahora)}</p>
                <p className="mt-1 text-[26px] font-semibold tracking-tight">{nombreClase(siguiente)}</p>
                <p className="mt-1 text-sm text-muted">
                  {horaBonita(siguiente.hora_inicio)} – {horaBonita(siguiente.hora_fin)}
                  {siguiente.aula && ` · ${siguiente.aula}`}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">Hoy</p>
                <p className="mt-1 text-[22px] font-semibold tracking-tight">{deHoy.length ? 'Ya terminó sus clases de hoy' : 'No tiene clases programadas hoy'}</p>
              </>
            )}
          </section>

          <Tarjeta titulo="Mis clases de hoy" icono={<Clock3 className="size-4" />} accion={<VerTodo to="/horarios" texto="Ver semana" />}>
            {deHoy.length === 0 ? (
              <p className="text-sm text-muted">Sin clases hoy.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {deHoy.map((c) => {
                  const paso = aMinutos(c.hora_fin) <= ahora;
                  const enCurso = c === actual;
                  return (
                    <li
                      key={c.id}
                      className={cx('flex items-center gap-4 rounded-[20px] px-4 py-2.5', enCurso ? 'bg-ink text-bg' : 'bg-surface-2', paso && 'opacity-50')}
                    >
                      <span className="w-28 shrink-0 text-sm font-medium tabular-nums">
                        {c.hora_inicio}–{c.hora_fin}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{asg.get(c.asignatura_id)?.nombre}</span>
                      <span className={cx('shrink-0 text-sm', enCurso ? 'opacity-70' : 'text-muted')}>
                        {nombreGrupo(grs.get(c.grupo_id), grados)}
                        {c.aula && ` · ${c.aula}`}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Tarjeta>

          <Tarjeta titulo="Actividades de este mes" icono={<CalendarDays className="size-4" />} accion={<VerTodo to="/calendario" />}>
            {actividades.length === 0 ? (
              <p className="text-sm text-muted">No hay más actividades programadas este mes.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {actividades.map((e) => {
                  const f = desdeISO(e.fecha_inicio);
                  return (
                    <li key={e.id} className="flex items-center gap-3">
                      <div className={cx('flex w-12 shrink-0 flex-col items-center rounded-[16px] py-1.5', e.fecha_inicio <= hoy ? 'bg-ink text-bg' : 'bg-surface-2')}>
                        <span className="text-[10px] uppercase">{DIAS[(f.getDay() + 6) % 7]?.corto ?? 'Dom'}</span>
                        <span className="text-lg leading-none font-semibold">{f.getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{e.titulo}</p>
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
        </div>

        <div className="flex flex-col gap-6">
          <Tarjeta titulo="Mis solicitudes" icono={<Bell className="size-4" />} accion={<VerTodo to="/novedades" />}>
            {misSolicitudes.length === 0 ? (
              <p className="text-sm text-muted">No ha radicado solicitudes.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {misSolicitudes.map((n) => (
                  <li key={n.id} className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {etiqueta(TIPOS_NOVEDAD, n.tipo)}
                        {!!n.soportes?.length && <Paperclip className="ml-1 inline size-3.5 text-muted" aria-label="con soportes" />}
                      </p>
                      <p className="text-xs text-muted">
                        {fechaCorta(n.fecha_inicio)}
                        {n.fecha_fin !== n.fecha_inicio && ` – ${fechaCorta(n.fecha_fin)}`}
                      </p>
                    </div>
                    <Insignia tono={tono(ESTADOS_NOVEDAD, n.estado)}>{etiqueta(ESTADOS_NOVEDAD, n.estado)}</Insignia>
                  </li>
                ))}
              </ul>
            )}
            {perfil?.docente_id && (
              <Link
                to="/novedades?nueva=1"
                className="mt-4 flex items-center justify-center gap-1.5 rounded-full border border-line py-2 text-sm shadow-chip transition hover:shadow-pop"
              >
                <Plus className="size-4" /> Solicitar permiso
              </Link>
            )}
          </Tarjeta>

          <Tarjeta titulo="Comunicados" icono={<Megaphone className="size-4" />} accion={<VerTodo to="/comunicados" />}>
            {avisos.length === 0 ? (
              <p className="text-sm text-muted">No hay comunicados.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {avisos.map((c) => (
                  <li key={c.id} className="border-l-2 pl-3" style={{ borderColor: c.prioridad === 'alta' ? 'var(--ink)' : 'var(--line)' }}>
                    <p className="flex items-center gap-1.5 font-medium">
                      {c.fijado && <Pin className="size-3.5" />}
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
              <p className="text-sm text-muted">No tiene tareas pendientes.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {misTareas.map((t) => (
                  <li key={t.id} className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{t.titulo}</p>
                      {t.fecha_limite && (
                        <p className={cx('text-xs', t.fecha_limite < hoy ? 'font-medium text-danger' : 'text-muted')}>
                          {t.fecha_limite < hoy ? 'Venció' : 'Vence'} {fechaCorta(t.fecha_limite)}
                        </p>
                      )}
                    </div>
                    <Insignia tono={tono(PRIORIDADES, t.prioridad)}>{etiqueta(PRIORIDADES, t.prioridad)}</Insignia>
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

function VerTodo({ to, texto = 'Ver todo' }: { to: string; texto?: string }) {
  return (
    <Link to={to} className="flex items-center gap-0.5 rounded-full py-1 pr-1 pl-3 text-[13px] text-muted transition hover:bg-surface-2 hover:text-ink">
      {texto} <ChevronRight className="size-4" />
    </Link>
  );
}
