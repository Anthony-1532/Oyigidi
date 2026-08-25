"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Plan = { id: string; title: string; detail?: string; completed: boolean };

/** Next-action checklist with optimistic toggle + refresh. */
export function ActionList({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggle = async (plan: Plan) => {
    setBusyId(plan.id);
    try {
      await fetch("/api/v1/actions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: plan.id, completed: !plan.completed }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  return <>
    {plans.length ? plans.map((plan) => (
      <div className="oy-plan-item" key={plan.id}>
        <button
          type="button"
          className={`oy-check ${plan.completed ? "is-done" : ""}`}
          aria-label={`Mark ${plan.title} ${plan.completed ? "incomplete" : "complete"}`}
          disabled={busyId === plan.id}
          onClick={() => void toggle(plan)}
        >{plan.completed ? "✓" : ""}</button>
        <div>
          <div className="oy-plan-title">{plan.title}</div>
          <div className="oy-plan-detail">{plan.detail ?? "A practical step for your current journey."}</div>
        </div>
      </div>
    )) : <p className="oy-card-copy">No next actions yet — a compass check will create focused ones.</p>}
  </>;
}

/** Goal creation + progress slider. */
export function GoalControls({ goals }: { goals: Array<{ id: string; title: string; description?: string; progressPercent: number; status: string }> }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [localProgress, setLocalProgress] = useState<Record<string, number>>({});

  const createGoal = async () => {
    if (!title.trim()) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/goals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title }) });
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? "Could not add goal");
      setTitle("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add goal");
    } finally {
      setPending(false);
    }
  };

  const updateGoal = async (id: string, progressPercent: number) => {
    const status = progressPercent >= 100 ? "completed" : "active";
    const res = await fetch("/api/v1/goals", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, progressPercent, status }) });
    if (res.ok) router.refresh();
  };

  return <>
    {goals.map((goal) => {
      const value = localProgress[goal.id] ?? goal.progressPercent;
      return (
        <div className="oy-goal" key={goal.id}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="oy-plan-title">{goal.title}</div>
            <div className="oy-plan-detail">{goal.description ?? "Track this intention with small, visible progress."}</div>
            <input
              className="oy-slider"
              type="range"
              min={0}
              max={100}
              step={5}
              value={value}
              aria-label={`Progress for ${goal.title}`}
              onChange={(event) => setLocalProgress((current) => ({ ...current, [goal.id]: Number(event.target.value) }))}
              onMouseUp={(event) => void updateGoal(goal.id, Number((event.target as HTMLInputElement).value))}
              onTouchEnd={(event) => void updateGoal(goal.id, Number((event.target as HTMLInputElement).value))}
              onKeyUp={(event) => void updateGoal(goal.id, Number((event.target as HTMLInputElement).value))}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <span className="oy-status">{value >= 100 ? "completing…" : goal.status}</span>
              <span className="oy-client-muted">{value}%</span>
              <RemoveButton endpoint={`/api/v1/goals?id=${goal.id}`} label={`Remove ${goal.title}`} />
            </div>
          </div>
        </div>
      );
    })}
    <form className="oy-chat-input" style={{ marginTop: 14 }} onSubmit={(event) => { event.preventDefault(); void createGoal(); }}>
      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a development goal" aria-label="New development goal" />
      <button className="oy-send" type="submit" aria-label="Add goal" disabled={pending || !title.trim()}>+</button>
    </form>
    {error && <p className="oy-card-copy" style={{ color: "#a33b2e" }}>{error}</p>}
  </>;
}

export function RemoveButton({ endpoint, label }: { endpoint: string; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className="oy-link"
      style={{ marginLeft: "auto" }}
      disabled={pending}
      aria-label={label}
      onClick={async () => {
        setPending(true);
        try {
          const res = await fetch(endpoint, { method: "DELETE" });
          if (res.ok) router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      Remove
    </button>
  );
}

type JournalDraft = { id?: string; title: string; content: string };

/** Reflection editor (create or update). */
export function JournalEditor() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<JournalDraft>({ title: "A reflection for today", content: "" });
  const [pending, setPending] = useState(false);

  const save = async () => {
    setPending(true);
    try {
      const editing = Boolean(draft.id);
      const res = await fetch("/api/v1/journals", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editing ? draft : { title: draft.title, content: draft.content }),
      });
      if (res.ok) {
        setOpen(false);
        setDraft({ title: "A reflection for today", content: "" });
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  };

  return <>
    <button type="button" className="oy-button" onClick={() => setOpen(true)}>New reflection</button>
    {open && (
      <div className="oy-modal-wrap" role="dialog" aria-modal="true" aria-label="Reflection">
        <div className="oy-modal">
          <div className="oy-modal-head">
            <div><div className="oy-card-label">Reflection</div><h2>Notice what is becoming clear.</h2></div>
            <button className="oy-icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>
          <form className="oy-modal-body" onSubmit={(event) => { event.preventDefault(); void save(); }}>
            <label className="oy-question-domain" htmlFor="j-title">Title</label>
            <input id="j-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} style={{ width: "100%", margin: "7px 0 15px", padding: "11px 12px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" }} />
            <label className="oy-question-domain" htmlFor="j-content">What do you want to remember?</label>
            <textarea id="j-content" required rows={6} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} style={{ width: "100%", marginTop: 7, padding: "11px 12px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8", resize: "vertical" }} />
            <button type="submit" className="oy-button" style={{ width: "100%", marginTop: 16 }} disabled={pending}>{pending ? "Saving…" : "Save reflection"}</button>
          </form>
        </div>
      </div>
    )}
  </>;
}

export function EditJournalButton({ entry }: { entry: JournalDraft & { id: string } }) {
  void entry;
  return null;
}

/** Development Compass flow driven by the server's question definitions. */
export function AssessmentFlow({ assessment, questions }: {
  assessment: { id: string; title: string; description?: string } | null;
  questions: Array<{ id: string; prompt: string; domain: string }>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ insight: string; domainScores: Record<string, number> } | null>(null);

  if (!questions.length) {
    return <article className="oy-card oy-plan-card"><h3 className="oy-card-heading">No active compass check</h3><p className="oy-card-copy">When an administrator activates the Development Compass it appears here.</p></article>;
  }

  if (result) {
    return (
      <article className="oy-card oy-plan-card" style={{ maxWidth: 700 }}>
        <div className="oy-card-label">Your insight</div>
        <p className="oy-card-copy" style={{ fontSize: 15 }}>{result.insight}</p>
        <div className="oy-coverage" style={{ padding: "16px 0 0" }}>
          {Object.entries(result.domainScores).map(([domain, score]) => (
            <div className="oy-coverage-card" key={domain}><div className="oy-coverage-number">{score}</div><div className="oy-coverage-label">{domain}</div></div>
          ))}
        </div>
        <a className="oy-button is-muted" href="/client/journey" style={{ width: "100%", marginTop: 18, justifyContent: "center" }}>See your new actions in My journey</a>
      </article>
    );
  }

  const question = questions[step]!;
  const choose = async (value: number) => {
    const next = [...answers];
    next[step] = value;
    setAnswers(next);
    if (step < questions.length - 1) {
      setTimeout(() => setStep(step + 1), 150);
      return;
    }
    setSaving(true);
    const res = await fetch("/api/v1/assessments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: questions.map((q, index) => ({ questionId: q.id, domain: q.domain, value: next[index] ?? 3 })) }),
    });
    if (res.ok) {
      const payload = await res.json();
      setResult({ insight: payload.data.insight.insight, domainScores: payload.data.insight.domainScores });
      router.refresh();
    } else {
      setSaving(false);
    }
  };

  return (
    <article className="oy-card oy-plan-card" style={{ maxWidth: 700 }}>
      <div className="oy-card-label">{assessment?.title ?? "Development Compass"}</div>
      <p className="oy-card-copy">{assessment?.description}</p>
      <div className="oy-assessment-progress" style={{ marginTop: 14 }}>
        {questions.map((_, index) => <span key={index} className={index <= step ? "is-active" : ""} />)}
      </div>
      <div className="oy-question-domain" style={{ marginTop: 16 }}>{question.domain} · {step + 1} of {questions.length}</div>
      <div className="oy-question-text">{question.prompt}</div>
      <div className="oy-scale">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} type="button" className={answers[step] === value ? "is-selected" : ""} onClick={() => void choose(value)}>{value}</button>
        ))}
      </div>
      <div className="oy-scale-hints"><span>Not true today</span><span>Very true today</span></div>
      {saving && <p className="oy-card-copy" style={{ marginTop: 14 }}>Scoring your responses…</p>}
    </article>
  );
}
