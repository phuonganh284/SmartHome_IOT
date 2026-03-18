import express from "express";
import { getProfile } from "../controllers/profileController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/profile", authenticateUser, getProfile); //GET

export default router;