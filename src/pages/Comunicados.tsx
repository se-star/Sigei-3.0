import { useEffect, useState } from 'react';
import { Megaphone, Pencil, Pin, PinOff, Plus, Trash2 } from 'lucide-react';
import { AreaTexto, Avatar, Boton, Campo, Cargando, Encabezado, Entrada, Insignia, Interruptor, Modal, Segmentos, Selector, Vacio } from '@/components/ui';
import { Buscador } from '@/components/ui/Buscador';
import { useAuth } from '@/hooks/useAuth';
import { useMutar, useTabla } from '@/hooks/useDatos';
import { useConfirmar } from '@/hooks/useConfirmar';
import { useToast } from '@/hooks/useToast';
import { AUDIENCIAS, etiqueta, PRIORIDADES, tono } from '@/lib/catalogos';
import type { Audiencia, Comunicado, Nuevo, Prioridad } from '@/lib/types';
import { coincide, cx, fechaHora, hace } from '@/lib/utils';

export default function Comunicados() {
  const { editar, perfil } = useAuth();
  const puede = editar('comunicados');
  const { data: comunicados, isLoading } = useTabla('comunicados');
  const mut = useMutar('comunicados');
  const confirmar = useConfirmar();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [aud, setAud] = useState<Audiencia | 'todas'>('todas');
  const [form, setForm] = useState<{ abierto: boolean; com?: Comunicado }>({ abierto: false });

  const esDocente = perfil?.rol === 'docente';
  const lista = (comunicados ?? [])
    .filter((c) => !esDocente || c.audiencia !== 'directivos')
    .filter((c) => (aud === 'todas' || c.audiencia === aud) && coincide(q, c.titulo, c.contenido, c.autor))
    .sort((a, b) => Number(b.fijado) - Number(a.fijado) || b.publicado_en.localeCompare(a.publicado_en));

  const fijar = async (c: Comunicado) => {
    try {
      await mut.editar.mutateAsync({ id: c.id, cambios: { fijado: !c.fijado } });
      toast.ok(c.fijado ? 'Comunicado desfijado.' : 'Comunicado fijado arriba.');
    } catch (e) {
      toast.error(e);
    }
  };
  const borrar = async (c: Comunicado) => {
    if (!(await confirmar({ titulo: 'Eliminar comunicado', texto: `¿Eliminar “${c.titulo}”?`, confirmar: 'Eliminar', peligro: true }))) return;
    try {
      await mut.eliminar.mutateAsync(c.id);
      toast.ok('Comunicado eliminado.');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <Encabezado
        titulo="Comunicados"
        descripcion="Avisos y circulares para la comunidad educativa."
        acciones={
          puede && (
            <Boton icono={<Plus className="size-4" />} onClick={() => setForm({ abierto: true })}>
              Publicar comunicado
            </Boton>
          )
        }
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        {!esDocente && (
          <Segmentos<Audiencia | 'todas'>
            valor={aud}
            onCambio={setAud}
            opciones={[{ valor: 'todas', etiqueta: 'Todos' }, ...AUDIENCIAS.map((a) => ({ valor: a.valor, etiqueta: a.etiqueta }))]}
          />
        )}
        <Buscador valor={q} onCambio={setQ} placeholder="Buscar en comunicados" className="sm:ml-auto sm:w-72" />
      </div>

      {isLoading ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <div className="card">
          <Vacio icono={<Megaphone className="size-6" />} titulo="Sin comunicados" texto="Las publicaciones aparecerán aquí." />
        </div>
      ) : (
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {lista.map((c) => (
            <article key={c.id} className={cx('card anim-rise p-6', c.fijado && 'ring-1 ring-ink/10')}>
              <header className="mb-3 flex items-start gap-3">
                <Avatar nombre={c.autor} tam={40} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.autor}</p>
                  <p className="text-xs text-muted" title={fechaHora(c.publicado_en)}>
                    {hace(c.publicado_en)} · Para: {etiqueta(AUDIENCIAS, c.audiencia).toLowerCase()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {c.fijado && (
                    <Insignia tono="brand">
                      <Pin className="size-3" /> Fijado
                    </Insignia>
                  )}
                  {c.prioridad !== 'normal' && <Insignia tono={tono(PRIORIDADES, c.prioridad)}>Prioridad {etiqueta(PRIORIDADES, c.prioridad).toLowerCase()}</Insignia>}
                </div>
              </header>
              <h2 className="text-xl font-semibold">{c.titulo}</h2>
              <p className="mt-2 leading-relaxed whitespace-pre-line text-ink-2">{c.contenido}</p>
              {puede && (
                <footer className="mt-4 flex gap-1 border-t border-line pt-3">
                  <Boton variante="fantasma" tam="sm" icono={c.fijado ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />} onClick={() => fijar(c)}>
                    {c.fijado ? 'Desfijar' : 'Fijar'}
                  </Boton>
                  <Boton variante="fantasma" tam="sm" icono={<Pencil className="size-3.5" />} onClick={() => setForm({ abierto: true, com: c })}>
                    Editar
                  </Boton>
                  <Boton variante="fantasma" tam="sm" className="ml-auto text-danger hover:bg-danger-soft" icono={<Trash2 className="size-3.5" />} onClick={() => borrar(c)}>
                    Eliminar
                  </Boton>
                </footer>
              )}
            </article>
          ))}
        </div>
      )}

      <FormComunicado {...form} onCerrar={() => setForm({ abierto: false })} />
    </>
  );
}

function FormComunicado({ abierto, com, onCerrar }: { abierto: boolean; com?: Comunicado; onCerrar: () => void }) {
  const { perfil } = useAuth();
  const { crear, editar } = useMutar('comunicados');
  const toast = useToast();
  const vacio = (): Nuevo<Comunicado> => ({ titulo: '', contenido: '', prioridad: 'normal', audiencia: 'todos', fijado: false, autor: perfil?.nombre ?? '', publicado_en: new Date().toISOString() });
  const [v, setV] = useState(vacio);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));
  useEffect(() => {
    if (abierto) setV(com ? { ...com } : vacio());
  }, [abierto, com]);

  const guardar = async () => {
    if (!v.titulo.trim() || !v.contenido.trim()) return toast.error('Escriba el título y el contenido.');
    try {
      const datos = { ...v, titulo: v.titulo.trim(), contenido: v.contenido.trim() };
      if (com) await editar.mutateAsync({ id: com.id, cambios: datos });
      else await crear.mutateAsync({ ...datos, publicado_en: new Date().toISOString() });
      toast.ok(com ? 'Comunicado actualizado.' : 'Comunicado publicado.');
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={com ? 'Editar comunicado' : 'Nuevo comunicado'}
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={crear.isPending || editar.isPending} icono={<Megaphone className="size-4" />}>
            {com ? 'Guardar' : 'Publicar'}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Título" requerido>
          {(id) => <Entrada id={id} value={v.titulo} onChange={(e) => set('titulo', e.target.value)} />}
        </Campo>
        <Campo etiqueta="Contenido" requerido>
          {(id) => <AreaTexto id={id} value={v.contenido} onChange={(e) => set('contenido', e.target.value)} rows={7} />}
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Dirigido a">
            {(id) => (
              <Selector id={id} value={v.audiencia} onChange={(e) => set('audiencia', e.target.value as Audiencia)}>
                {AUDIENCIAS.map((a) => (
                  <option key={a.valor} value={a.valor}>
                    {a.etiqueta}
                  </option>
                ))}
              </Selector>
            )}
          </Campo>
          <Campo etiqueta="Prioridad">
            {(id) => (
              <Selector id={id} value={v.prioridad} onChange={(e) => set('prioridad', e.target.value as Prioridad)}>
                {PRIORIDADES.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.etiqueta}
                  </option>
                ))}
              </Selector>
            )}
          </Campo>
          <Campo etiqueta="Firma">
            {(id) => <Entrada id={id} value={v.autor} onChange={(e) => set('autor', e.target.value)} />}
          </Campo>
        </div>
        <Interruptor activo={v.fijado} onCambio={(x) => set('fijado', x)} etiqueta="Fijar arriba" descripcion="Se mostrará primero en el listado y en el inicio." />
      </div>
    </Modal>
  );
}
