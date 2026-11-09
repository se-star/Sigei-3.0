import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { backend, fijarUsuarioActual } from '@/lib/backend';
import type { Sesion } from '@/lib/data/provider';
import type { ID, MiInstitucion, Perfil, Rol } from '@/lib/types';
import { puedeEditar, puedeVer, type Modulo } from '@/lib/permisos';

interface AuthCtx {
  perfil: Perfil | null;
  /** Instituciones del usuario (activas y solicitudes pendientes). */
  instituciones: MiInstitucion[];
  cargando: boolean;
  ingresar: (email: string, clave: string) => Promise<void>;
  ingresarDemo: (rol: Rol | 'superadmin') => Promise<void>;
  salir: () => Promise<void>;
  cambiarInstitucion: (id: ID) => Promise<void>;
  /** Vuelve a leer instituciones y roles (tras solicitar acceso o crear una institución). */
  refrescar: () => Promise<void>;
  solicitarAcceso: (institucionId: ID) => Promise<void>;
  /** true si la persona llegó desde el enlace de recuperar contraseña. */
  recuperando: boolean;
  cambiarClave: (nueva: string) => Promise<void>;
  ver: (m: Modulo) => boolean;
  editar: (m: Modulo) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesionEstado] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [recuperando, setRecuperando] = useState(false);
  const qc = useQueryClient();

  /** Fija la institución en la capa de datos antes de que se pinte nada con ella. */
  const setSesion = (s: Sesion | null) => {
    backend.datos.fijarInstitucion(s?.perfil.institucion_id || null);
    setSesionEstado(s);
  };

  useEffect(() => backend.auth.onRecuperacion?.(() => setRecuperando(true)), []);

  useEffect(() => {
    let vivo = true;
    backend.auth
      .sesionActual()
      .then((s) => vivo && setSesion(s))
      .catch(() => vivo && setSesion(null))
      .finally(() => vivo && setCargando(false));
    const off = backend.auth.onCambio((s) => {
      setSesion(s);
      if (!s) qc.clear();
    });
    return () => {
      vivo = false;
      off();
    };
  }, [qc]);

  useEffect(() => {
    fijarUsuarioActual(sesion?.perfil.nombre ?? 'Sistema');
  }, [sesion]);

  const perfil = sesion?.perfil ?? null;
  const conInstitucion = !!perfil?.activo;
  const valor: AuthCtx = {
    perfil,
    instituciones: sesion?.instituciones ?? [],
    cargando,
    ingresar: async (email, clave) => setSesion(await backend.auth.ingresar(email, clave)),
    ingresarDemo: async (rol) => {
      if (!backend.auth.ingresarDemo) throw new Error('El modo demo no está disponible.');
      qc.clear();
      setSesion(await backend.auth.ingresarDemo(rol));
    },
    salir: async () => {
      await backend.auth.salir();
      setSesion(null);
      qc.clear();
    },
    cambiarInstitucion: async (id) => {
      setSesion(await backend.auth.cambiarInstitucion(id));
    },
    refrescar: async () => {
      setSesion(await backend.auth.refrescar());
      qc.invalidateQueries({ queryKey: ['tabla'], predicate: (q) => q.queryKey[2] === 'instituciones' });
    },
    solicitarAcceso: async (id) => {
      await backend.auth.solicitarAcceso(id);
      setSesion(await backend.auth.refrescar());
    },
    recuperando,
    cambiarClave: async (nueva) => {
      if (!backend.auth.cambiarClave) throw new Error('En modo demo no hay contraseñas.');
      await backend.auth.cambiarClave(nueva);
      setRecuperando(false);
    },
    // El panel de instituciones es solo del superadministrador; lo demás depende del rol en la institución actual.
    ver: (m) => (m === 'instituciones' ? !!perfil?.es_superadmin : conInstitucion && puedeVer(perfil?.rol, m)),
    editar: (m) => (m === 'instituciones' ? !!perfil?.es_superadmin : conInstitucion && puedeEditar(perfil?.rol, m)),
  };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fuera de AuthProvider');
  return c;
}
