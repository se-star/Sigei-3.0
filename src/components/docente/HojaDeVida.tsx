import { useEffect, useRef, useState } from 'react';
import { FileText, GraduationCap, Pencil, Plus, Trash2, Upload, BriefcaseBusiness } from 'lucide-react';
import { AreaTexto, Boton, Campo, Entrada, Modal, Selector, Tarjeta, Vacio } from '@/components/ui';
import { useAbrirSoporte } from '@/components/Soportes';
import { backend } from '@/lib/backend';
import { validarSoporte } from '@/lib/data/provider';
import { useMutar } from '@/hooks/useDatos';
import { useConfirmar } from '@/hooks/useConfirmar';
import { useToast } from '@/hooks/useToast';
import { CATEGORIAS_DOCUMENTO, etiqueta, NIVELES_FORMACION } from '@/lib/catalogos';
import type { CategoriaDocumento, Docente, DocumentoDocente, Experiencia, Formacion, NivelFormacion } from '@/lib/types';
import { fechaCorta } from '@/lib/utils';

const nuevoId = () => Math.random().toString(36).slice(2, 10);
const ANIO = new Date().getFullYear();

/** Guarda solo los campos de la hoja de vida, sin tocar el resto del registro. */
function useGuardarHoja(d: Docente) {
  const { editar } = useMutar('docentes');
  const toast = useToast();
  return {
    pendiente: editar.isPending,
    guardar: async (cambios: Partial<Pick<Docente, 'formacion' | 'experiencia' | 'documentos'>>, mensaje: string) => {
      try {
        await editar.mutateAsync({ id: d.id, cambios });
        toast.ok(mensaje);
        return true;
      } catch (e) {
        toast.error(e);
        return false;
      }
    },
  };
}

/* ───────── Formación ───────── */

export function TarjetaFormacion({ d, puede }: { d: Docente; puede: boolean }) {
  const lista = [...(d.formacion ?? [])].sort((a, b) => (b.anio ?? 0) - (a.anio ?? 0));
  const { guardar } = useGuardarHoja(d);
  const confirmar = useConfirmar();
  const [form, setForm] = useState<{ abierto: boolean; f?: Formacion }>({
    abierto: false,
  });
  const quitar = async (f: Formacion) => {
    if (
      !(await confirmar({
        titulo: 'Quitar título',
        texto: `Se quitará «${f.titulo}» de la hoja de vida.`,
        confirmar: 'Quitar',
        peligro: true,
      }))
    )
      return;
    await guardar({ formacion: (d.formacion ?? []).filter((x) => x.id !== f.id) }, 'Título quitado.');
  };
  return (
    <Tarjeta
      titulo="Formación académica"
      icono={<GraduationCap className="size-4" />}
      accion={
        puede && (
          <Boton tam="sm" variante="fantasma" icono={<Plus className="size-4" />} onClick={() => setForm({ abierto: true })} className="no-print">
            Agregar
          </Boton>
        )
      }
    >
      {lista.length === 0 ? (
        <p className="py-2 text-sm text-muted">Sin títulos registrados.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {lista.map((f) => (
            <li key={f.id} className="group flex items-start gap-3 py-3 first:pt-1">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{f.titulo}</p>
                <p className="text-sm text-muted">
                  {etiqueta(NIVELES_FORMACION, f.nivel)}
                  {f.institucion && ` · ${f.institucion}`}
                  {f.anio && ` · ${f.anio}`}
                </p>
              </div>
              {puede && (
                <span className="no-print flex gap-1">
                  <Boton tam="icono" variante="fantasma" aria-label={`Editar ${f.titulo}`} onClick={() => setForm({ abierto: true, f })}>
                    <Pencil className="size-4" />
                  </Boton>
                  <Boton
                    tam="icono"
                    variante="fantasma"
                    aria-label={`Quitar ${f.titulo}`}
                    onClick={() => quitar(f)}
                    className="text-danger hover:bg-danger-soft"
                  >
                    <Trash2 className="size-4" />
                  </Boton>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <FormFormacion d={d} {...form} onCerrar={() => setForm({ abierto: false })} />
    </Tarjeta>
  );
}

function FormFormacion({ d, abierto, f, onCerrar }: { d: Docente; abierto: boolean; f?: Formacion; onCerrar: () => void }) {
  const { guardar, pendiente } = useGuardarHoja(d);
  const toast = useToast();
  const vacio: Formacion = {
    id: '',
    nivel: 'profesional',
    titulo: '',
    institucion: '',
    anio: null,
  };
  const [v, setV] = useState<Formacion>(vacio);
  useEffect(() => {
    if (abierto) setV(f ? { ...f } : { ...vacio, id: nuevoId() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, f]);
  const enviar = async () => {
    if (!v.titulo.trim()) return toast.error('Escriba el nombre del título.');
    if (v.anio && (v.anio < 1950 || v.anio > ANIO + 1)) return toast.error(`El año debe estar entre 1950 y ${ANIO + 1}.`);
    const fila = {
      ...v,
      titulo: v.titulo.trim(),
      institucion: v.institucion.trim(),
    };
    const lista = f ? (d.formacion ?? []).map((x) => (x.id === f.id ? fila : x)) : [...(d.formacion ?? []), fila];
    if (await guardar({ formacion: lista }, f ? 'Título actualizado.' : 'Título agregado.')) onCerrar();
  };
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={f ? 'Editar título' : 'Agregar título'}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={enviar} cargando={pendiente}>
            Guardar
          </Boton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nivel" className="sm:col-span-2">
          {(id) => (
            <Selector id={id} value={v.nivel} onChange={(e) => setV({ ...v, nivel: e.target.value as NivelFormacion })}>
              {NIVELES_FORMACION.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </Selector>
          )}
        </Campo>
        <Campo etiqueta="Título obtenido" requerido className="sm:col-span-2">
          {(id) => (
            <Entrada
              id={id}
              value={v.titulo}
              onChange={(e) => setV({ ...v, titulo: e.target.value })}
              placeholder="Ej.: Licenciatura en Matemáticas"
            />
          )}
        </Campo>
        <Campo etiqueta="Institución">
          {(id) => <Entrada id={id} value={v.institucion} onChange={(e) => setV({ ...v, institucion: e.target.value })} placeholder="Universidad" />}
        </Campo>
        <Campo etiqueta="Año de grado">
          {(id) => (
            <Entrada
              id={id}
              type="number"
              inputMode="numeric"
              min={1950}
              max={ANIO + 1}
              value={v.anio ?? ''}
              onChange={(e) =>
                setV({
                  ...v,
                  anio: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          )}
        </Campo>
      </div>
    </Modal>
  );
}

/* ───────── Experiencia ───────── */

export function TarjetaExperiencia({ d, puede }: { d: Docente; puede: boolean }) {
  const lista = [...(d.experiencia ?? [])].sort((a, b) => (b.hasta ?? 9999) - (a.hasta ?? 9999) || (b.desde ?? 0) - (a.desde ?? 0));
  const { guardar } = useGuardarHoja(d);
  const confirmar = useConfirmar();
  const [form, setForm] = useState<{ abierto: boolean; e?: Experiencia }>({
    abierto: false,
  });
  const quitar = async (e: Experiencia) => {
    if (
      !(await confirmar({
        titulo: 'Quitar experiencia',
        texto: `Se quitará «${e.cargo} · ${e.institucion}».`,
        confirmar: 'Quitar',
        peligro: true,
      }))
    )
      return;
    await guardar({ experiencia: (d.experiencia ?? []).filter((x) => x.id !== e.id) }, 'Experiencia quitada.');
  };
  return (
    <Tarjeta
      titulo="Experiencia"
      icono={<BriefcaseBusiness className="size-4" />}
      accion={
        puede && (
          <Boton tam="sm" variante="fantasma" icono={<Plus className="size-4" />} onClick={() => setForm({ abierto: true })} className="no-print">
            Agregar
          </Boton>
        )
      }
    >
      {lista.length === 0 ? (
        <p className="py-2 text-sm text-muted">Sin experiencia registrada antes de esta institución.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {lista.map((e) => (
            <li key={e.id} className="flex items-start gap-3 py-3 first:pt-1">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{e.cargo}</p>
                <p className="text-sm text-muted">
                  {e.institucion}
                  {(e.desde || e.hasta) && ` · ${e.desde ?? '¿?'} – ${e.hasta ?? 'actual'}`}
                </p>
              </div>
              {puede && (
                <span className="no-print flex gap-1">
                  <Boton tam="icono" variante="fantasma" aria-label={`Editar ${e.cargo}`} onClick={() => setForm({ abierto: true, e })}>
                    <Pencil className="size-4" />
                  </Boton>
                  <Boton
                    tam="icono"
                    variante="fantasma"
                    aria-label={`Quitar ${e.cargo}`}
                    onClick={() => quitar(e)}
                    className="text-danger hover:bg-danger-soft"
                  >
                    <Trash2 className="size-4" />
                  </Boton>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <FormExperiencia d={d} {...form} onCerrar={() => setForm({ abierto: false })} />
    </Tarjeta>
  );
}

function FormExperiencia({ d, abierto, e, onCerrar }: { d: Docente; abierto: boolean; e?: Experiencia; onCerrar: () => void }) {
  const { guardar, pendiente } = useGuardarHoja(d);
  const toast = useToast();
  const vacio: Experiencia = {
    id: '',
    cargo: '',
    institucion: '',
    desde: null,
    hasta: null,
  };
  const [v, setV] = useState<Experiencia>(vacio);
  useEffect(() => {
    if (abierto) setV(e ? { ...e } : { ...vacio, id: nuevoId() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, e]);
  const anio = (s: string) => (s ? Number(s) : null);
  const enviar = async () => {
    if (!v.cargo.trim() || !v.institucion.trim()) return toast.error('Escriba el cargo y la institución.');
    if (v.desde && v.hasta && v.hasta < v.desde) return toast.error('El año final no puede ser anterior al inicial.');
    const fila = {
      ...v,
      cargo: v.cargo.trim(),
      institucion: v.institucion.trim(),
    };
    const lista = e ? (d.experiencia ?? []).map((x) => (x.id === e.id ? fila : x)) : [...(d.experiencia ?? []), fila];
    if (await guardar({ experiencia: lista }, e ? 'Experiencia actualizada.' : 'Experiencia agregada.')) onCerrar();
  };
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={e ? 'Editar experiencia' : 'Agregar experiencia'}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={enviar} cargando={pendiente}>
            Guardar
          </Boton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Cargo" requerido className="sm:col-span-2">
          {(id) => <Entrada id={id} value={v.cargo} onChange={(x) => setV({ ...v, cargo: x.target.value })} placeholder="Ej.: Docente de aula" />}
        </Campo>
        <Campo etiqueta="Institución" requerido className="sm:col-span-2">
          {(id) => <Entrada id={id} value={v.institucion} onChange={(x) => setV({ ...v, institucion: x.target.value })} />}
        </Campo>
        <Campo etiqueta="Desde (año)">
          {(id) => (
            <Entrada
              id={id}
              type="number"
              inputMode="numeric"
              min={1960}
              max={ANIO}
              value={v.desde ?? ''}
              onChange={(x) => setV({ ...v, desde: anio(x.target.value) })}
            />
          )}
        </Campo>
        <Campo etiqueta="Hasta (año)" ayuda="Vacío si es el trabajo actual.">
          {(id) => (
            <Entrada
              id={id}
              type="number"
              inputMode="numeric"
              min={1960}
              max={ANIO}
              value={v.hasta ?? ''}
              onChange={(x) => setV({ ...v, hasta: anio(x.target.value) })}
            />
          )}
        </Campo>
      </div>
    </Modal>
  );
}

/* ───────── Documentos ───────── */

export function TarjetaDocumentos({ d, puede }: { d: Docente; puede: boolean }) {
  const docs = [...(d.documentos ?? [])].sort((a, b) => b.subido_en.localeCompare(a.subido_en));
  const { guardar } = useGuardarHoja(d);
  const confirmar = useConfirmar();
  const toast = useToast();
  const abrir = useAbrirSoporte();
  const [subir, setSubir] = useState(false);
  const quitar = async (doc: DocumentoDocente) => {
    if (
      !(await confirmar({
        titulo: 'Eliminar documento',
        texto: `Se eliminará «${doc.nombre}». Esta acción no se puede deshacer.`,
        confirmar: 'Eliminar',
        peligro: true,
      }))
    )
      return;
    if (await guardar({ documentos: (d.documentos ?? []).filter((x) => x.id !== doc.id) }, 'Documento eliminado.')) {
      backend.datos.borrarSoportes([doc.ruta]).catch(() => toast.error('El documento se quitó de la lista, pero el archivo no se pudo borrar.'));
    }
  };
  return (
    <Tarjeta
      titulo="Documentos"
      icono={<FileText className="size-4" />}
      accion={
        puede && (
          <Boton tam="sm" variante="fantasma" icono={<Upload className="size-4" />} onClick={() => setSubir(true)} className="no-print">
            Subir
          </Boton>
        )
      }
    >
      {docs.length === 0 ? (
        <Vacio
          icono={<FileText className="size-5" />}
          titulo="Sin documentos"
          texto="Suba títulos, el acto de nombramiento o certificados en PDF o imagen, de hasta 5 MB."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-3 first:pt-1">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                <FileText className="size-4" />
              </span>
              <button type="button" onClick={() => abrir(doc)} className="min-w-0 flex-1 text-left hover:text-brand">
                <span className="block truncate font-semibold">{doc.descripcion || doc.nombre}</span>
                <span className="block truncate text-sm text-muted">
                  {etiqueta(CATEGORIAS_DOCUMENTO, doc.categoria)} · {fechaCorta(doc.subido_en.slice(0, 10))}
                </span>
              </button>
              {puede && (
                <Boton
                  tam="icono"
                  variante="fantasma"
                  aria-label={`Eliminar ${doc.nombre}`}
                  onClick={() => quitar(doc)}
                  className="no-print text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="size-4" />
                </Boton>
              )}
            </li>
          ))}
        </ul>
      )}
      <SubirDocumento d={d} abierto={subir} onCerrar={() => setSubir(false)} />
    </Tarjeta>
  );
}

function SubirDocumento({ d, abierto, onCerrar }: { d: Docente; abierto: boolean; onCerrar: () => void }) {
  const { guardar } = useGuardarHoja(d);
  const toast = useToast();
  const entrada = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [categoria, setCategoria] = useState<CategoriaDocumento>('titulo');
  const [descripcion, setDescripcion] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  useEffect(() => {
    if (abierto) {
      setArchivo(null);
      setCategoria('titulo');
      setDescripcion('');
    }
  }, [abierto]);

  const elegir = (f: File | undefined) => {
    if (!f) return;
    const error = validarSoporte(f);
    if (error) return toast.error(error);
    setArchivo(f);
    if (!descripcion) setDescripcion(f.name.replace(/\.[^.]+$/, ''));
  };

  const enviar = async () => {
    if (!archivo) return toast.error('Elija el archivo.');
    setSubiendo(true);
    try {
      const s = await backend.datos.subirSoporte(archivo, d.id);
      const doc: DocumentoDocente = {
        ...s,
        id: nuevoId(),
        categoria,
        descripcion: descripcion.trim(),
        subido_en: new Date().toISOString(),
      };
      if (await guardar({ documentos: [...(d.documentos ?? []), doc] }, 'Documento subido.')) onCerrar();
      else backend.datos.borrarSoportes([s.ruta]).catch(() => {});
    } catch (e) {
      toast.error(e);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Subir documento"
      descripcion="PDF, JPG, PNG o WEBP de hasta 5 MB. Solo lo ven los directivos y el propio docente."
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={enviar} cargando={subiendo} disabled={!archivo}>
            Subir
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <input
          ref={entrada}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          id="doc-archivo"
          onChange={(e) => elegir(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          className="flex items-center gap-3 rounded-[20px] border border-dashed border-line-strong p-4 text-left transition hover:border-brand hover:bg-brand-soft/40"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2">
            <Upload className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{archivo ? archivo.name : 'Elegir archivo'}</span>
            <span className="block text-sm text-muted">
              {archivo ? `${Math.max(1, Math.round(archivo.size / 1024))} KB` : 'Desde su computador o celular'}
            </span>
          </span>
        </button>
        <Campo etiqueta="Tipo de documento">
          {(id) => (
            <Selector id={id} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaDocumento)}>
              {CATEGORIAS_DOCUMENTO.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </Selector>
          )}
        </Campo>
        <Campo etiqueta="Descripción">
          {(id) => (
            <AreaTexto
              id={id}
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej.: Diploma de Licenciatura en Matemáticas"
            />
          )}
        </Campo>
      </div>
    </Modal>
  );
}
