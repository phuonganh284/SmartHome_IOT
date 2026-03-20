import express from "express";
import { handleFeed } from "../controllers/iotController.js";

const router = express.Router();

// Public webhook for feed events from gateway
router.post("/feeds", handleFeed);

export default router;
