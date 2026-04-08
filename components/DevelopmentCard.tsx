"use client";

import { useState } from "react";
import { Zap, Rocket, AlertTriangle, Trash2 } from "lucide-react";
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
  whyNow?: string | null;
  ideas: Idea[];
  comments: Comment[];
  _count: { upvotes: number };
}

interface Props {
  dev: Development;
  currentUserId: string;
  onAddToTracker?: (ideaId: string) => void;
}

function getIdeaTitle(text: string): string {
  const idx = text.indexOf("\n");
  return idx !== -1 ? text.slice(0, idx).trim() : text.trim();
}

function cleanTitle(title: string): string {
  return title.replace(/ · .+$/, "").trim();
}

const SCORE_DOTS = [
  { key: "relevance",     color: "#818CF8", label: "Relevance" },
  { key: "deployability", color: "#60A5FA", label: "Deploy" },
  { key: "competitive",   color: "#A78BFA", label: "Compete" },
  { key: "costImpact",    color: "#34D399", label: "Cost" },
] as const;

export function DevelopmentCard({ dev, currentUserId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(dev._count.upvotes);
  const [upvoted, setUpvoted] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(dev.comments);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const scores: Scores = JSON.parse(dev.scores || "{}") as Scores;
  const immediate = dev.ideas.filter((i) => i.type === "IMMEDIATE");
  const strategic = dev.ideas.filter((i) => i.type === "STRATEGIC");
  const wild = dev.ideas.find((i) => i.type === "WILD");
  const firstImmediate = immediate[0];

  const scorePercent = scores.weighted ? Math.round((scores.weighted / 10) * 100) : 0;
  const displayTitle = cleanTitle(dev.title);

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

  async function handleDeleteComment(commentId: string) {
    setDeletingId(commentId);
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setConfirmDeleteId(null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-150"
      style={{
        background: "#0F0F1A",
        border: "1px solid #2A2A45",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3A3A60"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A45"; }}
    >
      {/* Card body */}
      <div style={{ padding: "20px 24px" }}>

        {/* Title row */}
        <div className="flex items-start gap-3">
          {/* Rank badge */}
          <div
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #7B5CF0, #A78BFA)" }}
          >
            #{dev.rank}
          </div>

          {/* Title + summary */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-hi leading-snug">{displayTitle}</h3>
            <p
              className="mt-1 leading-snug truncate"
              style={{ fontSize: 13, color: "#8888AA" }}
            >
              {dev.summary}
            </p>
          </div>

          {/* Score badge */}
          {scores.weighted > 0 && (
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm font-mono"
              style={{
                background: `conic-gradient(#7B5CF0 ${scorePercent * 3.6}deg, rgba(42,42,69,0.8) 0deg)`,
                padding: "2px",
              }}
            >
              <div
                className="w-full h-full rounded-[10px] flex items-center justify-center"
                style={{ background: "#0F0F1A", color: "#A78BFA", fontSize: 12 }}
              >
                {scores.weighted.toFixed(1)}
              </div>
            </div>
          )}
        </div>

        {/* Score bars — compact, no numbers */}
        {scores.weighted > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {SCORE_DOTS.map((d, i) => (
                <ScoreBar
                  key={d.key}
                  label={d.label}
                  value={scores[d.key] ?? 0}
                  color=""
                  delay={i * 60}
                  compact
                  dotColor={d.color}
                />
              ))}
            </div>
          </div>
        )}

        {/* Why now */}
        {dev.whyNow && (
          <p
            className="leading-snug italic"
            style={{
              marginTop: 14,
              fontSize: 12,
              color: "#F59E0B",
              borderLeft: "2px solid #F59E0B",
              paddingLeft: 8,
            }}
          >
            {dev.whyNow}
          </p>
        )}

        {/* Try this pill */}
        {firstImmediate && (
          <div style={{ marginTop: 12 }}>
            <div
              className="inline-flex items-center gap-1.5"
              style={{
                background: "#16162A",
                border: "1px solid #2A2A45",
                borderRadius: 20,
                padding: "6px 12px",
                fontSize: 12,
                color: "#F0F0FF",
              }}
            >
              <Zap size={11} color="#7B5CF0" />
              {getIdeaTitle(firstImmediate.text)}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between"
        style={{
          borderTop: "1px solid #1E1E35",
          padding: "12px 24px",
        }}
      >
        {/* Left: team badge + source link */}
        <div className="flex items-center gap-3">
          <TeamBadge team={dev.whichTeam} />
          {dev.sourceUrl && (
            <a
              href={dev.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 transition-colors"
              style={{ fontSize: 12, color: "#55557A" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#A78BFA"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#55557A"; }}
            >
              View source
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        {/* Right: expand + counts */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 transition-colors"
            style={{ fontSize: 12, color: expanded ? "#A78BFA" : "#55557A" }}
          >
            <svg
              className="w-3.5 h-3.5 transition-transform duration-200"
              style={{ transform: expanded ? "rotate(180deg)" : "none" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Full analysis
          </button>
          <span className="flex items-center gap-1" style={{ fontSize: 12, color: "#55557A" }}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {dev.ideas.length}
          </span>
          <span className="flex items-center gap-1" style={{ fontSize: 12, color: "#55557A" }}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {comments.length}
          </span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div
          className="animate-fade-up space-y-5"
          style={{ borderTop: "1px solid #1E1E35", padding: "20px 24px" }}
        >
          {/* Fello angle — first in expanded */}
          {dev.fitInFello && (
            <section>
              <p className="text-[10px] text-lo uppercase tracking-wider mb-2">Fello Angle</p>
              <p className="leading-relaxed italic" style={{ fontSize: 13, color: "#8888AA" }}>
                {dev.fitInFello}
              </p>
            </section>
          )}

          {/* Immediate use cases */}
          {immediate.length > 0 && (
            <section>
              <p className="text-[10px] text-lo uppercase tracking-wider mb-2">Immediate Use Cases</p>
              <ol className="space-y-2">
                {immediate.map((idea, i) => (
                  <li key={idea.id} className="flex gap-2.5 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <span className="flex-shrink-0 text-xs font-mono" style={{ color: "#55557A", minWidth: 16 }}>{i + 1}.</span>
                    <p className="text-sm text-mid">{idea.text}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Strategic bets */}
          {strategic.length > 0 && (
            <section>
              <p className="text-[10px] text-lo uppercase tracking-wider mb-2">Strategic Bets</p>
              <ol className="space-y-2">
                {strategic.map((idea, i) => (
                  <li key={idea.id} className="flex gap-2.5 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <span className="flex-shrink-0 text-xs font-mono" style={{ color: "#55557A", minWidth: 16 }}>{i + 1}.</span>
                    <p className="text-sm text-mid">{idea.text}</p>
                  </li>
                ))}
              </ol>
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
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-warn flex items-center gap-1.5">
                <Zap size={12} /> Wild Idea
              </p>
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
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-accent-hi flex items-center gap-1.5">
                <Rocket size={12} /> Prototype This Week
              </p>
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
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-err flex items-center gap-1.5">
                <AlertTriangle size={12} /> If We Ignore This
              </p>
              <p className="text-sm text-mid">{dev.ignoreConsequence}</p>
            </section>
          )}

          {/* Upvote + comments */}
          <div className="pt-2" style={{ borderTop: "1px solid #1E1E35" }}>
            <button
              onClick={handleUpvote}
              className="flex items-center gap-2 text-sm font-medium transition-all duration-200 px-3 py-1.5 rounded-lg mb-5"
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

            <p className="text-[10px] text-lo uppercase tracking-wider mb-3">Discussion</p>
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
                  className="group relative animate-fade-up rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: "rgba(22,22,42,0.8)",
                    border: "1px solid #2A2A45",
                    animationDelay: `${i * 50}ms`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-accent-hi">{c.user.name ?? c.user.email}</span>
                      <span className="text-mid ml-2">{c.text}</span>
                    </div>
                    {c.user.id === currentUserId && (
                      <button
                        onClick={() => setConfirmDeleteId(confirmDeleteId === c.id ? null : c.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded text-lo hover:text-err"
                        title="Delete comment"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  {confirmDeleteId === c.id && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-lo">Delete this comment?</span>
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        disabled={deletingId === c.id}
                        className="px-2 py-0.5 rounded text-err font-medium"
                        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
                      >
                        {deletingId === c.id ? "Deleting…" : "Yes"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-0.5 rounded text-lo font-medium"
                        style={{ background: "rgba(42,42,69,0.6)", border: "1px solid #2A2A45" }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
