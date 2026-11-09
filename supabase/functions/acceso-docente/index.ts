// SIGEI 3.0 · Función del servidor "acceso-docente"
//
// Permite que un docente ingrese con su número de documento:
//   1. { accion: 'enviar', documento }            → envía un código al correo que la
//      institución registró para ese docente. Responde el correo enmascarado.
//   2. { accion: 'verificar', documento, codigo } → si el código es correcto,
//      devuelve la sesión (access_token y refresh_token).
//
// El correo completo nunca sale del servidor, así nadie puede averiguar el correo
// de un docente a partir de su documento. Supabase pone automáticamente a
// disposición SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY.
//
// Despliegue: Supabase → Edge Functions → Deploy a new function → Via editor,
// nombre "acceso-docente", pegar este archivo y desactivar "Verify JWT".

import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function responder(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...cors, 'Content-Type': 'application/json' } });
}

/** "laura.restrepo@colegio.edu.co" → "l•••o@colegio.edu.co" */
function enmascarar(correo: string) {
  const [usuario, dominio] = correo.split('@');
  if (!dominio) return '•••';
  const visible = usuario.length <= 2 ? usuario[0] : `${usuario[0]}•••${usuario[usuario.length - 1]}`;
  return `${visible}@${dominio}`;
}

function traducir(mensaje: string) {
  const m = mensaje.toLowerCase();
  if (m.includes('rate limit') || m.includes('seconds') || m.includes('security purposes'))
    return 'Ya enviamos un código hace poco. Espere un minuto antes de pedir otro.';
  if (m.includes('expired') || m.includes('invalid')) return 'El código no es válido o ya venció. Pida uno nuevo.';
  if (m.includes('smtp') || m.includes('sending')) return 'No fue posible enviar el correo. Avise a la administración de SIGEI.';
  return mensaje;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return responder({ error: 'Método no permitido.' }, 405);

  let entrada: { accion?: string; documento?: string; codigo?: string };
  try {
    entrada = await req.json();
  } catch {
    return responder({ error: 'Solicitud no válida.' }, 400);
  }

  const crudo = String(entrada.documento ?? '').trim();
  const documento = crudo.replace(/[.\s-]/g, '');
  if (!/^[0-9A-Za-z]{4,20}$/.test(documento)) return responder({ error: 'Escriba su número de documento sin puntos ni espacios.' }, 400);

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const publico = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });

  // Docentes activos con ese documento en instituciones activas (puede estar en varias).
  const { data: docentes, error } = await admin
    .from('docentes')
    .select('email, estado, instituciones!inner(activa)')
    .in('documento', [...new Set([crudo, documento])])
    .neq('estado', 'retirado')
    .eq('instituciones.activa', true);
  if (error) return responder({ error: 'No fue posible consultar el directorio. Intente de nuevo.' }, 500);

  const correos = [...new Set((docentes ?? []).map((d) => String(d.email ?? '').trim().toLowerCase()).filter((c) => c.includes('@')))];
  if (!correos.length) {
    return responder(
      { error: 'No encontramos un docente activo con ese documento y un correo registrado. Pida a la coordinación de su institución que revise sus datos.' },
      404,
    );
  }

  if (entrada.accion === 'enviar') {
    for (const correo of correos) {
      const { error: e } = await publico.auth.signInWithOtp({ email: correo, options: { shouldCreateUser: true } });
      if (e) return responder({ error: traducir(e.message) }, e.status === 429 ? 429 : 400);
    }
    return responder({ destinos: correos.map(enmascarar) });
  }

  if (entrada.accion === 'verificar') {
    const codigo = String(entrada.codigo ?? '').replace(/\D/g, '');
    if (codigo.length < 6) return responder({ error: 'Escriba el código de 6 dígitos que llegó a su correo.' }, 400);
    let ultimo = '';
    for (const correo of correos) {
      const { data, error: e } = await publico.auth.verifyOtp({ email: correo, token: codigo, type: 'email' });
      if (data?.session) return responder({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
      if (e) ultimo = e.message;
    }
    return responder({ error: traducir(ultimo || 'invalid') }, 400);
  }

  return responder({ error: 'Acción no reconocida.' }, 400);
});
