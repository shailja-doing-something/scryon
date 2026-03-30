interface ScoreBarProps {
  label: string;
  value: number;
  color?: string;
  delay?: number;
}

const colorMap: Record<string, { hex: string; glow: string }> = {
  "bg-indigo-400": { hex: "#7B5CF0", glow: "rgba(123,92,240,0.5)" },
  "bg-blue-400":   { hex: "#60A5FA", glow: "rgba(96,165,250,0.5)" },
  "bg-purple-400": { hex: "#A78BFA", glow: "rgba(167,139,250,0.5)" },
  "bg-green-400":  { hex: "#22C55E", glow: "rgba(34,197,94,0.5)" },
};

export function ScoreBar({ label, value, color = "bg-indigo-400", delay = 0 }: ScoreBarProps) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  const { hex, glow } = colorMap[color] ?? { hex: "#7B5CF0", glow: "rgba(123,92,240,0.5)" };

  return (
    <div className="animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-mid">{label}</span>
        <span className="text-xs font-semibold font-mono" style={{ color: hex }}>
          {value.toFixed(1)}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(42,42,69,0.6)" }}>
        <div
          className="h-full rounded-full animate-score"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${hex}cc, ${hex})`,
            boxShadow: `0 0 8px ${glow}`,
            animationDelay: `${delay}ms`,
          }}
        />
      </div>
    </div>
  );
}
