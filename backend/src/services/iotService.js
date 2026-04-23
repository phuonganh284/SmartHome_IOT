import supabase from "./supabaseClient.js";
import dotenv from "dotenv";
dotenv.config();

const AIO_USERNAME = process.env.AIO_USERNAME;
const AIO_KEY = process.env.AIO_KEY;

if (!AIO_USERNAME || !AIO_KEY) {
    // do nothing
}

const ADAFRUIT_BASE = `https://io.adafruit.com/api/v2`;

async function publishToFeed(feedKey, value) {
    if (!AIO_USERNAME || !AIO_KEY) throw new Error("Adafruit IO credentials not configured");

    const url = `${ADAFRUIT_BASE}/${encodeURIComponent(AIO_USERNAME)}/feeds/${encodeURIComponent(feedKey)}/data`;

    let fetchFn = globalThis.fetch;
    if (!fetchFn) {
        const { default: fetchImport } = await import("node-fetch");
        fetchFn = fetchImport;
    }

    const resp = await fetchFn(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-AIO-Key": AIO_KEY
        },
        body: JSON.stringify({ value: String(value) })
    });

    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Adafruit publish failed: ${resp.status} ${text}`);
    }

    return resp.json();
}

const hexToRgbString = (hex) => {
    const h = String(hex).replace(/^#/, "");
    if (!/^[0-9A-Fa-f]{6}$/.test(h)) throw new Error("Invalid hex color");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `${r},${g},${b}`;
};

export const publishCommandForDevice = async ({ device_id, db = supabase, action = "power", value }) => {
    // fetch device with adafruit_key and type
    const { data: device, error } = await db
        .from("devices")
        .select("id, type, adafruit_key")
        .eq("id", device_id)
        .limit(1)
        .single();

    if (error) throw error;

    // determine base feed key (e.g., dadn-fan-1 or dadn-led)
    let feedBase = device.adafruit_key;
    if (!feedBase) {
        const t = (device.type || "").toLowerCase();
        if (t.includes("fan")) {
            const n = (device.id % 2) + 1;
            feedBase = `dadn-fan-${n}`;
        } else if (t.includes("light") || t.includes("led")) {
            feedBase = `dadn-led`;
        } else {
            throw new Error("No adafruit feed mapping for device type");
        }
    }

    // normalize common action synonyms (from UI or rules)
    const synonymMap = {
        turn_on: "power",
        turn_off: "power",
        switch_on: "power",
        switch_off: "power",
        toggle: "power"
    };

    // Map synonyms to canonical action and apply sensible default values
    if (synonymMap[action]) {
        const orig = action;
        action = synonymMap[action];
        if ((orig === "turn_on" || orig === "switch_on") && (value === undefined || value === null)) value = 1;
        if ((orig === "turn_off" || orig === "switch_off") && (value === undefined || value === null)) value = 0;
        if (orig === "toggle" && (value === undefined || value === null)) {
            // default toggle -> try to set to 1 (caller should handle toggle semantics)
            value = 1;
        }
    }

    // map action to feed suffix
    const actionSuffixMap = {
        power: "power",
        mode: "mode",
        speed: "speed",
        intensity: "intensity",
        color: "color"
    };

    const suffix = actionSuffixMap[action] || action;

    let feedKey = feedBase;
    if (!feedKey.includes(suffix)) {
        feedKey = `${feedBase}-${suffix}`;
    }

    // transform value for certain actions
    let publishValue = value;
    // if publishing power and value is null/undefined, default to ON (1)
    if (action === "power" && (publishValue === undefined || publishValue === null)) {
        publishValue = 1;
    }
    // if (action === "color") {
    //     publishValue = hexToRgbString(String(value));
    // }

    // logging to help debug 
    try {
        console.log(`[IoT] publish: device=${device_id} action=${action} -> feed=${feedKey} value=${publishValue}`);
        const resp = await publishToFeed(feedKey, publishValue);
        console.log(`[IoT] publish OK: feed=${feedKey}`);

        // reflect the command in database 
        try {
            if (action === "power") {
                const status = Number(publishValue) === 1 ? 1 : 0;
                await db.from("devices").update({ status }).eq("id", device_id);
            } else if (action === "speed") {
                const n = Number(publishValue);
                if (Number.isFinite(n)) {
                    await db.from("fans").update({ speed_level: n, updated_at: new Date() }).eq("device_id", device_id);
                    // ensure devices.status is on when speed > 0
                    if (n > 0) await db.from("devices").update({ status: 1 }).eq("id", device_id);
                }
            } else if (action === "mode") {
                await db.from("fans").update({ mode: String(publishValue) }).eq("device_id", device_id);
            } else if (action === "intensity") {
                const n = Number(publishValue);
                if (Number.isFinite(n)) await db.from("lights").update({ intensity: n }).eq("device_id", device_id);
            } else if (action === "color") {
                const v = String(publishValue).trim();
                await db.from("lights").update({ color: v }).eq("device_id", device_id);
            }
        } catch (dbErr) {
            console.warn("[IoT] DB update after publish failed:", dbErr.message || dbErr);
        }

        return { feed: feedKey, result: resp };
    } catch (e) {
        console.error(`[IoT] publish FAILED: feed=${feedKey} error=`, e.message || e);
        throw e;
    }
};

export default { publishCommandForDevice };
