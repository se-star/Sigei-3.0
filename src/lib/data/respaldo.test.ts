import { describe, expect, it } from 'vitest';
import { copiarConIdsNuevos } from './respaldo';

describe('copiar respaldo con ids nuevos', () => {
  it('reescribe ids y relaciones, y quita datos de otra institución', () => {
    let n = 0;
    const r = copiarConIdsNuevos(
      {
        docentes: [{ id: 'd1', nombres: 'Ana', institucion_id: 'otra' }],
        grupos: [{ id: 'g1', director_id: 'd1', grado_id: 'gr-x' }],
        tareas: [{ id: 't1', responsable_id: 'u1', creado_por: 'u1' }],
      },
      () => `n${++n}`,
    );
    expect(r.docentes[0]).toEqual({ id: 'n1', nombres: 'Ana' });
    expect(r.grupos[0].director_id).toBe('n1');
    expect(r.grupos[0].grado_id).toBeNull(); // apuntaba a algo que no venía en el respaldo
    expect(r.tareas[0]).toMatchObject({ responsable_id: null, creado_por: null });
  });
});
