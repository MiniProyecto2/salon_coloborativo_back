import express from "express";
import userRoutes from "./user.routes.js";
import mensajeRoutes from "./mensajeRoutes.js";
import diagnosticoRoutes from "./diagnostico.routes.js";

const router = express.Router();

// Pública: la usan Render y Docker para saber si el servicio está vivo.
router.get("/health", (_req, res) => {
  // #swagger.tags = ['Sistema']
  // #swagger.summary = 'Estado del servicio (pública)'
  res.json({ status: "ok" });
});

router.use(diagnosticoRoutes);
router.use("/users", userRoutes);
router.use("/", mensajeRoutes);

export default router;