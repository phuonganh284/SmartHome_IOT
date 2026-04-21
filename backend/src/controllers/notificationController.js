import * as notificationModel from "../models/notificationModel.js";

// Get all notifications for a user
export const getNotifications = async (req, res) => {
  try {
    const user_id = req.user.id;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const notifications = await notificationModel.getNotificationsByUser(user_id, {
      limit,
      db: req.supabase,
    });
    res.json(notifications);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || err });
  }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    const user_id = req.user.id;
    const count = await notificationModel.getUnreadCount(user_id, req.supabase);
    res.json({ unread_count: count });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || err });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const user_id = req.user.id;
    const notification_id = Number(req.params.id);
    await notificationModel.markAsRead(notification_id, user_id, req.supabase);
    res.json({ ok: true });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || err });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const user_id = req.user.id;
    await notificationModel.markAllAsRead(user_id, req.supabase);
    res.json({ ok: true });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || err });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const user_id = req.user.id;
    const notification_id = Number(req.params.id);
    await notificationModel.deleteNotification(notification_id, user_id, req.supabase);
    res.json({ ok: true });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || err });
  }
};

export default { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification };
