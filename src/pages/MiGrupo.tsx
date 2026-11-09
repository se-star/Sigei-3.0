import { useState } from 'react';
import { BookOpenCheck, Clock3, Mail, MapPin, Phone, Printer, Users, UsersRound } from 'lucide-react';
import { Avatar, Boton, Encabezado, Insignia, Progreso, Segmentos, Tarjeta, Vacio } from '@/components/ui';
import { HorarioSemanal } from '@/components/HorarioSemanal';
import { useAuth } from '@/hooks/useAuth';
import { useAjustes, useTabla } from '@/hooks/useDatos';
import { etiqueta, JORNADAS } from '@/lib/catalogos';
import type { Grupo } from '@/lib/types';
import { duracionHoras, nombreDocente, nombreGrupo, porId } from '@/lib/utils';

/** Grupos que dirige el docente vinculado a la sesión. */
export function useMisGrupos(): Grupo[] {
  const { perfil } = useAuth();
  const { data: grupos = [] } = useTabla('grupos');
  if (!perfil?.docente_id) return [];
  return grupos.filter((g) => g.director_id === perfil.docente_id).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** Ficha del grupo para su director: horario, docentes y plan de estudios. */
export default function MiGrupo() {
  const misGrupos = useMisGrupos();
  const [sel, setSel] = useState('');
  const grupo = misGrupos.find((g) => g.id === sel) ?? misGrupos[0];

  if (!grupo)
    return (
      <>
        <Encabezado titulo="Mi grupo" />
        <div className="card">
          <Vacio
            icono={<UsersRound className="size-6" />}
            titulo="No es director de ningún grupo"
            texto="Cuando la coordinación lo asigne como director de grupo, aquí verá el horario, los docentes y el plan de estudios de su grupo."
          />
        </div>
      </>
    );

  return (
    <>
      {misGrupos.length > 1 && (
        <Segmentos
          className="no-print mb-6"
          valor={grupo.id}
          onCambio={setSel}
          opciones={misGrupos.map((g) => ({ valor: g.id, etiqueta: g.nombre }))}
        />
      )}
      <FichaGrupo grupo={grupo} />
    </>
  );
}

function FichaGrupo({ grupo }: { grupo: Grupo }) {
  const ajustes = useAjustes();
  const { data: grados = [] } = useTabla('grados');
  const { data: sedes = [] } = useTabla('sedes');
  const { data: docentes = [] } = useTabla('docentes');
  const { data: asignaciones = [] } = useTabla('asignaciones');
  const { data: asignaturas = [] } = useTabla('asignaturas');
  const { data: areas = [] } = useTabla('areas');
  const { data: horarios = [] } = useTabla('horarios');

  const docs = porId(docentes);
  const asg = porId(asignaturas);
  const ars = porId(areas);
  const sede = sedes.find((s) => s.id === grupo.sede_id);
  const bloques = horarios.filter((h) => h.grupo_id === grupo.id);
  const plan = asignaciones
    .filter((a) => a.grupo_id === grupo.id)
    .sort((a, b) => (asg.get(a.asignatura_id)?.nombre ?? '').localeCompare(asg.get(b.asignatura_id)?.nombre ?? ''));
  const horasPlan = plan.reduce((s, a) => s + a.horas_semanales, 0);
  const horasHorario = bloques.reduce((s, b) => s + duracionHoras(b.hora_inicio, b.hora_fin), 0);

  // Docentes que le dan clase al grupo (por asignación académica o por horario), con sus asignaturas.
  const equipo = new Map<string, Set<string>>();
  for (const a of plan) equipo.set(a.docente_id, (equipo.get(a.docente_id) ?? new Set()).add(a.asignatura_id));
  for (const b of bloques) if (b.docente_id) equipo.set(b.docente_id, (equipo.get(b.docente_id) ?? new Set()).add(b.asignatura_id));
  const listaEquipo = [...equipo.entries()]
    .map(([id, materias]) => ({ d: docs.get(id), materias: [...materias].map((m) => asg.get(m)?.nombre).filter(Boolean) as string[] }))
    .filter((x) => x.d)
    .sort((a, b) => a.d!.apellidos.localeCompare(b.d!.apellidos));

  return (
    <>
      <Encabezado
        titulo={`Mi grupo · ${nombreGrupo(grupo, grados)}`}
        descripcion={`${ajustes.nombre} · Jornada ${etiqueta(JORNADAS, grupo.jornada).toLowerCase()}${sede ? ` · ${sede.nombre}` : ''}`}
        acciones={
          <Boton variante="secundario" icono={<Printer className="size-4" />} onClick={() => window.print()}>
            Imprimir
          </Boton>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-5">
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Users className="size-4" /> Estudiantes
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {grupo.estudiantes}
            <span className="text-lg text-muted"> / {grupo.capacidad}</span>
          </p>
          <div className="mt-2">
            <Progreso valor={grupo.estudiantes} max={grupo.capacidad} />
          </div>
        </div>
        <div className="card p-5">
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <UsersRound className="size-4" /> Docentes
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{listaEquipo.length}</p>
        </div>
        <div className="card p-5">
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <BookOpenCheck className="size-4" /> Plan semanal
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {horasPlan}
            <span className="text-lg text-muted"> h</span>
          </p>
        </div>
        <div className="card p-5">
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Clock3 className="size-4" /> En el horario
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {Math.round(horasHorario * 10) / 10}
            <span className="text-lg text-muted"> h</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <Tarjeta titulo="Horario del grupo" icono={<Clock3 className="size-4" />}>
          {bloques.length === 0 ? (
            <p className="text-sm text-muted">El horario de este grupo aún no está programado.</p>
          ) : (
            <HorarioSemanal
              bloques={bloques}
              franjas={ajustes.franjas}
              color={(b) => ars.get(asg.get(b.asignatura_id)?.area_id ?? '')?.color}
              render={(b) => (
                <>
                  <span className="truncate text-[13px] leading-tight font-semibold">{asg.get(b.asignatura_id)?.nombre ?? '—'}</span>
                  <span className="truncate text-xs text-muted">{nombreDocente(docs.get(b.docente_id ?? ''), true)}</span>
                </>
              )}
            />
          )}
        </Tarjeta>

        <div className="grid gap-6 lg:grid-cols-2">
          <Tarjeta titulo="Docentes del grupo" icono={<UsersRound className="size-4" />}>
            {listaEquipo.length === 0 ? (
              <p className="text-sm text-muted">Aún no hay docentes asignados a este grupo.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {listaEquipo.map(({ d, materias }) => (
                  <li key={d!.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar nombre={nombreDocente(d)} tam={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{nombreDocente(d)}</p>
                      <p className="truncate text-sm text-muted">{materias.join(', ')}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                        {d!.email && (
                          <a href={`mailto:${d!.email}`} className="flex items-center gap-1 text-ink-2 hover:underline">
                            <Mail className="size-3.5" /> {d!.email}
                          </a>
                        )}
                        {d!.telefono && (
                          <a href={`tel:${d!.telefono.replace(/\s/g, '')}`} className="flex items-center gap-1 text-ink-2 hover:underline">
                            <Phone className="size-3.5" /> {d!.telefono}
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta titulo="Plan de estudios" icono={<BookOpenCheck className="size-4" />}>
            {plan.length === 0 ? (
              <p className="text-sm text-muted">La asignación académica de este grupo aún no está registrada.</p>
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {plan.map((a) => {
                    const s = asg.get(a.asignatura_id);
                    const enHorario = bloques
                      .filter((b) => b.asignatura_id === a.asignatura_id)
                      .reduce((t, b) => t + Math.round(duracionHoras(b.hora_inicio, b.hora_fin)), 0);
                    return (
                      <li key={a.id} className="flex items-center gap-3">
                        <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: ars.get(s?.area_id ?? '')?.color ?? 'var(--line-strong)' }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{s?.nombre}</span>
                          <span className="block truncate text-xs text-muted">{nombreDocente(docs.get(a.docente_id), true)}</span>
                        </span>
                        {enHorario !== a.horas_semanales && (
                          <Insignia tono="warn">
                            {enHorario} de {a.horas_semanales} h en horario
                          </Insignia>
                        )}
                        <span className="w-12 text-right text-sm font-medium tabular-nums">{a.horas_semanales} h</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-4 flex justify-between border-t border-line pt-3 text-sm font-medium">
                  <span>Total semanal</span>
                  <span className="tabular-nums">{horasPlan} h</span>
                </p>
              </>
            )}
          </Tarjeta>
        </div>

        {sede?.direccion && (
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <MapPin className="size-4" /> {sede.nombre} · {sede.direccion}
          </p>
        )}
      </div>
    </>
  );
}
