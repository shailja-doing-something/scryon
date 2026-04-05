"use client";

import { useState } from "react";
import { Zap, Rocket, AlertTriangle } from "lucide-react";
import { ScoreBar } from "@/components/ScoreBar";
import { TeamBadge } from "@/components/TeamBadge";

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

interface Scores {
  relevance: number;
  deployability: number;
  competitive: number;
  costImpact: number;
  weighted: number;
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

interface Props {
  dev: Development;
  currentUserId: string;
  onAddToTracker?: (ideaId: string) => void;
}

export function DevelopmentCard({ dev, currentUserId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(dev._count.upvotes);
  const [upvoted, setUpvoted] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(dev.comments);
  const [submitting, setSubmitting] = useState(false);
  const [hovered, setHovered] = useState(false);

  const scores: Scores = JSON.parse(dev.scores || "{}") as Scores;
  const immediate = dev.ideas.filter((i) => i.type === "IMMEDIATE");
  const strategic = dev.ideas.filter((i) => i.type === "STRATEGIC");
  const wild = dev.ideas.find((i) => i.type === "WILD");

  const scorePercent = scores.weighted ? Math.round((scores.weighted / 10) * 100) : 0;

  async function handleUpvote() {
    const res = await fetch(`/api/developments/${dev.id}/upvote`, { method: "POST" });
    if (res.ok) {
      const data = (await res.json()) as { data: { upvoted: boolean; count: number } };
      setUpvoted(data.data.upvoted);
      setUpvoteCount(data.data.count);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/developments/${dev.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: commentText }),
    });
    if (res.ok) {
      const data = (await res.json()) as { data: Comment };
      setComments((prev) => [data.data, ...prev]);
      setCommentText("");
    }
    setSubmitting(false);
  }

  void currentUserId;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: hovered
          ? "linear-gradient(135deg, rgba(123,92,240,0.05), rgba(15,15,26,1))"
          : "#0F0F1A",
        border: `1px solid ${hovered ? "rgba(123,92,240,0.35)" : "#2A2A45"}`,
        boxShadow: hovered
          ? "0 8px 32px rgba(123,92,240,0.12), 0 0 0 1px rgba(123,92,240,0.15)"
          : "none",
        transform: hovered ? "translateY(-2px)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start gap-3">
          {/* Rank badge */}
          <div
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #7B5CF0, #A78BFA)" }}
          >
            <span className="relative z-10">#{dev.rank}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h3 className="text-base font-semibold text-hi leading-snug">{dev.title}</h3>
              <TeamBadge team={dev.whichTeam} />
            </div>
            <p className="text-sm text-mid leading-relaxed">{dev.summary}</p>
            {dev.sourceUrl && (
              <a
                href={dev.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent-hi hover:text-accent mt-1.5 transition-colors"
              >
                View source
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>

          {/* Score pill */}
          {scores.weighted > 0 && (
            <div className="flex-shrink-0 flex flex-col items-center">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm font-mono"
                style={{
                  background: `conic-gradient(#7B5CF0 ${scorePercent * 3.6}deg, rgba(42,42,69,0.8) 0deg)`,
                  padding: "2px",
                }}
              >
                <div
                  className="w-full h-full rounded-[10px] flex items-center justify-center"
                  style={{ background: "#0F0F1A", color: "#A78BFA" }}
                >
                  {scores.weighted.toFixed(1)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mini score bars (always visible) */}
        {scores.weighted > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
            <ScoreBar label="Relevance"     value={scores.relevance ?? 0}    color="bg-indigo-400" delay={0} />
            <ScoreBar label="Deployability" value={scores.deployability ?? 0} color="bg-blue-400"   delay={80} />
            <ScoreBar label="Competitive"   value={scores.competitive ?? 0}  color="bg-purple-400" delay={160} />
            <ScoreBar label="Cost/Impact"   value={scores.costImpact ?? 0}   color="bg-green-400"  delay={240} />
          </div>
        )}
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-5 py-2.5 text-xs flex items-center gap-2 transition-all duration-200"
        style={{
          borderTop: "1px solid #2A2A45",
          color: expanded ? "#A78BFA" : "#55557A",
          background: expanded ? "rgba(123,92,240,0.04)" : "transparent",
        }}
      >
        <svg
          className="w-3.5 h-3.5 transition-transform duration-300"
          style={{ transform: expanded ? "rotate(180deg)" : "none" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <span>{expanded ? "Collapse analysis" : "Show full analysis"}</span>
        <span className="ml-auto flex items-center gap-3">
          {/* Ideas count */}
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {dev.ideas.length} ideas
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {comments.length}
          </span>
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="animate-fade-up px-5 pb-5 space-y-5" style={{ borderTop: "1px solid #1E1E35" }}>
          {/* Where it fits */}
          {dev.fitInFello && (
            <section className="pt-5">
              <h4 className="text-xs font-semibold text-lo uppercase tracking-widest mb-2.5">
                Where it fits in Fello
              </h4>
              <p className="text-sm text-mid leading-relaxed">{dev.fitInFello}</p>
            </section>
          )}

          {/* Immediate use cases */}
          {immediate.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-lo uppercase tracking-widest mb-2.5">
                Immediate Use Cases
              </h4>
              <ul className="space-y-2.5">
                {immediate.map((idea, i) => (
                  <li key={idea.id} className="flex gap-2.5 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-ok flex-shrink-0" />
                    <p className="text-sm text-mid">{idea.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Strategic bets */}
          {strategic.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-lo uppercase tracking-widest mb-2.5">
                Strategic Bets
              </h4>
              <ul className="space-y-2.5">
                {strategic.map((idea, i) => (
                  <li key={idea.id} className="flex gap-2.5 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    <p className="text-sm text-mid">{idea.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Wild idea */}
          {wild && (
            <section
              className="rounded-xl p-4 relative overflow-hidden"
              style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}
            >
              <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(245,158,11,0.1), transparent)" }} />
              <h4 className="text-xs font-semibold uppercase tracking-widest mb-2 text-warn flex items-center gap-1.5">
                <Zap size={14} /> Wild Idea
              </h4>
              <p className="text-sm text-mid">{wild.text}</p>
            </section>
          )}

          {/* Prototype this */}
          {dev.prototypeThis && (
            <section
              className="rounded-xl p-4 relative overflow-hidden"
              style={{ background: "rgba(123,92,240,0.06)", border: "1px solid rgba(123,92,240,0.18)" }}
            >
              <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(123,92,240,0.1), transparent)" }} />
              <h4 className="text-xs font-semibold uppercase tracking-widest mb-2 text-accent-hi flex items-center gap-1.5">
                <Rocket size={14} /> Prototype This Week
              </h4>
              <p className="text-sm text-mid">{dev.prototypeThis}</p>
            </section>
          )}

          {/* If we ignore this */}
          {dev.ignoreConsequence && (
            <section
              className="rounded-xl p-4 relative overflow-hidden"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}
            >
              <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(239,68,68,0.1), transparent)" }} />
              <h4 className="text-xs font-semibold uppercase tracking-widest mb-2 text-err flex items-center gap-1.5">
                <AlertTriangle size={14} /> If We Ignore This
              </h4>
              <p className="text-sm text-mid">{dev.ignoreConsequence}</p>
            </section>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-2" style={{ borderTop: "1px solid #1E1E35" }}>
            <button
              onClick={handleUpvote}
              className="flex items-center gap-2 text-sm font-medium transition-all duration-200 px-3 py-1.5 rounded-lg"
              style={{
                background: upvoted ? "rgba(123,92,240,0.15)" : "transparent",
                border: `1px solid ${upvoted ? "rgba(123,92,240,0.3)" : "#2A2A45"}`,
                color: upvoted ? "#A78BFA" : "#55557A",
              }}
            >
              <svg className="w-3.5 h-3.5" fill={upvoted ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
              <span className="font-mono">{upvoteCount}</span>
            </button>
          </div>

          {/* Comments */}
          <div>
            <h4 className="text-xs font-semibold text-lo uppercase tracking-widest mb-3">
              Discussion
            </h4>
            <form onSubmit={handleComment} className="flex gap-2 mb-3">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share a thought…"
                className="input-dark flex-1 text-sm px-3 py-2 rounded-xl"
              />
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                className="btn-primary px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-40"
              >
                Post
              </button>
            </form>
            <div className="space-y-2">
              {comments.map((c, i) => (
                <div
                  key={c.id}
                  className="animate-fade-up rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: "rgba(22,22,42,0.8)",
                    border: "1px solid #2A2A45",
                    animationDelay: `${i * 50}ms`,
                  }}
                >
                  <span className="font-semibold text-accent-hi">{c.user.name ?? c.user.email}</span>
                  <span className="text-mid ml-2">{c.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
