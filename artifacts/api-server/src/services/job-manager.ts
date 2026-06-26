import { type Job, type JobStatus, type SSEClient } from "../types/job.js";
import { v4 as uuid } from "uuid";

const jobs = new Map<string, Job>();
const sseClients = new Map<string, Set<SSEClient>>();

export function createJob(format: string, quality: string, url?: string): Job {
  const job: Job = {
    id: uuid(),
    status: "queued",
    url,
    format,
    quality,
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  jobs.set(job.id, job);
  sseClients.set(job.id, new Set());
  return job;
}

export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

export function updateJob(
  jobId: string,
  updates: Partial<Omit<Job, "id" | "createdAt">>
): Job | undefined {
  const job = jobs.get(jobId);
  if (!job) return undefined;
  Object.assign(job, updates, { updatedAt: new Date() });
  return job;
}

export function removeJob(jobId: string): void {
  jobs.delete(jobId);
  sseClients.delete(jobId);
}

// ─── SSE ─────────────────────────────────────────────────────────────────────

export function addSSEClient(jobId: string, client: SSEClient): void {
  const clients = sseClients.get(jobId);
  if (clients) {
    clients.add(client);
  }
}

export function removeSSEClient(jobId: string, clientId: string): void {
  const clients = sseClients.get(jobId);
  if (clients) {
    for (const c of clients) {
      if (c.id === clientId) {
        clients.delete(c);
        break;
      }
    }
    if (clients.size === 0) {
      sseClients.delete(jobId);
    }
  }
}

export function sendSSEEvent(
  jobId: string,
  event: string,
  data: Record<string, unknown>
): void {
  const clients = sseClients.get(jobId);
  if (!clients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

// Cleanup old jobs periodically (every 10 minutes, remove jobs older than 1 hour)
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (now - job.createdAt.getTime() > oneHour) {
      removeJob(id);
    }
  }
}, 10 * 60 * 1000);
