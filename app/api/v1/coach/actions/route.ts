import type { NextRequest } from "next/server";
import { guardLimited, ok, readJson } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/session";
import { repo, audit } from "@/lib/db/store";
import { NotFoundError, oneOf, optional, str, validateObject } from "@/lib/shared/validation";

/** Every coach mutation, guarded and validated in one audited boundary. */
export const POST = async (request: NextRequest) =>
  guardLimited(request, "write", async () => {
    const coach = await requireRole(request.headers, "coach");
    const body = await readJson(request);
    const { action } = validateObject(body, { action: str(60) });

    switch (action) {
      case "assign-client": {
        const input = validateObject(body, { action: str(60), clientId: str(40) });
        if (repo.people.get(input.clientId).role !== "client") throw new NotFoundError("Client not found");
        if (repo.assignments.isActive(coach.id, input.clientId)) throw Object.assign(new Error("Already assigned"), { name: "Conflict" });
        const assignment = repo.assignments.insert({ coachId: coach.id, clientId: input.clientId, status: "active" });
        audit(coach.id, "client_assigned", "assignment", assignment.id, `Assigned ${input.clientId}`);
        return ok({ assignment });
      }
      case "end-assignment": {
        const input = validateObject(body, { action: str(60), clientId: str(40) });
        if (!repo.assignments.end(coach.id, input.clientId)) throw new NotFoundError("No active assignment for this client");
        audit(coach.id, "client_unassigned", "user", input.clientId);
        return ok({ ended: true });
      }
      case "enroll": {
        const input = validateObject(body, { action: str(60), clientId: str(40), programId: str(40) });
        if (!repo.assignments.isActive(coach.id, input.clientId)) throw new ForbiddenAssignment();
        repo.programs.get(input.programId); // 404 guard
        const enrollment = repo.enrollments.insert({ clientId: input.clientId, programId: input.programId, status: "active" });
        audit(coach.id, "client_enrolled", "enrollment", enrollment.id, `${input.clientId} → ${input.programId}`);
        return ok({ enrollment }, { status: 201 });
      }
      case "set-enrollment-status": {
        const input = validateObject(body, { action: str(60), clientId: str(40), programId: str(40), status: oneOf(["active", "paused", "completed"] as const) });
        if (!repo.enrollments.setStatus(input.clientId, input.programId, input.status)) throw new NotFoundError("Enrollment not found");
        audit(coach.id, "enrollment_status_changed", "enrollment", undefined, `${input.clientId} → ${input.status}`);
        return ok({ updated: true });
      }
      case "create-program": {
        const input = validateObject(body, {
          action: str(60),
          title: str(140, 3),
          description: optional(str(600)),
          aiInstructions: str(2000, 20),
          moduleTitle: str(140, 3),
          objectiveTitle: str(140, 3),
        });
        if (!input.aiInstructions.toLowerCase().includes("not") || !/(non-clinical|do not|crisis|diagnos)/i.test(input.aiInstructions)) {
          throw Object.assign(new Error("AI teaching instructions must include safety boundaries (e.g. non-clinical, no diagnosis, no crisis support)."), { name: "ValidationError" });
        }
        const program = repo.programs.insert({
          id: `pr_${Math.random().toString(36).slice(2, 8)}`,
          coachId: coach.id,
          title: input.title,
          description: input.description,
          status: "draft",
          aiInstructions: input.aiInstructions,
          createdAt: new Date().toISOString(),
        });
        const moduleRow = repo.programs.modules.insert({ programId: program.id, title: input.moduleTitle, position: 1 });
        repo.programs.objectives.insert({ moduleId: moduleRow.id, title: input.objectiveTitle, position: 1 });
        audit(coach.id, "program_created", "program", program.id, program.title);
        return ok({ program, moduleId: moduleRow.id }, { status: 201 });
      }
      case "add-curriculum-item": {
        const input = validateObject(body, {
          action: str(60),
          moduleId: str(40),
          kind: oneOf(["lesson", "exercise"] as const),
          title: str(140, 3),
          content: str(4000, 5),
        });
        const item = repo.programs.items.insert({ ...input, position: Date.now() % 100000 });
        audit(coach.id, "curriculum_item_added", "curriculum_item", item.id, `${item.kind}: ${item.title}`);
        return ok({ item }, { status: 201 });
      }
      case "remove-curriculum-item": {
        const input = validateObject(body, { action: str(60), itemId: str(40) });
        if (!repo.programs.items.remove(input.itemId)) throw new NotFoundError("Curriculum item not found");
        audit(coach.id, "curriculum_item_removed", "curriculum_item", input.itemId);
        return ok({ removed: true });
      }
      case "upload-knowledge": {
        const input = validateObject(body, {
          action: str(60),
          title: str(140, 3),
          content: str(2_000_000, 20),
          scope: oneOf(["coach", "program", "global"] as const),
          scopeId: optional(str(40)),
        });
        repo.knowledge.bases.ensure(coach.id);
        const document = repo.knowledge.upload({ title: input.title, knowledgeBaseId: "kb_1", scope: input.scope, scopeId: input.scopeId }, input.content);
        audit(coach.id, "knowledge_uploaded", "knowledge_document", document.id, `${document.title} · ${document.chunkCount} chunks`);
        return ok({ document }, { status: 201 });
      }
      case "create-group-session": {
        const input = validateObject(body, {
          action: str(60),
          programId: str(40),
          cohortTitle: str(120, 3),
          title: str(140, 3),
          agenda: (v) => (Array.isArray(v) ? v.map((x) => String(x).slice(0, 160)) : []),
          exercises: (v) => (Array.isArray(v) ? v.map((x) => String(x).slice(0, 160)) : []),
        });
        if (!input.agenda.length || !input.exercises.length) throw Object.assign(new Error("Agenda and exercises are required"), { name: "ValidationError" });
        repo.programs.get(input.programId);
        const session = repo.groupSessions.insert({ ...input, reflectionPrompt: undefined } as never);
        audit(coach.id, "group_session_created", "group_session", session.id, session.title);
        return ok({ session }, { status: 201 });
      }
      case "complete-group-session": {
        const input = validateObject(body, { action: str(60), sessionId: str(40), summary: str(2000, 10) });
        const session = repo.groupSessions.complete(input.sessionId, input.summary);
        audit(coach.id, "group_session_completed", "group_session", session.id);
        return ok({ session });
      }
      case "add-followup": {
        const input = validateObject(body, { action: str(60), sessionId: str(40), clientId: str(40), title: str(160, 3) });
        if (!repo.assignments.isActive(coach.id, input.clientId)) throw new ForbiddenAssignment();
        const followup = repo.followups.insert({ groupSessionId: input.sessionId, clientId: input.clientId, title: input.title });
        return ok({ followup }, { status: 201 });
      }
      case "review-session": {
        const input = validateObject(body, { action: str(60), sessionId: str(40), coachingOutcome: str(1000, 3) });
        const reviewed = repo.aiSessions.review(input.sessionId, input.coachingOutcome);
        if (reviewed.coachId !== coach.id) throw new ForbiddenAssignment();
        audit(coach.id, "ai_session_reviewed", "ai_session", reviewed.id, reviewed.summary?.slice(0, 80));
        return ok({ session: reviewed });
      }
      default:
        throw Object.assign(new Error(`Unknown action: ${action}`), { name: "ValidationError" });
    }
  });

class ForbiddenAssignment extends Error {
  constructor() {
    super("This action requires an active coach-client assignment");
    this.name = "ForbiddenError";
  }
}
