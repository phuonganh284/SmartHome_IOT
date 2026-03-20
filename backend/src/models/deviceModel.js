import supabase from "../services/supabaseClient.js";

export const getDeviceTypes = async (db = supabase) => {
    const { data, error } = await db
        .from("device_types")
        .select("type, display_name, image");

    if (error) throw error;
    return data;
};

export const createDevice = async ({ db = supabase, user_id, type, name = null, adafruit_key = null }) => {
    // insert into devices, then into specific table depending on device_types.base_type
    // get base_type
    const { data: typeData, error: typeErr } = await db
        .from("device_types")
        .select("base_type")
        .eq("type", type)
        .limit(1)
        .single();

    if (typeErr) throw typeErr;

    const insertPayload = { user_id, name, type };
    if (adafruit_key) insertPayload.adafruit_key = adafruit_key;

    const { data: device, error: devErr } = await db
        .from("devices")
        .insert(insertPayload)
        .select()
        .single();

    if (devErr) throw devErr;

    const base = typeData.base_type;

    if (base === "light") {
        const { error: lightErr } = await db.from("lights").insert({ device_id: device.id });
        if (lightErr) throw lightErr;
    } else if (base === "fan") {
        const { error: fanErr } = await db.from("fans").insert({ device_id: device.id });
        if (fanErr) throw fanErr;
    }

    // compute adafruit_key to map with feed
    // available feed:
    // - dadn-fan-1
    // - dadn-fan-2
    // - dadn-led
    if (!adafruit_key) {
        let feedKey = null;
        const t = (type || "").toLowerCase();
        if (t.includes("fan") || t.includes("ac")) {
            const n = (device.id % 2) + 1;
            feedKey = `dadn-fan-${n}`;
        } else if (t.includes("light") || t.includes("led")) {
            feedKey = `dadn-led`;
        }

        if (feedKey) {
            const { data: updated, error: updErr } = await db
                .from("devices")
                .update({ adafruit_key: feedKey })
                .eq("id", device.id)
                .select()
                .single();

            if (updErr) throw updErr;
            return updated;
        }
    }

    return device;
};

export const getDevicesByUser = async (user_id, db = supabase) => {
    const { data, error } = await db
        .from("devices")
        .select("id, name, type, status, image")
        .eq("user_id", user_id)
        .order("id", { ascending: true });

    if (error) throw error;
    return data;
};

export const updateDeviceStatus = async ({ device_id, user_id, status, db = supabase }) => {
    // ensure ownership
    const { data: device, error: findErr } = await db
        .from("devices")
        .select("user_id")
        .eq("id", device_id)
        .limit(1)
        .single();

    if (findErr) throw findErr;
    if (device.user_id !== user_id) throw { status: 403, message: "Forbidden" };

    const { data, error } = await db
        .from("devices")
        .update({ status })
        .eq("id", device_id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteDevice = async ({ device_id, user_id, db = supabase }) => {
    // ensure ownership
    const { data: device, error: findErr } = await db
        .from("devices")
        .select("user_id")
        .eq("id", device_id)
        .limit(1)
        .single();

    if (findErr) throw findErr;
    if (device.user_id !== user_id) throw { status: 403, message: "Forbidden" };

    const { error } = await db.from("devices").delete().eq("id", device_id);
    if (error) throw error;
    return true;
};

export const updateAdafruitKey = async ({ device_id, user_id, adafruit_key, db = supabase }) => {
    const { data: device, error: findErr } = await db
        .from("devices")
        .select("user_id")
        .eq("id", device_id)
        .limit(1)
        .single();

    if (findErr) throw findErr;
    if (device.user_id !== user_id) throw { status: 403, message: "Forbidden" };

    const { data, error } = await db
        .from("devices")
        .update({ adafruit_key })
        .eq("id", device_id)
        .select()
        .single();

    if (error) throw error;
    return data;
};