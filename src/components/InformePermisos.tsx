import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Boton, Campo, Entrada, Tarjeta, Vacio } from '@/components/ui';
import { useAjustes, useTabla } from '@/hooks/useDatos';
import { useToast } from '@/hooks/useToast';
import { etiqueta, TIPOS_NOVEDAD } from '@/lib/catalogos';
import { armarInforme, descargarInforme } from '@/lib/informePermisos';
import { aISO, cx, hoyISO, nombreDocente, porId } from '@/lib/utils';

type Periodo = 'mes' | 'anterior' | 'anio' | 'otro';

function rango(p: Periodo, hoy: string): [string, string] {
  const [a, m] = hoy.split('-').map(Number);
  if (p === 'mes') return [`${hoy.slice(0, 7)}-01`, aISO(new Date(a, m, 0))];
  if (p === 'anterior') return [aISO(new Date(a, m - 2, 1)), aISO(new Date(a, m - 1, 0))];
  return [`${a}-01-01`, `${a}-12-31`];
}

/** Reportes → Informe de permisos: por docente y por tipo, con descarga en Excel. */
export function InformePermisos() {
  const ajustes = useAjustes();
  const { data: novedades = [] } = useTabla('novedades');
  const { data: horarios = [] } = useTabla('horarios');
  const { data: docentes = [] } = useTabla('docentes');
  const toast = useToast();
  const hoy = hoyISO();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [propio, setPropio] = useState<[string, string]>(() => rango('mes', hoy));
  const [desde, hasta] = periodo === 'otro' ? propio : rango(periodo, hoy);
  const valido = !!desde && !!hasta && desde <= hasta;
  const inf = useMemo(() => (valido ? armarInforme(novedades, horarios, desde, hasta) : null), [novedades, horarios, desde, hasta, valido]);
  const docs = porId(docentes);
  const [descargando, setDescargando] = useState(false);

  const descargar = async () => {
    if (!inf) return;
    setDescargando(true);
    try {
      await descargarInforme(inf, { docentes, tipos: TIPOS_NOVEDAD, institucion: ajustes.nombre || 'Institución' });
    } catch (e) {
      toast.error(e);
    } finally {
      setDescargando(false);
    }
  };

  const periodos: { v: Periodo; t: string }[] = [
    { v: 'mes', t: 'Este mes' },
    { v: 'anterior', t: 'Mes anterior' },
    { v: 'anio', t: 'Este año' },
    { v: 'otro', t: 'Otras fechas' },
  ];

  return (
    <Tarjeta
      titulo="Informe de permisos"
      icono={<FileSpreadsheet className="size-4" />}
      accion={
        <Boton tam="sm" icono={<Download className="size-3.5" />} onClick={descargar} cargando={descargando} disabled={!inf?.total.permisos} className="no-print">
          Descargar Excel
        </Boton>
      }
    >
      <div className="no-print mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Periodo del informe">
          {periodos.map((p) => (
            <button
              key={p.v}
              type="button"
              role="radio"
              aria-checked={periodo === p.v}
              onClick={() => {
                if (p.v === 'otro') setPropio([desde, hasta]);
                setPeriodo(p.v);
              }}
              className={cx(
                'rounded-full border px-3.5 py-1.5 text-sm transition',
                periodo === p.v ? 'border-ink bg-ink text-bg' : 'border-line bg-surface hover:border-line-strong',
              )}
            >
              {p.t}
            </button>
          ))}
        </div>
        {periodo === 'otro' && (
          <div className="flex flex-wrap gap-3">
            <Campo etiqueta="Desde">{(id) => <Entrada id={id} type="date" value={propio[0]} onChange={(e) => setPropio([e.target.value, propio[1]])} />}</Campo>
            <Campo etiqueta="Hasta" error={!valido ? 'Debe ser posterior a «Desde».' : undefined}>
              {(id) => <Entrada id={id} type="date" value={propio[1]} onChange={(e) => setPropio([propio[0], e.target.value])} />}
            </Campo>
          </div>
        )}
      </div>

      {inf && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Permisos aprobados', inf.total.permisos],
              ['Días hábiles', inf.total.dias],
              ['Horas', inf.total.horas],
              ['Clases afectadas', inf.total.clases],
              ['Sin reemplazo', inf.total.sinReemplazo],
              ['Soporte pendiente', inf.total.soportePendiente],
            ].map(([t, v]) => (
              <div key={t} className="rounded-[16px] bg-surface-2 p-3.5">
                <p className="font-display text-2xl font-semibold tabular-nums">{v}</p>
                <p className="text-xs text-muted">{t}</p>
              </div>
            ))}
          </div>

          {!inf.docentes.length ? (
            <Vacio titulo="Sin permisos aprobados en este periodo" texto="Elija otro periodo para ver el informe." />
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs font-semibold text-muted">
                  <tr className="border-b border-line">
                    <th className="py-2 pr-3">Docente</th>
                    <th className="px-3 py-2 text-right">Permisos</th>
                    <th className="px-3 py-2 text-right">Días hábiles</th>
                    <th className="px-3 py-2 text-right">Horas</th>
                    <th className="px-3 py-2 text-right">Clases afectadas</th>
                    <th className="py-2 pl-3">Tipos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {inf.docentes.map((f) => (
                    <tr key={f.docente_id}>
                      <td className="py-2.5 pr-3 font-medium">{nombreDocente(docs.get(f.docente_id))}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{f.permisos}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{f.dias}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{f.horas}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{f.clases}</td>
                      <td className="py-2.5 pl-3 text-xs text-muted">
                        {Object.entries(f.porTipo)
                          .map(([t, c]) => `${c} ${etiqueta(TIPOS_NOVEDAD, t).toLowerCase()}`)
                          .join(' · ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted">
            Del {desde.split('-').reverse().join('/')} al {hasta.split('-').reverse().join('/')}. Cuenta solo los permisos aprobados y los días y clases que caen
            dentro del periodo. El Excel trae además el detalle de cada permiso.
          </p>
        </>
      )}
    </Tarjeta>
  );
}
