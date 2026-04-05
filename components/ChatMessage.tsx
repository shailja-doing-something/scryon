"use client";

import { useState } from "react";
import type { ChatMessage as ChatMessageType } from "./ChatPanel";

interface Props {
  message: ChatMessageType;
  onFollowUpClick: (text: string) => void;
}

function fmt(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function ChatMessageItem({ message, onFollowUpClick }: Props) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isUser = message.role === "user";

  function copyText() {
    void navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="text-xs px-3 py-2.5 max-w-[85%] leading-relaxed whitespace-pre-wrap"
          style={{ fontSize: 13, borderRadius: "12px 12px 4px 12px", background: "linear-gradient(135deg, #7B5CF0, #A78BFA)", color: "#fff" }}>
          {message.content}
        </div>
        <span className="text-[11px] mx-1" style={{ color: "#55557A" }}>{fmt(message.timestamp)}</span>
      </div>
    );
  }

  const isAction = !!message.isAction;
  const isSlackDraft = !!message.isSlackDraft;

  return (
    <div className="flex flex-col items-start gap-1">
      {/* Bot message bubble */}
      <div
        className="relative max-w-[85%] leading-relaxed whitespace-pre-wrap"
        style={{
          fontSize: 13,
          borderRadius: "12px 12px 12px 4px",
          padding: "10px 14px",
          background: isAction ? "#0F1A14" : "#16162A",
          color: "#C4C4E0",
          borderLeft: isAction ? "3px solid #22C55E" : undefined,
          paddingLeft: isAction ? "11px" : "14px",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {isAction && (
          <span className="inline-flex items-center gap-1 mb-1 text-[11px] font-semibold" style={{ color: "#22C55E" }}>
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Done
          </span>
        )}
        <div>{message.content}</div>

        {/* Hover copy button (non-slack-draft) */}
        {!isSlackDraft && hovered && (
          <button
            onClick={copyText}
            className="absolute top-2 right-2 flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-all"
            style={{ background: "#2A2A45", color: copied ? "#22C55E" : "#8888AA" }}
          >
            {copied ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Slack draft copy button */}
      {isSlackDraft && (
        <button
          onClick={copyText}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{ background: copied ? "rgba(34,197,94,0.1)" : "#16162A", border: "1px solid", borderColor: copied ? "#22C55E" : "#2A2A45", color: copied ? "#22C55E" : "#8888AA" }}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Copy to Clipboard
            </>
          )}
        </button>
      )}

      <span className="text-[11px] mx-1" style={{ color: "#55557A" }}>{fmt(message.timestamp)}</span>

      {/* Follow-up chips */}
      {message.followUps && message.followUps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1 animate-fade-in">
          {message.followUps.map((q, i) => (
            <button
              key={i}
              onClick={() => onFollowUpClick(q)}
              className="text-[11px] px-2.5 py-1 rounded-full transition-all"
              style={{ background: "#16162A", border: "1px solid #2A2A45", color: "#8888AA" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(123,92,240,0.4)"; e.currentTarget.style.color = "#A78BFA"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A45"; e.currentTarget.style.color = "#8888AA"; }}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
