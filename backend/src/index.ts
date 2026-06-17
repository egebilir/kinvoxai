import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import app from "./app";
import { connectDatabase } from "./config/database";
import { startWorker } from "./workers/storyWorker";

const PORT = parseInt(process.env.BACKEND_PORT || "3001", 10);

async function bootstrap(): Promise<void> {
  try {
    connectDatabase();
    console.log("✅ SQLite connected");

    startWorker();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 KinvoxAI backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();
