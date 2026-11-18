import { describe, expect, it } from 'vitest';
import { analizarFilas, cambiosDe, fechaDeCelda, leerCSV } from './docentesExcel';
import type { Area, Docente, Sede } from './types';

const areas = [{ id: 'a1', nombre: 'Matemáticas', color: '#000' }] as Area[];
const sedes = [{ id: 's1', nombre: 'Sede Principal' }] as Sede[];
const existente = { id: 'd1', documento: '43000000', nombres: 'Laura', apellidos: 'Restrepo' } as Docente;
const ctx = { areas, sedes, existentes: [existente] };
const enc = ['Documento *', 'Nombres *', 'Apellidos *', 'Correo', 'Área', 'Vinculación', 'Fecha de nacimiento', 'Género', 'Carga máxima'];

describe('importar docentes desde Excel', () => {
  it('lee fechas en varios formatos', () => {
    expect(fechaDeCelda('1985-03-18')).toBe('1985-03-18');
    expect(fechaDeCelda('18/03/1985')).toBe('1985-03-18');
    expect(fechaDeCelda(new Date(Date.UTC(1990, 0, 5)))).toBe('1990-01-05');
    expect(fechaDeCelda(31124)).toBe('1985-03-18'); // número de serie de Excel
    expect(fechaDeCelda('31/02/1990')).toBe('invalida');
    expect(fechaDeCelda('')).toBeNull();
  });

  it('prepara docentes nuevos y reconoce los existentes', () => {
    const { filas, error } = analizarFilas(
      [
        enc,
        ['1.032.456.789', 'Ana María', 'Gómez', 'ANA@colegio.edu.co', 'matematicas', 'Hora cátedra', '18/03/1985', 'femenino', 20],
        [43000000, 'Laura', 'Restrepo', '', '', '', '', '', ''],
        [],
      ],
      ctx,
    );
    expect(error).toBeUndefined();
    expect(filas).toHaveLength(2);
    const [ana, laura] = filas;
    expect(ana.errores).toEqual([]);
    expect(ana.datos).toMatchObject({
      documento: '1032456789',
      email: 'ana@colegio.edu.co',
      area_id: 'a1',
      vinculacion: 'catedra',
      fecha_nacimiento: '1985-03-18',
      genero: 'F',
      carga_maxima: 20,
      estado: 'activo',
      cargo: 'Docente de aula',
    });
    expect(ana.fila).toBe(2);
    expect(laura.existente?.id).toBe('d1');
    // Al actualizar solo se cambian los campos que traía el archivo.
    expect(Object.keys(cambiosDe(laura)).sort()).toEqual(['apellidos', 'nombres']);
  });

  it('marca errores y avisos por fila', () => {
    const { filas } = analizarFilas(
      [
        enc,
        ['', 'Sin', 'Documento'],
        ['555', 'Pedro', '', 'correo-malo', 'Artes', 'Indefinida', 'ayer', 'x', 99],
        ['777', 'Uno', 'Dos'],
        ['777', 'Tres', 'Cuatro'],
      ],
      ctx,
    );
    expect(filas[0].errores).toContain('Falta el documento.');
    expect(filas[1].errores).toEqual(expect.arrayContaining(['Faltan los apellidos.', 'Correo no válido: «correo-malo».', 'Carga máxima no válida: «99» (de 0 a 60).']));
    expect(filas[1].avisos.length).toBe(4); // área, vinculación, fecha, género
    expect(filas[3].errores).toContain('El documento se repite en la fila 4.');
  });

  it('avisa si el archivo no tiene encabezados', () => {
    expect(analizarFilas([['a', 'b']], ctx).error).toMatch(/Documento/);
    expect(analizarFilas([['Documento', 'Correo']], ctx).error).toBe('Faltan las columnas: Nombres, Apellidos.');
  });

  it('lee CSV con punto y coma y comillas', () => {
    expect(leerCSV('Documento;Nombres\r\n"123";"Ana; María"\n')).toEqual([
      ['Documento', 'Nombres'],
      ['123', 'Ana; María'],
    ]);
  });
});
