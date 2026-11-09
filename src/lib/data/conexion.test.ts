import { describe, expect, it } from 'vitest';
import { esErrorDeRed, hostDe, normalizarUrlSupabase } from './conexion';

describe('dirección de Supabase', () => {
  it('acepta la Project URL correcta', () => {
    expect(normalizarUrlSupabase('https://abcdefghijklmnopqrst.supabase.co')).toBe('https://abcdefghijklmnopqrst.supabase.co');
  });
  it('corrige errores comunes al pegar', () => {
    expect(normalizarUrlSupabase('  https://abcdefghijklmnopqrst.supabase.co/  ')).toBe('https://abcdefghijklmnopqrst.supabase.co');
    expect(normalizarUrlSupabase('https://abcdefghijklmnopqrst.supabase.co/rest/v1/')).toBe('https://abcdefghijklmnopqrst.supabase.co');
    expect(normalizarUrlSupabase('abcdefghijklmnopqrst.supabase.co')).toBe('https://abcdefghijklmnopqrst.supabase.co');
    expect(normalizarUrlSupabase('abcdefghijklmnopqrst')).toBe('https://abcdefghijklmnopqrst.supabase.co');
    expect(normalizarUrlSupabase('"https://abcdefghijklmnopqrst.supabase.co"')).toBe('https://abcdefghijklmnopqrst.supabase.co');
    expect(normalizarUrlSupabase('https://supabase.com/dashboard/project/abcdefghijklmnopqrst/settings/api')).toBe(
      'https://abcdefghijklmnopqrst.supabase.co',
    );
  });
  it('extrae el servidor y reconoce errores de red', () => {
    expect(hostDe('https://abc.supabase.co')).toBe('abc.supabase.co');
    expect(esErrorDeRed(new TypeError('Failed to fetch'))).toBe(true);
    expect(esErrorDeRed({ message: 'Invalid login credentials' })).toBe(false);
  });
});
