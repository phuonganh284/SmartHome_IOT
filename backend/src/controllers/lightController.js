import * as lightModel from "../models/lightModel.js";

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
        if (!["on", "off"].includes(status)) return res.status(400).json({ error: "status must be 'on' or 'off'" });
        const updated = await lightModel.setLightPower({ device_id, user_id, status, db: req.supabase });
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
