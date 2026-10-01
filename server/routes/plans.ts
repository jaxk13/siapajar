import { Router } from "express";
import { getPlans } from "../controllers/plans.controller";
import { asyncHandler } from "../lib/asyncHandler";

export const plansRouter = Router();

plansRouter.get("/plans", asyncHandler(getPlans));
