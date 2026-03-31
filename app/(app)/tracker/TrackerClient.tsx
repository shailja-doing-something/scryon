"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const COLUMNS = [
  { id: "GENERATED",   label: "Generated",   accent: "#8888AA", bg: "rgba(85,85,122,0.08)" },
  { id: "CONSIDERING", label: "Considering", accent: "#60A5FA", bg: "rgba(96,165,250,0.08)" },
  { id: "PROTOTYPING", label: "Prototyping", accent: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  { id: "WORKED",      label: "Worked",      accent: "#22C55E", bg: "rgba(34,197,94,0.08)" },
  { id: "FAILED",      label: "Failed",      accent: "#EF4444", bg: "rgba(239,68,68,0.08)" },
];

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  IMMEDIATE: { bg: "rgba(34,197,94,0.12)",  text: "#22C55E", label: "Immediate" },
  STRATEGIC: { bg: "rgba(96,165,250,0.12)", text: "#60A5FA", label: "Strategic" },
  WILD:      { bg: "rgba(245,158,11,0.12)", text: "#F59E0B", label: "Wild" },
};

interface Activity {
  id: string;
  fromStatus: string;
  toStatus: string;
  comment: string;
  createdAt: Date | string;
  user: { id: string; name: string | null; email: string };
}

interface Idea {
  id: string;
  type: string;
  text: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  development: { id: string; title: string; briefId: string };
  activities: Activity[];
}

interface Props {
  ideas: Idea[];
}

function parseIdeaText(text: string): { title: string; description: string } {
  const newlineIdx = text.indexOf("\n");
  if (newlineIdx !== -1) {
    return {
      title: text.slice(0, newlineIdx).trim(),
      description: text.slice(newlineIdx + 1).trim(),
    };
  }
  const colonIdx = text.indexOf(": ");
  if (colonIdx !== -1) {
    return {
      title: text.slice(0, colonIdx).trim(),
      description: text.slice(colonIdx + 2).trim(),
    };
  }
  return { title: text.trim(), description: "" };
}

export function TrackerClient({ ideas: initialIdeas }: Props) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const columns = COLUMNS.map((col) => ({
    ...col,
    ideas: ideas.filter((i) => i.status === col.id),
  }));

  async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    const newStatus = destination.droppableId;
    setIdeas((prev) => prev.map((i) => (i.id === draggableId ? { ...i, status: newStatus } : i)));
    try {
      await fetch(`/api/ideas/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      setIdeas(initialIdeas);
    }
  }

  const expanded = ideas.find((i) => i.id === expandedId);

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-hi">Idea Tracker</h1>
        <p className="text-sm text-mid mt-1">Drag ideas across columns to track progress</p>
      </div>

      {/* Stats */}
      <div className="flex gap-3 animate-fade-up delay-75">
        {COLUMNS.map((col) => {
          const count = ideas.filter((i) => i.status === col.id).length;
          return (
            <div
              key={col.id}
              className="flex-1 rounded-xl px-3 py-2.5 text-center transition-all"
              style={{ background: col.bg, border: `1px solid ${col.accent}22` }}
            >
              <p className="text-lg font-bold font-mono" style={{ color: col.accent }}>{count}</p>
              <p className="text-xs text-lo mt-0.5">{col.label}</p>
            </div>
          );
        })}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 animate-fade-up delay-150">
          {columns.map((col) => (
            <div key={col.id} className="flex-shrink-0 w-64">
              {/* Column header */}
              <div
                className="flex items-center justify-between mb-3 px-3 py-2 rounded-xl"
                style={{ background: col.bg, border: `1px solid ${col.accent}20` }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: col.accent }} />
                  <h2 className="text-sm font-semibold text-hi">{col.label}</h2>
                </div>
                <span
                  className="text-xs font-bold font-mono w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: `${col.accent}22`, color: col.accent }}
                >
                  {col.ideas.length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="min-h-32 rounded-xl p-2 transition-all duration-200"
                    style={{
                      background: snapshot.isDraggingOver
                        ? `${col.accent}10`
                        : "rgba(var(--surface-rgb),0.6)",
                      border: `1px solid ${snapshot.isDraggingOver ? col.accent + "35" : "var(--color-rim)"}`,
                    }}
                  >
                    {col.ideas.map((idea, index) => {
                      const ts = TYPE_STYLES[idea.type] ?? { bg: "rgba(85,85,122,0.1)", text: "#8888AA", label: idea.type };
                      const { title, description } = parseIdeaText(idea.text);
                      return (
                        <Draggable key={idea.id} draggableId={idea.id} index={index}>
                          {(drag, dragSnapshot) => (
                            <div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              {...drag.dragHandleProps}
                              className="rounded-xl p-3 mb-2 cursor-pointer transition-all duration-200"
                              style={{
                                ...drag.draggableProps.style,
                                background: dragSnapshot.isDragging ? "var(--color-elevated)" : "var(--color-surface)",
                                border: `1px solid ${dragSnapshot.isDragging ? col.accent + "60" : "var(--color-rim)"}`,
                                boxShadow: dragSnapshot.isDragging
                                  ? `0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px ${col.accent}40`
                                  : "none",
                              }}
                              onClick={() => setExpandedId((prev) => (prev === idea.id ? null : idea.id))}
                            >
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
                                style={{ background: ts.bg, color: ts.text }}
                              >
                                {ts.label}
                              </span>
                              {title && (
                                <p className="text-xs font-semibold text-hi leading-snug mt-2 line-clamp-2">
                                  {title}
                                </p>
                              )}
                              {description && (
                                <p className="text-[11px] text-mid leading-snug line-clamp-2 mt-1">
                                  {description}
                                </p>
                              )}
                              <p className="text-[10px] text-lo mt-2 truncate border-t border-rim pt-1.5">
                                {idea.development.title}
                              </p>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Detail drawer */}
      {expanded && (
        <div
          className="fixed inset-y-0 right-0 w-96 z-50 overflow-y-auto animate-slide-right"
          style={{
            background: "var(--color-canvas)",
            borderLeft: "1px solid var(--color-rim)",
            boxShadow: "-24px 0 80px rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="sticky top-0 px-5 py-4 flex items-center justify-between"
            style={{
              background: "var(--color-canvas)",
              backdropFilter: "blur(10px)",
              borderBottom: "1px solid var(--color-rim)",
            }}
          >
            <h3 className="font-semibold text-hi text-sm">Idea Detail</h3>
            <button
              onClick={() => setExpandedId(null)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-lo hover:text-hi hover:bg-elevated transition-all"
            >
              ✕
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Type + status */}
            <div className="flex items-center gap-2">
              {(() => {
                const ts = TYPE_STYLES[expanded.type] ?? { bg: "rgba(85,85,122,0.1)", text: "#8888AA", label: expanded.type };
                return (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide"
                    style={{ background: ts.bg, color: ts.text }}>
                    {ts.label}
                  </span>
                );
              })()}
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: "rgba(var(--rim-rgb),0.6)", color: "var(--color-mid)", border: "1px solid var(--color-rim)" }}
              >
                {expanded.status}
              </span>
            </div>

            {/* Idea title + description */}
            {(() => {
              const { title, description } = parseIdeaText(expanded.text);
              return (
                <>
                  {title && <p className="text-sm font-semibold text-hi leading-snug">{title}</p>}
                  {description && <p className="text-sm text-mid leading-relaxed">{description}</p>}
                  {!title && !description && <p className="text-sm text-mid leading-relaxed">{expanded.text}</p>}
                </>
              );
            })()}

            {/* Source */}
            <div
              className="rounded-xl px-4 py-3 text-xs"
              style={{ background: "var(--color-elevated)", border: "1px solid var(--color-rim)" }}
            >
              <span className="text-lo">From: </span>
              <span className="text-accent-hi font-medium">{expanded.development.title}</span>
            </div>

            {/* Activity */}
            <div>
              <h4 className="text-xs font-semibold text-lo uppercase tracking-widest mb-3">
                Activity History
              </h4>
              {expanded.activities.length === 0 ? (
                <p className="text-xs text-lo text-center py-4">No activity yet</p>
              ) : (
                <div className="space-y-2">
                  {expanded.activities.map((a) => {
                    const fromCol = COLUMNS.find((c) => c.id === a.fromStatus);
                    const toCol = COLUMNS.find((c) => c.id === a.toStatus);
                    return (
                      <div
                        key={a.id}
                        className="rounded-xl p-3 text-xs"
                        style={{ background: "var(--color-elevated)", border: "1px solid var(--color-rim)" }}
                      >
                        <p className="text-hi font-medium">{a.user.name ?? a.user.email}</p>
                        <p className="text-mid mt-0.5 flex items-center gap-1.5">
                          <span style={{ color: fromCol?.accent ?? "#8888AA" }}>{a.fromStatus}</span>
                          <svg className="w-3 h-3 text-lo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          <span style={{ color: toCol?.accent ?? "#A78BFA" }}>{a.toStatus}</span>
                        </p>
                        {a.comment && <p className="text-lo mt-1 italic">&ldquo;{a.comment}&rdquo;</p>}
                        <p className="text-lo/60 mt-1">{new Date(a.createdAt).toLocaleDateString()}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
