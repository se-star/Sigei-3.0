import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, LogOut, ShieldCheck } from 'lucide-react';
import { Boton, Cargando } from '@/components/ui';
import { Logo, Wordmark } from '@/components/layout/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { backend } from '@/lib/backend';
import { DOCS_LEGALES, fechaVersion, VERSION_POLITICAS } from '@/lib/legal';

/** Consulta compartida de la aceptación de la persona en sesión. */
export function useAceptacion() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ['aceptacion', perfil?.id],
    queryFn: () => backend.datos.miAceptacion(),
    enabled: !!perfil?.id,
    staleTime: Infinity,
  });
}

/**
 * Antes de usar SIGEI, cada persona acepta los términos y la política de
 * tratamiento de datos vigentes (prueba de la autorización, Ley 1581 de 2012).
 */
export function PuertaPoliticas({ children }: { children: ReactNode }) {
  const { data, isLoading, isError, refetch } = useAceptacion();
  if (isLoading)
    return (
      <div className="grid min-h-dvh place-items-center">
        <Cargando texto="Iniciando SIGEI…" />
      </div>
    );
  if (isError)
    return (
      <Marco>
        <p className="text-sm text-ink-2">No pudimos comprobar su aceptación de la política de datos. Revise su conexión e intente de nuevo.</p>
        <div className="mt-5 flex justify-end">
          <Boton onClick={() => refetch()}>Reintentar</Boton>
        </div>
      </Marco>
    );
  if (data?.version === VERSION_POLITICAS) return <>{children}</>;
  return <Aceptar anterior={!!data} />;
}

function Marco({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <Logo className="size-10" />
          <Wordmark className="text-[30px]" />
        </div>
        <main className="card p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}

function Aceptar({ anterior }: { anterior: boolean }) {
  const { perfil, salir } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [acepta, setAcepta] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const aceptar = async () => {
    setGuardando(true);
    try {
      await backend.datos.aceptarPoliticas(VERSION_POLITICAS);
      await qc.invalidateQueries({ queryKey: ['aceptacion', perfil?.id] });
    } catch (e) {
      toast.error(e);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Marco>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-soft-ink" aria-hidden="true">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold">{anterior ? 'Actualizamos nuestras políticas' : 'Antes de empezar'}</h1>
          <p className="mt-1 text-sm text-muted">Versión del {fechaVersion()}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-ink-2">
        <p>
          En SIGEI su institución registra datos de su vinculación, carga académica, horario, permisos y evaluación, para la gestión académica y administrativa.
        </p>
        <ul className="list-disc space-y-1 pl-5 marker:text-muted">
          <li>La responsable de sus datos es su institución; el operador de SIGEI los trata por cuenta de ella.</li>
          <li>Los soportes de incapacidad pueden contener datos de salud (sensibles): aportarlos es opcional y solo los ven los directivos.</li>
          <li>Puede conocer, corregir o pedir que se borren sus datos, y revocar esta autorización, escribiendo a su institución.</li>
          <li>SIGEI no usa cookies ni rastreo publicitario.</li>
        </ul>
      </div>

      <nav aria-label="Leer los documentos completos" className="mt-5 flex flex-wrap gap-2">
        {DOCS_LEGALES.map((d) => (
          <a
            key={d.v}
            href={`#/legal/${d.v}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:border-line-strong"
          >
            <FileText className="size-3.5" aria-hidden="true" /> {d.t}
            <span className="sr-only">(se abre en otra pestaña)</span>
          </a>
        ))}
      </nav>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-[16px] bg-surface-2 p-4 text-sm">
        <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)]" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
        <span>
          He leído y acepto los <strong>términos y condiciones</strong>, y autorizo el tratamiento de mis datos personales según la{' '}
          <strong>política de tratamiento de datos</strong>.
        </span>
      </label>

      <div className="mt-6 flex flex-wrap justify-between gap-2">
        <Boton variante="fantasma" icono={<LogOut className="size-4" />} onClick={salir}>
          Salir
        </Boton>
        <Boton onClick={aceptar} disabled={!acepta} cargando={guardando}>
          Aceptar y continuar
        </Boton>
      </div>
    </Marco>
  );
}
