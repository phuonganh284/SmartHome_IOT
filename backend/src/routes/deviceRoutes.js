import express from "express";
import {
    getDeviceTypes,
    addDevice,
    getUserDevices,
    setDeviceStatus,
    removeDevice
} from "../controllers/deviceController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public: list available device types (display_name + image)
router.get("/devices/types", getDeviceTypes);

// Protected routes - require auth
router.post("/devices", authenticateUser, addDevice);
router.get("/devices", authenticateUser, getUserDevices);
router.patch("/devices/:id/power", authenticateUser, setDeviceStatus); // turn on/off
router.delete("/devices/:id", authenticateUser, removeDevice);

export default router;