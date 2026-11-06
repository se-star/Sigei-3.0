import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { backend, fijarUsuarioActual } from '@/lib/backend';
import type { Sesion } from '@/lib/data/provider';
import type { Perfil, Rol } from '@/lib/types';
import { puedeEditar, puedeVer, type Modulo } from '@/lib/permisos';

interface AuthCtx {
  perfil: Perfil | null;
  cargando: boolean;
  ingresar: (email: string, clave: string) => Promise<void>;
  ingresarDemo: (rol: Rol) => Promise<void>;
  salir: () => Promise<void>;
  ver: (m: Modulo) => boolean;
  editar: (m: Modulo) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const qc = useQueryClient();

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
  const valor: AuthCtx = {
    perfil,
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
    ver: (m) => puedeVer(perfil?.rol, m),
    editar: (m) => puedeEditar(perfil?.rol, m),
  };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fuera de AuthProvider');
  return c;
}
