import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ListTodo, Plus, Trash2, CalendarClock } from 'lucide-react';
import { AreaTexto, Avatar, Boton, Campo, Encabezado, Entrada, Insignia, Modal, Segmentos, Selector } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMutar, useTabla } from '@/hooks/useDatos';
import { useConfirmar } from '@/hooks/useConfirmar';
import { useToast } from '@/hooks/useToast';
import { ESTADOS_TAREA, etiqueta, PRIORIDADES, tono } from '@/lib/catalogos';
import type { EstadoTarea, Nuevo, Prioridad, Tarea } from '@/lib/types';
import { cx, fechaCorta, hoyISO } from '@/lib/utils';

const ORDEN: EstadoTarea[] = ['pendiente', 'en_progreso', 'hecha'];
const PESO: Record<Prioridad, number> = { alta: 0, normal: 1, baja: 2 };

export default function Tareas() {
  const { perfil } = useAuth();
  const { data: tareas = [] } = useTabla('tareas');
  const { data: perfiles = [] } = useTabla('perfiles');
  const { editar } = useMutar('tareas');
  const toast = useToast();
  const [ambito, setAmbito] = useState<'mias' | 'todas'>('todas');
  const [form, setForm] = useState<{ abierto: boolean; tarea?: Tarea; estado?: EstadoTarea }>({ abierto: false });
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<EstadoTarea | null>(null);
  const hoy = hoyISO();

  const visibles = tareas.filter((t) => ambito === 'todas' || t.responsable_id === perfil?.id || t.creado_por === perfil?.id);
  const nombre = (id: string | null) => perfiles.find((p) => p.id === id)?.nombre;

  const mover = async (t: Tarea, estado: EstadoTarea) => {
    if (t.estado === estado) return;
    try {
      await editar.mutateAsync({ id: t.id, cambios: { estado } });
      if (estado === 'hecha') toast.ok('¡Tarea completada!');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <Encabezado
        titulo="Tareas"
        descripcion="Pendientes del equipo directivo y docente. Arrastre las tarjetas entre columnas para cambiar su estado."
        acciones={
          <Boton icono={<Plus className="size-4" />} onClick={() => setForm({ abierto: true })}>
            Nueva tarea
          </Boton>
        }
      />
      <Segmentos<'mias' | 'todas'>
        className="mb-5"
        valor={ambito}
        onCambio={setAmbito}
        opciones={[
          { valor: 'todas', etiqueta: 'Todas' },
          { valor: 'mias', etiqueta: 'Mis tareas' },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {ORDEN.map((estado, idx) => {
          const col = visibles
            .filter((t) => t.estado === estado)
            .sort((a, b) => PESO[a.prioridad] - PESO[b.prioridad] || (a.fecha_limite ?? '9').localeCompare(b.fecha_limite ?? '9'));
          return (
            <section
              key={estado}
              onDragOver={(e) => {
                e.preventDefault();
                setSobre(estado);
              }}
              onDragLeave={() => setSobre(null)}
              onDrop={(e) => {
                e.preventDefault();
                const t = tareas.find((x) => x.id === arrastrando);
                if (t) mover(t, estado);
                setArrastrando(null);
                setSobre(null);
              }}
              className={cx('flex min-h-64 flex-col rounded-[28px] bg-surface-3/50 p-3 transition', sobre === estado && 'bg-surface-3 ring-2 ring-accent/30')}
            >
              <header className="mb-3 flex items-center justify-between px-1.5">
                <h2 className="flex items-center gap-2 font-display font-semibold">
                  <Insignia tono={tono(ESTADOS_TAREA, estado)} punto>
                    {etiqueta(ESTADOS_TAREA, estado)}
                  </Insignia>
                  <span className="text-sm text-muted tabular-nums">{col.length}</span>
                </h2>
                <Boton variante="fantasma" tam="icono" className="size-7" onClick={() => setForm({ abierto: true, estado })} aria-label={`Agregar tarea en ${etiqueta(ESTADOS_TAREA, estado)}`}>
                  <Plus className="size-4" />
                </Boton>
              </header>
              <ul className="flex flex-col gap-2">
                {col.map((t) => {
                  const vencida = t.estado !== 'hecha' && t.fecha_limite && t.fecha_limite < hoy;
                  const resp = nombre(t.responsable_id);
                  return (
                    <li
                      key={t.id}
                      draggable
                      onDragStart={() => setArrastrando(t.id)}
                      onDragEnd={() => setArrastrando(null)}
                      className={cx('group card cursor-grab p-3.5 active:cursor-grabbing', arrastrando === t.id && 'opacity-50')}
                    >
                      <button onClick={() => setForm({ abierto: true, tarea: t })} className="block w-full text-left">
                        <p className={cx('font-semibold', t.estado === 'hecha' && 'text-muted line-through')}>{t.titulo}</p>
                        {t.descripcion && <p className="mt-1 line-clamp-2 text-sm text-muted">{t.descripcion}</p>}
                      </button>
                      <div className="mt-3 flex items-center gap-2">
                        <Insignia tono={tono(PRIORIDADES, t.prioridad)}>{etiqueta(PRIORIDADES, t.prioridad)}</Insignia>
                        {t.fecha_limite && (
                          <span className={cx('flex items-center gap-1 text-xs', vencida ? 'font-semibold text-danger' : 'text-muted')}>
                            <CalendarClock className="size-3.5" />
                            {fechaCorta(t.fecha_limite)}
                          </span>
                        )}
                        <span className="ml-auto flex items-center gap-0.5">
                          {resp && <Avatar nombre={resp} tam={24} />}
                          <span className="flex lg:opacity-0 lg:transition lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
                            {idx > 0 && (
                              <button onClick={() => mover(t, ORDEN[idx - 1])} className="grid size-6 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink" aria-label="Mover a la columna anterior">
                                <ChevronLeft className="size-4" />
                              </button>
                            )}
                            {idx < 2 && (
                              <button onClick={() => mover(t, ORDEN[idx + 1])} className="grid size-6 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink" aria-label="Mover a la columna siguiente">
                                <ChevronRight className="size-4" />
                              </button>
                            )}
                          </span>
                        </span>
                      </div>
                    </li>
                  );
                })}
                {col.length === 0 && (
                  <li className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong/60 py-8 text-sm text-muted">
                    <ListTodo className="size-5" /> Sin tareas
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>

      <FormTarea {...form} onCerrar={() => setForm({ abierto: false })} />
    </>
  );
}

function FormTarea({ abierto, tarea, estado, onCerrar }: { abierto: boolean; tarea?: Tarea; estado?: EstadoTarea; onCerrar: () => void }) {
  const { perfil } = useAuth();
  const { data: perfiles = [] } = useTabla('perfiles');
  const { crear, editar, eliminar } = useMutar('tareas');
  const confirmar = useConfirmar();
  const toast = useToast();
  const vacio = (): Nuevo<Tarea> => ({ titulo: '', descripcion: '', estado: estado ?? 'pendiente', prioridad: 'normal', fecha_limite: null, responsable_id: perfil?.id ?? null, creado_por: perfil?.id ?? null });
  const [v, setV] = useState(vacio);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));
  useEffect(() => {
    if (abierto) setV(tarea ? { ...tarea } : vacio());
  }, [abierto, tarea, estado]);

  const guardar = async () => {
    if (!v.titulo.trim()) return toast.error('Escriba el título de la tarea.');
    try {
      const datos = { ...v, titulo: v.titulo.trim(), fecha_limite: v.fecha_limite || null, responsable_id: v.responsable_id || null };
      if (tarea) await editar.mutateAsync({ id: tarea.id, cambios: datos });
      else await crear.mutateAsync(datos);
      toast.ok(tarea ? 'Tarea actualizada.' : 'Tarea creada.');
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };
  const borrar = async () => {
    if (!tarea || !(await confirmar({ titulo: 'Eliminar tarea', confirmar: 'Eliminar', peligro: true }))) return;
    try {
      await eliminar.mutateAsync(tarea.id);
      toast.ok('Tarea eliminada.');
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={tarea ? 'Editar tarea' : 'Nueva tarea'}
      pie={
        <>
          {tarea && (
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
        <Campo etiqueta="Título" requerido className="sm:col-span-2">
          {(id) => <Entrada id={id} value={v.titulo} onChange={(e) => set('titulo', e.target.value)} />}
        </Campo>
        <Campo etiqueta="Descripción" className="sm:col-span-2">
          {(id) => <AreaTexto id={id} value={v.descripcion} onChange={(e) => set('descripcion', e.target.value)} rows={3} />}
        </Campo>
        <Campo etiqueta="Estado">
          {(id) => (
            <Selector id={id} value={v.estado} onChange={(e) => set('estado', e.target.value as EstadoTarea)}>
              {ESTADOS_TAREA.map((x) => (
                <option key={x.valor} value={x.valor}>
                  {x.etiqueta}
                </option>
              ))}
            </Selector>
          )}
        </Campo>
        <Campo etiqueta="Prioridad">
          {(id) => (
            <Selector id={id} value={v.prioridad} onChange={(e) => set('prioridad', e.target.value as Prioridad)}>
              {PRIORIDADES.map((x) => (
                <option key={x.valor} value={x.valor}>
                  {x.etiqueta}
                </option>
              ))}
            </Selector>
          )}
        </Campo>
        <Campo etiqueta="Fecha límite">
          {(id) => <Entrada id={id} type="date" value={v.fecha_limite ?? ''} onChange={(e) => set('fecha_limite', e.target.value || null)} />}
        </Campo>
        <Campo etiqueta="Responsable">
          {(id) => (
            <Selector id={id} value={v.responsable_id ?? ''} onChange={(e) => set('responsable_id', e.target.value || null)}>
              <option value="">Sin asignar (equipo)</option>
              {perfiles
                .filter((p) => p.activo)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                    {p.id === perfil?.id ? ' (yo)' : ''}
                  </option>
                ))}
            </Selector>
          )}
        </Campo>
      </div>
    </Modal>
  );
}
