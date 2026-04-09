"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { DevelopmentCard } from "@/components/DevelopmentCard";
import { formatSlackMessage } from "@/lib/formatter";

interface Idea {
  id: string;
  type: string;
  text: string;
  status: string;
}

interface Comment {
  id: string;
  text: string;
  createdAt: Date | string;
  user: { id: string; name: string | null; email: string };
}

interface Development {
  id: string;
  rank: number;
  title: string;
  summary: string;
  sourceUrl: string;
  scores: string;
  whichTeam: string;
  fitInFello: string;
  prototypeThis: string;
  ignoreConsequence: string;
  whyNow?: string | null;
  ideas: Idea[];
  comments: Comment[];
  _count: { upvotes: number };
}

interface Brief {
  id: string;
  date: Date | string;
  generatedAt?: Date | string;
  focusArea: string;
  status: string;
  topActions?: string | null;
  developments: Development[];
}

interface Pattern {
  id: string;
  theme: string;
  frequency: number;
  lastSeen: Date | string;
}

interface TopAction {
  action: string;
  timeEstimate: string;
  developmentTitle: string;
}

interface Props {
  brief: Brief | null;
  patternSummary: Pattern[];
  currentUserId: string;
  hasFailed?: boolean;
}

// Filter labels — "All" is the selector that shows everything
const FILTER_OPTIONS = ["All", "Product", "GTM AI", "Leadership"] as const;
type FilterOption = (typeof FILTER_OPTIONS)[number];

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function DashboardClient({ brief, patternSummary, currentUserId, hasFailed }: Props) {
  const [focusArea, setFocusArea] = useState(brief?.focusArea ?? "");
  const [generating, setGenerating] = useState(false);
  const [slackCopied, setSlackCopied] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("All");

  const filteredDevelopments = brief?.developments.filter((d) => {
    if (activeFilter === "All") return true;
    if (d.whichTeam === "Both") {
      return activeFilter === "Product" || activeFilter === "GTM AI";
    }
    return d.whichTeam === activeFilter;
  }) ?? [];

  async function handleRegenerate() {
    if (!confirm("Regenerate today's brief? This will call Gemini API and may take a few minutes.")) return;
    setGenerating(true);
    try {
      await fetch("/api/briefs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focusArea }),
      });
      window.location.reload();
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopySlack() {
    if (!brief) return;
    const msg = formatSlackMessage(brief);
    await navigator.clipboard.writeText(msg);
    setSlackCopied(true);
    setTimeout(() => setSlackCopied(false), 2000);
  }

  if (!brief) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
        <div className="text-center animate-fade-up">
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center animate-pulse-glow"
            style={{
              background: "rgba(123,92,240,0.08)",
              border: "1px solid rgba(123,92,240,0.2)",
            }}
          >
            <svg className="w-10 h-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-hi mb-3">No brief yet</h1>
          <p className="text-mid text-sm max-w-sm mx-auto">
            Run the intelligence pipeline to analyze the latest AI developments for Fello.
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={generating}
          className="btn-primary px-8 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center gap-2"
        >
          {generating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Brief Now
            </>
          )}
        </button>
      </div>
    );
  }

  // ── Date formatting ─────────────────────────────────────────────────────
  const briefDate = new Date(brief.date);
  const dayName = briefDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const monthName = briefDate.toLocaleDateString("en-US", { month: "long" }).toLowerCase();
  const dayNum = briefDate.getDate();
  const isJan1 = briefDate.getMonth() === 0 && briefDate.getDate() === 1;
  const dateDisplay = isJan1
    ? `${dayName}, ${monthName} ${dayNum}, ${briefDate.getFullYear()}`
    : `${dayName}, ${monthName} ${dayNum}`;

  // ── Status bar stats ────────────────────────────────────────────────────
  const avgScore = brief.developments.length
    ? brief.developments.reduce((sum, d) => {
        const s = JSON.parse(d.scores || "{}") as { weighted?: number };
        return sum + (s.weighted ?? 0);
      }, 0) / brief.developments.length
    : 0;

  const allIdeas = brief.developments.flatMap((d) => d.ideas);
  const consideringCount = allIdeas.filter((i) => i.status === "CONSIDERING").length;
  const prototypingCount = allIdeas.filter((i) => i.status === "PROTOTYPING").length;
  const workedCount = allIdeas.filter((i) => i.status === "WORKED").length;
  const generatedAt = brief.generatedAt ?? brief.date;

  // ── Top actions ─────────────────────────────────────────────────────────
  const topActions: TopAction[] = (() => {
    if (!brief.topActions) return [];
    try {
      const parsed = JSON.parse(brief.topActions) as { actions?: TopAction[] };
      return parsed.actions ?? [];
    } catch {
      return [];
    }
  })();

  return (
    <div className="space-y-5">
      {/* Failed brief banner */}
      {hasFailed && (
        <div
          className="flex items-center justify-between animate-fade-up"
          style={{
            background: "#1A0F0F",
            border: "1px solid #3D1515",
            borderLeft: "3px solid #EF4444",
            borderRadius: 12,
            padding: "14px 20px",
          }}
        >
          <span style={{ fontSize: 13, color: "#F87171" }}>
            Today&apos;s brief failed to generate — Gemini was unavailable.
          </span>
          <button
            onClick={handleRegenerate}
            disabled={generating}
            className="flex items-center gap-1.5 disabled:opacity-40"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#F87171",
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            {generating ? "Generating…" : "Try again"}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <p className="text-[13px] text-lo font-normal uppercase tracking-[0.06em] mb-1">
              scryon brief
            </p>
            <h1 className="text-[28px] font-medium text-hi leading-tight">
              {dateDisplay}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              placeholder="Focus area…"
              className="input-dark text-sm px-3 py-2 rounded-xl w-44"
            />
            <button
              onClick={handleRegenerate}
              disabled={generating}
              className="btn-primary px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-40 flex items-center gap-1.5"
            >
              {generating ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Regenerate
            </button>
          </div>
        </div>
      </div>

      {/* Slim status bar */}
      <div
        className="flex items-center justify-between animate-fade-up"
        style={{
          height: 40,
          background: "#0F0F1A",
          border: "1px solid #2A2A45",
          borderRadius: 10,
          padding: "0 20px",
          fontSize: 13,
          color: "#8888AA",
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: "#F0F0FF", fontWeight: 500 }}>{avgScore.toFixed(1)}</span>
          <span>avg signal</span>
          <span style={{ color: "#3A3A60" }}>·</span>
          <span style={{ color: "#F0F0FF", fontWeight: 500 }}>{brief.developments.length}</span>
          <span>developments</span>
          <span style={{ color: "#3A3A60" }}>·</span>
          <span>generated {timeAgo(generatedAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: "#F0F0FF", fontWeight: 500 }}>{consideringCount}</span>
          <span>considering</span>
          <span style={{ color: "#3A3A60" }}>·</span>
          <span style={{ color: "#F0F0FF", fontWeight: 500 }}>{prototypingCount}</span>
          <span>prototyping</span>
          <span style={{ color: "#3A3A60" }}>·</span>
          <span style={{ color: "#F0F0FF", fontWeight: 500 }}>{workedCount}</span>
          <span>worked</span>
        </div>
      </div>

      {/* Top Actions Today */}
      {topActions.length > 0 && (
        <div
          className="rounded-2xl animate-fade-up"
          style={{
            background: "#0F0F1A",
            border: "1px solid #2A2A45",
            borderLeft: "3px solid #7B5CF0",
            padding: "20px 24px",
          }}
        >
          <p className="text-[11px] text-lo uppercase tracking-[0.08em] font-semibold mb-4">
            Top Actions Today
          </p>
          <div className="space-y-4">
            {topActions.map((a, i) => (
              <div key={i} className="flex gap-3">
                <div
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{ background: "rgba(123,92,240,0.18)", color: "#A78BFA" }}
                >
                  {i + 1}
                </div>
                <p className="text-[14px] font-medium text-hi leading-snug">
                  {a.action.length > 70 ? a.action.slice(0, 70) + "…" : a.action}
                  <span className="ml-2 text-[12px] font-normal text-accent">
                    → {a.timeEstimate}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team filters */}
      <div className="flex flex-wrap items-center gap-2 animate-fade-up" style={{ marginBottom: 4 }}>
        <span className="text-xs text-lo font-semibold uppercase tracking-widest">Filter:</span>
        {FILTER_OPTIONS.map((option) => {
          const isActive = activeFilter === option;
          return (
            <button
              key={option}
              onClick={() => setActiveFilter(option)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
              style={
                isActive
                  ? {
                      background: "#1E1640",
                      border: "1px solid #3D2E7A",
                      color: "#A78BFA",
                    }
                  : {
                      background: "transparent",
                      border: "1px solid #2A2A45",
                      color: "#8888AA",
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = "#16162A";
                  (e.currentTarget as HTMLButtonElement).style.color = "#F0F0FF";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "#8888AA";
                }
              }}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* Developments */}
      <div className="space-y-3">
        {filteredDevelopments.map((dev, i) => (
          <div
            key={dev.id}
            className="animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <DevelopmentCard dev={dev} currentUserId={currentUserId} />
          </div>
        ))}
        {filteredDevelopments.length === 0 && (
          <p className="text-sm text-lo text-center py-8">
            No developments tagged for {activeFilter}.
          </p>
        )}
      </div>

      {/* Pattern watch */}
      {patternSummary.length > 0 && (
        <section
          className="rounded-2xl p-5 animate-fade-up"
          style={{ background: "#0F0F1A", border: "1px solid #2A2A45" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw size={14} className="text-lo" />
            <h2 className="text-sm font-semibold text-hi">Pattern Watch</h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium text-warn"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              Strategy-worthy
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {patternSummary.map((p) => (
              <span
                key={p.id}
                className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 text-accent-hi"
                style={{
                  background: "rgba(123,92,240,0.10)",
                  border: "1px solid rgba(123,92,240,0.22)",
                }}
              >
                {p.theme}
                <span
                  className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                  style={{ background: "rgba(123,92,240,0.25)", color: "#C4B5FD" }}
                >
                  {p.frequency}
                </span>
              </span>
            ))}
          </div>
          <p className="text-xs text-lo mt-3">Themes appearing 3+ days — elevate to strategy</p>
        </section>
      )}

      {/* Export actions */}
      <div className="flex flex-wrap gap-3 pt-1">
        <button
          onClick={handleCopySlack}
          className="btn-ghost px-4 py-2 text-sm rounded-xl font-medium flex items-center gap-2"
        >
          {slackCopied ? (
            <>
              <svg className="w-4 h-4 text-ok" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy for Slack
            </>
          )}
        </button>
        <a
          href={`/api/export/pdf?briefId=${brief.id}`}
          className="btn-ghost px-4 py-2 text-sm rounded-xl font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export Brief
        </a>
      </div>
    </div>
  );
}
