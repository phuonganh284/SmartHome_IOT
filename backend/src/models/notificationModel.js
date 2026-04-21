import supabase from "../services/supabaseClient.js";

// Create a notification for an automation rule execution
export const createNotification = async ({
  user_id,
  rule_id,
  device_id,
  rule_name,
  device_name,
  action,
  db = supabase,
}) => {
  const message = `${rule_name}: turned ${action === "turn_on" ? "on" : "off"} ${device_name}`;

  const { data, error } = await db
    .from("notifications")
    .insert({
      user_id,
      rule_id,
      device_id,
      message,
      action,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get notifications for a user
export const getNotificationsByUser = async (user_id, { limit = 50, db = supabase } = {}) => {
  const { data, error } = await db
    .from("notifications")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

// Mark notification as read
export const markAsRead = async (notification_id, user_id, db = supabase) => {
  // ensure ownership
  const { data: existing, error: exErr } = await db
    .from("notifications")
    .select("user_id")
    .eq("id", notification_id)
    .limit(1)
    .single();

  if (exErr) throw exErr;
  if (existing.user_id !== user_id) throw { status: 403, message: "Forbidden" };

  const { error } = await db
    .from("notifications")
    .update({ read: true })
    .eq("id", notification_id);

  if (error) throw error;
  return true;
};

// Mark all notifications as read
export const markAllAsRead = async (user_id, db = supabase) => {
  const { error } = await db
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user_id)
    .eq("read", false);

  if (error) throw error;
  return true;
};

// Delete notification
export const deleteNotification = async (notification_id, user_id, db = supabase) => {
  // ensure ownership
  const { data: existing, error: exErr } = await db
    .from("notifications")
    .select("user_id")
    .eq("id", notification_id)
    .limit(1)
    .single();

  if (exErr) throw exErr;
  if (existing.user_id !== user_id) throw { status: 403, message: "Forbidden" };

  const { error } = await db.from("notifications").delete().eq("id", notification_id);

  if (error) throw error;
  return true;
};

// Get unread count for a user
export const getUnreadCount = async (user_id, db = supabase) => {
  const { count, error } = await db
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user_id)
    .eq("read", false);

  if (error) throw error;
  return count || 0;
};

export default {
  createNotification,
  getNotificationsByUser,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
};
