import supabase from "./supabaseClient.js";
import iotService from "./iotService.js";

// Fetch current device state (devices.status, fans.speed_level/mode, lights.intensity/color)
const getDeviceState = async (device_id, db = supabase) => {
    const state = { device: null, fan: null, light: null };
    try {
        const { data: device } = await db.from("devices").select("id, type, status").eq("id", device_id).limit(1).single();
        state.device = device || null;
    } catch (e) {
        state.device = null;
    }

    try {
        const { data: fan } = await db.from("fans").select("device_id, speed_level, mode").eq("device_id", device_id).limit(1).single();
        state.fan = fan || null;
    } catch (e) {
        state.fan = null;
    }

    try {
        const { data: light } = await db.from("lights").select("device_id, intensity, color").eq("device_id", device_id).limit(1).single();
        state.light = light || null;
    } catch (e) {
        state.light = null;
    }

    return state;
};

// Publish only if desired state differs from current device state
const publishIfDifferent = async ({ device_id, action, value, db = supabase }) => {
    try {
        const st = await getDeviceState(device_id, db);
        const act = (action || "").toLowerCase();

        if (act === "speed") {
            const cur = st.fan && typeof st.fan.speed_level === 'number' ? st.fan.speed_level : null;
            if (cur !== null && Number(cur) === Number(value)) {
                console.log(`[sensorService] skip publish: fan ${device_id} already at speed ${value}`);
                return { skipped: true };
            }
        } else if (act === "power") {
            const cur = st.device && typeof st.device.status === 'number' ? st.device.status : null;
            if (cur !== null && Number(cur) === Number(value)) {
                console.log(`[sensorService] skip publish: device ${device_id} power already ${value}`);
                return { skipped: true };
            }
        } else if (act === "mode") {
            const cur = st.fan && st.fan.mode ? String(st.fan.mode) : null;
            if (cur !== null && String(cur) === String(value)) {
                console.log(`[sensorService] skip publish: fan ${device_id} mode already ${value}`);
                return { skipped: true };
            }
        } else if (act === "color") {
            const cur = st.light && st.light.color ? String(st.light.color) : null;
            if (cur !== null && String(cur) === String(value)) {
                console.log(`[sensorService] skip publish: light ${device_id} color already ${value}`);
                return { skipped: true };
            }
        } else if (act === "intensity") {
            const cur = st.light && typeof st.light.intensity === 'number' ? st.light.intensity : null;
            if (cur !== null && Number(cur) === Number(value)) {
                console.log(`[sensorService] skip publish: light ${device_id} intensity already ${value}`);
                return { skipped: true };
            }
        }
    } catch (e) {
        console.warn(`[sensorService] failed to check device state for device ${device_id}:`, e.message || e);
    }

    return await iotService.publishCommandForDevice({ device_id, action, value, db });
};


const OPERATORS = {
    ">": (a, b) => a > b,
    "<": (a, b) => a < b,
    ">=": (a, b) => a >= b,
    "<=": (a, b) => a <= b,
    "==": (a, b) => a == b,
    "=": (a, b) => a == b,
    "!=": (a, b) => a != b
};

const toNumberOrNull = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const compare = (left, operator, right) => {
    const l = toNumberOrNull(left);
    const r = toNumberOrNull(right);
    if (l === null || r === null) return false;
    const fn = OPERATORS[operator];
    if (!fn) return false;
    return fn(l, r);
};

// Compute fan speed based on temperature/humidity heuristics
const computeFanSpeed = (readings, ruleConditions = []) => {
    const tempKeys = ["temp", "temperature", "t"];
    const humKeys = ["hum", "humidity", "h"];

    let currentTemp = null;
    for (const k of tempKeys) {
        if (readings[k] !== undefined) {
            currentTemp = toNumberOrNull(readings[k]);
            break;
        }
    }

    let currentHum = null;
    for (const k of humKeys) {
        if (readings[k] !== undefined) {
            currentHum = toNumberOrNull(readings[k]);
            break;
        }
    }

    let desiredTemp = null;
    let desiredHum = null;
    for (const c of ruleConditions) {
        const st = (c.sensor_type || "").toLowerCase();
        if (st.includes("temp") || st.includes("temperature")) {
            const v = toNumberOrNull(c.value);
            if (v !== null) desiredTemp = v;
        }
        if (st.includes("hum") || st.includes("humidity")) {
            const v = toNumberOrNull(c.value);
            if (v !== null) desiredHum = v;
        }
    }

    // sensible defaults
    if (desiredTemp === null) desiredTemp = 24; // Celsius
    if (currentTemp === null) return null; // can't compute without temperature

    // simple proportional mapping: every degree above target increases speed
    let delta = Math.max(0, currentTemp - desiredTemp);

    // base speed from delta (map 0..10+ -> 0..5)
    let speed = Math.ceil((delta / 2));

    // humidity modifier: if humidity is above desired or >60, bump speed
    if (currentHum !== null) {
        const humThreshold = desiredHum !== null ? desiredHum : 60;
        if (currentHum > humThreshold) speed += 1;
    }

    // speed range 0-5
    speed = Math.max(0, Math.min(5, speed));
    return speed;
};

// Evaluate a rule's conditions against the incoming readings
const ruleMatchesReadings = (ruleConditions = [], readings = {}) => {
    if (!ruleConditions || ruleConditions.length === 0) return false;

    for (const cond of ruleConditions) {
        const key = (cond.sensor_type || "").toLowerCase();
        const val = readings[key] !== undefined ? readings[key] : readings[key.replace(/sensor_|rule_/g, "")];
        if (val === undefined) return false;
        if (!compare(val, cond.operator || "==", cond.value)) return false;
    }

    return true;
};

export const processReadings = async ({ feed, readings, db = supabase }) => {
    try {
        // fetch active rules 
        const { data: rules } = await db
            .from("automation_rules")
            .select("id, name, is_active")
            .eq("is_active", true);
        if (!rules || rules.length === 0) return { processed: 0 };

        // load conditions, actions, devices, schedules
        const ruleMap = {};
        for (const r of rules) {
            ruleMap[r.id] = { meta: r, conditions: [], actions: [], devices: [], schedules: [] };
        }
        const ruleIds = Object.keys(ruleMap).map(id => Number(id));
        const [{ data: conds }, { data: acts }, { data: devs }, { data: schs }] = await Promise.all([
            db.from("rule_conditions").select("id, rule_id, sensor_type, operator, value").in("rule_id", ruleIds),
            db.from("rule_actions").select("id, rule_id, action, value").in("rule_id", ruleIds),
            db.from("rule_devices").select("rule_id, device_id").in("rule_id", ruleIds),
            db.from("rule_schedules").select("id, rule_id, start_time, end_time, start_date, end_date").in("rule_id", ruleIds)
        ]);
        for (const c of conds || []) {
            if (ruleMap[c.rule_id]) ruleMap[c.rule_id].conditions.push(c);
        }
        for (const a of acts || []) {
            if (ruleMap[a.rule_id]) ruleMap[a.rule_id].actions.push(a);
        }
        for (const d of devs || []) {
            if (ruleMap[d.rule_id]) ruleMap[d.rule_id].devices.push(d.device_id);
        }
        for (const s of schs || []) {
            if (ruleMap[s.rule_id]) ruleMap[s.rule_id].schedules.push(s);
        }

        let processed = 0;

        // evaluate each rule
        for (const id of Object.keys(ruleMap)) {
            const r = ruleMap[id];
            if (!r.actions.length || !r.devices.length) continue;

            // if rule has conditions, ensure referenced sensors are present in the readings
            if (r.conditions && r.conditions.length > 0) {
                const condSensorTypes = r.conditions.map(c => (c.sensor_type || "").toLowerCase());
                const hasSensors = condSensorTypes.some(st => Object.keys(readings).includes(st));
                if (!hasSensors) {
                    console.log(`[sensorService] rule ${r.meta.id} skipped: no matching sensors in readings`);
                    continue;
                }
            }

            // check schedule if present
            if (r.schedules && r.schedules.length > 0) {
                const now = new Date();
                const inAny = r.schedules.some(sch => {
                    try {
                        const startDate = sch.start_date ? new Date(sch.start_date) : null;
                        const endDate = sch.end_date ? new Date(sch.end_date) : null;

                        if (startDate && now < startDate) return false;
                        if (endDate && now > new Date(new Date(sch.end_date).getTime() + 24 * 60 * 60 * 1000 - 1)) return false;

                        if (sch.start_time || sch.end_time) {
                            // compare time-of-day
                            const pad = (n) => String(n).padStart(2, '0');
                            const nowTOD = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
                            if (sch.start_time && nowTOD < sch.start_time) return false;
                            if (sch.end_time && nowTOD > sch.end_time) return false;
                        }

                        return true;
                    } catch (e) {
                        return true;
                    }
                });

                if (!inAny) {
                    console.log(`[sensorService] rule ${r.meta.id} skipped by schedule`);
                    continue;
                }
            }

            const setpointTypes = ["temp", "temperature", "t", "hum", "humidity", "h"];
            const setpointConds = [];
            const otherConds = [];
            for (const c of r.conditions) {
                const st = (c.sensor_type || "").toLowerCase();
                if (setpointTypes.some(k => st.includes(k))) setpointConds.push(c);
                else otherConds.push(c);
            }

            // other conditions must match 
            if (otherConds.length > 0) {
                const otherMatches = ruleMatchesReadings(otherConds, readings);
                if (!otherMatches) {
                    console.log(`[sensorService] rule ${r.meta.id} other conditions did not match`);
                    continue;
                }
            }

            let computedSpeed = null;
            if (setpointConds.length > 0) {
                computedSpeed = computeFanSpeed(readings, setpointConds);
                if (computedSpeed === null) {
                    console.log(`[sensorService] rule ${r.meta.id} skipped: missing sensor values for setpoint computation`);
                    continue;
                }
            }

            // If the rule has no conditions at all, treat it as matched.
            if (!r.conditions || r.conditions.length === 0) {
                // nothing to check
            } else if (setpointConds.length === 0) {
                const matches = ruleMatchesReadings(r.conditions, readings);
                if (!matches) {
                    console.log(`[sensorService] rule ${r.meta.id} conditions did not match`);
                    continue;
                }
            }

            console.log(`[sensorService] rule ${r.meta.id} triggered`);

            // rule triggered -> run actions for each device
            for (const device_id of r.devices) {
                for (const action of r.actions) {
                    try {
                        const actionName = (action.action || "").toLowerCase();

                        // computed a speed from setpoints, prefer publishing speed
                        if (computedSpeed !== null && actionName !== "speed") {
                            if (["turn_on", "switch_on", "power", "toggle", "on", "start"].includes(actionName)) {
                                console.log(`[sensorService] publishing computed speed ${computedSpeed} for device ${device_id} (action ${actionName})`);
                                await publishIfDifferent({ device_id, action: "speed", value: computedSpeed, db });
                                continue;
                            }
                            if (["turn_off", "switch_off", "off", "stop"].includes(actionName)) {
                                console.log(`[sensorService] publishing computed speed 0 for device ${device_id} (action ${actionName})`);
                                await publishIfDifferent({ device_id, action: "speed", value: 0, db });
                                continue;
                            }
                        }

                        if (actionName === "speed") {
                            let publishValue = null;
                            const vnum = toNumberOrNull(action.value);
                            if (vnum !== null) publishValue = vnum;
                            else {
                                // compute adaptive speed 
                                const computed = computedSpeed !== null ? computedSpeed : computeFanSpeed(readings, r.conditions);
                                if (computed === null) continue;
                                publishValue = computed;
                            }

                            await publishIfDifferent({ device_id, action: "speed", value: publishValue, db });
                        } else if (actionName === "power") {
                            const vnum = toNumberOrNull(action.value);
                            if (vnum === null) continue;
                            await publishIfDifferent({ device_id, action: "power", value: vnum, db });
                        } else if (actionName === "mode") {
                            const v = action.value || "";
                            await publishIfDifferent({ device_id, action: "mode", value: v, db });
                        } else {
                            // generic fallback: publish whatever the action says
                            await publishIfDifferent({ device_id, action: action.action, value: action.value, db });
                        }
                    } catch (err) {
                        console.error("[sensorService] action publish error:", err.message || err);
                    }
                }
            }

            processed++;
        }

        return { processed };
    } catch (err) {
        console.error("[sensorService] error:", err.message || err);
        return { processed: 0, error: err.message || err };
    }
};

export default { processReadings };
