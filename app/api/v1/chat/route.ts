import type { NextRequest } from "next/server";
import { guardLimited, ok, readJson } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { buildCoacheeContext, recordOversight } from "@/lib/coaching/context";
import { generateCoachingResponse } from "@/lib/coaching/engine";
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

    const result = await generateCoachingResponse({
      message: content,
      history: history.map((m) => ({ role: m.role, content: m.content })),
      context: buildCoacheeContext(person, content),
    });

    const userMessage = repo.messages.append({ conversationId: conversation.id, role: "client", content, safetyFlag: "none" });
    const assistantMessage = repo.messages.append({
      conversationId: conversation.id,
      role: "assistant",
      content: result.content,
      safetyFlag: result.safetyFlag,
    });

    // Every exchange is saved as an AI session so coaches keep human oversight.
    recordOversight({
      person,
      safetyFlag: result.safetyFlag,
      summary:
        result.safetyFlag === "escalation"
          ? `SAFETY ESCALATION — coachee message flagged; immediate supportive response issued. Review promptly.`
          : `Exchange about: ${content.slice(0, 120)}`,
      escalationDetail: "Coachee message matched escalation pattern; supportive response returned.",
      entityType: "conversation",
      entityId: conversation.id,
    });

    return ok({
      userMessage,
      assistantMessage,
      suggestedActions: ["Reflect on this in your journal", "Turn it into a next action", "Explore with another question"],
      demoMode: result.demoMode,
    });
  });
