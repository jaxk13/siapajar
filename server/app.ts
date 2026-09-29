import express, { type Express } from "express";
import { errorHandler } from "./middleware/errorHandler";
import { apiRouter } from "./routes";

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  app.use("/api", apiRouter);
  app.use("/api", errorHandler);

  return app;
}
