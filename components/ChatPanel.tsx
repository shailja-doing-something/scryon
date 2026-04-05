"use client";

import { useEffect, useRef } from "react";
import { ClipboardList, BarChart2, Zap, RefreshCw } from "lucide-react";
import { ChatMessageItem } from "./ChatMessage";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isAction?: boolean;
  isSlackDraft?: boolean;
  followUps?: string[];
}

const THINKING_PHASES = [
  "Loading 14 days of briefs...",
  "Reasoning across patterns...",
  "Preparing response...",
  "Almost there...",
];

const QUICK_ACTIONS = [
  { icon: <ClipboardList size={12} />, label: "Brief me", message: "Give me a quick summary of today's brief" },
  { icon: <BarChart2 size={12} />, label: "Top ideas", message: "Which ideas in the tracker are most worth pursuing right now and why?" },
  { icon: <Zap size={12} />, label: "Standup", message: "Give me my AI standup for today" },
  { icon: <RefreshCw size={12} />, label: "Regenerate", message: "Regenerate today's brief" },
];

const WELCOME = "Hi — I'm Scryon, your intelligence analyst. Ask me about today's brief, your ideas, patterns, or tell me to take an action.";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  thinkingPhase: number;
  onSend: (text: string) => void;
  onClose: () => void;
  onClear: () => void;
  inputValue: string;
  onInputChange: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  voiceEnabled: boolean;
  onVoiceToggle: () => void;
  isSpeaking: boolean;
  isListening: boolean;
  onMicToggle: () => void;
  hasSpeechSupport: boolean;
}

export function ChatPanel({
  messages, loading, thinkingPhase, onSend, onClose, onClear,
  inputValue, onInputChange, inputRef, voiceEnabled, onVoiceToggle,
  isSpeaking, isListening, onMicToggle, hasSpeechSupport,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey && inputValue.trim()) onSend(inputValue.trim());
  }

  const showQuickActions = messages.length === 0 && !loading;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col"
      style={{ width: 380, height: 520, background: "#0F0F1A", border: "1px solid #2A2A45", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", animation: "chatOpen 0.2s ease-out" }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #2A2A45" }}>
        <div className="flex items-center gap-2 flex-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#7B5CF0", boxShadow: "0 0 6px #7B5CF0" }} />
          <span className="text-sm font-medium text-hi">Scryon AI</span>
          {/* Speaking waveform */}
          {isSpeaking && (
            <div className="flex items-end gap-0.5 ml-1" style={{ height: 14 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-0.5 rounded-full flex-shrink-0"
                  style={{ background: "#7B5CF0", animation: `speakBar 0.8s ${i * 0.15}s ease-in-out infinite`, height: `${[8, 14, 6][i]}px` }} />
              ))}
            </div>
          )}
        </div>

        {/* Voice toggle */}
        {hasSpeechSupport && (
          <button onClick={onVoiceToggle} title={voiceEnabled ? "Disable voice" : "Enable voice"}
            className="p-1 rounded transition-colors"
            style={{ color: voiceEnabled ? "#7B5CF0" : "#55557A" }}>
            {voiceEnabled ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12M9 9.172a4 4 0 000 5.656M6.343 6.343A8 8 0 005 12a8 8 0 001.343 5.657" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>
        )}

        <button onClick={onClear} title="Clear conversation" className="p-1 rounded text-lo hover:text-mid transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        <button onClick={onClose} className="p-1 rounded text-lo hover:text-mid transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Welcome */}
        <div className="flex flex-col items-start gap-1">
          <div className="text-xs rounded-xl px-3 py-2.5 max-w-[85%] leading-relaxed"
            style={{ background: "#16162A", borderRadius: "12px 12px 12px 4px", fontSize: 13, color: "#C4C4E0" }}>
            {WELCOME}
          </div>
        </div>

        {/* Quick action chips */}
        {showQuickActions && (
          <div className="flex flex-wrap gap-1.5 py-1 animate-fade-in">
            {QUICK_ACTIONS.map((action) => (
              <button key={action.label} onClick={() => onSend(action.message)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"
                style={{ background: "#16162A", border: "1px solid rgba(123,92,240,0.35)", color: "#A78BFA" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(123,92,240,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#16162A"; }}>
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessageItem key={msg.id} message={msg} onFollowUpClick={onSend} />
        ))}

        {/* Thinking indicator */}
        {loading && (
          <div className="flex flex-col items-start gap-1.5">
            <div className="px-3 py-2.5 rounded-xl" style={{ background: "#16162A", borderRadius: "12px 12px 12px 4px" }}>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "#7B5CF0", animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
                <span className="text-xs animate-pulse" style={{ color: "#55557A", fontSize: 12 }}>
                  {THINKING_PHASES[thinkingPhase]}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 px-3 py-3 flex-shrink-0" style={{ borderTop: "1px solid #2A2A45" }}>
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          id="scryon-chat-input"
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything about today's brief..."
          className="flex-1 bg-transparent text-sm text-hi placeholder:text-lo outline-none"
          style={{ fontSize: 13 }}
          autoComplete="off"
        />

        {/* Mic button */}
        {hasSpeechSupport && (
          <button
            onClick={onMicToggle}
            title={isListening ? "Stop listening" : "Speak"}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: isListening ? "#7B5CF0" : "#16162A",
              animation: isListening ? "pulseRing 1.5s ease-out infinite" : "none",
            }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              style={{ color: isListening ? "#fff" : "#8888AA" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        )}

        {/* Send button */}
        <button
          onClick={() => { if (inputValue.trim()) onSend(inputValue.trim()); }}
          disabled={!inputValue.trim() || loading}
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-opacity"
          style={{ background: "linear-gradient(135deg, #7B5CF0, #A78BFA)" }}>
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
