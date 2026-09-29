import type { Request, Response } from "express";
import { sendSuccess } from "../lib/apiResponse";
import { getSystemStatus } from "../services/system.service";

export function getStatus(_req: Request, res: Response): void {
  sendSuccess(res, getSystemStatus());
}

// Pre-existing health check; response shape kept unchanged for compatibility.
export function getHealth(_req: Request, res: Response): void {
  res.json({ status: "ok", service: "Siapajar.id Backend" });
}
