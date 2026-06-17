import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDatabase } from "./config/database";
import { connectRedis } from "./config/redis";

const PORT = parseInt(process.env.BACKEND_PORT || "3001", 10);

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();
    console.log("✅ PostgreSQL connected");

    await connectRedis();
    console.log("✅ Redis connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 KinvoxAI backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();
