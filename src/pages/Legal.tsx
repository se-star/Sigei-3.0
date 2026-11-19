import { useEffect, type ReactNode } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Logo, Wordmark } from '@/components/layout/Logo';
import { ALMACENAMIENTO, DOCS_LEGALES, fechaVersion, nombreOperador, OPERADOR, VERSION_POLITICAS, type DocLegal, type Responsable } from '@/lib/legal';
import { cx } from '@/lib/utils';

interface Props {
  doc: DocLegal;
  /** Institución de la persona en sesión; null si nadie ha ingresado. */
  responsable: Responsable | null;
  /** Texto y destino del enlace de regreso. */
  volver?: { texto: string; a: string };
}

/** Páginas públicas: política de datos, términos y cookies (#/legal/…). */
export default function Legal({ doc, responsable, volver = { texto: 'Volver a SIGEI', a: '#/' } }: Props) {
  const actual = DOCS_LEGALES.find((d) => d.v === doc) ?? DOCS_LEGALES[0];
  useEffect(() => {
    document.title = `${actual.t} · SIGEI TIC`;
    window.scrollTo(0, 0);
    return () => {
      document.title = 'SIGEI TIC';
    };
  }, [actual.t]);

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="no-print border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="#/" className="flex items-center gap-2 rounded-full" aria-label="SIGEI TIC, ir al inicio">
            <Logo className="size-8" />
            <Wordmark className="text-[22px]" />
          </a>
          <a href={volver.a} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2">
            <ArrowLeft className="size-4" aria-hidden="true" /> {volver.texto}
          </a>
        </div>
        <nav aria-label="Documentos legales" className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {DOCS_LEGALES.map((d) => (
            <a
              key={d.v}
              href={`#/legal/${d.v}`}
              aria-current={d.v === doc ? 'page' : undefined}
              className={cx(
                'shrink-0 rounded-full px-3.5 py-1.5 text-sm transition',
                d.v === doc ? 'bg-ink font-medium text-bg' : 'text-ink-2 hover:bg-surface-2',
              )}
            >
              {d.corto}
            </a>
          ))}
        </nav>
      </header>

      <main id="contenido" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <article className="legal">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{actual.t}</h1>
              <p className="mt-2 text-sm text-muted">Versión vigente desde el {fechaVersion()} · SIGEI TIC</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="no-print inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm hover:border-line-strong"
            >
              <Printer className="size-4" aria-hidden="true" /> Imprimir
            </button>
          </div>
          {doc === 'privacidad' && <Privacidad r={responsable} />}
          {doc === 'terminos' && <Terminos r={responsable} />}
          {doc === 'cookies' && <Cookies />}
        </article>
      </main>

      <footer className="no-print border-t border-line">
        <div className="mx-auto flex max-w-4xl flex-wrap gap-x-5 gap-y-2 px-4 py-6 text-sm text-muted sm:px-6">
          <span>© {new Date().getFullYear()} SIGEI TIC</span>
          {DOCS_LEGALES.map((d) => (
            <a key={d.v} href={`#/legal/${d.v}`} className="underline-offset-2 hover:text-ink hover:underline">
              {d.t}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}

/* ─────────────── Piezas comunes ─────────────── */

function Seccion({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <section className="mt-9" aria-labelledby={`s${n}`}>
      <h2 id={`s${n}`} className="font-display text-xl font-semibold">
        {n}. {titulo}
      </h2>
      <div className="mt-3 space-y-3 leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

function Lista({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-muted">{children}</ul>;
}

const PENDIENTE = 'por definir por la institución';

function Dato({ t, v }: { t: string; v: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-sm font-semibold text-ink sm:w-44">{t}</dt>
      <dd className={cx('text-sm', !v && 'italic text-muted')}>{v || PENDIENTE}</dd>
    </div>
  );
}

/** Quién responde por los datos: la institución de la persona en sesión. */
function FichaResponsable({ r }: { r: Responsable | null }) {
  if (!r)
    return (
      <p className="rounded-[16px] bg-surface-2 p-4 text-sm">
        La responsable es la <strong>institución educativa que le dio acceso a SIGEI</strong>. Al ingresar con su cuenta, esta página muestra su nombre, NIT,
        dirección y el correo donde atiende consultas y reclamos sobre datos personales.
      </p>
    );
  return (
    <dl className="space-y-2 rounded-[16px] bg-surface-2 p-4">
      <Dato t="Responsable" v={r.nombre} />
      <Dato t="NIT" v={r.nit} />
      <Dato t="Dirección" v={[r.direccion, r.municipio].filter(Boolean).join(', ')} />
      <Dato t="Teléfono" v={r.telefono} />
      <Dato t="Correo para datos personales" v={r.correo} />
      {r.rector && <Dato t="Rector(a)" v={r.rector} />}
    </dl>
  );
}

function Canal({ r }: { r: Responsable | null }) {
  if (r?.correo)
    return (
      <>
        al correo{' '}
        <a className="font-medium text-ink underline underline-offset-2" href={`mailto:${r.correo}`}>
          {r.correo}
        </a>
        {r.direccion ? <> o por escrito en {[r.direccion, r.municipio].filter(Boolean).join(', ')}</> : null}
      </>
    );
  return <>por los canales oficiales de su institución (correo o radicación en la secretaría)</>;
}

function Operador() {
  const extra = [OPERADOR.identificacion && `identificación ${OPERADOR.identificacion}`, OPERADOR.ciudad].filter(Boolean).join(', ');
  return (
    <>
      <strong>{nombreOperador()}</strong>
      {extra ? ` (${extra})` : ''}
      {OPERADOR.correo ? (
        <>
          , con quien puede comunicarse en{' '}
          <a className="font-medium text-ink underline underline-offset-2" href={`mailto:${OPERADOR.correo}`}>
            {OPERADOR.correo}
          </a>
        </>
      ) : null}
    </>
  );
}

/* ─────────────── Política de tratamiento de datos ─────────────── */

function Privacidad({ r }: { r: Responsable | null }) {
  return (
    <>
      <p className="text-lg leading-relaxed text-ink-2">
        Esta política explica qué datos personales se tratan en SIGEI TIC, para qué, quién los ve y cómo puede ejercer sus derechos. Se expide conforme al
        artículo 15 de la Constitución Política, la Ley 1581 de 2012 y el Decreto 1074 de 2015 (capítulos 25 y 26 del título 2 de la parte 2 del libro 2, que
        recogen los decretos 1377 de 2013 y 886 de 2014).
      </p>

      <Seccion n={1} titulo="Quién es responsable de sus datos">
        <p>
          Cada institución educativa que usa SIGEI decide qué datos registra y para qué; por eso es la <strong>responsable del tratamiento</strong>:
        </p>
        <FichaResponsable r={r} />
        <p>
          La plataforma la opera <Operador />, que actúa como <strong>encargado del tratamiento</strong>: guarda y procesa los datos solo por cuenta de la
          institución y siguiendo sus instrucciones. No los usa para fines propios ni los vende.
        </p>
      </Seccion>

      <Seccion n={2} titulo="Qué datos se tratan">
        <Lista>
          <li>
            <strong>Identificación y contacto:</strong> nombres, apellidos, tipo y número de documento, correo, teléfono, fecha de nacimiento y género.
          </li>
          <li>
            <strong>Datos laborales y académicos:</strong> vinculación, cargo, escalafón, área, sede, fecha de ingreso, hoja de vida (formación, experiencia y
            documentos que se adjunten), carga académica, horario y dirección de grupo.
          </li>
          <li>
            <strong>Novedades y permisos:</strong> tipo, fechas, motivo, soportes, reemplazos, decisión, quién la tomó y certificados generados.
          </li>
          <li>
            <strong>Evaluación docente:</strong> visitas de aula, valoraciones de la rúbrica, fortalezas, oportunidades de mejora y compromisos.
          </li>
          <li>
            <strong>Firma:</strong> imagen de la firma que los directivos cargan para los certificados que aprueban.
          </li>
          <li>
            <strong>Cuenta y seguridad:</strong> correo de acceso, rol, institución y un registro de actividad (quién creó, cambió o borró información y
            cuándo).
          </li>
        </Lista>
        <p>
          <strong>Datos sensibles.</strong> Los soportes de incapacidades o calamidades pueden contener datos de salud. Usted <strong>no está obligado</strong>{' '}
          a autorizar el tratamiento de datos sensibles; si los aporta, se usan solo para justificar la novedad, y únicamente los ven los directivos y usted.
        </p>
        <p>
          <strong>Niñas, niños y adolescentes.</strong> SIGEI no registra datos personales de estudiantes: los grupos se identifican por grado y número, con el
          total de estudiantes.
        </p>
      </Seccion>

      <Seccion n={3} titulo="Para qué se usan">
        <Lista>
          <li>Organizar la asignación académica, los horarios, los grupos y las sedes.</li>
          <li>Tramitar novedades y permisos: solicitud, revisión, reemplazos, soportes, certificados y avisos por correo.</li>
          <li>Hacer el acompañamiento y la evaluación del desempeño docente, y socializar sus resultados.</li>
          <li>Publicar comunicados, actividades y tareas de la institución.</li>
          <li>Elaborar informes internos y los que exijan las autoridades educativas.</li>
          <li>Proteger la plataforma: controlar el acceso por roles, auditar cambios y prevenir usos indebidos.</li>
        </Lista>
        <p>Los datos no se usan para publicidad, perfiles comerciales ni decisiones tomadas solo por un sistema automático.</p>
      </Seccion>

      <Seccion n={4} titulo="Su autorización">
        <p>
          La primera vez que ingresa, SIGEI le pide aceptar esta política y los términos de uso, y guarda la versión aceptada y la fecha como prueba de su
          autorización. Si la política cambia de forma sustancial, se le pedirá aceptarla de nuevo.
        </p>
        <p>
          No se necesita autorización cuando la ley lo dispone, por ejemplo para datos públicos, información requerida por una entidad pública en ejercicio de
          sus funciones o datos necesarios para la relación laboral (Ley 1581 de 2012, art. 10).
        </p>
      </Seccion>

      <Seccion n={5} titulo="Quién puede ver sus datos">
        <Lista>
          <li>
            <strong>Rectoría, coordinación y administración</strong> de su institución, según los permisos de cada rol.
          </li>
          <li>
            <strong>Usted</strong>, con su cuenta: su ficha, su horario, sus permisos y las evaluaciones que ya le socializaron.
          </li>
          <li>
            <strong>Otros docentes</strong> solo ven lo necesario para trabajar: nombres en horarios, reemplazos y directorio.
          </li>
          <li>
            <strong>El operador</strong>, solo para dar soporte técnico o cuando la institución lo pida.
          </li>
        </Lista>
        <p>Los datos de una institución nunca se muestran a otra.</p>
      </Seccion>

      <Seccion n={6} titulo="Dónde se guardan y quién más interviene">
        <p>Para funcionar, SIGEI se apoya en proveedores que actúan como encargados o subencargados:</p>
        <Lista>
          <li>
            <strong>Supabase</strong>: base de datos, archivos (soportes y documentos) y cuentas de acceso. Los servidores están en la región elegida al crear
            el proyecto.
          </li>
          <li>
            <strong>GitHub Pages</strong>: publica la aplicación web. No recibe ni guarda los datos que usted registra.
          </li>
          <li>
            <strong>El servicio de correo</strong> que configure la institución, para enviar los avisos de permisos.
          </li>
        </Lista>
        <p>
          Si los servidores están fuera de Colombia, el envío de los datos es una <strong>transmisión internacional</strong> a un encargado, que se rige por el
          contrato de transmisión entre la institución y el operador (Decreto 1074 de 2015, arts. 2.2.2.25.5.1 y 2.2.2.25.5.2) y por las garantías de la Ley
          1581 de 2012.
        </p>
      </Seccion>

      <Seccion n={7} titulo="Cómo se protegen">
        <Lista>
          <li>Conexión cifrada (HTTPS) en todo momento.</li>
          <li>Acceso por roles verificado en la base de datos, no solo en la pantalla.</li>
          <li>Contraseñas guardadas por el servicio de autenticación con cifrado; nadie, ni el operador, puede leerlas.</li>
          <li>Los soportes se abren con enlaces temporales de pocos minutos.</li>
          <li>Registro de actividad de los cambios.</li>
        </Lista>
      </Seccion>

      <Seccion n={8} titulo="Sus derechos">
        <p>Como titular puede, de forma gratuita (Ley 1581 de 2012, art. 8):</p>
        <Lista>
          <li>Conocer, actualizar y rectificar sus datos.</li>
          <li>Pedir prueba de la autorización que otorgó.</li>
          <li>Saber qué uso se les ha dado.</li>
          <li>
            Revocar la autorización o pedir que se borren sus datos, cuando no exista un deber legal o contractual de conservarlos (por ejemplo, el archivo de
            la relación laboral).
          </li>
          <li>Acudir a la Superintendencia de Industria y Comercio después de presentar su consulta o reclamo ante la institución.</li>
        </Lista>
      </Seccion>

      <Seccion n={9} titulo="Cómo ejercerlos">
        <p>
          Escriba a la institución <Canal r={r} />. Indique su nombre, documento, lo que pide y cómo quiere recibir la respuesta. Muchas correcciones las puede
          hacer usted mismo en <em>Mi perfil</em>.
        </p>
        <Lista>
          <li>
            <strong>Consultas</strong>: se responden en máximo 10 días hábiles, prorrogables 5 más avisándole el motivo (art. 14).
          </li>
          <li>
            <strong>Reclamos</strong> (corrección, actualización, supresión o incumplimiento): se responden en máximo 15 días hábiles, prorrogables 8 más
            avisándole el motivo. Si falta información, se le pedirá dentro de los 5 días siguientes; si pasan 2 meses sin que la entregue, se entiende que
            desistió (art. 15).
          </li>
        </Lista>
      </Seccion>

      <Seccion n={10} titulo="Cuánto tiempo se conservan">
        <p>
          Mientras exista la relación con la institución y, después, el tiempo que exijan las normas de archivo (Ley 594 de 2000) y las tablas de retención
          documental de la institución. Cumplido ese plazo, se eliminan o se anonimizan.
        </p>
      </Seccion>

      <Seccion n={11} titulo="Cambios y vigencia">
        <p>
          Esta política rige desde el {fechaVersion()} (versión {VERSION_POLITICAS}). Los cambios se publican en esta página y, si son sustanciales, se le
          pedirá aceptarlos al ingresar.
        </p>
      </Seccion>
    </>
  );
}

/* ─────────────── Términos y condiciones ─────────────── */

function Terminos({ r }: { r: Responsable | null }) {
  return (
    <>
      <p className="text-lg leading-relaxed text-ink-2">
        Estos términos regulan el uso de SIGEI TIC, la plataforma de gestión educativa que su institución pone a su disposición. Al ingresar y aceptarlos, usted
        se compromete a cumplirlos.
      </p>

      <Seccion n={1} titulo="Quiénes intervienen">
        <Lista>
          <li>
            <strong>La institución educativa</strong> {r ? <>({r.nombre})</> : null}: crea las cuentas, define los roles y es responsable de la información que
            registra.
          </li>
          <li>
            <strong>El operador</strong>: <Operador />, que desarrolla, mantiene y aloja la plataforma.
          </li>
          <li>
            <strong>Las personas usuarias</strong>: directivos, administrativos y docentes con cuenta.
          </li>
        </Lista>
      </Seccion>

      <Seccion n={2} titulo="Su cuenta">
        <Lista>
          <li>Es personal e intransferible. No comparta su contraseña ni su código de acceso.</li>
          <li>Usted responde por lo que se haga con su cuenta. Si sospecha un uso indebido, cambie la contraseña y avise a la institución.</li>
          <li>La institución puede suspender o retirar cuentas, por ejemplo cuando termina la vinculación.</li>
        </Lista>
      </Seccion>

      <Seccion n={3} titulo="Uso permitido">
        <p>Use SIGEI solo para las labores de la institución. No está permitido:</p>
        <Lista>
          <li>Registrar información falsa o de terceros sin autorización.</li>
          <li>Consultar, copiar o divulgar datos que no necesite para su labor.</li>
          <li>Subir archivos con virus o contenido ilegal u ofensivo.</li>
          <li>
            Intentar entrar a cuentas ajenas, saltarse los permisos o afectar el funcionamiento de la plataforma. Estas conductas pueden ser delitos según la
            Ley 1273 de 2009.
          </li>
        </Lista>
      </Seccion>

      <Seccion n={4} titulo="Obligaciones de la institución">
        <Lista>
          <li>Mantener actualizados y verídicos los datos que registra.</li>
          <li>Obtener las autorizaciones que exige la ley para tratar datos personales y atender las consultas y reclamos de los titulares.</li>
          <li>Asignar los roles con criterio de mínimo privilegio y revisarlos periódicamente.</li>
          <li>Configurar sus datos de contacto para la política de privacidad y el servicio de correo de avisos.</li>
        </Lista>
      </Seccion>

      <Seccion n={5} titulo="Certificados y firmas">
        <p>
          Los certificados de permisos se generan con los datos registrados en SIGEI y llevan un radicado para su verificación. La firma que aparece es una
          imagen cargada por quien aprobó; no es una firma digital certificada. Su valor como firma electrónica depende de que la institución la adopte como
          mecanismo de firma en sus procedimientos (Ley 527 de 1999 y Decreto 1074 de 2015, sección de firma electrónica).
        </p>
      </Seccion>

      <Seccion n={6} titulo="Disponibilidad y respaldos">
        <p>
          El operador procura que SIGEI esté disponible y sin errores, pero puede haber interrupciones por mantenimiento o fallas de los proveedores.
          Recomendamos que la institución descargue respaldos periódicos desde <em>Configuración → Respaldo</em>.
        </p>
      </Seccion>

      <Seccion n={7} titulo="Propiedad intelectual">
        <p>
          El software, la marca SIGEI TIC y su diseño pertenecen al operador. La información que registra la institución le pertenece a ella y puede descargarla
          en cualquier momento.
        </p>
      </Seccion>

      <Seccion n={8} titulo="Responsabilidad">
        <p>
          Cada parte responde por lo que está bajo su control: la institución, por la información que registra y las decisiones que toma con ella; el operador,
          por el funcionamiento y la seguridad de la plataforma según estos términos y la ley. Nada en estos términos limita los derechos que la ley colombiana
          reconoce y que no se pueden renunciar.
        </p>
      </Seccion>

      <Seccion n={9} titulo="Fin del servicio">
        <p>
          Si la institución deja de usar SIGEI, podrá descargar su información antes del cierre. Después, los datos se eliminarán según lo acordado y la
          política de tratamiento.
        </p>
      </Seccion>

      <Seccion n={10} titulo="Cambios, ley aplicable y contacto">
        <p>
          Estos términos rigen desde el {fechaVersion()}. Si cambian de forma sustancial, se le pedirá aceptarlos de nuevo. Se rigen por las leyes de la
          República de Colombia. Para preguntas sobre su cuenta, comuníquese con su institución <Canal r={r} />.
        </p>
      </Seccion>
    </>
  );
}

/* ─────────────── Cookies y almacenamiento ─────────────── */

function Cookies() {
  return (
    <>
      <p className="text-lg leading-relaxed text-ink-2">
        <strong>SIGEI TIC no usa cookies</strong>, ni herramientas de analítica, publicidad o rastreo, propias o de terceros. Para funcionar guarda unos pocos
        datos en el almacenamiento local de su navegador, que se describen a continuación.
      </p>

      <Seccion n={1} titulo="Qué se guarda en su navegador">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Datos que SIGEI guarda en el almacenamiento local del navegador</caption>
            <thead className="text-left text-xs font-semibold text-muted">
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-3">
                  Nombre
                </th>
                <th scope="col" className="px-3 py-2">
                  Para qué sirve
                </th>
                <th scope="col" className="px-3 py-2">
                  Tipo
                </th>
                <th scope="col" className="py-2 pl-3">
                  Duración
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ALMACENAMIENTO.map((a) => (
                <tr key={a.clave}>
                  <td className="py-2.5 pr-3 align-top font-mono text-xs">{a.clave}</td>
                  <td className="px-3 py-2.5 align-top">{a.para}</td>
                  <td className="px-3 py-2.5 align-top whitespace-nowrap">{a.tipo}</td>
                  <td className="py-2.5 pl-3 align-top">{a.dura}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      <Seccion n={2} titulo="Por qué no le pedimos consentimiento de cookies">
        <p>
          Todo lo anterior es <strong>estrictamente necesario</strong> para prestar el servicio que usted pide (mantener su sesión, mostrar su institución) o
          guarda una <strong>preferencia que usted mismo eligió</strong> (tema, vista o menú). Nada de eso se usa para perfilarlo ni se comparte con terceros,
          así que no requiere un aviso de consentimiento. Los datos personales que usted registra en la plataforma se rigen por la política de tratamiento de
          datos.
        </p>
        <p>
          Las fuentes tipográficas y los íconos vienen incluidos en la aplicación: su navegador no se conecta a servicios de terceros como Google Fonts al usar
          SIGEI.
        </p>
      </Seccion>

      <Seccion n={3} titulo="Cómo borrarlo">
        <Lista>
          <li>Al cerrar sesión se borra la sesión guardada.</li>
          <li>
            Puede borrar todo desde la configuración de su navegador (por ejemplo, <em>Privacidad → Borrar datos de navegación → Datos de sitios</em>). Tendrá
            que volver a ingresar y elegir de nuevo sus preferencias.
          </li>
        </Lista>
      </Seccion>

      <Seccion n={4} titulo="Si esto cambia">
        <p>
          Si en el futuro SIGEI incorpora cookies o herramientas que no sean estrictamente necesarias (por ejemplo, analítica), se actualizará esta página y se
          le pedirá su consentimiento <strong>antes</strong> de activarlas.
        </p>
      </Seccion>
    </>
  );
}
