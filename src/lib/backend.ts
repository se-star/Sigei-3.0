import type { AuthProvider, DataProvider } from './data/provider';
import { LocalAuthProvider, LocalDataProvider } from './data/local';
import { SupabaseAuthProvider, SupabaseDataProvider, crearCliente } from './data/supabase';
import { hostDe, normalizarUrlSupabase } from './data/conexion';

/**
 * Elige el backend al arrancar: Supabase si hay credenciales en las variables de
 * entorno; de lo contrario, modo demo en el navegador.
 */
const urlCruda = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim().replace(/^["']|["']$/g, '');
const url = urlCruda ? normalizarUrlSupabase(urlCruda) : undefined;

/** Servidor de datos en uso (vacío en modo demo). La dirección de Supabase es pública. */
export const servidorDatos = url ? hostDe(url) : '';

let nombreUsuario = 'Sistema';
export function fijarUsuarioActual(nombre: string) {
  nombreUsuario = nombre;
}

function crear(): { datos: DataProvider; auth: AuthProvider } {
  if (url && key) {
    const sb = crearCliente(url, key);
    return { datos: new SupabaseDataProvider(sb), auth: new SupabaseAuthProvider(sb) };
  }
  return { datos: new LocalDataProvider(() => nombreUsuario), auth: new LocalAuthProvider() };
}

export const backend = crear();
export const modoDemo = backend.datos.modo === 'demo';

/**
 * Ingreso de docentes con documento y código por correo. En la nube se activa con
 * VITE_ACCESO_DOCENTE=1 cuando la función acceso-docente y el correo propio están listos.
 */
export const accesoDocenteActivo = modoDemo || import.meta.env.VITE_ACCESO_DOCENTE === '1';
