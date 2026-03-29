const styles: Record<string, { bg: string; text: string; border: string }> = {
  Product:    { bg: "rgba(96, 165, 250, 0.1)",  text: "#60A5FA", border: "rgba(96, 165, 250, 0.25)" },
  "GTM AI":   { bg: "rgba(34, 197, 94, 0.1)",   text: "#22C55E", border: "rgba(34, 197, 94, 0.25)" },
  Both:       { bg: "rgba(167, 139, 250, 0.1)", text: "#A78BFA", border: "rgba(167, 139, 250, 0.25)" },
  Leadership: { bg: "rgba(245, 158, 11, 0.1)",  text: "#F59E0B", border: "rgba(245, 158, 11, 0.25)" },
};

const fallback = { bg: "rgba(85, 85, 122, 0.15)", text: "#8888AA", border: "rgba(85, 85, 122, 0.3)" };

export function TeamBadge({ team }: { team: string }) {
  const s = styles[team] ?? fallback;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {team || "TBD"}
    </span>
  );
}
