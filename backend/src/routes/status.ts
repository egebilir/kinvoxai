import { Router, type Request, type Response } from "express";

export const statusRouter = Router();

statusRouter.get("/:jobId", async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    // TODO: Look up job status from Bull queue
    res.json({
      jobId,
      status: "pending",
      progress: 0,
      result: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

statusRouter.get("/", async (_req: Request, res: Response) => {
  res.json({
    message: "Provide a jobId: GET /api/status/:jobId",
  });
});
