import express from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { listRules, getAIRules, createRule, createAIRule, updateRule, deleteRule, setRuleActive, toggleAIRuleActive, deleteAIRule } from "../controllers/automationController.js";

const router = express.Router();

router.get("/rules", authenticateUser, listRules);
router.post("/rules", authenticateUser, createRule);
router.put("/rules/:id", authenticateUser, updateRule);
router.delete("/rules/:id", authenticateUser, deleteRule);
router.patch("/rules/:id/active", authenticateUser, setRuleActive);


router.get("/rules/ai", authenticateUser, getAIRules);
router.post("/rules/ai", authenticateUser, createAIRule);
router.delete("/rules/ai/:id", authenticateUser, deleteAIRule);
router.patch("/rules/ai/:id/active", authenticateUser, toggleAIRuleActive);

export default router;
