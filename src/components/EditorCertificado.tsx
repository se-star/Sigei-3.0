import { useEffect, useRef, useState } from 'react';
import { Check, Download, FileText, ImageUp, RotateCcw, Save, Trash2 } from 'lucide-react';
import { AreaTexto, Boton, Campo, Entrada, Tarjeta } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAjustes, useMutar, useTabla } from '@/hooks/useDatos';
import { useConfirmar } from '@/hooks/useConfirmar';
import { useToast } from '@/hooks/useToast';
import { backend } from '@/lib/backend';
import {
  datosCertificado,
  FILAS_CERTIFICADO,
  generarCertificado,
  plantillaCompleta,
  PLANTILLA_DEFECTO,
  VARIABLES_CERTIFICADO,
  type PlantillaCertificado,
} from '@/lib/certificadoPermiso';
import type { Novedad } from '@/lib/types';
import { cx, descargarArchivo, hoyISO } from '@/lib/utils';

type CampoTexto = 'titulo' | 'encabezado' | 'parrafo' | 'nota' | 'cargo_firma' | 'pie';

/** Achica el escudo a 360 px como máximo y lo guarda como PNG en texto (data URL). */
async function escudoComoDataUrl(archivo: File): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => mal(new Error('No pudimos leer la imagen. Use un archivo PNG o JPG.'));
      i.src = url;
    });
    const esc = Math.min(1, 360 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * esc);
    c.height = Math.round(img.height * esc);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Configuración → Certificado de permisos: textos propios de la institución, con vista previa. */
export function EditorCertificado() {
  const ajustes = useAjustes();
  const { editar } = useMutar('instituciones');
  const { perfil } = useAuth();
  const { data: docentes = [] } = useTabla('docentes');
  const { data: sedes = [] } = useTabla('sedes');
  const toast = useToast();
  const confirmar = useConfirmar();
  const [p, setP] = useState<PlantillaCertificado>(() => plantillaCompleta(ajustes.plantilla_certificado));
  const [logo, setLogo] = useState(ajustes.logo_url);
  const [vista, setVista] = useState('');
  const [guardando, setGuardando] = useState(false);
  const ultimo = useRef<{ campo: CampoTexto; el: HTMLInputElement | HTMLTextAreaElement } | null>(null);
  const entradaLogo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setP(plantillaCompleta(ajustes.plantilla_certificado));
    setLogo(ajustes.logo_url);
  }, [ajustes.id, ajustes.updated_at]);

  const cambiar = <K extends keyof PlantillaCertificado>(k: K, v: PlantillaCertificado[K]) => setP((x) => ({ ...x, [k]: v }));

  // Ejemplo con un docente de la institución para la vista previa.
  const ejemplo = docentes.find((d) => d.estado === 'activo') ?? docentes[0];
  const armarPdf = async () => {
    const PDFLib = await import('pdf-lib');
    let bytes: Uint8Array | null = null;
    if (logo) {
      try {
        bytes = new Uint8Array(await (await fetch(logo)).arrayBuffer());
      } catch {
        bytes = null;
      }
    }
    // La firma de quien edita (Mi perfil → Firma), para ver cómo queda.
    let firma: Uint8Array | null = null;
    if (perfil?.id) {
      try {
        const url = await backend.datos.firmaDe(perfil.id);
        if (url) firma = new Uint8Array(await (await fetch(url)).arrayBuffer());
      } catch {
        firma = null;
      }
    }
    const hoy = hoyISO();
    const n: Novedad = {
      id: 'ejemplo-0001',
      created_at: new Date().toISOString(),
      docente_id: ejemplo?.id ?? '',
      tipo: 'calamidad',
      fecha_inicio: hoy,
      fecha_fin: hoy,
      horas: 0,
      motivo: 'Ejemplo: situación familiar que requiere su presencia.',
      estado: 'aprobada',
      reemplazo_id: null,
      revisado_por: perfil?.nombre || ajustes.rector || 'Rector(a)',
      revisado_en: new Date().toISOString(),
      observacion_revision: '',
      creado_por: null,
      soportes: [],
    };
    return generarCertificado(
      PDFLib,
      datosCertificado({
        n,
        docente: ejemplo ?? { nombres: 'Ana María', apellidos: 'Pérez Gómez', documento: '43000000', email: 'docente@institucion.edu.co' },
        sede: sedes.find((s) => s.id === ejemplo?.sede_id)?.nombre ?? sedes[0]?.nombre,
        institucion: { nombre: ajustes.nombre || 'Institución educativa', municipio: ajustes.municipio, logo: bytes },
        franjas: ajustes.franjas,
        tipo: 'Calamidad doméstica',
        revisor: { nombre: n.revisado_por!, rol: perfil?.rol === 'coordinador' ? 'coordinador' : 'rector', firma },
        plantilla: p,
      }),
    );
  };

  // Vista previa: se rehace medio segundo después del último cambio.
  useEffect(() => {
    let url = '';
    let vigente = true;
    const t = setTimeout(async () => {
      try {
        const pdf = await armarPdf();
        if (!vigente) return;
        url = URL.createObjectURL(new Blob([new Uint8Array(pdf) as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }));
        setVista(url);
      } catch (e) {
        console.error(e);
      }
    }, 500);
    return () => {
      vigente = false;
      clearTimeout(t);
      if (url) URL.revokeObjectURL(url);
    };
  }, [p, logo, ajustes.nombre, ajustes.municipio, ejemplo?.id]);

  /** Inserta {campo} donde estaba el cursor (o al final del párrafo). */
  const insertar = (clave: string) => {
    const destino = ultimo.current ?? null;
    const campo: CampoTexto = destino?.campo ?? 'parrafo';
    const actual = p[campo];
    const pos = destino ? (destino.el.selectionStart ?? actual.length) : actual.length;
    const fin = destino ? (destino.el.selectionEnd ?? pos) : pos;
    const token = `{${clave}}`;
    cambiar(campo, actual.slice(0, pos) + token + actual.slice(fin));
    requestAnimationFrame(() => {
      if (!destino) return;
      destino.el.focus();
      destino.el.setSelectionRange(pos + token.length, pos + token.length);
    });
  };
  const foco = (campo: CampoTexto) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    ultimo.current = { campo, el: e.currentTarget };
  };

  const subirLogo = async (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(png|jpe?g)$/.test(f.type)) return toast.error('Use una imagen PNG o JPG del escudo.');
    if (f.size > 4 * 1024 * 1024) return toast.error('La imagen supera 4 MB.');
    try {
      setLogo(await escudoComoDataUrl(f));
    } catch (e) {
      toast.error(e);
    }
    if (entradaLogo.current) entradaLogo.current.value = '';
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      // Solo se guarda lo que difiere de los textos de SIGEI.
      const propio = Object.fromEntries(
        Object.entries(p).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(PLANTILLA_DEFECTO[k as keyof PlantillaCertificado])),
      ) as Partial<PlantillaCertificado>;
      await editar.mutateAsync({ id: ajustes.id, cambios: { plantilla_certificado: propio, logo_url: logo } });
      toast.ok('Plantilla del certificado guardada.');
    } catch (e) {
      toast.error(e);
    } finally {
      setGuardando(false);
    }
  };

  const restaurar = async () => {
    if (!(await confirmar({ titulo: 'Restaurar los textos de SIGEI', texto: 'Se reemplazarán los textos actuales del editor. El escudo no cambia.', confirmar: 'Restaurar' })))
      return;
    setP({ ...PLANTILLA_DEFECTO });
  };

  const descargar = async () => {
    try {
      const pdf = await armarPdf();
      descargarArchivo('Certificado_ejemplo.pdf', new Uint8Array(pdf) as Uint8Array<ArrayBuffer>, 'application/pdf');
    } catch (e) {
      toast.error(e);
    }
  };

  // Algunos navegadores (sobre todo en celulares) no muestran PDF dentro de la página.
  const verPdf = typeof navigator === 'undefined' || (navigator as Navigator & { pdfViewerEnabled?: boolean }).pdfViewerEnabled !== false;
  const cambios = JSON.stringify(plantillaCompleta(ajustes.plantilla_certificado)) !== JSON.stringify(p) || logo !== ajustes.logo_url;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Tarjeta titulo="Certificado de autorización de permiso">
        <p className="mb-5 text-sm text-muted">
          Así se arma el certificado que se descarga y se envía por correo al aprobar un permiso. Los campos entre llaves se llenan solos con los datos de cada solicitud.
        </p>

        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 pl-1 text-[13px] font-medium text-ink-2">Escudo de la institución</p>
            <div className="flex items-center gap-4">
              <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-surface-2">
                {logo ? <img src={logo} alt="Escudo de la institución" className="size-full object-contain" /> : <ImageUp className="size-6 text-muted" />}
              </span>
              <input ref={entradaLogo} type="file" accept="image/png,image/jpeg" className="sr-only" id="escudo-certificado" onChange={(e) => subirLogo(e.target.files?.[0])} />
              <div className="flex flex-wrap gap-2">
                <Boton tam="sm" variante="secundario" icono={<ImageUp className="size-3.5" />} onClick={() => entradaLogo.current?.click()}>
                  {logo ? 'Cambiar escudo' : 'Subir escudo'}
                </Boton>
                {logo && (
                  <Boton tam="sm" variante="fantasma" icono={<Trash2 className="size-3.5" />} onClick={() => setLogo('')}>
                    Quitar
                  </Boton>
                )}
              </div>
            </div>
            <p className="mt-1.5 pl-1 text-xs text-muted">PNG o JPG, idealmente con fondo transparente.</p>
          </div>

          <Campo etiqueta="Título">{(id) => <Entrada id={id} value={p.titulo} onFocus={foco('titulo')} onChange={(e) => cambiar('titulo', e.target.value)} />}</Campo>
          <Campo etiqueta="Línea bajo el nombre de la institución" ayuda="Por ejemplo, el municipio, la dependencia, el NIT o el código DANE.">
            {(id) => <Entrada id={id} value={p.encabezado} onFocus={foco('encabezado')} onChange={(e) => cambiar('encabezado', e.target.value)} />}
          </Campo>
          <Campo etiqueta="Párrafo de autorización" ayuda="Escriba **texto** para ponerlo en negrita. Deje una línea en blanco para empezar otro párrafo.">
            {(id) => <AreaTexto id={id} rows={6} value={p.parrafo} onFocus={foco('parrafo')} onChange={(e) => cambiar('parrafo', e.target.value)} />}
          </Campo>

          <div>
            <p className="mb-2 pl-1 text-[13px] font-medium text-ink-2">Campos automáticos</p>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES_CERTIFICADO.map((v) => (
                <button
                  key={v.clave}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertar(v.clave)}
                  title={`${v.descripcion}. En mayúsculas: {${v.clave.toUpperCase()}}`}
                  className="rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-xs transition hover:border-brand hover:text-brand"
                >
                  {`{${v.clave}}`}
                </button>
              ))}
            </div>
            <p className="mt-1.5 pl-1 text-xs text-muted">
              Toque un campo para insertarlo donde está el cursor. Escrito en mayúsculas, como {'{DOCENTE}'}, sale en mayúsculas.
            </p>
          </div>

          <div>
            <p className="mb-2 pl-1 text-[13px] font-medium text-ink-2">Datos que aparecen en la tabla</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Datos que aparecen en la tabla">
              {FILAS_CERTIFICADO.map((f) => {
                const activa = p.filas.includes(f.clave);
                return (
                  <button
                    key={f.clave}
                    type="button"
                    aria-pressed={activa}
                    onClick={() => cambiar('filas', activa ? p.filas.filter((x) => x !== f.clave) : [...p.filas, f.clave])}
                    className={cx(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition',
                      activa ? 'border-ink bg-ink text-bg' : 'border-line bg-surface hover:border-line-strong',
                    )}
                  >
                    {activa && <Check className="size-3.5" />}
                    {f.etiqueta}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 pl-1 text-xs text-muted">Reemplazo y Observaciones solo aparecen cuando la solicitud los tiene.</p>
          </div>

          <Campo etiqueta="Nota después de los datos (opcional)" ayuda="Por ejemplo: «Se expide en {municipio} el {fecha_autorizacion}, a solicitud del interesado».">
            {(id) => <AreaTexto id={id} rows={3} value={p.nota} onFocus={foco('nota')} onChange={(e) => cambiar('nota', e.target.value)} />}
          </Campo>
          <Campo etiqueta="Cargo bajo la firma" ayuda="Vacío: se usa el cargo de quien aprueba, Rector(a) o Coordinador(a).">
            {(id) => (
              <Entrada id={id} value={p.cargo_firma} placeholder="Automático" onFocus={foco('cargo_firma')} onChange={(e) => cambiar('cargo_firma', e.target.value)} />
            )}
          </Campo>
          <Campo etiqueta="Pie de página">{(id) => <Entrada id={id} value={p.pie} onFocus={foco('pie')} onChange={(e) => cambiar('pie', e.target.value)} />}</Campo>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Boton variante="fantasma" icono={<RotateCcw className="size-4" />} onClick={restaurar}>
            Restaurar textos de SIGEI
          </Boton>
          <Boton icono={<Save className="size-4" />} cargando={guardando} disabled={!cambios} onClick={guardar}>
            Guardar plantilla
          </Boton>
        </div>
      </Tarjeta>

      <Tarjeta
        titulo="Vista previa"
        className="xl:sticky xl:top-24 xl:self-start"
        accion={
          <Boton tam="sm" variante="secundario" icono={<Download className="size-3.5" />} onClick={descargar}>
            Descargar ejemplo
          </Boton>
        }
      >
        <p className="mb-3 text-sm text-muted">Con datos de ejemplo{ejemplo ? ` de ${ejemplo.nombres} ${ejemplo.apellidos}` : ''}. Se actualiza mientras escribe.</p>
        <div className="aspect-[612/792] w-full overflow-hidden rounded-[16px] border border-line bg-white">
          {!verPdf ? (
            <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center">
              <FileText className="size-10 text-muted" />
              <p className="max-w-xs text-sm text-muted">Este navegador no muestra el PDF dentro de la página. Ábralo para ver cómo queda.</p>
              <Boton tam="sm" icono={<Download className="size-3.5" />} onClick={descargar}>
                Ver el ejemplo en PDF
              </Boton>
            </div>
          ) : vista ? (
            <iframe title="Vista previa del certificado" src={`${vista}#toolbar=0&navpanes=0&view=FitH`} className="size-full" />
          ) : (
            <div className="grid size-full place-items-center text-sm text-muted">Preparando la vista previa…</div>
          )}
        </div>
      </Tarjeta>
    </div>
  );
}
