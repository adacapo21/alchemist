import {Router} from "express";
import {webhookHandler} from "../controllers/jira.controller";
import {validateWebhook} from "../integrations/jira/middleware";

const router = Router();

router.post("/", validateWebhook, webhookHandler);

export default router;
