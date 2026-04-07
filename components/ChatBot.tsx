"use client";

import { useState, useRef } from "react";
import { ChatPanel, type ChatMessage } from "./ChatPanel";

let messageIdCounter = 0;
function newId() { return String(++messageIdCounter); }

interface ChatApiResponse {
  success: boolean;
  data?: {
    response: string;
    action: { type: string; description: string } | null;
    isSlackDraft: boolean;
  };
}

const MAX_HISTORY = 10;

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    setOpen(false);
  }

  async function sendMessage(text: string) {
    setInputValue("");

    const userMsg: ChatMessage = { id: newId(), role: "user", content: text, timestamp: new Date() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    try {
      const history = updated.slice(-MAX_HISTORY).slice(0, -1).map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        text: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationHistory: history }),
      });

      const json = (await res.json()) as ChatApiResponse;
      const data = json.data;
      const content = data?.response ?? "Sorry, I couldn't process that.";
      const botMsg: ChatMessage = {
        id: newId(),
        role: "assistant",
        content,
        timestamp: new Date(),
        isAction: !!data?.action,
        isSlackDraft: data?.isSlackDraft ?? false,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: newId(), role: "assistant",
        content: "Something went wrong. Try again.",
        timestamp: new Date(),
      }]);
    }

    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <>
      <style>{`
        @keyframes chatOpen {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-4px); }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1);    opacity: 0.7; }
          100% { transform: scale(1.55); opacity: 0; }
        }
      `}</style>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Scryon AI assistant"
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center"
          style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #7B5CF0, #A78BFA)", boxShadow: "0 4px 20px rgba(123,92,240,0.45)", border: "none", cursor: "pointer" }}
        >
          <span className="absolute inset-0 rounded-full"
            style={{ animation: "pulseRing 2s ease-out infinite", background: "rgba(123,92,240,0.4)" }} />
          {/* Robot face avatar */}
          <svg className="w-7 h-7 relative" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="15" y="2" width="2" height="4" rx="1" fill="white" fillOpacity="0.9" />
            <circle cx="16" cy="2" r="1.5" fill="white" />
            <rect x="6" y="7" width="20" height="16" rx="4" fill="white" fillOpacity="0.95" />
            <rect x="10" y="12" width="4" height="4" rx="1.5" fill="#7B5CF0" />
            <rect x="18" y="12" width="4" height="4" rx="1.5" fill="#7B5CF0" />
            <circle cx="11" cy="13" r="0.8" fill="white" fillOpacity="0.7" />
            <circle cx="19" cy="13" r="0.8" fill="white" fillOpacity="0.7" />
            <rect x="11" y="19" width="10" height="2" rx="1" fill="#A78BFA" fillOpacity="0.8" />
            <rect x="3" y="11" width="3" height="5" rx="1.5" fill="white" fillOpacity="0.7" />
            <rect x="26" y="11" width="3" height="5" rx="1.5" fill="white" fillOpacity="0.7" />
          </svg>
        </button>
      )}

      {open && (
        <ChatPanel
          messages={messages}
          loading={loading}
          onSend={sendMessage}
          onClose={handleClose}
          onClear={() => setMessages([])}
          inputValue={inputValue}
          onInputChange={setInputValue}
          inputRef={inputRef}
        />
      )}
    </>
  );
}
