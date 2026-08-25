// packages/db — in-memory repository.
//
// DEMO BOUNDARY: stands in for managed MySQL + Drizzle. The surface
// (list/get/insert/update/remove) mirrors a production repository contract so
// API routes and pages do not change when a real database arrives. State is
// per-process: a restart resets the demo data, which is expected for a
// prototype. `next dev` may instantiate modules separately for pages and
// route handlers, so the store lives on globalThis to share state.

import type {
  ActionPlanItem, AiSession, Assessment, AssessmentQuestion, AssessmentResult, AuditRecord, ChatMessage,
  CoachAssignment, Conversation, CurriculumItem, Enrollment, FollowupAction, FrameworkSetting, Goal,
  GroupSession, JournalEntry, KnowledgeChunk, KnowledgeDocument, LearningObjective, Person, Program,
  ProgramModule, ProgressEvent,
} from "@/lib/shared/types";
import {
  aiSessionsSeed, assignmentsSeed, assessmentsSeed, auditSeed, chunksSeed, conversationsSeed,
  documentsSeed, enrollmentsSeed, eventsSeed, followupsSeed, frameworksSeed, goalsSeed, itemsSeed,
  journalsSeed, messagesSeed, modulesSeed, objectivesSeed, peopleSeed, plansSeed, programsSeed,
  questionsSeed, resultsSeed, sessionsSeed,
} from "@/data/seed";
import { ConflictError, newId } from "@/lib/shared/validation";

interface DbState {
  people: Person[];
  goals: Goal[];
  plans: ActionPlanItem[];
  journals: JournalEntry[];
  conversations: Conversation[];
  messages: ChatMessage[];
  assessments: Assessment[];
  questions: AssessmentQuestion[];
  results: AssessmentResult[];
  progressEvents: ProgressEvent[];
  programs: Program[];
  modules: ProgramModule[];
  items: CurriculumItem[];
  objectives: LearningObjective[];
  assignments: CoachAssignment[];
  enrollments: Enrollment[];
  documents: KnowledgeDocument[];
  chunks: KnowledgeChunk[];
  groupSessions: GroupSession[];
  followups: FollowupAction[];
  aiSessions: AiSession[];
  auditLog: AuditRecord[];
  frameworks: FrameworkSetting[];
}

const globalForDb = globalThis as unknown as { __oyigidiDb?: DbState };

const db: DbState =
  globalForDb.__oyigidiDb ??
  (globalForDb.__oyigidiDb = {
    people: [...peopleSeed],
    goals: goalsSeed.map((g) => ({ ...g })),
    plans: plansSeed.map((p) => ({ ...p })),
    journals: journalsSeed.map((j) => ({ ...j })),
    conversations: conversationsSeed.map((c) => ({ ...c })),
    messages: messagesSeed.map((m) => ({ ...m })),
    assessments: assessmentsSeed.map((a) => ({ ...a })),
    questions: questionsSeed.map((q) => ({ ...q })),
    results: resultsSeed.map((r) => ({ ...r })),
    progressEvents: eventsSeed.map((e) => ({ ...e })),
    programs: programsSeed.map((p) => ({ ...p })),
    modules: modulesSeed.map((m) => ({ ...m })),
    items: itemsSeed.map((i) => ({ ...i })),
    objectives: objectivesSeed.map((o) => ({ ...o })),
    assignments: assignmentsSeed.map((a) => ({ ...a })),
    enrollments: enrollmentsSeed.map((e) => ({ ...e })),
    documents: documentsSeed.map((d) => ({ ...d })),
    chunks: chunksSeed.map((c) => ({ ...c })),
    groupSessions: sessionsSeed.map((s) => ({ ...s })),
    followups: followupsSeed.map((f) => ({ ...f })),
    aiSessions: aiSessionsSeed.map((s) => ({ ...s })),
    auditLog: auditSeed.map((a) => ({ ...a })),
    frameworks: frameworksSeed.map((f) => ({ ...f })),
  });

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const findOr404 = <T>(rows: T[], id: string, label: string): T => {
  const row = rows.find((item) => (item as { id: string }).id === id);
  if (!row) throw Object.assign(new Error(`${label} not found`), { name: "NotFound" });
  return row;
};

export const repo = {
  people: {
    list: () => clone(db.people),
    get: (id: string) => clone(findOr404(db.people, id, "Person")),
    byRole: (role: Person["role"]) => clone(db.people.filter((p) => p.role === role)),
    insert: (row: Person) => {
      db.people.push(clone(row));
      return clone(row);
    },
    update: (id: string, patch: Partial<Person>) => {
      const row = findOr404(db.people, id, "Person");
      Object.assign(row, clone(patch));
      return clone(row);
    },
  },
  goals: {
    listByClient: (clientId: string) => clone(db.goals.filter((g) => g.clientId === clientId && g.status !== "completed")),
    getOwned: (clientId: string, id: string) => clone(db.goals.find((g) => g.clientId === clientId && g.id === id) ?? null),
    insert: (row: Omit<Goal, "id" | "createdAt">) => {
      const created: Goal = { ...clone(row), id: newId("gl"), createdAt: new Date().toISOString() };
      db.goals.unshift(created);
      return clone(created);
    },
    update: (id: string, patch: Partial<Goal>) => {
      const row = findOr404(db.goals, id, "Goal");
      delete (patch as { id?: string }).id;
      Object.assign(row, clone(patch));
      return clone(row);
    },
    remove: (id: string) => {
      const i = db.goals.findIndex((g) => g.id === id);
      if (i === -1) return false;
      db.goals.splice(i, 1);
      return true;
    },
    averageFor: (clientId: string) => {
      const rows = db.goals.filter((g) => g.clientId === clientId && g.status === "active");
      return rows.length ? Math.round(rows.reduce((sum, g) => sum + g.progressPercent, 0) / rows.length) : 0;
    },
  },
  plans: {
    listByClient: (clientId: string) => clone(db.plans.filter((p) => p.clientId === clientId)),
    insert: (row: Omit<ActionPlanItem, "id" | "createdAt">) => {
      const created = { ...clone(row), id: newId("ap"), createdAt: new Date().toISOString() };
      db.plans.unshift(created);
      return clone(created);
    },
    setCompleted: (id: string, completed: boolean) => {
      const row = findOr404(db.plans, id, "Action");
      row.completed = completed;
      return clone(row);
    },
  },
  journals: {
    listByClient: (clientId: string) =>
      clone(db.journals.filter((j) => j.clientId === clientId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    insert: (row: Omit<JournalEntry, "id" | "createdAt">) => {
      const created = { ...clone(row), id: newId("jn"), createdAt: new Date().toISOString() };
      db.journals.unshift(created);
      return clone(created);
    },
    update: (id: string, patch: Partial<JournalEntry>) => {
      const row = findOr404(db.journals, id, "Reflection");
      Object.assign(row, clone(patch));
      return clone(row);
    },
    remove: (id: string) => {
      const i = db.journals.findIndex((j) => j.id === id);
      if (i === -1) return false;
      db.journals.splice(i, 1);
      return true;
    },
  },
  conversations: {
    forClient: (clientId: string) => clone(db.conversations.find((c) => c.clientId === clientId) ?? null),
    ensure: (clientId: string) => {
      let conversation = db.conversations.find((c) => c.clientId === clientId);
      if (!conversation) {
        conversation = { id: newId("cv"), clientId, title: "Coaching conversation", createdAt: new Date().toISOString() };
        db.conversations.unshift(conversation);
      }
      return clone(conversation);
    },
  },
  messages: {
    forConversation: (conversationId: string) =>
      clone(db.messages.filter((m) => m.conversationId === conversationId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    append: (row: Omit<ChatMessage, "id" | "createdAt">) => {
      const created = { ...clone(row), id: newId("ms"), createdAt: new Date().toISOString() };
      db.messages.push(created);
      return clone(created);
    },
  },
  assessments: {
    active: () => clone([...db.assessments].reverse().find((a) => a.active) ?? null),
    questionsFor: (assessmentId: string) =>
      clone(db.questions.filter((q) => q.assessmentId === assessmentId)).sort((a, b) => a.position - b.position),
    latestResult: (clientId: string) =>
      clone(db.results.filter((r) => r.clientId === clientId).sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0] ?? null),
    saveResult: (row: Omit<AssessmentResult, "id">) => {
      const created = { ...clone(row), id: newId("ar") };
      db.results.unshift(created);
      return clone(created);
    },
  },
  progressEvents: {
    forClient: (clientId: string) =>
      clone(db.progressEvents.filter((e) => e.clientId === clientId)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    latestPerClient: (clientIds: string[]) => {
      const map = new Map<string, ProgressEvent>();
      for (const event of [...db.progressEvents].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))) {
        if (clientIds.includes(event.clientId) && !map.has(event.clientId)) map.set(event.clientId, clone(event));
      }
      return map;
    },
    append: (row: Omit<ProgressEvent, "id" | "occurredAt">) => {
      const created = { ...clone(row), id: newId("pe"), occurredAt: new Date().toISOString() };
      db.progressEvents.unshift(created);
      return clone(created);
    },
  },
  programs: {
    listByCoach: (coachId: string) => clone(db.programs.filter((p) => p.coachId === coachId)),
    get: (id: string) => clone(findOr404(db.programs, id, "Program")),
    insert: (row: Program) => {
      db.programs.unshift(clone(row));
      return clone(row);
    },
    update: (id: string, patch: Partial<Program>) => {
      const row = findOr404(db.programs, id, "Program");
      Object.assign(row, clone(patch));
      return clone(row);
    },
    detail: (programId: string) => {
      const program = findOr404(db.programs, programId, "Program");
      const modules = db.modules.filter((m) => m.programId === programId).sort((a, b) => a.position - b.position);
      const moduleIds = modules.map((m) => m.id);
      return clone({
        program,
        modules,
        items: db.items.filter((i) => moduleIds.includes(i.moduleId)),
        objectives: db.objectives.filter((o) => moduleIds.includes(o.moduleId)),
        enrollments: db.enrollments.filter((e) => e.programId === programId),
      });
    },
    modules: {
      insert: (row: Omit<ProgramModule, "id">) => {
        const created = { ...clone(row), id: newId("md") };
        db.modules.push(created);
        return clone(created);
      },
    },
    items: {
      insert: (row: Omit<CurriculumItem, "id">) => {
        const created = { ...clone(row), id: newId("ci") };
        db.items.push(created);
        return clone(created);
      },
      remove: (id: string) => {
        const i = db.items.findIndex((x) => x.id === id);
        if (i === -1) return false;
        db.items.splice(i, 1);
        return true;
      },
    },
    objectives: {
      insert: (row: Omit<LearningObjective, "id">) => {
        const created = { ...clone(row), id: newId("lo") };
        db.objectives.push(created);
        return clone(created);
      },
    },
  },
  assignments: {
    activeForCoach: (coachId: string) => clone(db.assignments.filter((a) => a.coachId === coachId && a.status === "active")),
    isActive: (coachId: string, clientId: string) =>
      db.assignments.some((a) => a.coachId === coachId && a.clientId === clientId && a.status === "active"),
    insert: (row: Omit<CoachAssignment, "id" | "createdAt">) => {
      const created = { ...clone(row), id: newId("ca"), createdAt: new Date().toISOString() };
      db.assignments.unshift(created);
      return clone(created);
    },
    end: (coachId: string, clientId: string) => {
      const row = db.assignments.find((a) => a.coachId === coachId && a.clientId === clientId && a.status === "active");
      if (!row) return false;
      row.status = "ended";
      return true;
    },
  },
  enrollments: {
    forClients: (clientIds: string[]) => clone(db.enrollments.filter((e) => clientIds.includes(e.clientId))),
    insert: (row: Omit<Enrollment, "id" | "enrolledAt">) => {
      const created = { ...clone(row), id: newId("en"), enrolledAt: new Date().toISOString() };
      db.enrollments.unshift(created);
      return clone(created);
    },
    setStatus: (clientId: string, programId: string, status: Enrollment["status"]) => {
      const row = db.enrollments.find((e) => e.clientId === clientId && e.programId === programId);
      if (!row) return false;
      row.status = status;
      return true;
    },
  },
  knowledge: {
    bases: {
      ensure: (coachId: string) => {
        void coachId; // single shared demo base; production scopes per coach
        return { id: "kb_1", title: "Coach-approved material", description: "Uploaded sources chunked for retrieval." };
      },
    },
    list: () =>
      clone(
        db.documents.map((d) => ({
          ...d,
          baseTitle: "Coach-approved material",
        })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),
    readyChunks: () => {
      const readyIds = db.documents.filter((d) => d.status === "ready").map((d) => d.id);
      return clone(db.chunks.filter((c) => readyIds.includes(c.documentId)));
    },
    upload: (row: Omit<KnowledgeDocument, "id" | "createdAt" | "status" | "chunkCount">, content: string) => {
      const chunks: KnowledgeChunk[] = [];
      for (let index = 0; index < content.length; index += 600) {
        chunks.push({ id: newId("kc"), documentId: "", content: content.slice(index, index + 600), position: chunks.length + 1 });
      }
      const document: KnowledgeDocument = { ...clone(row), id: newId("kd"), status: "ready", chunkCount: chunks.length, createdAt: new Date().toISOString() };
      db.documents.unshift(document);
      for (const chunk of chunks) db.chunks.push({ ...chunk, documentId: document.id });
      return clone(document);
    },
    remove: (documentId: string) => {
      const i = db.documents.findIndex((d) => d.id === documentId);
      if (i === -1) return false;
      const removed = db.documents.splice(i, 1)[0]!;
      db.chunks = db.chunks.filter((c) => c.documentId !== removed.id);
      return true;
    },
  },
  groupSessions: {
    list: () => clone(db.groupSessions).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    insert: (row: Omit<GroupSession, "id" | "createdAt" | "status">) => {
      const created = { ...clone(row), id: newId("gs"), status: "scheduled" as const, createdAt: new Date().toISOString() };
      db.groupSessions.unshift(created);
      return clone(created);
    },
    complete: (id: string, summary: string) => {
      const row = findOr404(db.groupSessions, id, "Session");
      row.summary = summary;
      row.status = "completed";
      return clone(row);
    },
  },
  followups: {
    forSession: (groupSessionId: string) => clone(db.followups.filter((f) => f.groupSessionId === groupSessionId)),
    all: () => clone(db.followups),
    insert: (row: Omit<FollowupAction, "id" | "createdAt">) => {
      const created = { ...clone(row), id: newId("fu"), createdAt: new Date().toISOString() };
      db.followups.unshift(created);
      return clone(created);
    },
  },
  aiSessions: {
    forCoach: (coachId: string) => clone(db.aiSessions.filter((s) => s.coachId === coachId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    openForCoach: (coachId: string) => clone(db.aiSessions.filter((s) => s.coachId === coachId && s.status === "pending_review")),
    start: (row: Pick<AiSession, "clientId" | "coachId">) => {
      const created: AiSession = { ...row, id: newId("ai"), safetyFlag: "none", status: "pending_review", createdAt: new Date().toISOString() };
      db.aiSessions.unshift(created);
      return clone(created);
    },
    review: (id: string, coachingOutcome: string) => {
      const row = findOr404(db.aiSessions, id, "AI session");
      row.coachingOutcome = coachingOutcome;
      row.status = "reviewed";
      row.reviewedAt = new Date().toISOString();
      return clone(row);
    },
  },
  auditLog: {
    list: () => clone(db.auditLog).sort((a, b) => b.at.localeCompare(a.at)),
    append: (actorId: string, action: string, entityType: string, entityId?: string, detail?: string) => {
      const entry: AuditRecord = { id: newId("au"), actorId, action, entityType, entityId, detail, at: new Date().toISOString() };
      db.auditLog.unshift(entry);
      console.info(`[audit:${action}]`, detail ?? "", `actor=${actorId}`);
      return clone(entry);
    },
  },
  frameworks: {
    list: () => clone(db.frameworks),
    setEnabled: (id: string, enabled: boolean) => {
      const row = findOr404(db.frameworks, id, "Framework");
      row.enabled = enabled;
      return clone(row);
    },
  },
};

/** Simulated transaction: snapshot + rollback on throw (ochetoha pattern). */
export const transact = <T>(fn: () => T): T => {
  const keys = Object.keys(db) as Array<keyof DbState>;
  const snapshot = JSON.stringify(db);
  try {
    return fn();
  } catch (err) {
    const restored = JSON.parse(snapshot) as DbState;
    for (const key of keys) (db as unknown as Record<string, unknown>)[key] = restored[key];
    throw err;
  }
};

export const audit = (actorId: string, action: string, entityType: string, entityId?: string, detail?: string) =>
  repo.auditLog.append(actorId, action, entityType, entityId, detail);

/**
 * Privacy governance: erase every coaching record owned by a client and
 * suspend their membership. The identity shell remains so the same subject
 * cannot silently recreate a "clean" duplicate. Returns a full export of what
 * was erased (useful for the audit trail / data-portability requests).
 */
export const eraseClientData = (clientId: string): Record<string, unknown> => {
  return transact(() => {
    const person = findOr404(db.people, clientId, "Client");
    if (person.role !== "client") throw new ConflictError("Only client memberships can be erased");

    const exportBundle = {
      account: { id: person.id, name: person.name, email: person.email, role: person.role },
      goals: clone(db.goals.filter((g) => g.clientId === clientId)),
      actionPlans: clone(db.plans.filter((p) => p.clientId === clientId)),
      journalEntries: clone(db.journals.filter((j) => j.clientId === clientId)),
      assessmentResults: clone(db.results.filter((r) => r.clientId === clientId)),
      progressEvents: clone(db.progressEvents.filter((e) => e.clientId === clientId)),
      programEnrollments: clone(db.enrollments.filter((e) => e.clientId === clientId)),
      conversations: clone(db.conversations.filter((c) => c.clientId === clientId)),
      aiSessions: clone(db.aiSessions.filter((s) => s.clientId === clientId)),
      followups: clone(db.followups.filter((f) => f.clientId === clientId)),
    };

    const conversationIds = db.conversations.filter((c) => c.clientId === clientId).map((c) => c.id);
    db.messages = db.messages.filter((m) => !conversationIds.includes(m.conversationId));
    db.conversations = db.conversations.filter((c) => c.clientId !== clientId);
    db.goals = db.goals.filter((g) => g.clientId !== clientId);
    db.plans = db.plans.filter((p) => p.clientId !== clientId);
    db.journals = db.journals.filter((j) => j.clientId !== clientId);
    db.results = db.results.filter((r) => r.clientId !== clientId);
    db.progressEvents = db.progressEvents.filter((e) => e.clientId !== clientId);
    db.enrollments = db.enrollments.filter((e) => e.clientId !== clientId);
    db.assignments = db.assignments.filter((a) => a.clientId !== clientId);
    db.aiSessions = db.aiSessions.filter((s) => s.clientId !== clientId);
    db.followups = db.followups.filter((f) => f.clientId !== clientId);
    person.accountStatus = "suspended";
    person.onboardingComplete = false;

    return exportBundle;
  });
};

/** Full client data export for portability requests. */
export const exportClientData = (clientId: string): Record<string, unknown> =>
  eraseExportSafe(clientId);

function eraseExportSafe(clientId: string): Record<string, unknown> {
  const person = findOr404(db.people, clientId, "Client");
  const conversationRows = db.conversations.filter((c) => c.clientId === clientId);
  const conversationIds = conversationRows.map((c) => c.id);
  return {
    exportedAt: new Date().toISOString(),
    account: { id: person.id, name: person.name, email: person.email, role: person.role },
    profile: { preferredName: person.preferredName ?? null, developmentFocus: person.developmentFocus ?? null },
    goals: clone(db.goals.filter((g) => g.clientId === clientId)),
    actionPlans: clone(db.plans.filter((p) => p.clientId === clientId)),
    journalEntries: clone(db.journals.filter((j) => j.clientId === clientId)),
    assessmentResults: clone(db.results.filter((r) => r.clientId === clientId)),
    progressEvents: clone(db.progressEvents.filter((e) => e.clientId === clientId)),
    programEnrollments: clone(db.enrollments.filter((e) => e.clientId === clientId)),
    conversations: clone(conversationRows),
    messages: clone(db.messages.filter((m) => conversationIds.includes(m.conversationId))),
    aiSessions: clone(db.aiSessions.filter((s) => s.clientId === clientId)),
  };
}
