import { obtenerDiagnostico } from '../repositories/diagnosticoRepository.js';
import { HttpError } from '../errors/HttpError.js';

export const getDiagnostico = async (): Promise<{ message: string }> => {
  let data: { message: string } | null;
  try {
    data = await obtenerDiagnostico();
  } catch (error) {
    console.error('Diagnóstico: fallo al consultar Firestore:', error instanceof Error ? error.message : 'desconocido');
    throw new HttpError(503, 'No se pudo consultar Firestore, intenta de nuevo más tarde');
  }
  if (!data) throw new HttpError(404, 'El documento de diagnóstico no existe en Firestore');
  return data;
};