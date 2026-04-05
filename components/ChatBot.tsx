"use client";

import { useState, useRef } from "react";
import { ChatPanel, type ChatMessage } from "./ChatPanel";

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function sendMessage(text: string) {
    setInputValue("");
    const userMsg: ChatMessage = { role: "user", content: text, timestamp: new Date() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    try {
      const history = updated.slice(-10).slice(0, -1).map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        text: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationHistory: history }),
      });

      const json = (await res.json()) as { success: boolean; data?: { response: string } };
      const content = json.data?.response ?? "Sorry, I couldn't process that.";
      setMessages((prev) => [...prev, { role: "assistant", content, timestamp: new Date() }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Try again.", timestamp: new Date() },
      ]);
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
          0%   { transform: scale(1);    opacity: 0.6; }
          100% { transform: scale(1.5);  opacity: 0; }
        }
      `}</style>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Scryon AI assistant"
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center"
          style={{
            width: 52, height: 52,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #7B5CF0, #A78BFA)",
            boxShadow: "0 4px 20px rgba(123,92,240,0.45)",
            border: "none",
            cursor: "pointer",
          }}
        >
          {/* Pulse ring */}
          <span
            className="absolute inset-0 rounded-full"
            style={{ animation: "pulseRing 2s ease-out infinite", background: "rgba(123,92,240,0.4)" }}
          />
          <svg className="w-5 h-5 text-white relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {open && (
        <ChatPanel
          messages={messages}
          loading={loading}
          onSend={sendMessage}
          onClose={() => setOpen(false)}
          onClear={() => setMessages([])}
          inputValue={inputValue}
          onInputChange={setInputValue}
          inputRef={inputRef}
        />
      )}
    </>
  );
}
