import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { PageIntro, SafetyNote, WorkspaceShell } from "@/components/shell";
import { PracticePlayer } from "@/components/client/practice-player";

export default async function PracticePage() {
  const person = (await getSession(await headers()))!;
  const practices = repo.practices.listActive().map((practice) => ({
    id: practice.id,
    title: practice.title,
    intention: practice.intention,
    focus: practice.focus,
    steps: repo.practices.stepsFor(practice.id),
  }));
  const completions = repo.practices.completionsFor(person.id);
  const byId = new Map(practices.map((p) => [p.id, p.title]));

  return (
    <WorkspaceShell person={person} activeHref="/client/practice" sectionLabel="Coachee workspace" breadcrumb="Your development · Practice">
      <PageIntro
        eyebrow="Practice"
        title="Some things are worked out sitting still."
        subtitle="Short guided sequences to move through on your own — a different way of using your coaching than talking it through."
      />

      <PracticePlayer practices={practices} />

      {completions.length > 0 && (
        <section className="oy-section">
          <h2 className="oy-section-title">Practices you have sat with</h2>
          <article className="oy-card oy-plan-card" style={{ padding: 20 }}>
            {completions.map((completion) => (
              <div className="oy-plan-item" key={completion.id}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="oy-plan-title">{byId.get(completion.practiceId) ?? "A practice"}</div>
                  {completion.reflection && <div className="oy-plan-detail" style={{ whiteSpace: "pre-wrap" }}>{completion.reflection}</div>}
                  <div className="oy-activity-time">{new Date(completion.completedAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </article>
        </section>
      )}

      <SafetyNote>
        These are reflective coaching exercises, not clinical or crisis care. If something surfaces that needs more
        than a practice, bring it to your coach or to qualified local support.
      </SafetyNote>
    </WorkspaceShell>
  );
}
