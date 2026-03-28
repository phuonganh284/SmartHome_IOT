import supabase from "../services/supabaseClient.js";

// GET all rules from user
export const getRulesByUser = async (user_id, db = supabase) => {
    // fetch rules
    const { data: rules, error } = await db
        .from("automation_rules")
        .select("id, name, is_active, last_executed, created_at")
        .eq("user_id", user_id)
        .order("id", { ascending: true });

    if (error) throw error;

    // attach devices, conditions, actions, schedules
    for (const r of rules) {
        const [{ data: devices }, { data: conditions }, { data: actions }, { data: schedules }] = await Promise.all([
            db.from("rule_devices").select("device_id").eq("rule_id", r.id),
            db.from("rule_conditions").select("id, sensor_type, operator, value").eq("rule_id", r.id),
            db.from("rule_actions").select("id, action, value").eq("rule_id", r.id),
            db.from("rule_schedules").select("id, start_time, end_time, start_date, end_date").eq("rule_id", r.id)
        ]);

        r.devices = devices ? devices.map(d => d.device_id) : [];
        r.conditions = conditions || [];
        r.actions = actions || [];
        r.schedules = schedules || [];
    }

    return rules;
};


// POST one new rule from user
export const createRule = async ({ user_id, name, devices = [], conditions = [], actions = [], schedule = null, db = supabase }) => {
    const { data: rule, error } = await db
        .from("automation_rules")
        .insert({ user_id, name })
        .select()
        .single();

    if (error) throw error;

    const rule_id = rule.id;

    // insert devices
    if (devices && devices.length > 0) {
        const rows = devices.map(device_id => ({ rule_id, device_id }));
        const { error: devErr } = await db.from("rule_devices").insert(rows);
        if (devErr) throw devErr;
    }

    // insert conditions
    if (conditions && conditions.length > 0) {
        const rows = conditions.map(c => ({ rule_id, sensor_type: c.sensor_type, operator: c.operator, value: c.value }));
        const { error: condErr } = await db.from("rule_conditions").insert(rows);
        if (condErr) throw condErr;
    }

    // insert actions
    if (actions && actions.length > 0) {
        const rows = actions.map(a => ({ rule_id, action: a.action, value: a.value || null }));
        const { error: actErr } = await db.from("rule_actions").insert(rows);
        if (actErr) throw actErr;
    }

    // insert schedule (single)
    if (schedule) {
        const { start_time, end_time, start_date, end_date } = schedule;
        const { error: schErr } = await db.from("rule_schedules").insert([{ rule_id, start_time, end_time, start_date, end_date }]);
        if (schErr) throw schErr;
    }

    return rule;
};


// PATCH existing rule
export const updateRule = async ({ rule_id, user_id, name, devices = [], conditions = [], actions = [], schedule = null, db = supabase }) => {
    // ensure ownership
    const { data: existing, error: exErr } = await db.from("automation_rules").select("user_id").eq("id", rule_id).limit(1).single();
    if (exErr) throw exErr;
    if (existing.user_id !== user_id) throw { status: 403, message: "Forbidden" };

    const { error: upErr } = await db.from("automation_rules").update({ name }).eq("id", rule_id);
    if (upErr) throw upErr;

    // replace devices
    const { error: delDevErr } = await db.from("rule_devices").delete().eq("rule_id", rule_id);
    if (delDevErr) throw delDevErr;
    if (devices && devices.length > 0) {
        const rows = devices.map(device_id => ({ rule_id, device_id }));
        const { error: devErr } = await db.from("rule_devices").insert(rows);
        if (devErr) throw devErr;
    }

    // replace conditions
    const { error: delCondErr } = await db.from("rule_conditions").delete().eq("rule_id", rule_id);
    if (delCondErr) throw delCondErr;
    if (conditions && conditions.length > 0) {
        const rows = conditions.map(c => ({ rule_id, sensor_type: c.sensor_type, operator: c.operator, value: c.value }));
        const { error: condErr } = await db.from("rule_conditions").insert(rows);
        if (condErr) throw condErr;
    }

    // replace actions
    const { error: delActErr } = await db.from("rule_actions").delete().eq("rule_id", rule_id);
    if (delActErr) throw delActErr;
    if (actions && actions.length > 0) {
        const rows = actions.map(a => ({ rule_id, action: a.action, value: a.value || null }));
        const { error: actErr } = await db.from("rule_actions").insert(rows);
        if (actErr) throw actErr;
    }

    // replace schedule (delete existing and insert new if provided)
    const { error: delSchErr } = await db.from("rule_schedules").delete().eq("rule_id", rule_id);
    if (delSchErr) throw delSchErr;
    if (schedule) {
        const { start_time, end_time, start_date, end_date } = schedule;
        const { error: schErr } = await db.from("rule_schedules").insert([{ rule_id, start_time, end_time, start_date, end_date }]);
        if (schErr) throw schErr;
    }

    return true;
};


export const deleteRule = async ({ rule_id, user_id, db = supabase }) => {
    const { data: existing, error: exErr } = await db.from("automation_rules").select("user_id").eq("id", rule_id).limit(1).single();
    if (exErr) throw exErr;
    if (existing.user_id !== user_id) throw { status: 403, message: "Forbidden" };

    const { error } = await db.from("automation_rules").delete().eq("id", rule_id);
    if (error) throw error;
    return true;
};

export default {
    getRulesByUser,
    createRule,
    updateRule,
    deleteRule
};
