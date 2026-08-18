"use client";

import { useEffect, useRef, useState } from "react";
import { getToolMeta } from "@/lib/toolMeta";

type ProgressEvent =
  | { event: "plan_generated"; plan_steps: string[] }
  | { event: "step_completed"; step: string; tool_used: string; result_preview: string }
  | { event: "stopped_early"; reason: string }
  | { event: "run_completed"; final_answer: string };

export function AgentRunTrace({
  jobId,
  onFinished,
}: {
  jobId: string;
  onFinished: () => void;
}) {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "open" | "closed" | "error"
  >("connecting");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setEvents([]);
    setConnectionState("connecting");

    const wsUrl = process.env.NEXT_PUBLIC_API_URL!.replace(/^http/, "ws");
    const ws = new WebSocket(`${wsUrl}/ws/agent/run/${jobId}`);
    wsRef.current = ws;

    ws.onopen = () => setConnectionState("open");

    ws.onmessage = (msg) => {
      const data: ProgressEvent = JSON.parse(msg.data);
      setEvents((prev) => [...prev, data]);
      if (data.event === "run_completed" || data.event === "stopped_early") {
        onFinished();
      }
    };

    ws.onerror = () => setConnectionState("error");
    ws.onclose = () => setConnectionState("closed");

    return () => ws.close();
  }, [jobId, onFinished]);

  const finished = events.some(
    (e) => e.event === "run_completed" || e.event === "stopped_early"
  );

  return (
    <div className="rounded-2xl border border-line bg-card p-5 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`h-2 w-2 rounded-full ${
            connectionState === "open"
              ? "bg-teal"
              : connectionState === "error"
              ? "bg-coral"
              : "bg-ink-soft"
          }`}
        />
        <p className="font-mono text-xs text-ink-soft uppercase tracking-wide">
          {connectionState === "open" && !finished
            ? "watching live"
            : connectionState}
        </p>
      </div>

      {events.length === 0 && connectionState !== "error" && (
        <p className="text-sm text-ink-soft">Waiting for the agent to start thinking…</p>
      )}
      {connectionState === "error" && (
        <p className="text-sm text-coral">
          Couldn&rsquo;t reach the live trace stream. The run may still finish — check history shortly.
        </p>
      )}

      <ol className="space-y-4">
        {events.map((e, i) => (
          <TraceEntry
            key={i}
            event={e}
            active={connectionState === "open" && !finished && i === events.length - 1}
          />
        ))}
      </ol>
    </div>
  );
}

function TraceEntry({ event, active }: { event: ProgressEvent; active: boolean }) {
  if (event.event === "plan_generated") {
    return (
      <li className="relative pl-6 trace-entry">
        <span className="trace-line" />
        <span className="trace-dot absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full bg-brand" />
        <p className="font-display text-sm font-medium text-ink">Plan</p>
        <ul className="mt-1.5 space-y-1">
          {event.plan_steps.map((s, i) => (
            <li key={i} className="text-sm text-ink-soft">
              {i + 1}. {s}
            </li>
          ))}
        </ul>
      </li>
    );
  }

  if (event.event === "step_completed") {
    const meta = getToolMeta(event.tool_used);
    return (
      <li className="relative pl-6 trace-entry">
        <span className="trace-line" />
        <span
          className={`trace-dot ${active ? "trace-dot--active" : ""} absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full ${meta.dot}`}
        />
        <span
          className={`inline-block font-mono text-[11px] px-2 py-0.5 rounded-full ${meta.bg} ${meta.text} mb-1`}
        >
          {meta.label}
        </span>
        <p className="text-sm text-ink">{event.step}</p>
        <p className="text-xs text-ink-soft mt-1 line-clamp-2">{event.result_preview}</p>
      </li>
    );
  }

  if (event.event === "stopped_early") {
    return (
      <li className="relative pl-6 trace-entry">
        <span className="trace-dot absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full bg-amber" />
        <p className="text-sm text-amber font-medium">Stopped early — {event.reason}</p>
      </li>
    );
  }

  // run_completed
  return (
    <li className="relative pl-6 trace-entry">
      <span className="trace-dot absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full bg-brand" />
      <p className="font-display text-sm font-medium text-ink mb-1">Answer</p>
      <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
        {event.final_answer}
      </p>
    </li>
  );
}
