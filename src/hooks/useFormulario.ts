import { useState } from 'react';

/** Estado simple de formulario con errores por campo. */
export function useFormulario<T extends object>(inicial: T) {
  const [valores, setValores] = useState<T>(inicial);
  const [errores, setErrores] = useState<Partial<Record<keyof T, string>>>({});

  const set = <K extends keyof T>(campo: K, valor: T[K]) => {
    setValores((v) => ({ ...v, [campo]: valor }));
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  /** Atajo para inputs de texto: {...campo('nombre')} */
  const campo = <K extends keyof T>(nombre: K) => ({
    value: (valores[nombre] ?? '') as string | number,
    onChange: (e: { target: { value: string } }) => set(nombre, e.target.value as T[K]),
  });

  const validar = (reglas: Partial<Record<keyof T, (v: T) => string | false | undefined>>) => {
    const nuevos: Partial<Record<keyof T, string>> = {};
    for (const k in reglas) {
      const msg = reglas[k]?.(valores);
      if (msg) nuevos[k] = msg;
    }
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  return { valores, setValores, set, campo, errores, validar, reiniciar: (v: T) => (setValores(v), setErrores({})) };
}
