import { Router } from "express";
import { apiNotFound } from "../middleware/errorHandler";
import { accessRouter } from "./access";
import { plansRouter } from "./plans";
import { systemRouter } from "./system";

export const apiRouter = Router();

apiRouter.use(systemRouter);
apiRouter.use(accessRouter);
apiRouter.use(plansRouter);

// Unknown /api routes return JSON instead of falling through to the SPA.
apiRouter.use(apiNotFound);
