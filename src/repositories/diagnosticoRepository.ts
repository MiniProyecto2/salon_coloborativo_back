import { db } from '../config/firebase.js';

// Documento exclusivo de diagnóstico: diagnostico/sistema → { message: string }.
const TIMEOUT_MS = 5000;

export const obtenerDiagnostico = async (): Promise<{ message: string } | null> => {
  const lectura = db.collection('diagnostico').doc('sistema').get();

  let timer: NodeJS.Timeout | undefined;
  const limite = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore timeout')), TIMEOUT_MS);
  });

  try {
    const doc = await Promise.race([lectura, limite]);
    const message = doc.exists ? doc.data()?.message : undefined;
    return typeof message === 'string' ? { message } : null;
  } finally {
    clearTimeout(timer);
  }
};