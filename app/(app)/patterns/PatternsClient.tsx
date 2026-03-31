"use client";

import { useState } from "react";

interface PatternBrief {
  id: string;
  patternId: string;
  briefId: string;
  brief: { id: string; date: Date | string };
}

interface Pattern {
  id: string;
  theme: string;
  frequency: number;
  firstSeen: Date | string;
  lastSeen: Date | string;
  briefIds: PatternBrief[];
}

interface Props {
  patterns: Pattern[];
}

const strategyWorthy = (patterns: Pattern[]) => patterns.filter((p) => p.frequency >= 3);
const emerging = (patterns: Pattern[]) => patterns.filter((p) => p.frequency >= 2 && p.frequency < 3);
const oneOff = (patterns: Pattern[]) => patterns.filter((p) => p.frequency < 2);

export function PatternsClient({ patterns }: Props) {
  const strategy = strategyWorthy(patterns);
  const emergingPatterns = emerging(patterns);
  const oneOffPatterns = oneOff(patterns);

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-hi">Pattern Watch</h1>
        <p className="text-sm text-mid mt-1">
          Recurring themes across your daily intelligence briefs
        </p>
      </div>

      {patterns.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl animate-fade-up"
          style={{ background: "var(--color-surface)", border: "1px dashed var(--color-rim)" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(var(--accent-rgb),0.08)", border: "1px solid rgba(var(--accent-rgb),0.15)" }}
          >
            <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <p className="text-hi font-semibold mb-1">No patterns detected yet</p>
          <p className="text-sm text-lo">Generate at least 2 briefs to start seeing recurring themes.</p>
        </div>
      )}

      {strategy.length > 0 && (
        <section className="animate-fade-up delay-75">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-base font-semibold text-hi">Strategy-Worthy</h2>
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-semibold text-err"
              style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              3+ days
            </span>
            <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, var(--color-rim), transparent)" }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategy.map((p, i) => (
              <PatternCard key={p.id} pattern={p} tier="strategy" delay={i * 50} />
            ))}
          </div>
        </section>
      )}

      {emergingPatterns.length > 0 && (
        <section className="animate-fade-up delay-150">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-base font-semibold text-hi">Emerging</h2>
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-semibold text-warn"
              style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              2 days
            </span>
            <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, var(--color-rim), transparent)" }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {emergingPatterns.map((p, i) => (
              <PatternCard key={p.id} pattern={p} tier="emerging" delay={i * 50} />
            ))}
          </div>
        </section>
      )}

      {oneOffPatterns.length > 0 && (
        <section className="animate-fade-up delay-200">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-base font-semibold text-hi">One-Off Signals</h2>
            <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, var(--color-rim), transparent)" }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {oneOffPatterns.map((p) => (
              <OneOffTag key={p.id} theme={p.theme} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function OneOffTag({ theme }: { theme: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      className="px-3 py-1.5 rounded-xl text-sm transition-all duration-200 cursor-default"
      style={{
        background: "var(--color-surface)",
        border: `1px solid ${hovered ? "rgba(var(--accent-rgb),0.3)" : "var(--color-rim)"}`,
        color: hovered ? "var(--color-accent-hi)" : "var(--color-mid)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {theme}
    </span>
  );
}

interface PatternCardProps {
  pattern: Pattern;
  tier: "strategy" | "emerging";
  delay: number;
}

function PatternCard({ pattern, tier, delay }: PatternCardProps) {
  const accentColor = tier === "strategy" ? "#EF4444" : "#F59E0B";
  const accentBg = tier === "strategy" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)";
  const accentBorder = tier === "strategy" ? "rgba(239,68,68,0.18)" : "rgba(245,158,11,0.18)";
  const badge = tier === "strategy" ? "Strategy-worthy" : "Emerging";

  return (
    <div
      className="rounded-xl p-5 transition-all duration-300 animate-fade-up card-hover"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-rim)",
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-hi text-sm capitalize leading-snug flex-1 pr-3">
          {pattern.theme}
        </h3>
        <div
          className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg font-mono"
          style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: accentColor }}
        >
          {pattern.frequency}×
        </div>
      </div>

      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-lo">First seen</span>
          <span className="text-mid">
            {new Date(pattern.firstSeen).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-lo">Last seen</span>
          <span className="text-mid">
            {new Date(pattern.lastSeen).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
      </div>

      <div className="h-1 rounded-full mb-4" style={{ background: "rgba(var(--rim-rgb),0.6)" }}>
        <div
          className="h-full rounded-full animate-score"
          style={{
            width: `${Math.min(100, (pattern.frequency / 10) * 100)}%`,
            background: `linear-gradient(90deg, ${accentColor}99, ${accentColor})`,
            boxShadow: `0 0 6px ${accentColor}60`,
          }}
        />
      </div>

      <span
        className="text-xs px-2.5 py-1 rounded-full font-semibold"
        style={{ background: accentBg, color: accentColor, border: `1px solid ${accentBorder}` }}
      >
        {badge}
      </span>
    </div>
  );
}
