// Domain types for the Oyigidi coaching platform.
//
// DEMO BOUNDARY: persistence is an in-process store (lib/db/store.ts) seeded
// from data/*. The shapes mirror the future production repository contract so
// pages and API routes do not change when a real database is introduced.

export type Role = "client" | "coach" | "admin";

export interface Person {
  id: string;
  name: string;
  email: string;
  role: Role;
  accountStatus: "active" | "suspended";
  preferredName?: string;
  developmentFocus?: string;
  onboardingComplete: boolean;
}

export interface Goal {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  progressPercent: number;
  status: "active" | "paused" | "completed";
  createdAt: string;
}

export interface ActionPlanItem {
  id: string;
  clientId: string;
  title: string;
  detail?: string;
  completed: boolean;
  source: "assessment" | "coach" | "client";
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  clientId: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "client" | "assistant";
  content: string;
  safetyFlag: "none" | "escalation";
  createdAt: string;
}

export interface Conversation {
  id: string;
  clientId: string;
  title: string;
  createdAt: string;
}

export type AssessmentQuestion = {
  id: string;
  assessmentId: string;
  prompt: string;
  domain: string;
  position: number;
};

export type Assessment = {
  id: string;
  title: string;
  description?: string;
  active: boolean;
};

export interface AssessmentResult {
  id: string;
  clientId: string;
  assessmentId: string;
  insight: string;
  domainScores: Record<string, number>;
  answers: Array<{ questionId: string; domain: string; value: number }>;
  completedAt: string;
}

export interface ProgressEvent {
  id: string;
  clientId: string;
  eventType: string;
  title: string;
  detail?: string;
  occurredAt: string;
}

export interface Program {
  id: string;
  coachId: string;
  title: string;
  description?: string;
  status: "draft" | "active" | "archived";
  aiInstructions: string;
  createdAt: string;
}

export interface ProgramModule {
  id: string;
  programId: string;
  title: string;
  summary?: string;
  position: number;
}

export interface CurriculumItem {
  id: string;
  moduleId: string;
  kind: "lesson" | "exercise";
  title: string;
  content: string;
  position: number;
}

export interface LearningObjective {
  id: string;
  moduleId: string;
  title: string;
  position: number;
}

export interface CoachAssignment {
  id: string;
  coachId: string;
  clientId: string;
  status: "active" | "ended";
  createdAt: string;
}

export interface Enrollment {
  id: string;
  clientId: string;
  programId: string;
  status: "active" | "paused" | "completed";
  enrolledAt: string;
}

export interface KnowledgeDocument {
  id: string;
  knowledgeBaseId: string;
  title: string;
  scope: "coach" | "program" | "global";
  scopeId?: string;
  status: "ready";
  chunkCount: number;
  createdAt: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  content: string;
  position: number;
}

export interface GroupSession {
  id: string;
  programId: string;
  cohortTitle: string;
  title: string;
  agenda: string[];
  exercises: string[];
  summary?: string;
  status: "scheduled" | "completed";
  createdAt: string;
}

export interface FollowupAction {
  id: string;
  groupSessionId: string;
  clientId: string;
  title: string;
  createdAt: string;
}

export interface AiSession {
  id: string;
  clientId: string;
  coachId: string;
  summary?: string;
  safetyFlag: "none" | "escalation";
  coachingOutcome?: string;
  status: "pending_review" | "reviewed";
  reviewedAt?: string;
  createdAt: string;
}

export interface AuditRecord {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  detail?: string;
  at: string;
}

export interface FrameworkSetting {
  id: string;
  label: string;
  description?: string;
  enabled: boolean;
}

/** A guided reflective practice: a short paced sequence a coachee moves
 *  through alone, as a second way of working with the coach's material
 *  alongside text conversation. Reflective and non-clinical by design — these
 *  are coaching exercises, not therapeutic or crisis interventions. */
export interface Practice {
  id: string;
  title: string;
  intention: string;
  focus: string;
  active: boolean;
  createdAt: string;
}

export interface PracticeStep {
  id: string;
  practiceId: string;
  /** `breath` steps show a pacer; `reflect` steps invite a written answer. */
  kind: "settle" | "breath" | "reflect" | "close";
  title: string;
  body: string;
  seconds: number;
  position: number;
}

export interface PracticeCompletion {
  id: string;
  clientId: string;
  practiceId: string;
  reflection?: string;
  secondsPresent: number;
  completedAt: string;
}
