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


router.get("/devices/types", getDeviceTypes);
router.post("/devices", authenticateUser, addDevice); // add device
router.get("/devices", authenticateUser, getUserDevices); // get all devices of user
router.patch("/devices/:id/power", authenticateUser, setDeviceStatus); // turn on/off
router.delete("/devices/:id", authenticateUser, removeDevice);

export default router;