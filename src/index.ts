import express from "express";
import cors from "cors";
import "dotenv/config";
import mensajeRoutes from "./routes/mensajeRoutes.js";

const app = express();
app.use(cors());

app.get('/', function (req, res) {
    res.send('api funcionando');
})

app.use("/api", mensajeRoutes)

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running at ${port}...`));