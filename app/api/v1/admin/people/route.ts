import type { NextRequest } from "next/server";
import { guardLimited, ok, readJson } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/session";
import { audit, eraseClientData, exportClientData, repo } from "@/lib/db/store";
import { ConflictError, emailRule, oneOf, optional, str, validateObject, bool } from "@/lib/shared/validation";

/** People management + privacy governance for administrators. */
export const GET = async (request: NextRequest) =>
  guardLimited(request, "mutation", async () => {
    await requireRole(request.headers, "admin");
    return ok({
      people: repo.people.list(),
      frameworks: repo.frameworks.list(),
      auditTrail: repo.auditLog.list(),
    });
  });

export const POST = async (request: NextRequest) =>
  guardLimited(request, "write", async () => {
    const admin = await requireRole(request.headers, "admin");
    const body = await readJson(request);
    const { action } = validateObject(body, { action: str(60) });

    switch (action) {
      case "set-access": {
        const input = validateObject(body, {
          action: str(60),
          userId: str(40),
          role: oneOf(["client", "coach", "admin"] as const),
          accountStatus: oneOf(["active", "suspended"] as const),
        });
        if (input.userId === admin.id && input.accountStatus === "suspended") throw new ConflictError("You cannot suspend your own admin account");
        const person = repo.people.update(input.userId, { role: input.role, accountStatus: input.accountStatus });
        audit(admin.id, input.accountStatus === "suspended" ? "member_suspended" : "member_updated", "user", person.id, `${person.email} → ${person.role}/${person.accountStatus}`);
        return ok({ person });
      }
      case "provision": {
        const input = validateObject(body, {
          action: str(60),
          email: emailRule,
          name: optional(str(120)),
          role: oneOf(["client", "coach", "admin"] as const),
        });
        if (repo.people.list().some((p) => p.email.toLowerCase() === input.email)) throw new ConflictError("That email already has a membership");
        const created = repo.people.insert({
          id: `usr_${Math.random().toString(36).slice(2, 8)}`,
          name: input.name ?? input.email.split("@")[0]!,
          email: input.email,
          role: input.role,
          accountStatus: "active",
          onboardingComplete: false,
        });
        audit(admin.id, "member_provisioned", "user", created.id, `${created.email} provisioned as ${created.role}`);
        return ok({ person: created }, { status: 201 });
      }
      case "toggle-framework": {
        const input = validateObject(body, { action: str(60), frameworkId: str(40), enabled: bool });
        const framework = repo.frameworks.setEnabled(input.frameworkId, input.enabled);
        audit(admin.id, input.enabled ? "framework_enabled" : "framework_disabled", "framework", framework.id, framework.label);
        return ok({ framework });
      }
      default:
        throw Object.assign(new Error(`Unknown action: ${action}`), { name: "ValidationError" });
    }
  });

/**
 * Privacy governance: confirmed erasure of a client's coaching data.
 * Requires typing the client's exact email. Audited.
 */
export const DELETE = async (request: NextRequest) =>
  guardLimited(request, "write", async () => {
    const admin = await requireRole(request.headers, "admin");
    const body = await readJson(request);
    const input = validateObject(body, { userId: str(40), confirmEmail: str(200) });

    const person = repo.people.get(input.userId);
    if ((person.email ?? "").toLowerCase() !== input.confirmEmail.trim().toLowerCase()) {
      throw new ConflictError("Confirmation email does not match this client");
    }
    if (person.id === admin.id || person.role !== "client") {
      throw new ConflictError("Only client memberships can be erased here");
    }

    const bundle = eraseClientData(person.id);
    audit(admin.id, "client_data_deleted", "user", person.id, `Coaching records erased and membership suspended for ${person.email}`);
    return ok({ erased: true, userId: person.id, erasedRecords: Object.entries(bundle).filter(([, v]) => Array.isArray(v)).map(([k, v]) => `${k}:${(v as unknown[]).length}`) });
  });

/** Data portability: download the full JSON export for one client (audited). */
export const PATCH = async (request: NextRequest) =>
  guardLimited(request, "write", async () => {
    const admin = await requireRole(request.headers, "admin");
    const body = await readJson(request);
    const input = validateObject(body, { userId: str(40) });
    const person = repo.people.get(input.userId);
    if (person.role !== "client") throw new ConflictError("Only client data can be exported here");
    const bundle = exportClientData(person.id);
    audit(admin.id, "client_data_exported", "user", person.id, `Data export prepared for ${person.email}`);
    return ok(bundle);
  });
