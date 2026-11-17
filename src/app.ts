import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger-output.json' with { type: 'json' };
import { errorHandler, notFound } from './middlewares/error.middleware.js';
import { allowedOrigins } from './config/cors.js';

dotenv.config({ quiet: true });

const app = express();

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// Evita un 404 en la consola del navegador al abrir /api-docs.
app.get('/favicon.ico', (_req, res) => {
  res.status(204).end();
});

// Mount API routes under /api/v1 prefix
app.use('/api/v1', routes);

// Swagger sin host/schemes fijos: usa el dominio desde el que se abre (localhost o Render).
const { host: _host, schemes: _schemes, ...swaggerSpec } = swaggerDocument as Record<string, unknown>;
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(notFound);
app.use(errorHandler);

export default app;
