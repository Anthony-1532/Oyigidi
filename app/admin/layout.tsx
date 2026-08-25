import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, roleHome } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const person = await getSession(await headers());
  if (!person) redirect("/");
  if (person.role !== "admin") redirect(roleHome[person.role]);
  return <>{children}</>;
}
