import { Router } from "express";
import * as notificationController from "../controllers/notificationController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = Router();

// Get all notifications
router.get("/notifications", authenticateUser, notificationController.getNotifications);

// Get unread count
router.get("/notifications/unread/count", authenticateUser, notificationController.getUnreadCount);

// Mark notification as read
router.patch("/notifications/:id/read", authenticateUser, notificationController.markAsRead);

// Mark all notifications as read
router.patch("/notifications/read/all", authenticateUser, notificationController.markAllAsRead);

// Delete notification
router.delete("/notifications/:id", authenticateUser, notificationController.deleteNotification);

export default router;
