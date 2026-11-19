import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Eraser, ImageUp, PenLine, Save, Trash2 } from 'lucide-react';
import { Boton, Segmentos, Tarjeta } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { backend } from '@/lib/backend';

const ANCHO = 600;
const ALTO = 200;

/**
 * Deja la firma lista para el certificado: fondo transparente (lo claro se
 * vuelve transparente), recortada a su contenido y de 600 × 200 px como máximo.
 */
export function limpiarFirma(origen: HTMLCanvasElement | HTMLImageElement): string | null {
  const w = origen instanceof HTMLCanvasElement ? origen.width : origen.naturalWidth;
  const h = origen instanceof HTMLCanvasElement ? origen.height : origen.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(origen, 0, 0);
  const datos = ctx.getImageData(0, 0, w, h);
  const p = datos.data;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const luz = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
      // Papel y fondos claros: transparentes. El trazo queda en tinta oscura.
      const alfa = p[i + 3] < 20 ? 0 : luz > 200 ? 0 : Math.min(255, Math.round(((200 - luz) / 120) * 255));
      p[i] = 20;
      p[i + 1] = 30;
      p[i + 2] = 60;
      p[i + 3] = alfa;
      if (alfa > 40) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  if (x1 < 0) return null;
  ctx.putImageData(datos, 0, 0);
  const margen = 6;
  const sx = Math.max(0, x0 - margen);
  const sy = Math.max(0, y0 - margen);
  const sw = Math.min(w, x1 + margen) - sx;
  const sh = Math.min(h, y1 + margen) - sy;
  const esc = Math.min(1, ANCHO / sw, ALTO / sh);
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(sw * esc));
  out.height = Math.max(1, Math.round(sh * esc));
  out.getContext('2d')!.drawImage(c, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

type Modo = 'dibujar' | 'subir';

/** Mi perfil → Firma: la que aparece en los certificados de permisos que aprueba. */
export function TarjetaFirma({ className }: { className?: string }) {
  const { perfil } = useAuth();
  const toast = useToast();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [modo, setModo] = useState<Modo>('dibujar');
  const [guardando, setGuardando] = useState(false);
  const [trazo, setTrazo] = useState(false);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const dibujando = useRef(false);

  useEffect(() => {
    if (perfil?.id) backend.datos.firmaDe(perfil.id).then(setActual).catch(() => setActual(''));
  }, [perfil?.id]);

  const limpiarLienzo = () => {
    const c = lienzo.current;
    if (!c) return;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setTrazo(false);
    setNueva('');
  };

  const punto = (e: PointerEvent<HTMLCanvasElement>) => {
    const c = lienzo.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  const empezar = (e: PointerEvent<HTMLCanvasElement>) => {
    const ctx = lienzo.current!.getContext('2d')!;
    const { x, y } = punto(e);
    lienzo.current!.setPointerCapture(e.pointerId);
    dibujando.current = true;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#14213d';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  };
  const mover = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!dibujando.current) return;
    const ctx = lienzo.current!.getContext('2d')!;
    const { x, y } = punto(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setTrazo(true);
  };
  const terminar = () => {
    dibujando.current = false;
  };

  const subir = async (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(png|jpe?g)$/.test(f.type)) return toast.error('Use una foto o imagen PNG o JPG de su firma.');
    if (f.size > 6 * 1024 * 1024) return toast.error('La imagen supera 6 MB.');
    const url = URL.createObjectURL(f);
    try {
      const img = await new Promise<HTMLImageElement>((ok, mal) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => mal(new Error('No pudimos leer la imagen.'));
        i.src = url;
      });
      // Fotos grandes: primero se reducen para procesarlas rápido.
      const esc = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * esc);
      c.height = Math.round(img.naturalHeight * esc);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      const lista = limpiarFirma(c);
      if (!lista) return toast.error('No encontramos la firma en la imagen. Use una foto con buena luz sobre papel blanco.');
      setNueva(lista);
    } catch (e) {
      toast.error(e);
    } finally {
      URL.revokeObjectURL(url);
      if (entrada.current) entrada.current.value = '';
    }
  };

  const guardar = async (firma: string) => {
    setGuardando(true);
    try {
      await backend.datos.guardarMiFirma(firma);
      setActual(firma);
      setNueva('');
      limpiarLienzo();
      toast.ok(firma ? 'Firma guardada. Aparecerá en los certificados que usted apruebe.' : 'Firma quitada.');
    } catch (e) {
      toast.error(e);
    } finally {
      setGuardando(false);
    }
  };

  const usarDibujo = () => {
    if (!lienzo.current || !trazo) return;
    const lista = limpiarFirma(lienzo.current);
    if (lista) setNueva(lista);
  };

  return (
    <Tarjeta titulo="Firma para certificados" className={className}>
      <p className="mb-4 text-sm text-muted">Aparece sobre la línea de firma en los certificados de los permisos que usted apruebe.</p>

      <div className="mb-4 grid h-28 place-items-center rounded-[16px] border border-line bg-white p-3">
        {nueva || actual ? (
          <img src={nueva || actual} alt={nueva ? 'Firma nueva sin guardar' : 'Su firma guardada'} className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="text-sm text-[#5a6272]">Aún no tiene firma guardada.</p>
        )}
      </div>
      {nueva && <p className="mb-3 text-xs font-semibold text-warn">Vista previa: pulse «Guardar firma» para usarla.</p>}

      <Segmentos<Modo>
        className="mb-3"
        valor={modo}
        onCambio={setModo}
        opciones={[
          { valor: 'dibujar', etiqueta: 'Dibujar' },
          { valor: 'subir', etiqueta: 'Subir foto' },
        ]}
      />

      {modo === 'dibujar' ? (
        <div>
          <canvas
            ref={lienzo}
            width={ANCHO}
            height={ALTO}
            aria-label="Espacio para dibujar su firma con el mouse o el dedo"
            className="block aspect-[3/1] w-full touch-none rounded-[16px] border border-dashed border-line-strong bg-white"
            onPointerDown={empezar}
            onPointerMove={mover}
            onPointerUp={terminar}
            onPointerLeave={terminar}
            onPointerCancel={terminar}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Boton tam="sm" variante="secundario" icono={<PenLine className="size-3.5" />} onClick={usarDibujo} disabled={!trazo}>
              Usar este trazo
            </Boton>
            <Boton tam="sm" variante="fantasma" icono={<Eraser className="size-3.5" />} onClick={limpiarLienzo} disabled={!trazo}>
              Borrar
            </Boton>
          </div>
        </div>
      ) : (
        <div>
          <input ref={entrada} id="foto-firma" type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => subir(e.target.files?.[0])} />
          <Boton tam="sm" variante="secundario" icono={<ImageUp className="size-3.5" />} onClick={() => entrada.current?.click()}>
            Elegir foto de la firma
          </Boton>
          <p className="mt-2 text-xs text-muted">Firme en papel blanco con tinta oscura y tómele una foto de cerca. SIGEI quita el fondo y la recorta.</p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {actual && !nueva && (
          <Boton variante="fantasma" icono={<Trash2 className="size-4" />} onClick={() => guardar('')} cargando={guardando}>
            Quitar firma
          </Boton>
        )}
        <Boton icono={<Save className="size-4" />} onClick={() => guardar(nueva)} disabled={!nueva} cargando={guardando}>
          Guardar firma
        </Boton>
      </div>
    </Tarjeta>
  );
}
