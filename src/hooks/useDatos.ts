import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { backend } from '@/lib/backend';
import type { ID, Institucion, Miembro, Nuevo, Rol, Tabla, Tablas } from '@/lib/types';
import { CRITERIOS_DEFECTO, FRANJAS_DEFECTO } from '@/lib/data/seed';
import { useAuth } from './useAuth';

/** Institución de trabajo actual ('' si no hay). Forma parte de cada clave de caché. */
function useInst(): ID {
  return useAuth().perfil?.institucion_id ?? '';
}

/** Lista completa de una tabla de la institución actual, con caché compartida entre pantallas. */
export function useTabla<T extends Tabla>(tabla: T) {
  const inst = useInst();
  return useQuery({
    queryKey: ['tabla', inst, tabla],
    queryFn: () => backend.datos.list(tabla),
    staleTime: 30_000,
    enabled: tabla === 'instituciones' || !!inst,
  });
}

/** Crear, editar y eliminar registros de una tabla; refresca la caché al terminar. */
export function useMutar<T extends Tabla>(tabla: T) {
  const qc = useQueryClient();
  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['tabla'], predicate: (q) => q.queryKey[2] === tabla });
    qc.invalidateQueries({ queryKey: ['actividad'] });
  };
  const crear = useMutation({
    mutationFn: (datos: Nuevo<Tablas[T]>) => backend.datos.create(tabla, datos),
    onSuccess: refrescar,
  });
  const editar = useMutation({
    mutationFn: ({ id, cambios }: { id: ID; cambios: Partial<Tablas[T]> }) => backend.datos.update(tabla, id, cambios),
    onSuccess: refrescar,
  });
  const eliminar = useMutation({
    mutationFn: (id: ID) => backend.datos.remove(tabla, id),
    onSuccess: refrescar,
  });
  return { crear, editar, eliminar };
}

/** Personas vinculadas a la institución actual. */
export function useMiembros() {
  const inst = useInst();
  return useQuery({
    queryKey: ['miembros', inst],
    queryFn: () => backend.datos.miembros(),
    staleTime: 30_000,
    enabled: !!inst,
  });
}

export function useMutarMiembros() {
  const qc = useQueryClient();
  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['miembros'] });
    qc.invalidateQueries({ queryKey: ['resumen-instituciones'] });
  };
  return {
    actualizar: useMutation({
      mutationFn: ({ id, cambios }: { id: ID; cambios: Partial<Pick<Miembro, 'rol' | 'docente_id' | 'activo'>> }) =>
        backend.datos.actualizarMiembro(id, cambios),
      onSuccess: refrescar,
    }),
    quitar: useMutation({ mutationFn: (id: ID) => backend.datos.quitarMiembro(id), onSuccess: refrescar }),
    agregar: useMutation({
      mutationFn: ({ correo, rol, institucionId }: { correo: string; rol: Rol; institucionId?: ID }) =>
        institucionId ? backend.datos.agregarMiembroEn(institucionId, correo, rol) : backend.datos.agregarMiembro(correo, rol),
      onSuccess: refrescar,
    }),
  };
}

export const AJUSTES_VACIOS: Institucion = {
  id: '',
  nombre: 'Mi institución educativa',
  activa: true,
  sigla: '',
  codigo_dane: '',
  nit: '',
  municipio: '',
  rector: '',
  anio_lectivo: new Date().getFullYear(),
  periodos: 3,
  logo_url: '',
  franjas: FRANJAS_DEFECTO,
  criterios_seguimiento: CRITERIOS_DEFECTO,
};

/** Configuración de la institución en la que se está trabajando. */
export function useAjustes(): Institucion {
  const inst = useInst();
  const { data } = useTabla('instituciones');
  const fila = data?.find((i) => i.id === inst);
  return fila
    ? { ...AJUSTES_VACIOS, ...fila, franjas: fila.franjas?.length ? fila.franjas : FRANJAS_DEFECTO, criterios_seguimiento: fila.criterios_seguimiento?.length ? fila.criterios_seguimiento : CRITERIOS_DEFECTO }
    : { ...AJUSTES_VACIOS, id: inst };
}
