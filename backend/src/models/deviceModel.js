import supabase from "../services/supabaseClient.js";

export const getDevicesByUser = async (userId) => {
    const { data, error } = await supabase
        .from("devices")
        .select(`id, name, type, status, adafruit_key, image, created_at, sensors(*), lights(*), fans(*)`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    return { data, error };
};

export default {
    getDevicesByUser,
};
