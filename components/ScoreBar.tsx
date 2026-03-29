interface ScoreBarProps {
  label: string;
  value: number;
  color?: string;
}

const colorMap: Record<string, string> = {
  "bg-indigo-400": "#7B5CF0",
  "bg-blue-400":   "#60A5FA",
  "bg-purple-400": "#A78BFA",
  "bg-green-400":  "#22C55E",
};

export function ScoreBar({ label, value, color = "bg-indigo-400" }: ScoreBarProps) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  const hex = colorMap[color] ?? "#7B5CF0";
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-mid">{label}</span>
        <span className="text-xs font-semibold text-hi font-mono">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-elevated rounded-full overflow-hidden border border-rim">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: hex, boxShadow: `0 0 6px ${hex}60` }}
        />
      </div>
    </div>
  );
}
