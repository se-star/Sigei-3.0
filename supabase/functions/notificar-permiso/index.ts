// SIGEI 3.0 · Función del servidor "notificar-permiso"
//
// Envía por correo los avisos del módulo de permisos:
//   • { evento: 'solicitud', novedad_id }  → cuando un docente radica una solicitud,
//     avisa a rectoría y coordinación de su institución.
//   • { evento: 'decision', novedad_id, certificado? } → cuando un directivo aprueba,
//     avisa al docente y a los demás directivos quién otorgó el permiso, con el
//     certificado de autorización en PDF adjunto. Si se rechaza, avisa al docente.
//
// La función comprueba quién la llama (debe tener sesión en SIGEI) y que tenga
// permiso sobre esa solicitud; los correos de los destinatarios nunca salen del
// servidor.
//
// Correo de salida (Edge Functions → Secrets). Use una de estas dos opciones:
//   • SMTP, por ejemplo Gmail con contraseña de aplicación:
//       SMTP_HOST=smtp.gmail.com  SMTP_PORT=465  SMTP_USER=cuenta@gmail.com  SMTP_PASS=(contraseña de aplicación)
//     Supabase no permite los puertos 25 y 587 desde las funciones: use 465.
//   • Resend: RESEND_API_KEY=(clave) y CORREO_REMITENTE con un dominio verificado.
// Opcionales: CORREO_REMITENTE (por defecto SMTP_USER), NOMBRE_REMITENTE (por
// defecto «SIGEI TIC») y SITIO_URL (dirección publicada de SIGEI).
//
// Despliegue: Supabase → Edge Functions → Deploy a new function → Via editor,
// nombre "notificar-permiso", pegar este archivo. Deje "Verify JWT" activado.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.16';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function responder(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...cors, 'Content-Type': 'application/json' } });
}

/* ───────── Textos ───────── */

export const TIPOS: Record<string, string> = {
  permiso_personal: 'Permiso personal',
  incapacidad: 'Incapacidad médica',
  calamidad: 'Calamidad doméstica',
  licencia: 'Licencia',
  comision: 'Comisión de servicio',
  capacitacion: 'Capacitación',
  otro: 'Otro',
};
export const CARGOS: Record<string, string> = { rector: 'Rector(a)', coordinador: 'Coordinador(a)', admin: 'Directivo(a)' };
/** Fecha (AAAA-MM-DD) en Colombia de una fecha u hora guardada en UTC. */
export function diaColombia(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function fechaLarga(iso: string): string {
  const [a, m, d] = diaColombia(iso).split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

export function fechas(n: { fecha_inicio: string; fecha_fin: string; horas: number }): string {
  const base = n.fecha_fin && n.fecha_fin !== n.fecha_inicio ? `Del ${fechaLarga(n.fecha_inicio)} al ${fechaLarga(n.fecha_fin)}` : fechaLarga(n.fecha_inicio);
  return n.horas > 0 ? `${base} · ${n.horas} ${n.horas === 1 ? 'hora' : 'horas'}` : `${base} · jornada completa`;
}

/** Mismo radicado que muestra SIGEI: PERM-AAAAMMDD-XXXX. */
export function radicado(n: { id: string; created_at?: string; fecha_inicio: string }): string {
  const fecha = diaColombia(n.created_at ?? n.fecha_inicio).replace(/-/g, '');
  return `PERM-${fecha}-${n.id.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(-4).padStart(4, '0')}`;
}

export function escapar(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function enmascarar(correo: string) {
  const [usuario, dominio] = correo.split('@');
  if (!dominio) return '•••';
  return `${usuario.length <= 2 ? usuario[0] : `${usuario[0]}•••${usuario[usuario.length - 1]}`}@${dominio}`;
}

/** Correo con la marca de SIGEI TIC (mismo estilo de las plantillas de ingreso). */
export function plantilla(o: {
  titulo: string;
  intro: string;
  filas: [string, string][];
  boton?: { texto: string; url: string };
  nota?: string;
  institucion: string;
  aviso?: { texto: string; tono: 'ok' | 'peligro' | 'info' };
}): string {
  const tonos = { ok: ['#E8F1EC', '#2F6B4A'], peligro: ['#F8E9E6', '#B0402D'], info: ['#E9EDF6', '#3B5591'] };
  const aviso = o.aviso
    ? `<p style="margin:0 0 16px;padding:10px 14px;border-radius:10px;background:${tonos[o.aviso.tono][0]};color:${tonos[o.aviso.tono][1]};font-size:14px;font-weight:bold">${escapar(o.aviso.texto)}</p>`
    : '';
  const filas = o.filas
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #E3E8F0;font-size:13px;color:#5A6272;width:38%;vertical-align:top">${escapar(k)}</td><td style="padding:8px 12px;border-bottom:1px solid #E3E8F0;font-size:14px;color:#252A34;vertical-align:top">${escapar(v)}</td></tr>`,
    )
    .join('');
  const boton = o.boton
    ? `<p style="margin:22px 0 4px"><a href="${escapar(o.boton.url)}" style="display:inline-block;background:#0050D0;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px;border-radius:999px">${escapar(o.boton.texto)}</a></p>`
    : '';
  return `<!doctype html><html lang="es"><body style="margin:0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5FA;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#252A34">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden">
      <tr><td style="background:#0A1F44;padding:22px 28px">
        <img src="https://se-star.github.io/Sigei-3.0/marca/png/logo-horizontal-oscuro-480.png" width="180" alt="SIGEI TIC" style="display:block;border:0;height:auto">
      </td></tr>
      <tr><td style="padding:28px">
        <p style="margin:0 0 6px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#5A6272">${escapar(o.institucion)}</p>
        <h1 style="margin:0 0 14px;font-size:21px;line-height:1.3;color:#0A1F44">${escapar(o.titulo)}</h1>
        ${aviso}
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6">${o.intro}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E3E8F0;border-radius:12px;border-collapse:separate;overflow:hidden">${filas}</table>
        ${boton}
        ${o.nota ? `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#5A6272">${o.nota}</p>` : ''}
      </td></tr>
      <tr><td style="padding:18px 28px;background:#F1F5FA;font-size:12px;line-height:1.5;color:#5A6272">
        SIGEI TIC · Gestión educativa institucional<br>Este es un aviso automático; no responda a este correo.
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

/* ───────── Envío ───────── */

export interface Correo {
  para: string;
  asunto: string;
  html: string;
  adjunto?: { nombre: string; base64: string };
}

type Enviar = (c: Correo) => Promise<void>;

/** Arma la función de envío según los secretos configurados (Resend o SMTP). */
export function crearEnvio(env: (k: string) => string | undefined): Enviar | null {
  const nombre = env('NOMBRE_REMITENTE') || 'SIGEI TIC';
  const resend = env('RESEND_API_KEY');
  if (resend) {
    const desde = env('CORREO_REMITENTE');
    if (!desde) return null;
    return async (c) => {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${nombre} <${desde}>`,
          to: [c.para],
          subject: c.asunto,
          html: c.html,
          attachments: c.adjunto ? [{ filename: c.adjunto.nombre, content: c.adjunto.base64 }] : undefined,
        }),
      });
      if (!r.ok) throw new Error(`Resend respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
    };
  }
  const host = env('SMTP_HOST');
  const usuario = env('SMTP_USER');
  const clave = env('SMTP_PASS');
  if (!host || !usuario || !clave) return null;
  const puerto = Number(env('SMTP_PORT') || 465);
  const transporte = nodemailer.createTransport({ host, port: puerto, secure: puerto === 465, auth: { user: usuario, pass: clave } });
  const desde = env('CORREO_REMITENTE') || usuario;
  return async (c) => {
    await transporte.sendMail({
      from: { name: nombre, address: desde },
      to: c.para,
      subject: c.asunto,
      html: c.html,
      attachments: c.adjunto ? [{ filename: c.adjunto.nombre, content: c.adjunto.base64, encoding: 'base64', contentType: 'application/pdf' }] : undefined,
    });
  };
}

/* ───────── Destinatarios ───────── */

export interface Directivo {
  usuario_id: string;
  nombre: string;
  email: string;
  rol: string;
}

/** Rectoría y coordinación activas (si no hay, los administradores), sin repetir correos ni incluir a quien llama. */
export function directivosAvisar(todos: Directivo[], excluir?: { usuario?: string; correo?: string }): Directivo[] {
  const fuera = excluir?.correo?.trim().toLowerCase();
  const conCorreo = todos.filter((d) => d.email.includes('@') && d.usuario_id !== excluir?.usuario && d.email.trim().toLowerCase() !== fuera);
  const principales = conCorreo.filter((d) => d.rol === 'rector' || d.rol === 'coordinador');
  const lista = principales.length ? principales : conCorreo.filter((d) => d.rol === 'admin');
  const vistos = new Set<string>();
  return lista.filter((d) => {
    const k = d.email.trim().toLowerCase();
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

/** El PDF que llega del navegador: base64 válido, que empiece por %PDF y de menos de 3 MB. */
export function certificadoValido(b64: unknown): string | null {
  if (typeof b64 !== 'string' || b64.length > 4_000_000 || !/^[A-Za-z0-9+/=]+$/.test(b64)) return null;
  try {
    return atob(b64.slice(0, 8)).startsWith('%PDF') ? b64 : null;
  } catch {
    return null;
  }
}

/* ───────── Proceso ───────── */

interface Novedad {
  id: string;
  institucion_id: string;
  docente_id: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  horas: number;
  motivo: string;
  estado: string;
  reemplazo_id: string | null;
  revisado_por: string | null;
  revisado_en: string | null;
  observacion_revision: string;
  created_at: string;
}

export async function procesar(admin: SupabaseClient, usuarioId: string, entrada: Record<string, unknown>, enviar: Enviar, sitio: string) {
  const evento = entrada.evento;
  if (evento !== 'solicitud' && evento !== 'decision') return { estado: 400, cuerpo: { error: 'Evento no válido.' } };
  const { data: n } = await admin.from('novedades').select('*').eq('id', String(entrada.novedad_id ?? '')).maybeSingle<Novedad>();
  if (!n) return { estado: 404, cuerpo: { error: 'No encontramos la solicitud.' } };

  const [{ data: perfil }, { data: membresia }, { data: inst }, { data: docente }] = await Promise.all([
    admin.from('perfiles').select('nombre, email, es_superadmin').eq('id', usuarioId).maybeSingle(),
    admin.from('membresias').select('rol, docente_id, activo').eq('usuario_id', usuarioId).eq('institucion_id', n.institucion_id).eq('activo', true).maybeSingle(),
    admin.from('instituciones').select('nombre, municipio').eq('id', n.institucion_id).maybeSingle(),
    admin.from('docentes').select('id, nombres, apellidos, documento, email, sede_id').eq('id', n.docente_id).maybeSingle(),
  ]);
  const rol = membresia?.rol as string | undefined;
  const esDirectivo = !!perfil?.es_superadmin || rol === 'rector' || rol === 'coordinador' || rol === 'admin';
  const esElDocente = !!membresia && membresia.docente_id === n.docente_id;
  const nombreInst = inst?.nombre ?? 'SIGEI TIC';
  const nombreDoc = docente ? `${docente.nombres} ${docente.apellidos}`.trim() : 'Docente';
  const tipo = TIPOS[n.tipo] ?? n.tipo;
  const rad = radicado(n);

  // Directivos de la institución con su correo.
  const { data: miembros } = await admin
    .from('membresias')
    .select('usuario_id, rol, perfiles!inner(nombre, email)')
    .eq('institucion_id', n.institucion_id)
    .eq('activo', true)
    .in('rol', ['rector', 'coordinador', 'admin']);
  const directivos: Directivo[] = (miembros ?? []).map((m: Record<string, unknown>) => {
    const p = (Array.isArray(m.perfiles) ? m.perfiles[0] : m.perfiles) as { nombre?: string; email?: string } | null;
    return { usuario_id: String(m.usuario_id), rol: String(m.rol), nombre: p?.nombre ?? '', email: String(p?.email ?? '').trim() };
  });

  const enviados: string[] = [];
  const fallidos: string[] = [];
  const mandar = async (c: Correo) => {
    try {
      await enviar(c);
      enviados.push(enmascarar(c.para));
    } catch (e) {
      console.error('No se pudo enviar a', enmascarar(c.para), e);
      fallidos.push(enmascarar(c.para));
    }
  };
  const filasBase: [string, string][] = [
    ['Radicado', rad],
    ['Docente', nombreDoc],
    ['Documento', docente?.documento ?? '—'],
    ['Tipo de permiso', tipo],
    ['Fecha(s)', fechas(n)],
    ['Motivo', n.motivo || '—'],
  ];
  const enlace = `${sitio.replace(/\/?(#.*)?$/, '/')}#/novedades`;

  if (evento === 'solicitud') {
    if (!esElDocente && !esDirectivo) return { estado: 403, cuerpo: { error: 'No tiene permiso sobre esta solicitud.' } };
    if (n.estado !== 'pendiente') return { estado: 409, cuerpo: { error: 'La solicitud ya fue revisada.' } };
    // Evita reenvíos repetidos: el aviso de una solicitud se manda al radicarla.
    if (!esDirectivo && Date.now() - new Date(n.created_at).getTime() > 30 * 60 * 1000)
      return { estado: 409, cuerpo: { error: 'El aviso de esta solicitud ya se envió.' } };
    const para = directivosAvisar(directivos, { usuario: usuarioId, correo: perfil?.email });
    for (const d of para)
      await mandar({
        para: d.email,
        asunto: `Nueva solicitud de permiso: ${nombreDoc} · ${tipo}`,
        html: plantilla({
          institucion: nombreInst,
          titulo: 'Nueva solicitud de permiso',
          aviso: { texto: 'Pendiente de revisión', tono: 'info' },
          intro: `Hola${d.nombre ? ` ${escapar(d.nombre.split(' ')[0])}` : ''}, <strong>${escapar(nombreDoc)}</strong> radicó una solicitud de permiso en SIGEI TIC y está esperando su revisión.`,
          filas: filasBase,
          boton: { texto: 'Revisar la solicitud', url: enlace },
          nota: 'Puede aprobarla o rechazarla desde Novedades y permisos. Al aprobarla, el docente recibirá el certificado de autorización.',
        }),
      });
    return { estado: 200, cuerpo: { enviados, fallidos, sinDestinatarios: para.length === 0 } };
  }

  // Decisión
  if (!esDirectivo) return { estado: 403, cuerpo: { error: 'Solo rectoría o coordinación pueden notificar una decisión.' } };
  if (n.estado !== 'aprobada' && n.estado !== 'rechazada') return { estado: 409, cuerpo: { error: 'La solicitud aún no tiene una decisión.' } };
  const aprobada = n.estado === 'aprobada';
  const quien = perfil?.nombre || n.revisado_por || 'Directivo';
  const cargo = CARGOS[rol ?? ''] ?? 'Directivo(a)';
  const pdf = aprobada ? certificadoValido(entrada.certificado) : null;
  const adjunto = pdf ? { nombre: `Certificado_${rad}.pdf`, base64: pdf } : undefined;
  let reemplazo = '';
  if (n.reemplazo_id) {
    const { data: r } = await admin.from('docentes').select('nombres, apellidos').eq('id', n.reemplazo_id).maybeSingle();
    if (r) reemplazo = `${r.nombres} ${r.apellidos}`.trim();
  }
  const filas: [string, string][] = [
    ...filasBase,
    [aprobada ? 'Autorizado por' : 'Revisado por', `${quien} · ${cargo}`],
    ['Fecha de la decisión', fechaLarga(n.revisado_en ?? new Date().toISOString())],
    ...(reemplazo ? ([['Reemplazo', reemplazo]] as [string, string][]) : []),
    ...(n.observacion_revision ? ([['Observaciones', n.observacion_revision]] as [string, string][]) : []),
  ];

  // Al docente
  let correoDocente = String(docente?.email ?? '').trim();
  if (!correoDocente.includes('@')) {
    const { data: m } = await admin.from('membresias').select('perfiles!inner(email)').eq('institucion_id', n.institucion_id).eq('docente_id', n.docente_id).limit(1).maybeSingle();
    const p = m ? ((Array.isArray(m.perfiles) ? m.perfiles[0] : m.perfiles) as { email?: string }) : null;
    correoDocente = String(p?.email ?? '').trim();
  }
  if (correoDocente.includes('@'))
    await mandar({
      para: correoDocente,
      asunto: aprobada ? `Su permiso fue aprobado · ${rad}` : `Su solicitud de permiso no fue aprobada · ${rad}`,
      adjunto,
      html: plantilla({
        institucion: nombreInst,
        titulo: aprobada ? 'Su permiso fue aprobado' : 'Su solicitud de permiso no fue aprobada',
        aviso: aprobada ? { texto: `Autorizado por ${quien} (${cargo})`, tono: 'ok' } : { texto: `Revisado por ${quien} (${cargo})`, tono: 'peligro' },
        intro: aprobada
          ? `Hola ${escapar(docente?.nombres?.split(' ')[0] ?? '')}, su solicitud de permiso fue <strong>aprobada</strong>.${adjunto ? ' Adjuntamos el certificado de autorización en PDF.' : ''}`
          : `Hola ${escapar(docente?.nombres?.split(' ')[0] ?? '')}, su solicitud de permiso <strong>no fue aprobada</strong>. Si tiene dudas, comuníquese con ${escapar(quien)}.`,
        filas,
        boton: { texto: 'Ver mis permisos', url: enlace },
        nota: aprobada ? 'También puede descargar el certificado en SIGEI TIC, en Mis permisos.' : undefined,
      }),
    });

  // A los demás directivos, solo cuando se aprueba.
  const otros = aprobada ? directivosAvisar(directivos, { usuario: usuarioId, correo: perfil?.email }) : [];
  for (const d of otros)
    await mandar({
      para: d.email,
      asunto: `Permiso aprobado por ${quien}: ${nombreDoc} · ${rad}`,
      adjunto,
      html: plantilla({
        institucion: nombreInst,
        titulo: 'Permiso aprobado',
        aviso: { texto: `Autorizado por ${quien} (${cargo})`, tono: 'ok' },
        intro: `Hola${d.nombre ? ` ${escapar(d.nombre.split(' ')[0])}` : ''}, le informamos que <strong>${escapar(quien)}</strong> aprobó el permiso de <strong>${escapar(nombreDoc)}</strong>.${adjunto ? ' Adjuntamos el certificado de autorización.' : ''}`,
        filas,
        boton: { texto: 'Ver en SIGEI TIC', url: enlace },
      }),
    });

  return { estado: 200, cuerpo: { enviados, fallidos, sinCorreoDocente: !correoDocente.includes('@') } };
}

if (!Deno.env.get('SIGEI_PRUEBA'))
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return responder({ error: 'Método no permitido.' }, 405);

    const enviar = crearEnvio((k) => Deno.env.get(k));
    if (!enviar) return responder({ error: 'El correo de salida no está configurado. Agregue los secretos SMTP o RESEND en Supabase.', codigo: 'sin_correo' }, 503);

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return responder({ error: 'Inicie sesión de nuevo.' }, 401);

    let entrada: Record<string, unknown>;
    try {
      entrada = await req.json();
    } catch {
      return responder({ error: 'Solicitud no válida.' }, 400);
    }
    // Dirección de SIGEI para el botón del correo: la que envía el navegador o la configurada.
    const pedido = String(entrada.sitio ?? '');
    const sitio = /^https:\/\/[^\s"'<>]+$/.test(pedido) || /^http:\/\/localhost(:\d+)?\//.test(pedido) ? pedido : Deno.env.get('SITIO_URL') || 'https://se-star.github.io/Sigei-3.0/';
    try {
      const r = await procesar(admin, u.user.id, entrada, enviar, sitio);
      return responder(r.cuerpo, r.estado);
    } catch (e) {
      console.error(e);
      return responder({ error: 'No fue posible enviar los avisos. Intente de nuevo.' }, 500);
    }
  });
