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

router.post("/devices", authenticateUser, addDevice); // add device
router.get("/devices", authenticateUser, getUserDevices); // get all devices of user
router.patch("/devices/:id/power", authenticateUser, setDeviceStatus); // turn on/off
// router.patch("/devices/:id/adafruit-key", authenticateUser, setAdafruitKey);
router.delete("/devices/:id", authenticateUser, removeDevice);

export default router;