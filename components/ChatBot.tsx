"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatPanel, type ChatMessage } from "./ChatPanel";

let messageIdCounter = 0;
function newId() { return String(++messageIdCounter); }

function cleanForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/•/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

interface ChatApiResponse {
  success: boolean;
  data?: {
    response: string;
    action: { type: string; description: string } | null;
    followUps: string[];
    isSlackDraft: boolean;
  };
}

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [thinkingPhase, setThinkingPhase] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("scryon-voice-enabled") === "true";
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Detect speech support
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasTTS = "speechSynthesis" in window;
    const hasSR = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    setHasSpeechSupport(hasTTS || hasSR);
  }, []);

  // Load voices — must handle the async voiceschanged event
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setVoices(v);
    };

    // Try immediately (works in Firefox and sometimes Chrome)
    loadVoices();

    // Also listen for the event (required for Chrome)
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Initialise speech recognition
  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any;
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join("");
      setInputValue(transcript);
    };
    rec.onend = () => {
      setIsListening(false);
      setInputValue((prev) => {
        if (prev.trim()) {
          setTimeout(() => {
            const val = prev.trim();
            if (val) sendMessage(val);
          }, 100);
        }
        return prev;
      });
    };
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch { /* ignore */ } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cancel speech on unmount
  useEffect(() => {
    return () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); };
  }, []);

  // Cycle thinking phase while loading
  useEffect(() => {
    if (!loading) { setThinkingPhase(0); return; }
    const t = setInterval(() => setThinkingPhase((p) => (p + 1) % 4), 800);
    return () => clearInterval(t);
  }, [loading]);

  // Speak new bot messages — triggered by messages array change
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === "assistant" && voiceEnabled) {
      speak(last.content);
    }
  // speak is stable via useCallback with [voices, voiceEnabled] deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    const cleaned = cleanForSpeech(text);
    console.log("[TTS] Speaking:", cleaned.slice(0, 50));
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const preferred = voices.find((v) =>
      v.name.includes("Samantha") ||
      v.name.includes("Karen") ||
      v.name.includes("Daniel") ||
      v.name.includes("Google UK English Female") ||
      v.name.includes("Google US English")
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error("[TTS] Error:", e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [voices, voiceEnabled]);

  function toggleVoice() {
    setVoiceEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("scryon-voice-enabled", String(next));
      if (!next && typeof window !== "undefined") window.speechSynthesis?.cancel();
      return next;
    });
  }

  function toggleMic() {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      window.speechSynthesis?.cancel();
      setIsListening(true);
      try { recognitionRef.current.start(); } catch { setIsListening(false); }
    }
  }

  function handleClose() {
    setOpen(false);
    window.speechSynthesis?.cancel();
  }

  async function sendMessage(text: string) {
    setInputValue("");
    window.speechSynthesis?.cancel();

    const userMsg: ChatMessage = { id: newId(), role: "user", content: text, timestamp: new Date() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    try {
      const history = updated.slice(-20).slice(0, -1).map((m) => ({
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
        followUps: data?.followUps ?? [],
      };

      setMessages((prev) => [...prev, botMsg]);
      // Note: speak() is triggered by the messages useEffect above, not called here directly
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
        @keyframes speakBar {
          0%, 100% { transform: scaleY(0.4); }
          50%       { transform: scaleY(1); }
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
          thinkingPhase={thinkingPhase}
          onSend={sendMessage}
          onClose={handleClose}
          onClear={() => setMessages([])}
          inputValue={inputValue}
          onInputChange={setInputValue}
          inputRef={inputRef}
          voiceEnabled={voiceEnabled}
          onVoiceToggle={toggleVoice}
          isSpeaking={isSpeaking}
          isListening={isListening}
          onMicToggle={toggleMic}
          hasSpeechSupport={hasSpeechSupport}
        />
      )}
    </>
  );
}
