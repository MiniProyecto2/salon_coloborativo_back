import { HttpError, type FieldError } from '../errors/HttpError.js';

export interface ProfileInput {
  username?: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

/**
 * Valida el cuerpo para crear (todos los obligatorios) o actualizar (parcial) un perfil.
 * Lanza HttpError 400 con la lista de campos inválidos.
 */
export function validateProfileInput(body: unknown, mode: 'create' | 'update'): ProfileInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError(400, 'El cuerpo debe ser un objeto JSON');
  }

  const raw = body as Record<string, unknown>;
  const errors: FieldError[] = [];
  const value: ProfileInput = {};

  // username
  if (raw.username === undefined) {
    if (mode === 'create') errors.push({ field: 'username', message: 'El nombre de usuario es obligatorio' });
  } else if (typeof raw.username !== 'string' || !USERNAME_RE.test(raw.username.trim())) {
    errors.push({ field: 'username', message: 'Debe tener entre 3 y 20 caracteres: letras, números o guion bajo' });
  } else {
    value.username = raw.username.trim();
  }

  // displayName
  if (raw.displayName === undefined) {
    if (mode === 'create') errors.push({ field: 'displayName', message: 'El nombre a mostrar es obligatorio' });
  } else if (typeof raw.displayName !== 'string' || raw.displayName.trim().length < 2 || raw.displayName.trim().length > 50) {
    errors.push({ field: 'displayName', message: 'Debe tener entre 2 y 50 caracteres' });
  } else {
    value.displayName = raw.displayName.trim();
  }

  // photoURL (opcional)
  if (raw.photoURL !== undefined) {
    if (typeof raw.photoURL !== 'string' || raw.photoURL.length > 500 || !isHttpUrl(raw.photoURL)) {
      errors.push({ field: 'photoURL', message: 'Debe ser una URL http(s) válida de máximo 500 caracteres' });
    } else {
      value.photoURL = raw.photoURL;
    }
  }

  // bio (opcional)
  if (raw.bio !== undefined) {
    if (typeof raw.bio !== 'string' || raw.bio.trim().length > 280) {
      errors.push({ field: 'bio', message: 'Debe ser texto de máximo 280 caracteres' });
    } else {
      value.bio = raw.bio.trim();
    }
  }

  if (mode === 'update' && errors.length === 0 && Object.keys(value).length === 0) {
    errors.push({ field: 'body', message: 'Envía al menos un campo: username, displayName, photoURL o bio' });
  }

  if (errors.length > 0) {
    throw new HttpError(400, 'Datos inválidos', errors);
  }
  return value;
}

function isHttpUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}