import { Router, type Request, type Response } from "express";
import { getDb } from "../config/database";

export const healthRouter = Router();

healthRouter.get("/", (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const row = db.prepare("SELECT datetime('now') as time").get() as { time: string };

    const jobCount = db.prepare("SELECT COUNT(*) as count FROM jobs").get() as { count: number };

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: {
          type: "sqlite",
          status: "connected",
          time: row.time,
          totalJobs: jobCount.count,
        },
        queue: {
          type: "in-memory",
          status: "running",
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: message,
    });
  }
});
