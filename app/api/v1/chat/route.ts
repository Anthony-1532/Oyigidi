import type { NextRequest } from "next/server";
import { guardLimited, ok, readJson } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/session";
import { repo, audit } from "@/lib/db/store";
import { generateCoachingResponse, selectKnowledgeSnippets } from "@/lib/coaching/engine";
import { str, validateObject } from "@/lib/shared/validation";

/**
 * Safety-aware coaching chat. Assembles the client's private context
 * (focus, goals, assessment insight, curriculum instructions, scored knowledge
 * snippets), then generates a reply. Escalation messages short-circuit to a
 * supportive safety response and flag the AI session for coach review.
 */
export const POST = async (request: NextRequest) =>
  guardLimited(request, "chat", async () => {
    const person = await requireRole(request.headers, "client");
    const body = await readJson(request);
    const { content } = validateObject(body, { content: str(2000, 1) });

    const conversation = repo.conversations.ensure(person.id);
    const history = repo.messages.forConversation(conversation.id);

    const goals = repo.goals.listByClient(person.id);
    const latestResult = repo.assessments.latestResult(person.id);
    const enrollment = repo.enrollments.forClients([person.id])[0];
    const program = enrollment ? repo.programs.get(enrollment.programId) : null;
    const modules = program ? repo.programs.detail(program.id).modules : [];
    const objectives = program ? repo.programs.detail(program.id).objectives : [];

    // Retrieval: score approved chunks against this message plus coach intent.
    const chunks = repo.knowledge.readyChunks().map((c) => c.content);
    const query = [content, program?.aiInstructions ?? ""].filter(Boolean).join(" ");
    const snippets = selectKnowledgeSnippets(chunks, query, 3);

    const result = await generateCoachingResponse({
      message: content,
      history: history.map((m) => ({ role: m.role, content: m.content })),
      context: {
        preferredName: person.preferredName ?? person.name,
        developmentFocus: person.developmentFocus ?? null,
        goals: goals.map((g) => ({ title: g.title, progressPercent: g.progressPercent })),
        assessmentInsight: latestResult?.insight ?? null,
        curriculum: program
          ? { programTitle: program.title, moduleTitle: modules[0]?.title ?? null, objective: objectives[0]?.title ?? null }
          : null,
        coachInstructions: program?.aiInstructions ?? null,
        knowledgeSnippets: snippets,
      },
    });

    const userMessage = repo.messages.append({ conversationId: conversation.id, role: "client", content, safetyFlag: "none" });
    const assistantMessage = repo.messages.append({
      conversationId: conversation.id,
      role: "assistant",
      content: result.content,
      safetyFlag: result.safetyFlag,
    });

    // Every exchange is saved as an AI session so coaches keep human oversight.
    const assignment = repo.assignments.activeForCoach("usr_coach").find((a) => a.clientId === person.id);
    if (assignment) {
      const session = repo.aiSessions.start({ clientId: person.id, coachId: assignment.coachId });
      repo.aiSessions.review(
        session.id,
        result.safetyFlag === "escalation"
          ? `SAFETY ESCALATION — client message flagged; immediate supportive response issued. Review promptly.`
          : `Exchange about: ${content.slice(0, 120)}`,
      );
    }

    if (result.safetyFlag === "escalation") {
      audit(person.id, "safety_escalation", "conversation", conversation.id, "Client message matched escalation pattern; supportive response returned.");
    }

    return ok({
      userMessage,
      assistantMessage,
      suggestedActions: ["Reflect on this in your journal", "Turn it into a next action", "Explore with another question"],
      demoMode: result.demoMode,
    });
  });
