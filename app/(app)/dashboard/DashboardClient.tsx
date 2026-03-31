"use client";

import { useState } from "react";
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
  ideas: Idea[];
  comments: Comment[];
  _count: { upvotes: number };
}

interface Brief {
  id: string;
  date: Date | string;
  focusArea: string;
  status: string;
  developments: Development[];
}

interface Pattern {
  id: string;
  theme: string;
  frequency: number;
  lastSeen: Date | string;
}

interface Props {
  brief: Brief | null;
  patternSummary: Pattern[];
  currentUserId: string;
}

const TEAMS = ["Product", "GTM AI", "Both", "Leadership"];

export function DashboardClient({ brief, patternSummary, currentUserId }: Props) {
  const [focusArea, setFocusArea] = useState(brief?.focusArea ?? "");
  const [generating, setGenerating] = useState(false);
  const [slackCopied, setSlackCopied] = useState(false);
  const [showTeams, setShowTeams] = useState<Set<string>>(new Set(TEAMS));

  const filteredDevelopments = brief?.developments.filter(
    (d) => !d.whichTeam || !TEAMS.includes(d.whichTeam) || showTeams.has(d.whichTeam)
  ) ?? [];

  // Compute stats
  const totalIdeas = brief?.developments.reduce((sum, d) => sum + d.ideas.length, 0) ?? 0;
  const avgScore = brief?.developments.length
    ? brief.developments.reduce((sum, d) => {
        const s = JSON.parse(d.scores || "{}") as { weighted?: number };
        return sum + (s.weighted ?? 0);
      }, 0) / brief.developments.length
    : 0;
  const topDev = brief?.developments[0];

  function toggleTeam(team: string) {
    setShowTeams((prev) => {
      const next = new Set(prev);
      if (next.has(team)) next.delete(team);
      else next.add(team);
      return next;
    });
  }

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

  const dateStr = new Date(brief.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="animate-fade-up">
        <p className="text-xs text-lo uppercase tracking-widest mb-1.5">{dateStr}</p>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <h1 className="text-2xl font-bold text-hi flex-1">
            Daily AI Intelligence Brief
          </h1>
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

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 animate-fade-up delay-75">
        {[
          {
            label: "Developments",
            value: brief.developments.length,
            icon: "📊",
            color: "#7B5CF0",
          },
          {
            label: "Ideas Generated",
            value: totalIdeas,
            icon: "💡",
            color: "#A78BFA",
          },
          {
            label: "Avg Score",
            value: avgScore.toFixed(1),
            icon: "⭐",
            color: "#22C55E",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4 transition-all duration-200"
            style={{
              background: "rgba(15,15,26,0.8)",
              border: "1px solid #2A2A45",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-lo uppercase tracking-wider">{stat.label}</span>
              <span className="text-base">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold font-mono" style={{ color: stat.color }}>
              {stat.value}
            </p>
            {stat.label === "Developments" && topDev && (
              <p className="text-xs text-lo mt-1 truncate">Top: {topDev.title.slice(0, 28)}…</p>
            )}
          </div>
        ))}
      </div>

      {/* Team filters */}
      <div className="flex flex-wrap items-center gap-2 animate-fade-up delay-150">
        <span className="text-xs text-lo font-semibold uppercase tracking-widest">Filter:</span>
        {TEAMS.map((team) => {
          const active = showTeams.has(team);
          return (
            <button
              key={team}
              onClick={() => toggleTeam(team)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
              style={
                active
                  ? {
                      background: "rgba(123,92,240,0.18)",
                      border: "1px solid rgba(123,92,240,0.4)",
                      color: "#A78BFA",
                    }
                  : {
                      background: "transparent",
                      border: "1px solid #2A2A45",
                      color: "#55557A",
                    }
              }
            >
              {team}
            </button>
          );
        })}
      </div>

      {/* Developments */}
      <div className="space-y-4">
        {filteredDevelopments.map((dev, i) => (
          <div
            key={dev.id}
            className="animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <DevelopmentCard dev={dev} currentUserId={currentUserId} />
          </div>
        ))}
      </div>

      {/* Pattern watch */}
      {patternSummary.length > 0 && (
        <section
          className="rounded-2xl p-5 animate-fade-up"
          style={{ background: "#0F0F1A", border: "1px solid #2A2A45" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm">🔁</span>
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
