import { Queue, Worker, type Job } from "bullmq";
import { getRedis } from "./redis";

const QUEUE_NAME = "kinvoxai-jobs";

let jobQueue: Queue | null = null;

export function getQueue(): Queue {
  if (!jobQueue) {
    throw new Error("Queue not initialized. Call initQueue() first.");
  }
  return jobQueue;
}

export function initQueue(): Queue {
  const connection = getRedis();

  jobQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  });

  return jobQueue;
}

export function createWorker(
  processor: (job: Job) => Promise<void>
): Worker {
  const connection = getRedis();

  const worker = new Worker(QUEUE_NAME, processor, {
    connection,
    concurrency: 5,
  });

  worker.on("completed", (job: Job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
