import { useEffect, useState } from 'react';
import { AreaTexto, Boton, Campo, Modal, Selector } from '@/components/ui';
import { ListaSoportes } from '@/components/Soportes';
import { useAuth } from '@/hooks/useAuth';
import { useMutar, useTabla } from '@/hooks/useDatos';
import { useToast } from '@/hooks/useToast';
import { DIAS, etiqueta, TIPOS_NOVEDAD } from '@/lib/catalogos';
import type { BloqueHorario, Novedad } from '@/lib/types';
import { desdeISO, diasEntre, fechaCorta, nombreDocente, seSolapan, sumarDias } from '@/lib/utils';

export type DecisionNovedad = {
  n: Novedad;
  decision: 'aprobada' | 'rechazada';
};

/** Clases del horario que caen dentro del rango de la novedad. */
export function clasesAfectadas(n: Pick<Novedad, 'docente_id' | 'fecha_inicio' | 'fecha_fin'>, horarios: BloqueHorario[]) {
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

/** Ventana para aprobar o rechazar una novedad, con elección de reemplazo. */
export function RevisionNovedad({ datos, onCerrar }: { datos: DecisionNovedad | null; onCerrar: () => void }) {
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
        {!!n.soportes?.length && (
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink-2">Soportes adjuntos</p>
            <ListaSoportes soportes={n.soportes} />
          </div>
        )}
        {n.motivo && <p className="rounded-[20px] bg-surface-2 p-3 text-sm text-ink-2">{n.motivo}</p>}
        {aprobar && (
          <SelectorReemplazo novedad={n} valor={reemplazo} onCambio={setReemplazo} docentes={docentes} horarios={horarios} novedades={novedades} />
        )}
        <Campo etiqueta={aprobar ? 'Observación (opcional)' : 'Motivo del rechazo'}>
          {(id) => <AreaTexto id={id} value={obs} onChange={(e) => setObs(e.target.value)} rows={3} />}
        </Campo>
      </div>
    </Modal>
  );
}

/** Lista de docentes ordenada por disponibilidad para cubrir las clases afectadas. */
export function SelectorReemplazo({
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
  docentes: {
    id: string;
    nombres: string;
    apellidos: string;
    estado: string;
  }[];
  horarios: BloqueHorario[];
  novedades: Novedad[];
}) {
  const afectadas = clasesAfectadas(novedad, horarios);
  const opciones = docentes
    .filter((d) => d.estado === 'activo' && d.id !== novedad.docente_id)
    .map((d) => {
      const ausente = novedades.some(
        (x) =>
          x.id !== novedad.id &&
          x.docente_id === d.id &&
          x.estado === 'aprobada' &&
          x.fecha_inicio <= novedad.fecha_fin &&
          x.fecha_fin >= novedad.fecha_inicio,
      );
      const choques = afectadas.filter(({ bloque }) =>
        horarios.some((h) => h.docente_id === d.id && h.dia === bloque.dia && seSolapan(h, bloque)),
      ).length;
      return { d, ausente, choques };
    })
    .sort((a, b) => Number(a.ausente) - Number(b.ausente) || a.choques - b.choques || a.d.apellidos.localeCompare(b.d.apellidos));

  return (
    <div>
      <Campo
        etiqueta="Docente de reemplazo"
        ayuda={
          afectadas.length
            ? `Ordenados por disponibilidad para las ${afectadas.length} clases afectadas.`
            : 'El docente no tiene clases programadas en estas fechas.'
        }
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
