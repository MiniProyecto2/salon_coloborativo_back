import { db } from '../config/firebase.js';

export const obtenerMensaje = async(id:string) => {
    const doc = await db.collection("1").doc(id).get();
    return doc.exists ? doc.data() : null;
};