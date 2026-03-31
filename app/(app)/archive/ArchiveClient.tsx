"use client";

import Link from "next/link";
import { useState } from "react";

interface Brief {
  id: string;
  date: Date | string;
  focusArea: string;
  status: string;
  generatedAt: Date | string;
  _count: { developments: number };
}

interface Props {
  briefs: Brief[];
}

function BriefCard({ brief, index }: { brief: Brief; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/archive/${brief.id}`}
      className="group block rounded-xl p-5 transition-all duration-300 animate-fade-up"
      style={{
        background: hovered
          ? "linear-gradient(135deg, rgba(123,92,240,0.04), #0F0F1A)"
          : "#0F0F1A",
        border: `1px solid ${hovered ? "rgba(123,92,240,0.4)" : "#2A2A45"}`,
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? "0 8px 32px rgba(123,92,240,0.1)" : "none",
        animationDelay: `${index * 50}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center"
            style={{ background: "rgba(123,92,240,0.08)", border: "1px solid rgba(123,92,240,0.15)" }}
          >
            <p className="text-lg font-bold font-mono leading-none" style={{ color: "#A78BFA" }}>
              {new Date(brief.date).getDate()}
            </p>
            <p className="text-[10px] text-lo uppercase tracking-wider mt-0.5">
              {new Date(brief.date).toLocaleDateString("en-US", { month: "short" })}
            </p>
          </div>

          <div>
            <p className="font-semibold text-hi group-hover:text-accent-hi transition-colors">
              {new Date(brief.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            {brief.focusArea ? (
              <p className="text-sm text-accent-hi mt-0.5 flex items-center gap-1">
                <span className="text-lo">Focus:</span> {brief.focusArea}
              </p>
            ) : (
              <p className="text-xs text-lo mt-0.5">General intelligence scan</p>
            )}
          </div>
        </div>

        <div className="text-right flex items-center gap-4">
          <div>
            <p className="text-lg font-bold font-mono" style={{ color: "#7B5CF0" }}>
              {brief._count.developments}
            </p>
            <p className="text-xs text-lo">developments</p>
          </div>
          <div className="text-lo group-hover:text-accent-hi transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ArchiveClient({ briefs }: Props) {
  return (
    <div className="space-y-7">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-hi">Archive</h1>
        <p className="text-sm text-mid mt-1">All past intelligence briefs</p>
      </div>

      {briefs.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl animate-fade-up"
          style={{ background: "#0F0F1A", border: "1px dashed #2A2A45" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(123,92,240,0.08)", border: "1px solid rgba(123,92,240,0.15)" }}
          >
            <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <p className="text-hi font-semibold mb-1">No briefs archived yet</p>
          <p className="text-sm text-lo">Generate your first brief from the dashboard.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {briefs.map((brief, i) => (
            <BriefCard key={brief.id} brief={brief} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
