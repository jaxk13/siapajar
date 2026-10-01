import { Router } from "express";
import { getCurrentSession, postActivate, postLogout } from "../controllers/access.controller";
import { asyncHandler } from "../lib/asyncHandler";
import { rateLimit } from "../middleware/rateLimit";
import { requireSession } from "../middleware/requireSession";

export const accessRouter = Router();

accessRouter.post("/access/activate", rateLimit({ windowMs: 60_000, max: 5 }), asyncHandler(postActivate));
accessRouter.get("/session", requireSession, asyncHandler(getCurrentSession));
accessRouter.post("/session/logout", asyncHandler(postLogout));
