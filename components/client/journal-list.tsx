"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Journal = { id: string; title: string; content: string; createdAt: string };

/** Inline reflection list with edit + delete. Reflections are private and the
 *  store keeps no history, so a failed write must never look like a success and
 *  removal always asks first. */
export function JournalList({ journals }: { journals: Journal[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", content: "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveEdit = async () => {
    if (!editingId) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/journals", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editingId, title: draft.title, content: draft.content }),
      });
      if (!res.ok) {
        // Keep the editor open so the unsaved draft stays on screen.
        setError("That edit could not be saved. Your changes are still here — try again.");
        return;
      }
      setEditingId(null);
      router.refresh();
    } catch {
      setError("That edit could not be saved. Your changes are still here — try again.");
    } finally {
      setPending(false);
    }
  };

  if (!journals.length) {
    return <article className="oy-card oy-plan-card" style={{ padding: 20 }}><p className="oy-card-copy">No reflections yet. Your first one can be a single honest sentence.</p></article>;
  }

  return (
    <article className="oy-card oy-plan-card" style={{ padding: 20 }}>
      {error && <div className="oy-safety-note" style={{ marginBottom: 12 }}>{error}</div>}
      {journals.map((entry) => (
        <div className="oy-plan-item" key={entry.id}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {editingId === entry.id ? (
              <div style={{ display: "grid", gap: 8 }}>
                <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} aria-label="Reflection title" style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" }} />
                <textarea rows={4} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} aria-label="Reflection content" style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8", resize: "vertical" }} />
              </div>
            ) : (
              <>
                <div className="oy-plan-title">{entry.title}</div>
                <div className="oy-plan-detail" style={{ whiteSpace: "pre-wrap" }}>{entry.content}</div>
                <div className="oy-activity-time">{new Date(entry.createdAt).toLocaleString()}</div>
              </>
            )}
          </div>
          {editingId === entry.id ? (
            <>
              <button type="button" className="oy-link" disabled={pending} onClick={() => void saveEdit()}>{pending ? "Saving…" : "Save"}</button>
              <button type="button" className="oy-link" style={{ color: "var(--oy-stone)" }} disabled={pending} onClick={() => { setEditingId(null); setError(null); }}>Cancel</button>
            </>
          ) : (
            <button type="button" className="oy-link" onClick={() => { setEditingId(entry.id); setError(null); setDraft({ title: entry.title, content: entry.content }); }}>Edit</button>
          )}
          <RemoveJournalButton id={entry.id} title={entry.title} onDone={() => router.refresh()} />
        </div>
      ))}
    </article>
  );
}

function RemoveJournalButton({ id, title, onDone }: { id: string; title: string; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [armed, setArmed] = useState(false);
  const [failed, setFailed] = useState(false);

  const remove = async () => {
    setPending(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/v1/journals?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        setFailed(true);
        return;
      }
      setArmed(false);
      onDone();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  if (failed) {
    return <button type="button" className="oy-link" style={{ color: "#a33b2e" }} onClick={() => { setFailed(false); setArmed(true); }}>Removal failed — retry</button>;
  }

  if (armed) {
    return (
      <>
        <button type="button" className="oy-link" style={{ color: "#a33b2e" }} disabled={pending} onClick={() => void remove()}>{pending ? "Removing…" : "Confirm"}</button>
        <button type="button" className="oy-link" style={{ color: "var(--oy-stone)" }} disabled={pending} onClick={() => setArmed(false)}>Keep</button>
      </>
    );
  }

  return (
    <button type="button" className="oy-link" aria-label={`Remove reflection: ${title}`} onClick={() => setArmed(true)}>
      Remove
    </button>
  );
}
