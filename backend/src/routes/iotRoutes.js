import express from "express";
import { handleFeed } from "../controllers/iotController.js";
import { postSensorReadings, getSensorReadings } from "../controllers/sensorController.js";

const router = express.Router();

// Public webhook for feed events from gateway
router.post("/feeds", handleFeed);

// POST aggregated sensor readings (gateway -> backend)
router.post("/sensor_readings", postSensorReadings);

// GET historical sensor readings for frontend reports
router.get("/sensor_readings/:id", getSensorReadings);

export default router;
