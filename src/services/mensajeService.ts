import { obtenerMensaje } from "../repositories/mensajeRepository.js";

export const getMensaje = async (id:string) => {
    const data = await obtenerMensaje(id);
    if (!data) throw new Error("No se encuentran datos");
    return data;
};