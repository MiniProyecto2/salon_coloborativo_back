import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { io } from 'socket.io-client';

const local = /^127\.0\.0\.1:\d+$/;
const project = process.env.GCLOUD_PROJECT;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? '';
assert.ok(project?.startsWith('demo-') && local.test(authHost) && local.test(firestoreHost),
  'Esta prueba requiere ambos emuladores locales y un proyecto demo-*');

const api = 'http://127.0.0.1:3400';
const realtime = 'http://127.0.0.1:3401';
const identities = `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts`;
const testKey = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
}).privateKey;

async function request(url, status, { method = 'GET', token, body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 204) {
    assert.equal(response.status, status);
    return;
  }
  const data = await response.json();
  assert.equal(response.status, status, `${method} ${url}: ${data.error?.message ?? data.error ?? response.status}`);
  return data;
}

const call = (path, status, options) => request(`${api}/api/v1${path}`, status, options);
const identity = (action, email) => request(`${identities}:${action}?key=emulator`, 200, {
  method: 'POST', body: { email, password: 'Sprint2-test-password', returnSecureToken: true },
});

function connect(token) {
  const socket = io(realtime, { auth: { token }, transports: ['websocket'], reconnection: false, timeout: 5000 });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(reject, new Error('Socket.IO no confirmó la sesión')), 6000);
    function finish(callback, value) {
      clearTimeout(timer);
      socket.disconnect();
      callback(value);
    }
    socket.once('session:ready', data => finish(resolve, data));
    socket.once('connect_error', error => finish(reject, error));
  });
}

test('TS-02: perfiles, propiedad de salas, borrado y Socket.IO', { timeout: 90_000 }, async t => {
  for (const [entry, port] of [['index', '3400'], ['realtime', '3401']]) {
    const child = spawn(process.execPath, [`dist/${entry}.js`], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: port,
        FIREBASE_PROJECT_ID: project,
        FIREBASE_CLIENT_EMAIL: `test@${project}.iam.gserviceaccount.com`,
        FIREBASE_PRIVATE_KEY: testKey,
      },
    });
    t.after(() => child.kill());
  }
  for (const url of [`${api}/api/v1/health`, `${realtime}/health`]) {
    let ready = false;
    for (let attempt = 0; attempt < 60 && !ready; attempt++) {
      ready = await fetch(url, { signal: AbortSignal.timeout(1000) }).then(res => res.ok, () => false);
      if (!ready) await delay(250);
    }
    assert.ok(ready, `Servicio no disponible: ${url}`);
  }

  const suffix = randomBytes(4).toString('hex');
  const emailA = `a-${suffix}@example.com`;
  const emailB = `b-${suffix}@example.com`;
  const newEmail = `nuevo-${suffix}@example.com`;
  const username = `sprint_${suffix}`;
  const a = await identity('signUp', emailA);
  const b = await identity('signUp', emailB);
  let tokenA = a.idToken;
  const tokenB = b.idToken;
  const profile = (token, name, status = 201) => call('/users/me', status, {
    method: 'POST', token, body: { username: name, displayName: 'Estudiante de prueba' },
  });

  await call('/rooms', 401);
  await profile(tokenA, username);
  await profile(tokenB, `b_${suffix}`);
  const duplicateName = await call('/users/me', 409, {
    method: 'PATCH', token: tokenB, body: { username: username.toUpperCase() },
  });
  assert.equal(duplicateName.details[0].field, 'username');
  const email = (token, value, status) => call('/users/me/email', status, {
    method: 'PATCH', token, body: { email: value },
  });
  assert.equal((await email(tokenA, emailB, 409)).details[0].field, 'email');
  assert.equal((await email(tokenA, newEmail, 200)).email, newEmail);
  tokenA = (await identity('signInWithPassword', newEmail)).idToken;
  assert.equal((await call('/users/me', 200, { token: tokenA })).email, newEmail);

  const body = { nombre: 'Sala TS-02', materia: 'Matemáticas', publica: false, ownerUid: b.localId };
  await call('/rooms', 400, { method: 'POST', token: tokenA, body: { ...body, nombre: ' ' } });
  const room = await call('/rooms', 201, { method: 'POST', token: tokenA, body });
  const other = await call('/rooms', 201, { method: 'POST', token: tokenA, body });
  assert.notEqual(room.id, other.id);
  assert.equal(room.ownerUid, a.localId);
  assert.deepEqual(await call('/rooms', 200, { token: tokenB }), []);
  const roomPath = `/rooms/${room.id}`;
  await call(roomPath, 404, { method: 'PATCH', token: tokenB, body: { nombre: 'Ajena' } });
  await call(roomPath, 404, { method: 'DELETE', token: tokenB });
  await call(roomPath, 204, { method: 'PATCH', token: tokenA, body: { nombre: 'Renombrada' } });
  const mine = await call('/rooms', 200, { token: tokenA });
  assert.equal(mine.find(item => item.id === room.id).nombre, 'Renombrada');
  await call(roomPath, 204, { method: 'DELETE', token: tokenA });

  await assert.rejects(connect(), /no autorizado/);
  await assert.rejects(connect('token-inválido'), /no autorizado/);
  assert.deepEqual(await connect(tokenA), { uid: a.localId });

  await call('/users/me', 204, { method: 'DELETE', token: tokenA });
  await call('/users/me', 401, { token: tokenA });
  await assert.rejects(connect(tokenA), /no autorizado/);
  await call('/users/me', 200, { method: 'PATCH', token: tokenB, body: { username } });
  const documents = `http://${firestoreHost}/v1/projects/${project}/databases/(default)/documents`;
  await request(`${documents}/users/${a.localId}`, 404);
  await request(`${documents}/rooms/${other.id}`, 404);
  await call('/users/me', 204, { method: 'DELETE', token: tokenB });
});
