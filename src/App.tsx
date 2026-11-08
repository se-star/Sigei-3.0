import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { Cargando, Vacio } from './components/ui';
import { useAuth } from './hooks/useAuth';
import type { Modulo } from './lib/permisos';
import Login from './pages/Login';
import { ShieldX } from 'lucide-react';

const Inicio = lazy(() => import('./pages/Inicio'));
const Docentes = lazy(() => import('./pages/Docentes'));
const DocenteDetalle = lazy(() => import('./pages/DocenteDetalle'));
const Grupos = lazy(() => import('./pages/Grupos'));
const Asignacion = lazy(() => import('./pages/Asignacion'));
const Horarios = lazy(() => import('./pages/Horarios'));
const Novedades = lazy(() => import('./pages/Novedades'));
const Seguimiento = lazy(() => import('./pages/Seguimiento'));
const Calendario = lazy(() => import('./pages/Calendario'));
const Comunicados = lazy(() => import('./pages/Comunicados'));
const Tareas = lazy(() => import('./pages/Tareas'));
const Reportes = lazy(() => import('./pages/Reportes'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const Sedes = lazy(() => import('./pages/Sedes'));
const Actividad = lazy(() => import('./pages/Actividad'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const Perfil = lazy(() => import('./pages/Perfil'));

function Protegida({ modulo, children }: { modulo: Modulo; children: ReactNode }) {
  const { ver } = useAuth();
  if (!ver(modulo))
    return (
      <Vacio
        icono={<ShieldX className="size-6" />}
        titulo="Sin acceso a este módulo"
        texto="Su rol no tiene permiso para ver esta sección. Si cree que es un error, comuníquese con la administración."
      />
    );
  return <>{children}</>;
}

export default function App() {
  const { perfil, cargando } = useAuth();
  if (cargando)
    return (
      <div className="grid min-h-dvh place-items-center">
        <Cargando texto="Iniciando SIGEI…" />
      </div>
    );
  if (!perfil) return <Login />;

  const r = (modulo: Modulo, el: ReactNode) => <Protegida modulo={modulo}>{el}</Protegida>;

  return (
    <Suspense fallback={<Cargando />}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={r('inicio', <Inicio />)} />
          <Route path="docentes" element={r('docentes', <Docentes />)} />
          <Route path="docentes/:id" element={r('docentes', <DocenteDetalle />)} />
          <Route path="grupos" element={r('grupos', <Grupos />)} />
          <Route path="asignacion" element={r('asignacion', <Asignacion />)} />
          <Route path="horarios" element={r('horarios', <Horarios />)} />
          <Route path="novedades" element={r('novedades', <Novedades />)} />
          <Route path="seguimiento" element={r('seguimiento', <Seguimiento />)} />
          <Route path="calendario" element={r('calendario', <Calendario />)} />
          <Route path="comunicados" element={r('comunicados', <Comunicados />)} />
          <Route path="tareas" element={r('tareas', <Tareas />)} />
          <Route path="reportes" element={r('reportes', <Reportes />)} />
          <Route path="usuarios" element={r('usuarios', <Usuarios />)} />
          <Route path="sedes" element={r('sedes', <Sedes />)} />
          <Route path="actividad" element={r('actividad', <Actividad />)} />
          <Route path="configuracion" element={r('configuracion', <Configuracion />)} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
