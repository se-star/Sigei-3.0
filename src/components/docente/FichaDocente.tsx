import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Briefcase,
  CalendarClock,
  Cake,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileBadge,
  Clock3,
  KeyRound,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Printer,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { Avatar, Boton, Cargando, Insignia, Progreso, Segmentos, Tarjeta, Vacio } from '@/components/ui';
import { useAvisosPermiso } from '@/hooks/useAvisosPermiso';
import { soportePendiente } from '@/lib/certificadoPermiso';
import { FormDocente } from '@/components/formularios/FormDocente';
import { HorarioSemanal } from '@/components/HorarioSemanal';
import { ListaSoportes } from '@/components/Soportes';
import { RevisionNovedad, type DecisionNovedad } from '@/components/RevisionNovedad';
import { TarjetaContacto, TarjetaDocumentos, TarjetaExperiencia, TarjetaFormacion } from '@/components/docente/HojaDeVida';
import { Logo, Wordmark } from '@/components/layout/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useAjustes, useMiembros, useMutar, useMutarMiembros, useTabla } from '@/hooks/useDatos';
import { useConfirmar } from '@/hooks/useConfirmar';
import { useToast } from '@/hooks/useToast';
import { accesoDocenteActivo } from '@/lib/backend';
import { puedeAprobar } from '@/lib/permisos';
import { DIAS, ESTADOS_DOCENTE, ESTADOS_NOVEDAD, etiqueta, tono, TIPOS_NOVEDAD, TIPOS_SEGUIMIENTO, VINCULACIONES } from '@/lib/catalogos';
import type { Asignacion, Asignatura, BloqueHorario, Docente, Grado, Grupo, Miembro, Novedad, Seguimiento } from '@/lib/types';
import {
  ausentesEn,
  cx,
  diasEntre,
  duracionHoras,
  edad,
  fechaCorta,
  fechaLarga,
  horaBonita,
  hoyISO,
  nombreDocente,
  nombreGrupo,
  porId,
} from '@/lib/utils';

export type Pestana = 'resumen' | 'hoja' | 'carga' | 'horario' | 'novedades' | 'seguimiento' | 'cuenta';
type Impresion = 'ficha' | 'horario' | null;

const promedio = (s: Seguimiento) => (s.criterios.length ? s.criterios.reduce((a, c) => a + c.valor, 0) / s.criterios.length : 0);
const tonoPromedio = (p: number) => (p >= 3.5 ? 'ok' : p >= 2.5 ? 'info' : p >= 1.75 ? 'warn' : 'danger');

/**
 * Ficha del docente. La ven los directivos (con acciones de gestión) y el propio
 * docente en «Mi perfil» (`propio`): ahí llena su hoja de vida y no ve acciones
 * de gestión, notas internas ni evaluaciones en borrador.
 */
export function FichaDocente({
  id,
  propio = false,
  cuenta,
  pestanaInicial = 'resumen',
}: {
  id: string | undefined;
  propio?: boolean;
  /** Contenido de la pestaña «Mi cuenta» (solo en la vista propia). */
  cuenta?: ReactNode;
  pestanaInicial?: Pestana;
}) {
  const nav = useNavigate();
  const { editar, perfil } = useAuth();
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
  const { data: miembros = [] } = useMiembros();
  const { eliminar } = useMutar('docentes');
  const [pestana, setPestana] = useState<Pestana>(pestanaInicial);
  useEffect(() => setPestana(pestanaInicial), [pestanaInicial]);
  const [form, setForm] = useState(false);
  const [revision, setRevision] = useState<DecisionNovedad | null>(null);
  const [impresion, setImpresion] = useState<Impresion>(null);

  // Al pedir impresión se muestran las secciones que van al papel y luego se abre el diálogo.
  useEffect(() => {
    if (!impresion) return;
    const fin = () => setImpresion(null);
    window.addEventListener('afterprint', fin, { once: true });
    const t = window.setTimeout(() => window.print(), 60);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', fin);
    };
  }, [impresion]);

  const d = docentes?.find((x) => x.id === id);
  const datos = useMemo(
    () =>
      d
        ? calcular(d, {
            asignaturas,
            grupos,
            asignaciones,
            horarios,
            novedades,
            // El docente solo ve las evaluaciones que ya le socializaron.
            seguimientos: propio ? seguimientos.filter((x) => x.estado === 'socializado') : seguimientos,
            miembros,
          })
        : null,
    [d, asignaturas, grupos, asignaciones, horarios, novedades, seguimientos, miembros, propio],
  );

  if (isLoading) return <Cargando />;
  if (!d || !datos)
    return (
      <Vacio
        titulo={propio ? 'No encontramos su registro docente' : 'Docente no encontrado'}
        texto={propio ? 'Pida a la coordinación que revise su registro en el directorio de docentes.' : 'Puede que haya sido eliminado.'}
        accion={
          !propio && (
            <Link to="/docentes">
              <Boton variante="secundario">Volver a docentes</Boton>
            </Link>
          )
        }
      />
    );

  const area = areas.find((a) => a.id === d.area_id);
  const sede = sedes.find((s) => s.id === d.sede_id);
  const { asg, grs, misAsig, misBloques, horas, misNov, misSeg } = datos;
  const color = (asignaturaId: string) => areas.find((x) => x.id === asg.get(asignaturaId)?.area_id)?.color;
  const aprueba = !propio && puedeAprobar(perfil?.rol);
  const gestiona = (m: Parameters<typeof editar>[0]) => !propio && editar(m);

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

  /** Clases de una sección: la activa se ve en pantalla; al imprimir se muestran las que van al papel. */
  const seccion = (p: Pestana) =>
    cx(
      pestana === p ? (impresion === 'horario' && p !== 'horario' ? 'print:hidden' : '') : 'hidden',
      pestana !== p && (impresion === 'ficha' || (impresion === 'horario' && p === 'horario')) && 'print:block',
      'print:mb-6 print:break-inside-avoid-page',
    );
  const TituloImpreso = ({ children }: { children: ReactNode }) => <h2 className="mb-3 hidden text-xl font-semibold print:block">{children}</h2>;

  return (
    <>
      {/* Encabezado que solo aparece en papel. */}
      <div className="mb-6 hidden items-center justify-between border-b border-line pb-4 print:flex">
        <div>
          <p className="font-display text-lg font-semibold">{ajustes.nombre}</p>
          <p className="text-sm text-muted">
            {impresion === 'horario' ? 'Horario del docente' : 'Ficha del docente'} · Impreso el {fechaLarga(hoyISO())}
          </p>
        </div>
        <span className="flex items-center gap-2">
          <Logo className="size-8" />
          <Wordmark className="text-[20px]" />
        </span>
      </div>

      {!propio && (
        <Link to="/docentes" className="no-print mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Docentes
        </Link>
      )}

      <div className="card mb-6 flex flex-col gap-5 p-6 md:flex-row md:items-center print:shadow-none">
        <Avatar nombre={nombreDocente(d)} tam={72} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold sm:text-3xl">{nombreDocente(d)}</h1>
            <Insignia tono={tono(ESTADOS_DOCENTE, d.estado)} punto>
              {etiqueta(ESTADOS_DOCENTE, d.estado)}
            </Insignia>
            {datos.ausenteHoy && (
              <Insignia tono="warn" punto>
                Ausente hoy
              </Insignia>
            )}
          </div>
          <p className="mt-1 text-muted">
            {d.cargo}
            {area && ` · ${area.nombre}`}
            {sede && ` · ${sede.nombre}`}
            {` · C. C. ${d.documento}`}
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
        <div className="no-print flex flex-wrap gap-2">
          <Link to={propio ? '/novedades?nueva=1' : `/novedades?nueva=1&docente=${d.id}`}>
            <Boton variante="secundario" icono={<Bell className="size-4" />}>
              {propio ? 'Solicitar permiso' : 'Registrar novedad'}
            </Boton>
          </Link>
          <Boton variante="secundario" icono={<Printer className="size-4" />} onClick={() => setImpresion('ficha')}>
            Imprimir ficha
          </Boton>
          {gestiona('docentes') && (
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
        className="no-print mb-5"
        valor={pestana}
        onCambio={setPestana}
        opciones={[
          { valor: 'resumen', etiqueta: 'Resumen' },
          { valor: 'hoja', etiqueta: 'Hoja de vida' },
          {
            valor: 'carga',
            etiqueta: 'Carga académica',
            cuenta: misAsig.length,
          },
          { valor: 'horario', etiqueta: 'Horario', cuenta: misBloques.length },
          {
            valor: 'novedades',
            etiqueta: propio ? 'Mis solicitudes' : 'Novedades',
            cuenta: datos.pendientes.length || misNov.length,
          },
          {
            valor: 'seguimiento',
            etiqueta: 'Evaluación',
            cuenta: misSeg.length,
          },
          ...(propio && cuenta ? [{ valor: 'cuenta' as const, etiqueta: 'Mi cuenta' }] : []),
        ]}
      />

      {/* ───────── Resumen ───────── */}
      <section className={seccion('resumen')}>
        <TituloImpreso>Resumen</TituloImpreso>
        <Resumen d={d} datos={datos} grados={grados} color={color} onIr={setPestana} propio={propio} />
      </section>

      {/* ───────── Hoja de vida ───────── */}
      <section className={seccion('hoja')}>
        <TituloImpreso>Hoja de vida</TituloImpreso>
        <div className="grid gap-6 lg:grid-cols-3">
          <Tarjeta titulo="Datos personales" className="lg:col-span-2">
            {propio && <p className="-mt-1 mb-4 text-sm text-muted">Estos datos los registra la coordinación. Si hay un error, pídale que lo corrija.</p>}
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Dato etiqueta="Documento" valor={d.documento} />
              <Dato
                etiqueta="Género"
                valor={
                  {
                    F: 'Femenino',
                    M: 'Masculino',
                    O: 'Otro',
                    '': 'Sin especificar',
                  }[d.genero]
                }
              />
              <Dato
                etiqueta="Fecha de nacimiento"
                valor={d.fecha_nacimiento ? `${fechaLarga(d.fecha_nacimiento)} (${edad(d.fecha_nacimiento)} años)` : '—'}
                icono={<Cake className="size-4" />}
              />
              <Dato etiqueta="Teléfono" valor={d.telefono || '—'} />
              <Dato etiqueta="Correo" valor={d.email || '—'} />
              <Dato etiqueta="Sede" valor={sede?.nombre ?? '—'} icono={<MapPin className="size-4" />} />
            </dl>
            {d.notas && !propio && (
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
              <Dato
                etiqueta="Fecha de ingreso"
                valor={d.fecha_ingreso ? `${fechaLarga(d.fecha_ingreso)} (${aniosServicio(d.fecha_ingreso)})` : '—'}
              />
              {datos.direcciones.length > 0 && (
                <Dato etiqueta="Director de grupo" valor={datos.direcciones.map((g) => nombreGrupo(g, grados)).join(', ')} />
              )}
            </dl>
          </Tarjeta>
          <TarjetaFormacion d={d} puede={propio || editar('docentes')} />
          <TarjetaExperiencia d={d} puede={propio || editar('docentes')} />
          <div className="print:hidden">
            <TarjetaDocumentos d={d} puede={propio || editar('docentes')} />
          </div>
          {propio && (
            <div className="print:hidden">
              <TarjetaContacto d={d} />
            </div>
          )}
        </div>
      </section>

      {/* ───────── Carga académica ───────── */}
      <section className={seccion('carga')}>
        <TituloImpreso>Carga académica</TituloImpreso>
        <Tarjeta
          sinRelleno
          titulo={`${horas} de ${d.carga_maxima} horas semanales`}
          accion={
            gestiona('asignacion') && (
              <Link to={`/asignacion?docente=${d.id}`} className="no-print">
                <Boton tam="sm" variante="secundario" icono={<Plus className="size-4" />}>
                  Asignar
                </Boton>
              </Link>
            )
          }
        >
          {misAsig.length === 0 ? (
            <Vacio titulo="Sin asignación académica" texto="Este docente no tiene asignaturas asignadas." />
          ) : (
            <>
              <div className="px-6 pt-2 pb-4">
                <Progreso valor={horas} max={d.carga_maxima} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-line bg-surface-2/60 text-left text-xs font-semibold text-muted">
                      <th className="px-6 py-2.5">Asignatura</th>
                      <th className="px-3 py-2.5">Grupo</th>
                      <th className="px-3 py-2.5 text-right">Asignadas</th>
                      <th className="px-6 py-2.5 text-right">En el horario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {[...misAsig]
                      .sort((a, b) =>
                        nombreGrupo(grs.get(a.grupo_id), grados).localeCompare(nombreGrupo(grs.get(b.grupo_id), grados), 'es', { numeric: true }),
                      )
                      .map((a) => {
                        const p = datos.programadas(a);
                        return (
                          <tr key={a.id}>
                            <td className="px-6 py-3">
                              <span className="flex items-center gap-2.5 font-semibold">
                                <span
                                  className="size-2.5 shrink-0 rounded-full"
                                  style={{
                                    background: color(a.asignatura_id) ?? 'var(--line-strong)',
                                  }}
                                />
                                {asg.get(a.asignatura_id)?.nombre}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-ink-2">{nombreGrupo(grs.get(a.grupo_id), grados)}</td>
                            <td className="px-3 py-3 text-right font-semibold tabular-nums">{a.horas_semanales} h</td>
                            <td className="px-6 py-3 text-right tabular-nums">
                              {p === a.horas_semanales ? (
                                <span className="inline-flex items-center gap-1 text-ok">
                                  <Check className="size-3.5" /> {p} h
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-warn"
                                  title={p < a.horas_semanales ? 'Faltan horas por programar' : 'Hay más horas programadas que asignadas'}
                                >
                                  <AlertTriangle className="size-3.5" /> {p} h
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-line bg-surface-2/60 font-semibold">
                      <td className="px-6 py-3" colSpan={2}>
                        Total semanal
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{horas} h</td>
                      <td className="px-6 py-3 text-right tabular-nums">{datos.horasProgramadas} h</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </Tarjeta>
      </section>

      {/* ───────── Horario ───────── */}
      <section className={seccion('horario')}>
        <TituloImpreso>Horario semanal</TituloImpreso>
        <Tarjeta
          titulo={impresion === 'horario' ? undefined : 'Horario semanal'}
          accion={
            misBloques.length > 0 && (
              <span className="no-print flex gap-2">
                <Link to={propio ? '/horarios?mio=1' : `/horarios?docente=${d.id}`}>
                  <Boton tam="sm" variante="fantasma">
                    Abrir en Horarios
                  </Boton>
                </Link>
                <Boton tam="sm" variante="secundario" icono={<Printer className="size-4" />} onClick={() => setImpresion('horario')}>
                  Imprimir horario
                </Boton>
              </span>
            )
          }
        >
          {misBloques.length === 0 ? (
            <Vacio titulo="Sin clases en el horario" texto="Las clases aparecerán aquí cuando se programen en Horarios." />
          ) : (
            <HorarioSemanal
              bloques={misBloques}
              franjas={ajustes.franjas}
              color={(b) => color(b.asignatura_id)}
              render={(b) => (
                <>
                  <span className="truncate text-[13px] leading-tight font-semibold">{asg.get(b.asignatura_id)?.nombre}</span>
                  <span className="truncate text-xs text-muted">{nombreGrupo(grs.get(b.grupo_id), grados)}</span>
                </>
              )}
            />
          )}
        </Tarjeta>
      </section>

      {/* ───────── Novedades ───────── */}
      <section className={seccion('novedades')}>
        <TituloImpreso>Novedades</TituloImpreso>
        <Tarjeta
          sinRelleno
          titulo={`Este año: ${datos.ausencia.permisos} ${datos.ausencia.permisos === 1 ? 'novedad aprobada' : 'novedades aprobadas'}`}
          accion={
            <Link to={propio ? '/novedades?nueva=1' : `/novedades?nueva=1&docente=${d.id}`} className="no-print">
              <Boton tam="sm" variante="secundario" icono={<Plus className="size-4" />}>
                {propio ? 'Solicitar permiso' : 'Registrar'}
              </Boton>
            </Link>
          }
        >
          {misNov.length === 0 ? (
            <Vacio titulo={propio ? 'Sin solicitudes' : 'Sin novedades'} texto={propio ? 'Aún no ha solicitado permisos.' : 'No hay permisos ni ausencias registradas.'} />
          ) : (
            <ul className="mt-2 divide-y divide-line border-t border-line">
              {misNov.map((n) => (
                <FilaNovedad
                  key={n.id}
                  n={n}
                  reemplazo={docentes?.find((x) => x.id === n.reemplazo_id)}
                  aprueba={aprueba}
                  onRevisar={(decision) => setRevision({ n, decision })}
                />
              ))}
            </ul>
          )}
        </Tarjeta>
      </section>

      {/* ───────── Evaluación docente ───────── */}
      <section className={seccion('seguimiento')}>
        <TituloImpreso>Evaluación docente</TituloImpreso>
        <Tarjeta
          sinRelleno
          titulo="Evaluación docente"
          accion={
            gestiona('seguimiento') && (
              <Link to={`/evaluacion-docente?nuevo=1&docente=${d.id}`} className="no-print">
                <Boton tam="sm" variante="secundario" icono={<Plus className="size-4" />}>
                  Nueva evaluación
                </Boton>
              </Link>
            )
          }
        >
          {misSeg.length === 0 ? (
            <Vacio
              titulo="Sin evaluaciones"
              texto={propio ? 'Aquí verá los acompañamientos que la coordinación socialice con usted.' : 'No hay registros de acompañamiento pedagógico.'}
            />
          ) : (
            <>
              {misSeg.length > 1 && <Tendencia seguimientos={misSeg} />}
              {misSeg[0].compromisos && (
                <div className="mx-6 mb-4 rounded-[20px] bg-surface-2 p-4 text-sm">
                  <p className="mb-1 font-semibold">Compromisos de la última evaluación ({fechaCorta(misSeg[0].fecha)})</p>
                  <p className="whitespace-pre-line text-ink-2">{misSeg[0].compromisos}</p>
                </div>
              )}
              <ul className="divide-y divide-line border-t border-line">
                {misSeg.map((s) => {
                  const prom = promedio(s);
                  return (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 px-6 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{etiqueta(TIPOS_SEGUIMIENTO, s.tipo)}</p>
                        <p className="text-sm text-muted">
                          {fechaCorta(s.fecha)} · {s.observador}
                          {s.estado === 'borrador' && ' · Borrador'}
                        </p>
                      </div>
                      <Insignia tono={tonoPromedio(prom)}>{prom.toFixed(1)} / 4</Insignia>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Tarjeta>
      </section>

      {propio && cuenta && <section className={cx(pestana === 'cuenta' ? '' : 'hidden', 'print:hidden')}>{cuenta}</section>}

      <FormDocente abierto={form} onCerrar={() => setForm(false)} docente={d} />
      <RevisionNovedad datos={revision} onCerrar={() => setRevision(null)} />
    </>
  );
}

interface Fuentes {
  asignaturas: Asignatura[];
  grupos: Grupo[];
  asignaciones: Asignacion[];
  horarios: BloqueHorario[];
  novedades: Novedad[];
  seguimientos: Seguimiento[];
  miembros: Miembro[];
}

/** Cifras de la ficha calculadas a partir de los datos de la institución. */
function calcular(d: Docente, { asignaturas, grupos, asignaciones, horarios, novedades, seguimientos, miembros }: Fuentes) {
  const asg = porId(asignaturas);
  const grs = porId(grupos);
  const misAsig = asignaciones.filter((a) => a.docente_id === d.id);
  const misBloques = horarios.filter((h) => h.docente_id === d.id);
  const programadas = (a: Asignacion) =>
    misBloques
      .filter((h) => h.grupo_id === a.grupo_id && h.asignatura_id === a.asignatura_id)
      .reduce((s, h) => s + Math.round(duracionHoras(h.hora_inicio, h.hora_fin)), 0);
  const horas = misAsig.reduce((s, a) => s + a.horas_semanales, 0);
  const horasProgramadas = misAsig.reduce((s, a) => s + Math.min(programadas(a), a.horas_semanales), 0);
  const misNov = novedades.filter((n) => n.docente_id === d.id).sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
  const misSeg = seguimientos.filter((s) => s.docente_id === d.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const anio = String(new Date().getFullYear());
  const delAnio = misNov.filter((n) => n.estado === 'aprobada' && n.fecha_inicio.startsWith(anio));
  const ausencia = {
    dias: delAnio.filter((n) => !n.horas).reduce((s, n) => s + diasEntre(n.fecha_inicio, n.fecha_fin), 0),
    horas: delAnio.reduce((s, n) => s + (n.horas || 0), 0),
    permisos: delAnio.length,
  };
  const pendientes = misNov.filter((n) => n.estado === 'pendiente');
  const hoy = hoyISO();
  const ausenteHoy = ausentesEn(misNov, hoy)[0];
  const dow = new Date().getDay();
  const clasesHoy = misBloques.filter((b) => b.dia === dow).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  const direcciones = grupos.filter((g) => g.director_id === d.id);
  const misGrupos = [...new Set(misAsig.map((a) => a.grupo_id))].map((g) => grs.get(g)).filter((g) => !!g);
  const estudiantes = misGrupos.reduce((s, g) => s + (g?.estudiantes ?? 0), 0);
  const miembro = miembros.find((m) => m.docente_id === d.id);
  const segDelAnio = misSeg.filter((s) => s.fecha.startsWith(anio));
  return {
    asg,
    grs,
    misAsig,
    misBloques,
    programadas,
    horas,
    horasProgramadas,
    misNov,
    misSeg,
    ausencia,
    pendientes,
    ausenteHoy,
    clasesHoy,
    direcciones,
    misGrupos,
    estudiantes,
    miembro,
    segDelAnio,
  };
}

type DatosFicha = ReturnType<typeof calcular>;

/* ───────── Resumen ───────── */
function Resumen({
  d,
  datos,
  grados,
  color,
  onIr,
  propio,
}: {
  d: Docente;
  datos: DatosFicha;
  grados: Grado[];
  color: (asignaturaId: string) => string | undefined;
  onIr: (p: Pestana) => void;
  propio: boolean;
}) {
  const sinProgramar = datos.horas - datos.horasProgramadas;
  const ultimo = datos.misSeg[0];
  const alertas: {
    texto: string;
    ir?: Pestana;
    tono: 'warn' | 'danger' | 'info';
  }[] = [];
  if (propio) {
    if (!(d.formacion ?? []).length)
      alertas.push({ texto: 'Complete su hoja de vida: agregue sus títulos y documentos.', ir: 'hoja', tono: 'warn' });
    if (datos.pendientes.length)
      alertas.push({
        texto: `Tiene ${datos.pendientes.length} ${datos.pendientes.length === 1 ? 'solicitud' : 'solicitudes'} en revisión.`,
        ir: 'novedades',
        tono: 'info',
      });
    if (ultimo?.compromisos) alertas.push({ texto: 'Revise los compromisos de su última evaluación.', ir: 'seguimiento', tono: 'info' });
    if (!d.telefono) alertas.push({ texto: 'Registre su teléfono de contacto.', ir: 'hoja', tono: 'info' });
  } else {
    if (datos.horas > d.carga_maxima)
      alertas.push({
        texto: `Tiene ${datos.horas - d.carga_maxima} h más que su carga máxima (${d.carga_maxima} h).`,
        ir: 'carga',
        tono: 'danger',
      });
    if (datos.misAsig.length === 0 && d.estado === 'activo')
      alertas.push({
        texto: 'No tiene asignación académica.',
        ir: 'carga',
        tono: 'warn',
      });
    if (sinProgramar > 0)
      alertas.push({
        texto: `${sinProgramar} h asignadas aún no están en el horario.`,
        ir: 'carga',
        tono: 'warn',
      });
    if (datos.pendientes.length)
      alertas.push({
        texto: `${datos.pendientes.length} ${datos.pendientes.length === 1 ? 'solicitud espera' : 'solicitudes esperan'} revisión.`,
        ir: 'novedades',
        tono: 'info',
      });
    if (d.estado === 'activo' && datos.segDelAnio.length === 0)
      alertas.push({
        texto: 'No ha recibido evaluación docente este año.',
        ir: 'seguimiento',
        tono: 'info',
      });
    if (!d.email)
      alertas.push({
        texto: 'Falta su correo: sin él no puede entrar a SIGEI.',
        tono: 'warn',
      });
    if (!(d.formacion ?? []).length)
      alertas.push({
        texto: 'La hoja de vida no tiene títulos registrados.',
        ir: 'hoja',
        tono: 'info',
      });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          etiqueta="Carga semanal"
          valor={`${datos.horas} h`}
          detalle={propio ? `de ${d.carga_maxima} h · ${datos.misAsig.length} asignaturas` : `de ${d.carga_maxima} h · ${sinProgramar > 0 ? `${sinProgramar} h sin programar` : 'todo en el horario'}`}
          onClick={() => onIr('carga')}
        >
          <Progreso valor={datos.horas} max={d.carga_maxima} />
        </Indicador>
        <Indicador
          etiqueta="Ausencias este año"
          valor={`${datos.ausencia.dias} ${datos.ausencia.dias === 1 ? 'día' : 'días'}`}
          detalle={`${datos.ausencia.horas ? `${datos.ausencia.horas} h en permisos por horas · ` : ''}${datos.ausencia.permisos} aprobadas`}
          onClick={() => onIr('novedades')}
        />
        <Indicador
          etiqueta={propio ? 'Solicitudes en revisión' : 'Por revisar'}
          valor={String(datos.pendientes.length)}
          detalle={datos.pendientes.length ? (propio ? 'esperan respuesta' : 'solicitudes pendientes') : 'sin solicitudes pendientes'}
          resaltar={datos.pendientes.length > 0}
          onClick={() => onIr('novedades')}
        />
        <Indicador
          etiqueta="Evaluación"
          valor={ultimo ? `${promedio(ultimo).toFixed(1)} / 4` : '—'}
          detalle={ultimo ? `último el ${fechaCorta(ultimo.fecha)} · ${datos.segDelAnio.length} este año` : 'sin registros'}
          onClick={() => onIr('seguimiento')}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Para atender" icono={<AlertTriangle className="size-4" />} className="lg:col-span-2">
          {alertas.length === 0 ? (
            <p className="flex items-center gap-2 py-2 text-sm text-ok">
              <CheckCircle2 className="size-4" /> {propio ? 'Todo al día. No tiene pendientes.' : 'Todo en orden: carga, horario, permisos y evaluación al día.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-2 py-1">
              {alertas.map((a) => (
                <li key={a.texto}>
                  <button
                    type="button"
                    disabled={!a.ir}
                    onClick={() => a.ir && onIr(a.ir)}
                    className="flex w-full items-center gap-3 rounded-[16px] bg-surface-2 px-4 py-3 text-left text-sm transition enabled:hover:bg-surface-3"
                  >
                    <span
                      className={cx('size-2 shrink-0 rounded-full', a.tono === 'danger' ? 'bg-danger' : a.tono === 'warn' ? 'bg-warn' : 'bg-info')}
                      aria-hidden
                    />
                    <span className="flex-1">{a.texto}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        {propio ? (
          <Tarjeta titulo="Mi cuenta" icono={<UserRound className="size-4" />}>
            <div className="flex flex-col gap-3 py-1">
              <p className="text-sm text-ink-2">
                Entra con <span className="font-medium">{d.email || 'su documento'}</span>.
              </p>
              <Boton tam="sm" variante="secundario" className="self-start" onClick={() => onIr('cuenta')}>
                Apariencia y contraseña
              </Boton>
            </div>
          </Tarjeta>
        ) : (
          <AccesoSigei d={d} miembro={datos.miembro} />
        )}

        <Tarjeta
          titulo={`Clases de hoy · ${DIAS.find((x) => x.valor === new Date().getDay())?.largo ?? 'Domingo'}`}
          icono={<Clock3 className="size-4" />}
          className="lg:col-span-2"
        >
          {datos.ausenteHoy && (
            <p className="mb-3 rounded-[16px] bg-warn-soft px-4 py-3 text-sm text-warn">
              {propio ? 'Hoy tiene' : 'Está ausente hoy por'} {etiqueta(TIPOS_NOVEDAD, datos.ausenteHoy.tipo).toLowerCase()}
              {propio ? '.' : datos.ausenteHoy.reemplazo_id ? '; tiene reemplazo asignado.' : '; aún no tiene reemplazo.'}
            </p>
          )}
          {datos.clasesHoy.length === 0 ? (
            <p className="py-2 text-sm text-muted">No tiene clases hoy.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {datos.clasesHoy.map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-36 shrink-0 text-sm whitespace-nowrap text-muted tabular-nums">
                    {horaBonita(b.hora_inicio)} – {horaBonita(b.hora_fin)}
                  </span>
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      background: color(b.asignatura_id) ?? 'var(--line-strong)',
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate font-semibold">{datos.asg.get(b.asignatura_id)?.nombre}</span>
                  <span className="text-sm text-ink-2">{nombreGrupo(datos.grs.get(b.grupo_id), grados)}</span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta titulo="Grupos" icono={<UsersRound className="size-4" />}>
          <dl className="flex flex-col gap-4">
            <Dato
              etiqueta="Director de grupo"
              valor={datos.direcciones.length ? datos.direcciones.map((g) => nombreGrupo(g, grados)).join(', ') : 'No'}
            />
            <Dato
              etiqueta="Da clase en"
              valor={
                datos.misGrupos.length
                  ? `${datos.misGrupos.length} ${datos.misGrupos.length === 1 ? 'grupo' : 'grupos'} · ${datos.estudiantes} estudiantes`
                  : 'Ningún grupo'
              }
            />
            {datos.misGrupos.length > 0 && (
              <dd className="-mt-2 flex flex-wrap gap-1.5">
                {datos.misGrupos.map((g) => (
                  <span key={g!.id} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium">
                    {nombreGrupo(g, grados)}
                  </span>
                ))}
              </dd>
            )}
          </dl>
        </Tarjeta>
      </div>
    </div>
  );
}

function aniosServicio(desde: string) {
  const n = edad(desde);
  return n < 1 ? 'menos de un año' : n === 1 ? '1 año de servicio' : `${n} años de servicio`;
}

function Indicador({
  etiqueta,
  valor,
  detalle,
  resaltar,
  onClick,
  children,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
  resaltar?: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'card flex flex-col gap-1 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-pop print:shadow-none',
        resaltar && 'bg-warn-soft',
      )}
    >
      <span className="text-sm font-medium text-muted">{etiqueta}</span>
      <span className="font-display text-[30px] leading-tight font-semibold tabular-nums">{valor}</span>
      <span className="text-xs text-muted">{detalle}</span>
      {children && <span className="mt-2 block">{children}</span>}
    </button>
  );
}

/** Estado de la cuenta del docente en SIGEI, con la acción que corresponde. */
function AccesoSigei({ d, miembro }: { d: Docente; miembro: Miembro | undefined }) {
  const { editar } = useAuth();
  const { actualizar } = useMutarMiembros();
  const toast = useToast();
  const activar = async () => {
    if (!miembro) return;
    try {
      await actualizar.mutateAsync({
        id: miembro.id,
        cambios: { activo: true },
      });
      toast.ok(`${nombreDocente(d, true)} ya puede ingresar.`);
    } catch (e) {
      toast.error(e);
    }
  };
  let estado: ReactNode;
  let texto: string;
  if (miembro?.activo) {
    estado = <Insignia tono="ok">Con acceso</Insignia>;
    texto = `Entra con ${miembro.email}.`;
  } else if (miembro) {
    estado = <Insignia tono="info">Por activar</Insignia>;
    texto = 'Creó su cuenta y espera que la activen.';
  } else if (!d.email) {
    estado = <Insignia tono="warn">Falta correo</Insignia>;
    texto = 'Registre su correo para que pueda entrar.';
  } else {
    estado = <span className="text-sm font-semibold text-muted">Sin cuenta</span>;
    texto = accesoDocenteActivo
      ? 'Puede entrar con su número de documento: recibirá un código en su correo.'
      : 'Aún no ha creado su cuenta. Debe solicitar acceso con este correo.';
  }
  return (
    <Tarjeta titulo="Acceso a SIGEI" icono={<KeyRound className="size-4" />}>
      <div className="flex flex-col gap-3 py-1">
        <div>{estado}</div>
        <p className="text-sm text-ink-2">{texto}</p>
        {miembro && !miembro.activo && editar('usuarios') && (
          <Boton tam="sm" onClick={activar} cargando={actualizar.isPending} className="no-print self-start">
            Activar acceso
          </Boton>
        )}
        {miembro && !miembro.activo && !editar('usuarios') && <p className="text-xs text-muted">La activa el administrador en Usuarios y roles.</p>}
      </div>
    </Tarjeta>
  );
}

function FilaNovedad({
  n,
  reemplazo,
  aprueba,
  onRevisar,
}: {
  n: Novedad;
  reemplazo: Docente | undefined;
  aprueba: boolean;
  onRevisar: (d: 'aprobada' | 'rechazada') => void;
}) {
  const avisos = useAvisosPermiso();
  return (
    <li className="flex flex-wrap items-start gap-3 px-6 py-3.5">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
        <CalendarClock className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{etiqueta(TIPOS_NOVEDAD, n.tipo)}</p>
        <p className="text-sm text-muted">
          {fechaCorta(n.fecha_inicio)}
          {n.fecha_fin !== n.fecha_inicio && ` – ${fechaCorta(n.fecha_fin)}`} ·{' '}
          {n.horas ? `${n.horas} h` : `${diasEntre(n.fecha_inicio, n.fecha_fin)} d`}
          {reemplazo && ` · Reemplazo: ${nombreDocente(reemplazo, true)}`}
        </p>
        {n.motivo && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{n.motivo}</p>}
        <ListaSoportes soportes={n.soportes} className="mt-2" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Insignia tono={tono(ESTADOS_NOVEDAD, n.estado)}>{etiqueta(ESTADOS_NOVEDAD, n.estado)}</Insignia>
        {soportePendiente(n) && <Insignia tono="warn">Soporte pendiente</Insignia>}
        {n.estado === 'aprobada' && (
          <button
            type="button"
            onClick={() => avisos.descargar(n)}
            className="no-print inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
            title="Descargar el certificado de autorización"
          >
            <FileBadge className="size-3.5" /> Certificado
          </button>
        )}
        {n.estado === 'pendiente' && aprueba && (
          <span className="no-print flex gap-1.5">
            <Boton tam="sm" icono={<Check className="size-3.5" />} onClick={() => onRevisar('aprobada')}>
              Aprobar
            </Boton>
            <Boton tam="sm" variante="secundario" icono={<X className="size-3.5" />} onClick={() => onRevisar('rechazada')}>
              Rechazar
            </Boton>
          </span>
        )}
      </div>
    </li>
  );
}

/** Promedio de cada evaluación en orden cronológico, en barras de 0 a 4. */
function Tendencia({ seguimientos }: { seguimientos: Seguimiento[] }) {
  const serie = [...seguimientos].reverse().slice(-12);
  return (
    <div className="px-6 pb-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
        <ClipboardCheck className="size-3.5" /> Promedio por evaluación, de la más antigua a la más reciente
      </p>
      <div className="flex h-20 items-end gap-1.5" role="img" aria-label={`Promedios: ${serie.map((s) => promedio(s).toFixed(1)).join(', ')}`}>
        {serie.map((s) => {
          const p = promedio(s);
          return (
            <div key={s.id} className="flex flex-1 flex-col items-center gap-1" title={`${fechaCorta(s.fecha)}: ${p.toFixed(1)}`}>
              <span className="text-[10px] font-semibold tabular-nums text-muted">{p.toFixed(1)}</span>
              <span className="w-full max-w-10 rounded-t-md bg-brand" style={{ height: `${(p / 4) * 52}px` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor, icono }: { etiqueta: string; valor: string; icono?: ReactNode }) {
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
