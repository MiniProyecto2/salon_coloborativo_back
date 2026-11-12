import type { AuthUser } from '../types/express.js';
import { HttpError } from '../errors/HttpError.js';
import { validateProfileInput } from '../validators/user.validator.js';
import {
  actualizarPerfil,
  crearPerfil,
  obtenerPerfil,
  type UserProfile,
} from '../repositories/userRepository.js';

export const createProfile = async (user: AuthUser, body: unknown): Promise<UserProfile> => {
  const input = validateProfileInput(body, 'create');
  const now = new Date().toISOString();

  return crearPerfil({
    uid: user.uid,
    email: user.email,
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
  return profile;
};

export const updateProfile = async (uid: string, body: unknown): Promise<UserProfile> => {
  const input = validateProfileInput(body, 'update');
  return actualizarPerfil(uid, input);
};