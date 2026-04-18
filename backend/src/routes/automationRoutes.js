import express from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { listRules, createRule, updateRule, deleteRule, setRuleActive } from "../controllers/automationController.js";

const router = express.Router();

router.get("/rules", authenticateUser, listRules);
router.post("/rules", authenticateUser, createRule);
router.put("/rules/:id", authenticateUser, updateRule);
router.delete("/rules/:id", authenticateUser, deleteRule);
router.patch("/rules/:id/active", authenticateUser, setRuleActive);

export default router;
