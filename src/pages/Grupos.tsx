import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, Network, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { Boton, Campo, Cargando, Encabezado, Entrada, Insignia, Modal, Progreso, Selector, Vacio } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMutar, useTabla } from '@/hooks/useDatos';
import { useConfirmar } from '@/hooks/useConfirmar';
import { useToast } from '@/hooks/useToast';
import { useFormulario } from '@/hooks/useFormulario';
import { etiqueta, JORNADAS, NIVELES } from '@/lib/catalogos';
import type { Grado, Grupo, Nuevo } from '@/lib/types';
import { nombreDocente, porId } from '@/lib/utils';

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

  const docs = porId(docentes);
  const ordenados = [...(grados ?? [])].sort((a, b) => a.orden - b.orden);
  const totalEst = grupos.reduce((s, g) => s + g.estudiantes, 0);
  const totalCap = grupos.reduce((s, g) => s + g.capacidad, 0);

  const borrarGrado = async (g: Grado) => {
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
        descripcion={`${grupos.length} grupos · ${totalEst.toLocaleString('es-CO')} estudiantes · ocupación ${totalCap ? Math.round((totalEst / totalCap) * 100) : 0}%`}
        acciones={
          puede && (
            <>
              <Boton variante="secundario" icono={<Plus className="size-4" />} onClick={() => setFormGrado({ abierto: true })}>
                Nuevo grado
              </Boton>
              <Boton icono={<Plus className="size-4" />} onClick={() => setFormGrupo({ abierto: true })} disabled={!grados?.length}>
                Nuevo grupo
              </Boton>
            </>
          )
        }
      />

      {isLoading ? (
        <Cargando />
      ) : !ordenados.length ? (
        <div className="card">
          <Vacio
            icono={<Network className="size-6" />}
            titulo="Aún no hay grados"
            texto="Cree los grados que ofrece la institución (por ejemplo, Transición a Undécimo) y luego sus grupos."
            accion={puede && <Boton onClick={() => setFormGrado({ abierto: true })}>Crear grado</Boton>}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {NIVELES.map((nivel) => {
            const delNivel = ordenados.filter((g) => g.nivel === nivel.valor);
            if (!delNivel.length) return null;
            return (
              <section key={nivel.valor}>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  {nivel.etiqueta}
                  <Insignia tono={nivel.tono}>{delNivel.length}</Insignia>
                </h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {delNivel.map((gr) => {
                    const hijos = grupos.filter((g) => g.grado_id === gr.id).sort((a, b) => a.nombre.localeCompare(b.nombre));
                    return (
                      <article key={gr.id} className="card flex flex-col">
                        <header className="flex items-center justify-between gap-2 border-b border-line px-5 py-3.5">
                          <div>
                            <h3 className="font-display text-base font-semibold">{gr.nombre}</h3>
                            <p className="text-xs text-muted">
                              {hijos.length} {hijos.length === 1 ? 'grupo' : 'grupos'} · {hijos.reduce((s, g) => s + g.estudiantes, 0)} estudiantes
                            </p>
                          </div>
                          {puede && (
                            <div className="flex gap-0.5">
                              <Boton variante="fantasma" tam="icono" onClick={() => setFormGrupo({ abierto: true, grado_id: gr.id })} aria-label={`Agregar grupo a ${gr.nombre}`}>
                                <Plus className="size-4" />
                              </Boton>
                              <Boton variante="fantasma" tam="icono" onClick={() => setFormGrado({ abierto: true, grado: gr })} aria-label={`Editar ${gr.nombre}`}>
                                <Pencil className="size-4" />
                              </Boton>
                              <Boton variante="fantasma" tam="icono" onClick={() => borrarGrado(gr)} aria-label={`Eliminar ${gr.nombre}`}>
                                <Trash2 className="size-4" />
                              </Boton>
                            </div>
                          )}
                        </header>
                        {hijos.length === 0 ? (
                          <p className="px-5 py-6 text-center text-sm text-muted">Sin grupos todavía.</p>
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
                                        <Progreso valor={g.estudiantes} max={g.capacidad} />
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

      <FormGrado {...formGrado} siguienteOrden={ordenados.length} onCerrar={() => setFormGrado({ abierto: false })} />
      <FormGrupo
        {...formGrupo}
        grados={ordenados}
        docentes={docentes.filter((d) => d.estado === 'activo')}
        sedes={sedes}
        onCerrar={() => setFormGrupo({ abierto: false })}
      />
    </>
  );
}

function FormGrado({ abierto, grado, onCerrar, siguienteOrden }: { abierto: boolean; grado?: Grado; onCerrar: () => void; siguienteOrden: number }) {
  const { crear, editar } = useMutar('grados');
  const toast = useToast();
  const f = useFormulario<Nuevo<Grado>>({ nombre: '', nivel: 'primaria', orden: 0 });
  useEffect(() => {
    if (abierto) f.reiniciar(grado ?? { nombre: '', nivel: 'secundaria', orden: siguienteOrden });
  }, [abierto, grado]);

  const guardar = async () => {
    if (!f.validar({ nombre: (v) => !v.nombre.trim() && 'Ingrese el nombre del grado.' })) return;
    const datos = { ...f.valores, nombre: f.valores.nombre.trim(), orden: Number(f.valores.orden) || 0 };
    try {
      if (grado) await editar.mutateAsync({ id: grado.id, cambios: datos });
      else await crear.mutateAsync(datos);
      toast.ok(grado ? 'Grado actualizado.' : 'Grado creado.');
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={grado ? 'Editar grado' : 'Nuevo grado'}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={crear.isPending || editar.isPending}>
            Guardar
          </Boton>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => (e.preventDefault(), guardar())}>
        <Campo etiqueta="Nombre" requerido error={f.errores.nombre}>
          {(id) => <Entrada id={id} {...f.campo('nombre')} placeholder="Ej. Sexto" />}
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
        <Campo etiqueta="Orden" ayuda="Define la posición del grado en las listas (0 = primero).">
          {(id) => <Entrada id={id} type="number" min={0} value={f.valores.orden} onChange={(e) => f.set('orden', Number(e.target.value))} />}
        </Campo>
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
  onCerrar,
}: {
  abierto: boolean;
  grupo?: Grupo;
  grado_id?: string;
  grados: Grado[];
  docentes: { id: string; nombres: string; apellidos: string }[];
  sedes: { id: string; nombre: string }[];
  onCerrar: () => void;
}) {
  const { crear, editar } = useMutar('grupos');
  const { data: grupos = [] } = useTabla('grupos');
  const toast = useToast();
  const vacio: Nuevo<Grupo> = { grado_id: '', nombre: '', jornada: 'manana', sede_id: null, director_id: null, capacidad: 38, estudiantes: 0 };
  const f = useFormulario<Nuevo<Grupo>>(vacio);
  useEffect(() => {
    if (abierto) f.reiniciar(grupo ?? { ...vacio, grado_id: grado_id ?? grados[0]?.id ?? '', sede_id: sedes[0]?.id ?? null });
  }, [abierto, grupo, grado_id]);

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
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={grupo ? `Editar grupo ${grupo.nombre}` : 'Nuevo grupo'}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={crear.isPending || editar.isPending}>
            Guardar
          </Boton>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => (e.preventDefault(), guardar())}>
        <Campo etiqueta="Grado" requerido error={f.errores.grado_id}>
          {(id) => (
            <Selector id={id} value={v.grado_id} onChange={(e) => set('grado_id', e.target.value)}>
              <option value="">Seleccione…</option>
              {grados.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </Selector>
          )}
        </Campo>
        <Campo etiqueta="Nombre del grupo" requerido error={f.errores.nombre}>
          {(id) => <Entrada id={id} {...f.campo('nombre')} placeholder="Ej. 6°1, 601, 6A" />}
        </Campo>
        <Campo etiqueta="Jornada">
          {(id) => (
            <Selector id={id} value={v.jornada} onChange={(e) => set('jornada', e.target.value as Grupo['jornada'])}>
              {JORNADAS.map((j) => (
                <option key={j.valor} value={j.valor}>
                  {j.etiqueta}
                </option>
              ))}
            </Selector>
          )}
        </Campo>
        <Campo etiqueta="Sede">
          {(id) => (
            <Selector id={id} value={v.sede_id ?? ''} onChange={(e) => set('sede_id', e.target.value || null)}>
              <option value="">Sin sede</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
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
    </Modal>
  );
}

