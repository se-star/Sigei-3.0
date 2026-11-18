import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Coffee, MousePointerClick, Plus, RotateCcw, X } from 'lucide-react';
import { Boton, Campo, Entrada, Progreso, Selector, Tarjeta, Vacio } from '@/components/ui';
import { useAjustes, useMutar, useTabla } from '@/hooks/useDatos';
import { useToast } from '@/hooks/useToast';
import { AsistenteClases } from './AsistenteClases';
import { DIAS } from '@/lib/catalogos';
import { claveCelda, estadoCelda, horasDe, horasProgramadas, sincronizarAsignacion, type EstadoCelda } from '@/lib/programador';
import type { Dia, Franja, ID } from '@/lib/types';
import { cx, nombreDocente, nombreGrupo, porId } from '@/lib/utils';

interface Marca {
  dia: Dia;
  franja: Franja;
}

/**
 * Asignación académica directamente sobre el horario: se elige docente, grupo y
 * asignatura, se marcan las franjas en la cuadrícula y se guarda. La pantalla
 * queda abierta para seguir con otra asignatura o grupo.
 */
export function ProgramadorClases({ inicial }: { inicial?: { docente?: ID; grupo?: ID } }) {
  const ajustes = useAjustes();
  const { data: horarios = [] } = useTabla('horarios');
  const { data: asignaciones = [] } = useTabla('asignaciones');
  const { data: docentes = [] } = useTabla('docentes');
  const { data: grupos = [] } = useTabla('grupos');
  const { data: grados = [] } = useTabla('grados');
  const { data: sedes = [] } = useTabla('sedes');
  const { data: asignaturas = [] } = useTabla('asignaturas');
  const { data: areas = [] } = useTabla('areas');
  const mH = useMutar('horarios');
  const mA = useMutar('asignaciones');
  const toast = useToast();

  const [docente, setDocente] = useState<ID>(inicial?.docente ?? '');
  const [grupo, setGrupo] = useState<ID>(inicial?.grupo ?? '');
  const [asignatura, setAsignatura] = useState<ID>('');
  const [aula, setAula] = useState('');
  const [nuevas, setNuevas] = useState<Marca[]>([]);
  const [quitar, setQuitar] = useState<ID[]>([]);
  const [guardando, setGuardando] = useState(false);
  const cajaAsignatura = useRef<HTMLDivElement>(null);

  // Al llegar desde «Agregar asignatura» de un docente o un grupo.
  useEffect(() => {
    if (!inicial) return;
    if (inicial.docente) setDocente(inicial.docente);
    if (inicial.grupo) setGrupo(inicial.grupo);
    setAsignatura('');
  }, [inicial]);

  const asg = porId(asignaturas);
  const ars = porId(areas);
  const grs = porId(grupos);
  const docs = porId(docentes);
  const ord = porId(grados);
  const activos = useMemo(() => docentes.filter((d) => d.estado === 'activo' || d.id === docente).sort((a, b) => a.apellidos.localeCompare(b.apellidos)), [docentes, docente]);
  const listaGrupos = useMemo(
    () => [...grupos].sort((a, b) => (ord.get(a.grado_id)?.orden ?? 0) - (ord.get(b.grado_id)?.orden ?? 0) || a.nombre.localeCompare(b.nombre)),
    [grupos, ord],
  );
  const sedesConGrupos = sedes.filter((s) => grupos.some((g) => g.sede_id === s.id));
  const sinSede = listaGrupos.filter((g) => !g.sede_id || !sedes.some((s) => s.id === g.sede_id));

  const d = docs.get(docente);
  const sel = { docente_id: docente || undefined, grupo_id: grupo || undefined, asignatura_id: asignatura || undefined, aula };
  const listo = !!(docente && grupo && asignatura);
  const color = (asignaturaId: ID | undefined) => ars.get(asg.get(asignaturaId ?? '')?.area_id ?? '')?.color ?? 'var(--brand)';

  // Otra persona ya dicta esta asignatura en este grupo (una asignatura por grupo tiene un solo docente).
  const deOtro = asignatura && grupo ? asignaciones.find((a) => a.grupo_id === grupo && a.asignatura_id === asignatura && a.docente_id !== docente) : undefined;
  const asigActual = asignaciones.find((a) => a.docente_id === docente && a.grupo_id === grupo && a.asignatura_id === asignatura);
  const progActual = listo ? horasProgramadas({ docente_id: docente, grupo_id: grupo, asignatura_id: asignatura }, horarios) : 0;
  const horasNuevas = nuevas.reduce((s, m) => s + horasDe({ hora_inicio: m.franja.inicio, hora_fin: m.franja.fin }), 0);
  const horasQuitadas = quitar.reduce((s, id) => s + horasDe(horarios.find((h) => h.id === id) ?? { hora_inicio: '0:00', hora_fin: '0:00' }), 0);
  const progDespues = progActual + horasNuevas - horasQuitadas;

  // Carga del docente: horas asignadas más lo que agregaría este guardado.
  const asignadasDoc = asignaciones.filter((a) => a.docente_id === docente).reduce((s, a) => s + a.horas_semanales, 0);
  const cambioAsig = listo ? sincronizarAsignacion(asigActual, progActual, progDespues) : { accion: 'nada' as const };
  const cargaDespues =
    asignadasDoc +
    (cambioAsig.accion === 'crear'
      ? cambioAsig.horas
      : cambioAsig.accion === 'editar'
        ? cambioAsig.horas - (asigActual?.horas_semanales ?? 0)
        : cambioAsig.accion === 'eliminar'
          ? -(asigActual?.horas_semanales ?? 0)
          : 0);
  const programadasDoc = horarios.filter((h) => h.docente_id === docente).reduce((s, h) => s + horasDe(h), 0);

  // Las clases ya asignadas al docente, para retomarlas con un clic.
  const delDocente = asignaciones
    .filter((a) => a.docente_id === docente)
    .map((a) => ({ a, prog: horasProgramadas(a, horarios) }))
    .sort((x, y) => (ord.get(grs.get(x.a.grupo_id)?.grado_id ?? '')?.orden ?? 0) - (ord.get(grs.get(y.a.grupo_id)?.grado_id ?? '')?.orden ?? 0) || (asg.get(x.a.asignatura_id)?.nombre ?? '').localeCompare(asg.get(y.a.asignatura_id)?.nombre ?? ''));
  // Lo que el grupo tiene asignado a otros docentes (referencia de su plan de estudios).
  const delGrupo = asignaciones.filter((a) => a.grupo_id === grupo);
  const horasGrupo = horarios.filter((h) => h.grupo_id === grupo).reduce((s, h) => s + horasDe(h), 0);

  const pendientes = nuevas.length + quitar.length;
  // Al cambiar la combinación, las franjas marcadas siguen si siguen libres; lo marcado para quitar se descarta.
  useEffect(() => {
    setQuitar([]);
    setNuevas((ns) => ns.filter((m) => estadoCelda(m.dia, m.franja, horarios, sel).tipo === 'libre'));
  }, [docente, grupo, asignatura, aula]);

  const conSabado = horarios.some((h) => h.dia === 6);
  const dias = DIAS.filter((x) => x.valor <= (conSabado ? 6 : 5));
  const franjas = ajustes.franjas;
  /** Cada franja de clase es un bloque: 1, 2, 3… sin contar los descansos. */
  const numeroBloque = (f: Franja) => franjas.filter((x) => !x.descanso).indexOf(f) + 1;

  const alternarCelda = (dia: Dia, f: Franja, e: EstadoCelda) => {
    if (e.tipo === 'propia') {
      setQuitar((q) => (q.includes(e.bloque.id) ? q.filter((x) => x !== e.bloque.id) : [...q, e.bloque.id]));
      return;
    }
    if (e.tipo !== 'libre') return;
    const k = claveCelda(dia, f);
    setNuevas((ns) => (ns.some((m) => claveCelda(m.dia, m.franja) === k) ? ns.filter((m) => claveCelda(m.dia, m.franja) !== k) : [...ns, { dia, franja: f }]));
  };

  const elegir = (a: { grupo_id: ID; asignatura_id: ID }) => {
    setGrupo(a.grupo_id);
    setAsignatura(a.asignatura_id);
  };

  const guardar = async () => {
    if (!listo) return toast.error('Elija docente, grupo y asignatura.');
    if (deOtro) return toast.error(`${asg.get(asignatura)?.nombre} en ${grs.get(grupo)?.nombre} ya la tiene ${nombreDocente(docs.get(deOtro.docente_id))}.`);
    if (!pendientes) return toast.error('Marque en el horario las franjas de la clase.');
    setGuardando(true);
    let hechas = 0;
    try {
      for (const m of [...nuevas].sort((a, b) => a.dia - b.dia || a.franja.inicio.localeCompare(b.franja.inicio))) {
        await mH.crear.mutateAsync({
          grupo_id: grupo,
          asignatura_id: asignatura,
          docente_id: docente,
          dia: m.dia,
          hora_inicio: m.franja.inicio,
          hora_fin: m.franja.fin,
          aula: aula.trim(),
        });
        hechas++;
      }
      for (const id of quitar) await mH.eliminar.mutateAsync(id);
      if (cambioAsig.accion === 'crear')
        await mA.crear.mutateAsync({ docente_id: docente, grupo_id: grupo, asignatura_id: asignatura, horas_semanales: cambioAsig.horas });
      else if (cambioAsig.accion === 'editar') await mA.editar.mutateAsync({ id: cambioAsig.id, cambios: { horas_semanales: cambioAsig.horas } });
      else if (cambioAsig.accion === 'eliminar') await mA.eliminar.mutateAsync(cambioAsig.id);

      const partes = [
        nuevas.length && `${nuevas.length === 1 ? 'se programó 1 clase' : `se programaron ${nuevas.length} clases`}`,
        quitar.length && `${quitar.length === 1 ? 'se quitó 1 clase' : `se quitaron ${quitar.length} clases`}`,
      ].filter(Boolean);
      const txt = partes.join(' y ');
      toast.ok(`${asg.get(asignatura)?.nombre} en ${grs.get(grupo)?.nombre}: ${txt}.`);
      setNuevas([]);
      setQuitar([]);
      // Seguir con otra asignatura sin salir.
      setAsignatura('');
      setTimeout(() => cajaAsignatura.current?.querySelector('select')?.focus(), 50);
    } catch (e) {
      toast.error(hechas ? `Se guardaron ${hechas} clases y luego hubo un error: ${(e as Error).message}` : e);
    } finally {
      setGuardando(false);
    }
  };

  const etiquetaOcupada = (e: Exclude<EstadoCelda, { tipo: 'libre' }>) => {
    const b = e.bloque;
    const nombre = asg.get(b.asignatura_id)?.nombre ?? '—';
    if (e.tipo === 'docente') return { titulo: nombre, detalle: b.grupo_id === grupo ? 'Este grupo' : `Grupo ${grs.get(b.grupo_id)?.nombre ?? '—'}` };
    if (e.tipo === 'grupo') return { titulo: nombre, detalle: b.docente_id ? nombreDocente(docs.get(b.docente_id), true) : 'Sin docente' };
    if (e.tipo === 'aula') return { titulo: `Aula ${b.aula}`, detalle: `Ocupada: ${grs.get(b.grupo_id)?.nombre ?? ''}` };
    return { titulo: nombre, detalle: b.aula || 'Esta clase' };
  };

  const textoGuardar = !pendientes
    ? 'Guardar'
    : quitar.length && !nuevas.length
      ? `Quitar ${quitar.length === 1 ? '1 clase' : `${quitar.length} clases`}`
      : `Guardar ${nuevas.length === 1 ? '1 clase' : `${nuevas.length} clases`}${quitar.length ? ` y quitar ${quitar.length}` : ''}`;

  if (!franjas.length)
    return (
      <div className="card">
        <Vacio titulo="Configure las franjas horarias" texto="Defina las horas de clase en Configuración para programar las clases." />
      </div>
    );

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-6">
        <AsistenteClases
          actual={{ docente, grupo, asignatura, aula }}
          diasSemana={dias.map((x) => x.valor as Dia)}
          guardar={
            nuevas.length > 0 && listo && !deOtro ? (
              <Boton tam="sm" onClick={guardar} cargando={guardando} icono={<Check className="size-4" />}>
                {textoGuardar}
              </Boton>
            ) : null
          }
          onProponer={(r) => {
            if (r.docente) setDocente(r.docente);
            if (r.grupo) setGrupo(r.grupo);
            if (r.asignatura) setAsignatura(r.asignatura);
            setQuitar([]);
            setNuevas(r.marcas);
          }}
        />
        <Tarjeta titulo="Clase a programar">
          <div className="flex flex-col gap-4">
            <Campo etiqueta="Docente" requerido>
              {(id) => (
                <Selector id={id} value={docente} onChange={(e) => setDocente(e.target.value)}>
                  <option value="">Seleccione…</option>
                  {activos.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.apellidos}, {x.nombres}
                    </option>
                  ))}
                </Selector>
              )}
            </Campo>
            <Campo etiqueta="Grupo" requerido>
              {(id) => (
                <Selector id={id} value={grupo} onChange={(e) => setGrupo(e.target.value)}>
                  <option value="">Seleccione…</option>
                  {sedesConGrupos.length > 1 ? (
                    <>
                      {sedesConGrupos.map((s) => (
                        <optgroup key={s.id} label={s.nombre}>
                          {listaGrupos
                            .filter((g) => g.sede_id === s.id)
                            .map((g) => (
                              <option key={g.id} value={g.id}>
                                {nombreGrupo(g, grados)}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                      {sinSede.length > 0 && (
                        <optgroup label="Sin sede">
                          {sinSede.map((g) => (
                            <option key={g.id} value={g.id}>
                              {nombreGrupo(g, grados)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  ) : (
                    listaGrupos.map((g) => (
                      <option key={g.id} value={g.id}>
                        {nombreGrupo(g, grados)}
                      </option>
                    ))
                  )}
                </Selector>
              )}
            </Campo>
            <div ref={cajaAsignatura}>
            <Campo etiqueta="Asignatura" requerido error={deOtro ? `Ya la tiene ${nombreDocente(docs.get(deOtro.docente_id))} en este grupo.` : undefined}>
              {(id) => (
                <Selector id={id} value={asignatura} onChange={(e) => setAsignatura(e.target.value)}>
                  <option value="">Seleccione…</option>
                  {areas.map((ar) => {
                    const deArea = asignaturas.filter((s) => s.area_id === ar.id);
                    if (!deArea.length) return null;
                    return (
                      <optgroup key={ar.id} label={ar.nombre}>
                        {deArea.map((s) => {
                          const otro = grupo ? delGrupo.find((a) => a.asignatura_id === s.id && a.docente_id !== docente) : undefined;
                          return (
                            <option key={s.id} value={s.id}>
                              {s.nombre}
                              {otro ? ` — ${nombreDocente(docs.get(otro.docente_id), true)}` : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                    );
                  })}
                </Selector>
              )}
            </Campo>
            </div>
            <Campo etiqueta="Aula o espacio" ayuda="Opcional. Se aplica a las clases que marque.">
              {(id) => <Entrada id={id} value={aula} onChange={(e) => setAula(e.target.value)} placeholder="Ej. Aula 201, Laboratorio" />}
            </Campo>

            {listo && !deOtro && (
              <div className="rounded-[16px] bg-surface-2 p-3.5 text-sm">
                <p className="flex items-center justify-between gap-2">
                  <span className="text-muted">Horas de la asignatura en el grupo</span>
                  <span className="font-semibold whitespace-nowrap tabular-nums">{progDespues} h</span>
                </p>
                {asigActual && asigActual.horas_semanales > progDespues && (
                  <p className="mt-1 text-xs text-warn">
                    Tiene {asigActual.horas_semanales} h asignadas: faltan {asigActual.horas_semanales - progDespues} por ubicar.
                  </p>
                )}
              </div>
            )}

            {d && (
              <div className={cx('rounded-[16px] p-3.5', cargaDespues > d.carga_maxima ? 'bg-danger-soft' : 'bg-surface-2')}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-semibold">Carga del docente</span>
                  <span className="font-semibold tabular-nums">
                    {cargaDespues} / {d.carga_maxima} h
                  </span>
                </div>
                <Progreso valor={cargaDespues} max={d.carga_maxima} />
                <p className="mt-1.5 text-xs text-muted">{programadasDoc} h ya ubicadas en el horario</p>
                {cargaDespues > d.carga_maxima && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-danger">
                    <AlertTriangle className="size-3.5" /> Supera la carga máxima en {cargaDespues - d.carga_maxima} h.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Boton className="flex-1" onClick={guardar} cargando={guardando} disabled={!listo || !!deOtro || !pendientes} icono={<Check className="size-4" />}>
                {textoGuardar}
              </Boton>
              {pendientes > 0 && (
                <Boton
                  variante="secundario"
                  onClick={() => {
                    setNuevas([]);
                    setQuitar([]);
                  }}
                  disabled={guardando}
                  icono={<RotateCcw className="size-4" />}
                >
                  Deshacer
                </Boton>
              )}
            </div>
          </div>
        </Tarjeta>

        {d && (
          <Tarjeta titulo="Asignaturas del docente" accion={<span className="text-sm text-muted tabular-nums">{delDocente.length}</span>}>
            {delDocente.length === 0 ? (
              <p className="pb-1 text-sm text-muted">Aún no tiene asignaturas. Elija grupo y asignatura y marque las franjas.</p>
            ) : (
              <ul className="-mx-2 flex flex-col">
                {delDocente.map(({ a, prog }) => {
                  const activa = a.grupo_id === grupo && a.asignatura_id === asignatura;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => elegir(a)}
                        aria-pressed={activa}
                        className={cx('flex w-full items-center gap-3 rounded-[14px] px-2 py-2 text-left transition', activa ? 'bg-brand-soft' : 'hover:bg-surface-2')}
                      >
                        <span className="h-7 w-1 shrink-0 rounded-full" style={{ background: color(a.asignatura_id) }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{asg.get(a.asignatura_id)?.nombre ?? 'Asignatura eliminada'}</span>
                          <span className="block truncate text-xs text-muted">{nombreGrupo(grs.get(a.grupo_id), grados)}</span>
                        </span>
                        <span className={cx('text-xs tabular-nums', prog < a.horas_semanales ? 'font-semibold text-warn' : 'text-muted')} title="Horas en el horario / horas asignadas">
                          {prog}/{a.horas_semanales} h
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Tarjeta>
        )}
      </div>

      <Tarjeta
        className="min-w-0"
        titulo={
          d || grupo ? (
            <span>
              {d ? nombreDocente(d) : 'Horario'}
              {grupo && <span className="font-normal text-muted"> · Grupo {grs.get(grupo)?.nombre}</span>}
            </span>
          ) : (
            'Horario'
          )
        }
        accion={grupo ? <span className="text-sm text-muted tabular-nums">El grupo tiene {horasGrupo} h en el horario</span> : undefined}
      >
        <p className={cx('mb-3 flex items-start gap-2 rounded-[14px] px-3 py-2 text-sm', listo && !deOtro ? 'bg-brand-soft/60 text-ink-2' : 'bg-surface-2 text-muted')}>
          <MousePointerClick className="mt-0.5 size-4 shrink-0" />
          {!docente || !grupo
            ? 'Elija el docente y el grupo: verá juntas las clases de los dos y las franjas libres para ambos.'
            : !asignatura
              ? 'Elija la asignatura y toque las franjas libres para programarla.'
              : deOtro
                ? 'Esta asignatura ya tiene otro docente en el grupo. Elija otra asignatura.'
                : `Toque las franjas libres para programar ${asg.get(asignatura)?.nombre}. Toque una clase suya para quitarla.`}
        </p>
        <div className="scrollbar-thin relative overflow-x-auto">
          <table className="w-full min-w-[620px] table-fixed border-separate border-spacing-1.5 text-sm" aria-label="Horario para programar clases">
            <thead>
              <tr>
                <th className="w-14" />
                {dias.map((x) => (
                  <th key={x.valor} scope="col" className="pb-1 text-xs font-semibold tracking-wider text-muted uppercase">
                    <span className="hidden sm:inline">{x.largo}</span>
                    <span className="sm:hidden">{x.corto}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {franjas.map((f) => (
                <tr key={f.inicio}>
                  <th scope="row" className="pr-1 text-right align-top text-xs font-semibold text-muted tabular-nums">
                    {!f.descanso && <span className="block pt-1 text-[10px] font-semibold tracking-wide text-brand uppercase">Bloque {numeroBloque(f)}</span>}
                    <span className={cx('block', f.descanso && 'pt-2')}>{f.inicio}</span>
                    <span className="block font-normal opacity-70">{f.fin}</span>
                  </th>
                  {f.descanso ? (
                    <td colSpan={dias.length}>
                      <div className="flex h-9 items-center justify-center gap-2 rounded-xl bg-surface-2/60 text-xs font-semibold tracking-wide text-muted uppercase">
                        <Coffee className="size-3.5" /> Descanso
                      </div>
                    </td>
                  ) : (
                    dias.map((x) => {
                      const dia = x.valor as Dia;
                      const e = estadoCelda(dia, f, horarios, sel);
                      const lugar = `${x.largo} de ${f.inicio} a ${f.fin}`;
                      if (e.tipo === 'libre') {
                        const marcada = nuevas.some((m) => claveCelda(m.dia, m.franja) === claveCelda(dia, f));
                        const puedeMarcar = !!(docente && grupo) && !deOtro;
                        const c = color(asignatura || undefined);
                        return (
                          <td key={x.valor} className="h-[64px] align-top">
                            <button
                              type="button"
                              disabled={!puedeMarcar || guardando}
                              aria-pressed={marcada}
                              aria-label={`${lugar}: ${marcada ? 'marcada para programar' : 'libre'}`}
                              onClick={() => alternarCelda(dia, f, e)}
                              className={cx(
                                'group flex h-full min-h-[60px] w-full flex-col items-center justify-center rounded-xl border text-xs transition',
                                marcada
                                  ? 'border-solid font-semibold text-ink'
                                  : puedeMarcar
                                    ? 'border-dashed border-line text-muted hover:border-brand hover:bg-brand-soft/40 hover:text-brand'
                                    : 'cursor-default border-dashed border-line/70',
                              )}
                              style={marcada ? { background: `color-mix(in srgb, ${c} 22%, var(--surface))`, borderColor: c } : undefined}
                            >
                              {marcada ? (
                                <>
                                  <Check className="size-4" />
                                  <span className="max-w-full truncate px-1">{asg.get(asignatura)?.nombre ?? 'Nueva clase'}</span>
                                </>
                              ) : (
                                puedeMarcar && <Plus className="size-4 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
                              )}
                            </button>
                          </td>
                        );
                      }
                      const { titulo, detalle } = etiquetaOcupada(e);
                      const c = color(e.bloque.asignatura_id);
                      if (e.tipo === 'propia') {
                        const porQuitar = quitar.includes(e.bloque.id);
                        return (
                          <td key={x.valor} className="h-[64px] align-top">
                            <button
                              type="button"
                              disabled={guardando}
                              aria-pressed={porQuitar}
                              aria-label={`${lugar}: ${titulo}${porQuitar ? ', marcada para quitar' : ''}`}
                              title={porQuitar ? 'Se quitará al guardar. Toque para conservarla.' : 'Toque para quitar esta clase'}
                              onClick={() => alternarCelda(dia, f, e)}
                              className={cx(
                                'group relative flex h-full min-h-[60px] w-full flex-col justify-center rounded-xl px-2.5 py-1.5 text-left transition hover:brightness-95',
                                porQuitar && 'opacity-60',
                              )}
                              style={{ background: `color-mix(in srgb, ${c} 18%, var(--surface))`, borderLeft: `3px solid ${c}` }}
                            >
                              <span className={cx('truncate text-[13px] leading-tight font-semibold', porQuitar && 'line-through')}>{titulo}</span>
                              <span className="truncate text-xs text-muted">{porQuitar ? 'Se quitará' : detalle}</span>
                              <X className="absolute top-1.5 right-1.5 size-3.5 text-muted opacity-0 transition group-hover:opacity-100" />
                            </button>
                          </td>
                        );
                      }
                      return (
                        <td key={x.valor} className="h-[64px] align-top">
                          <div
                            className="flex h-full min-h-[60px] flex-col justify-center rounded-xl bg-surface-2/70 px-2.5 py-1.5 opacity-80"
                            style={{ borderLeft: `3px solid color-mix(in srgb, ${c} 45%, var(--line))` }}
                            title={e.tipo === 'docente' ? 'El docente ya tiene clase a esta hora' : e.tipo === 'grupo' ? 'El grupo ya tiene clase a esta hora' : 'El aula está ocupada a esta hora'}
                          >
                            <span className="sr-only">{lugar}: ocupada, </span>
                            <span className="truncate text-[13px] leading-tight font-medium text-ink-2">{titulo}</span>
                            <span className="truncate text-xs text-muted">{detalle}</span>
                          </div>
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted">
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-dashed border-line-strong" /> Libre para los dos
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-brand bg-brand-soft" /> Marcada para programar
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-surface-2" /> Ocupada (docente, grupo o aula)
          </li>
        </ul>
      </Tarjeta>
    </div>
  );
}

