import { useAuth } from '@/hooks/useAuth';
import { useAjustes, useTabla } from '@/hooks/useDatos';
import { useToast } from '@/hooks/useToast';
import { backend } from '@/lib/backend';
import { etiqueta, TIPOS_NOVEDAD } from '@/lib/catalogos';
import { aBase64, datosCertificado, generarCertificado, radicado } from '@/lib/certificadoPermiso';
import { ErrorAviso } from '@/lib/data/provider';
import type { Novedad } from '@/lib/types';
import { descargarArchivo, nombreDocente } from '@/lib/utils';

/**
 * Certificado de autorización de permisos y avisos por correo (solicitud y
 * decisión). Los correos los envía la función del servidor notificar-permiso.
 */
export function useAvisosPermiso() {
  const { perfil } = useAuth();
  const ajustes = useAjustes();
  const { data: docentes = [] } = useTabla('docentes');
  const { data: sedes = [] } = useTabla('sedes');
  const toast = useToast();

  /** Arma el PDF del certificado de una novedad aprobada. */
  const certificado = async (n: Novedad): Promise<Uint8Array> => {
    const PDFLib = await import('pdf-lib');
    let logo: Uint8Array | null = null;
    if (ajustes.logo_url) {
      try {
        const r = await fetch(ajustes.logo_url);
        if (r.ok) logo = new Uint8Array(await r.arrayBuffer());
      } catch {
        /* sin escudo */
      }
    }
    // Firma de quien aprobó (Mi perfil → Firma), si la tiene.
    let firma: Uint8Array | null = null;
    if (n.revisado_por_id) {
      try {
        const url = await backend.datos.firmaDe(n.revisado_por_id);
        if (url) firma = new Uint8Array(await (await fetch(url)).arrayBuffer());
      } catch {
        firma = null;
      }
    }
    const d = docentes.find((x) => x.id === n.docente_id);
    const r = n.reemplazo_id ? docentes.find((x) => x.id === n.reemplazo_id) : undefined;
    return generarCertificado(
      PDFLib,
      datosCertificado({
        n,
        docente: d,
        sede: sedes.find((s) => s.id === d?.sede_id)?.nombre,
        institucion: { nombre: ajustes.nombre || 'Institución educativa', municipio: ajustes.municipio, logo },
        franjas: ajustes.franjas,
        tipo: etiqueta(TIPOS_NOVEDAD, n.tipo),
        reemplazo: r ? nombreDocente(r) : undefined,
        revisor: { nombre: n.revisado_por ?? '', rol: n.revisado_rol || 'rector', firma },
        plantilla: ajustes.plantilla_certificado,
      }),
    );
  };

  const descargar = async (n: Novedad) => {
    try {
      const pdf = await certificado(n);
      descargarArchivo(`Certificado_${radicado(n)}.pdf`, new Uint8Array(pdf) as Uint8Array<ArrayBuffer>, 'application/pdf');
    } catch (e) {
      toast.error(e);
    }
  };

  /** Aviso a rectoría y coordinación cuando un docente radica una solicitud. */
  const avisarSolicitud = async (n: Novedad) => {
    try {
      const r = await backend.datos.notificarPermiso({ evento: 'solicitud', novedad_id: n.id });
      if (!r.demo && r.enviados.length) toast.ok('Avisamos por correo a rectoría y coordinación.');
    } catch (e) {
      // El docente no puede resolver la configuración del correo: la solicitud ya quedó radicada.
      console.warn('Aviso de solicitud no enviado:', e);
    }
  };

  /** Aviso de la decisión al docente (y a los demás directivos si se aprobó), con el certificado adjunto. */
  const avisarDecision = async (n: Novedad) => {
    const aprobada = n.estado === 'aprobada';
    try {
      const cert = aprobada ? aBase64(await certificado(n)) : undefined;
      const r = await backend.datos.notificarPermiso({ evento: 'decision', novedad_id: n.id, certificado: cert });
      if (r.demo) return toast.ok('En el modo demo no se envían correos. Con Supabase, el docente y los directivos recibirían el aviso.');
      if (r.enviados.length)
        toast.ok(
          `Enviamos el aviso por correo a ${r.enviados.length === 1 ? '1 persona' : `${r.enviados.length} personas`}${aprobada ? ', con el certificado adjunto' : ''}.`,
        );
      if (r.sinCorreoDocente) toast.error('El docente no tiene correo registrado en SIGEI: descargue el certificado y entrégueselo.');
      if (r.sinCorreoReemplazo) toast.error('El docente de reemplazo no tiene correo registrado: avísele de sus clases por otro medio.');
      if (r.fallidos.length) toast.error(`No se pudo enviar el correo a ${r.fallidos.join(', ')}. Revise la configuración del correo.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`La novedad quedó ${aprobada ? 'aprobada' : 'rechazada'}, pero no se enviaron los correos. ${msg}`);
      if (!(e instanceof ErrorAviso)) console.error(e);
    }
  };

  /** Avisos sueltos: al reemplazo (cuando se asigna o cambia después de aprobar) o el recordatorio de soporte al docente. */
  const avisoSuelto = async (evento: 'reemplazo' | 'soporte', n: Novedad) => {
    try {
      const r = await backend.datos.notificarPermiso({ evento, novedad_id: n.id });
      if (r.demo) return toast.ok('En el modo demo no se envían correos.');
      if (r.enviados.length) toast.ok(evento === 'reemplazo' ? 'Avisamos por correo al docente de reemplazo con sus clases.' : 'Enviamos el recordatorio al docente.');
      if (r.sinCorreoReemplazo) toast.error('El docente de reemplazo no tiene correo registrado: avísele por otro medio.');
      if (r.sinCorreoDocente) toast.error('El docente no tiene correo registrado: recuérdele por otro medio.');
      if (r.fallidos.length) toast.error(`No se pudo enviar el correo a ${r.fallidos.join(', ')}. Revise la configuración del correo.`);
    } catch (e) {
      toast.error(`No se envió el correo. ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const avisarReemplazo = (n: Novedad) => avisoSuelto('reemplazo', n);
  const recordarSoporte = (n: Novedad) => avisoSuelto('soporte', n);

  /** Cargo e identidad de quien revisa ahora, para guardarlos con la decisión. */
  const datosRevisor = { revisado_rol: perfil?.rol ?? '', revisado_por_id: perfil?.id ?? null };

  return { descargar, avisarSolicitud, avisarDecision, avisarReemplazo, recordarSoporte, datosRevisor, puedeAvisar: perfil?.rol !== 'docente' };
}

/**
 * Guarda una revisión con el cargo de quien revisa; si la base de datos aún no
 * tiene esa columna (migración 0009), guarda sin ella.
 */
export async function conDatosRevisor<T>(
  datos: { revisado_rol: string; revisado_por_id: string | null },
  guardar: (extras: Partial<Pick<Novedad, 'revisado_rol' | 'revisado_por_id'>>) => Promise<T>,
): Promise<T> {
  try {
    return await guardar(datos);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    // Sin la migración 0010: se guarda sin quién revisó; sin la 0009, tampoco el cargo.
    if (/0010_permisos_firma_soportes/.test(msg)) return conDatosRevisor({ ...datos, revisado_por_id: null }, (x) => guardar({ revisado_rol: x.revisado_rol }));
    if (/0009_permisos_correo/.test(msg)) return guardar({});
    throw e;
  }
}
