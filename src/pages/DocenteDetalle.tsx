import { useParams } from 'react-router-dom';
import { FichaDocente } from '@/components/docente/FichaDocente';

/** Ficha del docente para directivos (/docentes/:id). */
export default function DocenteDetalle() {
  const { id } = useParams();
  return <FichaDocente id={id} />;
}
