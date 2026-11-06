import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Boton, Modal } from '@/components/ui';

interface Opciones {
  titulo: string;
  texto?: string;
  confirmar?: string;
  peligro?: boolean;
}

const Ctx = createContext<((o: Opciones) => Promise<boolean>) | null>(null);

/** Diálogo de confirmación accesible que reemplaza a window.confirm. */
export function ConfirmarProvider({ children }: { children: ReactNode }) {
  const [opc, setOpc] = useState<Opciones | null>(null);
  const resolver = useRef<(v: boolean) => void>(undefined);

  const pedir = useCallback((o: Opciones) => {
    setOpc(o);
    return new Promise<boolean>((res) => {
      resolver.current = res;
    });
  }, []);

  const cerrar = (v: boolean) => {
    resolver.current?.(v);
    setOpc(null);
  };

  return (
    <Ctx.Provider value={pedir}>
      {children}
      <Modal
        abierto={!!opc}
        onCerrar={() => cerrar(false)}
        titulo={opc?.titulo ?? ''}
        ancho="sm"
        pie={
          <>
            <Boton variante="secundario" onClick={() => cerrar(false)}>
              Cancelar
            </Boton>
            <Boton variante={opc?.peligro ? 'peligro' : 'primario'} onClick={() => cerrar(true)} data-autofocus>
              {opc?.confirmar ?? 'Confirmar'}
            </Boton>
          </>
        }
      >
        <p className="text-[15px] text-ink-2">{opc?.texto ?? '¿Desea continuar?'}</p>
      </Modal>
    </Ctx.Provider>
  );
}

export function useConfirmar() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useConfirmar fuera de ConfirmarProvider');
  return c;
}
