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

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  RSS:      { bg: "rgba(245, 158, 11, 0.1)",  text: "#F59E0B" },
  TELEGRAM: { bg: "rgba(96, 165, 250, 0.1)",  text: "#60A5FA" },
  GITHUB:   { bg: "rgba(136, 136, 170, 0.1)", text: "#8888AA" },
  MANUAL:   { bg: "rgba(167, 139, 250, 0.1)", text: "#A78BFA" },
};

export function SourcesClient({ sources: initialSources }: { sources: Source[] }) {
  const [sources, setSources] = useState(initialSources);
  const [form, setForm] = useState({ type: "RSS", url: "", label: "" });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

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

  const inputCls = "text-sm px-3 py-2 bg-elevated border border-rim rounded-lg text-hi placeholder-lo focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors";
  const selectCls = `${inputCls} cursor-pointer`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hi">Sources</h1>
        <p className="text-sm text-mid mt-1">
          Manage RSS feeds, GitHub repos, and manual inputs
        </p>
      </div>

      {/* Add source form */}
      <div className="bg-surface border border-rim rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-hi mb-4">Add Source</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className={selectCls}
            style={{ background: "#16162A" }}
          >
            <option value="RSS">RSS</option>
            <option value="TELEGRAM">Telegram</option>
            <option value="GITHUB">GitHub</option>
            <option value="MANUAL">Manual</option>
          </select>
          <input
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="Label"
            required
            className={`${inputCls} w-40`}
          />
          <input
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="URL"
            required
            type="url"
            className={`${inputCls} flex-1 min-w-48`}
          />
          <button
            type="submit"
            disabled={adding}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-all"
            style={{ background: "linear-gradient(135deg, #7B5CF0, #A78BFA)" }}
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </form>
        {error && <p className="text-sm text-err mt-2">{error}</p>}
      </div>

      {/* Sources table */}
      <div className="bg-surface border border-rim rounded-2xl overflow-hidden">
        {sources.length === 0 ? (
          <p className="text-sm text-lo text-center py-10">No sources yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rim">
                {["Type", "Label", "URL", "Last Fetched", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className={`text-left px-5 py-3 text-xs font-semibold text-lo uppercase tracking-wider ${
                      h === "URL" ? "hidden md:table-cell" : h === "Last Fetched" ? "hidden lg:table-cell" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rim">
              {sources.map((s) => {
                const ts = TYPE_STYLES[s.type] ?? { bg: "rgba(85,85,122,0.1)", text: "#8888AA" };
                return (
                  <tr key={s.id} className="hover:bg-elevated transition-colors">
                    <td className="px-5 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{ background: ts.bg, color: ts.text }}
                      >
                        {s.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-hi">{s.label}</td>
                    <td className="px-5 py-3 text-mid hidden md:table-cell max-w-xs truncate">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent-hi transition-colors"
                      >
                        {s.url}
                      </a>
                    </td>
                    <td className="px-5 py-3 text-lo hidden lg:table-cell">
                      {s.lastFetched
                        ? new Date(s.lastFetched).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Never"}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleActive(s.id, s.active)}
                        className="text-xs px-2 py-0.5 rounded-full font-medium transition-all"
                        style={
                          s.active
                            ? { background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)" }
                            : { background: "rgba(42,42,69,0.6)", color: "#55557A", border: "1px solid #2A2A45" }
                        }
                      >
                        {s.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-lo hover:text-err transition-colors text-lg"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
