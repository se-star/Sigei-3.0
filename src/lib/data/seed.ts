import type {
  Ajustes,
  Area,
  Asignacion,
  Asignatura,
  BloqueHorario,
  Comunicado,
  Dia,
  Docente,
  Evento,
  Grado,
  Grupo,
  Novedad,
  Perfil,
  Sede,
  Seguimiento,
  Tarea,
} from '../types';

/** Datos ficticios para el modo demo. Las fechas se calculan desde hoy. */

export const FRANJAS_DEFECTO = [
  { inicio: '06:30', fin: '07:25' },
  { inicio: '07:25', fin: '08:20' },
  { inicio: '08:20', fin: '09:15' },
  { inicio: '09:15', fin: '09:45', descanso: true },
  { inicio: '09:45', fin: '10:40' },
  { inicio: '10:40', fin: '11:35' },
  { inicio: '11:35', fin: '12:30' },
];

export const CRITERIOS_DEFECTO = [
  'Planeación de la clase',
  'Dominio disciplinar',
  'Estrategias didácticas',
  'Manejo del grupo y convivencia',
  'Evaluación formativa',
  'Uso de recursos y TIC',
];

function iso(d: Date) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
function enDias(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
}
/** Igual que enDias, pero corre sábados y domingos al lunes siguiente. */
function habil(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const dow = d.getDay();
  if (dow === 6) d.setDate(d.getDate() + 2);
  if (dow === 0) d.setDate(d.getDate() + 1);
  return iso(d);
}

let contador = 0;
const id = (p: string) => `${p}-${(++contador).toString().padStart(3, '0')}`;

export function crearDatosDemo() {
  contador = 0;
  const anio = new Date().getFullYear();

  const ajustes: Ajustes[] = [
    {
      id: 'ajustes',
      institucion: 'Institución Educativa Los Almendros',
      sigla: 'IELA',
      codigo_dane: '105001000000',
      nit: '900.000.000-0',
      municipio: 'Medellín, Antioquia',
      rector: 'Rectoría IELA',
      anio_lectivo: anio,
      periodos: 3,
      logo_url: '',
      franjas: FRANJAS_DEFECTO,
      criterios_seguimiento: CRITERIOS_DEFECTO,
    },
  ];

  const sedes: Sede[] = [
    { id: id('sed'), nombre: 'Sede Principal', direccion: 'Calle 45 # 12-30', telefono: '604 444 0000', email: 'principal@iela.edu.co', principal: true },
    { id: id('sed'), nombre: 'Sede La Esperanza', direccion: 'Carrera 80 # 32-10', telefono: '604 444 0001', email: 'esperanza@iela.edu.co', principal: false },
  ];

  const areaDefs: [string, string, string[]][] = [
    ['Matemáticas', '#0f766e', ['Matemáticas', 'Geometría', 'Estadística']],
    ['Humanidades', '#b45309', ['Lengua Castellana', 'Inglés']],
    ['Ciencias Naturales', '#15803d', ['Biología', 'Química', 'Física']],
    ['Ciencias Sociales', '#7c3aed', ['Sociales', 'Filosofía', 'Ética y Valores']],
    ['Tecnología e Informática', '#1d4ed8', ['Tecnología']],
    ['Educación Artística', '#db2777', ['Artística']],
    ['Educación Física', '#c2410c', ['Educación Física']],
    ['Educación Religiosa', '#64748b', ['Religión']],
  ];
  const areas: Area[] = [];
  const asignaturas: Asignatura[] = [];
  for (const [nombre, color, asigs] of areaDefs) {
    const a = { id: id('are'), nombre, color };
    areas.push(a);
    for (const s of asigs) asignaturas.push({ id: id('asg'), nombre: s, area_id: a.id });
  }
  const asg = (n: string) => asignaturas.find((a) => a.nombre === n)!.id;
  const area = (n: string) => areas.find((a) => a.nombre === n)!.id;

  const docDefs: [string, string, string, Docente['genero'], string, Docente['vinculacion'], Docente['estado'], number, number][] = [
    // nombres, apellidos, area, genero, cargo, vinc, estado, mes cumple (0-11), día
    ['Laura Marcela', 'Restrepo Gil', 'Matemáticas', 'F', 'Docente de aula', 'planta', 'activo', new Date().getMonth(), 18],
    ['Andrés Felipe', 'Cardona Ruiz', 'Matemáticas', 'M', 'Docente de aula', 'planta', 'activo', 3, 2],
    ['Diana Patricia', 'Mejía Ochoa', 'Humanidades', 'F', 'Docente de aula', 'planta', 'activo', 6, 21],
    ['Juan Camilo', 'Vélez Arango', 'Humanidades', 'M', 'Docente de aula', 'provisional', 'activo', new Date().getMonth(), 27],
    ['Sandra Milena', 'Zapata Londoño', 'Ciencias Naturales', 'F', 'Docente de aula', 'planta', 'activo', 9, 9],
    ['Carlos Mario', 'Ospina Henao', 'Ciencias Naturales', 'M', 'Docente de aula', 'planta', 'licencia', 1, 14],
    ['Paola Andrea', 'Giraldo Montoya', 'Ciencias Sociales', 'F', 'Docente de aula', 'planta', 'activo', 11, 3],
    ['Jorge Iván', 'Salazar Rendón', 'Ciencias Sociales', 'M', 'Docente de aula', 'temporal', 'activo', 4, 30],
    ['Natalia', 'Agudelo Castaño', 'Tecnología e Informática', 'F', 'Docente de aula', 'planta', 'activo', 7, 11],
    ['Esteban', 'Muñoz Quintero', 'Educación Artística', 'M', 'Docente de aula', 'catedra', 'activo', 2, 25],
    ['Valentina', 'Correa Duque', 'Educación Física', 'F', 'Docente de aula', 'provisional', 'activo', 5, 6],
    ['Héctor Fabio', 'Ríos Betancur', 'Educación Religiosa', 'M', 'Docente de aula', 'planta', 'activo', 8, 19],
    ['Mónica', 'Toro Jaramillo', 'Humanidades', 'F', 'Coordinadora académica', 'planta', 'activo', 10, 1],
    ['Gustavo Adolfo', 'Pérez Lopera', 'Matemáticas', 'M', 'Docente de aula', 'planta', 'retirado', 0, 15],
  ];
  const docentes: Docente[] = docDefs.map(([nombres, apellidos, ar, genero, cargo, vinculacion, estado, mes, dia], i) => ({
    id: id('doc'),
    documento: String(43000000 + i * 137911),
    nombres,
    apellidos,
    email: `${nombres.split(' ')[0].toLowerCase()}.${apellidos.split(' ')[0].toLowerCase()}@iela.edu.co`
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, ''),
    telefono: `300 ${String(1000000 + i * 54321).slice(0, 3)} ${String(1000 + i * 77).slice(0, 4)}`,
    fecha_nacimiento: iso(new Date(1975 + (i % 18), mes, dia)),
    genero,
    area_id: area(ar),
    sede_id: i % 4 === 3 ? sedes[1].id : sedes[0].id,
    vinculacion,
    escalafon: ['2A', '2B', '2C', '3A', '14', '1B'][i % 6],
    cargo,
    estado,
    carga_maxima: 22,
    fecha_ingreso: iso(new Date(2008 + (i % 14), (i * 3) % 12, 1 + i)),
    notas: '',
  }));
  const doc = (n: string) => docentes.find((d) => d.nombres.startsWith(n))!.id;

  const gradoDefs: [string, Grado['nivel']][] = [
    ['Transición', 'preescolar'],
    ['Primero', 'primaria'],
    ['Segundo', 'primaria'],
    ['Tercero', 'primaria'],
    ['Cuarto', 'primaria'],
    ['Quinto', 'primaria'],
    ['Sexto', 'secundaria'],
    ['Séptimo', 'secundaria'],
    ['Octavo', 'secundaria'],
    ['Noveno', 'secundaria'],
    ['Décimo', 'media'],
    ['Undécimo', 'media'],
  ];
  const grados: Grado[] = gradoDefs.map(([nombre, nivel], i) => ({ id: id('gra'), nombre, nivel, orden: i }));

  const grupos: Grupo[] = [];
  grados.forEach((g, i) => {
    const n = i >= 6 ? 2 : 1;
    for (let k = 1; k <= n; k++) {
      grupos.push({
        id: id('gru'),
        grado_id: g.id,
        nombre: `${i === 0 ? '0' : i}°${k}`,
        jornada: i >= 6 ? 'manana' : 'tarde',
        sede_id: i < 6 ? sedes[1].id : sedes[0].id,
        director_id: null,
        capacidad: 38,
        estudiantes: 28 + ((i * 7 + k * 3) % 10),
      });
    }
  });
  const gru = (n: string) => grupos.find((g) => g.nombre === n)!.id;
  const directores: [string, string][] = [
    ['6°1', 'Laura'], ['6°2', 'Diana'], ['7°1', 'Sandra'], ['7°2', 'Paola'], ['8°1', 'Andrés'],
    ['9°1', 'Juan Camilo'], ['10°1', 'Natalia'], ['11°1', 'Jorge'],
  ];
  for (const [g, d] of directores) grupos.find((x) => x.nombre === g)!.director_id = doc(d);

  const asigDefs: [string, string, string, number][] = [
    ['Laura', '6°1', 'Matemáticas', 6], ['Laura', '6°2', 'Matemáticas', 5], ['Laura', '7°1', 'Matemáticas', 5], ['Laura', '7°2', 'Geometría', 2],
    ['Andrés', '8°1', 'Matemáticas', 5], ['Andrés', '8°2', 'Matemáticas', 5], ['Andrés', '9°1', 'Matemáticas', 5], ['Andrés', '9°2', 'Estadística', 2],
    ['Diana', '6°1', 'Lengua Castellana', 5], ['Diana', '6°2', 'Lengua Castellana', 4], ['Diana', '7°1', 'Lengua Castellana', 4], ['Diana', '7°2', 'Lengua Castellana', 4],
    ['Juan Camilo', '6°1', 'Inglés', 3], ['Juan Camilo', '6°2', 'Inglés', 3], ['Juan Camilo', '10°1', 'Inglés', 3], ['Juan Camilo', '11°1', 'Inglés', 3],
    ['Sandra', '6°1', 'Biología', 4], ['Sandra', '6°2', 'Biología', 4], ['Sandra', '10°1', 'Química', 3], ['Sandra', '11°1', 'Química', 3],
    ['Paola', '6°1', 'Sociales', 5], ['Paola', '6°2', 'Sociales', 4], ['Paola', '7°1', 'Sociales', 4],
    ['Jorge', '10°1', 'Filosofía', 2], ['Jorge', '11°1', 'Filosofía', 2], ['Jorge', '6°1', 'Ética y Valores', 1],
    ['Natalia', '6°1', 'Tecnología', 2], ['Natalia', '6°2', 'Tecnología', 2], ['Natalia', '7°1', 'Tecnología', 2],
    ['Esteban', '6°1', 'Artística', 1], ['Esteban', '6°2', 'Artística', 1],
    ['Valentina', '6°1', 'Educación Física', 2], ['Valentina', '6°2', 'Educación Física', 2],
    ['Héctor', '6°1', 'Religión', 1], ['Héctor', '6°2', 'Religión', 1],
  ];
  const asignaciones: Asignacion[] = asigDefs.map(([d, g, a, h]) => ({
    id: id('asi'),
    docente_id: doc(d),
    grupo_id: gru(g),
    asignatura_id: asg(a),
    horas_semanales: h,
  }));

  // Horario completo para 6°1 y parcial para 6°2.
  const franjasClase = FRANJAS_DEFECTO.filter((f) => !f.descanso);
  const plan61: [Dia, number, string, string][] = [];
  const semana61: string[][] = [
    ['Matemáticas', 'Matemáticas', 'Lengua Castellana', 'Biología', 'Sociales', 'Inglés'],
    ['Lengua Castellana', 'Biología', 'Matemáticas', 'Sociales', 'Tecnología', 'Educación Física'],
    ['Inglés', 'Sociales', 'Biología', 'Matemáticas', 'Lengua Castellana', 'Artística'],
    ['Sociales', 'Matemáticas', 'Inglés', 'Lengua Castellana', 'Biología', 'Religión'],
    ['Educación Física', 'Tecnología', 'Ética y Valores', 'Matemáticas', 'Lengua Castellana', 'Sociales'],
  ];
  const docDe: Record<string, string> = {
    Matemáticas: 'Laura', 'Lengua Castellana': 'Diana', Biología: 'Sandra', Sociales: 'Paola', Inglés: 'Juan Camilo',
    Tecnología: 'Natalia', 'Educación Física': 'Valentina', Artística: 'Esteban', Religión: 'Héctor', 'Ética y Valores': 'Jorge',
  };
  semana61.forEach((dia, di) => dia.forEach((mat, fi) => plan61.push([(di + 1) as Dia, fi, mat, docDe[mat]])));
  const horarios: BloqueHorario[] = plan61.map(([dia, fi, mat, d]) => ({
    id: id('hor'),
    grupo_id: gru('6°1'),
    asignatura_id: asg(mat),
    docente_id: doc(d),
    dia,
    hora_inicio: franjasClase[fi].inicio,
    hora_fin: franjasClase[fi].fin,
    aula: 'Aula 201',
  }));
  const plan62: [Dia, number, string][] = [
    [1, 2, 'Matemáticas'], [1, 3, 'Lengua Castellana'], [2, 0, 'Biología'], [2, 1, 'Matemáticas'],
    [3, 3, 'Sociales'], [3, 4, 'Inglés'], [4, 0, 'Matemáticas'], [5, 1, 'Lengua Castellana'],
  ];
  for (const [dia, fi, mat] of plan62) {
    horarios.push({
      id: id('hor'),
      grupo_id: gru('6°2'),
      asignatura_id: asg(mat),
      docente_id: doc(docDe[mat]),
      dia,
      hora_inicio: franjasClase[fi].inicio,
      hora_fin: franjasClase[fi].fin,
      aula: 'Aula 202',
    });
  }

  const novedades: Novedad[] = [
    { id: id('nov'), docente_id: doc('Carlos'), tipo: 'licencia', fecha_inicio: enDias(-10), fecha_fin: enDias(20), horas: 0, motivo: 'Licencia de paternidad.', estado: 'aprobada', reemplazo_id: doc('Sandra'), revisado_por: 'Rectoría', revisado_en: enDias(-11), observacion_revision: 'Soporte radicado.', creado_por: null },
    { id: id('nov'), docente_id: doc('Juan Camilo'), tipo: 'permiso_personal', fecha_inicio: enDias(0), fecha_fin: enDias(0), horas: 3, motivo: 'Diligencia bancaria en la mañana.', estado: 'aprobada', reemplazo_id: doc('Diana'), revisado_por: 'Coordinación Académica', revisado_en: enDias(-1), observacion_revision: '', creado_por: null },
    { id: id('nov'), docente_id: doc('Paola'), tipo: 'incapacidad', fecha_inicio: enDias(1), fecha_fin: enDias(3), horas: 0, motivo: 'Incapacidad médica por EPS.', estado: 'pendiente', reemplazo_id: null, revisado_por: null, revisado_en: null, observacion_revision: '', creado_por: null },
    { id: id('nov'), docente_id: doc('Natalia'), tipo: 'capacitacion', fecha_inicio: enDias(5), fecha_fin: enDias(6), horas: 12, motivo: 'Formación en pensamiento computacional (Secretaría de Educación).', estado: 'pendiente', reemplazo_id: null, revisado_por: null, revisado_en: null, observacion_revision: '', creado_por: null },
    { id: id('nov'), docente_id: doc('Esteban'), tipo: 'calamidad', fecha_inicio: enDias(-20), fecha_fin: enDias(-18), horas: 0, motivo: 'Calamidad doméstica.', estado: 'aprobada', reemplazo_id: null, revisado_por: 'Rectoría', revisado_en: enDias(-20), observacion_revision: '', creado_por: null },
    { id: id('nov'), docente_id: doc('Jorge'), tipo: 'permiso_personal', fecha_inicio: enDias(-6), fecha_fin: enDias(-6), horas: 2, motivo: 'Cita odontológica.', estado: 'rechazada', reemplazo_id: null, revisado_por: 'Coordinación Académica', revisado_en: enDias(-7), observacion_revision: 'Coincide con la jornada de evaluación institucional.', creado_por: null },
  ];

  const seguimientos: Seguimiento[] = [
    { id: id('seg'), docente_id: doc('Laura'), grupo_id: gru('6°1'), fecha: enDias(-14), tipo: 'visita_aula', criterios: CRITERIOS_DEFECTO.map((c, i) => ({ criterio: c, valor: [4, 4, 3, 3, 4, 3][i] })), fortalezas: 'Clase bien estructurada, buen uso del material concreto.', oportunidades: 'Ampliar la evaluación formativa al cierre.', compromisos: 'Incluir ticket de salida en las próximas clases.', estado: 'socializado', observador: 'Coordinación Académica' },
    { id: id('seg'), docente_id: doc('Juan Camilo'), grupo_id: gru('10°1'), fecha: enDias(-5), tipo: 'planeacion', criterios: CRITERIOS_DEFECTO.map((c, i) => ({ criterio: c, valor: [3, 4, 3, 2, 3, 4][i] })), fortalezas: 'Planeación alineada con estándares.', oportunidades: 'Estrategias de manejo de grupo.', compromisos: 'Acordar normas de aula con el grupo.', estado: 'borrador', observador: 'Coordinación Académica' },
    { id: id('seg'), docente_id: doc('Sandra'), grupo_id: gru('6°2'), fecha: enDias(-30), tipo: 'visita_aula', criterios: CRITERIOS_DEFECTO.map((c, i) => ({ criterio: c, valor: [3, 4, 4, 4, 3, 3][i] })), fortalezas: 'Excelente clima de aula.', oportunidades: 'Integrar recursos digitales.', compromisos: 'Usar el laboratorio virtual una vez por semana.', estado: 'socializado', observador: 'Rectoría' },
  ];

  const eventos: Evento[] = [
    { id: id('eve'), titulo: 'Consejo académico', tipo: 'reunion', fecha_inicio: habil(2), fecha_fin: null, hora_inicio: '13:00', hora_fin: '15:00', lugar: 'Sala de profesores', responsable: 'Coordinación Académica', descripcion: 'Revisión de resultados del período.' },
    { id: id('eve'), titulo: 'Feria de la ciencia', tipo: 'academico', fecha_inicio: habil(9), fecha_fin: habil(10), hora_inicio: '07:00', hora_fin: '12:00', lugar: 'Coliseo', responsable: 'Área de Ciencias Naturales', descripcion: 'Exposición de proyectos de aula.' },
    { id: id('eve'), titulo: 'Entrega de informes a familias', tipo: 'institucional', fecha_inicio: habil(16), fecha_fin: null, hora_inicio: '07:00', hora_fin: '11:00', lugar: 'Aulas', responsable: 'Directores de grupo', descripcion: '' },
    { id: id('eve'), titulo: 'Jornada deportiva intercursos', tipo: 'deportivo', fecha_inicio: habil(-3), fecha_fin: null, hora_inicio: null, hora_fin: null, lugar: 'Cancha principal', responsable: 'Educación Física', descripcion: '' },
    { id: id('eve'), titulo: 'Día de la antioqueñidad', tipo: 'cultural', fecha_inicio: habil(23), fecha_fin: null, hora_inicio: '08:00', hora_fin: '12:00', lugar: 'Patio central', responsable: 'Área de Sociales', descripcion: 'Muestra cultural.' },
    { id: id('eve'), titulo: 'Festivo', tipo: 'festivo', fecha_inicio: habil(12), fecha_fin: null, hora_inicio: null, hora_fin: null, lugar: '', responsable: '', descripcion: '' },
    { id: id('eve'), titulo: 'Comité de convivencia', tipo: 'reunion', fecha_inicio: habil(0), fecha_fin: null, hora_inicio: '12:30', hora_fin: '13:30', lugar: 'Rectoría', responsable: 'Rectoría', descripcion: '' },
  ];

  const comunicados: Comunicado[] = [
    { id: id('com'), titulo: 'Cierre de notas del período', contenido: 'Les recordamos que el plazo para registrar las valoraciones del período vence el próximo viernes a las 6:00 p. m. Después de esa fecha la plataforma se bloqueará para la generación de informes.', prioridad: 'alta', audiencia: 'docentes', fijado: true, autor: 'Coordinación Académica', publicado_en: new Date(Date.now() - 86400000).toISOString() },
    { id: id('com'), titulo: 'Simulacro de evacuación', contenido: 'El miércoles a las 9:00 a. m. se realizará el simulacro institucional. Cada docente acompaña al grupo con el que se encuentre en ese momento hacia el punto de encuentro.', prioridad: 'normal', audiencia: 'todos', fijado: false, autor: 'Rectoría', publicado_en: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: id('com'), titulo: 'Actualización del manual de convivencia', contenido: 'Ya está disponible para comentarios la propuesta de ajuste al manual de convivencia. Pueden enviar sus aportes hasta fin de mes.', prioridad: 'baja', audiencia: 'todos', fijado: false, autor: 'Rectoría', publicado_en: new Date(Date.now() - 8 * 86400000).toISOString() },
  ];

  const tareas: Tarea[] = [
    { id: id('tar'), titulo: 'Consolidar horas de reemplazo del mes', descripcion: 'Enviar reporte a la Secretaría.', estado: 'pendiente', prioridad: 'alta', fecha_limite: enDias(3), responsable_id: null, creado_por: null },
    { id: id('tar'), titulo: 'Revisar planeaciones de grado sexto', descripcion: '', estado: 'en_progreso', prioridad: 'normal', fecha_limite: enDias(7), responsable_id: null, creado_por: null },
    { id: id('tar'), titulo: 'Publicar cronograma de la feria de la ciencia', descripcion: '', estado: 'pendiente', prioridad: 'normal', fecha_limite: enDias(5), responsable_id: null, creado_por: null },
    { id: id('tar'), titulo: 'Actualizar directorio de docentes', descripcion: '', estado: 'hecha', prioridad: 'baja', fecha_limite: enDias(-2), responsable_id: null, creado_por: null },
  ];

  const perfiles: Perfil[] = [];

  return {
    ajustes,
    sedes,
    areas,
    asignaturas,
    docentes,
    grados,
    grupos,
    asignaciones,
    horarios,
    novedades,
    seguimientos,
    eventos,
    comunicados,
    tareas,
    perfiles,
  };
}
