import {
  Bell,
  BookOpenCheck,
  Building2,
  CalendarDays,
  Clock3,
  FileBarChart2,
  History,
  Landmark,
  LayoutDashboard,
  ListTodo,
  Megaphone,
  Network,
  School,
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
  /** Nombre y descripción que ve un docente (su espacio personal). */
  docente?: { etiqueta: string; descripcion: string };
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
      { ruta: '/mi-grupo', etiqueta: 'Mi grupo', icono: School, modulo: 'migrupo', descripcion: 'El grupo que dirijo' },
      { ruta: '/grupos', etiqueta: 'Grados y grupos', icono: Network, modulo: 'grupos', descripcion: 'Estructura académica' },
      { ruta: '/asignacion', etiqueta: 'Asignación académica', icono: BookOpenCheck, modulo: 'asignacion', descripcion: 'Carga docente por grupo' },
      { ruta: '/horarios', etiqueta: 'Horarios', icono: Clock3, modulo: 'horarios', descripcion: 'Horario semanal', docente: { etiqueta: 'Mi horario', descripcion: 'Mis clases de la semana' } },
    ],
  },
  {
    grupo: 'Personal',
    items: [
      { ruta: '/novedades', etiqueta: 'Novedades y permisos', icono: Bell, modulo: 'novedades', descripcion: 'Ausencias y reemplazos', docente: { etiqueta: 'Mis permisos', descripcion: 'Solicitudes y su estado' } },
      { ruta: '/seguimiento', etiqueta: 'Seguimiento pedagógico', icono: UserRoundCheck, modulo: 'seguimiento', descripcion: 'Acompañamiento de aula', docente: { etiqueta: 'Mi seguimiento', descripcion: 'Observaciones de mis clases' } },
    ],
  },
  {
    grupo: 'Comunidad',
    items: [
      { ruta: '/calendario', etiqueta: 'Calendario', icono: CalendarDays, modulo: 'calendario', descripcion: 'Eventos y cronograma', docente: { etiqueta: 'Actividades', descripcion: 'Actividades académicas del mes' } },
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
  {
    grupo: 'Plataforma',
    items: [{ ruta: '/instituciones', etiqueta: 'Instituciones', icono: Landmark, modulo: 'instituciones', descripcion: 'Todas las instituciones de SIGEI' }],
  },
];

export const TODOS_ITEMS = NAVEGACION.flatMap((g) => g.items);

/** Nombre de un elemento del menú según el rol (los docentes ven su espacio personal). */
export function etiquetaDe(i: ItemNav, esDocente: boolean): string {
  return esDocente && i.docente ? i.docente.etiqueta : i.etiqueta;
}
export function descripcionDe(i: ItemNav, esDocente: boolean): string {
  return esDocente && i.docente ? i.docente.descripcion : i.descripcion;
}
