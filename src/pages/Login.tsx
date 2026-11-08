import { useState, type FormEvent } from 'react';
import { ArrowRight, Bell, Check, Clock3, GraduationCap, ShieldCheck, UserRound, Users } from 'lucide-react';
import { Boton, Campo, Entrada } from '@/components/ui';
import { Logo, Wordmark } from '@/components/layout/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { backend, modoDemo } from '@/lib/backend';
import type { Rol } from '@/lib/types';
import { cx } from '@/lib/utils';

const ROLES_DEMO: { rol: Rol; titulo: string; texto: string; icono: typeof Users }[] = [
  { rol: 'admin', titulo: 'Administrador', texto: 'Acceso total, usuarios y configuración', icono: ShieldCheck },
  { rol: 'rector', titulo: 'Rectoría', texto: 'Gestión institucional y aprobaciones', icono: GraduationCap },
  { rol: 'coordinador', titulo: 'Coordinación', texto: 'Horarios, novedades y seguimiento', icono: Users },
  { rol: 'docente', titulo: 'Docente', texto: 'Su horario, permisos y comunicados', icono: UserRound },
];

export default function Login() {
  return (
    <div className="min-h-dvh px-4 pt-10 pb-16 sm:pt-14">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center">
        <Constelacion />
        <div className="anim-rise -mt-2 flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <Logo className="size-12 sm:size-14" />
            <Wordmark className="text-[64px] leading-none sm:text-[88px]" />
          </div>
          <p className="mt-4 max-w-md text-[17px] text-ink-2">
            Gestión educativa institucional: docentes, grupos, horarios y novedades en un solo lugar.
          </p>
        </div>
        <div className="anim-rise card mt-10 w-full max-w-md p-6 sm:p-8">{modoDemo ? <AccesoDemo /> : <AccesoNube />}</div>
        <p className="mt-10 text-[13px] text-muted">© {new Date().getFullYear()} SIGEI · Versión 3.0</p>
      </div>
    </div>
  );
}

/** Tarjetas flotantes con contenido real del sistema, a modo de vitrina. */
function Constelacion() {
  const tarjeta = 'card anim-flotar absolute flex items-center gap-3 p-3 pr-5 text-left';
  return (
    <div className="pointer-events-none relative hidden h-[210px] w-full max-w-[880px] select-none md:block" aria-hidden>
      <div className={cx(tarjeta, 'top-6 left-0')} style={{ ['--giro' as string]: '-4deg', animationDelay: '0s' }}>
        <span className="grid size-12 place-items-center rounded-[20px] bg-surface-2">
          <Clock3 className="size-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold">Matemáticas · 6°1</span>
          <span className="block text-xs text-muted">Lunes 06:30 – 07:25</span>
        </span>
      </div>
      <div className={cx(tarjeta, 'top-0 left-[30%]')} style={{ ['--giro' as string]: '2deg', animationDelay: '-2s' }}>
        <span className="grid size-12 place-items-center rounded-full bg-ok-soft text-ok">
          <Check className="size-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold">Permiso aprobado</span>
          <span className="block text-xs text-muted">Reemplazo asignado</span>
        </span>
      </div>
      <div className={cx(tarjeta, 'top-2 right-[4%]')} style={{ ['--giro' as string]: '5deg', animationDelay: '-4s' }}>
        <span className="flex w-12 flex-col items-center rounded-[20px] bg-ink py-1.5 text-bg">
          <span className="text-[10px] uppercase">Nov</span>
          <span className="text-lg leading-none font-semibold">18</span>
        </span>
        <span>
          <span className="block text-sm font-semibold">Feria de la ciencia</span>
          <span className="block text-xs text-muted">Coliseo · 7:00 a. m.</span>
        </span>
      </div>
      <div className={cx(tarjeta, 'bottom-6 left-[14%]')} style={{ ['--giro' as string]: '3deg', animationDelay: '-1s' }}>
        <span className="grid size-12 place-items-center rounded-full bg-[#8a7563] text-sm font-medium text-white">LR</span>
        <span>
          <span className="block text-sm font-semibold">Laura Restrepo</span>
          <span className="block text-xs text-muted">17 de 22 horas</span>
        </span>
      </div>
      <div className={cx(tarjeta, 'right-[18%] bottom-2')} style={{ ['--giro' as string]: '-3deg', animationDelay: '-3s' }}>
        <span className="grid size-12 place-items-center rounded-[20px] bg-surface-2">
          <Bell className="size-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold">2 solicitudes</span>
          <span className="block text-xs text-muted">Por revisar hoy</span>
        </span>
      </div>
    </div>
  );
}

function AccesoDemo() {
  const { ingresarDemo } = useAuth();
  const toast = useToast();
  const [cargando, setCargando] = useState<Rol | null>(null);
  const entrar = async (rol: Rol) => {
    setCargando(rol);
    try {
      await ingresarDemo(rol);
    } catch (e) {
      toast.error(e);
      setCargando(null);
    }
  };
  return (
    <>
      <h2 className="text-[26px] font-semibold">Explore SIGEI 3.0</h2>
      <p className="mt-1.5 text-[15px] text-muted">
        Modo demo: los datos son de ejemplo y se guardan solo en este navegador. Elija un rol para entrar.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        {ROLES_DEMO.map((r) => (
          <button
            key={r.rol}
            onClick={() => entrar(r.rol)}
            disabled={!!cargando}
            className={cx(
              'group flex items-center gap-3 rounded-full border border-line bg-surface p-1.5 pr-4 text-left shadow-chip transition hover:shadow-pop',
              cargando === r.rol && 'ring-2 ring-accent/30',
            )}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2">
              <r.icono className="size-[18px]" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">{r.titulo}</span>
              <span className="block truncate text-[13px] text-muted">{r.texto}</span>
            </span>
            <ArrowRight className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
          </button>
        ))}
      </div>
      <p className="mt-5 text-[13px] text-muted">Para usar datos reales con inicio de sesión, conecte un proyecto Supabase (vea el README).</p>
    </>
  );
}

function AccesoNube() {
  const { ingresar } = useAuth();
  const toast = useToast();
  const [modo, setModo] = useState<'entrar' | 'registro' | 'recuperar'>('entrar');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje('');
    try {
      if (modo === 'entrar') await ingresar(email.trim(), clave);
      if (modo === 'registro') {
        await backend.auth.registrarse?.(nombre.trim(), email.trim(), clave);
        setMensaje('Solicitud enviada. Confirme su correo; la administración activará su cuenta y le asignará un rol.');
        setModo('entrar');
      }
      if (modo === 'recuperar') {
        await backend.auth.recuperarClave?.(email.trim());
        setMensaje('Si el correo está registrado, recibirá un enlace para restablecer su contraseña.');
        setModo('entrar');
      }
    } catch (err) {
      toast.error(err);
    } finally {
      setCargando(false);
    }
  };

  const titulos = { entrar: 'Bienvenido de nuevo', registro: 'Solicitar acceso', recuperar: 'Recuperar contraseña' };
  return (
    <>
      <h2 className="text-[26px] font-semibold">{titulos[modo]}</h2>
      <p className="mt-1.5 text-[15px] text-muted">
        {modo === 'entrar' && 'Ingrese con su correo institucional.'}
        {modo === 'registro' && 'Cree su cuenta. La administración debe aprobarla antes de que pueda ingresar.'}
        {modo === 'recuperar' && 'Le enviaremos un enlace para crear una contraseña nueva.'}
      </p>
      {mensaje && <p className="mt-5 rounded-[20px] bg-ok-soft p-4 text-sm font-medium text-ok">{mensaje}</p>}
      <form onSubmit={enviar} className="mt-7 flex flex-col gap-4">
        {modo === 'registro' && (
          <Campo etiqueta="Nombre completo" requerido>
            {(id) => <Entrada id={id} value={nombre} onChange={(e) => setNombre(e.target.value)} required autoComplete="name" />}
          </Campo>
        )}
        <Campo etiqueta="Correo electrónico" requerido>
          {(id) => (
            <Entrada
              id={id}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="nombre@colegio.edu.co"
            />
          )}
        </Campo>
        {modo !== 'recuperar' && (
          <Campo etiqueta="Contraseña" requerido ayuda={modo === 'registro' ? 'Mínimo 8 caracteres.' : undefined}>
            {(id) => (
              <Entrada
                id={id}
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                required
                minLength={modo === 'registro' ? 8 : undefined}
                autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
              />
            )}
          </Campo>
        )}
        <Boton type="submit" cargando={cargando} className="mt-2 h-12">
          {modo === 'entrar' ? 'Ingresar' : modo === 'registro' ? 'Enviar solicitud' : 'Enviar enlace'}
        </Boton>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm">
        {modo === 'entrar' ? (
          <>
            <button className="text-ink underline underline-offset-2 hover:text-ink-2" onClick={() => setModo('recuperar')}>
              ¿Olvidó su contraseña?
            </button>
            <button className="text-ink underline underline-offset-2 hover:text-ink-2" onClick={() => setModo('registro')}>
              Solicitar acceso
            </button>
          </>
        ) : (
          <button className="text-ink underline underline-offset-2 hover:text-ink-2" onClick={() => setModo('entrar')}>
            ← Volver a ingresar
          </button>
        )}
      </div>
    </>
  );
}
