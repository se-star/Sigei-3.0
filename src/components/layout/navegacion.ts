import {
  Bell,
  BookOpenCheck,
  Building2,
  CalendarDays,
  Clock3,
  FileBarChart2,
  History,
  LayoutDashboard,
  ListTodo,
  Megaphone,
  Network,
  Settings,
  UserRoundCheck,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { Modulo } from '@/lib/permisos';

export interface ItemNav {
  ruta: string;
  etiqueta: string;
  icono: LucideIcon;
  modulo: Modulo;
  descripcion: string;
}

export const NAVEGACION: { grupo: string; items: ItemNav[] }[] = [
  {
    grupo: 'Principal',
    items: [{ ruta: '/', etiqueta: 'Inicio', icono: LayoutDashboard, modulo: 'inicio', descripcion: 'Resumen del día' }],
  },
  {
    grupo: 'Académico',
    items: [
      { ruta: '/docentes', etiqueta: 'Docentes', icono: UsersRound, modulo: 'docentes', descripcion: 'Directorio y hojas de vida' },
      { ruta: '/grupos', etiqueta: 'Grados y grupos', icono: Network, modulo: 'grupos', descripcion: 'Estructura académica' },
      { ruta: '/asignacion', etiqueta: 'Asignación académica', icono: BookOpenCheck, modulo: 'asignacion', descripcion: 'Carga docente por grupo' },
      { ruta: '/horarios', etiqueta: 'Horarios', icono: Clock3, modulo: 'horarios', descripcion: 'Horario semanal' },
    ],
  },
  {
    grupo: 'Personal',
    items: [
      { ruta: '/novedades', etiqueta: 'Novedades y permisos', icono: Bell, modulo: 'novedades', descripcion: 'Ausencias y reemplazos' },
      { ruta: '/seguimiento', etiqueta: 'Seguimiento pedagógico', icono: UserRoundCheck, modulo: 'seguimiento', descripcion: 'Acompañamiento de aula' },
    ],
  },
  {
    grupo: 'Comunidad',
    items: [
      { ruta: '/calendario', etiqueta: 'Calendario', icono: CalendarDays, modulo: 'calendario', descripcion: 'Eventos y cronograma' },
      { ruta: '/comunicados', etiqueta: 'Comunicados', icono: Megaphone, modulo: 'comunicados', descripcion: 'Avisos institucionales' },
      { ruta: '/tareas', etiqueta: 'Tareas', icono: ListTodo, modulo: 'tareas', descripcion: 'Pendientes del equipo' },
    ],
  },
  {
    grupo: 'Gestión',
    items: [
      { ruta: '/reportes', etiqueta: 'Reportes', icono: FileBarChart2, modulo: 'reportes', descripcion: 'Indicadores y exportaciones' },
      { ruta: '/usuarios', etiqueta: 'Usuarios y roles', icono: Users, modulo: 'usuarios', descripcion: 'Acceso al sistema' },
      { ruta: '/sedes', etiqueta: 'Sedes', icono: Building2, modulo: 'sedes', descripcion: 'Infraestructura' },
      { ruta: '/actividad', etiqueta: 'Actividad', icono: History, modulo: 'actividad', descripcion: 'Registro de cambios' },
      { ruta: '/configuracion', etiqueta: 'Configuración', icono: Settings, modulo: 'configuracion', descripcion: 'Institución y respaldos' },
    ],
  },
];

export const TODOS_ITEMS = NAVEGACION.flatMap((g) => g.items);
