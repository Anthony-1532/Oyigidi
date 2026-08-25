import type { NextRequest } from "next/server";
import { guard, ok } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";

/** Coach command center bundle: roster with real progress, review queue. */
export const GET = async (request: NextRequest) =>
  guard(async () => {
    const person = await requireRole(request.headers, "coach");
    const assignments = repo.assignments.activeForCoach(person.id);
    const clientIds = assignments.map((a) => a.clientId);
    const clients = clientIds.map((id) => {
      const client = repo.people.get(id);
      return {
        id: client.id,
        name: client.name,
        email: client.email,
        goalProgressPercent: repo.goals.averageFor(id),
        latestActivity: repo.progressEvents.forClient(id)[0] ?? null,
        enrolledPrograms: repo.enrollments.forClients([id]).filter((e) => e.status === "active"),
      };
    });
    const availableClients = repo.people.byRole("client")
      .filter((c) => c.accountStatus === "active" && !clientIds.includes(c.id))
      .map((c) => ({ id: c.id, name: c.name, email: c.email }));
    const programs = repo.programs.listByCoach(person.id);
    const knowledge = repo.knowledge.list();
    const sessions = repo.aiSessions.forCoach(person.id);

    return ok({
      clients,
      availableClients,
      programs,
      programDetail: programs[0] ? repo.programs.detail(programs[0].id) : null,
      knowledge,
      groupSessions: repo.groupSessions.list(),
      followups: repo.followups.all(),
      aiSessions: sessions,
      pendingReviews: sessions.filter((s) => s.status === "pending_review"),
      metrics: {
        clients: clients.length,
        programs: programs.length,
        readyKnowledge: knowledge.filter((k) => k.status === "ready").length,
        pendingReviews: sessions.filter((s) => s.status === "pending_review").length,
      },
    });
  });
