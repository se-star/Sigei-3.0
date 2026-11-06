import { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Boton, Encabezado, Selector, Tarjeta } from '@/components/ui';
import { useTabla } from '@/hooks/useDatos';
import { DIAS, ESTADOS_DOCENTE, etiqueta, TIPOS_NOVEDAD, TIPOS_SEGUIMIENTO, VINCULACIONES } from '@/lib/catalogos';
import { descargarCSV, diasEntre, duracionHoras, nombreDocente, nombreGrupo, porId } from '@/lib/utils';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function BarrasH({ datos, unidad = '' }: { datos: { etiqueta: string; valor: number; color?: string }[]; unidad?: string }) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  if (!datos.length) return <p className="text-sm text-muted">Sin datos.</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {datos.map((d) => (
        <li key={d.etiqueta}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <span className="truncate">{d.etiqueta}</span>
            <span className="font-semibold tabular-nums">
              {d.valor.toLocaleString('es-CO')}
              {unidad}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-3">
            <div className="h-full rounded-full" style={{ width: `${(d.valor / max) * 100}%`, background: d.color ?? 'var(--brand)' }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Reportes() {
  const { data: docentes = [] } = useTabla('docentes');
  const { data: areas = [] } = useTabla('areas');
  const { data: novedades = [] } = useTabla('novedades');
  const { data: grupos = [] } = useTabla('grupos');
  const { data: grados = [] } = useTabla('grados');
  const { data: asignaciones = [] } = useTabla('asignaciones');
  const { data: asignaturas = [] } = useTabla('asignaturas');
  const { data: horarios = [] } = useTabla('horarios');
  const { data: seguimientos = [] } = useTabla('seguimientos');
  const { data: sedes = [] } = useTabla('sedes');
  const anioActual = new Date().getFullYear();
  const [anio, setAnio] = useState(anioActual);

  const docs = porId(docentes);
  const grs = porId(grupos);
  const asg = porId(asignaturas);
  const ars = porId(areas);
  const vigentes = docentes.filter((d) => d.estado !== 'retirado');

  const conteo = <T,>(lista: T[], clave: (x: T) => string) => {
    const m = new Map<string, number>();
    for (const x of lista) m.set(clave(x), (m.get(clave(x)) ?? 0) + 1);
    return [...m.entries()].map(([etiqueta, valor]) => ({ etiqueta, valor })).sort((a, b) => b.valor - a.valor);
  };

  const aprobadas = novedades.filter((n) => n.estado === 'aprobada' && n.fecha_inicio.startsWith(String(anio)));
  const porMes = useMemo(() => {
    const m = Array(12).fill(0) as number[];
    for (const n of aprobadas) m[Number(n.fecha_inicio.slice(5, 7)) - 1] += n.horas ? 1 : diasEntre(n.fecha_inicio, n.fecha_fin);
    return m;
  }, [aprobadas]);
  const maxMes = Math.max(1, ...porMes);
  const topAusencias = conteo(aprobadas, (n) => n.docente_id)
    .slice(0, 6)
    .map((x) => ({ ...x, etiqueta: nombreDocente(docs.get(x.etiqueta)) }));

  const ocupacion = [...grupos]
    .sort((a, b) => b.estudiantes / (b.capacidad || 1) - a.estudiantes / (a.capacidad || 1))
    .slice(0, 8)
    .map((g) => ({
      etiqueta: nombreGrupo(g, grados),
      valor: g.capacidad ? Math.round((g.estudiantes / g.capacidad) * 100) : 0,
      color: g.estudiantes > g.capacidad ? 'var(--danger)' : undefined,
    }));

  const anios = [...new Set([anioActual, ...novedades.map((n) => Number(n.fecha_inicio.slice(0, 4)))])].sort((a, b) => b - a);

  const exportaciones: { titulo: string; texto: string; accion: () => void }[] = [
    {
      titulo: 'Directorio docente',
      texto: `${docentes.length} registros`,
      accion: () =>
        descargarCSV(
          'directorio-docente',
          ['Documento', 'Nombres', 'Apellidos', 'Correo', 'Teléfono', 'Área', 'Sede', 'Cargo', 'Vinculación', 'Escalafón', 'Estado', 'Fecha de ingreso'],
          docentes.map((d) => [d.documento, d.nombres, d.apellidos, d.email, d.telefono, ars.get(d.area_id ?? '')?.nombre, sedes.find((s) => s.id === d.sede_id)?.nombre, d.cargo, etiqueta(VINCULACIONES, d.vinculacion), d.escalafon, etiqueta(ESTADOS_DOCENTE, d.estado), d.fecha_ingreso]),
        ),
    },
    {
      titulo: `Novedades ${anio}`,
      texto: `${novedades.filter((n) => n.fecha_inicio.startsWith(String(anio))).length} registros`,
      accion: () =>
        descargarCSV(
          `novedades-${anio}`,
          ['Docente', 'Tipo', 'Desde', 'Hasta', 'Días', 'Horas', 'Estado', 'Reemplazo', 'Motivo'],
          novedades
            .filter((n) => n.fecha_inicio.startsWith(String(anio)))
            .map((n) => [nombreDocente(docs.get(n.docente_id)), etiqueta(TIPOS_NOVEDAD, n.tipo), n.fecha_inicio, n.fecha_fin, diasEntre(n.fecha_inicio, n.fecha_fin), n.horas, n.estado, n.reemplazo_id ? nombreDocente(docs.get(n.reemplazo_id)) : '', n.motivo]),
        ),
    },
    {
      titulo: 'Asignación académica',
      texto: `${asignaciones.length} asignaciones`,
      accion: () =>
        descargarCSV(
          'asignacion-academica',
          ['Docente', 'Grupo', 'Asignatura', 'Área', 'Horas semanales'],
          asignaciones.map((a) => [nombreDocente(docs.get(a.docente_id)), nombreGrupo(grs.get(a.grupo_id), grados), asg.get(a.asignatura_id)?.nombre, ars.get(asg.get(a.asignatura_id)?.area_id ?? '')?.nombre, a.horas_semanales]),
        ),
    },
    {
      titulo: 'Horario institucional',
      texto: `${horarios.length} clases`,
      accion: () =>
        descargarCSV(
          'horario-institucional',
          ['Grupo', 'Día', 'Inicio', 'Fin', 'Asignatura', 'Docente', 'Aula'],
          [...horarios]
            .sort((a, b) => a.grupo_id.localeCompare(b.grupo_id) || a.dia - b.dia || a.hora_inicio.localeCompare(b.hora_inicio))
            .map((h) => [nombreGrupo(grs.get(h.grupo_id), grados), DIAS[h.dia - 1]?.largo, h.hora_inicio, h.hora_fin, asg.get(h.asignatura_id)?.nombre, nombreDocente(docs.get(h.docente_id ?? '')), h.aula]),
        ),
    },
    {
      titulo: 'Seguimiento pedagógico',
      texto: `${seguimientos.length} registros`,
      accion: () =>
        descargarCSV(
          'seguimiento-pedagogico',
          ['Docente', 'Fecha', 'Tipo', 'Promedio', 'Fortalezas', 'Oportunidades', 'Compromisos', 'Estado', 'Observador'],
          seguimientos.map((s) => [
            nombreDocente(docs.get(s.docente_id)),
            s.fecha,
            etiqueta(TIPOS_SEGUIMIENTO, s.tipo),
            s.criterios.length ? (s.criterios.reduce((a, c) => a + c.valor, 0) / s.criterios.length).toFixed(2) : '',
            s.fortalezas,
            s.oportunidades,
            s.compromisos,
            s.estado,
            s.observador,
          ]),
        ),
    },
    {
      titulo: 'Grupos y matrícula',
      texto: `${grupos.length} grupos`,
      accion: () =>
        descargarCSV(
          'grupos',
          ['Grado', 'Grupo', 'Jornada', 'Director', 'Estudiantes', 'Capacidad', 'Horas en horario'],
          grupos.map((g) => [
            grados.find((x) => x.id === g.grado_id)?.nombre,
            g.nombre,
            g.jornada,
            nombreDocente(docs.get(g.director_id ?? '')),
            g.estudiantes,
            g.capacidad,
            horarios.filter((h) => h.grupo_id === g.id).reduce((s, h) => s + duracionHoras(h.hora_inicio, h.hora_fin), 0).toFixed(1),
          ]),
        ),
    },
  ];

  return (
    <>
      <Encabezado
        titulo="Reportes"
        descripcion="Indicadores de gestión y exportaciones listas para Excel."
        acciones={
          <>
            <Selector value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="w-28" aria-label="Año">
              {anios.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Selector>
            <Boton variante="secundario" icono={<Printer className="size-4" />} onClick={() => window.print()}>
              Imprimir
            </Boton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Tarjeta titulo={`Días de ausencia por mes · ${anio}`} className="lg:col-span-2">
          <div className="flex h-48 items-end gap-1.5 sm:gap-3" role="img" aria-label="Gráfico de días de ausencia por mes">
            {porMes.map((v, i) => (
              <div key={MESES[i]} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-xs font-semibold tabular-nums">{v || ''}</span>
                <div className="w-full max-w-10 rounded-t-lg bg-brand transition-all" style={{ height: `${(v / maxMes) * 100}%`, minHeight: v ? 4 : 0 }} />
                <span className="text-[11px] text-muted">{MESES[i]}</span>
              </div>
            ))}
          </div>
        </Tarjeta>
        <Tarjeta titulo="Novedades aprobadas por tipo">
          <BarrasH datos={conteo(aprobadas, (n) => etiqueta(TIPOS_NOVEDAD, n.tipo))} />
        </Tarjeta>
        <Tarjeta titulo="Docentes por vinculación">
          <BarrasH datos={conteo(vigentes, (d) => etiqueta(VINCULACIONES, d.vinculacion))} />
        </Tarjeta>
        <Tarjeta titulo="Docentes por área">
          <BarrasH datos={conteo(vigentes, (d) => ars.get(d.area_id ?? '')?.nombre ?? 'Sin área').map((x) => ({ ...x, color: areas.find((a) => a.nombre === x.etiqueta)?.color }))} />
        </Tarjeta>
        <Tarjeta titulo="Docentes con más novedades">
          <BarrasH datos={topAusencias} />
        </Tarjeta>
        <Tarjeta titulo="Ocupación de grupos" className="lg:col-span-2 xl:col-span-1">
          <BarrasH datos={ocupacion} unidad="%" />
        </Tarjeta>
        <Tarjeta titulo="Estado del personal" className="xl:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ESTADOS_DOCENTE.map((e) => (
              <div key={e.valor} className="rounded-xl bg-surface-2 p-4">
                <p className="font-display text-3xl font-semibold tabular-nums">{docentes.filter((d) => d.estado === e.valor).length}</p>
                <p className="text-sm text-muted">{e.etiqueta}</p>
              </div>
            ))}
          </div>
        </Tarjeta>
      </div>

      <h2 className="mt-10 mb-4 text-xl font-semibold">Exportar datos</h2>
      <div className="no-print grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {exportaciones.map((x) => (
          <button key={x.titulo} onClick={x.accion} className="card group flex items-center gap-4 p-4 text-left transition hover:shadow-pop">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-soft-ink">
              <Download className="size-[18px]" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{x.titulo}</span>
              <span className="block text-xs text-muted">{x.texto} · CSV para Excel</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
