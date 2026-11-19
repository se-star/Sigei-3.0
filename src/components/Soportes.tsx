import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, ImageIcon, Paperclip, Upload, X } from 'lucide-react';
import { Boton } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { backend } from '@/lib/backend';
import { SOPORTE_MAX_ARCHIVOS, validarSoporte } from '@/lib/data/provider';
import type { Soporte } from '@/lib/types';
import { cx } from '@/lib/utils';

function tamano(b: number) {
  return b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
}

/** Ley 1581 de 2012, art. 6: el tratamiento de datos sensibles requiere autorización explícita y es facultativo. */
export const AVISO_SENSIBLE =
  'Si el soporte tiene datos de salud (dato sensible), al adjuntarlo autoriza su uso solo para justificar este permiso. Es opcional y lo ven únicamente los directivos y usted.';

/** Abre un soporte guardado en una pestaña nueva (con un enlace temporal). */
export function useAbrirSoporte() {
  const toast = useToast();
  return async (s: Soporte) => {
    // La pestaña se abre antes de pedir el enlace para que el navegador no la bloquee.
    const ventana = window.open('', '_blank');
    try {
      const url = await backend.datos.urlSoporte(s.ruta);
      if (ventana) ventana.location.href = url;
      else window.location.href = url;
    } catch (e) {
      ventana?.close();
      toast.error(e);
    }
  };
}

/** Lista de soportes como enlaces (para ver en tarjetas y revisiones). */
export function ListaSoportes({ soportes, className }: { soportes?: Soporte[]; className?: string }) {
  const abrir = useAbrirSoporte();
  if (!soportes?.length) return null;
  return (
    <ul className={cx('flex flex-wrap gap-1.5', className)}>
      {soportes.map((s) => (
        <li key={s.ruta}>
          <button
            type="button"
            onClick={() => abrir(s)}
            className="flex max-w-60 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs shadow-chip transition hover:shadow-pop"
            title={`Abrir ${s.nombre}`}
          >
            <Paperclip className="size-3.5 shrink-0 text-muted" />
            <span className="truncate">{s.nombre}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Selector de soportes para un formulario: muestra los ya guardados (que se
 * pueden quitar) y los archivos nuevos elegidos, que se suben al guardar.
 */
export function SelectorSoportes({
  guardados,
  onQuitarGuardado,
  nuevos,
  onNuevos,
}: {
  guardados: Soporte[];
  onQuitarGuardado: (s: Soporte) => void;
  nuevos: File[];
  onNuevos: (f: File[]) => void;
}) {
  const toast = useToast();
  const abrir = useAbrirSoporte();
  const input = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const total = guardados.length + nuevos.length;

  const agregar = (lista: FileList | null) => {
    if (!lista) return;
    const elegidos = [...lista];
    for (const f of elegidos) {
      const error = validarSoporte(f);
      if (error) return toast.error(error);
    }
    if (total + elegidos.length > SOPORTE_MAX_ARCHIVOS) return toast.error(`Puede adjuntar hasta ${SOPORTE_MAX_ARCHIVOS} archivos.`);
    onNuevos([...nuevos, ...elegidos]);
  };

  const fila = (nombre: string, tipo: string, peso: number, quitar: () => void, ver?: () => void) => (
    <li className="flex items-center gap-3 rounded-[20px] bg-surface-2 px-3 py-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface">
        {tipo.startsWith('image/') ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        {ver ? (
          <button type="button" onClick={ver} className="block max-w-full truncate text-left text-sm font-medium underline-offset-2 hover:underline">
            {nombre}
          </button>
        ) : (
          <span className="block truncate text-sm font-medium">{nombre}</span>
        )}
        <span className="block text-xs text-muted">
          {tamano(peso)}
          {!ver && ' · se subirá al guardar'}
        </span>
      </span>
      <button type="button" onClick={quitar} className="grid size-7 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink" aria-label={`Quitar ${nombre}`}>
        <X className="size-4" />
      </button>
    </li>
  );

  return (
    <div>
      <p className="mb-1.5 pl-1 text-[13px] font-medium text-ink-2">Soportes (opcional)</p>
      {total > 0 && (
        <ul className="mb-2 flex flex-col gap-1.5">
          {guardados.map((s) => (
            <div key={s.ruta}>{fila(s.nombre, s.tipo, s.tamano, () => onQuitarGuardado(s), () => abrir(s))}</div>
          ))}
          {nuevos.map((f, i) => (
            <div key={`${f.name}-${i}`}>{fila(f.name, f.type, f.size, () => onNuevos(nuevos.filter((_, j) => j !== i)))}</div>
          ))}
        </ul>
      )}
      {total < SOPORTE_MAX_ARCHIVOS && (
        <div
          onDragOver={(e) => (e.preventDefault(), setArrastrando(true))}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            agregar(e.dataTransfer.files);
          }}
          className={cx(
            'flex flex-col items-center gap-2 rounded-[20px] border border-dashed px-4 py-5 text-center transition',
            arrastrando ? 'border-accent bg-accent/5' : 'border-line-strong',
          )}
        >
          <Boton type="button" variante="secundario" tam="sm" icono={<Upload className="size-3.5" />} onClick={() => input.current?.click()}>
            Adjuntar archivo
          </Boton>
          <p className="text-xs text-muted">PDF o foto (JPG, PNG, WEBP) · hasta 5 MB · máximo {SOPORTE_MAX_ARCHIVOS} archivos</p>
          <p className="max-w-md text-xs text-muted">{AVISO_SENSIBLE}</p>
          <input
            ref={input}
            type="file"
            hidden
            multiple
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => {
              agregar(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Botón «Subir soporte» para un permiso ya aprobado que lo tiene pendiente
 * (lo usa el docente, o un directivo en su nombre).
 */
export function SubirSoportePendiente({ novedadId, docenteId, onListo }: { novedadId: string; docenteId: string; onListo?: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);

  const subir = async (lista: FileList | null) => {
    const archivos = [...(lista ?? [])];
    if (!archivos.length) return;
    for (const f of archivos) {
      const error = validarSoporte(f);
      if (error) return toast.error(error);
    }
    if (archivos.length > SOPORTE_MAX_ARCHIVOS) return toast.error(`Puede adjuntar hasta ${SOPORTE_MAX_ARCHIVOS} archivos.`);
    setSubiendo(true);
    const subidos: Soporte[] = [];
    try {
      for (const f of archivos) subidos.push(await backend.datos.subirSoporte(f, docenteId));
      await backend.datos.agregarSoportes(novedadId, subidos);
      await qc.invalidateQueries({ queryKey: ['tabla'], predicate: (q) => q.queryKey[2] === 'novedades' });
      toast.ok(subidos.length === 1 ? 'Soporte adjuntado.' : `${subidos.length} soportes adjuntados.`);
      onListo?.();
    } catch (e) {
      if (subidos.length) backend.datos.borrarSoportes(subidos.map((x) => x.ruta)).catch(() => undefined);
      toast.error(e);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <>
      <Boton tam="sm" icono={<Upload className="size-3.5" />} cargando={subiendo} onClick={() => input.current?.click()} title={AVISO_SENSIBLE}>
        Subir soporte
      </Boton>
      <input
        ref={input}
        type="file"
        hidden
        multiple
        aria-label="Elegir el soporte del permiso"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={(e) => {
          subir(e.target.files);
          e.target.value = '';
        }}
      />
    </>
  );
}
