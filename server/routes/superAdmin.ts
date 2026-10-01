// Admin panel API: /api/super-admin (ADR-016). See server/README.md §3.
import { Router } from "express";
import * as admin from "../controllers/admin.controller";
import { asyncHandler as h } from "../lib/asyncHandler";
import { rateLimit } from "../middleware/rateLimit";
import { requireAdmin, requireSuperAdmin } from "../middleware/requireAdmin";
import { sameOrigin } from "../middleware/sameOrigin";

export const superAdminRouter = Router();
const signedIn = requireAdmin();
const signedInPendingPassword = requireAdmin({ allowPasswordChangePending: true });

superAdminRouter.use(sameOrigin);

// Account
superAdminRouter.post("/auth/login", rateLimit({ windowMs: 60_000, max: 5 }), h(admin.postLogin));
superAdminRouter.post("/auth/logout", h(admin.postLogout));
superAdminRouter.get("/me", signedInPendingPassword, h(admin.getMe));
superAdminRouter.post("/me/password", signedInPendingPassword, rateLimit({ windowMs: 60_000, max: 10 }), h(admin.postChangePassword));

// Orders and access codes (all admins)
superAdminRouter.get("/overview", signedIn, h(admin.getOverview));
superAdminRouter.get("/orders", signedIn, h(admin.getOrders));
superAdminRouter.post("/orders", signedIn, h(admin.postOrder));
superAdminRouter.get("/orders/:id", signedIn, h(admin.getOrder));
superAdminRouter.get("/orders/:id/proof", signedIn, h(admin.getOrderProof));
superAdminRouter.get("/codes", signedIn, h(admin.getCodes));
superAdminRouter.get("/codes/:id", signedIn, h(admin.getCode));
superAdminRouter.post("/codes/:id/disable", signedIn, h(admin.postDisableCode));
superAdminRouter.post("/codes/:id/regenerate", signedIn, h(admin.postRegenerateCode));

// Super admin only
superAdminRouter.post("/codes/test", signedIn, requireSuperAdmin, h(admin.postTestCode));
superAdminRouter.get("/plans", signedIn, h(admin.getPlans));
superAdminRouter.patch("/plans/:id", signedIn, requireSuperAdmin, h(admin.patchPlan));
superAdminRouter.get("/settings", signedIn, requireSuperAdmin, h(admin.getSettings));
superAdminRouter.put("/settings", signedIn, requireSuperAdmin, h(admin.putSettings));
superAdminRouter.get("/users", signedIn, requireSuperAdmin, h(admin.getUsers));
superAdminRouter.post("/users", signedIn, requireSuperAdmin, h(admin.postUser));
superAdminRouter.patch("/users/:id", signedIn, requireSuperAdmin, h(admin.patchUser));
superAdminRouter.post("/users/:id/reset-password", signedIn, requireSuperAdmin, h(admin.postResetPassword));
superAdminRouter.get("/activity", signedIn, requireSuperAdmin, h(admin.getActivity));
