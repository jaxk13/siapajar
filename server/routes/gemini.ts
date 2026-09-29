import { Router } from "express";
import { getGeminiStatus, postGenerateQuestions } from "../controllers/gemini.controller";

// Direct AI is not an MVP dependency (ADR-001). Kept only to preserve existing behavior.
export const geminiRouter = Router();

geminiRouter.get("/gemini/status", getGeminiStatus);
geminiRouter.post("/gemini/generate-questions", postGenerateQuestions);
