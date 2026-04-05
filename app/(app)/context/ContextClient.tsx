"use client";

import { useState } from "react";
import { Building2, TrendingUp } from "lucide-react";

interface Props {
  felloContent: string;
  gtmContent: string;
  felloUpdatedAt: string | null;
  gtmUpdatedAt: string | null;
  userRole: string;
}

export function ContextClient({
  felloContent: initialFello,
  gtmContent: initialGtm,
  felloUpdatedAt,
  gtmUpdatedAt,
  userRole,
}: Props) {
  const [fello, setFello] = useState(initialFello);
  const [gtm, setGtm] = useState(initialGtm);
  const [savingFello, setSavingFello] = useState(false);
  const [savingGtm, setSavingGtm] = useState(false);
  const [felloMsg, setFelloMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [gtmMsg, setGtmMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<"fello" | "gtm">("fello");

  const isOwner = userRole === "OWNER";

  async function saveContext(type: "FELLO" | "GTM", content: string) {
    const res = await fetch("/api/context", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, content }),
    });
    return res.ok;
  }

  async function handleSaveFello() {
    setSavingFello(true);
    const ok = await saveContext("FELLO", fello);
    setFelloMsg({ text: ok ? "Saved!" : "Failed to save", ok });
    setTimeout(() => setFelloMsg(null), 2500);
    setSavingFello(false);
  }

  async function handleSaveGtm() {
    setSavingGtm(true);
    const ok = await saveContext("GTM", gtm);
    setGtmMsg({ text: ok ? "Saved!" : "Failed to save", ok });
    setTimeout(() => setGtmMsg(null), 2500);
    setSavingGtm(false);
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-hi">Context Editor</h1>
        <p className="text-sm text-mid mt-1">
          Injected into every Gemini prompt — changes affect all future brief generations.
        </p>
      </div>

      {/* Warning banner */}
      <div
        className="flex items-start gap-3 rounded-xl p-4 animate-fade-up delay-75"
        style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.18)" }}
      >
        <svg className="w-4 h-4 text-warn flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-sm text-warn">
          Editing context impacts all future AI generations. Review before saving.
        </p>
      </div>

      {/* Tab switcher */}
      <div
        className="flex gap-1 p-1 rounded-xl animate-fade-up delay-150 w-fit"
        style={{ background: "#0F0F1A", border: "1px solid #2A2A45" }}
      >
        {[
          { id: "fello" as const, label: "Fello Product", icon: <Building2 size={14} /> },
          { id: "gtm" as const, label: "GTM AI Team", icon: <TrendingUp size={14} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={
              activeTab === tab.id
                ? { background: "rgba(123,92,240,0.18)", color: "#A78BFA", border: "1px solid rgba(123,92,240,0.25)" }
                : { color: "#55557A", border: "1px solid transparent" }
            }
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Fello context */}
      {activeTab === "fello" && (
        <div
          className="rounded-2xl p-5 space-y-4 animate-fade-in"
          style={{ background: "#0F0F1A", border: "1px solid #2A2A45" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-hi">Fello Product Context</h2>
              {!isOwner && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full text-lo"
                  style={{ background: "rgba(42,42,69,0.5)", border: "1px solid #2A2A45" }}
                >
                  Owner only
                </span>
              )}
            </div>
            {felloUpdatedAt && (
              <p className="text-xs text-lo flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Updated {new Date(felloUpdatedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          <textarea
            value={fello}
            onChange={(e) => setFello(e.target.value)}
            disabled={!isOwner}
            rows={16}
            className="w-full text-sm px-4 py-3 rounded-xl resize-none font-mono transition-all"
            style={{
              background: "#080810",
              border: "1px solid #2A2A45",
              color: isOwner ? "#F0F0FF" : "#55557A",
              outline: "none",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              lineHeight: "1.7",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#7B5CF0"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(123,92,240,0.12)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#2A2A45"; e.currentTarget.style.boxShadow = "none"; }}
          />

          {isOwner && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveFello}
                disabled={savingFello}
                className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center gap-2"
              >
                {savingFello ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                )}
                {savingFello ? "Saving…" : "Save Fello Context"}
              </button>
              {felloMsg && (
                <span
                  className="text-sm font-medium flex items-center gap-1.5 animate-fade-in"
                  style={{ color: felloMsg.ok ? "#22C55E" : "#EF4444" }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d={felloMsg.ok ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                  </svg>
                  {felloMsg.text}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* GTM context */}
      {activeTab === "gtm" && (
        <div
          className="rounded-2xl p-5 space-y-4 animate-fade-in"
          style={{ background: "#0F0F1A", border: "1px solid #2A2A45" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-hi">GTM AI Team Context</h2>
            {gtmUpdatedAt && (
              <p className="text-xs text-lo flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Updated {new Date(gtmUpdatedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          <textarea
            value={gtm}
            onChange={(e) => setGtm(e.target.value)}
            rows={16}
            className="w-full text-sm px-4 py-3 rounded-xl resize-none font-mono transition-all"
            style={{
              background: "#080810",
              border: "1px solid #2A2A45",
              color: "#F0F0FF",
              outline: "none",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              lineHeight: "1.7",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#7B5CF0"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(123,92,240,0.12)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#2A2A45"; e.currentTarget.style.boxShadow = "none"; }}
          />

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveGtm}
              disabled={savingGtm}
              className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center gap-2"
            >
              {savingGtm ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              )}
              {savingGtm ? "Saving…" : "Save GTM Context"}
            </button>
            {gtmMsg && (
              <span
                className="text-sm font-medium flex items-center gap-1.5 animate-fade-in"
                style={{ color: gtmMsg.ok ? "#22C55E" : "#EF4444" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={gtmMsg.ok ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                </svg>
                {gtmMsg.text}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
