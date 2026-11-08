import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Pencil, Plus, Printer, Trash2, UserRoundCheck } from 'lucide-react';
import { AreaTexto, Avatar, Boton, Campo, Cargando, Encabezado, Entrada, Insignia, Modal, Panel, Selector, Tarjeta, Vacio } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAjustes, useMutar, useTabla } from '@/hooks/useDatos';
import { useConfirmar } from '@/hooks/useConfirmar';
import { useToast } from '@/hooks/useToast';
import { etiqueta, TIPOS_SEGUIMIENTO } from '@/lib/catalogos';
import type { Nuevo, Seguimiento as TSeg } from '@/lib/types';
import { cx, fechaCorta, fechaLarga, hoyISO, nombreDocente, nombreGrupo, porId } from '@/lib/utils';

const NIVELES_RUBRICA = [
  { v: 1, t: 'Inicial' },
  { v: 2, t: 'En desarrollo' },
  { v: 3, t: 'Satisfactorio' },
  { v: 4, t: 'Destacado' },
];

const promedio = (s: TSeg) => (s.criterios.length ? s.criterios.reduce((a, c) => a + c.valor, 0) / s.criterios.length : 0);
const tonoPromedio = (p: number) => (p >= 3.5 ? 'ok' : p >= 2.5 ? 'info' : p >= 1.75 ? 'warn' : 'danger');

export default function Seguimiento() {
  const { editar, perfil } = useAuth();
  const puede = editar('seguimiento');
  const { data: seguimientos, isLoading } = useTabla('seguimientos');
  const { data: docentes = [] } = useTabla('docentes');
  const { data: grupos = [] } = useTabla('grupos');
  const { data: grados = [] } = useTabla('grados');
  const { eliminar } = useMutar('seguimientos');
  const confirmar = useConfirmar();
  const toast = useToast();
  const [doc, setDoc] = useState('');
  const [tipo, setTipo] = useState('');
  const [form, setForm] = useState<{ abierto: boolean; seg?: TSeg }>({ abierto: false });
  const [detalle, setDetalle] = useState<TSeg | null>(null);

  const docs = porId(docentes);
  const visibles = (seguimientos ?? []).filter((s) => puede || (s.docente_id === perfil?.docente_id && s.estado === 'socializado'));
  const lista = visibles
    .filter((s) => (!doc || s.docente_id === doc) && (!tipo || s.tipo === tipo))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const porCriterio = useMemo(() => {
    const m = new Map<string, { suma: number; n: number }>();
    for (const s of lista)
      for (const c of s.criterios) {
        const x = m.get(c.criterio) ?? { suma: 0, n: 0 };
        m.set(c.criterio, { suma: x.suma + c.valor, n: x.n + 1 });
      }
    return [...m.entries()].map(([criterio, { suma, n }]) => ({ criterio, prom: suma / n })).sort((a, b) => b.prom - a.prom);
  }, [lista]);
  const acompanados = new Set(visibles.map((s) => s.docente_id)).size;
  const activos = docentes.filter((d) => d.estado === 'activo').length;

  const borrar = async (s: TSeg) => {
    if (!(await confirmar({ titulo: 'Eliminar seguimiento', confirmar: 'Eliminar', peligro: true }))) return;
    try {
      await eliminar.mutateAsync(s.id);
      setDetalle(null);
      toast.ok('Seguimiento eliminado.');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <Encabezado
        titulo="Seguimiento pedagógico"
        descripcion={puede ? 'Visitas de aula y acompañamiento al equipo docente, con rúbrica de valoración.' : 'Los acompañamientos socializados con usted.'}
        acciones={
          puede && (
            <Boton icono={<Plus className="size-4" />} onClick={() => setForm({ abierto: true })}>
              Nuevo seguimiento
            </Boton>
          )
        }
      />

      {puede && (
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="card flex flex-col justify-between p-5">
            <p className="text-sm font-semibold text-muted">Cobertura del acompañamiento</p>
            <p className="mt-2 font-display text-4xl font-semibold tabular-nums">
              {acompanados}
              <span className="text-xl text-muted"> / {activos}</span>
            </p>
            <p className="text-sm text-muted">docentes activos con al menos un seguimiento</p>
          </div>
          <Tarjeta titulo="Promedio por criterio" className="lg:col-span-2">
            {porCriterio.length === 0 ? (
              <p className="text-sm text-muted">Aún no hay valoraciones.</p>
            ) : (
              <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {porCriterio.map((c) => (
                  <li key={c.criterio}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="truncate pr-2">{c.criterio}</span>
                      <span className="font-semibold tabular-nums">{c.prom.toFixed(1)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(c.prom / 4) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>
      )}

      {puede && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <Selector value={doc} onChange={(e) => setDoc(e.target.value)} className="sm:w-72" aria-label="Filtrar por docente">
            <option value="">Todos los docentes</option>
            {[...docentes]
              .sort((a, b) => a.apellidos.localeCompare(b.apellidos))
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.apellidos}, {d.nombres}
                </option>
              ))}
          </Selector>
          <Selector value={tipo} onChange={(e) => setTipo(e.target.value)} className="sm:w-56" aria-label="Filtrar por tipo">
            <option value="">Todos los tipos</option>
            {TIPOS_SEGUIMIENTO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </Selector>
        </div>
      )}

      {isLoading ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <div className="card">
          <Vacio icono={<UserRoundCheck className="size-6" />} titulo="Sin seguimientos registrados" texto={puede ? 'Registre la primera visita de aula o revisión de planeación.' : undefined} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((s) => {
            const d = docs.get(s.docente_id);
            const p = promedio(s);
            return (
              <button key={s.id} onClick={() => setDetalle(s)} className="card flex flex-col gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-pop">
                <div className="flex items-center gap-3">
                  <Avatar nombre={nombreDocente(d)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{nombreDocente(d)}</p>
                    <p className="text-xs text-muted">
                      {etiqueta(TIPOS_SEGUIMIENTO, s.tipo)} · {fechaCorta(s.fecha)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl leading-none font-semibold tabular-nums">{p.toFixed(1)}</p>
                    <p className="text-[11px] text-muted">de 4</p>
                  </div>
                </div>
                <div className="flex gap-1" aria-hidden>
                  {s.criterios.map((c) => (
                    <span key={c.criterio} className="h-1.5 flex-1 rounded-full" style={{ background: `color-mix(in srgb, var(--brand) ${c.valor * 25}%, var(--surface-3))` }} />
                  ))}
                </div>
                {s.fortalezas && <p className="line-clamp-2 text-sm text-ink-2">{s.fortalezas}</p>}
                <div className="mt-auto flex items-center gap-2">
                  <Insignia tono={s.estado === 'socializado' ? 'ok' : 'neutral'}>{s.estado === 'socializado' ? 'Socializado' : 'Borrador'}</Insignia>
                  <Insignia tono={tonoPromedio(p)}>{NIVELES_RUBRICA[Math.max(0, Math.round(p) - 1)]?.t}</Insignia>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {detalle && (
        <Modal
          abierto
          onCerrar={() => setDetalle(null)}
          titulo={`${etiqueta(TIPOS_SEGUIMIENTO, detalle.tipo)} · ${nombreDocente(docs.get(detalle.docente_id))}`}
          descripcion={`${fechaLarga(detalle.fecha)}${detalle.grupo_id ? ` · ${nombreGrupo(grupos.find((g) => g.id === detalle.grupo_id), grados)}` : ''} · Observador: ${detalle.observador}`}
          ancho="lg"
          pie={
            <>
              {puede && (
                <Boton variante="fantasma" className="mr-auto text-danger hover:bg-danger-soft" icono={<Trash2 className="size-4" />} onClick={() => borrar(detalle)}>
                  Eliminar
                </Boton>
              )}
              <Boton variante="secundario" icono={<Printer className="size-4" />} onClick={() => window.print()}>
                Imprimir
              </Boton>
              {puede && (
                <Boton
                  icono={<Pencil className="size-4" />}
                  onClick={() => {
                    setForm({ abierto: true, seg: detalle });
                    setDetalle(null);
                  }}
                >
                  Editar
                </Boton>
              )}
            </>
          }
        >
          <div className="flex flex-col gap-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted uppercase">
                  <th className="py-2 font-semibold">Criterio</th>
                  {NIVELES_RUBRICA.map((n) => (
                    <th key={n.v} className="w-20 py-2 text-center font-semibold">
                      {n.v}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detalle.criterios.map((c) => (
                  <tr key={c.criterio} className="border-b border-line/70">
                    <td className="py-2.5 pr-3">{c.criterio}</td>
                    {NIVELES_RUBRICA.map((n) => (
                      <td key={n.v} className="text-center">
                        <span className={cx('inline-block size-4 rounded-full', c.valor === n.v ? 'bg-brand' : 'bg-surface-3')} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="py-2.5 font-semibold">Promedio</td>
                  <td colSpan={4} className="text-center font-display text-lg font-semibold">
                    {promedio(detalle).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
            {(
              [
                ['Fortalezas', detalle.fortalezas],
                ['Oportunidades de mejora', detalle.oportunidades],
                ['Compromisos', detalle.compromisos],
              ] as const
            ).map(([t, v]) =>
              v ? (
                <div key={t}>
                  <p className="mb-1 text-xs font-semibold tracking-wider text-muted uppercase">{t}</p>
                  <p className="whitespace-pre-line">{v}</p>
                </div>
              ) : null,
            )}
          </div>
        </Modal>
      )}

      <FormSeguimiento {...form} onCerrar={() => setForm({ abierto: false })} />
    </>
  );
}

function FormSeguimiento({ abierto, seg, onCerrar }: { abierto: boolean; seg?: TSeg; onCerrar: () => void }) {
  const { perfil } = useAuth();
  const ajustes = useAjustes();
  const { data: docentes = [] } = useTabla('docentes');
  const { data: grupos = [] } = useTabla('grupos');
  const { data: grados = [] } = useTabla('grados');
  const { crear, editar } = useMutar('seguimientos');
  const toast = useToast();
  const nuevo = (): Nuevo<TSeg> => ({
    docente_id: '',
    grupo_id: null,
    fecha: hoyISO(),
    tipo: 'visita_aula',
    criterios: ajustes.criterios_seguimiento.map((c) => ({ criterio: c, valor: 3 })),
    fortalezas: '',
    oportunidades: '',
    compromisos: '',
    estado: 'borrador',
    observador: perfil?.nombre ?? '',
  });
  const [v, setV] = useState<Nuevo<TSeg>>(nuevo);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));
  useEffect(() => {
    if (abierto) setV(seg ? { ...seg } : nuevo());
  }, [abierto, seg]);

  const guardar = async () => {
    if (!v.docente_id) return toast.error('Seleccione el docente.');
    try {
      const datos = { ...v, grupo_id: v.grupo_id || null };
      if (seg) await editar.mutateAsync({ id: seg.id, cambios: datos });
      else await crear.mutateAsync(datos);
      toast.ok('Seguimiento guardado.');
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  const area = (k: 'fortalezas' | 'oportunidades' | 'compromisos', t: string) => (
    <Campo etiqueta={t}>{(id) => <AreaTexto id={id} value={v[k]} onChange={(e) => set(k, e.target.value)} rows={3} />}</Campo>
  );

  return (
    <Panel
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={seg ? 'Editar seguimiento' : 'Nuevo seguimiento'}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={crear.isPending || editar.isPending} icono={<ClipboardCheck className="size-4" />}>
            Guardar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Docente" requerido className="sm:col-span-2">
            {(id) => (
              <Selector id={id} value={v.docente_id} onChange={(e) => set('docente_id', e.target.value)}>
                <option value="">Seleccione…</option>
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
          <Campo etiqueta="Tipo">
            {(id) => (
              <Selector id={id} value={v.tipo} onChange={(e) => set('tipo', e.target.value as TSeg['tipo'])}>
                {TIPOS_SEGUIMIENTO.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.etiqueta}
                  </option>
                ))}
              </Selector>
            )}
          </Campo>
          <Campo etiqueta="Fecha">
            {(id) => <Entrada id={id} type="date" value={v.fecha} onChange={(e) => set('fecha', e.target.value)} />}
          </Campo>
          <Campo etiqueta="Grupo observado">
            {(id) => (
              <Selector id={id} value={v.grupo_id ?? ''} onChange={(e) => set('grupo_id', e.target.value || null)}>
                <option value="">No aplica</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {nombreGrupo(g, grados)}
                  </option>
                ))}
              </Selector>
            )}
          </Campo>
          <Campo etiqueta="Estado">
            {(id) => (
              <Selector id={id} value={v.estado} onChange={(e) => set('estado', e.target.value as TSeg['estado'])}>
                <option value="borrador">Borrador (solo directivos)</option>
                <option value="socializado">Socializado con el docente</option>
              </Selector>
            )}
          </Campo>
        </div>

        <fieldset>
          <legend className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">Rúbrica de valoración</legend>
          <div className="flex flex-col gap-3">
            {v.criterios.map((c, i) => (
              <div key={c.criterio} className="rounded-xl border border-line p-3">
                <p className="mb-2 text-sm font-semibold">{c.criterio}</p>
                <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={c.criterio}>
                  {NIVELES_RUBRICA.map((n) => (
                    <button
                      key={n.v}
                      type="button"
                      role="radio"
                      aria-checked={c.valor === n.v}
                      onClick={() => set('criterios', v.criterios.map((x, j) => (j === i ? { ...x, valor: n.v } : x)))}
                      className={cx(
                        'rounded-lg px-1 py-1.5 text-xs font-semibold transition',
                        c.valor === n.v ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-ink-2 hover:bg-surface-3',
                      )}
                    >
                      <span className="block font-display text-sm">{n.v}</span>
                      <span className="hidden sm:block">{n.t}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        {area('fortalezas', 'Fortalezas observadas')}
        {area('oportunidades', 'Oportunidades de mejora')}
        {area('compromisos', 'Compromisos acordados')}
      </div>
    </Panel>
  );
}
