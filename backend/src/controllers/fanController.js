import * as fanModel from "../models/fanModel.js";
import iotService from "../services/iotService.js";

// DÀNH CHO TRANG FAN DETAILS
export const getFan = async (req, res) => {
    try {
        const user_id = req.user.id;
        const device_id = Number(req.params.id);
        const attrs = await fanModel.getFanAttributes({ device_id, user_id, db: req.supabase });
        res.json(attrs);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || err });
    }
};

export const powerFan = async (req, res) => {
    try {
        const user_id = req.user.id;
        const device_id = Number(req.params.id);
        const { status } = req.body;
        if (![1, 0].includes(status)) return res.status(400).json({ error: "status must be 1 or 0" });
        const updated = await fanModel.setFanPower({ device_id, user_id, status, db: req.supabase });
        try { await iotService.publishCommandForDevice({ device_id, db: req.supabase, action: "power", value: status }); } catch (e) { console.error("IoT publish failed:", e.message || e); }
        res.json(updated);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || err });
    }
};

export const changeMode = async (req, res) => {
    try {
        const user_id = req.user.id;
        const device_id = Number(req.params.id);
        const { mode } = req.body;
        if (!mode || typeof mode !== "string") return res.status(400).json({ error: "mode is required" });
        const updated = await fanModel.setFanMode({ device_id, user_id, mode, db: req.supabase });
        try { await iotService.publishCommandForDevice({ device_id, db: req.supabase, action: "mode", value: mode }); } catch (e) { console.error("IoT publish failed:", e.message || e); }
        res.json(updated);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || err });
    }
};

export const changeSpeed = async (req, res) => {
    try {
        const user_id = req.user.id;
        const device_id = Number(req.params.id);
        const { speed_level } = req.body;
        const updated = await fanModel.setFanSpeed({ device_id, user_id, speed_level, db: req.supabase });
        try { await iotService.publishCommandForDevice({ device_id, db: req.supabase, action: "speed", value: speed_level }); } catch (e) { console.error("IoT publish failed:", e.message || e); }
        res.json(updated);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || err });
    }
};

export default {
    getFan,
    powerFan,
    changeMode,
    changeSpeed
};
