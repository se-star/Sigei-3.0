import { describe, expect, it } from 'vitest';
import { nombreSeguro, normalizarDocumento, validarSoporte } from './provider';

describe('soportes de permisos', () => {
  it('acepta PDF e imágenes de hasta 5 MB', () => {
    expect(validarSoporte({ name: 'incapacidad.pdf', type: 'application/pdf', size: 200_000 })).toBeNull();
    expect(validarSoporte({ name: 'foto.jpg', type: 'image/jpeg', size: 4_000_000 })).toBeNull();
  });
  it('rechaza otros formatos, archivos grandes o vacíos', () => {
    expect(validarSoporte({ name: 'acta.docx', type: 'application/msword', size: 1000 })).toMatch(/no es PDF/);
    expect(validarSoporte({ name: 'video.png', type: 'image/png', size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
    expect(validarSoporte({ name: 'nada.pdf', type: 'application/pdf', size: 0 })).toMatch(/vacío/);
  });
  it('genera nombres seguros para guardar', () => {
    expect(nombreSeguro('Incapacidad médica (EPS) Nov.PDF')).toBe('Incapacidad-medica-EPS-Nov.pdf');
    expect(nombreSeguro('...')).toBe('soporte');
  });
});

describe('documento', () => {
  it('quita puntos, espacios y guiones', () => {
    expect(normalizarDocumento(' 43.000.000 ')).toBe('43000000');
    expect(normalizarDocumento('1 017-234')).toBe('1017234');
  });
});
