import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, roleHome } from "@/lib/auth/session";
import { SignInSection } from "@/components/landing";

export default async function LandingPage() {
  const person = await getSession(await headers());
  if (person) redirect(roleHome[person.role]);
  return <SignInSection />;
}
