"use client";

// Guided reflective practice — a paced sequence a coachee moves through on
// their own, alongside the text conversation with their coach.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type StepKind = "settle" | "breath" | "reflect" | "close";
type Step = { id: string; kind: StepKind; title: string; body: string; seconds: number; position: number };
export type Practice = { id: string; title: string; intention: string; focus: string; steps: Step[] };

const BREATH_IN = 4;
const BREATH_OUT = 6;
const CYCLE = BREATH_IN + BREATH_OUT;

const mmss = (total: number) => `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;

export function PracticePlayer({ practices }: { practices: Practice[] }) {
  const router = useRouter();
  const [active, setActive] = useState<Practice | null>(null);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [elapsedInStep, setElapsedInStep] = useState(0);
  const [present, setPresent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const remainingRef = useRef(0);

  const step: Step | undefined = active?.steps[index];
  // A reflection should never be interrupted mid-sentence, so only the paced
  // steps run themselves out; reflect steps wait for the coachee.
  const autoAdvances = step ? step.kind !== "reflect" : false;

  const start = (practice: Practice) => {
    setActive(practice);
    setIndex(0);
    setRemaining(practice.steps[0]?.seconds ?? 0);
    remainingRef.current = practice.steps[0]?.seconds ?? 0;
    setElapsedInStep(0);
    setPresent(0);
    setPaused(false);
    setReflection("");
    setError(null);
    setFinished(false);
  };

  const leave = useCallback(() => {
    setActive(null);
    setFinished(false);
    setPaused(false);
  }, []);

  const goTo = useCallback((next: number) => {
    if (!active) return;
    const nextStep = active.steps[next];
    if (!nextStep) return;
    setIndex(next);
    setRemaining(nextStep.seconds);
    remainingRef.current = nextStep.seconds;
    setElapsedInStep(0);
  }, [active]);

  const advance = useCallback(() => goTo(index + 1), [goTo, index]);

  // One interval owns the countdown and the hand-off to the next step. The
  // remaining seconds are mirrored in a ref because the callback needs to read
  // the current value to know when a step is over, and it would otherwise close
  // over a stale one.
  useEffect(() => {
    if (!active || paused || finished) return;
    const current = active.steps[index];
    if (!current) return;
    const auto = current.kind !== "reflect";
    const isLastStep = index >= active.steps.length - 1;
    const id = window.setInterval(() => {
      setPresent((p) => p + 1);
      setElapsedInStep((e) => e + 1);
      const next = Math.max(0, remainingRef.current - 1);
      remainingRef.current = next;
      setRemaining(next);
      if (next === 0 && auto && !isLastStep) goTo(index + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [active, paused, finished, index, goTo]);

  // Move focus to the new step so a screen reader announces it rather than
  // leaving the user on a button that has changed underneath them.
  useEffect(() => {
    if (active) headingRef.current?.focus();
  }, [index, active]);

  const finish = async () => {
    if (!active) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/practices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          practiceId: active.id,
          secondsPresent: present,
          ...(reflection.trim() ? { reflection: reflection.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setError(payload?.error?.message ?? "That practice could not be saved. Your reflection is still here.");
        return;
      }
      setFinished(true);
      router.refresh();
    } catch {
      setError("That practice could not be saved. Your reflection is still here.");
    } finally {
      setSaving(false);
    }
  };

  if (!active) {
    return (
      <div className="oy-practice-list">
        {practices.length ? practices.map((practice) => (
          <article className="oy-card oy-practice-card" key={practice.id}>
            <div className="oy-card-label">{practice.focus}</div>
            <h3 className="oy-card-heading">{practice.title}</h3>
            <p className="oy-card-copy">{practice.intention}</p>
            <div className="oy-practice-meta">
              <span>{practice.steps.length} steps</span>
              <span>·</span>
              <span>about {Math.round(practice.steps.reduce((s, x) => s + x.seconds, 0) / 60)} min</span>
            </div>
            <button type="button" className="oy-button" onClick={() => start(practice)}>Begin practice</button>
          </article>
        )) : <article className="oy-card oy-plan-card" style={{ padding: 20 }}><p className="oy-card-copy">No practices are available yet.</p></article>}
      </div>
    );
  }

  if (finished) {
    return (
      <article className="oy-card oy-practice-stage">
        <div className="oy-card-label">Practice complete</div>
        <h2 className="oy-practice-title" tabIndex={-1} ref={headingRef}>{active.title}</h2>
        <p className="oy-card-copy">You stayed with it for {mmss(present)}.{reflection.trim() ? " Your reflection is saved to your journal." : ""}</p>
        <div className="oy-practice-controls">
          <button type="button" className="oy-button" onClick={leave}>Done</button>
          <button type="button" className="oy-button is-muted" onClick={() => start(active)}>Again</button>
        </div>
      </article>
    );
  }

  const isLast = index === active.steps.length - 1;
  const phase = step?.kind === "breath" ? (elapsedInStep % CYCLE < BREATH_IN ? "in" : "out") : null;

  return (
    <article className="oy-card oy-practice-stage">
      <div className="oy-practice-head">
        <div className="oy-card-label">{active.title}</div>
        <button type="button" className="oy-link" onClick={leave}>Leave practice</button>
      </div>

      <div className="oy-practice-progress" aria-hidden="true">
        {active.steps.map((s, i) => <span key={s.id} className={i <= index ? "is-done" : ""} />)}
      </div>

      <h2 className="oy-practice-title" tabIndex={-1} ref={headingRef}>{step?.title}</h2>
      <p className="oy-practice-body">{step?.body}</p>

      {phase && (
        <div className="oy-breath" role="status" aria-live="polite">
          {/* The circle is decoration; the words carry the pacing, so this still
              works when the viewer has asked for reduced motion. */}
          <div className={`oy-breath-orb is-${phase}`} aria-hidden="true" />
          <span className="oy-breath-cue">{phase === "in" ? "Breathe in" : "Breathe out"}</span>
        </div>
      )}

      {step?.kind === "reflect" && (
        <textarea
          className="oy-practice-input"
          rows={5}
          value={reflection}
          onChange={(event) => setReflection(event.target.value)}
          placeholder="Write as much or as little as you want — this is yours."
          aria-label={step.title}
        />
      )}

      <div className="oy-practice-timer" role="status" aria-live="off">
        {autoAdvances ? (paused ? "Paused" : `${mmss(remaining)} remaining`) : "Take the time you need"}
      </div>

      {error && <p className="oy-card-copy" style={{ color: "#a33b2e" }}>{error}</p>}

      <div className="oy-practice-controls">
        {isLast ? (
          <button type="button" className="oy-button" disabled={saving} onClick={() => void finish()}>{saving ? "Saving…" : "Complete practice"}</button>
        ) : (
          <button type="button" className="oy-button" onClick={advance}>Continue</button>
        )}
        {autoAdvances && !isLast && (
          <button type="button" className="oy-button is-muted" onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</button>
        )}
      </div>
    </article>
  );
}
