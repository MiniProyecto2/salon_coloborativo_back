import dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

dotenv.config({ quiet: true });

// Falla rápido y con un mensaje claro si falta alguna credencial (nunca van en el repo).
const required = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'] as const;
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Faltan variables de entorno: ${missing.join(', ')}. Revisa tu .env o las variables del servicio en Render.`);
  process.exit(1);
}

const privateKey = process.env.FIREBASE_PRIVATE_KEY!
  .replace(/^"|"$/g, '')
  .replace(/\\n/g, '\n');

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey,
  }),
});

export const db = getFirestore(app);
export const auth = getAuth(app);