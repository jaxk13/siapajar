import type { Request, Response } from "express";
import { sendSuccess } from "../lib/apiResponse";
import { getPublicPlans } from "../services/plans.service";

export async function getPlans(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await getPublicPlans());
}
