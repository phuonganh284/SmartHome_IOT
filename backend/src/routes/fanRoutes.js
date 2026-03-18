import express from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { getFan, powerFan, changeMode, changeSpeed } from "../controllers/fanController.js";

const router = express.Router();

router.get("/fans/:id", authenticateUser, getFan);
router.patch("/fans/:id/power", authenticateUser, powerFan);
router.patch("/fans/:id/mode", authenticateUser, changeMode);
router.patch("/fans/:id/speed", authenticateUser, changeSpeed);

export default router;
