import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { auth } from './config/firebase.js';
import { allowedOrigins } from './config/cors.js';

const server = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ status: 'ok' }));
    return;
  }
  res.writeHead(404).end();
});

const io = new Server(server, {
  cors: { origin: allowedOrigins },
  allowRequest: (req, callback) => callback(null, !req.headers.origin || allowedOrigins.includes(req.headers.origin)),
});

io.use(async (socket, next) => {
  const token: unknown = socket.handshake.auth.token;
  if (typeof token !== 'string' || !token.trim()) return next(new Error('no autorizado'));
  try {
    const session = await auth.verifyIdToken(token, true);
    socket.data.uid = session.uid;
    socket.data.expiresAt = session.exp * 1000;
    next();
  } catch {
    next(new Error('no autorizado'));
  }
});

io.on('connection', socket => {
  const expiration = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.expiresAt - Date.now()));
  socket.once('disconnect', () => clearTimeout(expiration));
  socket.emit('session:ready', { uid: socket.data.uid });
});

const port = Number(process.env.PORT || 3001);
server.listen(port, '0.0.0.0', () => console.log(`Socket.IO escuchando en el puerto ${port}`));
