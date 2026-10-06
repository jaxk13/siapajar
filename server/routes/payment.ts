import { Router } from "express";
import { getCheckoutConfig, getCheckoutStatus, postCheckout, postMidtransWebhook } from "../controllers/payment.controller";
import { asyncHandler } from "../lib/asyncHandler";
import { rateLimit } from "../middleware/rateLimit";

export const paymentRouter = Router();

paymentRouter.get("/checkout/config", asyncHandler(getCheckoutConfig));
paymentRouter.post("/checkout", rateLimit({ windowMs: 10 * 60_000, max: 10 }), asyncHandler(postCheckout));
paymentRouter.get("/checkout/:orderId", rateLimit({ windowMs: 60_000, max: 40 }), asyncHandler(getCheckoutStatus));
// Called by Midtrans servers; authenticated by the notification signature, not by cookies.
paymentRouter.post("/payment/webhook", asyncHandler(postMidtransWebhook));
