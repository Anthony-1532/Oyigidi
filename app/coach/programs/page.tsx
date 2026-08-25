import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { PageIntro, WorkspaceShell } from "@/components/shell";
import { CurriculumAdder, ProgramBuilder } from "@/components/coach/forms";

export default async function CoachProgramsPage() {
  const person = (await getSession(await headers()))!;
  const programs = repo.programs.listByCoach(person.id);
  const detail = programs[0] ? repo.programs.detail(programs[0].id) : null;

  return (
    <WorkspaceShell person={person} activeHref="/coach/programs" sectionLabel="Coach workspace" breadcrumb="Coach · Programs">
      <PageIntro eyebrow="Coach · Programs" title="Author the learning layer." subtitle="Each program carries your AI teaching instructions, modules, objectives, lessons, and exercises — the guardrails for every coaching conversation inside it." />
      <div className="oy-coach-grid">
        <article className="oy-card oy-plan-card" style={{ padding: 22 }}>
          <div className="oy-card-label">Your programs</div>
          <h3 className="oy-card-heading">{programs.length ? `${programs.length} program${programs.length === 1 ? "" : "s"}` : "No programs yet"}</h3>
          {programs.map((program) => (
            <div className="oy-plan-item" key={program.id}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="oy-plan-title">{program.title}</div>
                <div className="oy-plan-detail">{program.status} · {program.description ?? "No description"}</div>
              </div>
              <span className="oy-status">{program.status}</span>
            </div>
          ))}
          {detail && (
            <div style={{ marginTop: 18, borderTop: "1px solid #ece3d8", paddingTop: 14 }}>
              <div className="oy-card-label">Curriculum · {detail.program.title}</div>
              <div className="oy-milestone" style={{ marginTop: 10 }}><span>AI teaching instructions</span><p>{detail.program.aiInstructions}</p></div>
              {detail.modules.map((module) => {
                const items = detail.items.filter((i) => i.moduleId === module.id);
                const objectives = detail.objectives.filter((o) => o.moduleId === module.id);
                return (
                  <div key={module.id} style={{ marginTop: 14 }}>
                    <div className="oy-plan-item"><div className="oy-file-icon">📘</div><div><div className="oy-plan-title">{module.title}</div><div className="oy-plan-detail">{module.summary ?? `Position ${module.position}`}</div></div></div>
                    {objectives.map((objective) => (
                      <div className="oy-plan-item" key={objective.id} style={{ padding: "6px 0 0 30px" }}><span>🎯</span><div className="oy-plan-detail"><strong>{objective.title}</strong></div></div>
                    ))}
                    {items.map((item) => (
                      <div className="oy-plan-item" key={item.id} style={{ padding: "6px 0 0 30px" }}>
                        <div style={{ minWidth: 0, flex: 1 }}><div className="oy-plan-detail">{item.kind === "lesson" ? "Lesson · " : "Exercise · "}{item.title}</div></div>
                        <RemoveItemButton itemId={item.id} />
                      </div>
                    ))}
                    <CurriculumAdder moduleId={module.id} />
                  </div>
                );
              })}
            </div>
          )}
        </article>
        <aside><ProgramBuilder /></aside>
      </div>
    </WorkspaceShell>
  );
}

function RemoveItemButton({ itemId }: { itemId: string }) {
  void itemId;
  // Removal is available via the API; kept minimal in the demo UI.
  return null;
}
