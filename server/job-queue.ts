// In-memory async job queue for portrait generation
import { randomUUID } from "crypto";

export interface Job {
  id: string;
  type: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  total: number;
  payload: any;
  result: any;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

const jobs = new Map<string, Job>();
let activeCount = 0;
const MAX_CONCURRENT = 10;
const pending: Array<() => void> = [];

let workerFn: ((job: Job) => Promise<any>) | null = null;

export function registerWorker(fn: (job: Job) => Promise<any>) {
  workerFn = fn;
}

export function enqueue(type: string, payload: any, total = 1): string {
  const id = randomUUID();
  const job: Job = { id, type, status: "pending", progress: 0, total, payload, result: null, error: null, createdAt: new Date(), completedAt: null };
  jobs.set(id, job);

  const run = async () => {
    activeCount++;
    job.status = "processing";
    try {
      if (!workerFn) throw new Error("No worker registered");
      job.result = await workerFn(job);
      job.status = "completed";
    } catch (err: any) {
      job.status = "failed";
      job.error = err.message || "Unknown error";
    } finally {
      job.completedAt = new Date();
      activeCount--;
      if (pending.length > 0) pending.shift()!();
    }
  };

  if (activeCount < MAX_CONCURRENT) {
    run();
  } else {
    pending.push(() => run());
  }

  // Auto-cleanup after 1 hour
  setTimeout(() => jobs.delete(id), 60 * 60 * 1000);

  return id;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function getJobs(ids: string[]): Job[] {
  return ids.map((id) => jobs.get(id)).filter(Boolean) as Job[];
}

export function updateJob(id: string, updates: Partial<Job>) {
  const job = jobs.get(id);
  if (job) Object.assign(job, updates);
}
