import { CAMPOS_RELACION, TABLAS_RESPALDO } from './provider';

type Fila = Record<string, unknown> & { id: string };

/**
 * Prepara un respaldo para cargarlo en la institución actual: cada registro
 * recibe un identificador nuevo y las relaciones se reescriben con esos ids.
 * Así el mismo respaldo puede copiarse en varias instituciones sin mezclar datos.
 */
export function copiarConIdsNuevos(datos: Record<string, unknown>, nuevoId: () => string): Record<string, Fila[]> {
  const mapa = new Map<string, string>();
  for (const t of TABLAS_RESPALDO) for (const f of (datos[t] as Fila[] | undefined) ?? []) mapa.set(f.id, nuevoId());

  const salida: Record<string, Fila[]> = {};
  for (const t of TABLAS_RESPALDO) {
    const filas = datos[t] as Fila[] | undefined;
    if (!Array.isArray(filas)) continue;
    salida[t] = filas.map((original) => {
      const { institucion_id: _i, created_at: _c, updated_at: _u, ...resto } = original;
      void _i;
      void _c;
      void _u;
      const f: Fila = { ...resto, id: mapa.get(original.id)! };
      for (const campo of CAMPOS_RELACION) {
        const v = f[campo];
        if (typeof v === 'string' && v) f[campo] = mapa.get(v) ?? null;
      }
      // Las personas (usuarios) no viajan en el respaldo.
      if ('responsable_id' in f) f.responsable_id = null;
      if ('creado_por' in f) f.creado_por = null;
      return f;
    });
  }
  return salida;
}
