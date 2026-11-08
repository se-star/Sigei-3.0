import type { AuthProvider, DataProvider } from './data/provider';
import { LocalAuthProvider, LocalDataProvider } from './data/local';
import { SupabaseAuthProvider, SupabaseDataProvider, crearCliente } from './data/supabase';

/**
 * Elige el backend al arrancar: Supabase si hay credenciales en las variables de
 * entorno; de lo contrario, modo demo en el navegador.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

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
