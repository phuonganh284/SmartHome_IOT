import * as lightModel from "../models/lightModel.js";
import iotService from "../services/iotService.js";

// DÀNH CHO TRANG LIGHT DETAILS
export const getLight = async (req, res) => {
    try {
        const user_id = req.user.id;
        const device_id = Number(req.params.id);
        const attrs = await lightModel.getLightAttributes({ device_id, user_id, db: req.supabase });
        res.json(attrs);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || err });
    }
};

export const powerLight = async (req, res) => {
    try {
        const user_id = req.user.id;
        const device_id = Number(req.params.id);
        const { status } = req.body;
        if (![1, 0].includes(status)) return res.status(400).json({ error: "status must be 1 or 0" });
        const updated = await lightModel.setLightPower({ device_id, user_id, status, db: req.supabase });
        // trigger IoT (power feed)
        try { await iotService.publishCommandForDevice({ device_id, db: req.supabase, action: "power", value: status }); } catch (e) { console.error("IoT publish failed:", e.message || e); }
        res.json(updated);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || err });
    }
};

export const changeColor = async (req, res) => {
    try {
        const user_id = req.user.id;
        const device_id = Number(req.params.id);
        const { color } = req.body;
        if (!color || typeof color !== "string") return res.status(400).json({ error: "color is required" });
        // basic hex validation
        if (!/^#?[0-9A-Fa-f]{6}$/.test(color)) return res.status(400).json({ error: "color must be a 6-digit hex" });
        const normalized = color.startsWith("#") ? color : `#${color}`;
        const updated = await lightModel.setLightColor({ device_id, user_id, color: normalized, db: req.supabase });
        try { await iotService.publishCommandForDevice({ device_id, db: req.supabase, action: "color", value: normalized }); } catch (e) { console.error("IoT publish failed:", e.message || e); }
        res.json(updated);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || err });
    }
};

export const changeIntensity = async (req, res) => {
    try {
        const user_id = req.user.id;
        const device_id = Number(req.params.id);
        const { intensity } = req.body;
        const updated = await lightModel.setLightIntensity({ device_id, user_id, intensity, db: req.supabase });
        try { await iotService.publishCommandForDevice({ device_id, db: req.supabase, action: "intensity", value: intensity }); } catch (e) { console.error("IoT publish failed:", e.message || e); }
        res.json(updated);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || err });
    }
};

export default {
    getLight,
    powerLight,
    changeColor,
    changeIntensity
};
