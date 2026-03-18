import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./src/routes/authRoutes.js";
import profileRoutes from "./src/routes/profileRoutes.js";

import deviceRoutes from "./src/routes/deviceRoutes.js";
import lightRoutes from "./src/routes/lightRoutes.js";
import fanRoutes from "./src/routes/fanRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", profileRoutes);

app.use("/api", deviceRoutes);
app.use("/api", lightRoutes);
app.use("/api", fanRoutes);

app.get("/", (req, res) => {
    res.send("Smart Home IoT Backend Running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});