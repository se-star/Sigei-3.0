/**
 * Normaliza la dirección del proyecto Supabase. Acepta lo que la gente suele
 * pegar por error: espacios, barra final, /rest/v1, solo el identificador del
 * proyecto o el enlace del panel de Supabase.
 */
export function normalizarUrlSupabase(entrada: string): string {
  let u = entrada.trim().replace(/^["']|["']$/g, '').trim();
  // Enlace del panel: https://supabase.com/dashboard/project/<ref>/...
  const panel = u.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (panel) return `https://${panel[1].toLowerCase()}.supabase.co`;
  // Solo el identificador del proyecto (20 letras y números).
  if (/^[a-z0-9]{15,30}$/i.test(u)) return `https://${u.toLowerCase()}.supabase.co`;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  u = u.replace(/\/(rest|auth|storage|realtime)\/v1.*$/i, '').replace(/\/+$/, '');
  return u;
}

/** Nombre del servidor para mostrarlo en mensajes ("xxxx.supabase.co"). */
export function hostDe(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** true si el error es de red (no se pudo llegar al servidor). */
export function esErrorDeRed(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
  return /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(msg);
}

export function mensajeSinConexion(host: string): string {
  return (
    `No se pudo conectar con el servidor de datos (${host}). ` +
    'Revise su conexión a internet, que el proyecto de Supabase esté activo y que la dirección guardada en ' +
    'VITE_SUPABASE_URL sea la Project URL (https://xxxx.supabase.co).'
  );
}
