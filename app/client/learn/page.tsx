import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { PageIntro } from "@/components/shell";
import { AssessmentFlow } from "@/components/client/forms";

export default async function LearnPage() {
  const person = (await getSession(await headers()))!;
  const assessment = repo.assessments.active();
  const questions = assessment ? repo.assessments.questionsFor(assessment.id) : [];
  const latestResult = repo.assessments.latestResult(person.id);

  return (
    <>
      <PageIntro
        eyebrow="Learn"
        title={assessment ? "Find the most useful place to begin." : "No active compass check yet."}
        subtitle={assessment ? "Answer for where you honestly are today — there are no right answers." : "When an administrator activates the Development Compass it appears here."}
      />
      <AssessmentFlow
        assessment={assessment ? { id: assessment.id, title: assessment.title, description: assessment.description } : null}
        questions={questions.map((q) => ({ id: q.id, prompt: q.prompt, domain: q.domain }))}
      />
      {latestResult && (
        <section className="oy-section">
          <h2 className="oy-section-title">Previous insight</h2>
          <article className="oy-card oy-plan-card" style={{ padding: 20 }}>
            <p className="oy-card-copy">{latestResult.insight}</p>
            <div className="oy-coverage" style={{ padding: "12px 0 0" }}>
              {Object.entries(latestResult.domainScores).map(([domain, score]) => (
                <div className="oy-coverage-card" key={domain}><div className="oy-coverage-number">{score}</div><div className="oy-coverage-label">{domain}</div></div>
              ))}
            </div>
          </article>
        </section>
      )}
    </>
  );
}
