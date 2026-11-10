import express from "express";
import helmet from "helmet";
import path from "node:path";
import { existsSync } from "node:fs";
import { rootPath } from "./config.js";
import { taskRoutes } from "./tasks/routes.js";
import { errorHandler } from "./errors.js";

export function createApp({ repository, checkHealth = async () => {} }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "32kb" }));
  app.get("/health", async (req, res) => {
    await checkHealth();
    res.json({ status: "ok" });
  });
  app.use("/tasks", taskRoutes(repository));
  const frontendPath = path.join(rootPath, "frontend", "dist");
  if (existsSync(frontendPath)) app.use(express.static(frontendPath));
  app.use((req, res) => res.status(404).json({ error: "Маршрут не найден." }));
  app.use(errorHandler);
  return app;
}
