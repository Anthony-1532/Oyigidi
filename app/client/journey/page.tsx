import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { PageIntro, WorkspaceShell } from "@/components/shell";
import { GoalControls } from "@/components/client/forms";

export default async function JourneyPage() {
  const person = (await getSession(await headers()))!;
  const goals = repo.goals.listByClient(person.id);
  const average = repo.goals.averageFor(person.id);
  return (
    <WorkspaceShell person={person} activeHref="/client/journey" sectionLabel="Client workspace" breadcrumb="Your development · My journey">
      <PageIntro eyebrow="My journey" title="Goals that hold their meaning." subtitle="Track each intention with honest, small progress updates." />
      <div className="oy-today-grid">
        <article className="oy-card oy-plan-card" style={{ padding: 22 }}>
          <div className="oy-card-label">Active goals</div>
          <GoalControls goals={goals.map((g) => ({ id: g.id, title: g.title, description: g.description, progressPercent: g.progressPercent, status: g.status }))} />
        </article>
        <aside>
          <article className="oy-card oy-focus-card">
            <div className="oy-card-label">Momentum</div>
            <div className="oy-focus-title">{average}%</div>
            <p className="oy-card-copy">Average progress across your active goals. Move a slider when something real changes — not before.</p>
          </article>
        </aside>
      </div>
    </WorkspaceShell>
  );
}
