import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { cx } from '@/lib/utils';

interface Toast {
  id: number;
  texto: string;
  tipo: 'ok' | 'error';
}

const Ctx = createContext<{ ok: (t: string) => void; error: (t: unknown) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Toast[]>([]);
  const quitar = (id: number) => setLista((l) => l.filter((t) => t.id !== id));
  const push = useCallback((texto: string, tipo: Toast['tipo']) => {
    const id = Date.now() + Math.random();
    setLista((l) => [...l.slice(-3), { id, texto, tipo }]);
    setTimeout(() => quitar(id), tipo === 'error' ? 6000 : 3200);
  }, []);
  const api = {
    ok: (t: string) => push(t, 'ok'),
    error: (e: unknown) => push(e instanceof Error ? e.message : String(e), 'error'),
  };
  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
        aria-live="polite"
      >
        {lista.map((t) => (
          <div
            key={t.id}
            role={t.tipo === 'error' ? 'alert' : 'status'}
            className={cx(
              'anim-rise pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-pop',
              t.tipo === 'ok' ? 'border-line bg-ink text-bg' : 'border-danger/30 bg-danger-soft text-ink',
            )}
          >
            {t.tipo === 'ok' ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-lime" />
            ) : (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
            )}
            <span className="flex-1 leading-snug">{t.texto}</span>
            <button onClick={() => quitar(t.id)} className="opacity-60 hover:opacity-100" aria-label="Cerrar aviso">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast fuera de ToastProvider');
  return c;
}
