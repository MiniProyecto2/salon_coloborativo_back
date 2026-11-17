import { auth, db } from '../config/firebase.js';
import { HttpError } from '../errors/HttpError.js';
import { rooms } from './roomRepository.js';

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
type StoredProfile = Omit<UserProfile, 'email'>;

function profileData(doc: FirebaseFirestore.DocumentSnapshot): StoredProfile {
  const { email: _legacyEmail, ...profile } = doc.data() as UserProfile;
  return profile;
}

const usernameTaken = () =>
  new HttpError(409, 'El nombre de usuario ya está en uso', [
    { field: 'username', message: 'El nombre de usuario ya está en uso' },
  ]);

export const obtenerPerfil = async (uid: string): Promise<StoredProfile | null> => {
  const doc = await users().doc(uid).get();
  return doc.exists && !doc.get('deleting') ? profileData(doc) : null;
};

export const crearPerfil = async (profile: StoredProfile): Promise<UserProfile> => {
  const userRef = users().doc(profile.uid);
  const nameRef = usernames().doc(profile.username.toLowerCase());

  return db.runTransaction(async (tx) => {
    const [userSnap, nameSnap] = await Promise.all([tx.get(userRef), tx.get(nameRef)]);
    if (userSnap.exists) throw new HttpError(409, 'El perfil de este usuario ya existe');
    if (nameSnap.exists) throw usernameTaken();
    const user = await auth.getUser(profile.uid);

    tx.set(nameRef, { uid: profile.uid });
    tx.set(userRef, profile);
    return { ...profile, email: user.email ?? null };
  });
};

export const actualizarPerfil = async (
  uid: string,
  changes: Partial<Pick<UserProfile, 'username' | 'displayName' | 'photoURL' | 'bio'>>,
): Promise<StoredProfile> => {
  const userRef = users().doc(uid);

  return db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists || userSnap.get('deleting')) throw new HttpError(404, 'Perfil no encontrado');
    const current = profileData(userSnap);

    const newLower = changes.username?.toLowerCase();
    const oldLower = current.username.toLowerCase();

    if (newLower !== undefined && newLower !== oldLower) {
      const newNameRef = usernames().doc(newLower);
      const oldNameRef = usernames().doc(oldLower);
      const [nameSnap, oldNameSnap] = await Promise.all([tx.get(newNameRef), tx.get(oldNameRef)]);
      if (nameSnap.exists) throw usernameTaken();
      if (oldNameSnap.get('uid') === uid) tx.delete(oldNameRef);
      tx.set(newNameRef, { uid });
    }

    const updated: StoredProfile = { ...current, ...changes, updatedAt: new Date().toISOString() };
    tx.set(userRef, updated);
    return updated;
  });
};

export const borrarDatosDeCuenta = async (uid: string) => {
  const userRef = users().doc(uid);
  const marked = await db.runTransaction(async tx => {
    const profile = await tx.get(userRef);
    if (!profile.exists) {
      try {
        await auth.getUser(uid);
      } catch (error) {
        if ((error as { code?: string }).code === 'auth/user-not-found') return false;
        throw error;
      }
    }
    const username = profile.get('username');
    if (typeof username === 'string') {
      const nameRef = usernames().doc(username.toLowerCase());
      const reservation = await tx.get(nameRef);
      if (reservation.get('uid') === uid) tx.delete(nameRef);
    }
    tx.set(userRef, { deleting: true });
    return true;
  });
  if (!marked) return false;

  const owned = rooms.where('ownerUid', '==', uid).limit(400);
  for (;;) {
    const snapshot = await owned.get();
    if (snapshot.empty) break;
    const batch = db.batch();
    for (const room of snapshot.docs) batch.delete(room.ref);
    await batch.commit();
  }
  return true;
};

export const borrarMarcaDeCuenta = (uid: string) => users().doc(uid).delete();
