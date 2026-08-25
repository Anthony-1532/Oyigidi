import type { NextRequest } from "next/server";
import { guard, ok } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";

/** Admin operational overview — persisted counts, 7-day AI activity, audit preview. */
export const GET = async (request: NextRequest) =>
  guard(async () => {
    await requireRole(request.headers, "admin");
    const people = repo.people.list();
    const clients = people.filter((p) => p.role === "client");
    const coaches = people.filter((p) => p.role === "coach");

    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(Date.now() - (6 - index) * 86_400_000);
      const key = day.toISOString().slice(0, 10);
      return {
        key,
        label: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day.getDay()]!,
        total: repo.aiSessions.forCoach("usr_coach").filter((s) => s.createdAt.slice(0, 10) === key).length,
      };
    });

    return ok({
      users: people.filter((p) => p.accountStatus === "active").length,
      clients: clients.length,
      coaches: coaches.length,
      programs: repo.programs.listByCoach("usr_coach").length,
      activePrograms: repo.programs.listByCoach("usr_coach").filter((p) => p.status === "active").length,
      aiSessions: repo.aiSessions.forCoach("usr_coach").length,
      flaggedSessions: repo.aiSessions.forCoach("usr_coach").filter((s) => s.safetyFlag === "escalation").length,
      assessments: repo.assessments.active() ? 1 : 0,
      activeAssessments: repo.assessments.active()?.active ? 1 : 0,
      knowledgeDocuments: repo.knowledge.list().length,
      readyKnowledgeDocuments: repo.knowledge.list().filter((k) => k.status === "ready").length,
      auditEvents: repo.auditLog.list().length,
      dailySessionActivity: days,
      recentAudit: repo.auditLog.list().slice(0, 6),
    });
  });
