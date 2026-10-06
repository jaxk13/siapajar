import { Router } from "express";
import { apiNotFound } from "../middleware/errorHandler";
import { accessRouter } from "./access";
import { paymentRouter } from "./payment";
import { plansRouter } from "./plans";
import { superAdminRouter } from "./superAdmin";
import { systemRouter } from "./system";

export const apiRouter = Router();

apiRouter.use(systemRouter);
apiRouter.use(accessRouter);
apiRouter.use(plansRouter);
apiRouter.use(paymentRouter);
apiRouter.use("/super-admin", superAdminRouter);

// Unknown /api routes return JSON instead of falling through to the SPA.
apiRouter.use(apiNotFound);
