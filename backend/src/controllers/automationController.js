import * as automationModel from "../models/automationModel.js";
import supabase from "../services/supabaseClient.js";

// ensure devices belong to user and are same base_type
const validateDevicesSameType = async (user_id, device_ids, db = supabase) => {
    if (!device_ids || device_ids.length === 0) throw { status: 400, message: "devices required" };

    const { data: devices, error } = await db.from("devices").select("id, type").in("id", device_ids).eq("user_id", user_id);
    if (error) throw error;
    if (!devices || devices.length !== device_ids.length) throw { status: 400, message: "some devices not found or not owned" };

    // fetch base_types for the types
    const types = [...new Set(devices.map(d => d.type))];
    const { data: typeRows, error: tErr } = await db.from("device_types").select("type, base_type").in("type", types);
    if (tErr) throw tErr;
    const bases = [...new Set(typeRows.map(t => t.base_type))];
    if (bases.length !== 1) throw { status: 400, message: "selected devices must have the same base type" };
    return bases[0];
};

// get all rules of user
export const listRules = async (req, res) => {
    try {
        const user_id = req.user.id;
        const rules = await automationModel.getRulesByUser(user_id, req.supabase);
        res.json(rules);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || err });
    }
};

// create new rule
export const createRule = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { name, devices, conditions, actions, schedule } = req.body;

        // validate devices and ensure same base type
        const base = await validateDevicesSameType(user_id, devices, req.supabase);

        const rule = await automationModel.createRule({ user_id, name, devices, conditions, actions, schedule, db: req.supabase });
        res.status(201).json(rule);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || err });
    }
};

// update rule
export const updateRule = async (req, res) => {
    try {
        const user_id = req.user.id;
        const rule_id = Number(req.params.id);
        const { name, devices, conditions, actions, schedule } = req.body;

        // validate devices ownership and type
        const base = await validateDevicesSameType(user_id, devices, req.supabase);

        await automationModel.updateRule({ rule_id, user_id, name, devices, conditions, actions, schedule, db: req.supabase });
        res.json({ ok: true });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || err });
    }
};

// delete rule
export const deleteRule = async (req, res) => {
    try {
        const user_id = req.user.id;
        const rule_id = Number(req.params.id);
        await automationModel.deleteRule({ rule_id, user_id, db: req.supabase });
        res.json({ ok: true });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || err });
    }
};

export default { listRules, createRule, updateRule, deleteRule };
