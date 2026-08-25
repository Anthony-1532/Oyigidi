"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Message = { role: "client" | "assistant"; content: string; safetyFlag: string };

/** Coaching chat: full persisted history, pending indicator, escalation styling. */
export function ChatPanel({ preferredName, initialMessages }: { preferredName: string; initialMessages: Array<{ id: string; role: string; content: string; safetyFlag: string }> }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages.map((m) => ({ role: m.role as Message["role"], content: m.content, safetyFlag: m.safetyFlag })));
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const anchor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    anchor.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pending]);

  const send = async (raw?: string) => {
    const content = (raw ?? input).trim();
    if (!content || pending) return;
    setPending(true);
    setError(null);
    setInput("");
    setMessages((current) => [...current, { role: "client", content, safetyFlag: "none" }, { role: "assistant", content: "", safetyFlag: "none" }]);
    try {
      const res = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message ?? "Coaching response failed");
      const reply = payload.data.assistantMessage;
      setMessages((current) => {
        const next = current.slice(0, -1);
        return [...next, { role: "assistant", content: reply.content, safetyFlag: reply.safetyFlag }];
      });
      if (reply.safetyFlag === "escalation") router.refresh();
    } catch (err) {
      setMessages((current) => current.slice(0, -2));
      setInput(content);
      setError("Oyigidi could not complete that response. Your message was returned so you can retry.");
      void err;
    } finally {
      setPending(false);
    }
  };

  return (
    <article className="oy-card oy-coach-card">
      <div className="oy-coach-head">
        <div className="oy-coach-ident">
          <div className="oy-coach-orb"><Sparkle /></div>
          <div>
            <div className="oy-coach-name">Oyigidi Coach</div>
            <div className="oy-coach-status">Context-aware · private to you</div>
          </div>
        </div>
        <span className="oy-coach-context">{messages.length} saved messages</span>
      </div>
      <div className="oy-chat" style={{ maxHeight: 430, overflowY: "auto" }} aria-live="polite">
        {messages.length ? messages.map((message, index) => (
          <div className={`oy-chat-message ${message.role === "client" ? "is-user" : ""}`} key={index}>
            <div className="oy-chat-avatar">{message.role === "client" ? preferredName.slice(0, 2).toUpperCase() : <Sparkle />}</div>
            {message.content ? (
              <div className={`oy-chat-bubble ${message.role === "assistant" ? `oy-md ${message.safetyFlag === "escalation" ? "is-escalation" : ""}` : ""}`}>{message.content}</div>
            ) : (
              <div className="oy-chat-bubble oy-chat-pending" aria-label="Oyigidi is preparing a response"><span /><span /><span /></div>
            )}
          </div>
        )) : (
          <div className="oy-milestone"><span>Begin a conversation</span><p>Share what feels most important right now.</p></div>
        )}
        <div ref={anchor} />
      </div>
      {error && <div className="oy-safety-note" style={{ margin: "0 22px 10px" }}>{error}</div>}
      <div className="oy-chat-actions">
        {["Explore a decision", "Reflect on a moment", "Break down a next step"].map((prompt) => (
          <button key={prompt} type="button" className="oy-prompt-chip" disabled={pending} onClick={() => void send(prompt)}>{prompt}</button>
        ))}
      </div>
      <form
        className="oy-chat-input"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Add a thought or ask a question" aria-label="Message Oyigidi Coach" />
        <button className="oy-send" type="submit" aria-label="Send message" disabled={pending || !input.trim()}><Sparkle /></button>
      </form>
    </article>
  );
}

function Sparkle() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.4 6.9L21 11.3l-6.6 2.4L12 20.5l-2.4-6.8L3 11.3l6.6-2.4L12 2z" /></svg>;
}
