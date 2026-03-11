import express from "express";
import { verifyUser } from "../middleware/authMiddleware.js";
import { getUserDevices } from "../controllers/deviceController.js";

const router = express.Router();

router.get("/devices", verifyUser, getUserDevices);

export default router;