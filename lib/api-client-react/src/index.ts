import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from "@tanstack/react-query";
import type {
  HealthResponse,
  MediaInfoRequest,
  MediaInfoResponse,
  ConvertRequest,
  ConvertResponse,
  ErrorResponse,
} from "@workspace/api-zod";

// ─── API Base ────────────────────────────────────────────────────────────────

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:3000";
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const err: ErrorResponse = await res.json().catch(() => ({
      error: `HTTP ${res.status}`,
    }));
    throw new Error(err.error);
  }

  return res.json();
}

// ─── Health ──────────────────────────────────────────────────────────────────

export function useHealthCheck(
  options?: Omit<UseQueryOptions<HealthResponse>, "queryKey" | "queryFn">
) {
  return useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: () => apiFetch<HealthResponse>("/api/healthz"),
    refetchInterval: 30_000,
    ...options,
  });
}

// ─── Media Info ──────────────────────────────────────────────────────────────

export function useMediaInfo(
  options?: Omit<UseMutationOptions<MediaInfoResponse, Error, MediaInfoRequest>, "mutationFn">
) {
  return useMutation<MediaInfoResponse, Error, MediaInfoRequest>({
    mutationFn: (data) =>
      apiFetch<MediaInfoResponse>("/api/media/info", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    ...options,
  });
}

// ─── Convert ─────────────────────────────────────────────────────────────────

export function useStartConversion(
  options?: Omit<UseMutationOptions<ConvertResponse, Error, ConvertRequest>, "mutationFn">
) {
  return useMutation<ConvertResponse, Error, ConvertRequest>({
    mutationFn: (data) =>
      apiFetch<ConvertResponse>("/api/media/convert", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    ...options,
  });
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export function useUploadFile(
  options?: Omit<
    UseMutationOptions<ConvertResponse, Error, FormData>,
    "mutationFn"
  >
) {
  return useMutation<ConvertResponse, Error, FormData>({
    mutationFn: (formData) =>
      fetch(`${getBaseUrl()}/api/media/upload`, {
        method: "POST",
        body: formData,
      }).then(async (res) => {
        if (!res.ok) {
          const err: ErrorResponse = await res.json().catch(() => ({
            error: `HTTP ${res.status}`,
          }));
          throw new Error(err.error);
        }
        return res.json();
      }),
    ...options,
  });
}

// ─── SSE (progress) ──────────────────────────────────────────────────────────

export interface SSEEventCallback {
  onProgress?: (percent: number, speed?: string, eta?: number) => void;
  onComplete?: (fileName: string, fileSize?: number) => void;
  onError?: (message: string) => void;
  onInfo?: (message: string) => void;
}

export function subscribeToProgress(
  jobId: string,
  callbacks: SSEEventCallback
): () => void {
  const url = `${getBaseUrl()}/api/media/progress/${jobId}`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener("progress", (e) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onProgress?.(data.percent, data.speed, data.eta);
    } catch {
      // ignore parse errors
    }
  });

  eventSource.addEventListener("complete", (e) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onComplete?.(data.fileName, data.fileSize);
      eventSource.close();
    } catch {
      // ignore
    }
  });

  eventSource.addEventListener("error", (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data);
      callbacks.onError?.(data.message || "Une erreur est survenue");
    } catch {
      callbacks.onError?.("Erreur de connexion SSE");
    }
    eventSource.close();
  });

  eventSource.addEventListener("info", (e) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onInfo?.(data.message);
    } catch {
      // ignore
    }
  });

  return () => {
    eventSource.close();
  };
}
