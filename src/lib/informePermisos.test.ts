import { describe, expect, it } from 'vitest';
import type { BloqueHorario, Novedad } from './types';
import { armarInforme, clasesEntre, diasHabiles } from './informePermisos';

const nov = (p: Partial<Novedad>): Novedad => ({
  id: 'n' + Math.random(),
  docente_id: 'd1',
  tipo: 'permiso_personal',
  fecha_inicio: '2026-11-16',
  fecha_fin: '2026-11-16',
  horas: 0,
  motivo: '',
  estado: 'aprobada',
  reemplazo_id: null,
  revisado_por: null,
  revisado_en: null,
  observacion_revision: '',
  creado_por: null,
  soportes: [],
  ...p,
});
const bloque = (dia: number, docente_id = 'd1'): BloqueHorario =>
  ({ id: 'b' + dia + docente_id, grupo_id: 'g', asignatura_id: 'a', docente_id, dia, hora_inicio: '07:00', hora_fin: '08:00', aula: '' }) as BloqueHorario;

describe('informe de permisos', () => {
  it('cuenta días hábiles (lunes a viernes)', () => {
    expect(diasHabiles('2026-11-16', '2026-11-22')).toBe(5); // lun a dom
    expect(diasHabiles('2026-11-21', '2026-11-22')).toBe(0); // fin de semana
  });

  it('cuenta las clases del horario en el rango', () => {
    const h = [bloque(1), bloque(1), bloque(3), bloque(1, 'd2')];
    expect(clasesEntre('d1', '2026-11-16', '2026-11-18', h)).toBe(3); // lunes 2 + miércoles 1
  });

  it('recorta los permisos al rango y suma por docente y tipo', () => {
    const lista = [
      nov({ fecha_inicio: '2026-10-28', fecha_fin: '2026-11-03', tipo: 'incapacidad' }), // cruza el inicio del mes
      nov({ fecha_inicio: '2026-11-10', fecha_fin: '2026-11-10', horas: 3 }),
      nov({ docente_id: 'd2', fecha_inicio: '2026-11-20', fecha_fin: '2026-11-20', tipo: 'calamidad', reemplazo_id: 'd1' }),
      nov({ fecha_inicio: '2026-11-05', estado: 'rechazada' }),
      nov({ fecha_inicio: '2026-12-01', fecha_fin: '2026-12-01' }),
    ];
    const inf = armarInforme(lista, [bloque(1), bloque(2), bloque(5, 'd2')], '2026-11-01', '2026-11-30');
    expect(inf.total.permisos).toBe(3);
    const d1 = inf.docentes.find((x) => x.docente_id === 'd1')!;
    expect(d1.permisos).toBe(2);
    expect(d1.dias).toBe(2); // 2 y 3 de noviembre (lun y mar)
    expect(d1.horas).toBe(3);
    expect(d1.clases).toBe(2 + 1); // lun 2 y mar 3 de nov + mar 10 de nov (permiso por horas)
    expect(d1.porTipo).toEqual({ incapacidad: 1, permiso_personal: 1 });
    expect(inf.porTipo).toEqual({ incapacidad: 1, permiso_personal: 1, calamidad: 1 });
    expect(inf.total.soportePendiente).toBe(2); // incapacidad y calamidad sin soporte
    expect(inf.total.sinReemplazo).toBe(2); // los de d1 tienen clases y no tienen reemplazo
    expect(inf.detalle[0].desde).toBe('2026-11-01');
  });
});
