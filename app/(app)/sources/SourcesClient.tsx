"use client";

import { useState } from "react";

interface Source {
  id: string;
  type: string;
  url: string;
  label: string;
  active: boolean;
  lastFetched: Date | string | null;
}

const TYPE_META: Record<string, { bg: string; text: string; icon: string }> = {
  RSS:      { bg: "rgba(245,158,11,0.1)",  text: "#F59E0B", icon: "📡" },
  TELEGRAM: { bg: "rgba(96,165,250,0.1)",  text: "#60A5FA", icon: "✈️" },
  GITHUB:   { bg: "rgba(136,136,170,0.1)", text: "#8888AA", icon: "🐙" },
  MANUAL:   { bg: "rgba(167,139,250,0.1)", text: "#A78BFA", icon: "✏️" },
};

export function SourcesClient({ sources: initialSources }: { sources: Source[] }) {
  const [sources, setSources] = useState(initialSources);
  const [form, setForm] = useState({ type: "RSS", url: "", label: "" });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError("");
    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = (await res.json()) as { data: Source };
      setSources((prev) => [...prev, data.data]);
      setForm({ type: "RSS", url: "", label: "" });
      setShowForm(false);
    } else {
      setError("Failed to add source");
    }
    setAdding(false);
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/sources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, active: !active } : s)));
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this source?")) return;
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  const activeSources = sources.filter((s) => s.active).length;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-hi">Sources</h1>
          <p className="text-sm text-mid mt-1">
            Intelligence feeds — RSS, GitHub, Telegram
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
          </svg>
          {showForm ? "Cancel" : "Add Source"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 animate-fade-up delay-75">
        {["RSS", "TELEGRAM", "GITHUB", "MANUAL"].map((type) => {
          const m = TYPE_META[type]!;
          const count = sources.filter((s) => s.type === type).length;
          return (
            <div
              key={type}
              className="rounded-xl px-4 py-3 transition-all"
              style={{ background: "#0F0F1A", border: "1px solid #2A2A45" }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-base">{m.icon}</span>
                <span className="text-xl font-bold font-mono" style={{ color: m.text }}>{count}</span>
              </div>
              <p className="text-xs text-lo">{type}</p>
            </div>
          );
        })}
      </div>

      {/* Add form */}
      {showForm && (
        <div
          className="rounded-2xl p-5 animate-fade-up"
          style={{ background: "#0F0F1A", border: "1px solid rgba(123,92,240,0.25)" }}
        >
          <h2 className="text-sm font-semibold text-hi mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Source
          </h2>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="input-dark text-sm px-3 py-2.5 rounded-xl cursor-pointer"
              style={{ background: "#16162A" }}
            >
              <option value="RSS">RSS Feed</option>
              <option value="TELEGRAM">Telegram</option>
              <option value="GITHUB">GitHub</option>
              <option value="MANUAL">Manual</option>
            </select>
            <input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Label"
              required
              className="input-dark text-sm px-3 py-2.5 rounded-xl w-40"
            />
            <input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://…"
              required
              type="url"
              className="input-dark text-sm px-3 py-2.5 rounded-xl flex-1 min-w-48"
            />
            <button
              type="submit"
              disabled={adding}
              className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center gap-2"
            >
              {adding ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : "Add"}
            </button>
          </form>
          {error && (
            <p className="text-sm text-err mt-3 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}
        </div>
      )}

      {/* Sources list */}
      <div
        className="rounded-2xl overflow-hidden animate-fade-up delay-150"
        style={{ background: "#0F0F1A", border: "1px solid #2A2A45" }}
      >
        {/* List header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid #2A2A45" }}
        >
          <p className="text-xs font-semibold text-lo uppercase tracking-wider">
            {sources.length} sources
          </p>
          <span
            className="text-xs px-2.5 py-0.5 rounded-full font-medium text-ok"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            {activeSources} active
          </span>
        </div>

        {sources.length === 0 ? (
          <div className="text-center py-12 text-lo">
            <p className="text-sm">No sources yet — add one above</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#1E1E35" }}>
            {sources.map((s, i) => {
              const m = TYPE_META[s.type] ?? { bg: "rgba(85,85,122,0.1)", text: "#8888AA", icon: "📄" };
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-4 px-5 py-4 transition-all duration-200 animate-fade-up group"
                  style={{ animationDelay: `${i * 40}ms` }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(22,22,42,0.6)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Type badge */}
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{ background: m.bg }}
                  >
                    {m.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-hi truncate">{s.label}</p>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-lo hover:text-accent-hi transition-colors truncate block"
                    >
                      {s.url}
                    </a>
                  </div>

                  {/* Last fetched */}
                  <div className="hidden lg:block text-right flex-shrink-0">
                    <p className="text-xs text-lo">
                      {s.lastFetched
                        ? new Date(s.lastFetched).toLocaleDateString("en-US", {
                            month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "Never fetched"}
                    </p>
                  </div>

                  {/* Active toggle */}
                  <button
                    onClick={() => toggleActive(s.id, s.active)}
                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-semibold transition-all duration-200"
                    style={
                      s.active
                        ? { background: "rgba(34,197,94,0.1)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)" }
                        : { background: "rgba(42,42,69,0.5)", color: "#55557A", border: "1px solid #2A2A45" }
                    }
                  >
                    {s.active ? "Active" : "Paused"}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-lo hover:text-err hover:bg-err/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
