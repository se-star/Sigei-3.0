import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronsUpDown, Landmark, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { etiqueta, ROLES } from '@/lib/catalogos';
import { abreviatura, cx } from '@/lib/utils';

/** Cambia la institución en la que se está trabajando. */
export function SelectorInstitucion({ mini }: { mini?: boolean }) {
  const { perfil, instituciones, cambiarInstitucion } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [cambiando, setCambiando] = useState<string | null>(null);
  if (!perfil) return null;

  const actual = instituciones.find((i) => i.id === perfil.institucion_id);
  const activas = instituciones.filter((i) => i.activo);
  const pendientes = instituciones.filter((i) => !i.activo);
  const corto = actual ? actual.sigla || actual.nombre : 'Sin institución';
  // Con una sola institución y sin solicitudes ni rol de plataforma, no hace falta el menú.
  const simple = activas.length <= 1 && !pendientes.length && !perfil.es_superadmin;

  const elegir = async (id: string) => {
    if (id === perfil.institucion_id) return setAbierto(false);
    setCambiando(id);
    try {
      await cambiarInstitucion(id);
      setAbierto(false);
      nav('/');
      toast.ok(`Ahora trabaja en ${instituciones.find((i) => i.id === id)?.nombre}.`);
    } catch (e) {
      toast.error(e);
    } finally {
      setCambiando(null);
    }
  };

  return (
    <div className={cx('relative', mini ? 'px-2' : 'px-3')}>
      <button
        onClick={() => !simple && setAbierto(!abierto)}
        disabled={simple}
        aria-expanded={abierto}
        aria-label={`Institución actual: ${actual?.nombre ?? 'ninguna'}. Cambiar institución`}
        title={mini ? actual?.nombre : undefined}
        className={cx(
          'flex w-full items-center gap-2.5 rounded-[20px] border border-line bg-surface text-left shadow-chip transition enabled:hover:shadow-pop disabled:cursor-default',
          mini ? 'size-12 justify-center' : 'p-1.5 pr-3',
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold tracking-tight">
          {actual ? abreviatura(actual) : <Landmark className="size-4" />}
        </span>
        {!mini && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{corto}</span>
              <span className="block truncate text-xs text-muted">{actual ? etiqueta(ROLES, perfil.rol) : 'Elija una institución'}</span>
            </span>
            {!simple && <ChevronsUpDown className="size-4 shrink-0 text-muted" />}
          </>
        )}
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div
            className={cx(
              'anim-rise absolute z-50 mt-2 w-72 overflow-hidden rounded-[28px] bg-surface p-2 shadow-pop',
              mini ? 'left-2' : 'left-3',
            )}
            role="menu"
          >
            <p className="px-3 pt-2 pb-1 text-xs text-muted">Sus instituciones</p>
            <ul className="scrollbar-thin max-h-72 overflow-y-auto">
              {activas.map((i) => (
                <li key={i.id}>
                  <button
                    role="menuitem"
                    onClick={() => elegir(i.id)}
                    disabled={!!cambiando}
                    className="flex w-full items-center gap-3 rounded-[20px] px-3 py-2.5 text-left transition hover:bg-surface-2"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-[10px] font-semibold tracking-tight">
                      {abreviatura(i)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{i.nombre}</span>
                      <span className="block text-xs text-muted">{etiqueta(ROLES, i.rol)}</span>
                    </span>
                    {i.id === perfil.institucion_id && <Check className="size-4 shrink-0" />}
                  </button>
                </li>
              ))}
              {pendientes.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-3 py-2.5 opacity-60">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-[10px] font-semibold tracking-tight">
                    {abreviatura(i)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{i.nombre}</span>
                    <span className="block text-xs text-muted">Solicitud pendiente</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-1 border-t border-line pt-1">
              {perfil.es_superadmin ? (
                <button
                  onClick={() => (setAbierto(false), nav('/instituciones'))}
                  className="flex w-full items-center gap-2.5 rounded-[20px] px-3 py-2.5 text-sm hover:bg-surface-2"
                >
                  <Landmark className="size-4" /> Administrar instituciones
                </button>
              ) : (
                <button
                  onClick={() => (setAbierto(false), nav('/perfil'))}
                  className="flex w-full items-center gap-2.5 rounded-[20px] px-3 py-2.5 text-sm hover:bg-surface-2"
                >
                  <Plus className="size-4" /> Solicitar acceso a otra
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
