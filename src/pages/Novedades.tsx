import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell, Check, Download, Pencil, Plus, Trash2, UserCheck, X, CalendarRange, Ban } from 'lucide-react';
import { AreaTexto, Avatar, Boton, Campo, Cargando, Encabezado, Entrada, Insignia, Modal, Panel, Segmentos, Selector, Vacio } from '@/components/ui';
import { Buscador } from '@/components/ui/Buscador';
import { useAuth } from '@/hooks/useAuth';
import { useMutar, useTabla } from '@/hooks/useDatos';
import { useConfirmar } from '@/hooks/useConfirmar';
import { useToast } from '@/hooks/useToast';
import { DIAS, ESTADOS_NOVEDAD, etiqueta, tono, TIPOS_NOVEDAD } from '@/lib/catalogos';
import { puedeAprobar } from '@/lib/permisos';
import type { BloqueHorario, EstadoNovedad, ID, Novedad, Nuevo } from '@/lib/types';
import { coincide, desdeISO, descargarCSV, diasEntre, fechaCorta, hoyISO, nombreDocente, porId, seSolapan, sumarDias } from '@/lib/utils';

type Filtro = EstadoNovedad | 'todas';

/** Clases del horario que caen dentro del rango de la novedad. */
function clasesAfectadas(n: Pick<Novedad, 'docente_id' | 'fecha_inicio' | 'fecha_fin'>, horarios: BloqueHorario[]) {
  if (!n.docente_id || !n.fecha_inicio) return [];
  const fin = n.fecha_fin || n.fecha_inicio;
  const dias = Math.min(diasEntre(n.fecha_inicio, fin), 62);
  const out: { fecha: string; bloque: BloqueHorario }[] = [];
  for (let i = 0; i < dias; i++) {
    const f = sumarDias(n.fecha_inicio, i);
    const dow = desdeISO(f).getDay();
    for (const b of horarios) if (b.docente_id === n.docente_id && b.dia === dow) out.push({ fecha: f, bloque: b });
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.bloque.hora_inicio.localeCompare(b.bloque.hora_inicio));
}

export default function Novedades() {
  const { perfil } = useAuth();
  const aprueba = puedeAprobar(perfil?.rol);
  const [params, setParams] = useSearchParams();
  const { data: novedades, isLoading } = useTabla('novedades');
  const { data: docentes = [] } = useTabla('docentes');
  const { data: horarios = [] } = useTabla('horarios');
  const { editar, eliminar } = useMutar('novedades');
  const confirmar = useConfirmar();
  const toast = useToast();
  const [filtro, setFiltro] = useState<Filtro>(aprueba ? 'pendiente' : 'todas');
  const [tipo, setTipo] = useState('');
  const [q, setQ] = useState('');
  const [form, setForm] = useState<{ abierto: boolean; novedad?: Novedad; docente_id?: ID }>({ abierto: false });
  const [revision, setRevision] = useState<{ n: Novedad; decision: 'aprobada' | 'rechazada' } | null>(null);

  useEffect(() => {
    if (params.get('nueva')) {
      setForm({ abierto: true, docente_id: params.get('docente') ?? undefined });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const docs = porId(docentes);
  // Un docente sin rol directivo solo ve sus propias novedades.
  const visibles = (novedades ?? []).filter((n) => aprueba || n.docente_id === perfil?.docente_id);
  const filtradas = visibles
    .filter((n) => (filtro === 'todas' || n.estado === filtro) && (!tipo || n.tipo === tipo))
    .filter((n) => coincide(q, nombreDocente(docs.get(n.docente_id)), n.motivo))
    .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
  const cuenta = (e: Filtro) => visibles.filter((n) => e === 'todas' || n.estado === e).length;

  const anio = String(new Date().getFullYear());
  const resumen = useMemo(() => {
    const delAnio = visibles.filter((n) => n.estado === 'aprobada' && n.fecha_inicio.startsWith(anio));
    return {
      total: delAnio.length,
      dias: delAnio.filter((n) => !n.horas).reduce((s, n) => s + diasEntre(n.fecha_inicio, n.fecha_fin), 0),
      horas: delAnio.reduce((s, n) => s + (n.horas || 0), 0),
      sinReemplazo: visibles.filter((n) => n.estado === 'aprobada' && !n.reemplazo_id && n.fecha_fin >= hoyISO()).length,
    };
  }, [visibles, anio]);

  const anular = async (n: Novedad) => {
    if (!(await confirmar({ titulo: 'Anular solicitud', texto: 'La solicitud quedará como anulada y no se tendrá en cuenta.', confirmar: 'Anular', peligro: true }))) return;
    try {
      await editar.mutateAsync({ id: n.id, cambios: { estado: 'anulada' } });
      toast.ok('Solicitud anulada.');
    } catch (e) {
      toast.error(e);
    }
  };

  const borrar = async (n: Novedad) => {
    if (!(await confirmar({ titulo: 'Eliminar novedad', texto: 'Se eliminará el registro de forma permanente.', confirmar: 'Eliminar', peligro: true }))) return;
    try {
      await eliminar.mutateAsync(n.id);
      toast.ok('Novedad eliminada.');
    } catch (e) {
      toast.error(e);
    }
  };

  const exportar = () =>
    descargarCSV(
      'novedades',
      ['Docente', 'Documento', 'Tipo', 'Desde', 'Hasta', 'Días', 'Horas', 'Estado', 'Reemplazo', 'Motivo', 'Revisado por', 'Observación'],
      filtradas.map((n) => [
        nombreDocente(docs.get(n.docente_id)),
        docs.get(n.docente_id)?.documento,
        etiqueta(TIPOS_NOVEDAD, n.tipo),
        n.fecha_inicio,
        n.fecha_fin,
        diasEntre(n.fecha_inicio, n.fecha_fin),
        n.horas,
        etiqueta(ESTADOS_NOVEDAD, n.estado),
        n.reemplazo_id ? nombreDocente(docs.get(n.reemplazo_id)) : '',
        n.motivo,
        n.revisado_por,
        n.observacion_revision,
      ]),
    );

  return (
    <>
      <Encabezado
        titulo="Novedades y permisos"
        descripcion={aprueba ? 'Solicitudes de permiso, incapacidades y licencias del personal, con su reemplazo.' : 'Radique sus solicitudes y consulte su estado.'}
        acciones={
          <>
            {aprueba && (
              <Boton variante="secundario" icono={<Download className="size-4" />} onClick={exportar} disabled={!filtradas.length}>
                Exportar
              </Boton>
            )}
            <Boton icono={<Plus className="size-4" />} onClick={() => setForm({ abierto: true })} disabled={!aprueba && !perfil?.docente_id}>
              {aprueba ? 'Registrar novedad' : 'Solicitar permiso'}
            </Boton>
          </>
        }
      />

      {aprueba && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Aprobadas en ' + anio, resumen.total],
            ['Días de ausencia', resumen.dias],
            ['Horas de permiso', resumen.horas],
            ['Vigentes sin reemplazo', resumen.sinReemplazo],
          ].map(([t, v]) => (
            <div key={t} className="card p-4">
              <p className="font-display text-2xl font-extrabold tabular-nums">{v}</p>
              <p className="text-sm text-muted">{t}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
        <Segmentos<Filtro>
          valor={filtro}
          onCambio={setFiltro}
          opciones={[
            { valor: 'pendiente', etiqueta: 'Pendientes', cuenta: cuenta('pendiente') },
            { valor: 'aprobada', etiqueta: 'Aprobadas', cuenta: cuenta('aprobada') },
            { valor: 'rechazada', etiqueta: 'Rechazadas', cuenta: cuenta('rechazada') },
            { valor: 'todas', etiqueta: 'Todas', cuenta: cuenta('todas') },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row xl:ml-auto">
          {aprueba && <Buscador valor={q} onCambio={setQ} placeholder="Buscar docente o motivo" className="sm:w-64" />}
          <Selector value={tipo} onChange={(e) => setTipo(e.target.value)} className="sm:w-52" aria-label="Tipo de novedad">
            <option value="">Todos los tipos</option>
            {TIPOS_NOVEDAD.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </Selector>
        </div>
      </div>

      {isLoading ? (
        <Cargando />
      ) : filtradas.length === 0 ? (
        <div className="card">
          <Vacio
            icono={<Bell className="size-6" />}
            titulo={filtro === 'pendiente' ? 'No hay solicitudes por revisar' : 'No hay novedades'}
            texto={filtro === 'pendiente' ? 'Cuando un docente radique una solicitud aparecerá aquí.' : 'Pruebe con otro filtro.'}
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtradas.map((n) => {
            const d = docs.get(n.docente_id);
            const r = n.reemplazo_id ? docs.get(n.reemplazo_id) : undefined;
            const afect = clasesAfectadas(n, horarios).length;
            const dias = diasEntre(n.fecha_inicio, n.fecha_fin);
            const vigente = n.estado === 'aprobada' && n.fecha_inicio <= hoyISO() && n.fecha_fin >= hoyISO();
            return (
              <li key={n.id} className="card anim-rise p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <Avatar nombre={nombreDocente(d)} tam={42} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{nombreDocente(d)}</p>
                        <Insignia tono={tono(ESTADOS_NOVEDAD, n.estado)} punto>
                          {etiqueta(ESTADOS_NOVEDAD, n.estado)}
                        </Insignia>
                        {vigente && <Insignia tono="lime">En curso</Insignia>}
                      </div>
                      <p className="mt-0.5 text-sm text-ink-2">
                        <strong className="font-semibold">{etiqueta(TIPOS_NOVEDAD, n.tipo)}</strong> ·{' '}
                        <CalendarRange className="inline size-3.5 -translate-y-px text-muted" /> {fechaCorta(n.fecha_inicio)}
                        {n.fecha_fin !== n.fecha_inicio && ` al ${fechaCorta(n.fecha_fin)}`} · {n.horas ? `${n.horas} horas` : `${dias} ${dias === 1 ? 'día' : 'días'}`}
                        {afect > 0 && ` · ${afect} ${afect === 1 ? 'clase afectada' : 'clases afectadas'}`}
                      </p>
                      {n.motivo && <p className="mt-2 text-sm text-muted">{n.motivo}</p>}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {r ? (
                          <Insignia tono="ok">
                            <UserCheck className="size-3" /> Reemplazo: {nombreDocente(r, true)}
                          </Insignia>
                        ) : n.estado !== 'rechazada' && n.estado !== 'anulada' ? (
                          <Insignia tono="warn">Sin reemplazo asignado</Insignia>
                        ) : null}
                        {n.revisado_por && (
                          <span className="text-muted">
                            Revisado por {n.revisado_por}
                            {n.revisado_en && ` el ${fechaCorta(n.revisado_en.slice(0, 10))}`}
                            {n.observacion_revision && ` — “${n.observacion_revision}”`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {aprueba && n.estado === 'pendiente' && (
                      <>
                        <Boton tam="sm" icono={<Check className="size-3.5" />} onClick={() => setRevision({ n, decision: 'aprobada' })}>
                          Aprobar
                        </Boton>
                        <Boton tam="sm" variante="secundario" icono={<X className="size-3.5" />} onClick={() => setRevision({ n, decision: 'rechazada' })}>
                          Rechazar
                        </Boton>
                      </>
                    )}
                    {(aprueba || n.estado === 'pendiente') && n.estado !== 'anulada' && (
                      <Boton tam="icono" variante="fantasma" onClick={() => setForm({ abierto: true, novedad: n })} aria-label="Editar novedad">
                        <Pencil className="size-4" />
                      </Boton>
                    )}
                    {!aprueba && n.estado === 'pendiente' && (
                      <Boton tam="icono" variante="fantasma" onClick={() => anular(n)} aria-label="Anular solicitud">
                        <Ban className="size-4" />
                      </Boton>
                    )}
                    {aprueba && (
                      <Boton tam="icono" variante="fantasma" onClick={() => borrar(n)} aria-label="Eliminar novedad">
                        <Trash2 className="size-4" />
                      </Boton>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <FormNovedad {...form} onCerrar={() => setForm({ abierto: false })} />
      <Revision datos={revision} onCerrar={() => setRevision(null)} />
    </>
  );
}

function Revision({ datos, onCerrar }: { datos: { n: Novedad; decision: 'aprobada' | 'rechazada' } | null; onCerrar: () => void }) {
  const { perfil } = useAuth();
  const { editar } = useMutar('novedades');
  const { data: docentes = [] } = useTabla('docentes');
  const { data: horarios = [] } = useTabla('horarios');
  const { data: novedades = [] } = useTabla('novedades');
  const toast = useToast();
  const [obs, setObs] = useState('');
  const [reemplazo, setReemplazo] = useState('');
  useEffect(() => {
    setObs('');
    setReemplazo(datos?.n.reemplazo_id ?? '');
  }, [datos]);
  if (!datos) return null;
  const { n, decision } = datos;
  const aprobar = decision === 'aprobada';

  const guardar = async () => {
    try {
      await editar.mutateAsync({
        id: n.id,
        cambios: {
          estado: decision,
          observacion_revision: obs.trim(),
          revisado_por: perfil?.nombre ?? null,
          revisado_en: new Date().toISOString(),
          reemplazo_id: aprobar ? reemplazo || null : n.reemplazo_id,
        },
      });
      toast.ok(aprobar ? 'Novedad aprobada.' : 'Novedad rechazada.');
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={aprobar ? 'Aprobar novedad' : 'Rechazar novedad'}
      descripcion={`${nombreDocente(docentes.find((d) => d.id === n.docente_id))} · ${etiqueta(TIPOS_NOVEDAD, n.tipo)}`}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante={aprobar ? 'primario' : 'peligro'} onClick={guardar} cargando={editar.isPending}>
            {aprobar ? 'Aprobar' : 'Rechazar'}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {aprobar && <SelectorReemplazo novedad={n} valor={reemplazo} onCambio={setReemplazo} docentes={docentes} horarios={horarios} novedades={novedades} />}
        <Campo etiqueta={aprobar ? 'Observación (opcional)' : 'Motivo del rechazo'}>
          {(id) => <AreaTexto id={id} value={obs} onChange={(e) => setObs(e.target.value)} rows={3} />}
        </Campo>
      </div>
    </Modal>
  );
}

/** Lista de docentes ordenada por disponibilidad para cubrir las clases afectadas. */
function SelectorReemplazo({
  novedad,
  valor,
  onCambio,
  docentes,
  horarios,
  novedades,
}: {
  novedad: Pick<Novedad, 'docente_id' | 'fecha_inicio' | 'fecha_fin' | 'id'>;
  valor: string;
  onCambio: (v: string) => void;
  docentes: { id: string; nombres: string; apellidos: string; estado: string }[];
  horarios: BloqueHorario[];
  novedades: Novedad[];
}) {
  const afectadas = clasesAfectadas(novedad, horarios);
  const opciones = docentes
    .filter((d) => d.estado === 'activo' && d.id !== novedad.docente_id)
    .map((d) => {
      const ausente = novedades.some(
        (x) => x.id !== novedad.id && x.docente_id === d.id && x.estado === 'aprobada' && x.fecha_inicio <= novedad.fecha_fin && x.fecha_fin >= novedad.fecha_inicio,
      );
      const choques = afectadas.filter(({ bloque }) => horarios.some((h) => h.docente_id === d.id && h.dia === bloque.dia && seSolapan(h, bloque))).length;
      return { d, ausente, choques };
    })
    .sort((a, b) => Number(a.ausente) - Number(b.ausente) || a.choques - b.choques || a.d.apellidos.localeCompare(b.d.apellidos));

  return (
    <div>
      <Campo
        etiqueta="Docente de reemplazo"
        ayuda={afectadas.length ? `Ordenados por disponibilidad para las ${afectadas.length} clases afectadas.` : 'El docente no tiene clases programadas en estas fechas.'}
      >
        {(id) => (
          <Selector id={id} value={valor} onChange={(e) => onCambio(e.target.value)}>
            <option value="">Sin reemplazo</option>
            {opciones.map(({ d, ausente, choques }) => (
              <option key={d.id} value={d.id}>
                {d.apellidos}, {d.nombres}
                {ausente ? ' — también ausente' : afectadas.length ? (choques ? ` — ${choques} cruces` : ' — disponible') : ''}
              </option>
            ))}
          </Selector>
        )}
      </Campo>
      {afectadas.length > 0 && (
        <details className="mt-2 rounded-xl bg-surface-2 p-3 text-sm">
          <summary className="cursor-pointer font-semibold">Ver clases afectadas ({afectadas.length})</summary>
          <ul className="mt-2 flex flex-col gap-1 text-ink-2">
            {afectadas.slice(0, 30).map(({ fecha, bloque }) => (
              <li key={fecha + bloque.id} className="tabular-nums">
                {DIAS[bloque.dia - 1]?.corto} {fechaCorta(fecha)} · {bloque.hora_inicio}–{bloque.hora_fin}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function FormNovedad({ abierto, novedad, docente_id, onCerrar }: { abierto: boolean; novedad?: Novedad; docente_id?: ID; onCerrar: () => void }) {
  const { perfil } = useAuth();
  const aprueba = puedeAprobar(perfil?.rol);
  const { data: docentes = [] } = useTabla('docentes');
  const { data: horarios = [] } = useTabla('horarios');
  const { data: novedades = [] } = useTabla('novedades');
  const { crear, editar } = useMutar('novedades');
  const toast = useToast();
  const hoy = hoyISO();
  const vacio: Nuevo<Novedad> = {
    docente_id: '',
    tipo: 'permiso_personal',
    fecha_inicio: hoy,
    fecha_fin: hoy,
    horas: 0,
    motivo: '',
    estado: 'pendiente',
    reemplazo_id: null,
    revisado_por: null,
    revisado_en: null,
    observacion_revision: '',
    creado_por: null,
  };
  const [v, setV] = useState(vacio);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));
  const [porHoras, setPorHoras] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const base = novedad ?? { ...vacio, docente_id: aprueba ? (docente_id ?? '') : (perfil?.docente_id ?? ''), creado_por: perfil?.id ?? null };
    setV(base);
    setPorHoras(!!base.horas);
  }, [abierto, novedad, docente_id]);

  const guardar = async () => {
    if (!v.docente_id) return toast.error('Seleccione el docente.');
    if (!v.fecha_inicio) return toast.error('Indique la fecha de inicio.');
    const fin = v.fecha_fin || v.fecha_inicio;
    if (fin < v.fecha_inicio) return toast.error('La fecha final no puede ser anterior a la inicial.');
    if (porHoras && (!v.horas || v.horas <= 0)) return toast.error('Indique cuántas horas.');
    const solapa = novedades.some(
      (x) => x.id !== novedad?.id && x.docente_id === v.docente_id && x.estado !== 'rechazada' && x.estado !== 'anulada' && x.fecha_inicio <= fin && x.fecha_fin >= v.fecha_inicio,
    );
    if (solapa) return toast.error('Ya existe una novedad para este docente que se cruza con esas fechas.');
    const datos = { ...v, fecha_fin: fin, horas: porHoras ? Number(v.horas) : 0, motivo: v.motivo.trim(), reemplazo_id: v.reemplazo_id || null };
    if (!novedad && datos.estado === 'aprobada') Object.assign(datos, { revisado_por: perfil?.nombre ?? null, revisado_en: new Date().toISOString() });
    try {
      if (novedad) await editar.mutateAsync({ id: novedad.id, cambios: datos });
      else await crear.mutateAsync(datos);
      toast.ok(novedad ? 'Novedad actualizada.' : aprueba ? 'Novedad registrada.' : 'Solicitud enviada. Le avisaremos cuando sea revisada.');
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  const activos = docentes.filter((d) => d.estado !== 'retirado').sort((a, b) => a.apellidos.localeCompare(b.apellidos));
  return (
    <Panel
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={novedad ? 'Editar novedad' : aprueba ? 'Registrar novedad' : 'Solicitar permiso'}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={crear.isPending || editar.isPending}>
            {novedad ? 'Guardar cambios' : aprueba ? 'Registrar' : 'Enviar solicitud'}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Docente" requerido>
          {(id) => (
            <Selector id={id} value={v.docente_id} onChange={(e) => set('docente_id', e.target.value)} disabled={!aprueba}>
              <option value="">Seleccione…</option>
              {activos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.apellidos}, {d.nombres}
                </option>
              ))}
            </Selector>
          )}
        </Campo>
        <Campo etiqueta="Tipo de novedad" requerido>
          {(id) => (
            <Selector id={id} value={v.tipo} onChange={(e) => set('tipo', e.target.value as Novedad['tipo'])}>
              {TIPOS_NOVEDAD.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </Selector>
          )}
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Desde" requerido>
            {(id) => (
              <Entrada
                id={id}
                type="date"
                value={v.fecha_inicio}
                onChange={(e) => setV((x) => ({ ...x, fecha_inicio: e.target.value, fecha_fin: x.fecha_fin < e.target.value ? e.target.value : x.fecha_fin }))}
              />
            )}
          </Campo>
          <Campo etiqueta="Hasta" requerido>
            {(id) => <Entrada id={id} type="date" min={v.fecha_inicio} value={v.fecha_fin} onChange={(e) => set('fecha_fin', e.target.value)} />}
          </Campo>
        </div>
        <label className="flex items-center gap-2.5 text-sm font-medium">
          <input type="checkbox" checked={porHoras} onChange={(e) => setPorHoras(e.target.checked)} className="size-4 accent-[var(--brand)]" />
          Es un permiso por horas (no la jornada completa)
        </label>
        {porHoras && (
          <Campo etiqueta="Número de horas">
            {(id) => <Entrada id={id} type="number" min={1} max={12} value={v.horas || ''} onChange={(e) => set('horas', Number(e.target.value))} />}
          </Campo>
        )}
        <Campo etiqueta="Motivo o descripción">
          {(id) => <AreaTexto id={id} value={v.motivo} onChange={(e) => set('motivo', e.target.value)} rows={3} placeholder="Describa brevemente la situación y los soportes que adjuntará." />}
        </Campo>
        {aprueba && v.docente_id && (
          <SelectorReemplazo
            novedad={{ ...v, id: novedad?.id ?? '' }}
            valor={v.reemplazo_id ?? ''}
            onCambio={(x) => set('reemplazo_id', x || null)}
            docentes={docentes}
            horarios={horarios}
            novedades={novedades}
          />
        )}
        {aprueba && !novedad && (
          <Campo etiqueta="Estado inicial">
            {(id) => (
              <Selector id={id} value={v.estado} onChange={(e) => set('estado', e.target.value as EstadoNovedad)}>
                <option value="pendiente">Pendiente de aprobación</option>
                <option value="aprobada">Aprobada</option>
              </Selector>
            )}
          </Campo>
        )}
      </div>
    </Panel>
  );
}
