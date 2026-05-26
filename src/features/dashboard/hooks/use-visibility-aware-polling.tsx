"use client";

import { useEffect, useRef } from "react";

type PollTask = (signal: AbortSignal) => void | Promise<void>;

type VisibilityAwarePollingOptions = {
  enabled: boolean;
  intervalMs: number;
  task: PollTask;
  hiddenIntervalMs?: number | null;
  initialDelayMs?: number;
};

export function useVisibilityAwarePolling(options: VisibilityAwarePollingOptions) {
  const {
    enabled,
    intervalMs,
    task,
    hiddenIntervalMs = null,
    initialDelayMs = 0,
  } = options;
  const taskRef = useRef(task);

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: number | null = null;
    let controller: AbortController | null = null;

    const clearTimer = () => {
      if (timer === null) return;
      window.clearTimeout(timer);
      timer = null;
    };

    const isVisible = () => document.visibilityState === "visible";
    const nextDelay = () => isVisible() ? intervalMs : hiddenIntervalMs;

    const schedule = (delay: number | null) => {
      clearTimer();
      if (cancelled || delay === null) return;
      timer = window.setTimeout(run, Math.max(0, delay));
    };

    const finish = (activeController: AbortController) => {
      if (controller === activeController) controller = null;
      if (!cancelled) schedule(nextDelay());
    };

    const run = () => {
      if (cancelled || controller) return;
      if (!isVisible() && hiddenIntervalMs === null) {
        schedule(null);
        return;
      }

      const activeController = new AbortController();
      controller = activeController;
      Promise.resolve(taskRef.current(activeController.signal))
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          if (error instanceof Error && error.name === "AbortError") return;
          console.warn("[dashboard] polling task failed", error);
        })
        .finally(() => finish(activeController));
    };

    const handleVisibilityChange = () => {
      if (cancelled) return;
      if (!isVisible()) {
        if (controller) controller.abort();
        schedule(hiddenIntervalMs);
        return;
      }
      schedule(0);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    schedule(initialDelayMs);

    return () => {
      cancelled = true;
      clearTimer();
      if (controller) controller.abort();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, hiddenIntervalMs, initialDelayMs, intervalMs]);
}
