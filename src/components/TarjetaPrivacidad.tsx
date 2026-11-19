import { ExternalLink, Mail } from 'lucide-react';
import { Tarjeta } from '@/components/ui';
import { useAceptacion } from '@/components/PuertaPoliticas';
import { useAjustes } from '@/hooks/useDatos';
import { DOCS_LEGALES, fechaVersion } from '@/lib/legal';

/** Mi perfil → Privacidad: cuándo aceptó la política y cómo ejercer sus derechos. */
export function TarjetaPrivacidad({ className }: { className?: string }) {
  const { data } = useAceptacion();
  const ajustes = useAjustes();
  const correo = ajustes.correo_datos?.trim();
  const fecha = data
    ? new Date(data.aceptado_en).toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';
  return (
    <Tarjeta titulo="Privacidad y mis datos" className={className}>
      <p className="text-sm text-ink-2">
        {data ? (
          <>
            Aceptó la política de tratamiento de datos y los términos el <strong>{fecha}</strong> (versión del {fechaVersion(data.version)}).
          </>
        ) : (
          'Aún no hay registro de su aceptación.'
        )}
      </p>
      <ul className="mt-4 flex flex-col gap-1.5 text-sm">
        {DOCS_LEGALES.map((d) => (
          <li key={d.v}>
            <a href={`#/legal/${d.v}`} className="inline-flex items-center gap-1.5 font-medium text-ink underline-offset-2 hover:underline">
              {d.t} <ExternalLink className="size-3.5 text-muted" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-5 border-t border-line pt-4 text-sm text-ink-2">
        <p>Para conocer, corregir o borrar sus datos, o revocar la autorización, escriba a su institución.</p>
        {correo ? (
          <a
            href={`mailto:${correo}?subject=${encodeURIComponent('Solicitud sobre mis datos personales en SIGEI')}`}
            className="mt-2 inline-flex items-center gap-1.5 font-medium text-ink underline-offset-2 hover:underline"
          >
            <Mail className="size-4" aria-hidden="true" /> {correo}
          </a>
        ) : (
          <p className="mt-2 text-xs text-muted">Su institución aún no ha publicado un correo para estos trámites; diríjase a la secretaría o la rectoría.</p>
        )}
      </div>
    </Tarjeta>
  );
}
