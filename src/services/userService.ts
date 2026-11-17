import type { AuthUser } from '../types/express.js';
import { HttpError } from '../errors/HttpError.js';
import { validateProfileInput } from '../validators/user.validator.js';
import { auth } from '../config/firebase.js';
import {
  actualizarPerfil,
  borrarDatosDeCuenta,
  borrarMarcaDeCuenta,
  crearPerfil,
  obtenerPerfil,
  type UserProfile,
} from '../repositories/userRepository.js';

export const createProfile = async (user: AuthUser, body: unknown): Promise<UserProfile> => {
  const input = validateProfileInput(body, 'create');
  const now = new Date().toISOString();

  return crearPerfil({
    uid: user.uid,
    username: input.username!,
    displayName: input.displayName!,
    photoURL: input.photoURL ?? user.picture,
    bio: input.bio ?? '',
    provider: user.provider,
    createdAt: now,
    updatedAt: now,
  });
};

export const getProfile = async (uid: string): Promise<UserProfile> => {
  const profile = await obtenerPerfil(uid);
  if (!profile) throw new HttpError(404, 'Perfil no encontrado');
  return { ...profile, email: (await auth.getUser(uid)).email ?? null };
};

export const updateProfile = async (uid: string, body: unknown): Promise<UserProfile> => {
  const input = validateProfileInput(body, 'update');
  const user = await auth.getUser(uid);
  return { ...await actualizarPerfil(uid, input), email: user.email ?? null };
};

export const updateEmail = async (uid: string, authTime: number, body: unknown): Promise<UserProfile> => {
  const raw = (body as { email?: unknown } | null)?.email;
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Datos inválidos', [{ field: 'email', message: 'Ingresa un correo válido' }]);
  }
  const profile = await getProfile(uid);
  if (profile.email?.toLowerCase() === email) return profile;
  if (Date.now() / 1000 - authTime > 600) {
    throw new HttpError(403, 'Vuelve a iniciar sesión para cambiar el correo');
  }

  try {
    const updated = await auth.updateUser(uid, { email, emailVerified: false });
    return { ...profile, email: updated.email ?? null };
  } catch (error) {
    if ((error as { code?: string }).code === 'auth/email-already-exists') {
      throw new HttpError(409, 'El correo ya está en uso', [{ field: 'email', message: 'El correo ya está en uso' }]);
    }
    if ((error as { code?: string }).code === 'auth/invalid-email') {
      throw new HttpError(400, 'Datos inválidos', [{ field: 'email', message: 'Ingresa un correo válido' }]);
    }
    throw error;
  }
};

export const deleteAccount = async (uid: string) => {
  // Mantiene el alta bloqueada mientras se eliminan las salas y Firebase Auth.
  if (!await borrarDatosDeCuenta(uid)) return;
  try {
    await auth.deleteUser(uid);
  } catch (error) {
    if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
  }
  await borrarMarcaDeCuenta(uid);
};
