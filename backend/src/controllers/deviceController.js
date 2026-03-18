import * as deviceModel from "../models/deviceModel.js";
import iotService from "../services/iotService.js";

//DÀNH CHO TRANG HOMEPAGE
// 1) Get device types (display_name + image)
export const getDeviceTypes = async (req, res) => {
    try {
        const types = await deviceModel.getDeviceTypes(req.supabase || undefined);
        res.json(types);
    } catch (err) {
        res.status(500).json({ error: err.message || err });
    }
};

// 2) Insert a device (and a lights/fans row based on base_type)
export const addDevice = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { type, name, adafruit_key } = req.body;

        if (!type) return res.status(400).json({ error: "type is required" });

        const device = await deviceModel.createDevice({ db: req.supabase, user_id, type, name, adafruit_key });
        res.status(201).json(device);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || err });
    }
};

// 3) Get devices belonging to the user
export const getUserDevices = async (req, res) => {
    try {
        const user_id = req.user.id;
        const devices = await deviceModel.getDevicesByUser(user_id, req.supabase);
        res.json(devices);
    } catch (err) {
        res.status(500).json({ error: err.message || err });
    }
};

// 4) Change device status (turn on/off)
export const setDeviceStatus = async (req, res) => {
    try {
        const user_id = req.user.id;
        const device_id = Number(req.params.id);
        const { status } = req.body;

        if (![1, 0].includes(status)) return res.status(400).json({ error: "status must be 1 or 0" });

        const updated = await deviceModel.updateDeviceStatus({ device_id, user_id, status, db: req.supabase });
        // publish to Adafruit 
        try { await iotService.publishCommandForDevice({ device_id, db: req.supabase, action: "power", value: status }); } catch (e) { console.error("IoT publish failed:", e.message || e); }
        res.json(updated);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || err });
    }
};

// 5) Delete a device
export const removeDevice = async (req, res) => {
    try {
        const user_id = req.user.id;
        const device_id = Number(req.params.id);
        await deviceModel.deleteDevice({ device_id, user_id, db: req.supabase });
        res.json({ message: "Device deleted" });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || err });
    }
};

// 6) Set or update device adafruit_key
export const setAdafruitKey = async (req, res) => {
    try {
        const user_id = req.user.id;
        const device_id = Number(req.params.id);
        const { adafruit_key } = req.body;

        if (typeof adafruit_key !== "string") return res.status(400).json({ error: "adafruit_key must be a string" });

        const updated = await deviceModel.updateAdafruitKey({ device_id, user_id, adafruit_key, db: req.supabase });
        res.json(updated);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || err });
    }
};