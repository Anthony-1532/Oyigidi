"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Journal = { id: string; title: string; content: string; createdAt: string };

/** Inline reflection list with edit + delete. */
export function JournalList({ journals }: { journals: Journal[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", content: "" });
  const [pending, setPending] = useState(false);

  const saveEdit = async () => {
    if (!editingId) return;
    setPending(true);
    try {
      await fetch("/api/v1/journals", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editingId, title: draft.title, content: draft.content }),
      });
      setEditingId(null);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  if (!journals.length) {
    return <article className="oy-card oy-plan-card" style={{ padding: 20 }}><p className="oy-card-copy">No reflections yet. Your first one can be a single honest sentence.</p></article>;
  }

  return (
    <article className="oy-card oy-plan-card" style={{ padding: 20 }}>
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
            <button type="button" className="oy-link" disabled={pending} onClick={() => void saveEdit()}>Save</button>
          ) : (
            <button type="button" className="oy-link" onClick={() => { setEditingId(entry.id); setDraft({ title: entry.title, content: entry.content }); }}>Edit</button>
          )}
          <RemoveJournalButton id={entry.id} onDone={() => router.refresh()} />
        </div>
      ))}
    </article>
  );
}

function RemoveJournalButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className="oy-link"
      aria-label="Remove reflection"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await fetch(`/api/v1/journals?id=${id}`, { method: "DELETE" });
          onDone();
        } finally {
          setPending(false);
        }
      }}
    >
      Remove
    </button>
  );
}

