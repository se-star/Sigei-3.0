import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, LayoutGrid, List, Mail, Phone, Plus, UsersRound } from 'lucide-react';
import { Avatar, Boton, Cargando, Encabezado, Insignia, Progreso, Selector, Vacio } from '@/components/ui';
import { Buscador } from '@/components/ui/Buscador';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { FormDocente } from '@/components/formularios/FormDocente';
import { useAuth } from '@/hooks/useAuth';
import { useMiembros, useTabla } from '@/hooks/useDatos';
import { ESTADOS_DOCENTE, etiqueta, tono, VINCULACIONES } from '@/lib/catalogos';
import type { Docente } from '@/lib/types';
import { coincide, cx, descargarCSV, nombreDocente, porId } from '@/lib/utils';

export default function Docentes() {
  const { editar } = useAuth();
  const nav = useNavigate();
  const { data: docentes, isLoading } = useTabla('docentes');
  const { data: areas = [] } = useTabla('areas');
  const { data: sedes = [] } = useTabla('sedes');
  const { data: asignaciones = [] } = useTabla('asignaciones');
  const { data: miembros = [] } = useMiembros();
  const conAcceso = new Set(miembros.filter((m) => m.activo && m.docente_id).map((m) => m.docente_id));
  const porActivar = new Set(miembros.filter((m) => !m.activo && m.docente_id).map((m) => m.docente_id));
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('activo');
  const [area, setArea] = useState('');
  const [sede, setSede] = useState('');
  const [vista, setVista] = useState<'tabla' | 'tarjetas'>(() => (localStorage.getItem('sigei.vista.docentes') as 'tabla') || 'tabla');
  const [form, setForm] = useState(false);

  const areasMap = porId(areas);
  const sedesMap = porId(sedes);
  const carga = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of asignaciones) m.set(a.docente_id, (m.get(a.docente_id) ?? 0) + a.horas_semanales);
    return m;
  }, [asignaciones]);

  const filtrados = (docentes ?? [])
    .filter(
      (d) =>
        (!estado || d.estado === estado) &&
        (!area || d.area_id === area) &&
        (!sede || d.sede_id === sede) &&
        coincide(q, d.nombres, d.apellidos, d.documento, d.email, d.cargo),
    )
    .sort((a, b) => a.apellidos.localeCompare(b.apellidos, 'es'));

  const cambiarVista = (v: typeof vista) => {
    setVista(v);
    try {
      localStorage.setItem('sigei.vista.docentes', v);
    } catch {
      /* sin almacenamiento */
    }
  };

  const exportar = () =>
    descargarCSV(
      'docentes',
      ['Documento', 'Nombres', 'Apellidos', 'Correo', 'Teléfono', 'Área', 'Sede', 'Cargo', 'Vinculación', 'Escalafón', 'Estado', 'Horas asignadas'],
      filtrados.map((d) => [
        d.documento,
        d.nombres,
        d.apellidos,
        d.email,
        d.telefono,
        areasMap.get(d.area_id ?? '')?.nombre,
        sedesMap.get(d.sede_id ?? '')?.nombre,
        d.cargo,
        etiqueta(VINCULACIONES, d.vinculacion),
        d.escalafon,
        etiqueta(ESTADOS_DOCENTE, d.estado),
        carga.get(d.id) ?? 0,
      ]),
    );

  const columnas: Columna<Docente>[] = [
    {
      id: 'nombre',
      titulo: 'Docente',
      orden: (d) => d.apellidos,
      celda: (d) => (
        <div className="flex items-center gap-3">
          <Avatar nombre={nombreDocente(d)} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{nombreDocente(d)}</p>
            <p className="truncate text-xs text-muted">{d.email || d.documento}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'area',
      titulo: 'Área',
      ocultarMovil: true,
      orden: (d) => areasMap.get(d.area_id ?? '')?.nombre ?? '',
      celda: (d) => {
        const a = areasMap.get(d.area_id ?? '');
        return a ? (
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: a.color }} />
            {a.nombre}
          </span>
        ) : (
          <span className="text-muted">—</span>
        );
      },
    },
    {
      id: 'vinc',
      titulo: 'Vinculación',
      ocultarMovil: true,
      orden: (d) => d.vinculacion,
      celda: (d) => <span className="text-ink-2">{etiqueta(VINCULACIONES, d.vinculacion)}</span>,
    },
    {
      id: 'carga',
      titulo: 'Carga',
      ocultarMovil: true,
      orden: (d) => carga.get(d.id) ?? 0,
      celda: (d) => {
        const h = carga.get(d.id) ?? 0;
        return (
          <div className="w-32">
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-semibold tabular-nums">{h} h</span>
              <span className="text-muted">de {d.carga_maxima}</span>
            </div>
            <Progreso valor={h} max={d.carga_maxima} />
          </div>
        );
      },
    },
    {
      id: 'acceso',
      titulo: 'Acceso a SIGEI',
      ocultarMovil: true,
      orden: (d) => (porActivar.has(d.id) ? 0 : conAcceso.has(d.id) ? 1 : d.email ? 2 : 3),
      celda: (d) =>
        conAcceso.has(d.id) ? (
          <Insignia tono="ok">Con acceso</Insignia>
        ) : porActivar.has(d.id) ? (
          <span title="Creó su cuenta; actívela en Usuarios y roles.">
            <Insignia tono="info">Por activar</Insignia>
          </span>
        ) : d.email ? (
          <span className="text-xs text-muted" title="Aún no ha creado su cuenta en SIGEI.">
            Sin cuenta
          </span>
        ) : (
          <span title="Sin correo no puede quedar vinculado a su cuenta.">
            <Insignia tono="warn">Falta correo</Insignia>
          </span>
        ),
    },
    {
      id: 'estado',
      titulo: 'Estado',
      orden: (d) => d.estado,
      celda: (d) => (
        <Insignia tono={tono(ESTADOS_DOCENTE, d.estado)} punto>
          {etiqueta(ESTADOS_DOCENTE, d.estado)}
        </Insignia>
      ),
    },
  ];

  return (
    <>
      <Encabezado
        titulo="Docentes"
        descripcion="Directorio del equipo docente, con su vinculación y carga académica."
        acciones={
          <>
            <Boton variante="secundario" icono={<Download className="size-4" />} onClick={exportar} disabled={!filtrados.length}>
              Exportar
            </Boton>
            {editar('docentes') && (
              <Boton icono={<Plus className="size-4" />} onClick={() => setForm(true)}>
                Nuevo docente
              </Boton>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Buscador valor={q} onCambio={setQ} placeholder="Buscar por nombre, documento o correo" className="lg:max-w-sm lg:flex-1" />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Selector value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado" className="sm:w-40">
            <option value="">Todos los estados</option>
            {ESTADOS_DOCENTE.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </Selector>
          <Selector value={area} onChange={(e) => setArea(e.target.value)} aria-label="Filtrar por área" className="sm:w-48">
            <option value="">Todas las áreas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </Selector>
          {sedes.length > 1 && (
            <Selector value={sede} onChange={(e) => setSede(e.target.value)} aria-label="Filtrar por sede" className="col-span-2 sm:w-44">
              <option value="">Todas las sedes</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Selector>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-1 lg:ml-auto">
          {(
            [
              ['tabla', List, 'Ver como tabla'],
              ['tarjetas', LayoutGrid, 'Ver como tarjetas'],
            ] as const
          ).map(([v, I, t]) => (
            <button
              key={v}
              onClick={() => cambiarVista(v)}
              title={t}
              aria-label={t}
              aria-pressed={vista === v}
              className={cx('grid size-8 place-items-center rounded-lg', vista === v ? 'bg-surface text-ink shadow-sm' : 'text-muted')}
            >
              <I className="size-4" />
            </button>
          ))}
        </div>
      </div>

      <p className="mb-3 text-sm text-muted">
        {filtrados.length} {filtrados.length === 1 ? 'docente' : 'docentes'}
      </p>

      {isLoading ? (
        <Cargando />
      ) : filtrados.length === 0 ? (
        <div className="card">
          <Vacio
            icono={<UsersRound className="size-6" />}
            titulo={docentes?.length ? 'Ningún docente coincide' : 'Aún no hay docentes'}
            texto={docentes?.length ? 'Pruebe con otra búsqueda o quite los filtros.' : 'Registre el primer docente para empezar.'}
            accion={
              docentes?.length ? (
                <Boton variante="secundario" onClick={() => (setQ(''), setEstado(''), setArea(''), setSede(''))}>
                  Quitar filtros
                </Boton>
              ) : (
                editar('docentes') && <Boton onClick={() => setForm(true)}>Nuevo docente</Boton>
              )
            }
          />
        </div>
      ) : vista === 'tabla' ? (
        <div className="card overflow-hidden">
          <Tabla filas={filtrados} columnas={columnas} onFila={(d) => nav(`/docentes/${d.id}`)} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((d) => {
            const a = areasMap.get(d.area_id ?? '');
            const h = carga.get(d.id) ?? 0;
            return (
              <button
                key={d.id}
                onClick={() => nav(`/docentes/${d.id}`)}
                className="card group flex flex-col gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-pop"
              >
                <div className="flex items-start gap-3">
                  <Avatar nombre={nombreDocente(d)} tam={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-semibold">{nombreDocente(d)}</p>
                    <p className="truncate text-sm text-muted">{d.cargo}</p>
                  </div>
                  <Insignia tono={tono(ESTADOS_DOCENTE, d.estado)} punto>
                    {etiqueta(ESTADOS_DOCENTE, d.estado)}
                  </Insignia>
                </div>
                <div className="flex flex-col gap-1.5 text-sm text-ink-2">
                  {a && (
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: a.color }} />
                      {a.nombre}
                    </span>
                  )}
                  {d.email && (
                    <span className="flex items-center gap-2 truncate">
                      <Mail className="size-3.5 text-muted" />
                      {d.email}
                    </span>
                  )}
                  {d.telefono && (
                    <span className="flex items-center gap-2">
                      <Phone className="size-3.5 text-muted" />
                      {d.telefono}
                    </span>
                  )}
                </div>
                <div className="mt-auto">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted">Carga semanal</span>
                    <span className="font-semibold tabular-nums">
                      {h} / {d.carga_maxima} h
                    </span>
                  </div>
                  <Progreso valor={h} max={d.carga_maxima} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <FormDocente abierto={form} onCerrar={() => setForm(false)} onGuardado={(d) => nav(`/docentes/${d.id}`)} />
    </>
  );
}
