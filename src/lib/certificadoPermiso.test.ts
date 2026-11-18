import * as PDFLib from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import type { Novedad } from './types';
import { aWinAnsi, datosCertificado, fechasPermiso, generarCertificado, horarioPermiso, radicado, soportePosterior } from './certificadoPermiso';

const n: Novedad = {
  id: 'a1b2c3d4-e5f6-4711-8899-aabbccddh58h',
  created_at: '2026-11-17T15:00:00Z',
  docente_id: 'd1',
  tipo: 'calamidad',
  fecha_inicio: '2026-11-17',
  fecha_fin: '2026-11-17',
  horas: 0,
  motivo: 'Situación familiar',
  estado: 'aprobada',
  reemplazo_id: null,
  revisado_por: 'Madeleyne Ceballos',
  revisado_en: '2026-11-17T20:00:00Z',
  observacion_revision: '',
  creado_por: null,
  soportes: [],
};
const franjas = [
  { inicio: '08:00', fin: '09:00' },
  { inicio: '09:00', fin: '09:30', descanso: true },
  { inicio: '09:30', fin: '14:00' },
];

describe('certificado de permiso', () => {
  it('radicado estable con la fecha de la solicitud', () => {
    expect(radicado(n)).toBe('PERM-20261117-H58H');
  });

  it('textos de fechas, horario y soporte', () => {
    expect(fechasPermiso(n)).toBe('17 de noviembre de 2026');
    expect(fechasPermiso({ fecha_inicio: '2026-11-17', fecha_fin: '2026-11-19' })).toBe('Del 17 al 19 de noviembre de 2026 (3 días)');
    expect(fechasPermiso({ fecha_inicio: '2026-11-30', fecha_fin: '2026-12-02' })).toBe('Del 30 de noviembre al 2 de diciembre de 2026 (3 días)');
    expect(horarioPermiso(n, franjas)).toBe('Jornada completa (08:00 a 14:00)');
    expect(horarioPermiso({ horas: 2 }, franjas)).toBe('2 horas');
    expect(soportePosterior(n)).toMatch(/entregar el soporte/);
    expect(soportePosterior({ tipo: 'permiso_personal', soportes: [] })).toBe('No se exige soporte posterior.');
  });

  it('cambia caracteres que el PDF no puede escribir', () => {
    expect(aWinAnsi('Matemáticas ñ “ok” → 😀')).toBe('Matemáticas ñ “ok”  ');
  });

  it('genera un PDF válido de una página', async () => {
    const d = datosCertificado({
      n,
      docente: { nombres: 'Alba María', apellidos: 'Vargas Gaviria', documento: '1048015195', email: 'docente@colegio.edu.co' },
      sede: 'CER Pedro A. Uribe',
      institucion: { nombre: 'IER Santa María', municipio: 'Carmen de Viboral' },
      franjas,
      tipo: 'Calamidad doméstica',
      revisor: { nombre: 'Madeleyne Ceballos', rol: 'rector' },
    });
    expect(d.institucion.dependencia).toBe('Rectoría');
    expect(d.autorizadoPor.cargo).toBe('Rector(a)');
    const pdf = await generarCertificado(PDFLib, d);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-');
    const leido = await PDFLib.PDFDocument.load(pdf);
    expect(leido.getPageCount()).toBe(1);
    expect(leido.getTitle()).toBe('Certificado PERM-20261117-H58H');
  });
});

describe('fechas en hora de Colombia', () => {
  it('una solicitud de las 11 p. m. queda con la fecha de ese día', async () => {
    const { diaColombia } = await import('./certificadoPermiso');
    expect(diaColombia('2026-11-18T04:02:55Z')).toBe('2026-11-17');
    expect(radicado({ id: 'x-h58h', created_at: '2026-11-18T04:02:55Z', fecha_inicio: '2026-11-17' })).toBe('PERM-20261117-H58H');
  });
});

describe('plantilla personalizada', () => {
  it('llena los campos en minúscula, mayúscula y con mayúscula inicial', async () => {
    const { rellenar, partesNegrita } = await import('./certificadoPermiso');
    const v = { docente: 'Alba María', dependencia: 'rectoría' };
    expect(rellenar('{docente} · {DOCENTE} · {Dependencia} · {otro}', v)).toBe('Alba María · ALBA MARÍA · Rectoría · {otro}');
    expect(partesNegrita('La **rectoría** autoriza')).toEqual([
      ['La ', false],
      ['rectoría', true],
      [' autoriza', false],
    ]);
  });

  it('completa con los textos de SIGEI y respeta el orden de las filas', async () => {
    const { plantillaCompleta, PLANTILLA_DEFECTO } = await import('./certificadoPermiso');
    const p = plantillaCompleta({ titulo: '  ', filas: ['motivo', 'docente'], nota: 'Se expide en {municipio}.' });
    expect(p.titulo).toBe(PLANTILLA_DEFECTO.titulo);
    expect(p.filas).toEqual(['docente', 'motivo']);
    expect(p.nota).toBe('Se expide en {municipio}.');
  });

  it('el PDF usa los textos de la institución', async () => {
    const d = datosCertificado({
      n,
      docente: { nombres: 'Alba', apellidos: 'Vargas', documento: '1', email: '' },
      institucion: { nombre: 'IER Santa María', municipio: 'El Carmen' },
      franjas,
      tipo: 'Calamidad doméstica',
      revisor: { nombre: 'Madeleyne', rol: 'rector' },
      plantilla: { titulo: 'CONSTANCIA DE PERMISO', cargo_firma: 'Rectora', filas: ['docente', 'fechas'], nota: 'Se expide en {municipio} el {fecha_autorizacion}.' },
    });
    const pdf = await generarCertificado(PDFLib, d);
    expect((await PDFLib.PDFDocument.load(pdf)).getPageCount()).toBe(1);
  });
});
