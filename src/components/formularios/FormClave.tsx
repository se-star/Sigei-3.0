import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { Boton, Campo, Entrada } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

/** Formulario de contraseña nueva, con confirmación. */
export function FormClave({ onListo, textoBoton = 'Guardar contraseña' }: { onListo?: () => void; textoBoton?: string }) {
  const { cambiarClave } = useAuth();
  const toast = useToast();
  const [clave, setClave] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (clave.length < 8) return setError('Use al menos 8 caracteres.');
    if (clave !== repetir) return setError('Las contraseñas no coinciden.');
    setError('');
    setGuardando(true);
    try {
      await cambiarClave(clave);
      toast.ok('Contraseña actualizada.');
      setClave('');
      setRepetir('');
      onListo?.();
    } catch (err) {
      toast.error(err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <Campo etiqueta="Contraseña nueva" requerido ayuda="Mínimo 8 caracteres.">
        {(id) => <Entrada id={id} type="password" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} />}
      </Campo>
      <Campo etiqueta="Repita la contraseña" requerido error={error}>
        {(id) => <Entrada id={id} type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} />}
      </Campo>
      <Boton type="submit" cargando={guardando} icono={<KeyRound className="size-4" />}>
        {textoBoton}
      </Boton>
    </form>
  );
}
