import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { Boton, Campo, Entrada } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { backend, modoDemo } from '@/lib/backend';

/**
 * Ingreso de docentes: documento → código de 6 dígitos enviado al correo que
 * registró la institución. No requiere contraseña.
 */
export function IngresoDocente() {
  const { ingresarConCodigo } = useAuth();
  const toast = useToast();
  const [paso, setPaso] = useState<'documento' | 'codigo'>('documento');
  const [documento, setDocumento] = useState('');
  const [codigo, setCodigo] = useState('');
  const [destinos, setDestinos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [espera, setEspera] = useState(0);
  const campoCodigo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera(espera - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const pedirCodigo = async (e?: FormEvent) => {
    e?.preventDefault();
    if (documento.replace(/[.\s-]/g, '').length < 4) return toast.error('Escriba su número de documento.');
    setCargando(true);
    try {
      const r = await backend.auth.solicitarCodigoDocente(documento);
      setDestinos(r.destinos);
      setPaso('codigo');
      setCodigo('');
      setEspera(60);
      setTimeout(() => campoCodigo.current?.focus(), 50);
    } catch (err) {
      toast.error(err);
    } finally {
      setCargando(false);
    }
  };

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    if (codigo.replace(/\D/g, '').length < 6) return toast.error('Escriba el código de 6 dígitos que llegó a su correo.');
    setCargando(true);
    try {
      await ingresarConCodigo(documento, codigo);
    } catch (err) {
      toast.error(err);
      setCargando(false);
    }
  };

  if (paso === 'documento')
    return (
      <form onSubmit={pedirCodigo} className="flex flex-col gap-4">
        <Campo etiqueta="Número de documento" requerido ayuda="Le enviaremos un código a su correo registrado en la institución.">
          {(id) => (
            <Entrada
              id={id}
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              inputMode="numeric"
              autoComplete="username"
              placeholder="Sin puntos ni espacios"
              autoFocus
            />
          )}
        </Campo>
        {modoDemo && (
          <p className="rounded-[20px] bg-surface-2 p-3 text-[13px] text-ink-2">
            Modo demo: pruebe con el documento <strong>43000000</strong> (Laura Restrepo, docente en dos colegios). El código es <strong>123456</strong>.
          </p>
        )}
        <Boton type="submit" cargando={cargando} className="h-12" icono={<Mail className="size-4" />}>
          Enviarme el código
        </Boton>
      </form>
    );

  return (
    <form onSubmit={entrar} className="flex flex-col gap-4">
      <p className="text-[15px] text-ink-2">
        Enviamos un código de 6 dígitos a <strong className="text-ink">{destinos.join(' y ')}</strong>. Revise también la carpeta de correo no deseado.
      </p>
      <Campo etiqueta="Código" requerido>
        {(id) => (
          <Entrada
            id={id}
            ref={campoCodigo}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 10))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            className="text-center text-2xl tracking-[0.4em] tabular-nums"
          />
        )}
      </Campo>
      <Boton type="submit" cargando={cargando} className="h-12">
        Ingresar
      </Boton>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button type="button" className="flex items-center gap-1 text-ink underline underline-offset-2" onClick={() => setPaso('documento')}>
          <ArrowLeft className="size-3.5" /> Cambiar documento
        </button>
        <button
          type="button"
          className="text-ink underline underline-offset-2 disabled:text-muted disabled:no-underline"
          disabled={espera > 0 || cargando}
          onClick={() => pedirCodigo()}
        >
          {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
        </button>
      </div>
    </form>
  );
}
