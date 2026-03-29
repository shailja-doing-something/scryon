"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const COLUMNS = [
  { id: "GENERATED",   label: "Generated",   accent: "#8888AA" },
  { id: "CONSIDERING", label: "Considering", accent: "#60A5FA" },
  { id: "PROTOTYPING", label: "Prototyping", accent: "#F59E0B" },
  { id: "WORKED",      label: "Worked",      accent: "#22C55E" },
  { id: "FAILED",      label: "Failed",      accent: "#EF4444" },
];

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  IMMEDIATE: { bg: "rgba(34, 197, 94, 0.12)",   text: "#22C55E" },
  STRATEGIC: { bg: "rgba(96, 165, 250, 0.12)",   text: "#60A5FA" },
  WILD:      { bg: "rgba(245, 158, 11, 0.12)",   text: "#F59E0B" },
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
    setIdeas((prev) =>
      prev.map((i) => (i.id === draggableId ? { ...i, status: newStatus } : i))
    );

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
      <div>
        <h1 className="text-2xl font-bold text-hi">Idea Tracker</h1>
        <p className="text-sm text-mid mt-1">Drag ideas across columns to track progress</p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <div key={col.id} className="flex-shrink-0 w-64">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: col.accent }} />
                  <h2 className="text-sm font-semibold text-hi">{col.label}</h2>
                </div>
                <span
                  className="text-xs font-medium rounded-full px-2 py-0.5 text-mid"
                  style={{ background: "rgba(42,42,69,0.6)", border: "1px solid #2A2A45" }}
                >
                  {col.ideas.length}
                </span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="min-h-24 rounded-xl p-2 transition-colors"
                    style={{
                      background: snapshot.isDraggingOver
                        ? `rgba(${col.accent === "#7B5CF0" ? "123,92,240" : "42,42,69"},0.15)`
                        : "rgba(15,15,26,0.6)",
                      border: `1px solid ${snapshot.isDraggingOver ? col.accent + "40" : "#2A2A45"}`,
                    }}
                  >
                    {col.ideas.map((idea, index) => (
                      <Draggable key={idea.id} draggableId={idea.id} index={index}>
                        {(drag, dragSnapshot) => {
                          const ts = TYPE_STYLES[idea.type] ?? { bg: "rgba(85,85,122,0.1)", text: "#8888AA" };
                          return (
                            <div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              {...drag.dragHandleProps}
                              className="rounded-lg p-3 mb-2 cursor-pointer transition-all"
                              style={{
                                background: dragSnapshot.isDragging ? "#16162A" : "#0F0F1A",
                                border: `1px solid ${dragSnapshot.isDragging ? "#7B5CF0" : "#2A2A45"}`,
                                boxShadow: dragSnapshot.isDragging ? "0 8px 30px rgba(123,92,240,0.2)" : "none",
                              }}
                              onClick={() =>
                                setExpandedId((prev) => (prev === idea.id ? null : idea.id))
                              }
                            >
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                                  style={{ background: ts.bg, color: ts.text }}
                                >
                                  {idea.type}
                                </span>
                              </div>
                              <p className="text-xs text-mid leading-snug line-clamp-3">
                                {idea.text}
                              </p>
                              <p className="text-xs text-lo mt-1.5 truncate">
                                {idea.development.title}
                              </p>
                            </div>
                          );
                        }}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Expanded idea drawer */}
      {expanded && (
        <div className="fixed inset-y-0 right-0 w-96 z-50 overflow-y-auto"
          style={{ background: "#0F0F1A", borderLeft: "1px solid #2A2A45", boxShadow: "-20px 0 60px rgba(0,0,0,0.5)" }}>
          <div className="sticky top-0 border-b border-rim px-5 py-4 flex items-center justify-between"
            style={{ background: "#0F0F1A" }}>
            <h3 className="font-semibold text-hi text-sm">Idea Detail</h3>
            <button
              onClick={() => setExpandedId(null)}
              className="text-lo hover:text-hi text-lg leading-none transition-colors"
            >
              ×
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              {(() => {
                const ts = TYPE_STYLES[expanded.type] ?? { bg: "rgba(85,85,122,0.1)", text: "#8888AA" };
                return (
                  <span className="text-xs px-2 py-1 rounded font-medium"
                    style={{ background: ts.bg, color: ts.text }}>
                    {expanded.type}
                  </span>
                );
              })()}
              <span className="text-xs text-lo">{expanded.status}</span>
            </div>
            <p className="text-sm text-mid leading-relaxed">{expanded.text}</p>
            <div className="text-xs text-lo">
              From:{" "}
              <span className="text-accent-hi font-medium">{expanded.development.title}</span>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-lo uppercase tracking-wider mb-3">
                Activity History
              </h4>
              {expanded.activities.length === 0 ? (
                <p className="text-xs text-lo">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {expanded.activities.map((a) => (
                    <div key={a.id} className="text-xs bg-elevated border border-rim rounded-lg p-3">
                      <span className="font-medium text-accent-hi">
                        {a.user.name ?? a.user.email}
                      </span>
                      <span className="text-mid">
                        {" "}moved from <strong>{a.fromStatus}</strong> → <strong>{a.toStatus}</strong>
                      </span>
                      {a.comment && (
                        <p className="text-mid mt-1 italic">&ldquo;{a.comment}&rdquo;</p>
                      )}
                      <p className="text-lo mt-1">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
