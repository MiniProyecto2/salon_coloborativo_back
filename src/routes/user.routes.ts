import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { createProfile, getProfile, updateProfile } from '../services/userService.js';

const router = Router();

// Todas las rutas de usuarios son privadas: exigen sesión de Firebase (correo o Google).
router.use(requireAuth);

router.post('/me', async (req, res) => {
  // #swagger.tags = ['Usuarios']
  // #swagger.summary = 'Crea el perfil del usuario autenticado (primer inicio de sesión)'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = {
       in: 'body', required: true,
       schema: { $ref: '#/definitions/CrearPerfil' }
  } */
  /* #swagger.responses[201] = { description: 'Perfil creado', schema: { $ref: '#/definitions/Perfil' } } */
  /* #swagger.responses[400] = { description: 'Datos inválidos', schema: { $ref: '#/definitions/ErrorValidacion' } } */
  /* #swagger.responses[401] = { description: 'Sin sesión válida (no autorizado)', schema: { $ref: '#/definitions/Error' } } */
  /* #swagger.responses[409] = { description: 'Perfil existente o nombre de usuario en uso', schema: { $ref: '#/definitions/ErrorValidacion' } } */
  const profile = await createProfile(req.user!, req.body);
  res.status(201).json(profile);
});

router.get('/me', async (req, res) => {
  // #swagger.tags = ['Usuarios']
  // #swagger.summary = 'Devuelve el perfil del usuario autenticado'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.responses[200] = { description: 'Perfil del usuario', schema: { $ref: '#/definitions/Perfil' } } */
  /* #swagger.responses[401] = { description: 'Sin sesión válida (no autorizado)', schema: { $ref: '#/definitions/Error' } } */
  /* #swagger.responses[404] = { description: 'El usuario aún no tiene perfil', schema: { $ref: '#/definitions/Error' } } */
  const profile = await getProfile(req.user!.uid);
  res.json(profile);
});

router.patch('/me', async (req, res) => {
  // #swagger.tags = ['Usuarios']
  // #swagger.summary = 'Actualiza el perfil del usuario autenticado'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = {
       in: 'body', required: true,
       schema: { $ref: '#/definitions/ActualizarPerfil' }
  } */
  /* #swagger.responses[200] = { description: 'Perfil actualizado', schema: { $ref: '#/definitions/Perfil' } } */
  /* #swagger.responses[400] = { description: 'Datos inválidos', schema: { $ref: '#/definitions/ErrorValidacion' } } */
  /* #swagger.responses[401] = { description: 'Sin sesión válida (no autorizado)', schema: { $ref: '#/definitions/Error' } } */
  /* #swagger.responses[404] = { description: 'El usuario aún no tiene perfil', schema: { $ref: '#/definitions/Error' } } */
  /* #swagger.responses[409] = { description: 'Nombre de usuario en uso', schema: { $ref: '#/definitions/ErrorValidacion' } } */
  const profile = await updateProfile(req.user!.uid, req.body);
  res.json(profile);
});

export default router;