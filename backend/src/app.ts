import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { healthRouter } from "./routes/health";
import { generateRouter } from "./routes/generate";
import { statusRouter } from "./routes/status";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Routes
app.use("/api/health", healthRouter);
app.use("/api/generate", generateRouter);
app.use("/api/status", statusRouter);

// Error handling
app.use(errorHandler);

export default app;
