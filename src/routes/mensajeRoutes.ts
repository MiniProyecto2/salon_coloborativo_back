import { Router, type Request } from "express";
import { getMensaje } from "../services/mensajeService.js";

const router = Router();

router.get("/1/:id", async (req: Request <{ id: string }>, res) => {
    try {
        const data = await getMensaje(req.params.id);
        res.json(data);
    } catch (error: any) {
        if (error.message === "No se encuentran datos") {
            return res.status(404).json({error: "El dato no existe en firestore"});
        }
        res.status(500).json({error: "No se pudo consultar firestore, por favor vuelva a intentar mas tarde"});
    }
});

export default router;