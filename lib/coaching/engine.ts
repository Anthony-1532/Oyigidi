// Coaching engine — safety-first orchestration.
//
// DEMO BOUNDARY: when a Forge key is configured the engine calls the hosted
// LLM with assembled client context; without one it returns a deterministic,
// honest "demo guidance" response so the product is fully explorable with zero
// environment variables. The safety-escalation path always wins regardless of
// provider.

export type CoachingContext = {
  preferredName?: string | null;
  developmentFocus?: string | null;
  goals: Array<{ title: string; progressPercent: number }>;
  assessmentInsight?: string | null;
  curriculum?: { programTitle: string; moduleTitle?: string | null; objective?: string | null } | null;
  coachInstructions?: string | null;
  knowledgeSnippets?: string[];
};

export type CoachingResult = {
  content: string;
  safetyFlag: "none" | "escalation";
  demoMode: boolean;
};

const escalationPattern = /\b(suicide|kill myself|self harm|hurt myself|end my life|overdose)\b/i;

export const isEscalationMessage = (message: string) => escalationPattern.test(message);

export function buildCoachingSystemPrompt(context: CoachingContext) {
  const goals = context.goals.length
    ? context.goals.map((goal) => `${goal.title} (${goal.progressPercent}% progress)`).join(", ")
    : "No active goal has been recorded.";
  return `You are Oyigidi, a culturally attentive personal and professional development coach. You provide coaching and educational support, not diagnosis, crisis counselling, or medical advice. Ask one thoughtful question at a time, use reflective listening, and help the coachee identify a practical next step.

Client: ${context.preferredName ?? "Coachee"}
Development focus: ${context.developmentFocus ?? "not yet set"}
Active goals: ${goals}
Assessment insight: ${context.assessmentInsight ?? "not available"}
Coach-authored teaching instructions: ${context.coachInstructions ?? "Use a warm, questioning style."}
Approved knowledge: ${context.knowledgeSnippets?.join(" ") ?? "none available"}

Keep the response concise, warm, specific: a short reflection followed by one question or next action.`;
}

/** Lexical relevance scoring over approved chunks (token overlap). */
const STOP_WORDS = new Set(["a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "do", "for", "from", "has", "have", "how", "i", "in", "is", "it", "my", "of", "on", "or", "so", "that", "the", "their", "them", "then", "there", "these", "this", "to", "was", "we", "what", "when", "where", "which", "who", "why", "will", "with", "you", "your"]);
const tokenize = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !STOP_WORDS.has(t));

export function selectKnowledgeSnippets(chunks: string[], query: string, limit = 3): string[] {
  const tokens = tokenize(query);
  if (!tokens.length) return chunks.slice(0, limit);
  const scored = chunks.map((content, index) => {
    const chunkTokens = new Set(tokenize(content));
    const hits = new Set(tokens).size ? Array.from(new Set(tokens)).filter((t) => chunkTokens.has(t)).length : 0;
    return { content, score: hits / new Set(tokens).size - index * 1e-6 };
  });
  scored.sort((a, b) => b.score - a.score);
  const relevant = scored.filter((s) => s.score > 0);
  return (relevant.length ? relevant : scored).slice(0, limit).map((s) => s.content);
}

/** Deterministic reflective fallback so the demo works with zero config. */
function demoResponse(message: string, context: CoachingContext): CoachingResult {
  const name = context.preferredName?.split(" ")[0] ?? "there";
  const goal = context.goals[0];
  const focusLine = context.developmentFocus ? `Your stated focus — *${context.developmentFocus}* — ` : "";
  const goalLine = goal ? ` “${goal.title}” sits at ${goal.progressPercent}%.` : "";
  const knowledgeLine = context.knowledgeSnippets?.length
    ? ` One idea from your coach's library fits here: ${context.knowledgeSnippets[0]!.split(". ")[0]}.`
    : "";
  return {
    content: `Thanks for naming that, ${name}. ${focusLine}matters here${goalLine}.${knowledgeLine} A useful move: write the smallest experiment that would test what you just described — one sentence, one owner, one date. What would make this worth doing before the week ends?`,
    safetyFlag: "none",
    demoMode: true,
  };
}

async function callForge(
  message: string,
  context: CoachingContext,
  history: Array<{ role: "client" | "assistant"; content: string }>,
): Promise<string | null> {
  const key = process.env.BUILT_IN_FORGE_API_KEY;
  const url = process.env.BUILT_IN_FORGE_API_URL;
  if (!key || !url) return null;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        messages: [
          { role: "system", content: buildCoachingSystemPrompt(context) },
          ...history.slice(-6).map((m) => ({ role: m.role === "client" ? "user" : "assistant", content: m.content })),
          { role: "user", content: message },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim() ? content.trim() : null;
  } catch (error) {
    console.warn("[oyigidi] Forge unavailable, using demo guidance.", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function generateCoachingResponse(input: {
  message: string;
  context: CoachingContext;
  history: Array<{ role: "client" | "assistant"; content: string }>;
}): Promise<CoachingResult> {
  if (isEscalationMessage(input.message)) {
    return {
      safetyFlag: "escalation",
      demoMode: false,
      content:
        "I'm really sorry you're carrying this. I'm not able to provide crisis care, but your safety matters more than continuing coaching. If you may act on these feelings, please contact local emergency services or a crisis helpline now, and tell a trusted person who can stay with you. When you are safe, a qualified mental-health professional can provide the right support.",
    };
  }
  const live = await callForge(input.message, input.context, input.history);
  if (live) return { content: live, safetyFlag: "none", demoMode: false };
  return demoResponse(input.message, input.context);
}
