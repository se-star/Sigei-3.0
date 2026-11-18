import { useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { Boton, Entrada, Tarjeta } from '@/components/ui';
import { useAjustes, useTabla } from '@/hooks/useDatos';
import { interpretar, proponer, type Interpretacion, type Marca } from '@/lib/asistenteHorario';
import { horasProgramadas } from '@/lib/programador';
import type { Dia, Grupo, ID } from '@/lib/types';
import { cx, nombreDocente } from '@/lib/utils';

export interface ResultadoAsistente {
  docente?: ID;
  grupo?: ID;
  asignatura?: ID;
  marcas: Marca[];
}

interface Respuesta {
  entendido: { etiqueta: string; valor: string }[];
  faltan: string[];
  avisos: string[];
  marcadas: number;
  opcionesGrupo: Grupo[];
}

const DIAS_TXT = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const lista = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : (xs[0] ?? ''));

/** Caja para describir la clase en una frase; propone las franjas en la cuadrícula del programador. */
export function AsistenteClases({
  actual,
  diasSemana,
  onProponer,
  guardar,
}: {
  /** Botón para guardar lo propuesto sin bajar hasta el formulario. */
  guardar?: ReactNode;
  actual: { docente: ID; grupo: ID; asignatura: ID; aula: string };
  diasSemana: Dia[];
  onProponer: (r: ResultadoAsistente) => void;
}) {
  const ajustes = useAjustes();
  const { data: horarios = [] } = useTabla('horarios');
  const { data: asignaciones = [] } = useTabla('asignaciones');
  const { data: docentes = [] } = useTabla('docentes');
  const { data: grupos = [] } = useTabla('grupos');
  const { data: grados = [] } = useTabla('grados');
  const { data: asignaturas = [] } = useTabla('asignaturas');
  const [texto, setTexto] = useState('');
  const [resp, setResp] = useState<Respuesta | null>(null);

  const aplicar = (frase: string, grupoForzado?: ID) => {
    if (!frase.trim()) return;
    const r: Interpretacion = interpretar(frase, { asignaturas, grupos, grados, docentes, asignaciones });
    const entendido: Respuesta['entendido'] = [];
    const faltan: string[] = [];
    const avisos: string[] = [];

    const grupo = grupoForzado ? grupos.find((g) => g.id === grupoForzado) : r.grupo;
    if (!grupo && r.grado && r.gruposDelGrado.length) {
      setResp({
        entendido: [{ etiqueta: 'Grado', valor: r.grado.nombre }],
        faltan: [],
        avisos: [`${r.grado.nombre} tiene ${r.gruposDelGrado.length} grupos. ¿En cuál?`],
        marcadas: 0,
        opcionesGrupo: r.gruposDelGrado,
      });
      return;
    }
    const grupoId = grupo?.id ?? actual.grupo;
    const asignaturaId = r.asignatura?.id ?? actual.asignatura;
    // Docente: el nombrado; si no, el de la asignación del grupo; si no, el que ya estaba elegido.
    const deLaAsignacion = asignaciones.find((a) => a.grupo_id === grupoId && a.asignatura_id === asignaturaId);
    let docenteId = r.docente && !r.docenteSugerido ? r.docente.id : (deLaAsignacion?.docente_id ?? actual.docente);
    if (r.docente && !r.docenteSugerido && deLaAsignacion && deLaAsignacion.docente_id !== r.docente.id) {
      const otro = docentes.find((d) => d.id === deLaAsignacion.docente_id);
      avisos.push(`${r.asignatura?.nombre ?? 'Esa asignatura'} en ${grupo?.nombre ?? 'ese grupo'} ya la tiene ${nombreDocente(otro)}.`);
      docenteId = r.docente.id;
    }

    if (r.asignatura) entendido.push({ etiqueta: 'Asignatura', valor: r.asignatura.nombre });
    if (grupo) entendido.push({ etiqueta: 'Grupo', valor: grupo.nombre });
    const doc = docentes.find((d) => d.id === docenteId);
    if (doc)
      entendido.push({ etiqueta: 'Docente', valor: `${nombreDocente(doc, true)}${!r.docente || r.docenteSugerido ? ' (de la asignación)' : ''}` });
    if (r.bloques.length) entendido.push({ etiqueta: r.bloques.length === 1 ? 'Bloque' : 'Bloques', valor: lista(r.bloques.map(String)) });
    if (r.dias.length) entendido.push({ etiqueta: r.dias.length === 1 ? 'Día' : 'Días', valor: lista(r.dias.map((x) => DIAS_TXT[x])) });
    if (r.horas) entendido.push({ etiqueta: 'Horas', valor: String(r.horas) });

    if (!asignaturaId) faltan.push('la asignatura');
    if (!grupoId) faltan.push('el grupo (por ejemplo 7°2)');
    if (!docenteId) faltan.push('el docente');

    let marcas: Marca[] = [];
    if (!faltan.length && !avisos.length) {
      const pendientes = deLaAsignacion && deLaAsignacion.docente_id === docenteId ? deLaAsignacion.horas_semanales - horasProgramadas(deLaAsignacion, horarios) : undefined;
      const p = proponer(r, {
        franjas: ajustes.franjas,
        horarios,
        sel: { docente_id: docenteId, grupo_id: grupoId, asignatura_id: asignaturaId, aula: actual.aula },
        pendientes,
        diasSemana,
      });
      marcas = p.marcas;
      avisos.push(...p.avisos);
    }
    onProponer({ docente: docenteId || undefined, grupo: grupoId || undefined, asignatura: asignaturaId || undefined, marcas });
    setResp({ entendido, faltan, avisos, marcadas: marcas.length, opcionesGrupo: [] });
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    aplicar(texto);
  };

  return (
    <Tarjeta titulo="Asistente" icono={<Sparkles className="size-4" />}>
      <form onSubmit={enviar} className="flex flex-col gap-2.5">
        <label htmlFor="asistente-clases" className="text-sm text-muted">
          Describa la clase: asignatura, grupo o grado, bloque y, si quiere, el día y el docente.
        </label>
        <Entrada
          id="asistente-clases"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ej.: Matemáticas 7°2 bloques 1 y 2 lunes y jueves"
          autoComplete="off"
        />
        <Boton type="submit" variante="secundario" disabled={!texto.trim()} icono={<Sparkles className="size-4" />}>
          Proponer en el horario
        </Boton>
      </form>
      {resp && (
        <div className="mt-3 flex flex-col gap-2 text-sm" aria-live="polite">
          {resp.entendido.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {resp.entendido.map((x) => (
                <span key={x.etiqueta} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs">
                  <span className="text-muted">{x.etiqueta}:</span> <span className="font-semibold">{x.valor}</span>
                </span>
              ))}
            </div>
          )}
          {resp.faltan.length > 0 && (
            <p className="flex items-start gap-1.5 text-warn">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> No identifiqué {lista(resp.faltan)}. Escríbalo o elíjalo abajo.
            </p>
          )}
          {resp.marcadas > 0 && (
            <p className="flex items-start gap-1.5 font-medium text-ok">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              Marqué {resp.marcadas === 1 ? '1 franja' : `${resp.marcadas} franjas`}. Revíselas en el horario y guarde.
            </p>
          )}
          {resp.marcadas > 0 && guardar && <div>{guardar}</div>}
          {resp.avisos.map((a) => (
            <p key={a} className={cx('flex items-start gap-1.5', resp.opcionesGrupo.length ? 'text-ink-2' : 'text-warn')}>
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {a}
            </p>
          ))}
          {resp.opcionesGrupo.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {resp.opcionesGrupo.map((g) => (
                <Boton key={g.id} tam="sm" variante="secundario" onClick={() => aplicar(texto, g.id)}>
                  {g.nombre}
                </Boton>
              ))}
            </div>
          )}
        </div>
      )}
    </Tarjeta>
  );
}
