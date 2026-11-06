import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { backend } from '@/lib/backend';
import type { Ajustes, ID, Nuevo, Tabla, Tablas } from '@/lib/types';
import { CRITERIOS_DEFECTO, FRANJAS_DEFECTO } from '@/lib/data/seed';

/** Lista completa de una tabla, con caché compartida entre pantallas. */
export function useTabla<T extends Tabla>(tabla: T) {
  return useQuery({
    queryKey: ['tabla', tabla],
    queryFn: () => backend.datos.list(tabla),
    staleTime: 30_000,
  });
}

/** Crear, editar y eliminar registros de una tabla; refresca la caché al terminar. */
export function useMutar<T extends Tabla>(tabla: T) {
  const qc = useQueryClient();
  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['tabla', tabla] });
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

export const AJUSTES_VACIOS: Ajustes = {
  id: 'ajustes',
  institucion: 'Mi institución educativa',
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

/** Configuración institucional (fila única de la tabla ajustes). */
export function useAjustes(): Ajustes {
  const { data } = useTabla('ajustes');
  const fila = data?.[0];
  return fila ? { ...AJUSTES_VACIOS, ...fila } : AJUSTES_VACIOS;
}
