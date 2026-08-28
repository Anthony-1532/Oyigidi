// Client workspace — server components read the store directly; interactive
// pieces are client islands that POST to /api/v1/* and refresh.

import { repo } from "@/lib/db/store";
import type { Person } from "@/lib/shared/types";
import { PageIntro, SafetyNote } from "@/components/shell";
import { ActionList } from "@/components/client/forms";

export function ClientWorkspace({ person }: { person: Person }) {
  const clientId = person.id;
  const goals = repo.goals.listByClient(clientId);
  const plans = repo.plans.listByClient(clientId);
  const journals = repo.journals.listByClient(clientId);
  const latestResult = repo.assessments.latestResult(clientId);
  const averageProgress = goals.length ? Math.round(goals.reduce((s, g) => s + g.progressPercent, 0) / goals.length) : 0;
  const openActions = plans.filter((p) => !p.completed);

  return <>
    <PageIntro
      eyebrow="Your development, continued"
      title={`Good to see you, ${person.preferredName ?? "there"}.`}
      subtitle="A calm place to return to your goals, notice what is changing, and decide what is next."
      action={
        <div style={{ display: "flex", gap: 8 }}>
          <a className="oy-button is-muted" href="/client/reflect">Reflect</a>
          <a className="oy-button" href="/client/learn">Compass check</a>
        </div>
      }
    />

    <div className="oy-today-grid">
      <article className="oy-card oy-focus-card">
        <div className="oy-card-label">Current focus</div>
        <div className="oy-focus-title">{person.developmentFocus ?? "Set your development focus"}</div>
        <p className="oy-card-copy">{goals.length ? `${goals.length} active goal${goals.length === 1 ? "" : "s"} · ${averageProgress}% average progress` : "Add a goal in My journey to ground your coaching."}</p>
        <div className="oy-focus-progress"><span>{averageProgress}% momentum</span><span>{openActions.length} open actions</span></div>
        <div className="oy-progress-track"><div className="oy-progress-value" style={{ "--value": `${averageProgress}%` } as React.CSSProperties} /></div>
      </article>
      <article className="oy-card oy-reflection-card">
        <div className="oy-card-label">{latestResult ? "Latest compass insight" : "A pattern to notice"}</div>
        <blockquote>“{latestResult?.insight ?? journals[0]?.content.slice(0, 150) ?? "Your first reflection creates a private place to notice what is changing before you decide what to do."}”</blockquote>
        <p>{latestResult ? "Generated from your latest assessment" : journals[0] ? "From your latest reflection" : "Reflections stay private to your journey"}</p>
      </article>
    </div>

    <section className="oy-section">
      <div className="oy-section-header">
        <h2 className="oy-section-title">Your next actions</h2>
        <a className="oy-link" href="/client/coach">Continue with Oyigidi →</a>
      </div>
      <article className="oy-card oy-plan-card" style={{ padding: 20 }}>
        <h3 className="oy-card-heading">Small steps, visible momentum</h3>
        <ActionList plans={plans} />
      </article>
      <SafetyNote style={{ marginTop: 14 }}>Oyigidi supports coaching and self-development. It is not a crisis or clinical-care service.</SafetyNote>
    </section>
  </>;
}
