import { useState, type FormEvent } from 'react';
import { ArrowRight, BookOpenCheck, CalendarDays, Clock3, GraduationCap, ShieldCheck, UserRound, Users } from 'lucide-react';
import { Boton, Campo, Entrada } from '@/components/ui';
import { Logo } from '@/components/layout/Logo';
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
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <Presentacion />
      <div className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="anim-rise w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo className="size-10" />
            <p className="font-display text-xl font-extrabold">
              SIGEI <span className="text-brand">3.0</span>
            </p>
          </div>
          {modoDemo ? <AccesoDemo /> : <AccesoNube />}
        </div>
      </div>
    </div>
  );
}

function Presentacion() {
  const puntos = [
    { icono: Clock3, texto: 'Horarios con detección automática de choques' },
    { icono: BookOpenCheck, texto: 'Asignación académica y carga docente en tiempo real' },
    { icono: CalendarDays, texto: 'Novedades, reemplazos y calendario en un solo lugar' },
  ];
  return (
    <div className="relative hidden overflow-hidden bg-[#0d2b28] p-12 text-white lg:flex lg:flex-col">
      <div
        aria-hidden
        className="absolute -top-40 -right-40 size-[520px] rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, #bef264, transparent 65%)' }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[.07]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div className="relative flex items-center gap-3">
        <Logo className="size-11" />
        <p className="font-display text-2xl font-extrabold">
          SIGEI <span className="text-lime">3.0</span>
        </p>
      </div>
      <div className="relative mt-auto max-w-lg">
        <p className="mb-4 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-lime">
          Sistema de Gestión Educativa Institucional
        </p>
        <h1 className="text-5xl leading-[1.05] font-extrabold">
          La gestión del colegio, <span className="text-lime">clara y en orden.</span>
        </h1>
        <p className="mt-5 text-lg text-white/70">
          Docentes, grupos, horarios, novedades y comunicación institucional en una sola plataforma.
        </p>
        <ul className="mt-10 flex flex-col gap-4">
          {puntos.map((p) => (
            <li key={p.texto} className="flex items-center gap-3 text-white/85">
              <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-lime">
                <p.icono className="size-[18px]" />
              </span>
              {p.texto}
            </li>
          ))}
        </ul>
      </div>
      <p className="relative mt-12 text-sm text-white/40">© {new Date().getFullYear()} SIGEI · Versión 3.0</p>
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
      <h2 className="text-3xl font-extrabold">Explore SIGEI 3.0</h2>
      <p className="mt-2 text-muted">
        Está en <strong className="text-ink">modo demo</strong>: los datos son de ejemplo y se guardan solo en este navegador.
        Elija un rol para ver la plataforma desde esa perspectiva.
      </p>
      <div className="mt-7 flex flex-col gap-2.5">
        {ROLES_DEMO.map((r) => (
          <button
            key={r.rol}
            onClick={() => entrar(r.rol)}
            disabled={!!cargando}
            className={cx(
              'group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-brand/50',
              cargando === r.rol && 'border-brand',
            )}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-soft-ink">
              <r.icono className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{r.titulo}</span>
              <span className="block text-sm text-muted">{r.texto}</span>
            </span>
            <ArrowRight className="size-5 text-muted transition group-hover:translate-x-1 group-hover:text-brand" />
          </button>
        ))}
      </div>
      <p className="mt-6 rounded-xl bg-surface-2 p-3.5 text-[13px] text-ink-2">
        Para usar datos reales con inicio de sesión, conecte un proyecto Supabase. Vea las instrucciones en el archivo README.
      </p>
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
      <h2 className="text-3xl font-extrabold">{titulos[modo]}</h2>
      <p className="mt-2 text-muted">
        {modo === 'entrar' && 'Ingrese con su correo institucional.'}
        {modo === 'registro' && 'Cree su cuenta. La administración debe aprobarla antes de que pueda ingresar.'}
        {modo === 'recuperar' && 'Le enviaremos un enlace para crear una contraseña nueva.'}
      </p>
      {mensaje && <p className="mt-5 rounded-xl bg-ok-soft p-3.5 text-sm font-medium text-ok">{mensaje}</p>}
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
        <Boton type="submit" cargando={cargando} className="mt-2 h-11">
          {modo === 'entrar' ? 'Ingresar' : modo === 'registro' ? 'Enviar solicitud' : 'Enviar enlace'}
        </Boton>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm">
        {modo === 'entrar' ? (
          <>
            <button className="font-semibold text-brand hover:underline" onClick={() => setModo('recuperar')}>
              ¿Olvidó su contraseña?
            </button>
            <button className="font-semibold text-brand hover:underline" onClick={() => setModo('registro')}>
              Solicitar acceso
            </button>
          </>
        ) : (
          <button className="font-semibold text-brand hover:underline" onClick={() => setModo('entrar')}>
            ← Volver a ingresar
          </button>
        )}
      </div>
    </>
  );
}
