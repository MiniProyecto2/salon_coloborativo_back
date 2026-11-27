import { Router } from 'express';
import { HttpError } from '../errors/HttpError.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { crearSala, listarSalas, modificarSala, consultarSala } from '../repositories/roomRepository.js';

const router = Router();
router.use(requireAuth);

function texto(value: unknown, field: string, max: number, optional = false): string {
  if (optional && value === undefined) return '';
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (typeof value !== 'string' || normalized.length > max || (!optional && !normalized)) {
    throw new HttpError(400, 'Datos inválidos', [{ field, message: `Longitud permitida: ${optional ? 0 : 1} a ${max} caracteres` }]);
  }
  return normalized;
}

router.get('/', async (req, res) => {
  // #swagger.tags = ['Salas']
  // #swagger.summary = 'Lista únicamente las salas propias'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.responses[200] = { description: 'Salas propias', schema: [{ $ref: '#/definitions/Sala' }] } */
  /* #swagger.responses[401] = { description: 'Sin sesión válida' } */
  res.json(await listarSalas(req.user!.uid));
});

router.get('/:id', async (req, res) => {
  // #swagger.tags = ['Salas']
  // #swagger.summary = 'Consulta una sala por su ID (para unirse)'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.responses[200] = { description: 'Sala encontrada', schema: { $ref: '#/definitions/Sala' } } */
  /* #swagger.responses[401] = { description: 'Sin sesión válida' } */
  /* #swagger.responses[403] = { description: 'La sala es privada' } */
  /* #swagger.responses[404] = { description: 'La sala no existe' } */
  res.json(await consultarSala(req.params.id, req.user!.uid));
});

router.post('/', async (req, res) => {
  // #swagger.tags = ['Salas']
  // #swagger.summary = 'Crea una sala propia con ID único'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/CrearSala' } } */
  /* #swagger.responses[201] = { description: 'Sala creada', schema: { $ref: '#/definitions/Sala' } } */
  /* #swagger.responses[400] = { description: 'Datos inválidos' } */
  /* #swagger.responses[401] = { description: 'Sin sesión válida' } */
  /* #swagger.responses[404] = { description: 'Perfil no encontrado' } */
  const { nombre, materia, descripcion, publica } = req.body ?? {};
  if (typeof publica !== 'boolean') throw new HttpError(400, 'La visibilidad debe ser un booleano');
  res.status(201).json(await crearSala(req.user!.uid, {
    nombre: texto(nombre, 'nombre', 60),
    materia: texto(materia, 'materia', 80),
    descripcion: texto(descripcion, 'descripcion', 140, true),
    publica,
  }));
});

router.patch('/:id', async (req, res) => {
  // #swagger.tags = ['Salas']
  // #swagger.summary = 'Renombra una sala propia'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/RenombrarSala' } } */
  /* #swagger.responses[204] = { description: 'Sala renombrada' } */
  /* #swagger.responses[400] = { description: 'Datos inválidos' } */
  /* #swagger.responses[401] = { description: 'Sin sesión válida' } */
  /* #swagger.responses[404] = { description: 'La sala no existe o pertenece a otro usuario' } */
  await modificarSala(req.user!.uid, req.params.id, texto(req.body?.nombre, 'nombre', 60));
  res.sendStatus(204);
});

router.delete('/:id', async (req, res) => {
  // #swagger.tags = ['Salas']
  // #swagger.summary = 'Elimina una sala propia'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.responses[204] = { description: 'Sala eliminada' } */
  /* #swagger.responses[401] = { description: 'Sin sesión válida' } */
  /* #swagger.responses[404] = { description: 'La sala no existe o pertenece a otro usuario' } */
  await modificarSala(req.user!.uid, req.params.id);
  res.sendStatus(204);
});

export default router;
