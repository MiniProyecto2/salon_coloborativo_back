import { createServer } from 'node:http';
import { Timestamp } from 'firebase-admin/firestore';
import { Server, type Socket } from 'socket.io';
import { allowedOrigins } from './config/cors.js';
import { auth } from './config/firebase.js';
import { HttpError } from './errors/HttpError.js';
import { consultarSala, rooms } from './repositories/roomRepository.js';
import { obtenerPerfil } from './repositories/userRepository.js';

type Ack<T> = (payload: T) => void;
type Cursor = { id: string; seconds: number; nanoseconds: number };
type Participante = { uid: string; nombre: string };
type Mensaje = Participante & { id: string; texto: string; fecha: string; cursor: Cursor };
type SalaSocket = {
  id: string;
  nombre: string;
  materia: string;
  descripcion: string;
  publica: boolean;
  createdAt: string;
  anfitrion: boolean;
};

const TAM_PAGINA = 30;
const MAX_TEXTO = 1000;
const ID_MENSAJE = /^[A-Za-z0-9_-]{8,64}$/;

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

const presencia = new Map<string, Map<string, { uid: string; nombre: string; sockets: Set<string> }>>();
const vigilantes = new Map<string, () => void>();

function canal(id: string) {
  return `room:${id}`;
}

function mensajesDe(id: string) {
  return rooms.doc(id).collection('messages');
}

function participantes(id: string): Participante[] {
  return [...(presencia.get(id)?.values() ?? [])].map(({ uid, nombre }) => ({ uid, nombre }));
}

function publicarParticipantes(id: string) {
  io.to(canal(id)).emit('room:participants', participantes(id));
}

function salaPara(room: FirebaseFirestore.DocumentData, uid: string): SalaSocket {
  return {
    id: room.id,
    nombre: room.nombre,
    materia: room.materia,
    descripcion: room.descripcion,
    publica: room.publica,
    createdAt: room.createdAt,
    anfitrion: room.ownerUid === uid,
  };
}

function aMensaje(doc: FirebaseFirestore.QueryDocumentSnapshot): Mensaje | null {
  const data = doc.data();
  const creado = data.createdAt;
  if (!(creado instanceof Timestamp) || typeof data.uid !== 'string' || typeof data.texto !== 'string') return null;
  const nombre = typeof data.nombre === 'string' && data.nombre.trim() ? data.nombre : 'Estudiante';
  const fecha = typeof data.fecha === 'string' ? data.fecha : creado.toDate().toISOString();
  return {
    id: doc.id,
    uid: data.uid,
    nombre,
    texto: data.texto,
    fecha,
    cursor: { id: doc.id, seconds: creado.seconds, nanoseconds: creado.nanoseconds },
  };
}

async function pagina(id: string, antes?: Cursor | null) {
  let consulta = mensajesDe(id).orderBy('createdAt', 'desc').limit(TAM_PAGINA + 1);

  if (antes && Number.isFinite(antes.seconds) && Number.isFinite(antes.nanoseconds)) {
    consulta = consulta.startAfter(new Timestamp(antes.seconds, antes.nanoseconds));
  }

  const snap = await consulta.get();
  const hayAnteriores = snap.size > TAM_PAGINA;
  const docs = hayAnteriores ? snap.docs.slice(0, TAM_PAGINA) : snap.docs;
  return {
    pagina: {
      mensajes: docs.map(aMensaje).filter((mensaje): mensaje is Mensaje => mensaje !== null).reverse(),
      hayAnteriores,
    },
  };
}

function vigilar(id: string) {
  if (vigilantes.has(id)) return;
  const dejar = rooms.doc(id).onSnapshot(async snap => {
    if (!snap.exists) {
      io.to(canal(id)).emit('room:closed');
      return;
    }
    const room = snap.data();
    if (!room) return;
    const sockets = await io.in(canal(id)).fetchSockets();
    for (const cliente of sockets) cliente.emit('room:updated', salaPara(room, cliente.data.uid));
  });
  vigilantes.set(id, dejar);
}

function dejarDeVigilarSiVacia(id: string) {
  if (presencia.get(id)?.size) return;
  presencia.delete(id);
  vigilantes.get(id)?.();
  vigilantes.delete(id);
}

async function salirDeSala(socket: Socket) {
  const id: unknown = socket.data.roomId;
  if (typeof id !== 'string') return;
  await socket.leave(canal(id));
  socket.data.roomId = undefined;
  const sala = presencia.get(id);
  const persona = sala?.get(socket.data.uid);
  persona?.sockets.delete(socket.id);
  if (persona && persona.sockets.size === 0) sala?.delete(socket.data.uid);
  if (sala && sala.size === 0) presencia.delete(id);
  publicarParticipantes(id);
  dejarDeVigilarSiVacia(id);
}

async function nombreDe(uid: string) {
  const perfil = await obtenerPerfil(uid);
  return perfil?.displayName?.trim() || perfil?.username?.trim() || 'Estudiante';
}

io.on('connection', socket => {
  const expiration = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.expiresAt - Date.now()));
  socket.once('disconnect', () => {
    clearTimeout(expiration);
    void salirDeSala(socket);
  });
  socket.emit('session:ready', { uid: socket.data.uid });

  socket.on('room:join', async (id: unknown, ack?: Ack<{ pagina?: { mensajes: Mensaje[]; hayAnteriores: boolean }; error?: string }>) => {
    const responder = typeof ack === 'function' ? ack : () => {};
    if (typeof id !== 'string' || !id.trim()) return responder({ error: 'Sala no encontrada' });
    try {
      const room = await consultarSala(id, socket.data.uid);
      const nombre = await nombreDe(socket.data.uid);
      if (socket.data.roomId && socket.data.roomId !== id) await salirDeSala(socket);

      socket.data.roomId = id;
      socket.data.nombre = nombre;
      await socket.join(canal(id));
      vigilar(id);

      const sala = presencia.get(id) ?? new Map();
      const actual = sala.get(socket.data.uid) ?? { uid: socket.data.uid, nombre, sockets: new Set<string>() };
      actual.nombre = nombre;
      actual.sockets.add(socket.id);
      sala.set(socket.data.uid, actual);
      presencia.set(id, sala);

      socket.emit('room:updated', salaPara(room, socket.data.uid));
      publicarParticipantes(id);
      try {
        responder(await pagina(id));
      } catch {
        responder({ pagina: { mensajes: [], hayAnteriores: false } });
      }
    } catch (error) {
      const texto = error instanceof HttpError ? error.message : 'No pudimos conectarte a la sala.';
      responder({ error: texto });
    }
  });

  socket.on('room:history', async (antes: unknown, ack?: Ack<{ pagina?: { mensajes: Mensaje[]; hayAnteriores: boolean } | null; error?: string }>) => {
    const responder = typeof ack === 'function' ? ack : () => {};
    const id = socket.data.roomId;
    if (typeof id !== 'string') return responder({ error: 'No estás en una sala' });
    try {
      const cursor = antes && typeof antes === 'object' ? antes as Cursor : null;
      responder(await pagina(id, cursor));
    } catch {
      responder({ pagina: null, error: 'No pudimos cargar el historial.' });
    }
  });

  socket.on('room:send', async (payload: unknown, ack?: Ack<{ mensaje?: Mensaje; error?: string }>) => {
    const responder = typeof ack === 'function' ? ack : () => {};
    const id = socket.data.roomId;
    if (typeof id !== 'string') return responder({ error: 'No estás en una sala' });
    const datos = payload && typeof payload === 'object' ? payload as { id?: unknown; texto?: unknown } : {};
    const texto = typeof datos.texto === 'string' ? datos.texto.trim() : '';
    if (!texto) return responder({ error: 'Escribe un mensaje.' });
    if (texto.length > MAX_TEXTO) return responder({ error: 'El mensaje es demasiado largo.' });
    const idMensaje = typeof datos.id === 'string' && ID_MENSAJE.test(datos.id) ? datos.id : undefined;
    try {
      await consultarSala(id, socket.data.uid);
      const nombre = typeof socket.data.nombre === 'string' ? socket.data.nombre : await nombreDe(socket.data.uid);
      const ref = idMensaje ? mensajesDe(id).doc(idMensaje) : mensajesDe(id).doc();
      const fecha = new Date().toISOString();
      const createdAt = Timestamp.now();
      await ref.set({ uid: socket.data.uid, nombre, texto, fecha, createdAt });
      const mensaje: Mensaje = {
        id: ref.id,
        uid: socket.data.uid,
        nombre,
        texto,
        fecha,
        cursor: { id: ref.id, seconds: createdAt.seconds, nanoseconds: createdAt.nanoseconds },
      };
      socket.to(canal(id)).emit('room:message', mensaje);
      responder({ mensaje });
    } catch (error) {
      const textoError = error instanceof HttpError ? error.message : 'No pudimos enviar el mensaje.';
      responder({ error: textoError });
    }
  });
});

const port = Number(process.env.REALTIME_PORT || process.env.PORT || 3001);
server.listen(port, '0.0.0.0', () => console.log(`Socket.IO escuchando en el puerto ${port}`));
