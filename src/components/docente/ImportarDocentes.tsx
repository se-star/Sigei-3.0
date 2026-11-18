import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import { Boton, Insignia, Modal } from '@/components/ui';
import { useMutar, useTabla } from '@/hooks/useDatos';
import { useToast } from '@/hooks/useToast';
import { analizarFilas, cambiosDe, descargarPlantilla, leerArchivo, type FilaImportada } from '@/lib/docentesExcel';
import { cx } from '@/lib/utils';

type Estado = 'nuevo' | 'actualizar' | 'omitir' | 'error';

/** Importa varios docentes desde la plantilla de Excel (o un CSV), con vista previa fila por fila. */
export function ImportarDocentes({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { data: docentes = [] } = useTabla('docentes');
  const { data: areas = [] } = useTabla('areas');
  const { data: sedes = [] } = useTabla('sedes');
  const { crear, editar } = useMutar('docentes');
  const toast = useToast();
  const entrada = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<string>('');
  const [filas, setFilas] = useState<FilaImportada[] | null>(null);
  const [errorArchivo, setErrorArchivo] = useState('');
  const [actualizar, setActualizar] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(null);

  const reiniciar = () => {
    setArchivo('');
    setFilas(null);
    setErrorArchivo('');
    setActualizar(false);
    setProgreso(null);
    if (entrada.current) entrada.current.value = '';
  };
  const cerrar = () => {
    if (progreso) return; // no cerrar a mitad de la importación
    reiniciar();
    onCerrar();
  };

  const elegir = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.(xlsx|csv)$/i.test(f.name)) return toast.error('Use un archivo de Excel (.xlsx) o CSV.');
    if (f.size > 5 * 1024 * 1024) return toast.error('El archivo supera 5 MB.');
    setLeyendo(true);
    setArchivo(f.name);
    try {
      const hoja = await leerArchivo(f);
      const r = analizarFilas(hoja, { areas, sedes, existentes: docentes });
      setErrorArchivo(r.error ?? (r.filas.length ? '' : 'El archivo no tiene docentes: llene al menos una fila debajo de los encabezados.'));
      setFilas(r.error ? null : r.filas);
    } catch {
      setFilas(null);
      setErrorArchivo('No pudimos leer el archivo. Verifique que sea la plantilla de Excel (.xlsx) y que no esté protegida con contraseña.');
    } finally {
      setLeyendo(false);
    }
  };

  const estado = (f: FilaImportada): Estado => (f.errores.length ? 'error' : f.existente ? (actualizar ? 'actualizar' : 'omitir') : 'nuevo');
  const cuenta = (e: Estado) => (filas ?? []).filter((f) => estado(f) === e).length;
  const aImportar = (filas ?? []).filter((f) => ['nuevo', 'actualizar'].includes(estado(f)));
  const existentes = (filas ?? []).filter((f) => f.existente && !f.errores.length).length;

  const importar = async () => {
    if (!aImportar.length) return;
    setProgreso({ hechos: 0, total: aImportar.length });
    let creados = 0;
    let actualizados = 0;
    const fallidos: string[] = [];
    for (const f of aImportar) {
      try {
        if (f.existente) {
          await editar.mutateAsync({ id: f.existente.id, cambios: cambiosDe(f) });
          actualizados++;
        } else {
          await crear.mutateAsync(f.datos);
          creados++;
        }
      } catch (e) {
        fallidos.push(`Fila ${f.fila}: ${(e as Error).message}`);
      }
      setProgreso((p) => (p ? { ...p, hechos: p.hechos + 1 } : p));
    }
    const partes = [creados && `${creados} ${creados === 1 ? 'docente creado' : 'docentes creados'}`, actualizados && `${actualizados} actualizados`].filter(Boolean);
    if (partes.length) toast.ok(`${partes.join(' y ')}.`);
    if (fallidos.length) toast.error(`${fallidos.length} no se pudieron guardar. ${fallidos[0]}`);
    setProgreso(null);
    reiniciar();
    onCerrar();
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Importar docentes desde Excel"
      descripcion="Cargue la plantilla de SIGEI con un docente por fila. Antes de guardar verá qué se creará y qué tiene errores."
      ancho="xl"
      pie={
        <>
          <Boton variante="secundario" onClick={cerrar} disabled={!!progreso}>
            Cancelar
          </Boton>
          <Boton onClick={importar} disabled={!aImportar.length} cargando={!!progreso}>
            {progreso
              ? `Guardando ${progreso.hechos} de ${progreso.total}…`
              : aImportar.length === 1
                ? 'Importar 1 docente'
                : `Importar ${aImportar.length} docentes`}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <input
          ref={entrada}
          id="importar-docentes-archivo"
          type="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="sr-only"
          onChange={(e) => elegir(e.target.files?.[0])}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              elegir(e.dataTransfer.files?.[0]);
            }}
            className="flex flex-1 items-center gap-3 rounded-[20px] border border-dashed border-line-strong p-4 text-left transition hover:border-brand hover:bg-brand-soft/40"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2">
              <Upload className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{leyendo ? 'Leyendo…' : archivo || 'Elegir archivo de Excel'}</span>
              <span className="block text-sm text-muted">{archivo ? 'Toque para elegir otro' : '.xlsx o .csv · también puede arrastrarlo aquí'}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => descargarPlantilla(areas, sedes).catch((e) => toast.error(e))}
            className="flex items-center gap-3 rounded-[20px] bg-surface-2 p-4 text-left transition hover:bg-surface-3 sm:w-64"
          >
            <FileSpreadsheet className="size-5 shrink-0 text-ok" />
            <span>
              <span className="block text-sm font-semibold">¿No tiene la plantilla?</span>
              <span className="block text-xs text-muted">Descárguela, llénela y súbala aquí.</span>
            </span>
          </button>
        </div>

        {errorArchivo && (
          <p className="flex items-start gap-2 rounded-[16px] bg-danger-soft px-4 py-3 text-sm text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {errorArchivo}
          </p>
        )}

        {filas && filas.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Insignia tono="ok">{cuenta('nuevo')} nuevos</Insignia>
              {existentes > 0 && <Insignia tono="info">{existentes} ya existen</Insignia>}
              {cuenta('error') > 0 && <Insignia tono="danger">{cuenta('error')} con errores</Insignia>}
              {existentes > 0 && (
                <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={actualizar} onChange={(e) => setActualizar(e.target.checked)} className="size-4 accent-[var(--brand)]" />
                  Actualizar los que ya existen con los datos del archivo
                </label>
              )}
            </div>
            <div className="max-h-[46vh] overflow-auto rounded-[16px] border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-2 text-left text-xs font-semibold text-muted">
                  <tr>
                    <th className="px-3 py-2">Fila</th>
                    <th className="px-3 py-2">Documento</th>
                    <th className="px-3 py-2">Docente</th>
                    <th className="px-3 py-2">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filas.map((f) => {
                    const e = estado(f);
                    return (
                      <tr key={f.fila} className={cx(e === 'error' && 'bg-danger-soft/40')}>
                        <td className="px-3 py-2 align-top text-muted tabular-nums">{f.fila}</td>
                        <td className="px-3 py-2 align-top tabular-nums">{f.datos.documento || '—'}</td>
                        <td className="px-3 py-2 align-top">
                          <span className="font-medium">{`${f.datos.nombres} ${f.datos.apellidos}`.trim() || '—'}</span>
                          {f.datos.email && <span className="block text-xs text-muted">{f.datos.email}</span>}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {e === 'error' ? (
                            <span className="text-danger">{f.errores.join(' ')}</span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              {e === 'nuevo' && <CheckCircle2 className="size-4 text-ok" />}
                              {e === 'nuevo' ? 'Se creará' : e === 'actualizar' ? 'Se actualizará' : 'Ya existe: se omitirá'}
                            </span>
                          )}
                          {f.avisos.length > 0 && e !== 'error' && <span className="mt-0.5 block text-xs text-warn">{f.avisos.join(' ')}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {cuenta('error') > 0 && <p className="text-xs text-muted">Las filas con errores no se importan. Corríjalas en el archivo y vuelva a subirlo.</p>}
          </>
        )}
      </div>
    </Modal>
  );
}
