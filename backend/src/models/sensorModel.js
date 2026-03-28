import supabase from "../services/supabaseClient.js";

export const insertSensorReading = async ({ sensor_id, value, db = supabase }) => {
    const { data, error } = await db.from("sensor_readings").insert({ sensor_id, value }).select().single();
    if (error) throw error;
    return data;
};

export const getSensorReadings = async ({ sensor_id, range = "24h", db = supabase }) => {
    // range: '1h', '24h', '1w'
    let interval = "24 hours";
    if (range === "1h") interval = "1 hour";
    else if (range === "1w") interval = "7 days";

    const { data, error } = await db
        .from("sensor_readings")
        .select("id, value, created_at")
        .eq("sensor_id", sensor_id)
        .order("created_at", { ascending: false });

    if (error) throw error;

    const cutoff = new Date();

    if (range === "1h") cutoff.setHours(cutoff.getHours() - 1);
    else if (range === "1w") cutoff.setDate(cutoff.getDate() - 7);
    else cutoff.setDate(cutoff.getDate() - 1);

    return data.filter(r => new Date(r.created_at) >= cutoff);

};

export default { insertSensorReading, getSensorReadings };
