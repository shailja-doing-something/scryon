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
    (d) => showTeams.has(d.whichTeam) || !d.whichTeam
  ) ?? [];

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
      await fetch("/api/cron/generate-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}`,
        },
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(123, 92, 240, 0.1)", border: "1px solid rgba(123, 92, 240, 0.2)" }}>
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-hi mb-2">No brief yet</h1>
          <p className="text-mid text-sm max-w-sm">
            Trigger the cron endpoint or wait for the scheduled run.
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={generating}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-all"
          style={{ background: "linear-gradient(135deg, #7B5CF0, #A78BFA)" }}
        >
          {generating ? "Generating…" : "Generate Brief Now"}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-xs text-lo mb-1 uppercase tracking-wider">{dateStr}</p>
          <h1 className="text-2xl font-bold text-hi">Daily AI Intelligence Brief</h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={focusArea}
            onChange={(e) => setFocusArea(e.target.value)}
            placeholder="Focus area (optional)"
            className="text-sm px-3 py-2 bg-elevated border border-rim rounded-lg text-hi placeholder-lo focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent w-44 transition-colors"
          />
          <button
            onClick={handleRegenerate}
            disabled={generating}
            className="px-3 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40 transition-all"
            style={{ background: "linear-gradient(135deg, #7B5CF0, #A78BFA)" }}
          >
            {generating ? "…" : "Regenerate"}
          </button>
        </div>
      </div>

      {/* Team filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-lo font-medium uppercase tracking-wider">Filter:</span>
        {TEAMS.map((team) => (
          <button
            key={team}
            onClick={() => toggleTeam(team)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              showTeams.has(team)
                ? "text-white border-accent/50"
                : "text-mid border-rim hover:border-accent/30 hover:text-hi"
            }`}
            style={showTeams.has(team) ? { background: "rgba(123, 92, 240, 0.2)" } : {}}
          >
            {team}
          </button>
        ))}
      </div>

      {/* Developments */}
      <div className="space-y-4">
        {filteredDevelopments.map((dev) => (
          <DevelopmentCard key={dev.id} dev={dev} currentUserId={currentUserId} />
        ))}
      </div>

      {/* Pattern watch */}
      {patternSummary.length > 0 && (
        <section className="bg-surface border border-rim rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-hi mb-3">Pattern Watch</h2>
          <div className="flex flex-wrap gap-2">
            {patternSummary.map((p) => (
              <span
                key={p.id}
                className="px-3 py-1 rounded-full text-xs font-medium text-accent-hi"
                style={{ background: "rgba(123, 92, 240, 0.12)", border: "1px solid rgba(123, 92, 240, 0.2)" }}
              >
                {p.theme}
                <span className="ml-1.5 text-lo">×{p.frequency}</span>
              </span>
            ))}
          </div>
          <p className="text-xs text-lo mt-3">Themes appearing 3+ days — strategy-worthy</p>
        </section>
      )}

      {/* Export */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={handleCopySlack}
          className="px-4 py-2 text-sm border border-rim rounded-lg hover:bg-elevated font-medium text-mid hover:text-hi transition-all"
        >
          {slackCopied ? "Copied!" : "Copy for Slack"}
        </button>
        <a
          href={`/api/export/pdf?briefId=${brief.id}`}
          className="px-4 py-2 text-sm border border-rim rounded-lg hover:bg-elevated font-medium text-mid hover:text-hi transition-all"
        >
          Export Brief
        </a>
      </div>
    </div>
  );
}
