import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, Inbox } from 'lucide-react';
import { cx, colorDe, iniciales } from '@/lib/utils';
import type { Tono } from '@/lib/catalogos';

/* ───────── Botón ───────── */

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro' | 'lima';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-brand text-brand-ink hover:bg-brand-hover shadow-sm',
  secundario: 'bg-surface text-ink border border-line hover:border-line-strong hover:bg-surface-2',
  fantasma: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  peligro: 'bg-danger text-white hover:brightness-110',
  lima: 'bg-lime text-lime-ink hover:brightness-95',
};

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tam?: 'sm' | 'md' | 'icono';
  cargando?: boolean;
  icono?: ReactNode;
}

export const Boton = forwardRef<HTMLButtonElement, BotonProps>(function Boton(
  { variante = 'primario', tam = 'md', cargando, icono, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || cargando}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-55',
        tam === 'sm' && 'h-8 px-3 text-[13px]',
        tam === 'md' && 'h-10 px-4 text-sm',
        tam === 'icono' && 'size-9',
        VARIANTES[variante],
        className,
      )}
      {...rest}
    >
      {cargando ? <Loader2 className="size-4 animate-spin" /> : icono}
      {children}
    </button>
  );
});

/* ───────── Campos ───────── */

interface CampoProps {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  requerido?: boolean;
  className?: string;
  children: (id: string) => ReactNode;
}

export function Campo({ etiqueta, ayuda, error, requerido, className, children }: CampoProps) {
  const id = useId();
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-ink-2">
        {etiqueta}
        {requerido && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children(id)}
      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : ayuda ? (
        <p className="text-xs text-muted">{ayuda}</p>
      ) : null}
    </div>
  );
}

export const Entrada = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Entrada(
  { className, ...p },
  ref,
) {
  return <input ref={ref} className={cx('field', className)} {...p} />;
});

export function Selector({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx('field cursor-pointer pr-8', className)} {...p}>
      {children}
    </select>
  );
}

export function AreaTexto({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx('field', className)} {...p} />;
}

export function Interruptor({
  activo,
  onCambio,
  etiqueta,
  descripcion,
}: {
  activo: boolean;
  onCambio: (v: boolean) => void;
  etiqueta: string;
  descripcion?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-semibold">{etiqueta}</span>
        {descripcion && <span className="block text-xs text-muted">{descripcion}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        onClick={() => onCambio(!activo)}
        className={cx(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition',
          activo ? 'bg-brand' : 'bg-surface-3',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition',
            activo && 'translate-x-5',
          )}
        />
      </button>
    </label>
  );
}

/* ───────── Insignia ───────── */

const TONOS: Record<Tono, string> = {
  neutral: 'bg-surface-2 text-ink-2 ring-line',
  brand: 'bg-brand-soft text-brand-soft-ink ring-brand/20',
  ok: 'bg-ok-soft text-ok ring-ok/20',
  warn: 'bg-warn-soft text-warn ring-warn/20',
  danger: 'bg-danger-soft text-danger ring-danger/20',
  info: 'bg-info-soft text-info ring-info/20',
  violet: 'bg-violet-soft text-violet ring-violet/20',
  lime: 'bg-lime text-lime-ink ring-lime-ink/10',
};

export function Insignia({ tono = 'neutral', children, punto }: { tono?: Tono; children: ReactNode; punto?: boolean }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset',
        TONOS[tono],
      )}
    >
      {punto && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ───────── Avatar ───────── */

export function Avatar({ nombre, tam = 36 }: { nombre: string; tam?: number }) {
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full font-display font-bold text-white"
      style={{ width: tam, height: tam, background: colorDe(nombre), fontSize: tam * 0.38 }}
    >
      {iniciales(nombre)}
    </span>
  );
}

/* ───────── Tarjeta ───────── */

export function Tarjeta({
  titulo,
  accion,
  children,
  className,
  sinRelleno,
  icono,
}: {
  titulo?: ReactNode;
  accion?: ReactNode;
  children: ReactNode;
  className?: string;
  sinRelleno?: boolean;
  icono?: ReactNode;
}) {
  return (
    <section className={cx('card', className)}>
      {(titulo || accion) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-1">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-bold">
            {icono && <span className="text-brand">{icono}</span>}
            {titulo}
          </h2>
          {accion}
        </header>
      )}
      <div className={cx(!sinRelleno && 'p-5', sinRelleno && !!(titulo || accion) && 'pt-2')}>{children}</div>
    </section>
  );
}

/* ───────── Encabezado de página ───────── */

export function Encabezado({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-2xl text-[15px] text-muted">{descripcion}</p>}
      </div>
      {acciones && <div className="no-print flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}

/* ───────── Estado vacío y carga ───────── */

export function Vacio({
  titulo,
  texto,
  accion,
  icono,
}: {
  titulo: string;
  texto?: string;
  accion?: ReactNode;
  icono?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-surface-2 text-muted">
        {icono ?? <Inbox className="size-6" />}
      </div>
      <p className="font-display text-base font-bold">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-muted">{texto}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
      <Loader2 className="size-5 animate-spin text-brand" />
      {texto}
    </div>
  );
}

export function Esqueleto({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-xl bg-surface-2', className)} />;
}

/* ───────── Modal y panel lateral ───────── */

function useEscape(abierto: boolean, cerrar: () => void) {
  useEffect(() => {
    if (!abierto) return;
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && cerrar();
    document.addEventListener('keydown', fn);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', fn);
      document.body.style.overflow = prev;
    };
  }, [abierto, cerrar]);
}

function useFocoInicial(abierto: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const t = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>('[data-autofocus], input:not([type=hidden]), select, textarea');
      (el ?? ref.current)?.focus();
    }, 30);
    return () => clearTimeout(t);
  }, [abierto]);
  return ref;
}

interface DialogoProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  pie?: ReactNode;
  ancho?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ abierto, onCerrar, titulo, descripcion, children, pie, ancho = 'md' }: DialogoProps) {
  useEscape(abierto, onCerrar);
  const ref = useFocoInicial(abierto);
  if (!abierto) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <div className="anim-fade absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onCerrar} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={cx(
          'anim-rise relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line bg-surface shadow-pop outline-none sm:rounded-3xl',
          ancho === 'sm' && 'sm:max-w-md',
          ancho === 'md' && 'sm:max-w-xl',
          ancho === 'lg' && 'sm:max-w-3xl',
          ancho === 'xl' && 'sm:max-w-5xl',
        )}
      >
        <CabeceraDialogo titulo={titulo} descripcion={descripcion} onCerrar={onCerrar} />
        <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {pie && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{pie}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Panel({ abierto, onCerrar, titulo, descripcion, children, pie }: DialogoProps) {
  useEscape(abierto, onCerrar);
  const ref = useFocoInicial(abierto);
  if (!abierto) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="anim-fade absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onCerrar} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="anim-slide relative flex h-full w-full max-w-xl flex-col border-l border-line bg-surface shadow-pop outline-none"
      >
        <CabeceraDialogo titulo={titulo} descripcion={descripcion} onCerrar={onCerrar} />
        <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {pie && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{pie}</div>}
      </div>
    </div>,
    document.body,
  );
}

function CabeceraDialogo({ titulo, descripcion, onCerrar }: { titulo: string; descripcion?: string; onCerrar: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-6 pt-5 pb-4">
      <div>
        <h2 className="text-xl font-bold">{titulo}</h2>
        {descripcion && <p className="mt-0.5 text-sm text-muted">{descripcion}</p>}
      </div>
      <Boton variante="fantasma" tam="icono" onClick={onCerrar} aria-label="Cerrar">
        <X className="size-5" />
      </Boton>
    </div>
  );
}

/* ───────── Pestañas segmentadas ───────── */

export function Segmentos<V extends string>({
  opciones,
  valor,
  onCambio,
  className,
}: {
  opciones: { valor: V; etiqueta: ReactNode; cuenta?: number }[];
  valor: V;
  onCambio: (v: V) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cx('scrollbar-thin inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1', className)}
    >
      {opciones.map((o) => (
        <button
          key={o.valor}
          role="tab"
          aria-selected={valor === o.valor}
          onClick={() => onCambio(o.valor)}
          className={cx(
            'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition',
            valor === o.valor ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.etiqueta}
          {o.cuenta !== undefined && (
            <span
              className={cx(
                'rounded-full px-1.5 text-[11px] tabular-nums',
                valor === o.valor ? 'bg-brand-soft text-brand-soft-ink' : 'bg-surface-3',
              )}
            >
              {o.cuenta}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ───────── Barra de progreso ───────── */

export function Progreso({ valor, max, tono }: { valor: number; max: number; tono?: 'auto' | 'brand' }) {
  const pct = max > 0 ? Math.min(100, (valor / max) * 100) : 0;
  const color =
    tono === 'brand' ? 'bg-brand' : valor > max ? 'bg-danger' : pct >= 85 ? 'bg-warn' : 'bg-brand';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={valor} aria-valuemax={max}>
      <div className={cx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}
