import { useEffect, useSyncExternalStore } from 'react';

export type Tema = 'light' | 'dark' | 'system';
const CLAVE = 'sigei.theme';
const oyentes = new Set<() => void>();

function leer(): Tema {
  try {
    return (localStorage.getItem(CLAVE) as Tema) || 'system';
  } catch {
    return 'system';
  }
}

let actual: Tema = leer();

function aplicar(t: Tema) {
  const oscuro = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', oscuro);
}

function fijar(t: Tema) {
  actual = t;
  try {
    localStorage.setItem(CLAVE, t);
  } catch {
    /* almacenamiento no disponible */
  }
  aplicar(t);
  oyentes.forEach((f) => f());
}

/** Tema claro/oscuro/automático compartido por toda la app. */
export function useTema() {
  const tema = useSyncExternalStore(
    (cb) => {
      oyentes.add(cb);
      return () => oyentes.delete(cb);
    },
    () => actual,
  );
  useEffect(() => {
    if (tema !== 'system') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const fn = () => aplicar('system');
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [tema]);
  return { tema, setTema: fijar };
}
