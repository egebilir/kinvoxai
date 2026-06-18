import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { healthRouter } from "./routes/health";
import { generateRouter } from "./routes/generate";
import { statusRouter } from "./routes/status";
import { generateImagesRouter } from "./routes/generateImages";
import { generateVideosRouter } from "./routes/generateVideos";
import { assembleVideosRouter } from "./routes/assembleVideos";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Static files — serve generated images/videos
app.use("/images", express.static(path.resolve(__dirname, "../public/images")));
app.use("/videos", express.static(path.resolve(__dirname, "../public/videos")));

// Routes
app.use("/api/health", healthRouter);
app.use("/api/generate", generateRouter);
app.use("/api/generate-images", generateImagesRouter);
app.use("/api/generate-videos", generateVideosRouter);
app.use("/api/assemble-videos", assembleVideosRouter);
app.use("/api/status", statusRouter);

// Error handling
app.use(errorHandler);

export default app;
