import { db } from '../config/firebase.js';
import { HttpError } from '../errors/HttpError.js';

export const rooms = db.collection('rooms');

export const listarSalas = async (uid: string) => {
  const snapshot = await rooms.where('ownerUid', '==', uid).get();
  return snapshot.docs.map(doc => doc.data()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const crearSala = async (ownerUid: string, input: {
  nombre: string; materia: string; descripcion: string; publica: boolean;
}) => {
  const ref = rooms.doc();
  const room = { ...input, id: ref.id, ownerUid, createdAt: new Date().toISOString() };
  await db.runTransaction(async tx => {
    const profile = await tx.get(db.collection('users').doc(ownerUid));
    if (!profile.exists || profile.get('deleting')) throw new HttpError(404, 'Perfil no encontrado');
    tx.create(ref, room);
  });
  return room;
};

export const modificarSala = async (uid: string, id: string, nombre?: string) => {
  if (!/^[A-Za-z0-9]{20}$/.test(id)) throw new HttpError(404, 'Sala no encontrada');
  const ref = rooms.doc(id);
  await db.runTransaction(async tx => {
    const room = await tx.get(ref);
    if (room.get('ownerUid') !== uid) throw new HttpError(404, 'Sala no encontrada');
    if (nombre === undefined) tx.delete(ref);
    else tx.update(ref, { nombre });
  });
};
