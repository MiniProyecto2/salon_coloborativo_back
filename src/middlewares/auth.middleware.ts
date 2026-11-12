import type { RequestHandler } from 'express';
import { auth } from '../config/firebase.js';

/**
 * Verifica el ID token de Firebase (correo o Google) enviado en
 * `Authorization: Bearer <token>`. Sin sesión válida responde 401 «no autorizado».
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'no autorizado' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: typeof decoded.name === 'string' ? decoded.name : null,
      picture: typeof decoded.picture === 'string' ? decoded.picture : null,
      provider: decoded.firebase.sign_in_provider,
    };
    next();
  } catch {
    res.status(401).json({ error: 'no autorizado' });
  }
};