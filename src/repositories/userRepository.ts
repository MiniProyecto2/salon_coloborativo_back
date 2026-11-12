import { db } from '../config/firebase.js';
import { HttpError } from '../errors/HttpError.js';

export interface UserProfile {
  uid: string;
  email: string | null;
  username: string;
  displayName: string;
  photoURL: string | null;
  bio: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

const users = () => db.collection('users');
// Un documento por nombre de usuario (en minúsculas): garantiza unicidad dentro de una transacción.
const usernames = () => db.collection('usernames');

const usernameTaken = () =>
  new HttpError(409, 'El nombre de usuario ya está en uso', [
    { field: 'username', message: 'El nombre de usuario ya está en uso' },
  ]);

export const obtenerPerfil = async (uid: string): Promise<UserProfile | null> => {
  const doc = await users().doc(uid).get();
  return doc.exists ? (doc.data() as UserProfile) : null;
};

export const crearPerfil = async (profile: UserProfile): Promise<UserProfile> => {
  const userRef = users().doc(profile.uid);
  const nameRef = usernames().doc(profile.username.toLowerCase());

  await db.runTransaction(async (tx) => {
    const [userSnap, nameSnap] = await Promise.all([tx.get(userRef), tx.get(nameRef)]);
    if (userSnap.exists) throw new HttpError(409, 'El perfil de este usuario ya existe');
    if (nameSnap.exists) throw usernameTaken();

    tx.set(nameRef, { uid: profile.uid });
    tx.set(userRef, profile);
  });

  return profile;
};

export const actualizarPerfil = async (
  uid: string,
  changes: Partial<Pick<UserProfile, 'username' | 'displayName' | 'photoURL' | 'bio'>>,
): Promise<UserProfile> => {
  const userRef = users().doc(uid);

  return db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpError(404, 'Perfil no encontrado');
    const current = userSnap.data() as UserProfile;

    const newLower = changes.username?.toLowerCase();
    const oldLower = current.username.toLowerCase();

    if (newLower !== undefined && newLower !== oldLower) {
      const newNameRef = usernames().doc(newLower);
      const nameSnap = await tx.get(newNameRef);
      if (nameSnap.exists) throw usernameTaken();
      tx.delete(usernames().doc(oldLower));
      tx.set(newNameRef, { uid });
    }

    const updated: UserProfile = { ...current, ...changes, updatedAt: new Date().toISOString() };
    tx.set(userRef, updated);
    return updated;
  });
};