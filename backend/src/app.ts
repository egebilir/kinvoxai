import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { healthRouter } from "./routes/health";
import { generateRouter } from "./routes/generate";
import { statusRouter } from "./routes/status";
import { generateImagesRouter } from "./routes/generateImages";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Static files — serve generated images
app.use("/images", express.static(path.resolve(__dirname, "../public/images")));

// Routes
app.use("/api/health", healthRouter);
app.use("/api/generate", generateRouter);
app.use("/api/generate-images", generateImagesRouter);
app.use("/api/status", statusRouter);

// Error handling
app.use(errorHandler);

export default app;
