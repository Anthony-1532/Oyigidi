// Shared coaching context assembly.
//
// Chat and guided practice both speak to the same coachee and must speak from
// the same picture. Assembling this in one place keeps them from drifting
// apart, and keeps every AI surface on the same oversight and safety path —
// a reflection written during a quiet practice is at least as likely to carry
// something serious as a chat message, so it cannot take a shorter route.

import { repo, audit } from "@/lib/db/store";
import { selectKnowledgeSnippets, type CoachingContext } from "@/lib/coaching/engine";
import type { Person } from "@/lib/shared/types";

/** A coachee's private context: focus, goals, insight, curriculum, knowledge. */
export function buildCoacheeContext(person: Person, query: string): CoachingContext {
  const goals = repo.goals.listByClient(person.id);
  const latestResult = repo.assessments.latestResult(person.id);
  const enrollment = repo.enrollments.forClients([person.id])[0];
  const program = enrollment ? repo.programs.get(enrollment.programId) : null;
  const detail = program ? repo.programs.detail(program.id) : null;

  const chunks = repo.knowledge.readyChunks().map((chunk) => chunk.content);
  const query_ = [query, program?.aiInstructions ?? ""].filter(Boolean).join(" ");

  return {
    preferredName: person.preferredName ?? person.name,
    developmentFocus: person.developmentFocus ?? null,
    goals: goals.map((goal) => ({ title: goal.title, progressPercent: goal.progressPercent })),
    assessmentInsight: latestResult?.insight ?? null,
    curriculum: program
      ? { programTitle: program.title, moduleTitle: detail?.modules[0]?.title ?? null, objective: detail?.objectives[0]?.title ?? null }
      : null,
    coachInstructions: program?.aiInstructions ?? null,
    knowledgeSnippets: selectKnowledgeSnippets(chunks, query_, 3),
  };
}

/**
 * Save an AI exchange for the coach to review, and audit an escalation.
 * Called by every surface that generates coaching, so nothing the AI says
 * escapes human oversight.
 */
export function recordOversight(input: {
  person: Person;
  safetyFlag: "none" | "escalation";
  summary: string;
  escalationDetail: string;
  entityType: string;
  entityId?: string;
}) {
  const assignment = repo.assignments.activeForCoach("usr_coach").find((a) => a.clientId === input.person.id);
  if (assignment) {
    const session = repo.aiSessions.start({ clientId: input.person.id, coachId: assignment.coachId });
    repo.aiSessions.review(session.id, input.summary);
  }
  if (input.safetyFlag === "escalation") {
    audit(input.person.id, "safety_escalation", input.entityType, input.entityId, input.escalationDetail);
  }
}
