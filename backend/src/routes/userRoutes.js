import express from "express";
import { getProfile } from "../controllers/authController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/profile", authenticateUser, getProfile); //get current logged in user

export default router;