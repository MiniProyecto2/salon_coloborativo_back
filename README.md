# Backend API - Salón de Estudio Colaborativo

Servidor backend de la aplicación web **Salón de Estudio Colaborativo en Tiempo Real** (Equipo 5 - Universidad del Valle). Expone una API REST autenticada con Firebase y guarda los datos en Firestore.

## Integrantes (Equipo 5)
* **Sergio Andrés Rodríguez Trujillo** – 202372227
* **Mosorongo Duarte Nicolas Felipe** – 202610121
* **Satizabal Ortiz Yiseiri Yanua** – 202455301

## Stack
Node.js 22 + TypeScript · Express 5 · Firebase Authentication (correo y Google) · Firestore · Swagger UI · Docker · Render

## Estructura
```
src/
├── config/firebase.ts          # Admin SDK (db y auth)
├── middlewares/                # auth.middleware (401 «no autorizado») y manejo de errores
├── validators/user.validator.ts# Validación de datos de entrada
├── routes/                     # user.routes, mensajeRoutes, index (/health)
├── services/                   # Lógica de negocio
├── repositories/               # Acceso a Firestore
├── swagger.ts                  # Genera swagger-output.json
└── app.ts / index.ts
```

## Autenticación
1. El frontend inicia sesión con Firebase Authentication (correo/contraseña o Google).
2. El frontend envía el ID token: `Authorization: Bearer <token>`.
3. La API verifica el token en **cada petición privada**; sin sesión válida responde `401 {"error":"no autorizado"}`.

## Endpoints (prefijo `/api/v1`)
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/health` | Público | Estado del servicio |
| POST | `/users/me` | Privado | Crea el perfil (`username` y `displayName` obligatorios) |
| GET | `/users/me` | Privado | Devuelve el perfil |
| PATCH | `/users/me` | Privado | Actualiza `username`, `displayName`, `photoURL`, `bio` |
| GET | `/1/:id` | Privado | Consulta de prueba a Firestore |

Errores: `400` datos inválidos (con `details` por campo), `401` no autorizado, `404` no encontrado, `409` nombre de usuario en uso.
El nombre de usuario es único y se valida en el servidor (colección `usernames`, dentro de una transacción de Firestore).

## Configuración local
1. Node.js 20+ y Docker instalados.
2. `cp .env.example .env` y completa las credenciales del Admin SDK de Firebase.
3. Sin Docker: `npm install` y `npm run dev`.
4. Con Docker: `docker compose up --build` (API en http://localhost:3000, Swagger en http://localhost:3000/api-docs).

> Todo el sistema (frontend + backend): usa el `docker-compose.yml` de la raíz del repositorio → `docker compose up --build`.

## Swagger
Cada vez que agregues o cambies un endpoint, regenera la documentación y súbela al repositorio:
```
npm run swagger
```
Disponible en `/api-docs` (en Render: `https://<tu-servicio>.onrender.com/api-docs`). Usa **Authorize** y pega el ID token para probar rutas privadas.

## Firestore: reglas de seguridad
`firestore.rules` bloquea todo acceso desde clientes; solo el backend (Admin SDK) lee y escribe. Publícalas en Firebase Console → Firestore → Reglas.

## Despliegue
**Backend en Render** (Web Service, Runtime *Docker*, raíz = carpeta de este servicio, Health Check Path `/api/v1/health`). Variables de entorno: `CORS_ORIGIN` (URL de Vercel), `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`. No definas `PORT`: Render lo asigna.

**Frontend en Vercel**: variable `VITE_API_URL=https://<tu-servicio>.onrender.com/api/v1` y las `VITE_FIREBASE_*` del proyecto web.

## Seguridad de credenciales
Las claves viven solo en variables de entorno. `.env` está en `.gitignore` y `.dockerignore`; el repositorio solo contiene `.env.example`.
