"use client";

import { useCallback, useEffect, useState } from "react";
import { Show, SignInButton, useAuth, UserButton } from "@clerk/nextjs";
import { AgentRunTrace } from "@/components/AgentRunTrace";

type AgentRun = {
  id: string;
  query: string;
  status: string;
  cost_usd: number;
  iteration_count: number;
  created_at: string;
};

function TriggerForm({ onRunStarted }: { onRunStarted: (jobId: string) => void }) {
  const { getToken } = useAuth();
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/agent/run?query=${encodeURIComponent(query)}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      onRunStarted(data.job_id);
      setQuery("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border-2 border-line bg-card p-2 focus-within:border-brand transition-colors">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a research question…"
          className="flex-1 bg-transparent px-3 py-3 text-ink placeholder:text-ink-soft/60 outline-none"
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting || !query.trim()}
          className="font-display font-medium px-6 py-3 rounded-xl bg-brand text-white hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Starting…" : "Run"}
        </button>
      </div>
      {error && <p className="text-coral text-sm mt-2">{error}</p>}
    </form>
  );
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function statusStyles(status: string) {
  if (status === "FAILED") {
    return { border: "border-l-coral", text: "text-coral" };
  }
  if (status === "COMPLETED") {
    return { border: "border-l-teal", text: "text-teal" };
  }
  // RUNNING / PENDING / anything else in-flight
  return { border: "border-l-amber", text: "text-amber" };
}

function RunHistory({ refreshKey }: { refreshKey: number }) {
  const { getToken } = useAuth();
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRuns() {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/agent/runs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(`Couldn't load run history (${res.status})`);
        setLoading(false);
        return;
      }
      setRuns(await res.json());
      setLoading(false);
    }
    fetchRuns().catch((err) => {
      setError(err.message);
      setLoading(false);
    });
  }, [getToken, refreshKey]);

  if (loading) {
    return <p className="text-sm text-ink-soft">Loading history…</p>;
  }

  if (error) {
    return <p className="text-sm text-coral">{error}</p>;
  }

  if (runs.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        No runs yet — ask something above to see the agent think.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {runs.map((run) => {
        const styles = statusStyles(run.status);
        return (
          <li
            key={run.id}
            className={`rounded-xl border-l-4 bg-card p-4 ${styles.border} border-y border-r border-line`}
          >
            <p className="text-sm text-ink">{run.query}</p>
            <p className="font-mono text-xs text-ink-soft mt-3 flex flex-wrap gap-x-3">
              <span className={styles.text}>{run.status}</span>
              <span>{run.iteration_count} steps</span>
              <span>${run.cost_usd.toFixed(4)}</span>
              <span className="text-ink-soft/70">{formatRelativeTime(run.created_at)}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export default function Home() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRunStarted = useCallback((jobId: string) => {
    setActiveJobId(jobId);
  }, []);

  const handleRunFinished = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);


  return (
    <main className="min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-10">
          <h1 className="font-display text-xl font-bold text-ink tracking-tight">
            Research Agent
          </h1>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>

        <Show when="signed-out">
          <div className="rounded-2xl border-2 border-dashed border-line p-10 text-center">
            <p className="font-display text-lg font-medium text-ink mb-2">
              Sign in to start researching
            </p>
            <p className="text-sm text-ink-soft mb-5">
              Your agent runs, complete with live traces and history, are tied to your account.
            </p>
            <SignInButton mode="modal">
              <button className="font-display font-medium px-6 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-dark transition-colors">
                Sign in
              </button>
            </SignInButton>
          </div>
        </Show>

        <Show when="signed-in">
          <TriggerForm onRunStarted={handleRunStarted} />

          {activeJobId && (
            <AgentRunTrace
              key={activeJobId}
              jobId={activeJobId}
              onFinished={handleRunFinished}
            />
          )}

          <h2 className="font-display text-sm font-medium text-ink-soft uppercase tracking-wide mb-3">
            History
          </h2>
          <RunHistory refreshKey={refreshKey} />
        </Show>
      </div>
    </main>
  );
}
