import * as sensorModel from "../models/sensorModel.js";
import supabase from "../services/supabaseClient.js";
import sensorService from "../services/sensorService.js";

export const postSensorReadings = async (req, res) => {
    try {
        const { feed, readings } = req.body;

        if (!feed || !readings)
            return res.status(400).json({ error: "feed and readings required" });

        const data = typeof readings === "string"
            ? JSON.parse(readings)
            : readings;

        const entries = Object.entries(data);
        let inserted = 0;

        // fetch all sensors once
        const { data: allSensors } = await supabase
            .from("sensors")
            .select("id, sensor_type, adafruit_key");

        const sensorMap = {};
        for (const s of allSensors) {
            if (!sensorMap[s.sensor_type]) sensorMap[s.sensor_type] = [];
            sensorMap[s.sensor_type].push(s);
        }

        for (const [key, val] of entries) {
            const sensors = sensorMap[key] || [];

            for (const s of sensors) {
                await sensorModel.insertSensorReading({
                    sensor_id: s.id,
                    value: Number(val)
                });
                inserted++;
            }
        }

        // evaluate automations based on new readings (non-blocking)
        try {
            // pass original data map so sensor types match conditions keys
            sensorService.processReadings({ feed, readings: data, db: supabase }).then(result => {
                if (result && result.processed) {
                    console.log(`[sensorController] processed ${result.processed} automation rules`);
                }
            }).catch(e => console.error("[sensorController] sensorService error:", e));
        } catch (e) {
            console.error("[sensorController] sensorService call failed:", e);
        }

        res.json({ ok: true, inserted });

    } catch (err) {
        res.status(500).json({ error: err.message || err });
    }
};

export const getSensorReadings = async (req, res) => {
    try {
        const sensor_id = Number(req.params.id);
        const range = req.query.range || "24h";
        const readings = await sensorModel.getSensorReadings({ sensor_id, range });
        res.json(readings);
    } catch (err) {
        res.status(500).json({ error: err.message || err });
    }
};

export default { postSensorReadings, getSensorReadings };
