import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
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
import { NAVEGACION, etiquetaDe } from './navegacion';
import { Paleta } from './Paleta';
import { useAuth } from '@/hooks/useAuth';
import { useTema, type Tema } from '@/hooks/useTema';

import { useNotificaciones, type Notificacion } from '@/hooks/useNotificaciones';
import { Avatar } from '@/components/ui';
import { etiqueta, ROLES } from '@/lib/catalogos';
import { modoDemo } from '@/lib/backend';
import { cx } from '@/lib/utils';
import { Logo, Wordmark } from './Logo';
import { SelectorInstitucion } from './SelectorInstitucion';
import { useMisGrupos } from '@/pages/MiGrupo';

export function Shell() {
  const { perfil, ver, salir } = useAuth();
  const esDirector = useMisGrupos().length > 0;
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
    const abrir = () => setPaleta(true);
    window.addEventListener('keydown', fn);
    window.addEventListener('sigei:buscar', abrir);
    return () => {
      window.removeEventListener('keydown', fn);
      window.removeEventListener('sigei:buscar', abrir);
    };
  }, []);

  if (!perfil) return null;

  const esDocente = perfil.rol === 'docente';
  const visible = (m: (typeof NAVEGACION)[number]['items'][number]) => (m.modulo === 'migrupo' ? esDirector : ver(m.modulo));
  const menu = (mini: boolean) => (
    <MenuDesplazable mini={mini}>
      {NAVEGACION.map((g) => {
        const items = g.items.filter(visible);
        if (!items.length) return null;
        return (
          <div key={g.grupo} className={cx('mt-4 first:mt-3', mini && 'mt-2 border-t border-line pt-2 first:border-0')}>
            {!mini && <p className="mb-0.5 px-3 text-xs font-medium text-muted">{g.grupo}</p>}
            <ul className={cx('flex flex-col gap-0.5', mini && 'items-center')}>
              {items.map((i) => (
                <li key={i.ruta} className={cx(mini && 'w-12')}>
                  <NavLink
                    to={i.ruta}
                    end={i.ruta === '/'}
                    title={mini ? etiquetaDe(i, esDocente) : undefined}
                    aria-label={mini ? etiquetaDe(i, esDocente) : undefined}
                    className={({ isActive }) =>
                      cx(
                        'flex items-center gap-3 rounded-[20px] text-[15px] transition',
                        mini ? 'size-11 justify-center' : 'h-9 px-3',
                        isActive ? 'bg-surface-2 font-medium text-ink' : 'text-ink-2 hover:bg-surface-2/60 hover:text-ink',
                      )
                    }
                  >
                    <i.icono className="size-[20px] shrink-0" strokeWidth={1.75} />
                    {!mini && <span className="truncate">{etiquetaDe(i, esDocente)}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </MenuDesplazable>
  );

  const marca = (mini: boolean) => (
    <NavLink to="/" className={cx('flex items-center gap-2.5 pt-4 pb-3', mini ? 'justify-center' : 'px-5')} aria-label="Ir al inicio">
      <Logo className="size-9 shrink-0" />
      {!mini && (
        <span className="min-w-0">
          <Wordmark className="block text-[24px] leading-none" />
          <span className="mt-1 block truncate text-xs text-muted">Gestión educativa</span>
        </span>
      )}
    </NavLink>
  );

  return (
    <div className="min-h-dvh">
      {/* Menú lateral escritorio: blanco, sin borde; se contrae a un riel de 64px. */}
      <aside
        className={cx(
          'no-print fixed inset-y-0 left-0 z-40 hidden flex-col bg-surface transition-[width] duration-300 lg:flex',
          colapsado ? 'w-16' : 'w-[264px]',
        )}
      >
        {marca(colapsado)}
        <SelectorInstitucion mini={colapsado} />
        {menu(colapsado)}
        <button
          onClick={() => setColapsado(!colapsado)}
          className={cx(
            'mx-auto mb-4 flex h-9 items-center justify-center gap-2 rounded-full text-[13px] text-muted transition hover:bg-surface-2 hover:text-ink',
            colapsado ? 'w-9' : 'px-4',
          )}
          aria-label={colapsado ? 'Expandir menú' : 'Contraer menú'}
        >
          <ChevronsLeft className={cx('size-4 transition', colapsado && 'rotate-180')} />
          {!colapsado && 'Contraer menú'}
        </button>
      </aside>

      {/* Menú móvil */}
      {movil && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="anim-fade absolute inset-0 bg-black/25" onClick={() => setMovil(false)} />
          <aside className="anim-rise relative m-2 flex h-[calc(100%-16px)] w-[280px] flex-col rounded-[28px] bg-surface shadow-pop">
            <button
              onClick={() => setMovil(false)}
              className="absolute top-5 right-4 grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
              aria-label="Cerrar menú"
            >
              <X className="size-5" />
            </button>
            {marca(false)}
            <SelectorInstitucion />
            {menu(false)}
          </aside>
        </div>
      )}

      <div className={cx('transition-[padding] duration-300', colapsado ? 'lg:pl-16' : 'lg:pl-[264px]')}>
        <header className="no-print sticky top-0 z-30 bg-bg/80 backdrop-blur-md">
          <div className="mx-auto flex h-[72px] max-w-[1200px] items-center gap-3 px-4 sm:px-6 lg:px-10">
            <button
              className="grid size-10 place-items-center rounded-full bg-surface text-ink shadow-chip lg:hidden"
              onClick={() => setMovil(true)}
              aria-label="Abrir menú"
            >
              <Menu className="size-5" />
            </button>
            {loc.pathname === '/' ? <div className="flex-1" /> : <BusquedaPildora onAbrir={() => setPaleta(true)} texto={esDocente ? 'Buscar en SIGEI' : undefined} />}
            <div className="ml-auto flex items-center gap-1.5">
              {modoDemo && (
                <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] text-ink-2 shadow-chip md:inline-flex">
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
        <main className="mx-auto max-w-[1200px] px-4 pt-4 pb-16 sm:px-6 lg:px-10">
          <Outlet />
        </main>
      </div>
      <Paleta abierta={paleta} onCerrar={() => setPaleta(false)} />
    </div>
  );
}

/** Búsqueda en píldora con botón circular violeta: el único acento saturado. */
export function BusquedaPildora({ onAbrir, grande, texto = 'Buscar docentes, grupos o módulos' }: { onAbrir: () => void; grande?: boolean; texto?: string }) {
  return (
    <button
      onClick={onAbrir}
      className={cx(
        'group flex min-w-0 flex-1 items-center gap-3 rounded-full border border-black/10 bg-surface text-left text-muted shadow-chip transition hover:shadow-pop dark:border-white/10',
        grande ? 'h-14 max-w-xl py-1 pr-1 pl-5 text-[16px]' : 'h-12 py-1 pr-1 pl-5 text-[15px] sm:max-w-md',
      )}
    >
      <span className="truncate">{texto}</span>
      <kbd className="ml-auto hidden rounded-full border border-line px-2 py-0.5 font-sans text-[11px] text-muted sm:inline">Ctrl K</kbd>
      <span
        className={cx(
          'grid shrink-0 place-items-center rounded-full bg-accent text-white shadow-accent transition group-hover:brightness-110',
          grande ? 'size-12' : 'size-10',
        )}
        aria-hidden
      >
        <Search className="size-[18px]" strokeWidth={2.25} />
      </span>
    </button>
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
      className="grid size-10 place-items-center rounded-full bg-surface text-ink shadow-chip transition hover:shadow-pop"
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
        className="relative grid size-10 place-items-center rounded-full bg-surface text-ink shadow-chip transition hover:shadow-pop"
        aria-label={`Notificaciones${noLeidas ? `, ${noLeidas} sin leer` : ''}`}
        aria-expanded={abierta}
      >
        <Bell className="size-[18px]" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-[18px] place-items-center rounded-full bg-ink px-1 text-[10px] leading-[18px] font-medium text-bg">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>
      {abierta && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierta(false)} />
          <div className="anim-rise absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-[28px] bg-surface shadow-pop">
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <p className="text-[17px] font-semibold tracking-tight">Notificaciones</p>
              {noLeidas > 0 && (
                <button onClick={marcarTodas} className="text-xs text-ink underline-offset-2 hover:underline">
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
                        !n.leida && "bg-surface-2/60",
                      )}
                    >
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">
                        <I className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{n.titulo}</span>
                        <span className="block truncate text-xs text-muted">{n.detalle}</span>
                      </span>
                      {!n.leida && <span className="mt-2 size-2 shrink-0 rounded-full bg-ink" />}
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
        className="flex items-center gap-2.5 rounded-full bg-surface py-1 pr-4 pl-1 shadow-chip transition hover:shadow-pop"
        aria-expanded={abierto}
        aria-label="Menú de usuario"
      >
        <Avatar nombre={nombre} tam={32} />
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-36 truncate text-sm font-semibold">{nombre}</span>
          <span className="block text-xs text-muted">{rol}</span>
        </span>
      </button>
      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div className="anim-rise absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-[28px] bg-surface p-2 shadow-pop">
            <button
              onClick={() => {
                setAbierto(false);
                nav('/perfil');
              }}
              className="flex w-full items-center gap-2.5 rounded-[20px] px-3 py-2.5 text-sm hover:bg-surface-2"
            >
              <UserRound className="size-4" /> Mi perfil
            </button>
            <button
              onClick={onSalir}
              className="flex w-full items-center gap-2.5 rounded-[20px] px-3 py-2.5 text-sm text-danger hover:bg-danger-soft"
            >
              <LogOut className="size-4" /> Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Contenedor del menú: si quedan opciones por debajo del borde de la pantalla,
 * muestra un botón “Más opciones” para que no pasen desapercibidas.
 */
function MenuDesplazable({ mini, children }: { mini: boolean; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [hayMas, setHayMas] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const revisar = () => setHayMas(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
    revisar();
    el.addEventListener('scroll', revisar, { passive: true });
    const ro = new ResizeObserver(revisar);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', revisar);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <nav ref={ref} className={cx('scrollbar-thin flex-1 overflow-y-auto pb-4', mini ? 'px-2' : 'px-3')} aria-label="Menú principal">
        <div>{children}</div>
      </nav>
      {hayMas && (
        <button
          onClick={() => ref.current?.scrollBy({ top: ref.current.clientHeight * 0.7, behavior: 'smooth' })}
          className={cx(
            'anim-fade absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-surface text-[13px] text-ink shadow-pop transition hover:bg-surface-2',
            mini ? 'size-9 justify-center' : 'h-8 px-3.5',
          )}
          aria-label="Ver más opciones del menú"
          title="Más opciones"
        >
          {!mini && 'Más opciones'}
          <ChevronDown className="size-4" />
        </button>
      )}
    </div>
  );
}
