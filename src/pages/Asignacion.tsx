import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BookOpenCheck, Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { Avatar, Boton, Campo, Cargando, Encabezado, Entrada, Insignia, Modal, Progreso, Segmentos, Selector, Tarjeta, Vacio } from '@/components/ui';
import { Buscador } from '@/components/ui/Buscador';
import { useAuth } from '@/hooks/useAuth';
import { useMutar, useTabla } from '@/hooks/useDatos';
import { useConfirmar } from '@/hooks/useConfirmar';
import { useToast } from '@/hooks/useToast';
import type { Asignacion as TAsignacion, ID } from '@/lib/types';
import { coincide, cx, descargarCSV, duracionHoras, nombreDocente, nombreGrupo, porId } from '@/lib/utils';

type Vista = 'docentes' | 'grupos';

export default function Asignacion() {
  const { editar } = useAuth();
  const puede = editar('asignacion');
  const { data: asignaciones, isLoading } = useTabla('asignaciones');
  const { data: docentes = [] } = useTabla('docentes');
  const { data: grupos = [] } = useTabla('grupos');
  const { data: grados = [] } = useTabla('grados');
  const { data: asignaturas = [] } = useTabla('asignaturas');
  const { data: areas = [] } = useTabla('areas');
  const { data: horarios = [] } = useTabla('horarios');
  const { eliminar } = useMutar('asignaciones');
  const confirmar = useConfirmar();
  const toast = useToast();
  const [vista, setVista] = useState<Vista>('docentes');
  const [q, setQ] = useState('');
  const [grupoSel, setGrupoSel] = useState('');
  const [form, setForm] = useState<{ abierto: boolean; asig?: TAsignacion; docente_id?: ID; grupo_id?: ID }>({ abierto: false });

  const lista = asignaciones ?? [];
  const asg = porId(asignaturas);
  const ars = porId(areas);
  const grs = porId(grupos);
  const docs = porId(docentes);
  const ordenGrupos = useMemo(() => {
    const ord = porId(grados);
    return [...grupos].sort((a, b) => (ord.get(a.grado_id)?.orden ?? 0) - (ord.get(b.grado_id)?.orden ?? 0) || a.nombre.localeCompare(b.nombre));
  }, [grupos, grados]);
  useEffect(() => {
    if (!grupoSel && ordenGrupos.length) setGrupoSel(ordenGrupos.find((g) => lista.some((a) => a.grupo_id === g.id))?.id ?? ordenGrupos[0].id);
  }, [ordenGrupos, grupoSel, lista]);

  /** Horas efectivamente programadas en el horario para cada asignación. */
  const programadas = (a: TAsignacion) =>
    horarios
      .filter((h) => h.grupo_id === a.grupo_id && h.asignatura_id === a.asignatura_id && h.docente_id === a.docente_id)
      .reduce((s, h) => s + Math.round(duracionHoras(h.hora_inicio, h.hora_fin)), 0);

  const color = (asignaturaId: ID) => ars.get(asg.get(asignaturaId)?.area_id ?? '')?.color ?? 'var(--line-strong)';

  const porDocente = docentes
    .filter((d) => d.estado !== 'retirado')
    .map((d) => {
      const suyas = lista.filter((a) => a.docente_id === d.id);
      return { d, suyas, horas: suyas.reduce((s, a) => s + a.horas_semanales, 0) };
    })
    .filter(({ d, suyas }) => coincide(q, d.nombres, d.apellidos, ...suyas.map((a) => asg.get(a.asignatura_id)?.nombre)))
    .sort((a, b) => b.horas - a.horas || a.d.apellidos.localeCompare(b.d.apellidos));

  const totalHoras = lista.reduce((s, a) => s + a.horas_semanales, 0);
  const sobrecargados = porDocente.filter((x) => x.horas > x.d.carga_maxima).length;

  const borrar = async (a: TAsignacion) => {
    const ok = await confirmar({
      titulo: 'Quitar asignación',
      texto: `Se quitará ${asg.get(a.asignatura_id)?.nombre} en ${grs.get(a.grupo_id)?.nombre} a ${nombreDocente(docs.get(a.docente_id))}.`,
      confirmar: 'Quitar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await eliminar.mutateAsync(a.id);
      toast.ok('Asignación eliminada.');
    } catch (e) {
      toast.error(e);
    }
  };

  const exportar = () =>
    descargarCSV(
      'asignacion-academica',
      ['Docente', 'Documento', 'Grupo', 'Asignatura', 'Área', 'Horas semanales', 'Horas en horario'],
      lista.map((a) => {
        const d = docs.get(a.docente_id);
        const s = asg.get(a.asignatura_id);
        return [nombreDocente(d), d?.documento, nombreGrupo(grs.get(a.grupo_id), grados), s?.nombre, ars.get(s?.area_id ?? '')?.nombre, a.horas_semanales, programadas(a)];
      }),
    );

  const filaAsig = (a: TAsignacion, mostrar: 'grupo' | 'docente') => {
    const prog = programadas(a);
    return (
      <li key={a.id} className="group flex items-center gap-3 py-2">
        <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: color(a.asignatura_id) }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{asg.get(a.asignatura_id)?.nombre ?? 'Asignatura eliminada'}</p>
          <p className="truncate text-xs text-muted">
            {mostrar === 'grupo' ? nombreGrupo(grs.get(a.grupo_id), grados) : nombreDocente(docs.get(a.docente_id))}
          </p>
        </div>
        <span
          className={cx('text-xs tabular-nums', prog !== a.horas_semanales ? 'text-warn' : 'text-muted')}
          title="Horas programadas en el horario / horas asignadas"
        >
          {prog}/{a.horas_semanales} h
        </span>
        {puede && (
          <div className="flex sm:opacity-0 sm:transition sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <Boton variante="fantasma" tam="icono" className="size-7" onClick={() => setForm({ abierto: true, asig: a })} aria-label="Editar asignación">
              <Pencil className="size-3.5" />
            </Boton>
            <Boton variante="fantasma" tam="icono" className="size-7" onClick={() => borrar(a)} aria-label="Quitar asignación">
              <Trash2 className="size-3.5" />
            </Boton>
          </div>
        )}
      </li>
    );
  };

  const grupoActual = grs.get(grupoSel);
  const delGrupo = lista.filter((a) => a.grupo_id === grupoSel).sort((a, b) => (asg.get(a.asignatura_id)?.nombre ?? '').localeCompare(asg.get(b.asignatura_id)?.nombre ?? ''));

  return (
    <>
      <Encabezado
        titulo="Asignación académica"
        descripcion={`${lista.length} asignaciones · ${totalHoras} horas semanales${sobrecargados ? ` · ${sobrecargados} docentes sobre su carga máxima` : ''}`}
        acciones={
          <>
            <Boton variante="secundario" icono={<Download className="size-4" />} onClick={exportar} disabled={!lista.length}>
              Exportar
            </Boton>
            {puede && (
              <Boton icono={<Plus className="size-4" />} onClick={() => setForm({ abierto: true })}>
                Asignar
              </Boton>
            )}
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Segmentos<Vista>
          valor={vista}
          onCambio={setVista}
          opciones={[
            { valor: 'docentes', etiqueta: 'Por docente' },
            { valor: 'grupos', etiqueta: 'Por grupo' },
          ]}
        />
        {vista === 'docentes' ? (
          <Buscador valor={q} onCambio={setQ} placeholder="Buscar docente o asignatura" className="sm:ml-auto sm:w-72" />
        ) : (
          <Selector value={grupoSel} onChange={(e) => setGrupoSel(e.target.value)} className="sm:ml-auto sm:w-64" aria-label="Grupo">
            {ordenGrupos.map((g) => (
              <option key={g.id} value={g.id}>
                {nombreGrupo(g, grados)}
              </option>
            ))}
          </Selector>
        )}
      </div>

      {isLoading ? (
        <Cargando />
      ) : vista === 'docentes' ? (
        porDocente.length === 0 ? (
          <div className="card">
            <Vacio icono={<BookOpenCheck className="size-6" />} titulo="Sin resultados" texto="No hay docentes que coincidan con la búsqueda." />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {porDocente.map(({ d, suyas, horas }) => {
              const exceso = horas > d.carga_maxima;
              return (
                <article key={d.id} className={cx('card flex flex-col p-5', exceso && 'border-danger/40')}>
                  <div className="mb-3 flex items-center gap-3">
                    <Avatar nombre={nombreDocente(d)} />
                    <Link to={`/docentes/${d.id}`} className="min-w-0 flex-1 hover:text-brand">
                      <p className="truncate font-semibold">{nombreDocente(d)}</p>
                      <p className="truncate text-xs text-muted">{ars.get(d.area_id ?? '')?.nombre ?? 'Sin área'}</p>
                    </Link>
                    {exceso && (
                      <span title="Supera la carga máxima">
                        <AlertTriangle className="size-4 text-danger" />
                      </span>
                    )}
                  </div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted">Carga semanal</span>
                    <span className={cx('font-semibold tabular-nums', exceso && 'text-danger')}>
                      {horas} / {d.carga_maxima} h
                    </span>
                  </div>
                  <Progreso valor={horas} max={d.carga_maxima} />
                  {suyas.length ? (
                    <ul className="mt-3 divide-y divide-line">{suyas.map((a) => filaAsig(a, 'grupo'))}</ul>
                  ) : (
                    <p className="mt-4 text-sm text-muted">Sin asignaturas asignadas.</p>
                  )}
                  {puede && (
                    <button
                      onClick={() => setForm({ abierto: true, docente_id: d.id })}
                      className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2 text-xs font-semibold text-muted transition hover:border-brand hover:text-brand"
                    >
                      <Plus className="size-3.5" /> Agregar asignatura
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )
      ) : (
        <Tarjeta
          titulo={grupoActual ? `Plan de estudios · ${nombreGrupo(grupoActual, grados)}` : 'Grupo'}
          accion={
            <span className="text-sm font-semibold tabular-nums">{delGrupo.reduce((s, a) => s + a.horas_semanales, 0)} h / semana</span>
          }
        >
          {delGrupo.length === 0 ? (
            <Vacio
              titulo="Este grupo no tiene asignaturas"
              texto="Asigne docentes y asignaturas para construir su plan de estudios."
              accion={puede && <Boton onClick={() => setForm({ abierto: true, grupo_id: grupoSel })}>Asignar al grupo</Boton>}
            />
          ) : (
            <>
              <ul className="divide-y divide-line">{delGrupo.map((a) => filaAsig(a, 'docente'))}</ul>
              {puede && (
                <Boton variante="secundario" tam="sm" className="mt-4" icono={<Plus className="size-3.5" />} onClick={() => setForm({ abierto: true, grupo_id: grupoSel })}>
                  Agregar asignatura
                </Boton>
              )}
            </>
          )}
        </Tarjeta>
      )}

      <FormAsignacion {...form} onCerrar={() => setForm({ abierto: false })} />
    </>
  );
}

function FormAsignacion({
  abierto,
  asig,
  docente_id,
  grupo_id,
  onCerrar,
}: {
  abierto: boolean;
  asig?: TAsignacion;
  docente_id?: ID;
  grupo_id?: ID;
  onCerrar: () => void;
}) {
  const { data: asignaciones = [] } = useTabla('asignaciones');
  const { data: docentes = [] } = useTabla('docentes');
  const { data: grupos = [] } = useTabla('grupos');
  const { data: grados = [] } = useTabla('grados');
  const { data: asignaturas = [] } = useTabla('asignaturas');
  const { data: areas = [] } = useTabla('areas');
  const { crear, editar } = useMutar('asignaciones');
  const toast = useToast();
  const [doc, setDoc] = useState('');
  const [asignatura, setAsignatura] = useState('');
  const [gruposSel, setGruposSel] = useState<ID[]>([]);
  const [horas, setHoras] = useState(2);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setDoc(asig?.docente_id ?? docente_id ?? '');
    setAsignatura(asig?.asignatura_id ?? '');
    setGruposSel(asig ? [asig.grupo_id] : grupo_id ? [grupo_id] : []);
    setHoras(asig?.horas_semanales ?? 2);
  }, [abierto, asig, docente_id, grupo_id]);

  const docente = docentes.find((d) => d.id === doc);
  const actuales = asignaciones.filter((a) => a.docente_id === doc && a.id !== asig?.id).reduce((s, a) => s + a.horas_semanales, 0);
  const nuevas = horas * gruposSel.length;
  const total = actuales + nuevas;
  const ocupados = new Map(
    asignaciones.filter((a) => a.asignatura_id === asignatura && a.id !== asig?.id).map((a) => [a.grupo_id, a.docente_id]),
  );
  const conflicto = gruposSel.filter((g) => ocupados.has(g));
  const ord = porId(grados);
  const listaGrupos = [...grupos].sort((a, b) => (ord.get(a.grado_id)?.orden ?? 0) - (ord.get(b.grado_id)?.orden ?? 0) || a.nombre.localeCompare(b.nombre));

  const guardar = async () => {
    if (!doc || !asignatura || !gruposSel.length) return toast.error('Seleccione docente, asignatura y al menos un grupo.');
    if (horas <= 0) return toast.error('Las horas semanales deben ser mayores que cero.');
    if (conflicto.length)
      return toast.error(
        `La asignatura ya está asignada en ${conflicto.map((g) => grupos.find((x) => x.id === g)?.nombre).join(', ')}. Edite esa asignación en lugar de duplicarla.`,
      );
    setGuardando(true);
    try {
      if (asig) {
        await editar.mutateAsync({ id: asig.id, cambios: { docente_id: doc, asignatura_id: asignatura, grupo_id: gruposSel[0], horas_semanales: horas } });
      } else {
        for (const g of gruposSel) await crear.mutateAsync({ docente_id: doc, asignatura_id: asignatura, grupo_id: g, horas_semanales: horas });
      }
      toast.ok(asig ? 'Asignación actualizada.' : gruposSel.length > 1 ? `${gruposSel.length} asignaciones creadas.` : 'Asignación creada.');
      onCerrar();
    } catch (e) {
      toast.error(e);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={asig ? 'Editar asignación' : 'Nueva asignación académica'}
      descripcion={asig ? undefined : 'Puede asignar la misma asignatura a varios grupos a la vez.'}
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={guardando}>
            Guardar
          </Boton>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-4">
          <Campo etiqueta="Docente" requerido>
            {(id) => (
              <Selector id={id} value={doc} onChange={(e) => setDoc(e.target.value)}>
                <option value="">Seleccione…</option>
                {docentes
                  .filter((d) => d.estado === 'activo' || d.id === doc)
                  .sort((a, b) => a.apellidos.localeCompare(b.apellidos))
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.apellidos}, {d.nombres}
                    </option>
                  ))}
              </Selector>
            )}
          </Campo>
          <Campo etiqueta="Asignatura" requerido>
            {(id) => (
              <Selector id={id} value={asignatura} onChange={(e) => setAsignatura(e.target.value)}>
                <option value="">Seleccione…</option>
                {areas.map((ar) => (
                  <optgroup key={ar.id} label={ar.nombre}>
                    {asignaturas
                      .filter((s) => s.area_id === ar.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </Selector>
            )}
          </Campo>
          <Campo etiqueta="Horas semanales por grupo" requerido>
            {(id) => <Entrada id={id} type="number" min={1} max={20} value={horas} onChange={(e) => setHoras(Number(e.target.value))} />}
          </Campo>
          {docente && (
            <div className={cx('rounded-xl p-4', total > docente.carga_maxima ? 'bg-danger-soft' : 'bg-surface-2')}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-semibold">Carga resultante</span>
                <span className="font-semibold tabular-nums">
                  {total} / {docente.carga_maxima} h
                </span>
              </div>
              <Progreso valor={total} max={docente.carga_maxima} />
              {total > docente.carga_maxima && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-danger">
                  <AlertTriangle className="size-3.5" /> Supera la carga máxima en {total - docente.carga_maxima} h.
                </p>
              )}
            </div>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink-2">
            {asig ? 'Grupo' : 'Grupos'} <span className="text-danger">*</span>
          </p>
          <div className="scrollbar-thin grid max-h-80 grid-cols-3 gap-1.5 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-4">
            {listaGrupos.map((g) => {
              const sel = gruposSel.includes(g.id);
              const ocupadoPor = ocupados.get(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGruposSel(asig ? [g.id] : sel ? gruposSel.filter((x) => x !== g.id) : [...gruposSel, g.id])}
                  aria-pressed={sel}
                  title={ocupadoPor ? `Ya asignada a ${nombreDocente(docentes.find((d) => d.id === ocupadoPor), true)}` : undefined}
                  className={cx(
                    'relative rounded-lg border px-2 py-2 text-sm font-semibold transition',
                    sel ? 'border-brand bg-brand text-brand-ink' : 'border-line hover:border-brand/50',
                    ocupadoPor && !sel && 'opacity-50',
                    ocupadoPor && sel && 'border-danger bg-danger text-white',
                  )}
                >
                  {g.nombre}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">
            {gruposSel.length} seleccionados{asignatura && ocupados.size > 0 && ' · los grupos atenuados ya tienen esta asignatura'}
          </p>
          {conflicto.length > 0 && (
            <Insignia tono="danger">Conflicto en {conflicto.map((g) => grupos.find((x) => x.id === g)?.nombre).join(', ')}</Insignia>
          )}
        </div>
      </div>
    </Modal>
  );
}
