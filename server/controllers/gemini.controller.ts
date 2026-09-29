// Pre-existing Direct Gemini endpoints. Response shapes are kept unchanged because
// src/components/AIStep.tsx consumes them; they do not use the standard API envelope.
import type { Request, Response } from "express";
import { generateQuestions, hasGeminiKey } from "../services/gemini.service";

export function getGeminiStatus(_req: Request, res: Response): void {
  res.json({ hasKey: hasGeminiKey() });
}

export async function postGenerateQuestions(req: Request, res: Response): Promise<void> {
  try {
    const customKey = req.headers["x-gemini-api-key"] as string;
    const rawText = await generateQuestions(req.body ?? {}, customKey);

    if (rawText === null) {
      res.status(503).json({
        error: "GEMINI_API_KEY belum dikonfigurasi di lingkungan aplikasi.",
      });
      return;
    }

    res.json({ rawText });
  } catch (err) {
    console.error("Gemini Generation Error:", err);
    res.status(500).json({
      error: (err instanceof Error && err.message) || "Gagal memproses pembuatan soal dengan AI.",
    });
  }
}
