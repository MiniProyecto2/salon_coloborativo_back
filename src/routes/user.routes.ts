import { Router, type Request } from "express";
import mensajeRoutes from "./mensajeRoutes.js";

const router = Router();

router.use("/", mensajeRoutes);

export default router;