// Seed identities and content. State is per-process; a restart resets it.
import type {
  AiSession, Assessment, AssessmentQuestion, AssessmentResult, AuditRecord, ChatMessage,
  CoachAssignment, Conversation, CurriculumItem, Enrollment, FollowupAction, FrameworkSetting, Goal,
  GroupSession, JournalEntry, KnowledgeChunk, KnowledgeDocument, LearningObjective, Person, Program,
  ProgramModule, ProgressEvent,
} from "@/lib/shared/types";

const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export const peopleSeed: Person[] = [
  { id: "usr_client", name: "Aisha Mohammed", email: "aisha@oyigidi.example", role: "client", accountStatus: "active", preferredName: "Aisha", developmentFocus: "Lead with calm clarity through my team's scale-up.", onboardingComplete: true },
  { id: "usr_client2", name: "David Dlamini", email: "david@oyigidi.example", role: "client", accountStatus: "active", preferredName: "David", developmentFocus: "Decide my next career move without overcommitting.", onboardingComplete: true },
  { id: "usr_coach", name: "Samira Okonkwo", email: "samira@oyigidi.example", role: "coach", accountStatus: "active", onboardingComplete: true },
  { id: "usr_admin", name: "Tony Anthony", email: "tony@oyigidi.example", role: "admin", accountStatus: "active", onboardingComplete: true },
];

export const goalsSeed: Goal[] = [
  { id: "gl_1", clientId: "usr_client", title: "Hold calmer weekly one-on-ones", description: "Prepare one clear point of view per session.", progressPercent: 70, status: "active", createdAt: daysAgo(21) },
  { id: "gl_2", clientId: "usr_client", title: "Delegate the release checklist", progressPercent: 40, status: "active", createdAt: daysAgo(12) },
  { id: "gl_3", clientId: "usr_client2", title: "Run three informational conversations", description: "Test directions before committing.", progressPercent: 55, status: "active", createdAt: daysAgo(9) },
];

export const plansSeed: Array<{ id: string; clientId: string; title: string; detail?: string; completed: boolean; source: "assessment" | "coach" | "client"; createdAt: string }> = [
  { id: "ap_1", clientId: "usr_client", title: "Write the one-sentence decision", detail: "Name what you want people to remember.", completed: true, source: "assessment", createdAt: daysAgo(6) },
  { id: "ap_2", clientId: "usr_client", title: "Ask Maya for a 15-minute rehearsal", completed: false, source: "assessment", createdAt: daysAgo(6) },
  { id: "ap_3", clientId: "usr_client", title: "Notice what steadied you this week", completed: false, source: "coach", createdAt: daysAgo(3) },
];

export const journalsSeed: JournalEntry[] = [
  { id: "jn_1", clientId: "usr_client", title: "The stakeholder meeting", content: "The most useful preparation was deciding what I wanted people to remember. Naming the decision out loud changed the room.", createdAt: daysAgo(2) },
];

export const conversationsSeed: Conversation[] = [
  { id: "cv_1", clientId: "usr_client", title: "Leading with calm clarity", createdAt: daysAgo(5) },
];

export const messagesSeed: ChatMessage[] = [
  { id: "ms_1", conversationId: "cv_1", role: "assistant", content: "Welcome back, Aisha. Your focus is **leading with calm clarity** and your one-on-one goal is at 70%. What feels most important to make true this week?", safetyFlag: "none", createdAt: daysAgo(5) },
  { id: "ms_2", conversationId: "cv_1", role: "client", content: "I want to be direct in the roadmap review without becoming defensive.", safetyFlag: "none", createdAt: daysAgo(4) },
  { id: "ms_3", conversationId: "cv_1", role: "assistant", content: "Try naming three things before you speak: the decision you want, the evidence you trust, and the invitation you will make. Which of those feels least prepared?", safetyFlag: "none", createdAt: daysAgo(4) },
];

export const assessmentsSeed: Assessment[] = [
  { id: "as_1", title: "Development Compass", description: "A short self-assessment across clarity, energy, confidence, and connection.", active: true },
];

export const questionsSeed: AssessmentQuestion[] = [
  { id: "aq_1", assessmentId: "as_1", prompt: "I can name a direction that feels meaningful to me right now.", domain: "Clarity", position: 1 },
  { id: "aq_2", assessmentId: "as_1", prompt: "My current routines give me enough energy for what I want to pursue.", domain: "Energy", position: 2 },
  { id: "aq_3", assessmentId: "as_1", prompt: "I trust myself to take the next useful step, even when the full path is unclear.", domain: "Confidence", position: 3 },
  { id: "aq_4", assessmentId: "as_1", prompt: "I have people or communities that make it easier to stay grounded and accountable.", domain: "Connection", position: 4 },
];

export const resultsSeed: AssessmentResult[] = [];

export const eventsSeed: ProgressEvent[] = [
  { id: "pe_1", clientId: "usr_client", eventType: "goal_progress", title: "One-on-ones goal moved to 70%", detail: "Prepared a point of view for the roadmap review.", occurredAt: daysAgo(2) },
  { id: "pe_2", clientId: "usr_client2", eventType: "session", title: "Coaching conversation about career direction", occurredAt: daysAgo(1) },
];

export const programsSeed: Program[] = [
  { id: "pr_1", coachId: "usr_coach", title: "Leading Through Complexity", description: "Coach-authored modules for steady leadership under pressure.", status: "active", aiInstructions: "Use reflective, non-clinical coaching questions. Connect guidance to the current module objective. Do not diagnose or attempt crisis support.", createdAt: daysAgo(30) },
];

export const modulesSeed: ProgramModule[] = [
  { id: "md_1", programId: "pr_1", title: "Name the decision", summary: "Clarify what choice is actually on the table.", position: 1 },
  { id: "md_2", programId: "pr_1", title: "Work the stakeholder map", summary: "See influence and interest clearly.", position: 2 },
];

export const itemsSeed: CurriculumItem[] = [
  { id: "ci_1", moduleId: "md_1", kind: "lesson", title: "The one-sentence decision", content: "Write the decision as a single sentence with an owner and a date.", position: 1 },
  { id: "ci_2", moduleId: "md_1", kind: "exercise", title: "Decision journal entry", content: "Record one decision from this week and what evidence you trusted.", position: 2 },
];

export const objectivesSeed: LearningObjective[] = [
  { id: "lo_1", moduleId: "md_1", title: "Identify one practical development step", position: 1 },
];

export const assignmentsSeed: CoachAssignment[] = [
  { id: "ca_1", coachId: "usr_coach", clientId: "usr_client", status: "active", createdAt: daysAgo(25) },
  { id: "ca_2", coachId: "usr_coach", clientId: "usr_client2", status: "active", createdAt: daysAgo(10) },
];

export const enrollmentsSeed: Enrollment[] = [
  { id: "en_1", clientId: "usr_client", programId: "pr_1", status: "active", enrolledAt: daysAgo(24) },
];

const knowledgeText = `Before a hard conversation, name the decision you want people to make. Decision quality improves when the decider separates the choice from the noise around it. A useful preparation ritual: write the one-sentence decision, list the stakeholders who hold influence, and decide what evidence would change your mind. Weekly reflection keeps goals honest because progress that is not observed tends to stall.`;

export const documentsSeed: KnowledgeDocument[] = [
  { id: "kd_1", knowledgeBaseId: "kb_1", title: "Decision quality guide", scope: "coach", status: "ready", chunkCount: 2, createdAt: daysAgo(15) },
];

export const chunksSeed: KnowledgeChunk[] = [
  { id: "kc_1", documentId: "kd_1", content: knowledgeText.slice(0, Math.ceil(knowledgeText.length / 2)), position: 1 },
  { id: "kc_2", documentId: "kd_1", content: knowledgeText.slice(Math.ceil(knowledgeText.length / 2)), position: 2 },
];

export const sessionsSeed: GroupSession[] = [
  { id: "gs_1", programId: "pr_1", cohortTitle: "Emerging leaders — spring", title: "Naming decisions under pressure", agenda: ["Check-in round", "Decision naming practice"], exercises: ["One-sentence decision drill"], status: "scheduled", createdAt: daysAgo(4) },
];

export const followupsSeed: FollowupAction[] = [];

export const aiSessionsSeed: AiSession[] = [
  { id: "ai_1", clientId: "usr_client", coachId: "usr_coach", summary: "Explored preparation for a roadmap review; practised separating decision, evidence, and invitation.", safetyFlag: "none", status: "pending_review", createdAt: daysAgo(4) },
  { id: "ai_2", clientId: "usr_client2", coachId: "usr_coach", summary: "Career direction exploration; identified two informational conversations as low-risk tests.", safetyFlag: "none", status: "pending_review", createdAt: daysAgo(1) },
];

export const auditSeed: AuditRecord[] = [
  { id: "au_1", actorId: "usr_admin", action: "member_provisioned", entityType: "user", entityId: "usr_client2", detail: "david@oyigidi.example provisioned as client", at: daysAgo(10) },
  { id: "au_2", actorId: "usr_coach", action: "knowledge_uploaded", entityType: "knowledge_document", entityId: "kd_1", detail: "Decision quality guide became retrieval-ready", at: daysAgo(15) },
];

export const frameworksSeed: FrameworkSetting[] = [
  { id: "fw_1", label: "Development Compass", description: "Self-development assessment across clarity, energy, confidence, and connection.", enabled: true },
  { id: "fw_2", label: "Eisenhower Prioritization", description: "Educational decision framework available in coach-authored curriculum.", enabled: true },
];

export const stamp = now;
