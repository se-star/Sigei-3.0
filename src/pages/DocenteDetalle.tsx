import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, Briefcase, Cake, Mail, MapPin, Pencil, Phone, Trash2 } from 'lucide-react';
import { Avatar, Boton, Cargando, Insignia, Progreso, Segmentos, Tarjeta, Vacio } from '@/components/ui';
import { FormDocente } from '@/components/formularios/FormDocente';
import { HorarioSemanal } from '@/components/HorarioSemanal';
import { useAuth } from '@/hooks/useAuth';
import { useAjustes, useMutar, useTabla } from '@/hooks/useDatos';
import { useConfirmar } from '@/hooks/useConfirmar';
import { useToast } from '@/hooks/useToast';
import {
  ESTADOS_DOCENTE,
  ESTADOS_NOVEDAD,
  etiqueta,
  tono,
  TIPOS_NOVEDAD,
  TIPOS_SEGUIMIENTO,
  VINCULACIONES,
} from '@/lib/catalogos';
import { edad, fechaCorta, fechaLarga, nombreDocente, nombreGrupo, porId, diasEntre } from '@/lib/utils';

type Pestana = 'perfil' | 'carga' | 'horario' | 'novedades' | 'seguimiento';

export default function DocenteDetalle() {
  const { id } = useParams();
  const nav = useNavigate();
  const { editar } = useAuth();
  const ajustes = useAjustes();
  const confirmar = useConfirmar();
  const toast = useToast();
  const { data: docentes, isLoading } = useTabla('docentes');
  const { data: areas = [] } = useTabla('areas');
  const { data: sedes = [] } = useTabla('sedes');
  const { data: asignaciones = [] } = useTabla('asignaciones');
  const { data: asignaturas = [] } = useTabla('asignaturas');
  const { data: grupos = [] } = useTabla('grupos');
  const { data: grados = [] } = useTabla('grados');
  const { data: horarios = [] } = useTabla('horarios');
  const { data: novedades = [] } = useTabla('novedades');
  const { data: seguimientos = [] } = useTabla('seguimientos');
  const { eliminar } = useMutar('docentes');
  const [pestana, setPestana] = useState<Pestana>('perfil');
  const [form, setForm] = useState(false);

  if (isLoading) return <Cargando />;
  const d = docentes?.find((x) => x.id === id);
  if (!d)
    return (
      <Vacio
        titulo="Docente no encontrado"
        texto="Puede que haya sido eliminado."
        accion={
          <Link to="/docentes">
            <Boton variante="secundario">Volver a docentes</Boton>
          </Link>
        }
      />
    );

  const area = areas.find((a) => a.id === d.area_id);
  const sede = sedes.find((s) => s.id === d.sede_id);
  const asg = porId(asignaturas);
  const grs = porId(grupos);
  const misAsig = asignaciones.filter((a) => a.docente_id === d.id);
  const horas = misAsig.reduce((s, a) => s + a.horas_semanales, 0);
  const misBloques = horarios.filter((h) => h.docente_id === d.id);
  const misNov = novedades.filter((n) => n.docente_id === d.id).sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
  const misSeg = seguimientos.filter((s) => s.docente_id === d.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const direcciones = grupos.filter((g) => g.director_id === d.id);

  const borrar = async () => {
    const vinculos = misAsig.length + misBloques.length;
    const ok = await confirmar({
      titulo: 'Eliminar docente',
      texto: vinculos
        ? `${nombreDocente(d)} tiene ${misAsig.length} asignaciones y ${misBloques.length} clases en el horario. Se recomienda cambiar su estado a "Retirado" en lugar de eliminarlo. ¿Eliminar de todas formas?`
        : `Se eliminará a ${nombreDocente(d)} del directorio. Esta acción no se puede deshacer.`,
      confirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await eliminar.mutateAsync(d.id);
      toast.ok('Docente eliminado.');
      nav('/docentes');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <Link to="/docentes" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Docentes
      </Link>

      <div className="card mb-6 flex flex-col gap-5 p-6 md:flex-row md:items-center">
        <Avatar nombre={nombreDocente(d)} tam={72} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold sm:text-3xl">{nombreDocente(d)}</h1>
            <Insignia tono={tono(ESTADOS_DOCENTE, d.estado)} punto>
              {etiqueta(ESTADOS_DOCENTE, d.estado)}
            </Insignia>
          </div>
          <p className="mt-1 text-muted">
            {d.cargo}
            {area && ` · ${area.nombre}`}
            {sede && ` · ${sede.nombre}`}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-2">
            {d.email && (
              <a href={`mailto:${d.email}`} className="flex items-center gap-1.5 hover:text-brand">
                <Mail className="size-4 text-muted" />
                {d.email}
              </a>
            )}
            {d.telefono && (
              <a href={`tel:${d.telefono.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-brand">
                <Phone className="size-4 text-muted" />
                {d.telefono}
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/novedades?nueva=1&docente=${d.id}`}>
            <Boton variante="secundario" icono={<Bell className="size-4" />}>
              Registrar novedad
            </Boton>
          </Link>
          {editar('docentes') && (
            <>
              <Boton variante="secundario" icono={<Pencil className="size-4" />} onClick={() => setForm(true)}>
                Editar
              </Boton>
              <Boton variante="fantasma" tam="icono" onClick={borrar} aria-label="Eliminar docente" className="text-danger hover:bg-danger-soft">
                <Trash2 className="size-4" />
              </Boton>
            </>
          )}
        </div>
      </div>

      <Segmentos<Pestana>
        className="mb-5"
        valor={pestana}
        onCambio={setPestana}
        opciones={[
          { valor: 'perfil', etiqueta: 'Hoja de vida' },
          { valor: 'carga', etiqueta: 'Carga académica', cuenta: misAsig.length },
          { valor: 'horario', etiqueta: 'Horario', cuenta: misBloques.length },
          { valor: 'novedades', etiqueta: 'Novedades', cuenta: misNov.length },
          { valor: 'seguimiento', etiqueta: 'Seguimiento', cuenta: misSeg.length },
        ]}
      />

      {pestana === 'perfil' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Tarjeta titulo="Datos personales" className="lg:col-span-2">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Dato etiqueta="Documento" valor={d.documento} />
              <Dato etiqueta="Género" valor={{ F: 'Femenino', M: 'Masculino', O: 'Otro', '': 'Sin especificar' }[d.genero]} />
              <Dato
                etiqueta="Fecha de nacimiento"
                valor={d.fecha_nacimiento ? `${fechaLarga(d.fecha_nacimiento)} (${edad(d.fecha_nacimiento)} años)` : '—'}
                icono={<Cake className="size-4" />}
              />
              <Dato etiqueta="Teléfono" valor={d.telefono || '—'} />
              <Dato etiqueta="Correo" valor={d.email || '—'} />
              <Dato etiqueta="Sede" valor={sede?.nombre ?? '—'} icono={<MapPin className="size-4" />} />
            </dl>
            {d.notas && (
              <div className="mt-5 rounded-xl bg-surface-2 p-4 text-sm">
                <p className="mb-1 font-semibold">Notas internas</p>
                <p className="whitespace-pre-line text-ink-2">{d.notas}</p>
              </div>
            )}
          </Tarjeta>
          <Tarjeta titulo="Vinculación" icono={<Briefcase className="size-4" />}>
            <dl className="flex flex-col gap-4">
              <Dato etiqueta="Tipo" valor={etiqueta(VINCULACIONES, d.vinculacion)} />
              <Dato etiqueta="Escalafón" valor={d.escalafon || '—'} />
              <Dato etiqueta="Fecha de ingreso" valor={fechaLarga(d.fecha_ingreso)} />
              <div>
                <dt className="mb-1.5 text-xs font-semibold text-muted">Carga semanal</dt>
                <dd>
                  <p className="mb-1.5 text-sm font-semibold tabular-nums">
                    {horas} de {d.carga_maxima} horas
                  </p>
                  <Progreso valor={horas} max={d.carga_maxima} />
                </dd>
              </div>
              {direcciones.length > 0 && <Dato etiqueta="Director de grupo" valor={direcciones.map((g) => g.nombre).join(', ')} />}
            </dl>
          </Tarjeta>
        </div>
      )}

      {pestana === 'carga' && (
        <Tarjeta sinRelleno>
          {misAsig.length === 0 ? (
            <Vacio titulo="Sin asignación académica" texto="Este docente no tiene asignaturas asignadas." />
          ) : (
            <ul className="divide-y divide-line">
              {misAsig.map((a) => {
                const s = asg.get(a.asignatura_id);
                const ar = areas.find((x) => x.id === s?.area_id);
                return (
                  <li key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="size-2.5 rounded-full" style={{ background: ar?.color ?? 'var(--line-strong)' }} />
                    <span className="flex-1 font-semibold">{s?.nombre}</span>
                    <span className="text-sm text-muted">{nombreGrupo(grs.get(a.grupo_id), grados)}</span>
                    <span className="w-14 text-right font-semibold tabular-nums">{a.horas_semanales} h</span>
                  </li>
                );
              })}
              <li className="flex items-center justify-between bg-surface-2/60 px-5 py-3 text-sm font-semibold">
                <span>Total semanal</span>
                <span className="tabular-nums">{horas} h</span>
              </li>
            </ul>
          )}
        </Tarjeta>
      )}

      {pestana === 'horario' && (
        <Tarjeta>
          {misBloques.length === 0 ? (
            <Vacio titulo="Sin clases en el horario" texto="Las clases aparecerán aquí cuando se programen en Horarios." />
          ) : (
            <HorarioSemanal
              bloques={misBloques}
              franjas={ajustes.franjas}
              color={(b) => areas.find((x) => x.id === asg.get(b.asignatura_id)?.area_id)?.color}
              render={(b) => (
                <>
                  <span className="truncate text-[13px] leading-tight font-semibold">{asg.get(b.asignatura_id)?.nombre}</span>
                  <span className="truncate text-xs text-muted">{grs.get(b.grupo_id)?.nombre}</span>
                </>
              )}
            />
          )}
        </Tarjeta>
      )}

      {pestana === 'novedades' && (
        <Tarjeta sinRelleno>
          {misNov.length === 0 ? (
            <Vacio titulo="Sin novedades" texto="No hay permisos ni ausencias registradas." />
          ) : (
            <ul className="divide-y divide-line">
              {misNov.map((n) => (
                <li key={n.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{etiqueta(TIPOS_NOVEDAD, n.tipo)}</p>
                    <p className="text-sm text-muted">
                      {fechaCorta(n.fecha_inicio)}
                      {n.fecha_fin !== n.fecha_inicio && ` – ${fechaCorta(n.fecha_fin)}`} ·{' '}
                      {n.horas ? `${n.horas} h` : `${diasEntre(n.fecha_inicio, n.fecha_fin)} d`}
                    </p>
                  </div>
                  <Insignia tono={tono(ESTADOS_NOVEDAD, n.estado)}>{etiqueta(ESTADOS_NOVEDAD, n.estado)}</Insignia>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      )}

      {pestana === 'seguimiento' && (
        <Tarjeta sinRelleno>
          {misSeg.length === 0 ? (
            <Vacio titulo="Sin seguimientos" texto="No hay registros de acompañamiento pedagógico." />
          ) : (
            <ul className="divide-y divide-line">
              {misSeg.map((s) => {
                const prom = s.criterios.length ? s.criterios.reduce((a, c) => a + c.valor, 0) / s.criterios.length : 0;
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{etiqueta(TIPOS_SEGUIMIENTO, s.tipo)}</p>
                      <p className="text-sm text-muted">
                        {fechaCorta(s.fecha)} · {s.observador}
                      </p>
                    </div>
                    <span className="font-display text-lg font-semibold tabular-nums">{prom.toFixed(1)}</span>
                    <span className="text-xs text-muted">/ 4</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>
      )}

      <FormDocente abierto={form} onCerrar={() => setForm(false)} docente={d} />
    </>
  );
}

function Dato({ etiqueta, valor, icono }: { etiqueta: string; valor: string; icono?: React.ReactNode }) {
  return (
    <div>
      <dt className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
        {icono}
        {etiqueta}
      </dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );
}
