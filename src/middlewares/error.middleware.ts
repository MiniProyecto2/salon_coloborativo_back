import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../errors/HttpError.js';

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // JSON mal formado o cuerpo demasiado grande (los lanza express.json)
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'El cuerpo de la petición es demasiado grande' });
    return;
  }

  console.error('Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
};