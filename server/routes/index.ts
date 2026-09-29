import { Router } from "express";
import { apiNotFound } from "../middleware/errorHandler";
import { geminiRouter } from "./gemini";
import { systemRouter } from "./system";

export const apiRouter = Router();

apiRouter.use(systemRouter);
apiRouter.use(geminiRouter);

// Unknown /api routes return JSON instead of falling through to the SPA.
apiRouter.use(apiNotFound);
