import { Router, type Request, type Response } from "express";
import { getPool } from "../config/database";
import { getRedis } from "../config/redis";

export const healthRouter = Router();

healthRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const dbResult = await pool.query("SELECT NOW() as time");
    const dbTime = dbResult.rows[0]?.time as string;

    const redis = getRedis();
    const redisPing = await redis.ping();

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: { status: "connected", time: dbTime },
        redis: { status: redisPing === "PONG" ? "connected" : "error" },
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
