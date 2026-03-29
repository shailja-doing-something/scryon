"use client";

import { useState } from "react";
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

  const scores: Scores = JSON.parse(dev.scores || "{}") as Scores;
  const immediate = dev.ideas.filter((i) => i.type === "IMMEDIATE");
  const strategic = dev.ideas.filter((i) => i.type === "STRATEGIC");
  const wild = dev.ideas.find((i) => i.type === "WILD");

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
    <div className="bg-surface border border-rim rounded-2xl overflow-hidden transition-all hover:border-accent/30">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-hi"
            style={{ background: "linear-gradient(135deg, #7B5CF0, #A78BFA)" }}>
            #{dev.rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-hi leading-snug">{dev.title}</h3>
              <TeamBadge team={dev.whichTeam} />
            </div>
            <p className="text-sm text-mid leading-relaxed">{dev.summary}</p>
            {dev.sourceUrl && (
              <a
                href={dev.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent-hi hover:text-accent mt-1 inline-block transition-colors"
              >
                Source ↗
              </a>
            )}
          </div>
        </div>

        {/* Score bars */}
        {scores.weighted > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
            <ScoreBar label="Relevance"    value={scores.relevance ?? 0}    color="bg-indigo-400" />
            <ScoreBar label="Deployability" value={scores.deployability ?? 0} color="bg-blue-400" />
            <ScoreBar label="Competitive"  value={scores.competitive ?? 0}  color="bg-purple-400" />
            <ScoreBar label="Cost/Impact"  value={scores.costImpact ?? 0}   color="bg-green-400" />
          </div>
        )}
      </div>

      {/* Expand/collapse */}
      <div className="border-t border-rim">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full px-5 py-2.5 text-xs text-mid hover:text-accent-hi flex items-center gap-1.5 hover:bg-elevated transition-all"
        >
          <span>{expanded ? "▲ Collapse" : "▼ Show analysis"}</span>
          {scores.weighted > 0 && (
            <span className="ml-auto font-semibold text-accent-hi font-mono">
              Score {scores.weighted.toFixed(2)}
            </span>
          )}
        </button>
      </div>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-rim">
          {/* Where it fits */}
          {dev.fitInFello && (
            <section className="pt-5">
              <h4 className="text-xs font-semibold text-lo uppercase tracking-wider mb-2">
                Where it fits in Fello
              </h4>
              <p className="text-sm text-mid leading-relaxed">{dev.fitInFello}</p>
            </section>
          )}

          {/* Immediate use cases */}
          {immediate.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-lo uppercase tracking-wider mb-2">
                Immediate Use Cases
              </h4>
              <ul className="space-y-2">
                {immediate.map((idea) => (
                  <li key={idea.id} className="flex gap-2">
                    <span className="text-ok mt-0.5 flex-shrink-0">●</span>
                    <p className="text-sm text-mid">{idea.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Strategic bets */}
          {strategic.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-lo uppercase tracking-wider mb-2">
                Strategic Bets
              </h4>
              <ul className="space-y-2">
                {strategic.map((idea) => (
                  <li key={idea.id} className="flex gap-2">
                    <span className="text-accent-hi mt-0.5 flex-shrink-0">◆</span>
                    <p className="text-sm text-mid">{idea.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Wild idea */}
          {wild && (
            <section className="rounded-xl p-4 border"
              style={{ background: "rgba(245, 158, 11, 0.08)", borderColor: "rgba(245, 158, 11, 0.2)" }}>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-warn">
                Wild Idea
              </h4>
              <p className="text-sm text-mid">{wild.text}</p>
            </section>
          )}

          {/* Prototype this */}
          {dev.prototypeThis && (
            <section className="rounded-xl p-4 border"
              style={{ background: "rgba(123, 92, 240, 0.08)", borderColor: "rgba(123, 92, 240, 0.2)" }}>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-accent-hi">
                Prototype This Week
              </h4>
              <p className="text-sm text-mid">{dev.prototypeThis}</p>
            </section>
          )}

          {/* If we ignore this */}
          {dev.ignoreConsequence && (
            <section className="rounded-xl p-4 border"
              style={{ background: "rgba(239, 68, 68, 0.08)", borderColor: "rgba(239, 68, 68, 0.2)" }}>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-err">
                If We Ignore This
              </h4>
              <p className="text-sm text-mid">{dev.ignoreConsequence}</p>
            </section>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-2 border-t border-rim">
            <button
              onClick={handleUpvote}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                upvoted ? "text-accent-hi" : "text-lo hover:text-accent-hi"
              }`}
            >
              <span>▲</span>
              <span className="font-mono">{upvoteCount}</span>
            </button>
          </div>

          {/* Comments */}
          <div>
            <h4 className="text-xs font-semibold text-lo uppercase tracking-wider mb-3">
              Comments
            </h4>
            <form onSubmit={handleComment} className="flex gap-2 mb-3">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 text-sm px-3 py-2 bg-elevated border border-rim rounded-lg text-hi placeholder-lo focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                className="px-3 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-40 transition-all"
                style={{ background: "linear-gradient(135deg, #7B5CF0, #A78BFA)" }}
              >
                Post
              </button>
            </form>
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="text-sm bg-elevated border border-rim rounded-lg px-3 py-2">
                  <span className="font-medium text-accent-hi">{c.user.name ?? c.user.email}: </span>
                  <span className="text-mid">{c.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
