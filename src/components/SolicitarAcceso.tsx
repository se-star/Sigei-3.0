import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Boton, Selector } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { backend } from '@/lib/backend';
import type { InstitucionPublica } from '@/lib/data/provider';

/** Pide acceso a otra institución; queda pendiente hasta que su administrador lo active. */
export function SolicitarAcceso() {
  const { instituciones, solicitarAcceso } = useAuth();
  const toast = useToast();
  const [todas, setTodas] = useState<InstitucionPublica[]>([]);
  const [elegida, setElegida] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    backend.auth.institucionesPublicas().then(setTodas).catch(() => setTodas([]));
  }, []);

  const disponibles = todas.filter((t) => !instituciones.some((i) => i.id === t.id));
  if (!disponibles.length) return <p className="text-sm text-muted">Ya tiene acceso o solicitudes en todas las instituciones disponibles.</p>;

  const enviar = async () => {
    if (!elegida) return toast.error('Elija una institución.');
    setEnviando(true);
    try {
      await solicitarAcceso(elegida);
      toast.ok('Solicitud enviada. El administrador de esa institución debe activarla.');
      setElegida('');
    } catch (e) {
      toast.error(e);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Selector value={elegida} onChange={(e) => setElegida(e.target.value)} aria-label="Institución a la que quiere acceder">
        <option value="">Elija una institución…</option>
        {disponibles.map((i) => (
          <option key={i.id} value={i.id}>
            {i.nombre}
            {i.municipio ? ` · ${i.municipio}` : ''}
          </option>
        ))}
      </Selector>
      <Boton onClick={enviar} cargando={enviando} icono={<Send className="size-4" />}>
        Solicitar acceso
      </Boton>
    </div>
  );
}
