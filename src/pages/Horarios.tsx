import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CalendarPlus, CheckCircle2, Clock3, Printer, Trash2, UserRoundX } from 'lucide-react';
import { Boton, Campo, Cargando, Encabezado, Entrada, Insignia, Modal, Segmentos, Selector, Tarjeta, Vacio } from '@/components/ui';
import { HorarioSemanal } from '@/components/HorarioSemanal';
import { useAuth } from '@/hooks/useAuth';
import { useAjustes, useMutar, useTabla } from '@/hooks/useDatos';
import { useConfirmar } from '@/hooks/useConfirmar';
import { useToast } from '@/hooks/useToast';
import { DIAS } from '@/lib/catalogos';
import type { BloqueHorario, Dia, Nuevo } from '@/lib/types';
import { aISO, choquesDe, cx, descargarArchivo, duracionHoras, nombreDocente, nombreGrupo, porId } from '@/lib/utils';

type Modo = 'grupo' | 'docente';

export default function Horarios() {
  const { perfil } = useAuth();
  // El docente ve solo su propio horario, en una vista más sencilla.
  return perfil?.rol === 'docente' ? <MiHorario /> : <HorariosGestion />;
}

function HorariosGestion() {
  const { editar, perfil } = useAuth();
  const puede = editar('horarios');
  const ajustes = useAjustes();
  const [params, setParams] = useSearchParams();
  const { data: horarios, isLoading } = useTabla('horarios');
  const { data: grupos = [] } = useTabla('grupos');
  const { data: grados = [] } = useTabla('grados');
  const { data: docentes = [] } = useTabla('docentes');
  const { data: asignaturas = [] } = useTabla('asignaturas');
  const { data: areas = [] } = useTabla('areas');

  const inicialDoc = params.get('mio') && perfil?.docente_id ? perfil.docente_id : params.get('docente');
  const [modo, setModo] = useState<Modo>(inicialDoc ? 'docente' : 'grupo');
  const [grupoSel, setGrupoSel] = useState(params.get('grupo') ?? '');
  const [docSel, setDocSel] = useState(inicialDoc ?? '');
  const [form, setForm] = useState<{ abierto: boolean; bloque?: BloqueHorario; base?: Partial<BloqueHorario> }>({ abierto: false });

  const ord = porId(grados);
  const listaGrupos = useMemo(
    () => [...grupos].sort((a, b) => (ord.get(a.grado_id)?.orden ?? 0) - (ord.get(b.grado_id)?.orden ?? 0) || a.nombre.localeCompare(b.nombre)),
    [grupos, ord],
  );
  const activos = docentes.filter((d) => d.estado !== 'retirado').sort((a, b) => a.apellidos.localeCompare(b.apellidos));

  useEffect(() => {
    if (!grupoSel && listaGrupos.length) {
      const conHorario = listaGrupos.find((g) => horarios?.some((h) => h.grupo_id === g.id));
      setGrupoSel((conHorario ?? listaGrupos[0]).id);
    }
  }, [listaGrupos, grupoSel, horarios]);
  useEffect(() => {
    if (!docSel && activos.length) setDocSel(perfil?.docente_id ?? activos[0].id);
  }, [activos, docSel, perfil]);

  const todos = horarios ?? [];
  const asg = porId(asignaturas);
  const ars = porId(areas);
  const grs = porId(grupos);
  const docs = porId(docentes);
  const bloques = todos.filter((h) => (modo === 'grupo' ? h.grupo_id === grupoSel : h.docente_id === docSel));
  const horasSemana = bloques.reduce((s, b) => s + duracionHoras(b.hora_inicio, b.hora_fin), 0);

  const choquesInst = useMemo(() => {
    const vistos = new Set<string>();
    const out: { a: BloqueHorario; b: BloqueHorario; tipo: string }[] = [];
    for (const a of todos)
      for (const c of choquesDe(a, todos)) {
        const k = [a.id, c.con.id].sort().join('|');
        if (vistos.has(k)) continue;
        vistos.add(k);
        out.push({ a, b: c.con, tipo: c.tipo });
      }
    return out;
  }, [todos]);

  const titulo =
    modo === 'grupo' ? `Grupo ${nombreGrupo(grs.get(grupoSel), grados)}` : nombreDocente(docs.get(docSel));

  const cambiarModo = (m: Modo) => {
    setModo(m);
    setParams({}, { replace: true });
  };

  return (
    <>
      <Encabezado
        titulo="Horarios"
        descripcion="Programe las clases de cada grupo. SIGEI avisa si un docente, grupo o aula queda en dos lugares a la vez."
        acciones={
          <Boton variante="secundario" icono={<Printer className="size-4" />} onClick={() => window.print()}>
            Imprimir
          </Boton>
        }
      />

      <div className="no-print mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Segmentos<Modo>
          valor={modo}
          onCambio={cambiarModo}
          opciones={[
            { valor: 'grupo', etiqueta: 'Por grupo' },
            { valor: 'docente', etiqueta: 'Por docente' },
          ]}
        />
        {modo === 'grupo' ? (
          <Selector value={grupoSel} onChange={(e) => setGrupoSel(e.target.value)} className="sm:w-64" aria-label="Grupo">
            {listaGrupos.map((g) => (
              <option key={g.id} value={g.id}>
                {nombreGrupo(g, grados)}
              </option>
            ))}
          </Selector>
        ) : (
          <Selector value={docSel} onChange={(e) => setDocSel(e.target.value)} className="sm:w-72" aria-label="Docente">
            {activos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.apellidos}, {d.nombres}
              </option>
            ))}
          </Selector>
        )}
        <div className="flex items-center gap-2 text-sm text-muted sm:ml-auto">
          <Clock3 className="size-4" />
          <span className="tabular-nums">{Math.round(horasSemana * 10) / 10} h semanales</span>
        </div>
      </div>

      {isLoading ? (
        <Cargando />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
          <Tarjeta titulo={titulo}>
            {!ajustes.franjas.length ? (
              <Vacio titulo="Configure las franjas horarias" texto="Defina las horas de clase en Configuración para construir el horario." />
            ) : (
              <HorarioSemanal
                bloques={bloques}
                franjas={ajustes.franjas}
                color={(b) => ars.get(asg.get(b.asignatura_id)?.area_id ?? '')?.color}
                onCelda={
                  puede
                    ? (dia, f) =>
                        setForm({
                          abierto: true,
                          base: {
                            dia,
                            hora_inicio: f.inicio,
                            hora_fin: f.fin,
                            ...(modo === 'grupo' ? { grupo_id: grupoSel } : { docente_id: docSel }),
                          },
                        })
                    : undefined
                }
                onBloque={puede ? (b) => setForm({ abierto: true, bloque: b }) : undefined}
                render={(b) => (
                  <>
                    <span className="truncate text-[13px] leading-tight font-semibold">{asg.get(b.asignatura_id)?.nombre ?? '—'}</span>
                    <span className="truncate text-xs text-muted">
                      {modo === 'grupo' ? nombreDocente(docs.get(b.docente_id ?? ''), true) : grs.get(b.grupo_id)?.nombre}
                      {b.aula && ` · ${b.aula}`}
                    </span>
                  </>
                )}
              />
            )}
            {puede && <p className="no-print mt-3 text-xs text-muted">Haga clic en una celda vacía para programar una clase, o en una clase para editarla.</p>}
          </Tarjeta>

          <div className="no-print flex flex-col gap-6">
            <Tarjeta titulo="Revisión de choques">
              {choquesInst.length === 0 ? (
                <p className="flex items-center gap-2 text-sm font-medium text-ok">
                  <CheckCircle2 className="size-4" /> Sin choques en el horario institucional.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {choquesInst.slice(0, 8).map(({ a, b, tipo }) => (
                    <li key={a.id + b.id} className="rounded-xl bg-danger-soft p-3 text-sm">
                      <p className="flex items-center gap-1.5 font-semibold text-danger">
                        <AlertTriangle className="size-3.5" />
                        {tipo === 'docente' ? `Docente: ${nombreDocente(docs.get(a.docente_id ?? ''), true)}` : tipo === 'grupo' ? `Grupo ${grs.get(a.grupo_id)?.nombre}` : `Aula ${a.aula}`}
                      </p>
                      <p className="mt-0.5 text-ink-2">
                        {DIAS[a.dia - 1]?.largo} {a.hora_inicio} · {grs.get(a.grupo_id)?.nombre} y {grs.get(b.grupo_id)?.nombre}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
            <Tarjeta titulo="Convenciones">
              <ul className="flex flex-col gap-2 text-sm">
                {areas.map((a) => (
                  <li key={a.id} className="flex items-center gap-2">
                    <span className="size-3 rounded" style={{ background: a.color }} />
                    {a.nombre}
                  </li>
                ))}
              </ul>
            </Tarjeta>
          </div>
        </div>
      )}

      <FormBloque {...form} onCerrar={() => setForm({ abierto: false })} />
    </>
  );
}

function FormBloque({
  abierto,
  bloque,
  base,
  onCerrar,
}: {
  abierto: boolean;
  bloque?: BloqueHorario;
  base?: Partial<BloqueHorario>;
  onCerrar: () => void;
}) {
  const ajustes = useAjustes();
  const { data: horarios = [] } = useTabla('horarios');
  const { data: grupos = [] } = useTabla('grupos');
  const { data: grados = [] } = useTabla('grados');
  const { data: docentes = [] } = useTabla('docentes');
  const { data: asignaturas = [] } = useTabla('asignaturas');
  const { data: asignaciones = [] } = useTabla('asignaciones');
  const { crear, editar, eliminar } = useMutar('horarios');
  const confirmar = useConfirmar();
  const toast = useToast();
  const vacio: Nuevo<BloqueHorario> = { grupo_id: '', asignatura_id: '', docente_id: null, dia: 1, hora_inicio: '07:00', hora_fin: '08:00', aula: '' };
  const [v, setV] = useState<Nuevo<BloqueHorario>>(vacio);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));

  useEffect(() => {
    if (abierto) setV(bloque ? { ...bloque } : { ...vacio, ...base });
  }, [abierto, bloque, base]);

  // Al elegir grupo + asignatura, propone el docente de la asignación académica.
  const asigDelGrupo = asignaciones.filter((a) => a.grupo_id === v.grupo_id);
  const sugerido = asigDelGrupo.find((a) => a.asignatura_id === v.asignatura_id)?.docente_id;
  useEffect(() => {
    if (sugerido && !bloque && abierto) set('docente_id', sugerido);
  }, [sugerido]);

  const choques = v.grupo_id && v.hora_inicio < v.hora_fin ? choquesDe({ ...v, id: bloque?.id }, horarios) : [];
  const grs = porId(grupos);
  const ord = porId(grados);
  const asignadas = new Set(asigDelGrupo.map((a) => a.asignatura_id));

  const guardar = async () => {
    if (!v.grupo_id || !v.asignatura_id) return toast.error('Seleccione grupo y asignatura.');
    if (v.hora_inicio >= v.hora_fin) return toast.error('La hora de inicio debe ser anterior a la de fin.');
    if (choques.length) {
      const ok = await confirmar({
        titulo: 'Hay choques de horario',
        texto: `Esta clase se cruza con ${choques.length} ${choques.length === 1 ? 'clase' : 'clases'}. ¿Guardar de todas formas?`,
        confirmar: 'Guardar con choque',
        peligro: true,
      });
      if (!ok) return;
    }
    try {
      const datos = { ...v, aula: v.aula.trim(), docente_id: v.docente_id || null };
      if (bloque) await editar.mutateAsync({ id: bloque.id, cambios: datos });
      else await crear.mutateAsync(datos);
      toast.ok(bloque ? 'Clase actualizada.' : 'Clase programada.');
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  const borrar = async () => {
    if (!bloque) return;
    if (!(await confirmar({ titulo: 'Quitar clase del horario', confirmar: 'Quitar', peligro: true }))) return;
    try {
      await eliminar.mutateAsync(bloque.id);
      toast.ok('Clase eliminada del horario.');
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  const franjaActual = ajustes.franjas.findIndex((f) => f.inicio === v.hora_inicio && f.fin === v.hora_fin);

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={bloque ? 'Editar clase' : 'Programar clase'}
      pie={
        <>
          {bloque && (
            <Boton variante="fantasma" className="mr-auto text-danger hover:bg-danger-soft" icono={<Trash2 className="size-4" />} onClick={borrar}>
              Quitar
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
        <Campo etiqueta="Grupo" requerido>
          {(id) => (
            <Selector id={id} value={v.grupo_id} onChange={(e) => set('grupo_id', e.target.value)}>
              <option value="">Seleccione…</option>
              {[...grupos]
                .sort((a, b) => (ord.get(a.grado_id)?.orden ?? 0) - (ord.get(b.grado_id)?.orden ?? 0) || a.nombre.localeCompare(b.nombre))
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {nombreGrupo(g, grados)}
                  </option>
                ))}
            </Selector>
          )}
        </Campo>
        <Campo etiqueta="Día">
          {(id) => (
            <Selector id={id} value={v.dia} onChange={(e) => set('dia', Number(e.target.value) as Dia)}>
              {DIAS.map((d) => (
                <option key={d.valor} value={d.valor}>
                  {d.largo}
                </option>
              ))}
            </Selector>
          )}
        </Campo>
        <Campo etiqueta="Franja" className="sm:col-span-2">
          {(id) => (
            <Selector
              id={id}
              value={franjaActual}
              onChange={(e) => {
                const f = ajustes.franjas[Number(e.target.value)];
                if (f) setV((x) => ({ ...x, hora_inicio: f.inicio, hora_fin: f.fin }));
              }}
            >
              <option value={-1}>Horario personalizado</option>
              {ajustes.franjas.map((f, i) =>
                f.descanso ? null : (
                  <option key={f.inicio} value={i}>
                    {f.inicio} – {f.fin}
                  </option>
                ),
              )}
            </Selector>
          )}
        </Campo>
        <Campo etiqueta="Hora de inicio">
          {(id) => <Entrada id={id} type="time" value={v.hora_inicio} onChange={(e) => set('hora_inicio', e.target.value)} />}
        </Campo>
        <Campo etiqueta="Hora de fin">
          {(id) => <Entrada id={id} type="time" value={v.hora_fin} onChange={(e) => set('hora_fin', e.target.value)} />}
        </Campo>
        <Campo etiqueta="Asignatura" requerido ayuda={v.grupo_id && asignadas.size ? '★ = asignada a este grupo en la asignación académica' : undefined}>
          {(id) => (
            <Selector id={id} value={v.asignatura_id} onChange={(e) => set('asignatura_id', e.target.value)}>
              <option value="">Seleccione…</option>
              {[...asignaturas]
                .sort((a, b) => Number(asignadas.has(b.id)) - Number(asignadas.has(a.id)) || a.nombre.localeCompare(b.nombre))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {asignadas.has(s.id) ? '★ ' : ''}
                    {s.nombre}
                  </option>
                ))}
            </Selector>
          )}
        </Campo>
        <Campo etiqueta="Docente">
          {(id) => (
            <Selector id={id} value={v.docente_id ?? ''} onChange={(e) => set('docente_id', e.target.value || null)}>
              <option value="">Sin docente</option>
              {docentes
                .filter((d) => d.estado !== 'retirado')
                .sort((a, b) => a.apellidos.localeCompare(b.apellidos))
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.apellidos}, {d.nombres}
                  </option>
                ))}
            </Selector>
          )}
        </Campo>
        <Campo etiqueta="Aula o espacio" className="sm:col-span-2">
          {(id) => <Entrada id={id} value={v.aula} onChange={(e) => set('aula', e.target.value)} placeholder="Ej. Aula 201, Laboratorio" />}
        </Campo>
      </div>

      <div className={cx('mt-5 rounded-xl p-4 text-sm', choques.length ? 'bg-danger-soft' : 'bg-ok-soft')}>
        {choques.length === 0 ? (
          <p className="flex items-center gap-2 font-semibold text-ok">
            <CheckCircle2 className="size-4" /> Sin choques con otras clases.
          </p>
        ) : (
          <>
            <p className="mb-2 flex items-center gap-2 font-semibold text-danger">
              <AlertTriangle className="size-4" /> {choques.length} {choques.length === 1 ? 'choque detectado' : 'choques detectados'}
            </p>
            <ul className="flex flex-col gap-1 text-ink-2">
              {choques.map((c) => (
                <li key={c.con.id} className="flex flex-wrap items-center gap-2">
                  <Insignia tono="danger">{c.tipo === 'docente' ? 'Docente' : c.tipo === 'grupo' ? 'Grupo' : 'Aula'}</Insignia>
                  {asignaturas.find((a) => a.id === c.con.asignatura_id)?.nombre} en {grs.get(c.con.grupo_id)?.nombre}, {c.con.hora_inicio}–{c.con.hora_fin}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Modal>
  );
}

/** Horario personal del docente, con exportación a su calendario. */
function MiHorario() {
  const { perfil } = useAuth();
  const ajustes = useAjustes();
  const { data: horarios = [], isLoading } = useTabla('horarios');
  const { data: grupos = [] } = useTabla('grupos');
  const { data: grados = [] } = useTabla('grados');
  const { data: asignaturas = [] } = useTabla('asignaturas');
  const { data: areas = [] } = useTabla('areas');
  const asg = porId(asignaturas);
  const ars = porId(areas);
  const grs = porId(grupos);
  const mios = horarios.filter((h) => h.docente_id && h.docente_id === perfil?.docente_id);
  const horas = mios.reduce((s, b) => s + duracionHoras(b.hora_inicio, b.hora_fin), 0);
  const porGrupo = [...new Set(mios.map((b) => b.grupo_id))].map((g) => ({
    grupo: grs.get(g),
    clases: mios.filter((b) => b.grupo_id === g).length,
  }));

  /** Archivo .ics con cada clase repetida semanalmente hasta el final del año lectivo. */
  const exportar = () => {
    const hoy = new Date();
    const fin = `${ajustes.anio_lectivo}1130T235959`;
    const lineas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SIGEI 3.0//ES', 'X-WR-CALNAME:Mi horario de clases'];
    for (const b of mios) {
      const d = new Date(hoy);
      d.setDate(d.getDate() + ((b.dia - d.getDay() + 7) % 7));
      const f = aISO(d).replace(/-/g, '');
      const t = (h: string) => h.replace(':', '') + '00';
      lineas.push(
        'BEGIN:VEVENT',
        `UID:${b.id}@sigei`,
        `SUMMARY:${asg.get(b.asignatura_id)?.nombre ?? 'Clase'} · ${grs.get(b.grupo_id)?.nombre ?? ''}`,
        `DTSTART:${f}T${t(b.hora_inicio)}`,
        `DTEND:${f}T${t(b.hora_fin)}`,
        `RRULE:FREQ=WEEKLY;UNTIL=${fin}`,
        ...(b.aula ? [`LOCATION:${b.aula}`] : []),
        'END:VEVENT',
      );
    }
    lineas.push('END:VCALENDAR');
    descargarArchivo('mi-horario.ics', lineas.join('\r\n'), 'text/calendar;charset=utf-8');
  };

  if (!perfil?.docente_id)
    return (
      <>
        <Encabezado titulo="Mi horario" />
        <div className="card">
          <Vacio
            icono={<UserRoundX className="size-6" />}
            titulo="Su cuenta no está vinculada a un registro docente"
            texto="Pida a la coordinación que revise que su correo en el directorio de docentes sea el mismo con el que ingresa."
          />
        </div>
      </>
    );

  return (
    <>
      <Encabezado
        titulo="Mi horario"
        descripcion={`${mios.length} clases a la semana · ${Math.round(horas * 10) / 10} horas`}
        acciones={
          <>
            <Boton variante="secundario" icono={<CalendarPlus className="size-4" />} onClick={exportar} disabled={!mios.length} title="Importe el archivo en Google Calendar, Outlook o el calendario de su celular">
              Agregar a mi calendario
            </Boton>
            <Boton variante="secundario" icono={<Printer className="size-4" />} onClick={() => window.print()}>
              Imprimir
            </Boton>
          </>
        }
      />
      {isLoading ? (
        <Cargando />
      ) : !mios.length ? (
        <div className="card">
          <Vacio titulo="Aún no tiene clases en el horario" texto="Cuando la coordinación programe sus clases, aparecerán aquí." />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
          <Tarjeta titulo="Semana">
            <HorarioSemanal
              bloques={mios}
              franjas={ajustes.franjas}
              color={(b) => ars.get(asg.get(b.asignatura_id)?.area_id ?? '')?.color}
              render={(b) => (
                <>
                  <span className="truncate text-[13px] leading-tight font-semibold">{asg.get(b.asignatura_id)?.nombre ?? '—'}</span>
                  <span className="truncate text-xs text-muted">
                    {grs.get(b.grupo_id)?.nombre}
                    {b.aula && ` · ${b.aula}`}
                  </span>
                </>
              )}
            />
          </Tarjeta>
          <Tarjeta titulo="Mis grupos" className="no-print">
            <ul className="flex flex-col gap-2">
              {porGrupo.map(({ grupo, clases }) => (
                <li key={grupo?.id ?? clases} className="flex items-center justify-between rounded-[20px] bg-surface-2 px-4 py-2.5">
                  <span className="font-medium">{nombreGrupo(grupo, grados)}</span>
                  <span className="text-sm text-muted tabular-nums">{clases} clases</span>
                </li>
              ))}
            </ul>
          </Tarjeta>
        </div>
      )}
    </>
  );
}
