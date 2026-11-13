import { Router } from 'express';
import { getDiagnostico } from '../services/diagnosticoService.js';

const router = Router();

// Pública a propósito: solo entrega un dato técnico sin información personal.
router.get('/diagnostico', async (_req, res) => {
  // #swagger.tags = ['Sistema']
  // #swagger.summary = 'Prueba de extremo a extremo: lee diagnostico/sistema en Firestore (pública)'
  /* #swagger.responses[200] = { description: 'Firestore respondió', schema: { $ref: '#/definitions/Diagnostico' } } */
  /* #swagger.responses[404] = { description: 'El documento de diagnóstico no existe', schema: { $ref: '#/definitions/Error' } } */
  /* #swagger.responses[503] = { description: 'Firestore no disponible', schema: { $ref: '#/definitions/Error' } } */
  const data = await getDiagnostico();
  res.set('Cache-Control', 'no-store');
  res.json(data);
});

export default router;