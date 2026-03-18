import supabase from "../services/supabaseClient.js";
import * as deviceModel from "./deviceModel.js";

export const getLightAttributes = async ({ device_id, user_id, db = supabase }) => {
    // ensure ownership and fetch joined attributes
    const { data, error } = await db
        .from("devices")
        .select("name, status, lights ( color, intensity )")
        .eq("id", device_id)
        .eq("user_id", user_id)
        .limit(1)
        .single();

    if (error) throw error;

    // data.lights is an array because of relational select
    const light = data.lights && data.lights[0] ? data.lights[0] : { color: null, intensity: null };

    return {
        name: data.name,
        status: data.status,
        color: light.color,
        intensity: light.intensity
    };
};

export const setLightPower = async ({ device_id, user_id, status, db = supabase }) => {
    // reuse deviceModel update to keep ownership checks consistent
    return deviceModel.updateDeviceStatus({ device_id, user_id, status, db });
};

export const setLightColor = async ({ device_id, user_id, color, db = supabase }) => {
    // ensure user owns device
    const { data: device, error: findErr } = await db
        .from("devices")
        .select("user_id")
        .eq("id", device_id)
        .limit(1)
        .single();

    if (findErr) throw findErr;
    if (device.user_id !== user_id) throw { status: 403, message: "Forbidden" };

    const { data, error } = await db
        .from("lights")
        .update({ color })
        .eq("device_id", device_id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const setLightIntensity = async ({ device_id, user_id, intensity, db = supabase }) => {
    if (typeof intensity !== "number") intensity = Number(intensity);
    if (isNaN(intensity) || intensity < 0 || intensity > 100) throw { status: 400, message: "intensity must be 0-100" };

    const { data: device, error: findErr } = await db
        .from("devices")
        .select("user_id")
        .eq("id", device_id)
        .limit(1)
        .single();

    if (findErr) throw findErr;
    if (device.user_id !== user_id) throw { status: 403, message: "Forbidden" };

    const { data, error } = await db
        .from("lights")
        .update({ intensity })
        .eq("device_id", device_id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export default {
    getLightAttributes,
    setLightPower,
    setLightColor,
    setLightIntensity
};
