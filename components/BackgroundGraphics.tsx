"use client";

import { useTheme } from "next-themes";

export function BackgroundGraphics() {
  const { resolvedTheme } = useTheme();
  // resolvedTheme is undefined during SSR; undefined !== "light" → dark default
  const isDark = resolvedTheme !== "light";

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* ── Dot grid ── */}
      <svg
        className="absolute inset-0 w-full h-full animate-grid-pulse"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: isDark ? 0.45 : 0.35 }}
      >
        <defs>
          <pattern id="dot-grid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle
              cx="1"
              cy="1"
              r="1"
              fill={isDark ? "rgba(123,92,240,0.5)" : "rgba(107,76,230,0.4)"}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>

      {/* ── Subtle diagonal lines ── */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: isDark ? 0.04 : 0.06 }}
      >
        <defs>
          <pattern id="diag-lines" x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
            <line
              x1="0" y1="64" x2="64" y2="0"
              stroke={isDark ? "#A78BFA" : "#6B4CE6"}
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diag-lines)" />
      </svg>

      {/* ── Neural mesh lines (SVG paths) ── */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: isDark ? 0.08 : 0.06 }}
      >
        <g stroke={isDark ? "#A78BFA" : "#6B4CE6"} strokeWidth="0.75" fill="none">
          <line x1="0" y1="200" x2="300" y2="450" />
          <line x1="300" y1="450" x2="600" y2="150" />
          <line x1="600" y1="150" x2="900" y2="600" />
          <line x1="900" y1="600" x2="1200" y2="300" />
          <line x1="1200" y1="300" x2="1440" y2="500" />
          <line x1="0" y1="700" x2="400" y2="350" />
          <line x1="400" y1="350" x2="800" y2="800" />
          <line x1="800" y1="800" x2="1100" y2="400" />
          <line x1="1100" y1="400" x2="1440" y2="750" />
          <line x1="200" y1="0" x2="500" y2="300" />
          <line x1="500" y1="300" x2="700" y2="100" />
          <line x1="700" y1="100" x2="1000" y2="500" />
          <line x1="1000" y1="500" x2="1300" y2="200" />
          {/* Nodes */}
          <circle cx="300" cy="450" r="2.5" fill={isDark ? "#A78BFA" : "#6B4CE6"} stroke="none" />
          <circle cx="600" cy="150" r="2" fill={isDark ? "#7B5CF0" : "#8B6CF0"} stroke="none" />
          <circle cx="900" cy="600" r="3" fill={isDark ? "#A78BFA" : "#6B4CE6"} stroke="none" />
          <circle cx="1200" cy="300" r="2" fill={isDark ? "#7B5CF0" : "#8B6CF0"} stroke="none" />
          <circle cx="400" cy="350" r="2.5" fill={isDark ? "#A78BFA" : "#6B4CE6"} stroke="none" />
          <circle cx="800" cy="800" r="2" fill={isDark ? "#7B5CF0" : "#8B6CF0"} stroke="none" />
          <circle cx="1100" cy="400" r="2.5" fill={isDark ? "#A78BFA" : "#6B4CE6"} stroke="none" />
          <circle cx="500" cy="300" r="2" fill={isDark ? "#7B5CF0" : "#8B6CF0"} stroke="none" />
          <circle cx="1000" cy="500" r="2" fill={isDark ? "#A78BFA" : "#6B4CE6"} stroke="none" />
        </g>
      </svg>

      {/* ── Orb 1 — top left, purple ── */}
      <div
        className="absolute animate-orb-drift"
        style={{
          top: "-10%",
          left: "-5%",
          width: "55vw",
          height: "55vw",
          maxWidth: 700,
          maxHeight: 700,
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle, rgba(123,92,240,0.22) 0%, rgba(123,92,240,0.06) 50%, transparent 70%)"
            : "radial-gradient(circle, rgba(107,76,230,0.12) 0%, rgba(107,76,230,0.04) 50%, transparent 70%)",
          filter: "blur(1px)",
          animationDuration: "20s",
        }}
      />

      {/* ── Orb 2 — bottom right, indigo/blue ── */}
      <div
        className="absolute animate-orb-drift"
        style={{
          bottom: "-15%",
          right: "-8%",
          width: "60vw",
          height: "60vw",
          maxWidth: 800,
          maxHeight: 800,
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(67,56,202,0.06) 50%, transparent 70%)"
            : "radial-gradient(circle, rgba(99,102,241,0.10) 0%, rgba(67,56,202,0.03) 50%, transparent 70%)",
          filter: "blur(1px)",
          animationDuration: "26s",
          animationDelay: "-8s",
        }}
      />

      {/* ── Orb 3 — center, faint accent ── */}
      <div
        className="absolute animate-orb"
        style={{
          top: "30%",
          left: "40%",
          width: "40vw",
          height: "40vw",
          maxWidth: 500,
          maxHeight: 500,
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 60%)"
            : "radial-gradient(circle, rgba(107,76,230,0.06) 0%, transparent 60%)",
          filter: "blur(2px)",
          animationDuration: "14s",
          animationDelay: "-4s",
        }}
      />

      {/* ── Top gradient fade (canvas color at top to blend nav) ── */}
      <div
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, var(--color-canvas) 0%, transparent 100%)`,
          opacity: 0.6,
        }}
      />
    </div>
  );
}
