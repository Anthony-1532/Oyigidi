// Boundary validation — hand-rolled validators (no runtime deps), mirroring
// the ochetoha pattern so a zod migration later is a drop-in change.

import { randomBytes, randomUUID } from "node:crypto";

export class ValidationError extends Error {
  details: Record<string, string>;
  constructor(details: Record<string, string>) {
    super("Validation failed");
    this.name = "ValidationError";
    this.details = details;
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFound";
  }
}

export class ConflictError extends Error {
  constructor(message = "Conflict") {
    super(message);
    this.name = "Conflict";
  }
}

export const isEmail = (v: unknown): v is string =>
  typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export const newId = (prefix: string) => `${prefix}_${randomBytes(6).toString("hex")}`;
export const newRequestId = () => `req_${randomUUID().replaceAll("-", "")}`;

export type FieldRule<R = string> = (v: unknown, name: string) => R;

export const str = (max = 200, min = 1): FieldRule<string> => (v, name) => {
  if (typeof v !== "string" || v.trim().length < min) throw new ValidationError({ [name]: "Required" });
  const t = v.trim();
  if (t.length > max) throw new ValidationError({ [name]: `Too long (max ${max})` });
  return t;
};

export const num = (min: number, max: number): FieldRule<number> => (v, name) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new ValidationError({ [name]: `Must be ${min}–${max}` });
  return Math.round(n * 100) / 100;
};

export const bool: FieldRule<boolean> = (v, name) => {
  if (typeof v !== "boolean") throw new ValidationError({ [name]: "Must be true or false" });
  return v;
};

export const oneOf = <T extends string>(options: readonly T[]): FieldRule<T> => (v, name) => {
  const s = str(60)(v, name);
  if (!options.includes(s as T)) throw new ValidationError({ [name]: `Must be one of: ${options.join(", ")}` });
  return s as T;
};

export const emailRule: FieldRule<string> = (v, name) => {
  const s = str(200)(v, name);
  if (!isEmail(s)) throw new ValidationError({ [name]: "Invalid email" });
  return s.toLowerCase();
};

export const optional =
  <R>(rule: FieldRule<R>): FieldRule<R | undefined> =>
  (v, name) =>
    v === undefined || v === null || v === "" ? undefined : rule(v, name);

/** Validate an object against a rule map; returns clean values or throws. */
export const validateObject = <T extends object>(
  input: unknown,
  rules: { [K in keyof T]: FieldRule<T[K]> },
): T => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError({ $root: "Expected a JSON object" });
  }
  const src = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const key of Object.keys(rules) as (keyof T & string)[]) {
    try {
      out[key] = (rules[key] as FieldRule<unknown>)(src[key], key);
    } catch (e) {
      if (e instanceof ValidationError) Object.assign(errors, e.details);
      else throw e;
    }
  }
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return out as unknown as T;
};
