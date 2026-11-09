import { useState } from 'react';
import { Clock3, LogOut, RefreshCw } from 'lucide-react';
import { Boton, Insignia } from '@/components/ui';
import { Logo, Wordmark } from '@/components/layout/Logo';
import { SolicitarAcceso } from '@/components/SolicitarAcceso';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

/** Para quien tiene cuenta pero todavía no tiene acceso activo a ninguna institución. */
export default function SinInstitucion() {
  const { perfil, instituciones, refrescar, salir } = useAuth();
  const toast = useToast();
  const [revisando, setRevisando] = useState(false);
  const pendientes = instituciones.filter((i) => !i.activo);

  const revisar = async () => {
    setRevisando(true);
    try {
      await refrescar();
      toast.ok('Estado actualizado.');
    } catch (e) {
      toast.error(e);
    } finally {
      setRevisando(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-center gap-3">
          <Logo className="size-10" />
          <Wordmark className="text-[44px] leading-none" />
        </div>
        <div className="card p-6 sm:p-8">
          <span className="mb-4 grid size-12 place-items-center rounded-full bg-surface-2">
            <Clock3 className="size-5" />
          </span>
          <h1 className="text-[26px] font-semibold">Hola, {perfil?.nombre.split(' ')[0]}</h1>
          {pendientes.length ? (
            <>
              <p className="mt-2 text-[15px] text-ink-2">
                Su cuenta está creada. Para entrar, el administrador de la institución debe aprobar su solicitud:
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {pendientes.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 rounded-[20px] bg-surface-2 px-4 py-3">
                    <span className="font-medium">{i.nombre}</span>
                    <Insignia tono="warn">Pendiente</Insignia>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-[15px] text-ink-2">Su cuenta está creada, pero aún no está vinculada a ninguna institución. Elija a cuál quiere acceder.</p>
          )}

          <div className="mt-6">
            <p className="mb-2 text-sm font-medium">{pendientes.length ? '¿Trabaja también en otra institución?' : 'Institución'}</p>
            <SolicitarAcceso />
          </div>

          <div className="mt-8 flex flex-wrap gap-2 border-t border-line pt-5">
            <Boton variante="secundario" icono={<RefreshCw className="size-4" />} onClick={revisar} cargando={revisando}>
              Ya me aprobaron
            </Boton>
            <Boton variante="fantasma" icono={<LogOut className="size-4" />} onClick={salir}>
              Cerrar sesión
            </Boton>
          </div>
        </div>
      </div>
    </div>
  );
}
