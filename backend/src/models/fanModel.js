import supabase from "../services/supabaseClient.js";
import * as deviceModel from "./deviceModel.js";

const ensureFanRow = async (db, device_id) => {
    const { data: existing, error: findErr } = await db
        .from("fans")
        .select("device_id")
        .eq("device_id", device_id)
        .maybeSingle();

    if (findErr) throw findErr;

    if (!existing) {
        const { error: insertErr } = await db.from("fans").insert({ device_id });
        if (insertErr) throw insertErr;
    }
};

export const getFanAttributes = async ({ device_id, user_id, db = supabase }) => {
    const { data, error } = await db
        .from("devices")
        .select("name, status, fans ( mode, speed_level )")
        .eq("id", device_id)
        .eq("user_id", user_id)
        .limit(1)
        .single();

    if (error) throw error;

    const relation = data.fans;
    const fan = Array.isArray(relation)
        ? (relation[0] || { mode: null, speed_level: null })
        : (relation || { mode: null, speed_level: null });

    return {
        name: data.name,
        status: data.status,
        mode: fan.mode,
        speed_level: fan.speed_level
    };
};

export const setFanPower = async ({ device_id, user_id, status, db = supabase }) => {
    return deviceModel.updateDeviceStatus({ device_id, user_id, status, db });
};

export const setFanMode = async ({ device_id, user_id, mode, db = supabase }) => {
    const { data: device, error: findErr } = await db
        .from("devices")
        .select("user_id")
        .eq("id", device_id)
        .limit(1)
        .single();

    if (findErr) throw findErr;
    if (device.user_id !== user_id) throw { status: 403, message: "Forbidden" };

    await ensureFanRow(db, device_id);

    const { data, error } = await db
        .from("fans")
        .update({ mode })
        .eq("device_id", device_id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const setFanSpeed = async ({ device_id, user_id, speed_level, db = supabase }) => {
    if (typeof speed_level !== "number") speed_level = Number(speed_level);
    if (isNaN(speed_level) || speed_level < 0 || speed_level > 5) throw { status: 400, message: "speed_level must be 0-5" };

    const { data: device, error: findErr } = await db
        .from("devices")
        .select("user_id")
        .eq("id", device_id)
        .limit(1)
        .single();

    if (findErr) throw findErr;
    if (device.user_id !== user_id) throw { status: 403, message: "Forbidden" };

    await ensureFanRow(db, device_id);

    const { data, error } = await db
        .from("fans")
        .update({ speed_level })
        .eq("device_id", device_id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export default {
    getFanAttributes,
    setFanPower,
    setFanMode,
    setFanSpeed
};
