import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Check, Clock3, Layers, Network, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { Boton, Campo, Cargando, Encabezado, Entrada, Insignia, Modal, Progreso, Segmentos, Selector, Vacio } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAjustes, useMutar, useTabla } from '@/hooks/useDatos';
import { useConfirmar } from '@/hooks/useConfirmar';
import { useToast } from '@/hooks/useToast';
import { useFormulario } from '@/hooks/useFormulario';
import { etiqueta, FORMATOS_GRUPO, GRADOS_COLOMBIA, JORNADAS, NIVELES } from '@/lib/catalogos';
import type { Grado, Grupo, Nuevo, Sede } from '@/lib/types';
import { cx, gradoEnSede, nombreDocente, nombresGruposNuevos, norm, porId, sedesDelGrado, sugerirNombreGrupo } from '@/lib/utils';

export default function Grupos() {
  const { editar } = useAuth();
  const puede = editar('grupos');
  const { data: grados, isLoading } = useTabla('grados');
  const { data: grupos = [] } = useTabla('grupos');
  const { data: docentes = [] } = useTabla('docentes');
  const { data: sedes = [] } = useTabla('sedes');
  const { data: asignaciones = [] } = useTabla('asignaciones');
  const mGrado = useMutar('grados');
  const mGrupo = useMutar('grupos');
  const confirmar = useConfirmar();
  const toast = useToast();
  const [formGrado, setFormGrado] = useState<{ abierto: boolean; grado?: Grado }>({ abierto: false });
  const [formGrupo, setFormGrupo] = useState<{ abierto: boolean; grupo?: Grupo; grado_id?: string }>({ abierto: false });
  // Sede elegida en las tarjetas: filtra los grupos y es la sede propuesta al crear. '' = todas.
  const [sedeSel, setSedeSel] = useState('');
  useEffect(() => {
    if (sedeSel && sedeSel !== SIN_SEDE && !sedes.some((s) => s.id === sedeSel)) setSedeSel('');
  }, [sedes, sedeSel]);

  const docs = porId(docentes);
  const ordenados = [...(grados ?? [])].sort((a, b) => a.orden - b.orden);
  const visibles = !sedeSel ? grupos : grupos.filter((g) => (sedeSel === SIN_SEDE ? !g.sede_id : g.sede_id === sedeSel));
  const totalEst = visibles.reduce((s, g) => s + g.estudiantes, 0);
  const totalCap = visibles.reduce((s, g) => s + g.capacidad, 0);
  const sedeElegida = sedes.find((s) => s.id === sedeSel);
  const sedeIds = sedes.map((s) => s.id);
  // Con una sede elegida se ven sus grados (y los que ya tienen grupos allí).
  const gradosVisibles = sedeElegida
    ? ordenados.filter((g) => gradoEnSede(g, sedeElegida.id, sedeIds) || grupos.some((x) => x.grado_id === g.id && x.sede_id === sedeElegida.id))
    : ordenados;
  const nombresSedes = (ids: string[]) => ids.map((id) => sedes.find((s) => s.id === id)?.nombre).filter(Boolean).join(', ');
  const verSedes = sedes.length > 1 || (sedes.length === 1 && grupos.some((g) => !g.sede_id));

  const borrarGrado = async (g: Grado) => {
    // Con una sede elegida, el grado se quita solo de esa sede si se ofrece en otras.
    if (sedeElegida && sedes.length > 1) {
      const actuales = sedesDelGrado(g, sedeIds);
      const quedan = (actuales.length ? actuales : sedeIds).filter((id) => id !== sedeElegida.id);
      if (quedan.length) {
        const aqui = grupos.filter((x) => x.grado_id === g.id && x.sede_id === sedeElegida.id).length;
        if (aqui) return toast.error(`Primero elimine o mueva los ${aqui} grupos de ${g.nombre} en ${sedeElegida.nombre}.`);
        const ok = await confirmar({
          titulo: `Quitar ${g.nombre} de ${sedeElegida.nombre}`,
          texto: `El grado se seguirá ofreciendo en ${nombresSedes(quedan)}.`,
          confirmar: 'Quitar',
          peligro: true,
        });
        if (!ok) return;
        try {
          await mGrado.editar.mutateAsync({ id: g.id, cambios: { sedes: quedan } });
          toast.ok(`${g.nombre} ya no se ofrece en ${sedeElegida.nombre}.`);
        } catch (e) {
          toast.error(e);
        }
        return;
      }
    }
    const hijos = grupos.filter((x) => x.grado_id === g.id).length;
    if (hijos) return toast.error(`Primero elimine o mueva los ${hijos} grupos de ${g.nombre}.`);
    if (!(await confirmar({ titulo: 'Eliminar grado', texto: `¿Eliminar el grado ${g.nombre}?`, confirmar: 'Eliminar', peligro: true }))) return;
    try {
      await mGrado.eliminar.mutateAsync(g.id);
      toast.ok('Grado eliminado.');
    } catch (e) {
      toast.error(e);
    }
  };

  const borrarGrupo = async (g: Grupo) => {
    const n = asignaciones.filter((a) => a.grupo_id === g.id).length;
    const ok = await confirmar({
      titulo: `Eliminar el grupo ${g.nombre}`,
      texto: n ? `El grupo tiene ${n} asignaciones académicas que quedarán huérfanas. ¿Continuar?` : '¿Eliminar este grupo?',
      confirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await mGrupo.eliminar.mutateAsync(g.id);
      toast.ok('Grupo eliminado.');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <Encabezado
        titulo="Grados y grupos"
        descripcion={`${sedeElegida ? `${sedeElegida.nombre} · ` : ''}${visibles.length} grupos · ${totalEst.toLocaleString('es-CO')} estudiantes · ocupación ${totalCap ? Math.round((totalEst / totalCap) * 100) : 0}%`}
        acciones={
          puede && (
            <>
              <Boton variante="secundario" icono={<Plus className="size-4" />} onClick={() => setFormGrado({ abierto: true })}>
                Agregar grados
              </Boton>
              <Boton icono={<Plus className="size-4" />} onClick={() => setFormGrupo({ abierto: true })} disabled={!grados?.length}>
                Nuevo grupo
              </Boton>
            </>
          )
        }
      />

      {verSedes && !!ordenados.length && (
        <TarjetasSede
          className="mb-8"
          sedes={sedes}
          grupos={grupos}
          valor={sedeSel}
          onCambio={setSedeSel}
          conTodas
          conSinSede={grupos.some((g) => !g.sede_id)}
          etiqueta="Filtrar los grupos por sede"
        />
      )}

      {isLoading ? (
        <Cargando />
      ) : sedeElegida && ordenados.length && !gradosVisibles.length ? (
        <div className="card">
          <Vacio
            icono={<Network className="size-6" />}
            titulo={`${sedeElegida.nombre} aún no tiene grados`}
            texto="Agregue los grados que se ofrecen en esta sede. Solo se crearán para ella."
            accion={puede && <Boton onClick={() => setFormGrado({ abierto: true })}>Agregar grados</Boton>}
          />
        </div>
      ) : !ordenados.length ? (
        <div className="card">
          <Vacio
            icono={<Network className="size-6" />}
            titulo="Aún no hay grados"
            texto="Marque los grados que ofrece la institución, de Prejardín a Undécimo, y luego cree sus grupos."
            accion={puede && <Boton onClick={() => setFormGrado({ abierto: true })}>Agregar grados</Boton>}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {NIVELES.map((nivel) => {
            const delNivel = gradosVisibles.filter((g) => g.nivel === nivel.valor);
            if (!delNivel.length) return null;
            return (
              <section key={nivel.valor}>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  {nivel.etiqueta}
                  <Insignia tono={nivel.tono}>{delNivel.length}</Insignia>
                </h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {delNivel.map((gr) => {
                    const hijos = visibles.filter((g) => g.grado_id === gr.id).sort((a, b) => a.nombre.localeCompare(b.nombre));
                    return (
                      <article key={gr.id} className="card flex flex-col">
                        <header className="flex items-center justify-between gap-2 border-b border-line px-5 py-3.5">
                          <div>
                            <h3 className="font-display text-base font-semibold">{gr.nombre}</h3>
                            <p className="text-xs text-muted">
                              {hijos.length} {hijos.length === 1 ? 'grupo' : 'grupos'} · {hijos.reduce((s, g) => s + g.estudiantes, 0)} estudiantes
                            </p>
                            {!sedeElegida && sedes.length > 1 && sedesDelGrado(gr, sedeIds).length > 0 && (
                              <p className="mt-0.5 text-xs font-medium text-brand">Solo en {nombresSedes(sedesDelGrado(gr, sedeIds))}</p>
                            )}
                          </div>
                          {puede && (
                            <div className="flex gap-0.5">
                              <Boton variante="fantasma" tam="icono" onClick={() => setFormGrupo({ abierto: true, grado_id: gr.id })} aria-label={`Agregar grupo a ${gr.nombre}`}>
                                <Plus className="size-4" />
                              </Boton>
                              <Boton variante="fantasma" tam="icono" onClick={() => setFormGrado({ abierto: true, grado: gr })} aria-label={`Editar ${gr.nombre}`}>
                                <Pencil className="size-4" />
                              </Boton>
                              <Boton
                                variante="fantasma"
                                tam="icono"
                                onClick={() => borrarGrado(gr)}
                                aria-label={sedeElegida && sedes.length > 1 ? `Quitar ${gr.nombre} de ${sedeElegida.nombre}` : `Eliminar ${gr.nombre}`}
                              >
                                <Trash2 className="size-4" />
                              </Boton>
                            </div>
                          )}
                        </header>
                        {hijos.length === 0 ? (
                          <p className="px-5 py-6 text-center text-sm text-muted">{sedeElegida ? `Sin grupos en ${sedeElegida.nombre}.` : 'Sin grupos todavía.'}</p>
                        ) : (
                          <ul className="divide-y divide-line">
                            {hijos.map((g) => {
                              const dir = g.director_id ? docs.get(g.director_id) : undefined;
                              return (
                                <li key={g.id} className="group flex items-center gap-3 px-5 py-3">
                                  <span className="grid h-10 min-w-12 place-items-center rounded-xl bg-brand-soft px-2 font-display font-semibold text-brand-soft-ink">
                                    {g.nombre}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                                      <UserRound className="size-3.5 shrink-0 text-muted" />
                                      {dir ? nombreDocente(dir, true) : <span className="text-muted">Sin director</span>}
                                    </p>
                                    <div className="mt-1.5 flex items-center gap-2">
                                      <div className="flex-1">
                                        <Progreso valor={g.estudiantes} max={g.capacidad} etiqueta="Estudiantes frente a la capacidad" />
                                      </div>
                                      <span className="text-xs text-muted tabular-nums">
                                        {g.estudiantes}/{g.capacidad}
                                      </span>
                                    </div>
                                  </div>
                                  <Insignia>{etiqueta(JORNADAS, g.jornada)}</Insignia>
                                  <div className="flex gap-0.5 sm:opacity-0 sm:transition sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                                    <Link to={`/horarios?grupo=${g.id}`} title="Ver horario">
                                      <Boton variante="fantasma" tam="icono" aria-label={`Horario de ${g.nombre}`}>
                                        <Clock3 className="size-4" />
                                      </Boton>
                                    </Link>
                                    {puede && (
                                      <>
                                        <Boton variante="fantasma" tam="icono" onClick={() => setFormGrupo({ abierto: true, grupo: g })} aria-label={`Editar ${g.nombre}`}>
                                          <Pencil className="size-4" />
                                        </Boton>
                                        <Boton variante="fantasma" tam="icono" onClick={() => borrarGrupo(g)} aria-label={`Eliminar ${g.nombre}`}>
                                          <Trash2 className="size-4" />
                                        </Boton>
                                      </>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <FormGrado {...formGrado} sede={sedeElegida} sedes={sedes} siguienteOrden={ordenados.length} onCerrar={() => setFormGrado({ abierto: false })} />
      <FormGrupo
        {...formGrupo}
        grados={ordenados}
        docentes={docentes.filter((d) => d.estado === 'activo')}
        sedes={sedes}
        sede_id={sedeSel && sedeSel !== SIN_SEDE ? sedeSel : undefined}
        onCerrar={() => setFormGrupo({ abierto: false })}
      />
    </>
  );
}

function FormGrado({
  abierto,
  grado,
  sede,
  sedes,
  onCerrar,
  siguienteOrden,
}: {
  abierto: boolean;
  grado?: Grado;
  /** Sede elegida en la página: los grados nuevos se crean solo para ella. */
  sede?: Sede;
  sedes: Sede[];
  onCerrar: () => void;
  siguienteOrden: number;
}) {
  // Al crear se eligen grados del catálogo (varios a la vez); al editar se ajustan sus datos.
  return grado ? (
    <EditarGrado abierto={abierto} grado={grado} sedes={sedes} onCerrar={onCerrar} />
  ) : (
    <AgregarGrados abierto={abierto} sede={sede} sedes={sedes} onCerrar={onCerrar} siguienteOrden={siguienteOrden} />
  );
}

/** Agregar grados: se marcan los del catálogo colombiano que ofrece la institución, o se escribe otro. */
function AgregarGrados({
  abierto,
  sede,
  sedes,
  onCerrar,
  siguienteOrden,
}: {
  abierto: boolean;
  sede?: Sede;
  sedes: Sede[];
  onCerrar: () => void;
  siguienteOrden: number;
}) {
  const { data: grados = [] } = useTabla('grados');
  const { crear, editar } = useMutar('grados');
  const sedeIds = sedes.map((s) => s.id);
  const toast = useToast();
  const [marcados, setMarcados] = useState<string[]>([]);
  const [otro, setOtro] = useState('');
  const [nivelOtro, setNivelOtro] = useState<Grado['nivel']>('primaria');
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    if (abierto) {
      setMarcados([]);
      setOtro('');
    }
  }, [abierto]);

  const buscar = (nombre: string) => grados.find((g) => norm(g.nombre) === norm(nombre));
  // Con sede: un grado «existe» si ya se ofrece en esa sede. Los de otras sedes se pueden sumar a esta.
  const existe = (nombre: string) => {
    const g = buscar(nombre);
    return !!g && (!sede || gradoEnSede(g, sede.id, sedeIds));
  };
  const disponibles = GRADOS_COLOMBIA.filter((g) => !existe(g.nombre));

  /** Crea el grado para la sede (o para todas) o, si ya existe en otra sede, le suma esta. */
  const agregar = async (nombre: string, nivel: Grado['nivel'], orden: number) => {
    const g = buscar(nombre);
    if (g && sede) {
      const actuales = sedesDelGrado(g, sedeIds);
      await editar.mutateAsync({ id: g.id, cambios: { sedes: soloSiFaltan([...new Set([...actuales, sede.id])], sedeIds) } });
    } else if (!g) {
      await crear.mutateAsync({ nombre, nivel, orden, ...(sede ? { sedes: [sede.id] } : {}) });
    }
  };

  const guardar = async () => {
    const otroLimpio = otro.trim();
    if (!marcados.length && !otroLimpio) return toast.error('Marque al menos un grado o escriba uno.');
    if (otroLimpio && existe(otroLimpio)) return toast.error(`Ya existe el grado ${otroLimpio}.`);
    setGuardando(true);
    try {
      for (const g of GRADOS_COLOMBIA.filter((x) => marcados.includes(x.nombre))) await agregar(g.nombre, g.nivel, g.orden);
      if (otroLimpio) await agregar(otroLimpio, nivelOtro, Math.max(siguienteOrden, 14));
      const n = marcados.length + (otroLimpio ? 1 : 0);
      const dondeTxt = sede ? ` en ${sede.nombre}` : '';
      toast.ok(n === 1 ? `Grado agregado${dondeTxt}.` : `${n} grados agregados${dondeTxt}.`);
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
      titulo={sede ? `Agregar grados a ${sede.nombre}` : 'Agregar grados'}
      descripcion={
        sede
          ? `Marque los grados que se ofrecen en ${sede.nombre}. Solo se crearán para esta sede.`
          : sedes.length > 1
            ? 'Marque los grados que ofrece la institución. Se crearán para todas las sedes; para una sola, elija antes la sede en la página.'
            : 'Marque los grados que ofrece la institución.'
      }
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={guardando}>
            {marcados.length > 1 ? `Crear ${marcados.length + (otro.trim() ? 1 : 0)} grados` : 'Crear'}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {disponibles.length === 0 ? (
          <p className="rounded-[20px] bg-surface-2 p-4 text-sm text-ink-2">
            {sede ? `${sede.nombre} ya tiene` : 'La institución ya tiene'} todos los grados de preescolar, básica y media.
          </p>
        ) : (
          NIVELES.map((nivel) => {
            const delNivel = disponibles.filter((g) => g.nivel === nivel.valor);
            if (!delNivel.length) return null;
            const todos = delNivel.every((g) => marcados.includes(g.nombre));
            return (
              <fieldset key={nivel.valor}>
                <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium">
                  {nivel.etiqueta}
                  <button
                    type="button"
                    className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
                    onClick={() =>
                      setMarcados(todos ? marcados.filter((m) => !delNivel.some((g) => g.nombre === m)) : [...new Set([...marcados, ...delNivel.map((g) => g.nombre)])])
                    }
                  >
                    {todos ? 'Quitar todos' : 'Marcar todos'}
                  </button>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {delNivel.map((g) => {
                    const sel = marcados.includes(g.nombre);
                    return (
                      <button
                        key={g.nombre}
                        type="button"
                        aria-pressed={sel}
                        onClick={() => setMarcados(sel ? marcados.filter((m) => m !== g.nombre) : [...marcados, g.nombre])}
                        className={cx(
                          'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition',
                          sel ? 'border-ink bg-ink text-bg' : 'border-line bg-surface hover:border-line-strong',
                        )}
                      >
                        {sel && <Check className="size-3.5" />}
                        {g.nombre}
                        {sede && buscar(g.nombre) && <span className={cx('text-xs', sel ? 'opacity-80' : 'text-muted')}>· otra sede</span>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })
        )}
        <div className="border-t border-line pt-4">
          <p className="mb-2 text-sm font-medium">¿Otro grado?</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
            <Entrada value={otro} onChange={(e) => setOtro(e.target.value)} placeholder="Nombre del grado (opcional)" aria-label="Nombre de otro grado" />
            <Selector value={nivelOtro} onChange={(e) => setNivelOtro(e.target.value as Grado['nivel'])} aria-label="Nivel del otro grado">
              {NIVELES.map((n) => (
                <option key={n.valor} value={n.valor}>
                  {n.etiqueta}
                </option>
              ))}
            </Selector>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function EditarGrado({ abierto, grado, sedes, onCerrar }: { abierto: boolean; grado: Grado; sedes: Sede[]; onCerrar: () => void }) {
  const { editar } = useMutar('grados');
  const { data: grupos = [] } = useTabla('grupos');
  const toast = useToast();
  const sedeIds = sedes.map((s) => s.id);
  const f = useFormulario<Nuevo<Grado>>({ nombre: grado.nombre, nivel: grado.nivel, orden: grado.orden });
  const [enSedes, setEnSedes] = useState<string[]>([]);
  useEffect(() => {
    if (abierto) {
      f.reiniciar({ nombre: grado.nombre, nivel: grado.nivel, orden: grado.orden });
      setEnSedes(sedesDelGrado(grado, sedeIds));
    }
  }, [abierto, grado]);
  const originales = sedesDelGrado(grado, sedeIds);
  const cambioSedes = enSedes.length !== originales.length || enSedes.some((s) => !originales.includes(s));

  const guardar = async () => {
    if (!f.validar({ nombre: (v) => !v.nombre.trim() && 'Ingrese el nombre del grado.' })) return;
    // No se puede quitar una sede donde el grado ya tiene grupos.
    if (enSedes.length) {
      const conGrupos = sedes.filter((s) => !enSedes.includes(s.id) && grupos.some((g) => g.grado_id === grado.id && g.sede_id === s.id));
      if (conGrupos.length) return toast.error(`${grado.nombre} tiene grupos en ${conGrupos.map((s) => s.nombre).join(', ')}. Muévalos o elimínelos antes de quitar esa sede.`);
    }
    try {
      await editar.mutateAsync({
        id: grado.id,
        cambios: {
          nombre: f.valores.nombre.trim(),
          nivel: f.valores.nivel,
          orden: Number(f.valores.orden) || 0,
          ...(cambioSedes ? { sedes: soloSiFaltan(enSedes, sedeIds) } : {}),
        },
      });
      toast.ok('Grado actualizado.');
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Editar grado"
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={editar.isPending}>
            Guardar
          </Boton>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => (e.preventDefault(), guardar())}>
        <Campo etiqueta="Nombre" requerido error={f.errores.nombre}>
          {(id) => <Entrada id={id} {...f.campo('nombre')} />}
        </Campo>
        <Campo etiqueta="Nivel">
          {(id) => (
            <Selector id={id} value={f.valores.nivel} onChange={(e) => f.set('nivel', e.target.value as Grado['nivel'])}>
              {NIVELES.map((n) => (
                <option key={n.valor} value={n.valor}>
                  {n.etiqueta}
                </option>
              ))}
            </Selector>
          )}
        </Campo>
        <Campo etiqueta="Orden" ayuda="Posición del grado en las listas (0 = primero).">
          {(id) => <Entrada id={id} type="number" min={0} value={f.valores.orden} onChange={(e) => f.set('orden', Number(e.target.value))} />}
        </Campo>
        {sedes.length > 1 && (
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-ink-2">Sedes donde se ofrece</legend>
            <div className="flex flex-wrap gap-2">
              {[{ id: '', nombre: 'Todas las sedes' }, ...sedes].map((s) => {
                const sel = s.id ? enSedes.includes(s.id) : enSedes.length === 0;
                return (
                  <button
                    key={s.id || 'todas'}
                    type="button"
                    aria-pressed={sel}
                    onClick={() => setEnSedes(!s.id ? [] : sel ? enSedes.filter((x) => x !== s.id) : [...enSedes, s.id])}
                    className={cx(
                      'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition',
                      sel ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface hover:border-line-strong',
                    )}
                  >
                    {sel && <Check className="size-3.5" />}
                    {s.nombre}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function FormGrupo({
  abierto,
  grupo,
  grado_id,
  grados,
  docentes,
  sedes,
  sede_id,
  onCerrar,
}: {
  abierto: boolean;
  grupo?: Grupo;
  grado_id?: string;
  grados: Grado[];
  docentes: { id: string; nombres: string; apellidos: string }[];
  sedes: Sede[];
  /** Sede propuesta (la elegida en las tarjetas de la página). */
  sede_id?: string;
  onCerrar: () => void;
}) {
  const { crear, editar } = useMutar('grupos');
  const { data: grupos = [] } = useTabla('grupos');
  const ajustes = useAjustes();
  const toast = useToast();
  const vacio: Nuevo<Grupo> = { grado_id: '', nombre: '', jornada: ajustes.jornadas[0] ?? 'manana', sede_id: null, director_id: null, capacidad: 38, estudiantes: 0 };
  const f = useFormulario<Nuevo<Grupo>>(vacio);
  // El nombre se propone según el formato de la institución hasta que la persona lo cambie.
  const [nombreManual, setNombreManual] = useState(false);
  // «Varios grupos»: crea de una vez la cantidad indicada en cada grado elegido.
  const [modo, setModo] = useState<'uno' | 'varios'>('uno');
  const [gradosSel, setGradosSel] = useState<string[]>([]);
  const [cantidad, setCantidad] = useState(2);
  const [creando, setCreando] = useState(false);
  const sugerir = (gradoId: string) => {
    const gr = grados.find((g) => g.id === gradoId);
    if (!gr) return '';
    return sugerirNombreGrupo(gr.nombre, grupos.filter((g) => g.grado_id === gradoId).map((g) => g.nombre), ajustes.formato_grupo) ?? '';
  };
  useEffect(() => {
    if (!abierto) return;
    const sedeInicial = sede_id ?? sedes.find((s) => s.principal)?.id ?? sedes[0]?.id ?? null;
    const ids = sedes.map((s) => s.id);
    const gradoInicial = grado_id ?? (sedeInicial ? grados.find((g) => gradoEnSede(g, sedeInicial, ids)) : grados[0])?.id ?? '';
    f.reiniciar(grupo ?? { ...vacio, grado_id: gradoInicial, nombre: sugerir(gradoInicial), sede_id: sedeInicial });
    setNombreManual(!!grupo);
    setModo('uno');
    setGradosSel(gradoInicial ? [gradoInicial] : []);
    setCantidad(2);
  }, [abierto, grupo, grado_id, sede_id]);
  const jornadas = JORNADAS.filter((j) => ajustes.jornadas.includes(j.valor) || j.valor === f.valores.jornada);

  const guardar = async () => {
    const ok = f.validar({
      grado_id: (v) => !v.grado_id && 'Seleccione el grado.',
      nombre: (v) =>
        !v.nombre.trim()
          ? 'Ingrese el nombre del grupo.'
          : grupos.some((g) => g.nombre.trim().toLowerCase() === v.nombre.trim().toLowerCase() && g.jornada === v.jornada && g.id !== grupo?.id) &&
            'Ya existe un grupo con ese nombre en esta jornada.',
      estudiantes: (v) => Number(v.estudiantes) < 0 && 'No puede ser negativo.',
    });
    if (!ok) return;
    const datos = {
      ...f.valores,
      nombre: f.valores.nombre.trim(),
      capacidad: Number(f.valores.capacidad) || 0,
      estudiantes: Number(f.valores.estudiantes) || 0,
      director_id: f.valores.director_id || null,
      sede_id: f.valores.sede_id || null,
    };
    try {
      if (grupo) await editar.mutateAsync({ id: grupo.id, cambios: datos });
      else await crear.mutateAsync(datos);
      toast.ok(grupo ? 'Grupo actualizado.' : 'Grupo creado.');
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  const { valores: v, set } = f;

  /* ── Varios grupos ── */
  const ordenGrados = [...grados].sort((a, b) => a.orden - b.orden);
  const plan = ordenGrados
    .filter((g) => gradosSel.includes(g.id))
    .map((g) => {
      const existentes = grupos.filter((x) => x.grado_id === g.id).map((x) => x.nombre);
      // También se evitan nombres que otro grado ya usa en la misma jornada.
      const enJornada = grupos.filter((x) => x.jornada === v.jornada).map((x) => x.nombre);
      return { grado: g, nombres: nombresGruposNuevos(g.nombre, [...existentes, ...enJornada], cantidad, ajustes.formato_grupo) };
    });
  const totalPlan = plan.reduce((s, p) => s + p.nombres.length, 0);
  const alternar = (id: string) => setGradosSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const crearVarios = async () => {
    if (!gradosSel.length) return toast.error('Elija al menos un grado.');
    if (!totalPlan) return toast.error('No hay grupos nuevos para crear con esa cantidad.');
    setCreando(true);
    let hechos = 0;
    try {
      for (const p of plan)
        for (const nombre of p.nombres) {
          await crear.mutateAsync({
            grado_id: p.grado.id,
            nombre,
            jornada: v.jornada,
            sede_id: v.sede_id || null,
            director_id: null,
            capacidad: Number(v.capacidad) || 0,
            estudiantes: 0,
          });
          hechos++;
        }
      toast.ok(hechos === 1 ? 'Se creó 1 grupo.' : `Se crearon ${hechos} grupos.`);
      onCerrar();
    } catch (e) {
      toast.error(hechos ? `Se crearon ${hechos} grupos y luego hubo un error: ${(e as Error).message}` : e);
    } finally {
      setCreando(false);
    }
  };

  const varios = !grupo && modo === 'varios';
  const sedeIdsForm = sedes.map((s) => s.id);
  // Grados que se ofrecen en la sede elegida en las tarjetas (o todos si no hay sede).
  const gradosSede = v.sede_id ? ordenGrados.filter((g) => gradoEnSede(g, v.sede_id!, sedeIdsForm) || g.id === grupo?.grado_id) : ordenGrados;
  const cambiarSede = (id: string) => {
    set('sede_id', id || null);
    if (!id) return;
    const libres = ordenGrados.filter((g) => gradoEnSede(g, id, sedeIdsForm));
    setGradosSel((s) => s.filter((x) => libres.some((g) => g.id === x)));
    if (!grupo && v.grado_id && !libres.some((g) => g.id === v.grado_id)) {
      const primero = libres[0]?.id ?? '';
      set('grado_id', primero);
      if (!nombreManual) set('nombre', sugerir(primero));
    }
  };
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={grupo ? `Editar grupo ${grupo.nombre}` : varios ? 'Nuevos grupos' : 'Nuevo grupo'}
      ancho={varios ? 'lg' : 'md'}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          {varios ? (
            <Boton onClick={crearVarios} cargando={creando} disabled={!totalPlan}>
              {totalPlan === 1 ? 'Crear 1 grupo' : `Crear ${totalPlan} grupos`}
            </Boton>
          ) : (
            <Boton onClick={guardar} cargando={crear.isPending || editar.isPending}>
              Guardar
            </Boton>
          )}
        </>
      }
    >
      {!grupo && (
        <Segmentos<'uno' | 'varios'>
          className="mb-5"
          valor={modo}
          onCambio={setModo}
          opciones={[
            { valor: 'uno', etiqueta: 'Un grupo' },
            { valor: 'varios', etiqueta: 'Varios grupos' },
          ]}
        />
      )}
      {sedes.length > 0 && (
        <TarjetasSede
          className="mb-5"
          sedes={sedes}
          grupos={grupos}
          valor={v.sede_id ?? ''}
          onCambio={cambiarSede}
          compacto
          etiqueta={varios ? 'Sede donde se crearán los grupos' : 'Sede del grupo'}
          titulo
        />
      )}
      {varios ? (
        <div className="flex flex-col gap-5">
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-ink-2">Grados</legend>
            <div className="flex flex-wrap gap-2">
              {gradosSede.length === 0 && <p className="text-sm text-muted">Esta sede aún no tiene grados. Agréguelos desde «Agregar grados».</p>}
              {gradosSede.map((g) => {
                const sel = gradosSel.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={sel}
                    onClick={() => alternar(g.id)}
                    className={cx(
                      'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition',
                      sel ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface hover:border-line-strong',
                    )}
                  >
                    {sel && <Check className="size-3.5" />}
                    {g.nombre}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-3 text-sm">
              <button type="button" className="font-semibold text-brand hover:underline" onClick={() => setGradosSel(gradosSede.map((g) => g.id))}>
                Elegir todos
              </button>
              <button type="button" className="text-muted hover:text-ink hover:underline" onClick={() => setGradosSel([])}>
                Ninguno
              </button>
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Grupos nuevos por grado" ayuda="Se suman a los que ya existen.">
              {(id) => (
                <Entrada
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={26}
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(1, Math.min(26, Number(e.target.value) || 1)))}
                />
              )}
            </Campo>
            <Campo etiqueta="Jornada">
              {(id) => (
                <Selector id={id} value={v.jornada} onChange={(e) => set('jornada', e.target.value as Grupo['jornada'])}>
                  {jornadas.map((j) => (
                    <option key={j.valor} value={j.valor}>
                      {j.etiqueta}
                    </option>
                  ))}
                </Selector>
              )}
            </Campo>
            <Campo etiqueta="Capacidad del aula">
              {(id) => <Entrada id={id} type="number" min={0} value={v.capacidad} onChange={(e) => set('capacidad', Number(e.target.value))} />}
            </Campo>
          </div>
          <div className="rounded-[20px] bg-surface-2 p-4">
            <p className="mb-2 text-[13px] font-medium text-ink-2">
              {totalPlan
                ? `Se crearán ${totalPlan} ${totalPlan === 1 ? 'grupo' : 'grupos'}${sedes.find((x) => x.id === v.sede_id) ? ` en ${sedes.find((x) => x.id === v.sede_id)!.nombre}` : ''}:`
                : gradosSel.length
                  ? 'No quedan nombres libres en los grados elegidos.'
                  : 'Elija los grados para ver los grupos que se crearán.'}
            </p>
            <ul className="flex flex-col gap-1.5">
              {plan.map((p) => (
                <li key={p.grado.id} className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="w-28 shrink-0 font-semibold">{p.grado.nombre}</span>
                  {p.nombres.length ? (
                    p.nombres.map((n) => (
                      <span key={n} className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold shadow-chip">
                        {n}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted">No quedan nombres libres.</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">El director de grupo y los estudiantes se completan después en cada grupo.</p>
          </div>
        </div>
      ) : (
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => (e.preventDefault(), guardar())}>
          <Campo etiqueta="Grado" requerido error={f.errores.grado_id}>
            {(id) => (
              <Selector
                id={id}
                value={v.grado_id}
                onChange={(e) => {
                  set('grado_id', e.target.value);
                  if (!nombreManual && !grupo) set('nombre', sugerir(e.target.value));
                }}
              >
                <option value="">Seleccione…</option>
                {gradosSede.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </Selector>
            )}
          </Campo>
          <Campo
            etiqueta="Nombre del grupo"
            requerido
            error={f.errores.nombre}
            ayuda={!grupo && !nombreManual && v.nombre ? 'Propuesto según el formato de la institución.' : undefined}
          >
            {(id) => (
              <Entrada
                id={id}
                value={f.valores.nombre}
                onChange={(e) => {
                  setNombreManual(true);
                  f.set('nombre', e.target.value);
                }}
                placeholder={FORMATOS_GRUPO.find((x) => x.valor === ajustes.formato_grupo)?.ejemplo}
              />
            )}
          </Campo>
          <Campo etiqueta="Jornada">
            {(id) => (
              <Selector id={id} value={v.jornada} onChange={(e) => set('jornada', e.target.value as Grupo['jornada'])}>
                {jornadas.map((j) => (
                  <option key={j.valor} value={j.valor}>
                    {j.etiqueta}
                  </option>
                ))}
              </Selector>
            )}
          </Campo>
          <Campo etiqueta="Director de grupo" className="sm:col-span-2">
            {(id) => (
              <Selector id={id} value={v.director_id ?? ''} onChange={(e) => set('director_id', e.target.value || null)}>
                <option value="">Sin asignar</option>
                {docentes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {nombreDocente(d)}
                  </option>
                ))}
              </Selector>
            )}
          </Campo>
          <Campo etiqueta="Estudiantes matriculados" error={f.errores.estudiantes}>
            {(id) => <Entrada id={id} type="number" min={0} value={v.estudiantes} onChange={(e) => set('estudiantes', Number(e.target.value))} />}
          </Campo>
          <Campo etiqueta="Capacidad del aula">
            {(id) => <Entrada id={id} type="number" min={0} value={v.capacidad} onChange={(e) => set('capacidad', Number(e.target.value))} />}
          </Campo>
          <button type="submit" hidden />
        </form>
      )}
    </Modal>
  );
}


const SIN_SEDE = '__sin_sede__';

/** Tarjetas para elegir sede, con sus grupos y estudiantes. */
function TarjetasSede({
  sedes,
  grupos,
  valor,
  onCambio,
  conTodas,
  conSinSede,
  compacto,
  etiqueta,
  titulo,
  className,
}: {
  sedes: Sede[];
  grupos: Grupo[];
  valor: string;
  onCambio: (id: string) => void;
  conTodas?: boolean;
  conSinSede?: boolean;
  compacto?: boolean;
  etiqueta: string;
  /** Muestra la etiqueta como título visible. */
  titulo?: boolean;
  className?: string;
}) {
  const ordenadas = [...sedes].sort((a, b) => Number(b.principal) - Number(a.principal) || a.nombre.localeCompare(b.nombre, 'es'));
  const resumen = (lista: Grupo[]) => {
    const est = lista.reduce((s, g) => s + g.estudiantes, 0);
    return `${lista.length} ${lista.length === 1 ? 'grupo' : 'grupos'} · ${est.toLocaleString('es-CO')} est.`;
  };
  const opciones: { id: string; nombre: string; detalle: string; resumen: string; principal?: boolean; icono: 'todas' | 'sede' }[] = [
    ...(conTodas ? [{ id: '', nombre: 'Todas las sedes', detalle: `${sedes.length} sedes`, resumen: resumen(grupos), icono: 'todas' as const }] : []),
    ...ordenadas.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      detalle: s.direccion || 'Sin dirección registrada',
      resumen: resumen(grupos.filter((g) => g.sede_id === s.id)),
      principal: s.principal,
      icono: 'sede' as const,
    })),
    ...(conSinSede ? [{ id: SIN_SEDE, nombre: 'Sin sede', detalle: 'Grupos sin sede asignada', resumen: resumen(grupos.filter((g) => !g.sede_id)), icono: 'sede' as const }] : []),
  ];
  return (
    <div className={className}>
      {titulo && <p className="mb-2 text-[13px] font-medium text-ink-2">{etiqueta}</p>}
      <div
        role="radiogroup"
        aria-label={etiqueta}
        className={cx('grid gap-3', compacto ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3')}
      >
        {opciones.map((o) => {
          const sel = valor === o.id;
          const Icono = o.icono === 'todas' ? Layers : Building2;
          return (
            <button
              key={o.id || 'todas'}
              type="button"
              role="radio"
              aria-checked={sel}
              onClick={() => onCambio(o.id)}
              className={cx(
                'relative flex items-start gap-3 rounded-[20px] border bg-surface pr-9 text-left transition',
                compacto ? 'p-3' : 'p-4 shadow-chip',
                sel ? 'border-brand ring-2 ring-brand/20' : 'border-line hover:border-line-strong hover:shadow-pop',
              )}
            >
              <span
                className={cx(
                  'grid shrink-0 place-items-center rounded-xl',
                  compacto ? 'size-9' : 'size-11',
                  sel ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-ink-2',
                )}
              >
                <Icono className={compacto ? 'size-4' : 'size-5'} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span className="leading-snug font-semibold break-words">{o.nombre}</span>
                  {o.principal && <Insignia tono="brand">Principal</Insignia>}
                </span>
                <span className="block truncate text-xs text-muted">{o.detalle}</span>
                <span className="mt-1 block text-xs font-medium text-ink-2 tabular-nums">{o.resumen}</span>
              </span>
              {sel && (
                <span className="absolute top-3 right-3 grid size-5 place-items-center rounded-full bg-brand text-brand-ink">
                  <Check className="size-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Una lista con todas las sedes equivale a «todas»: se guarda vacía. */
function soloSiFaltan(ids: string[], todas: string[]): string[] {
  return todas.length > 0 && todas.every((t) => ids.includes(t)) ? [] : ids;
}
