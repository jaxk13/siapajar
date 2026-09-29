import { Router } from "express";
import { getHealth, getStatus } from "../controllers/system.controller";

export const systemRouter = Router();

systemRouter.get("/system/status", getStatus);
systemRouter.get("/health", getHealth);
