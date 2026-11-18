import { useState } from 'react';
import { BookOpenCheck, Check } from 'lucide-react';
import { Boton, Modal } from '@/components/ui';
import { useMutar, useTabla } from '@/hooks/useDatos';
import { useToast } from '@/hooks/useToast';
import { areaEquivalente, asignaturaEquivalente, nivelesTexto, PLAN_MEN, type AreaMEN, type AsignaturaMEN } from '@/lib/planEstudios';
import { cx } from '@/lib/utils';

const claveDe = (a: AreaMEN, s: AsignaturaMEN) => `${a.nombre}::${s.nombre}`;

/** Agrega áreas y asignaturas del plan de estudios oficial (MEN) que la institución aún no tiene. */
export function PlanEstudiosMEN({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { data: areas = [] } = useTabla('areas');
  const { data: asignaturas = [] } = useTabla('asignaturas');
  const mA = useMutar('areas');
  const mS = useMutar('asignaturas');
  const toast = useToast();
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  const existe = (s: AsignaturaMEN) => !!asignaturaEquivalente(s, asignaturas);
  const libres = PLAN_MEN.flatMap((a) => a.asignaturas.filter((s) => !existe(s)).map((s) => claveDe(a, s)));
  // Lo básico: la asignatura principal de cada área obligatoria (sin preescolar ni las de la media).
  const basicas = PLAN_MEN.filter((a) => a.norma.includes('art. 23')).map((a) => claveDe(a, a.asignaturas[0])).filter((k) => libres.includes(k));
  const alternar = (k: string) => setMarcadas((m) => (m.includes(k) ? m.filter((x) => x !== k) : [...m, k]));

  const cerrar = () => {
    if (guardando) return;
    setMarcadas([]);
    onCerrar();
  };

  const guardar = async () => {
    if (!marcadas.length) return toast.error('Marque al menos una asignatura.');
    setGuardando(true);
    let nuevasAreas = 0;
    let nuevas = 0;
    try {
      const creadas = new Map<string, string>(); // área MEN → id
      for (const a of PLAN_MEN) {
        const elegidas = a.asignaturas.filter((s) => marcadas.includes(claveDe(a, s)) && !existe(s));
        if (!elegidas.length) continue;
        let areaId = areaEquivalente(a, areas)?.id ?? creadas.get(a.nombre);
        if (!areaId) {
          const nueva = await mA.crear.mutateAsync({ nombre: a.nombre, color: a.color });
          areaId = nueva.id;
          creadas.set(a.nombre, areaId);
          nuevasAreas++;
        }
        for (const s of elegidas) {
          await mS.crear.mutateAsync({ nombre: s.nombre, area_id: areaId });
          nuevas++;
        }
      }
      toast.ok(
        `Se ${nuevas === 1 ? 'agregó 1 asignatura' : `agregaron ${nuevas} asignaturas`}${nuevasAreas ? ` y ${nuevasAreas === 1 ? '1 área' : `${nuevasAreas} áreas`}` : ''}.`,
      );
      setMarcadas([]);
      onCerrar();
    } catch (e) {
      toast.error(nuevas ? `Se agregaron ${nuevas} asignaturas y luego hubo un error: ${(e as Error).message}` : e);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Plan de estudios del MEN"
      descripcion="Áreas obligatorias y fundamentales de la Ley 115 de 1994 (arts. 23 y 31), dimensiones de preescolar y cátedras de ley. Marque las asignaturas que ofrece su institución."
      ancho="xl"
      pie={
        <>
          <Boton variante="secundario" onClick={cerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={guardando} disabled={!marcadas.length}>
            {marcadas.length === 1 ? 'Agregar 1 asignatura' : `Agregar ${marcadas.length} asignaturas`}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-2">
          <Boton tam="sm" variante="secundario" onClick={() => setMarcadas([...new Set([...marcadas, ...basicas])])} disabled={!basicas.length}>
            Marcar las 9 áreas obligatorias
          </Boton>
          <Boton tam="sm" variante="secundario" onClick={() => setMarcadas(libres)} disabled={!libres.length}>
            Marcar todo
          </Boton>
          <Boton tam="sm" variante="fantasma" onClick={() => setMarcadas([])} disabled={!marcadas.length}>
            Quitar marcas
          </Boton>
        </div>
        {PLAN_MEN.map((a) => {
          const equivalente = areaEquivalente(a, areas);
          const deArea = a.asignaturas.filter((s) => !existe(s)).map((s) => claveDe(a, s));
          const todas = deArea.length > 0 && deArea.every((k) => marcadas.includes(k));
          return (
            <fieldset key={a.nombre} className="rounded-[20px] border border-line p-4">
              <legend className="sr-only">{a.nombre}</legend>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ background: equivalente?.color ?? a.color }} aria-hidden />
                  <div className="min-w-0">
                    <p className="font-semibold">{a.nombreLegal ?? a.nombre}</p>
                    <p className="text-xs text-muted">
                      {a.norma}
                      {equivalente ? ` · se agregan a su área «${equivalente.nombre}»` : ' · se creará el área'}
                    </p>
                  </div>
                </div>
                {deArea.length > 0 && (
                  <button
                    type="button"
                    className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
                    onClick={() => setMarcadas(todas ? marcadas.filter((k) => !deArea.includes(k)) : [...new Set([...marcadas, ...deArea])])}
                  >
                    {todas ? 'Quitar el área' : 'Marcar el área'}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {a.asignaturas.map((s) => {
                  const k = claveDe(a, s);
                  const ya = existe(s);
                  const sel = ya || marcadas.includes(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={ya}
                      aria-pressed={sel}
                      title={[s.nota, ya ? `Ya existe como «${asignaturaEquivalente(s, asignaturas)?.nombre}».` : ''].filter(Boolean).join(' ') || undefined}
                      onClick={() => alternar(k)}
                      className={cx(
                        'flex flex-col items-start rounded-[16px] border px-3.5 py-2 text-left text-sm transition',
                        ya
                          ? 'cursor-default border-transparent bg-surface-2 text-muted'
                          : sel
                            ? 'border-brand bg-brand text-brand-ink'
                            : 'border-line bg-surface hover:border-line-strong',
                      )}
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        {sel && <Check className="size-3.5" />}
                        {s.nombre}
                      </span>
                      <span className={cx('text-xs', sel && !ya ? 'opacity-80' : 'text-muted')}>{ya ? 'Ya está en SIGEI' : nivelesTexto(s.niveles)}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
        <p className="flex items-start gap-2 text-xs text-muted">
          <BookOpenCheck className="mt-0.5 size-4 shrink-0" />
          Cada institución organiza las asignaturas de cada área en su PEI y su plan de estudios. Después puede renombrarlas, quitarlas o agregar otras.
        </p>
      </div>
    </Modal>
  );
}
