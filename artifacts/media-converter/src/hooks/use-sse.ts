import { useState, useEffect, useCallback, useRef } from "react";
import { subscribeToProgress } from "@workspace/api-client-react";

export interface ProgressState {
  percent: number;
  speed?: string;
  eta?: number;
  status: "idle" | "processing" | "completed" | "failed";
  fileName?: string;
  fileSize?: number;
  message?: string;
}

export function useSSE(jobId: string | null) {
  const [progress, setProgress] = useState<ProgressState>({
    percent: 0,
    status: "idle",
  });
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const reset = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setProgress({ percent: 0, status: "idle" });
  }, []);

  useEffect(() => {
    if (!jobId) {
      reset();
      return;
    }

    setProgress({ percent: 0, status: "processing" });

    const unsubscribe = subscribeToProgress(jobId, {
      onProgress: (percent, speed, eta) => {
        setProgress((prev) => ({
          ...prev,
          percent,
          speed,
          eta,
          status: "processing",
        }));
      },
      onComplete: (fileName, fileSize) => {
        setProgress((prev) => ({
          ...prev,
          percent: 100,
          fileName,
          fileSize,
          status: "completed",
        }));
      },
      onError: (message) => {
        setProgress((prev) => ({
          ...prev,
          status: "failed",
          message,
        }));
      },
      onInfo: (message) => {
        setProgress((prev) => ({
          ...prev,
          message,
        }));
      },
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
    };
  }, [jobId, reset]);

  return { progress, reset };
}
