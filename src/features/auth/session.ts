import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import {
  type CurrentBaby,
  getMemberByUserId,
  getPrimaryBaby,
  type Member,
} from "@/features/auth/queries";
import { createSupabaseReadOnlyServerClient } from "@/lib/supabase/server";

export type { CurrentBaby, Member } from "@/features/auth/queries";

/**
 * Verified Supabase Auth user id, or null. Uses getClaims(), which validates
 * the JWT; never getSession() on the server (CLAUDE.md §2.7). Cached per request.
 */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  const supabase = await createSupabaseReadOnlyServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  const { sub } = data.claims;
  return typeof sub === "string" ? sub : null;
});

const getMemberForUser = cache(getMemberByUserId);

/**
 * For flows that run before having a household (create one, join one):
 * a valid session or a redirect to the login. Call it outside try/catch.
 */
export async function requireUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return userId;
}

/**
 * Guard of the onboarding screens (/join/*): a valid session or the login,
 * and home for users who already belong to a household. Call it outside
 * try/catch.
 */
export async function requireNoHousehold(): Promise<string> {
  const userId = await requireUserId();
  if (await getMemberForUser(userId)) redirect("/");
  return userId;
}

/**
 * Entry point of every authenticated page and Server Action. Redirects to the
 * login without a session, and to /join when the user has no household yet.
 * redirect() throws, so call it outside any try/catch.
 */
export async function requireMember(): Promise<Member> {
  const userId = await requireUserId();

  const member = await getMemberForUser(userId);
  if (!member) redirect("/join");

  return member;
}

const getBabyForHousehold = cache(getPrimaryBaby);

/**
 * Entry point of every module page: the member plus the household's baby.
 * Same redirect rules as requireMember(), and throws if the household has no
 * baby; call it outside try/catch.
 */
export async function requireBaby(): Promise<{
  member: Member;
  baby: CurrentBaby;
}> {
  const member = await requireMember();
  const baby = await getBabyForHousehold(member.householdId);
  // createHousehold inserts the baby with the household (decision 044), so a
  // household without one is corrupt data, not an onboarding step. Throwing
  // surfaces it in the segment's error.tsx and the server log; a redirect would
  // hide it, and would loop once "/" (the dashboard) needs the baby too.
  if (!baby) {
    throw new Error(`Household ${member.householdId} has no baby`);
  }

  return { member, baby };
}
