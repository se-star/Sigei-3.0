import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FilePlus2, FilePen, FileX2, History } from 'lucide-react';
import { Cargando, Encabezado, Selector, Vacio } from '@/components/ui';
import { Buscador } from '@/components/ui/Buscador';
import { backend } from '@/lib/backend';
import type { Actividad as TAct } from '@/lib/types';
import { coincide, cx, fechaDia, fechaHora, hace } from '@/lib/utils';

const TABLAS: Record<string, string> = {
  docentes: 'Docentes',
  grados: 'Grados',
  grupos: 'Grupos',
  asignaciones: 'Asignación académica',
  horarios: 'Horarios',
  novedades: 'Novedades',
  seguimientos: 'Seguimiento',
  eventos: 'Calendario',
  comunicados: 'Comunicados',
  tareas: 'Tareas',
  sedes: 'Sedes',
  areas: 'Áreas',
  asignaturas: 'Asignaturas',
  ajustes: 'Configuración',
  perfiles: 'Usuarios',
};

const ACCION = {
  crear: { icono: FilePlus2, texto: 'creó', clase: 'bg-ok-soft text-ok' },
  editar: { icono: FilePen, texto: 'modificó', clase: 'bg-info-soft text-info' },
  eliminar: { icono: FileX2, texto: 'eliminó', clase: 'bg-danger-soft text-danger' },
} as const;

export default function Actividad() {
  const { data, isLoading } = useQuery({ queryKey: ['actividad'], queryFn: () => backend.datos.actividad(500) });
  const [q, setQ] = useState('');
  const [tabla, setTabla] = useState('');
  const lista = (data ?? []).filter((a) => (!tabla || a.tabla === tabla) && coincide(q, a.usuario, a.resumen, TABLAS[a.tabla]));

  const porDia = lista.reduce<Record<string, TAct[]>>((acc, a) => {
    const d = a.created_at.slice(0, 10);
    (acc[d] ??= []).push(a);
    return acc;
  }, {});

  return (
    <>
      <Encabezado titulo="Registro de actividad" descripcion="Historial de cambios realizados en SIGEI: quién, qué y cuándo." />
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <Buscador valor={q} onCambio={setQ} placeholder="Buscar por usuario o registro" className="sm:w-80" />
        <Selector value={tabla} onChange={(e) => setTabla(e.target.value)} className="sm:w-56" aria-label="Módulo">
          <option value="">Todos los módulos</option>
          {Object.entries(TABLAS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Selector>
      </div>
      {isLoading ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <div className="card">
          <Vacio icono={<History className="size-6" />} titulo="Sin actividad registrada" texto="Los cambios que se hagan en el sistema aparecerán aquí." />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(porDia).map(([dia, items]) => (
            <section key={dia}>
              <h2 className="mb-2 text-sm font-semibold text-muted">{fechaDia(dia)}</h2>
              <ul className="card divide-y divide-line">
                {items.map((a) => {
                  const ac = ACCION[a.accion] ?? ACCION.editar;
                  return (
                    <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                      <span className={cx('grid size-8 shrink-0 place-items-center rounded-lg', ac.clase)}>
                        <ac.icono className="size-4" />
                      </span>
                      <p className="min-w-0 flex-1 text-sm">
                        <strong className="font-semibold">{a.usuario}</strong> {ac.texto} <span className="text-muted">en {TABLAS[a.tabla] ?? a.tabla}:</span>{' '}
                        <span className="font-medium">{a.resumen || a.registro_id}</span>
                      </p>
                      <time className="shrink-0 text-xs text-muted" title={fechaHora(a.created_at)} dateTime={a.created_at}>
                        {hace(a.created_at)}
                      </time>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
