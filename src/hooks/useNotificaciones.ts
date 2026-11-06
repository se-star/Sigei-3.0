import { useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { useTabla } from './useDatos';
import { puedeAprobar } from '@/lib/permisos';
import { diasParaCumple, hoyISO, nombreDocente, porId, sumarDias, fechaCorta } from '@/lib/utils';
import { etiqueta, TIPOS_NOVEDAD } from '@/lib/catalogos';

export interface Notificacion {
  id: string;
  titulo: string;
  detalle: string;
  ruta: string;
  tipo: 'novedad' | 'evento' | 'comunicado' | 'cumple' | 'tarea';
}

/**
 * Notificaciones calculadas a partir de los datos (no requieren tabla propia):
 * novedades por aprobar, eventos de hoy y mañana, comunicados recientes,
 * cumpleaños y tareas vencidas. Lo leído se recuerda en este navegador.
 */
export function useNotificaciones() {
  const { perfil } = useAuth();
  const { data: novedades = [] } = useTabla('novedades');
  const { data: eventos = [] } = useTabla('eventos');
  const { data: comunicados = [] } = useTabla('comunicados');
  const { data: docentes = [] } = useTabla('docentes');
  const { data: tareas = [] } = useTabla('tareas');
  const clave = `sigei.leidas.${perfil?.id ?? 'anon'}`;
  const [leidas, setLeidas] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(clave) || '[]');
    } catch {
      return [];
    }
  });

  const lista = useMemo<Notificacion[]>(() => {
    if (!perfil) return [];
    const hoy = hoyISO();
    const manana = sumarDias(hoy, 1);
    const docs = porId(docentes);
    const out: Notificacion[] = [];

    if (puedeAprobar(perfil.rol)) {
      for (const n of novedades.filter((x) => x.estado === 'pendiente')) {
        out.push({
          id: `nov-${n.id}`,
          tipo: 'novedad',
          titulo: `${etiqueta(TIPOS_NOVEDAD, n.tipo)} por revisar`,
          detalle: `${nombreDocente(docs.get(n.docente_id), true)} · desde ${fechaCorta(n.fecha_inicio)}`,
          ruta: '/novedades',
        });
      }
    } else if (perfil.docente_id) {
      for (const n of novedades.filter((x) => x.docente_id === perfil.docente_id && x.estado !== 'pendiente' && x.revisado_en)) {
        out.push({
          id: `nov-${n.id}-${n.estado}`,
          tipo: 'novedad',
          titulo: `Su solicitud fue ${n.estado}`,
          detalle: `${etiqueta(TIPOS_NOVEDAD, n.tipo)} · ${fechaCorta(n.fecha_inicio)}`,
          ruta: '/novedades',
        });
      }
    }
    for (const e of eventos.filter((x) => x.fecha_inicio === hoy || x.fecha_inicio === manana)) {
      out.push({
        id: `eve-${e.id}-${e.fecha_inicio}`,
        tipo: 'evento',
        titulo: e.titulo,
        detalle: e.fecha_inicio === hoy ? 'Hoy' : 'Mañana',
        ruta: '/calendario',
      });
    }
    const hace3 = Date.now() - 3 * 86400000;
    for (const c of comunicados.filter((x) => new Date(x.publicado_en).getTime() > hace3)) {
      out.push({ id: `com-${c.id}`, tipo: 'comunicado', titulo: c.titulo, detalle: `Comunicado · ${c.autor}`, ruta: '/comunicados' });
    }
    for (const d of docentes.filter((x) => x.estado === 'activo' && x.fecha_nacimiento && diasParaCumple(x.fecha_nacimiento) === 0)) {
      out.push({
        id: `cum-${d.id}-${hoy}`,
        tipo: 'cumple',
        titulo: `Hoy cumple años ${nombreDocente(d, true)}`,
        detalle: '¡Envíele un saludo!',
        ruta: `/docentes/${d.id}`,
      });
    }
    for (const t of tareas.filter(
      (x) => x.estado !== 'hecha' && x.fecha_limite && x.fecha_limite < hoy && (!x.responsable_id || x.responsable_id === perfil.id),
    )) {
      out.push({ id: `tar-${t.id}`, tipo: 'tarea', titulo: 'Tarea vencida', detalle: t.titulo, ruta: '/tareas' });
    }
    return out;
  }, [perfil, novedades, eventos, comunicados, docentes, tareas]);

  const guardar = (ids: string[]) => {
    setLeidas(ids);
    try {
      localStorage.setItem(clave, JSON.stringify(ids.slice(-300)));
    } catch {
      /* sin almacenamiento */
    }
  };

  const noLeidas = lista.filter((n) => !leidas.includes(n.id)).length;
  return {
    lista: lista.map((n) => ({ ...n, leida: leidas.includes(n.id) })),
    noLeidas,
    marcar: (id: string) => !leidas.includes(id) && guardar([...leidas, id]),
    marcarTodas: () => guardar([...new Set([...leidas, ...lista.map((n) => n.id)])]),
  };
}
