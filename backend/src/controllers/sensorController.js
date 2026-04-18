import * as sensorModel from "../models/sensorModel.js";
import supabase from "../services/supabaseClient.js";
import sensorService from "../services/sensorService.js";

export const postSensorReadings = async (req, res) => {
    try {
        const { feed, readings } = req.body;
        if (!feed || !readings)
            return res.status(400).json({ error: "feed and readings required" });

        // fetch all sensors once (used for mapping CSV values to sensor types)
        const { data: allSensors } = await supabase
            .from("sensors")
            .select("id, sensor_type, adafruit_key");

        let data = null;

        if (typeof readings === "string") {
            const s = readings.trim();
            // JSON format parse
            if (s.startsWith("{") || s.startsWith("[")) {
                try {
                    data = JSON.parse(s);
                } catch (e) {
                    console.warn("[sensorController] JSON.parse failed for readings string, falling back to CSV parse", e.message || e);
                }
                // STRING format parse
            } else if (s.includes(",")) {
                const parts = s.split(",").map(p => p.trim()).filter(p => p !== "");
                const allNumeric = parts.length > 0 && parts.every(p => !Number.isNaN(Number(p)));

                if (allNumeric) {
                    // attempt to map CSV parts to sensors for this feed using adafruit_key or sensor_type hints
                    const feedBase = (feed || "").split("-")[0];
                    const sensorsForFeed = (allSensors || []).filter(s => s.adafruit_key && s.adafruit_key.startsWith(feedBase));

                    const readingsObj = {};

                    if (sensorsForFeed.length === parts.length) {
                        // map by order of adafruit_key (stable but not guaranteed)
                        for (let i = 0; i < parts.length; i++) {
                            const sensor = sensorsForFeed[i];
                            readingsObj[sensor.sensor_type] = Number(parts[i]);
                        }
                    } else {
                        // try to match by keyword: temp/hum/light
                        const used = new Set();

                        for (let i = 0; i < parts.length; i++) {
                            const val = Number(parts[i]);
                            let matched = false;
                            for (const sensor of (allSensors || [])) {
                                if (used.has(sensor.id)) continue;
                                const key = ((sensor.adafruit_key || "") + (sensor.sensor_type || "")).toLowerCase();
                                if (key.includes("temp") && !readingsObj["temperature"]) {
                                    readingsObj[sensor.sensor_type] = val; used.add(sensor.id); matched = true; break;
                                }
                                if (key.includes("hum") && !readingsObj["humidity"]) {
                                    readingsObj[sensor.sensor_type] = val; used.add(sensor.id); matched = true; break;
                                }
                                if ((key.includes("light") || key.includes("lux")) && !readingsObj["light"]) {
                                    readingsObj[sensor.sensor_type] = val; used.add(sensor.id); matched = true; break;
                                }
                            }

                            if (!matched) {
                                // fallback assign by positional defaults
                                const defaults = ["temperature", "humidity", "light"];
                                const defKey = defaults[i] || `sensor_${i}`;
                                readingsObj[defKey] = val;
                            }
                        }
                    }

                    data = readingsObj;
                }
            }
        } else {
            data = readings;
        }

        const entries = Object.entries(data);
        let inserted = 0;
        const sensorMap = {};
        for (const s of (allSensors || [])) {
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

        // process data based on automation rule: call sensorService
        try {
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
