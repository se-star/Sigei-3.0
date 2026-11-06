import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  Cake,
  ChevronsLeft,
  LogOut,
  Megaphone,
  Menu,
  Monitor,
  Moon,
  Search,
  Sun,
  UserRound,
  ListTodo,
  X,
  FlaskConical,
} from 'lucide-react';
import { NAVEGACION } from './navegacion';
import { Paleta } from './Paleta';
import { useAuth } from '@/hooks/useAuth';
import { useTema, type Tema } from '@/hooks/useTema';
import { useAjustes } from '@/hooks/useDatos';
import { useNotificaciones, type Notificacion } from '@/hooks/useNotificaciones';
import { Avatar } from '@/components/ui';
import { etiqueta, ROLES } from '@/lib/catalogos';
import { modoDemo } from '@/lib/backend';
import { cx } from '@/lib/utils';
import { Logo } from './Logo';

export function Shell() {
  const { perfil, ver, salir } = useAuth();
  const ajustes = useAjustes();
  const [colapsado, setColapsado] = useState(() => localStorage.getItem('sigei.menu') === 'mini');
  const [movil, setMovil] = useState(false);
  const [paleta, setPaleta] = useState(false);
  const loc = useLocation();

  useEffect(() => setMovil(false), [loc.pathname]);
  useEffect(() => {
    try {
      localStorage.setItem('sigei.menu', colapsado ? 'mini' : 'full');
    } catch {
      /* sin almacenamiento */
    }
  }, [colapsado]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaleta((p) => !p);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  if (!perfil) return null;

  const menu = (mini: boolean) => (
    <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4" aria-label="Menú principal">
      {NAVEGACION.map((g) => {
        const items = g.items.filter((i) => ver(i.modulo));
        if (!items.length) return null;
        return (
          <div key={g.grupo} className="mt-5 first:mt-2">
            {!mini && (
              <p className="mb-1.5 px-3 text-[11px] font-bold tracking-[.12em] text-white/40 uppercase">{g.grupo}</p>
            )}
            <ul className="flex flex-col gap-0.5">
              {items.map((i) => (
                <li key={i.ruta}>
                  <NavLink
                    to={i.ruta}
                    end={i.ruta === '/'}
                    title={mini ? i.etiqueta : undefined}
                    className={({ isActive }) =>
                      cx(
                        'group flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium transition',
                        mini && 'justify-center px-0',
                        isActive
                          ? 'bg-lime text-lime-ink shadow-sm'
                          : 'text-white/70 hover:bg-white/8 hover:text-white',
                      )
                    }
                  >
                    <i.icono className="size-[18px] shrink-0" strokeWidth={2} />
                    {!mini && <span className="truncate">{i.etiqueta}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const marca = (mini: boolean) => (
    <div className={cx('flex items-center gap-3 px-5 pt-5 pb-3', mini && 'justify-center px-0')}>
      <Logo className="size-9 shrink-0" />
      {!mini && (
        <div className="min-w-0">
          <p className="font-display text-lg leading-none font-extrabold text-white">
            SIGEI<span className="ml-1 text-lime">3</span>
          </p>
          <p className="mt-1 truncate text-xs text-white/50">{ajustes.sigla || ajustes.institucion}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh">
      {/* Menú lateral escritorio */}
      <aside
        className={cx(
          'no-print fixed inset-y-0 left-0 z-40 hidden flex-col bg-[#0d2b28] transition-[width] duration-300 lg:flex dark:bg-[#0a1a18]',
          colapsado ? 'w-[76px]' : 'w-[264px]',
        )}
      >
        {marca(colapsado)}
        {menu(colapsado)}
        <button
          onClick={() => setColapsado(!colapsado)}
          className="m-3 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-white/50 hover:bg-white/8 hover:text-white"
          aria-label={colapsado ? 'Expandir menú' : 'Contraer menú'}
        >
          <ChevronsLeft className={cx('size-4 transition', colapsado && 'rotate-180')} />
          {!colapsado && 'Contraer'}
        </button>
      </aside>

      {/* Menú móvil */}
      {movil && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="anim-fade absolute inset-0 bg-ink/50" onClick={() => setMovil(false)} />
          <aside className="anim-rise relative flex h-full w-[280px] flex-col bg-[#0d2b28] dark:bg-[#0a1a18]">
            <button
              onClick={() => setMovil(false)}
              className="absolute top-5 right-4 text-white/60 hover:text-white"
              aria-label="Cerrar menú"
            >
              <X className="size-5" />
            </button>
            {marca(false)}
            {menu(false)}
          </aside>
        </div>
      )}

      <div className={cx('transition-[padding] duration-300', colapsado ? 'lg:pl-[76px]' : 'lg:pl-[264px]')}>
        <header className="no-print sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              className="grid size-9 place-items-center rounded-xl text-ink-2 hover:bg-surface-2 lg:hidden"
              onClick={() => setMovil(true)}
              aria-label="Abrir menú"
            >
              <Menu className="size-5" />
            </button>
            <button
              onClick={() => setPaleta(true)}
              className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line bg-surface px-3 text-left text-sm text-muted transition hover:border-line-strong sm:max-w-md"
            >
              <Search className="size-4 shrink-0" />
              <span className="truncate">Buscar docentes, grupos, módulos…</span>
              <kbd className="ml-auto hidden rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[11px] font-semibold sm:inline">
                Ctrl K
              </kbd>
            </button>
            <div className="ml-auto flex items-center gap-1.5">
              {modoDemo && (
                <span className="hidden items-center gap-1.5 rounded-full bg-lime px-3 py-1 text-xs font-bold text-lime-ink md:inline-flex">
                  <FlaskConical className="size-3.5" />
                  Modo demo
                </span>
              )}
              <SelectorTema />
              <Campana />
              <MenuUsuario nombre={perfil.nombre} rol={etiqueta(ROLES, perfil.rol)} onSalir={salir} />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
      <Paleta abierta={paleta} onCerrar={() => setPaleta(false)} />
    </div>
  );
}

function SelectorTema() {
  const { tema, setTema } = useTema();
  const sig: Record<Tema, Tema> = { light: 'dark', dark: 'system', system: 'light' };
  const Icono = tema === 'light' ? Sun : tema === 'dark' ? Moon : Monitor;
  const nombre = { light: 'claro', dark: 'oscuro', system: 'automático' }[tema];
  return (
    <button
      onClick={() => setTema(sig[tema])}
      className="grid size-10 place-items-center rounded-xl text-ink-2 transition hover:bg-surface-2 hover:text-ink"
      title={`Tema ${nombre} (clic para cambiar)`}
      aria-label={`Tema ${nombre}. Cambiar tema`}
    >
      <Icono className="size-[18px]" />
    </button>
  );
}

const ICONO_NOTI: Record<Notificacion['tipo'], typeof Bell> = {
  novedad: Bell,
  evento: CalendarDays,
  comunicado: Megaphone,
  cumple: Cake,
  tarea: ListTodo,
};

function Campana() {
  const [abierta, setAbierta] = useState(false);
  const { lista, noLeidas, marcar, marcarTodas } = useNotificaciones();
  const nav = useNavigate();
  return (
    <div className="relative">
      <button
        onClick={() => setAbierta(!abierta)}
        className="relative grid size-10 place-items-center rounded-xl text-ink-2 transition hover:bg-surface-2 hover:text-ink"
        aria-label={`Notificaciones${noLeidas ? `, ${noLeidas} sin leer` : ''}`}
        aria-expanded={abierta}
      >
        <Bell className="size-[18px]" />
        {noLeidas > 0 && (
          <span className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] leading-4 font-bold text-white">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>
      {abierta && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierta(false)} />
          <div className="anim-rise absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-display font-bold">Notificaciones</p>
              {noLeidas > 0 && (
                <button onClick={marcarTodas} className="text-xs font-semibold text-brand hover:underline">
                  Marcar todo como leído
                </button>
              )}
            </div>
            <ul className="scrollbar-thin max-h-[60vh] overflow-y-auto">
              {lista.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">Todo al día. No hay avisos.</li>}
              {lista.map((n) => {
                const I = ICONO_NOTI[n.tipo];
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => {
                        marcar(n.id);
                        setAbierta(false);
                        nav(n.ruta);
                      }}
                      className={cx(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface-2',
                        !n.leida && 'bg-brand-soft/40',
                      )}
                    >
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-brand">
                        <I className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{n.titulo}</span>
                        <span className="block truncate text-xs text-muted">{n.detalle}</span>
                      </span>
                      {!n.leida && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function MenuUsuario({ nombre, rol, onSalir }: { nombre: string; rol: string; onSalir: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const nav = useNavigate();
  return (
    <div className="relative">
      <button
        onClick={() => setAbierto(!abierto)}
        className="flex items-center gap-2.5 rounded-xl py-1 pr-2 pl-1 transition hover:bg-surface-2"
        aria-expanded={abierto}
        aria-label="Menú de usuario"
      >
        <Avatar nombre={nombre} tam={34} />
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-36 truncate text-sm font-semibold">{nombre}</span>
          <span className="block text-xs text-muted">{rol}</span>
        </span>
      </button>
      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div className="anim-rise absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-pop">
            <button
              onClick={() => {
                setAbierto(false);
                nav('/perfil');
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium hover:bg-surface-2"
            >
              <UserRound className="size-4" /> Mi perfil
            </button>
            <button
              onClick={onSalir}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-danger hover:bg-danger-soft"
            >
              <LogOut className="size-4" /> Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}
