"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Coach mutations — one client component per control cluster, all via /api/v1/coach/actions. */

async function coachAction(payload: Record<string, unknown>): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/v1/coach/actions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: payload.action, ...payload }),
  });
  if (res.ok) return { ok: true };
  const payload2 = await res.json().catch(() => null);
  return { ok: false, message: payload2?.error?.message ?? `Request failed (${res.status})` };
}

export function AssignmentControls({ availableClients }: { availableClients: Array<{ id: string; name: string; email: string }> }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const assign = async (clientId: string) => {
    setPendingId(clientId);
    setMessage(null);
    const result = await coachAction({ action: "assign-client", clientId });
    setPendingId(null);
    if (!result.ok) return setMessage(result.message!);
    router.refresh();
  };

  return <>
    {availableClients.map((client) => (
      <div className="oy-plan-item" key={client.id} style={{ alignItems: "center" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="oy-plan-title">{client.name}</div>
          <div className="oy-plan-detail">{client.email}</div>
        </div>
        <button type="button" className="oy-button" disabled={pendingId === client.id} onClick={() => void assign(client.id)}>
          {pendingId === client.id ? "Assigning…" : "Assign"}
        </button>
      </div>
    ))}
    {!availableClients.length && <p className="oy-card-copy">Every active client already has a coach.</p>}
    {message && <p className="oy-card-copy" style={{ color: "#a33b2e" }}>{message}</p>}
  </>;
}

export function EnrollmentControls({ clientId, programId, programTitle, enrolled }: { clientId: string; programId: string | null; programTitle?: string; enrolled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (!programId) return <p className="oy-card-copy">Create a program first to enable enrollment.</p>;

  const run = async (payload: Record<string, unknown>) => {
    setPending(true);
    try {
      await coachAction(payload);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button type="button" className="oy-button is-muted" disabled={pending || enrolled} onClick={() => void run({ action: "enroll", clientId, programId })}>
        {enrolled ? "Already enrolled" : `Enroll in ${programTitle ?? "program"}`}
      </button>
      <button type="button" className="oy-button is-muted" disabled={pending} onClick={() => void run({ action: "set-enrollment-status", clientId, programId, status: "paused" })}>Pause enrollment</button>
      <button type="button" className="oy-button is-muted" disabled={pending} onClick={() => void run({ action: "end-assignment", clientId })}>End assignment</button>
    </div>
  );
}

export function ProgramBuilder() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    aiInstructions: "Use reflective, non-clinical coaching questions. Do not diagnose, prescribe treatment, or attempt crisis support.",
    moduleTitle: "First learning module",
    objectiveTitle: "Identify one practical development step",
  });

  if (!open) {
    return <button type="button" className="oy-button" onClick={() => setOpen(true)}>New program</button>;
  }

  const create = async () => {
    setPending(true);
    setError(null);
    const result = await coachAction({ action: "create-program", ...form, description: form.description || undefined });
    setPending(false);
    if (!result.ok) return setError(result.message!);
    setOpen(false);
    router.refresh();
  };

  return (
    <article className="oy-card oy-builder" style={{ padding: 20 }}>
      <div className="oy-card-label">New program</div>
      <form onSubmit={(event) => { event.preventDefault(); void create(); }}>
        <label className="oy-question-domain" htmlFor="p-title" style={{ display: "block", marginTop: 10 }}>Program title</label>
        <input id="p-title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} style={{ width: "100%", marginTop: 6, padding: "10px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" }} />
        <label className="oy-question-domain" htmlFor="p-desc" style={{ display: "block", marginTop: 12 }}>Description</label>
        <textarea id="p-desc" rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} style={{ width: "100%", marginTop: 6, padding: "10px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" }} />
        <label className="oy-question-domain" htmlFor="p-ai" style={{ display: "block", marginTop: 12 }}>AI teaching instructions (must state safety boundaries)</label>
        <textarea id="p-ai" required rows={4} value={form.aiInstructions} onChange={(event) => setForm({ ...form, aiInstructions: event.target.value })} style={{ width: "100%", marginTop: 6, padding: "10px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" }} />
        <label className="oy-question-domain" htmlFor="p-mod" style={{ display: "block", marginTop: 12 }}>First module</label>
        <input id="p-mod" required value={form.moduleTitle} onChange={(event) => setForm({ ...form, moduleTitle: event.target.value })} style={{ width: "100%", marginTop: 6, padding: "10px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" }} />
        <label className="oy-question-domain" htmlFor="p-obj" style={{ display: "block", marginTop: 12 }}>First learning objective</label>
        <input id="p-obj" required value={form.objectiveTitle} onChange={(event) => setForm({ ...form, objectiveTitle: event.target.value })} style={{ width: "100%", marginTop: 6, padding: "10px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" }} />
        {error && <p className="oy-card-copy" style={{ color: "#a33b2e", marginTop: 10 }}>{error}</p>}
        <button type="submit" className="oy-button" style={{ width: "100%", marginTop: 14 }} disabled={pending}>{pending ? "Creating…" : "Create program"}</button>
      </form>
    </article>
  );
}

export function CurriculumAdder({ moduleId }: { moduleId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<"lesson" | "exercise">("lesson");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await coachAction({ action: "add-curriculum-item", moduleId, kind, title, content });
      if (!result.ok) {
        // Keep the draft on screen — clearing it would discard authored content.
        setError(result.message!);
        return;
      }
      setTitle("");
      setContent("");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <form style={{ display: "grid", gap: 6, padding: "8px 0 0 30px" }} onSubmit={(event) => { event.preventDefault(); void add(); }}>
      <div style={{ display: "flex", gap: 6 }}>
        <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} aria-label="Item type" style={{ padding: 7, borderRadius: 7, border: "1px solid #e4d9cc", background: "#fffdf8" }}>
          <option value="lesson">Lesson</option><option value="exercise">Exercise</option>
        </select>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" aria-label="Curriculum item title" required style={{ flex: 1, minWidth: 0, padding: "9px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" }} />
      </div>
      <textarea rows={2} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Content or prompt" aria-label="Curriculum item content" required style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8", resize: "vertical" }} />
      {error && <p className="oy-card-copy" style={{ color: "#a33b2e" }}>{error}</p>}
      <button type="submit" className="oy-button is-muted" disabled={pending || !title.trim() || !content.trim()}>{pending ? "Adding…" : "Add to module"}</button>
    </form>
  );
}

export function KnowledgeUploader() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scope, setScope] = useState<"coach" | "program" | "global">("coach");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const upload = async () => {
    setPending(true);
    setFeedback(null);
    const result = await coachAction({ action: "upload-knowledge", title, content, scope });
    setPending(false);
    if (!result.ok) return setFeedback(result.message!);
    setFeedback(`Uploaded — chunked and retrieval-ready.`);
    setTitle("");
    setContent("");
    router.refresh();
  };

  return (
    <article className="oy-card oy-builder" style={{ padding: 20 }}>
      <div className="oy-card-label">Upload a text source</div>
      <form onSubmit={(event) => { event.preventDefault(); void upload(); }}>
        <label className="oy-question-domain" htmlFor="k-title" style={{ display: "block", marginTop: 10 }}>Source title</label>
        <input id="k-title" required minLength={3} value={title} onChange={(event) => setTitle(event.target.value)} style={{ width: "100%", marginTop: 6, padding: "10px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" }} />
        <label className="oy-question-domain" htmlFor="k-scope" style={{ display: "block", marginTop: 12 }}>Retrieval scope</label>
        <select id="k-scope" value={scope} onChange={(event) => setScope(event.target.value as typeof scope)} style={{ width: "100%", marginTop: 6, padding: "10px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" }}>
          <option value="coach">This coach workspace</option><option value="global">Global</option>
        </select>
        <label className="oy-question-domain" htmlFor="k-content" style={{ display: "block", marginTop: 12 }}>Content (min 20 characters)</label>
        <textarea id="k-content" required minLength={20} rows={7} value={content} onChange={(event) => setContent(event.target.value)} style={{ width: "100%", marginTop: 6, padding: "10px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8", resize: "vertical" }} />
        {feedback && <p className="oy-card-copy" style={{ marginTop: 10 }}>{feedback}</p>}
        <button type="submit" className="oy-button" style={{ width: "100%", marginTop: 12 }} disabled={pending}>{pending ? "Uploading…" : "Upload for retrieval"}</button>
      </form>
    </article>
  );
}

export function SessionControls({ sessions, clients }: { sessions: Array<{ id: string; title: string; status: string; summary?: string }>; clients: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [summary, setSummary] = useState<Record<string, string>>({});
  const [followUpFor, setFollowUpFor] = useState<Record<string, { clientId: string; title: string }>>({});
  const [pending, setPending] = useState(false);

  const run = async (payload: Record<string, unknown>) => {
    setPending(true);
    try {
      const result = await coachAction(payload);
      if (result.ok) router.refresh();
      return result;
    } finally {
      setPending(false);
    }
  };

  return <>
    {sessions.map((session) => {
      const followup = followUpFor[session.id] ?? { clientId: clients[0]?.id ?? "", title: "" };
      return (
        <div className="oy-plan-item" key={session.id} style={{ flexWrap: "wrap" }}>
          <div style={{ minWidth: 240, flex: 1 }}>
            <div className="oy-plan-title">{session.title} · <span className="oy-client-muted">{session.status}</span></div>
            {session.summary && <div className="oy-plan-detail">{session.summary.slice(0, 160)}</div>}
            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              <select aria-label={`Participant for ${session.title}`} value={followup.clientId} onChange={(event) => setFollowUpFor({ ...followUpFor, [session.id]: { ...followup, clientId: event.target.value } })} style={{ maxWidth: 240, padding: "8px 10px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" }}>
                <option value="">Select participant</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input placeholder="Individual follow-up action" aria-label={`Follow-up for ${session.title}`} value={followup.title} onChange={(event) => setFollowUpFor({ ...followUpFor, [session.id]: { ...followup, title: event.target.value } })} style={{ maxWidth: 320, padding: "8px 10px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" }} />
              <button
                type="button"
                className="oy-button is-muted"
                disabled={pending || !followup.clientId || followup.title.trim().length < 3}
                onClick={() => void run({ action: "add-followup", sessionId: session.id, clientId: followup.clientId, title: followup.title })}
              >Save follow-up</button>
            </div>
          </div>
          {session.status !== "completed" && (
            <form style={{ display: "grid", gap: 6, minWidth: 220 }} onSubmit={(event) => { event.preventDefault(); void run({ action: "complete-group-session", sessionId: session.id, summary: summary[session.id] ?? "" }); }}>
              <textarea rows={2} placeholder="Session summary (min 10 chars)" aria-label={`Summary for ${session.title}`} value={summary[session.id] ?? ""} onChange={(event) => setSummary({ ...summary, [session.id]: event.target.value })} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" }} />
              <button type="submit" className="oy-button is-muted" disabled={pending || (summary[session.id]?.trim().length ?? 0) < 10}>Complete with summary</button>
            </form>
          )}
        </div>
      );
    })}
  </>;
}

export function ReviewControls({ sessions }: { sessions: Array<{ id: string; summary?: string; createdAt: string; status: string; safetyFlag: string }> }) {
  const router = useRouter();
  const [outcomes, setOutcomes] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const review = async (sessionId: string) => {
    setPending(true);
    try {
      const result = await coachAction({ action: "review-session", sessionId, coachingOutcome: outcomes[sessionId] ?? "" });
      if (result.ok) router.refresh();
    } finally {
      setPending(false);
    }
  };

  return <>
    {sessions.length ? sessions.map((session) => (
      <div className="oy-plan-item" key={session.id} style={{ flexWrap: "wrap" }}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <div className="oy-plan-title">AI session · {new Date(session.createdAt).toLocaleString()}</div>
          <div className="oy-plan-detail">{session.summary ?? "No summary captured."}</div>
          {session.safetyFlag === "escalation" && <span className="oy-escalation-tag">Safety flag · escalation</span>}
          {session.status === "reviewed" && <span className="oy-status" style={{ marginLeft: 8 }}>reviewed</span>}
        </div>
        {session.status !== "reviewed" && (
          <form style={{ display: "grid", gap: 6, minWidth: 250, flex: 1 }} onSubmit={(event) => { event.preventDefault(); void review(session.id); }}>
            <textarea rows={3} required minLength={3} placeholder="Your oversight note" aria-label={`Oversight note for session ${session.id}`} value={outcomes[session.id] ?? ""} onChange={(event) => setOutcomes({ ...outcomes, [session.id]: event.target.value })} style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8", resize: "vertical" }} />
            <button type="submit" className="oy-button" disabled={pending}>{pending ? "Saving review…" : "Mark reviewed"}</button>
          </form>
        )}
      </div>
    )) : <p className="oy-card-copy">New AI sessions appear here as your assigned clients coach with Oyigidi.</p>}
  </>;
}

/** Removal of an authored curriculum item. Two-step: authored content is not
 *  recoverable once removed, so a stray click must not destroy it. */
export function CurriculumItemRemover({ itemId, title }: { itemId: string; title: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await coachAction({ action: "remove-curriculum-item", itemId });
      if (!result.ok) {
        setError(result.message!);
        return;
      }
      setArmed(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  if (error) {
    return <button type="button" className="oy-link" style={{ color: "#a33b2e" }} onClick={() => { setError(null); setArmed(true); }}>Removal failed — retry</button>;
  }

  if (armed) {
    return <>
      <button type="button" className="oy-link" style={{ color: "#a33b2e" }} disabled={pending} onClick={() => void remove()}>{pending ? "Removing…" : "Confirm"}</button>
      <button type="button" className="oy-link" style={{ color: "var(--oy-stone)" }} disabled={pending} onClick={() => setArmed(false)}>Keep</button>
    </>;
  }

  return <button type="button" className="oy-link" aria-label={`Remove ${title}`} onClick={() => setArmed(true)}>Remove</button>;
}

/** Group session scheduling. The API requires a non-empty agenda and exercise
 *  list, so both are entered one item per line and validated before sending. */
export function SessionCreator({ programs }: { programs: Array<{ id: string; title: string }> }) {
  const router = useRouter();
  const [form, setForm] = useState({ programId: programs[0]?.id ?? "", cohortTitle: "", title: "", agenda: "", exercises: "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);
  const agenda = lines(form.agenda);
  const exercises = lines(form.exercises);
  const ready = Boolean(form.programId) && form.cohortTitle.trim().length >= 3 && form.title.trim().length >= 3 && agenda.length > 0 && exercises.length > 0;

  const create = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await coachAction({ action: "create-group-session", programId: form.programId, cohortTitle: form.cohortTitle, title: form.title, agenda, exercises });
      if (!result.ok) {
        setError(result.message!);
        return;
      }
      setForm({ programId: form.programId, cohortTitle: "", title: "", agenda: "", exercises: "" });
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  if (!programs.length) {
    return (
      <article className="oy-card oy-builder" style={{ padding: 20 }}>
        <div className="oy-card-label">Schedule a session</div>
        <p className="oy-card-copy" style={{ marginTop: 10 }}>A group session belongs to a program. Author one under Programs first, then schedule a cohort around it.</p>
        <a className="oy-button is-muted" href="/coach/programs" style={{ marginTop: 12 }}>Go to Programs</a>
      </article>
    );
  }

  const field = { width: "100%", marginTop: 6, padding: "10px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" } as const;

  return (
    <article className="oy-card oy-builder" style={{ padding: 20 }}>
      <div className="oy-card-label">Schedule a session</div>
      <form onSubmit={(event) => { event.preventDefault(); void create(); }}>
        <label className="oy-question-domain" htmlFor="s-program" style={{ display: "block", marginTop: 10 }}>Program</label>
        <select id="s-program" value={form.programId} onChange={(event) => setForm({ ...form, programId: event.target.value })} style={field}>
          {programs.map((program) => <option key={program.id} value={program.id}>{program.title}</option>)}
        </select>
        <label className="oy-question-domain" htmlFor="s-cohort" style={{ display: "block", marginTop: 12 }}>Cohort</label>
        <input id="s-cohort" required minLength={3} value={form.cohortTitle} onChange={(event) => setForm({ ...form, cohortTitle: event.target.value })} style={field} />
        <label className="oy-question-domain" htmlFor="s-title" style={{ display: "block", marginTop: 12 }}>Session title</label>
        <input id="s-title" required minLength={3} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} style={field} />
        <label className="oy-question-domain" htmlFor="s-agenda" style={{ display: "block", marginTop: 12 }}>Agenda — one item per line</label>
        <textarea id="s-agenda" required rows={3} value={form.agenda} onChange={(event) => setForm({ ...form, agenda: event.target.value })} style={{ ...field, resize: "vertical" }} />
        <label className="oy-question-domain" htmlFor="s-exercises" style={{ display: "block", marginTop: 12 }}>Exercises — one per line</label>
        <textarea id="s-exercises" required rows={3} value={form.exercises} onChange={(event) => setForm({ ...form, exercises: event.target.value })} style={{ ...field, resize: "vertical" }} />
        {error && <p className="oy-card-copy" style={{ color: "#a33b2e", marginTop: 10 }}>{error}</p>}
        <button type="submit" className="oy-button" style={{ width: "100%", marginTop: 14 }} disabled={pending || !ready}>{pending ? "Scheduling…" : "Schedule session"}</button>
      </form>
    </article>
  );
}
