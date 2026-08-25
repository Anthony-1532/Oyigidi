import type { NextRequest } from "next/server";
import { guardLimited, ok, readJson } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/session";
import { repo, audit } from "@/lib/db/store";
import { scoreDevelopmentAssessment } from "@/lib/coaching/assessment";
import { NotFoundError, num, str, validateObject } from "@/lib/shared/validation";

/**
 * Complete the active assessment: answers arrive per question; the server
 * scores them, saves a private result, seeds focused action-plan items, and
 * records a progress event.
 */
export const POST = async (request: NextRequest) =>
  guardLimited(request, "mutation", async () => {
    const person = await requireRole(request.headers, "client");
    const body = await readJson(request);
    const raw = validateObject(body, {
      answers: (v, name) => {
        if (!Array.isArray(v) || v.length === 0) throw Object.assign(new Error(`${name} must be a non-empty array`), { name: "ValidationError" });
        return v as Array<{ questionId?: unknown; domain?: unknown; value?: unknown }>;
      },
    });

    const assessment = repo.assessments.active();
    if (!assessment) throw new NotFoundError("No active assessment is available right now");
    const questions = repo.assessments.questionsFor(assessment.id);

    const answers = raw.answers.map((entry) => {
      const clean = validateObject(entry, {
        questionId: str(40),
        domain: str(60),
        value: num(1, 5),
      });
      if (!questions.some((q) => q.id === clean.questionId)) throw new NotFoundError(`Unknown question: ${clean.questionId}`);
      return clean;
    });

    const insight = scoreDevelopmentAssessment(answers);
    const result = repo.assessments.saveResult({
      clientId: person.id,
      assessmentId: assessment.id,
      insight: insight.insight,
      domainScores: insight.domainScores,
      answers,
      completedAt: new Date().toISOString(),
    });

    for (const item of insight.actionItems) {
      repo.plans.insert({ clientId: person.id, title: item.title, detail: item.description, completed: false, source: "assessment" });
    }
    repo.progressEvents.append({ clientId: person.id, eventType: "assessment_completed", title: `Completed ${assessment.title}`, detail: insight.insight });
    audit(person.id, "assessment_completed", "assessment_result", result.id, assessment.title);

    return ok({
      result,
      insight,
    });
  });
