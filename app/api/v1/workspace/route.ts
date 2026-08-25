import type { NextRequest } from "next/server";
import { guardLimited, ok } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";

/** The full private workspace bundle for the signed-in client. */
export const GET = async (request: NextRequest) =>
  guardLimited(request, "mutation", async () => {
    const person = await requireRole(request.headers, "client");
    const goals = repo.goals.listByClient(person.id);
    const plans = repo.plans.listByClient(person.id);
    const journals = repo.journals.listByClient(person.id);
    const conversation = repo.conversations.ensure(person.id);
    const messages = repo.messages.forConversation(conversation.id);
    const assessment = repo.assessments.active();
    const questions = assessment ? repo.assessments.questionsFor(assessment.id) : [];
    const latestResult = repo.assessments.latestResult(person.id);
    const enrollments = repo.enrollments.forClients([person.id]);
    const events = repo.progressEvents.forClient(person.id).slice(0, 8);

    return ok({
      profile: {
        preferredName: person.preferredName ?? person.name.split(" ")[0],
        developmentFocus: person.developmentFocus ?? null,
        onboardingComplete: person.onboardingComplete,
      },
      goals,
      plans,
      journals,
      conversation,
      messages,
      activeAssessment: assessment,
      assessmentQuestions: questions,
      latestAssessment: latestResult,
      enrollment: enrollments[0] ?? null,
      progressEvents: events,
    });
  });
