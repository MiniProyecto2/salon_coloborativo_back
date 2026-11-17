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
| PATCH | `/users/me/email` | Privado | Actualiza el correo de Firebase Auth. Requiere inicio de sesión en los últimos 10 minutos |
| DELETE | `/users/me` | Privado | Elimina el perfil, las salas propias y la cuenta de Firebase Auth. Libera el nombre de usuario |
| GET | `/rooms` | Privado | Lista las salas creadas por el usuario autenticado |
| POST | `/rooms` | Privado | Crea una sala con ID generado en Firestore |
| PATCH | `/rooms/:id` | Privado | Renombra una sala propia con `{ "nombre": "..." }` |
| DELETE | `/rooms/:id` | Privado | Elimina una sala propia |
| GET | `/1/:id` | Privado | Consulta de prueba a Firestore |

Firestore reserva el nombre de usuario sin distinguir mayúsculas. Firebase Auth es la fuente del correo y comprueba su unicidad. Ambas colisiones devuelven `409` con el campo en `details`. Para salas ajenas se devuelve el mismo `404` que para un ID inexistente.

El borrado de cuenta quita los datos del perfil y libera su nombre, elimina las salas por lotes y termina eliminando la cuenta de Auth. Una marca temporal bloquea altas de perfil y salas durante el proceso. Si el borrado falla antes de eliminar Auth, se puede reintentar con la misma cuenta. La colección de mensajes de diagnóstico es compartida y queda fuera del borrado porque no contiene registros por usuario.

## Configuración local
Clona los dos repositorios como carpetas hermanas con sus nombres originales. Copia cada `.env.example` a `.env` y completa las variables. Incluye `http://localhost:5173` en `CORS_ORIGIN` de la API.

Desde el repositorio del backend, levanta los tres contenedores con:

```sh
docker compose --env-file ../salon_colaboratico_front/.env up --build
```

Los puertos locales son 5173 para el frontend, 3000 para la API y 3001 para Socket.IO. El frontend usa Firebase Auth desde el navegador y consulta los datos por HTTP a la API.

### Prueba con emuladores

Firebase CLI actual requiere Java 21 o superior. Con Java 17 puedes ejecutar la misma prueba usando `firebase-tools@14.12.1`.

```sh
npm ci
npx firebase-tools emulators:exec --config test/firebase.json --project demo-sprint2 --only auth,firestore "npm test"
```

### Socket.IO

El servicio usa la ruta estándar `/socket.io/`. Envía el ID token de Firebase en `auth.token`; el servidor responde con `session:ready` y el `uid`. Rechaza tokens ausentes, inválidos o revocados y cierra la conexión cuando expira el token. Para reconectar, el cliente debe enviar un token vigente.

```js
const socket = io(urlTiempoReal, {
  auth: { token: await auth.currentUser.getIdToken() },
});
socket.on("session:ready", ({ uid }) => console.log(uid));
```

`GET /health` comprueba la disponibilidad de este servicio sin iniciar sesión.

## Swagger
Cada vez que agregues o cambies un endpoint, regenera la documentación y súbela al repositorio:
```
npm run swagger
```
Disponible en `/api-docs` (en Render: `https://<tu-servicio>.onrender.com/api-docs`). Usa **Authorize** y pega el ID token para probar rutas privadas.

## Firestore

La API usa el Admin SDK. Las colecciones `users`, `usernames` y `rooms` deben impedir el acceso directo desde clientes en las reglas del proyecto de Firebase.

## Despliegue
**API en Render.** Conserva el Web Service de la API con `Dockerfile` y el health check `/api/v1/health`.

**Socket.IO en Render.** Crea un Web Service Docker con `Dockerfile.realtime` y el health check `/health`. El archivo `render.yaml` describe este servicio. Ambos servicios usan el mismo proyecto de Firebase y requieren `CORS_ORIGIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`. Render asigna `PORT`.

**Frontend en Vercel.** Configura `VITE_API_URL` con la URL de la API de Render y las variables `VITE_FIREBASE_*` del proyecto web.

## Seguridad de credenciales
Las claves viven solo en variables de entorno. `.env` está en `.gitignore` y `.dockerignore`; el repositorio solo contiene `.env.example`.
