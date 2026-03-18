import express from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
    getLight,
    powerLight,
    changeColor,
    changeIntensity
} from "../controllers/lightController.js";

const router = express.Router();


router.get("/lights/:id", authenticateUser, getLight);
router.patch("/lights/:id/power", authenticateUser, powerLight);
router.patch("/lights/:id/color", authenticateUser, changeColor);
router.patch("/lights/:id/intensity", authenticateUser, changeIntensity);

export default router;
