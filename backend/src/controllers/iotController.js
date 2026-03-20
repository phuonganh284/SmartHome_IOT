import supabase from "../services/supabaseClient.js";

const toNumberOrNull = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const rgbStringToHex = (s) => {
    // accept 'R,G,B' or 'r,g,b' where R G B are 0-255
    const parts = String(s).split(",").map(p => p.trim());
    if (parts.length !== 3) return null;
    const nums = parts.map(p => Number(p));
    if (nums.some(n => !Number.isFinite(n) || n < 0 || n > 255)) return null;
    const hex = nums.map(n => n.toString(16).padStart(2, "0")).join("").toUpperCase();
    return `#${hex}`;
};

export const handleFeed = async (req, res) => {
    try {
        const { feed, payload } = req.body;
        if (!feed) return res.status(400).json({ error: "feed is required" });

        // split feed into base + action (suffix)
        const parts = String(feed).split("-");
        if (parts.length < 2) return res.status(400).json({ error: "invalid feed format" });
        const action = parts.pop();
        const base = parts.join("-");

        // find devices mapped to this feed base
        const { data: devices, error: devErr } = await supabase
            .from("devices")
            .select("id, type")
            .eq("adafruit_key", base);
        if (devErr) throw devErr;
        if (!devices || devices.length === 0) return res.status(404).json({ error: "no device mapped to this feed" });

        // for each device, apply action
        for (const d of devices) {
            if (action === "power") {
                // normalize payload to 1/0
                const p = String(payload).toLowerCase();
                let status = null;
                if (p === "1" || p === "on" || p === "true") status = 1;
                else if (p === "0" || p === "off" || p === "false") status = 0;
                else {
                    const n = toNumberOrNull(p);
                    if (n === 1 || n === 0) status = n;
                }
                if (status === null) continue;
                await supabase.from("devices").update({ status }).eq("id", d.id);
            } else if (action === "mode") {
                const mode = String(payload);
                await supabase.from("fans").update({ mode }).eq("device_id", d.id);
            } else if (action === "speed") {
                const n = toNumberOrNull(payload);
                if (n === null) continue;
                await supabase.from("fans").update({ speed_level: n }).eq("device_id", d.id);
            } else if (action === "intensity") {
                const n = toNumberOrNull(payload);
                if (n === null) continue;
                await supabase.from("lights").update({ intensity: n }).eq("device_id", d.id);
            } else if (action === "color") {
                const v = String(payload).trim();
                let hex = null;
                if (/^#?[0-9A-Fa-f]{6}$/.test(v)) hex = v.startsWith("#") ? v.toUpperCase() : `#${v.toUpperCase()}`;
                else if (v.includes(",")) hex = rgbStringToHex(v);
                if (!hex) continue;
                await supabase.from("lights").update({ color: hex }).eq("device_id", d.id);
            } else {
                // unknown action: ignore
                continue;
            }
        }

        res.json({ ok: true, mapped: devices.length });
    } catch (err) {
        res.status(500).json({ error: err.message || err });
    }
};

export default { handleFeed };
