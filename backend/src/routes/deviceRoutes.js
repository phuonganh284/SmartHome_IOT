import express from "express";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/devices", verifyUser, (req, res) => {
    res.json({
        message: "Authorized access",
        user: req.user
    });
});

export default router;