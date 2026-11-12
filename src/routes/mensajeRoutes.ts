import { Router, type Request } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { getMensaje } from "../services/mensajeService.js";

const router = Router();

router.get("/1/:id", requireAuth, async (req: Request<{ id: string }>, res) => {
    // #swagger.tags = ['Mensajes']
    // #swagger.summary = 'Consulta un documento de Firestore (ruta de prueba, privada)'
    // #swagger.security = [{ "bearerAuth": [] }]
    /* #swagger.responses[401] = { description: 'Sin sesión válida (no autorizado)', schema: { $ref: '#/definitions/Error' } } */
    try {
        const data = await getMensaje(req.params.id);
        res.json(data);
    } catch (error: any) {
        if (error.message === "No se encuentran datos") {
            res.status(404).json({error: "El dato no existe en firestore"});
            return;
        }
        res.status(500).json({error: "No se pudo consultar firestore, por favor vuelva a intentar mas tarde"});
    }
});

export default router;