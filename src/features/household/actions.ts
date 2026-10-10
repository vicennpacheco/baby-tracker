"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getMemberByUserId } from "@/features/auth/queries";
import { requireMember, requireUserId } from "@/features/auth/session";
import { formatInviteCode } from "@/features/household/invite-code";
import {
  createHouseholdSchema,
  joinHouseholdSchema,
  removeHouseholdMemberSchema,
  updateBabySchema,
} from "@/features/household/schemas";
import {
  generateInviteCode,
  getInviteExpiry,
  hashInviteCode,
  MAX_HOUSEHOLD_MEMBERS,
} from "@/features/household/service";
import type { Prisma } from "@/generated/prisma/client";
import {
  actionError,
  type ActionResult,
  handleActionError,
  NotFoundError,
  ok,
  readPrismaCode,
  validationError,
} from "@/lib/action-result";
import { parseDateOnly } from "@/lib/dates";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const INVALID_CODE_MESSAGE =
  "Ese código no vale o ha caducado. Pide uno nuevo.";
const FULL_HOUSEHOLD_MESSAGE = "Esta familia ya está completa.";

/**
 * The baby's birth date as the household-local midnight (§2.5), or a field
 * error. Unreachable while the schema validates YYYY-MM-DD; kept so an
 * invalid date can never be stored.
 */
function toBirthDate(value: string): Date | ActionResult<never> {
  const birthDate = parseDateOnly(value, env.APP_TIMEZONE);
  if (birthDate) return birthDate;
  const message = "Indica la fecha de nacimiento.";
  return actionError("VALIDATION", message, { babyBirthDate: [message] });
}

/** Thrown inside the join transaction so the claimed invite rolls back too. */
class HouseholdFullError extends Error {}

/** Serializes invite creation and redemption per household (ADR-043). */
async function lockHousehold(
  tx: Prisma.TransactionClient,
  householdId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM public.households WHERE id = ${householdId}::uuid FOR UPDATE`;
}

/**
 * Onboarding: the household, its OWNER (the caller) and the baby, created in
 * one statement. Idempotent: a double tap, or a user who already belongs to a
 * household, simply lands home. On success it redirects, so it only ever
 * returns errors.
 */
export async function createHousehold(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = createHouseholdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const { householdId, babyId, displayName, babyName, babyBirthDate, babySex } =
    parsed.data;
  const birthDate = toBirthDate(babyBirthDate);
  if (!(birthDate instanceof Date)) return birthDate;

  try {
    if (!(await getMemberByUserId(userId))) {
      await db.household.create({
        data: {
          id: householdId,
          name: `Familia de ${displayName}`,
          members: { create: { userId, role: "OWNER", displayName } },
          babies: {
            create: { id: babyId, name: babyName, birthDate, sex: babySex },
          },
        },
        select: { id: true },
      });
    }
  } catch (error) {
    // A simultaneous double tap: the loser hits a unique key (household id or
    // member userId) once the winner commits; the winner's household stands.
    // If this lookup fails as well (database down), report the original
    // error through the boundary instead of letting the action throw.
    const existing = await getMemberByUserId(userId).catch(() => null);
    if (!existing) return handleActionError("createHousehold", error);
  }

  revalidatePath("/");
  redirect("/");
}

/**
 * New single-use invite for the caller's household, valid 24 h. The code is
 * returned once (formatted ABCDE-FGHJK) and only its hash is stored; any
 * other pending invite of the household is revoked.
 */
export async function createHouseholdInvite(): Promise<
  ActionResult<{ code: string; expiresAt: string }>
> {
  const member = await requireMember();

  try {
    const invite = await db.$transaction(async (tx) => {
      await lockHousehold(tx, member.householdId);
      const members = await tx.householdMember.count({
        where: { householdId: member.householdId },
      });
      if (members >= MAX_HOUSEHOLD_MEMBERS) return null;

      await tx.householdInvite.deleteMany({
        where: { householdId: member.householdId, usedAt: null },
      });
      const code = generateInviteCode();
      const expiresAt = getInviteExpiry(new Date());
      await tx.householdInvite.create({
        data: {
          householdId: member.householdId,
          codeHash: hashInviteCode(code),
          expiresAt,
          createdById: member.userId,
        },
        select: { id: true },
      });
      return {
        code: formatInviteCode(code),
        expiresAt: expiresAt.toISOString(),
      };
    });

    if (!invite) return actionError("CONFLICT", FULL_HOUSEHOLD_MESSAGE);
    revalidateSettings();
    return ok(invite);
  } catch (error) {
    return handleActionError("createHouseholdInvite", error);
  }
}

/**
 * Redeems an invite atomically: under the household row lock the invite is
 * claimed (only if still unused) and the member is created, or nothing is.
 * Unknown, expired and used codes get the same answer. On success it
 * redirects home.
 */
export async function joinHousehold(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = joinHouseholdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const isJoined = await db.$transaction(async (tx) => {
      const now = new Date();
      const invite = await tx.householdInvite.findFirst({
        where: {
          codeHash: hashInviteCode(parsed.data.code),
          usedAt: null,
          expiresAt: { gt: now },
        },
        select: { id: true, householdId: true },
      });
      if (!invite) return false;

      await lockHousehold(tx, invite.householdId);
      // Re-checked under the lock: a concurrent redemption may have won.
      const claim = await tx.householdInvite.updateMany({
        where: { id: invite.id, usedAt: null },
        data: { usedAt: now, usedById: userId },
      });
      if (claim.count === 0) return false;

      const members = await tx.householdMember.count({
        where: { householdId: invite.householdId },
      });
      if (members >= MAX_HOUSEHOLD_MEMBERS) throw new HouseholdFullError();

      await tx.householdMember.create({
        data: {
          householdId: invite.householdId,
          userId,
          role: "MEMBER",
          displayName: parsed.data.displayName,
        },
        select: { id: true },
      });
      return true;
    });

    if (!isJoined) {
      return actionError("VALIDATION", INVALID_CODE_MESSAGE, {
        code: [INVALID_CODE_MESSAGE],
      });
    }
  } catch (error) {
    if (error instanceof HouseholdFullError) {
      return actionError("CONFLICT", FULL_HOUSEHOLD_MESSAGE);
    }
    // userId is unique: the caller already belongs to a household. The
    // transaction rolled back, so the invite stays usable.
    if (readPrismaCode(error) === "P2002") {
      return actionError("CONFLICT", "Ya perteneces a una familia.");
    }
    return handleActionError("joinHousehold", error);
  }

  revalidatePath("/");
  redirect("/");
}

function revalidateSettings(): void {
  // Literal paths: /settings has no layout.tsx for a "layout" revalidation.
  revalidatePath("/settings");
  revalidatePath("/settings/invite");
}

/**
 * Settings: the OWNER removes the other member, typically someone who got
 * hold of a leaked code (README, phase 3). Under the household lock that
 * also serializes redemptions (ADR-043), the member is deleted and every
 * pending invite revoked, so the leaked code dies with them. Their records
 * stay, without a name (authorLabel finds none). Idempotent: an id that is
 * not a member here, removed already or never one, gets the same `ok`, so
 * nothing about other households leaks. Their next request lands on /join.
 */
export async function removeHouseholdMember(
  input: unknown,
): Promise<ActionResult> {
  const member = await requireMember();
  const parsed = removeHouseholdMemberSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  if (member.role !== "OWNER") {
    return actionError(
      "CONFLICT",
      "Solo quien creó la familia puede expulsar a alguien.",
    );
  }
  if (parsed.data.userId === member.userId) {
    return actionError("VALIDATION", "No puedes expulsarte a ti.");
  }

  try {
    await db.$transaction(async (tx) => {
      await lockHousehold(tx, member.householdId);
      // role MEMBER: the OWNER is never removed, whatever the id.
      await tx.householdMember.deleteMany({
        where: {
          householdId: member.householdId,
          userId: parsed.data.userId,
          role: "MEMBER",
        },
      });
      await tx.householdInvite.deleteMany({
        where: { householdId: member.householdId, usedAt: null },
      });
    });
    revalidateSettings();
    return ok();
  } catch (error) {
    return handleActionError("removeHouseholdMember", error);
  }
}

/**
 * Settings: "Anular código". Revokes the household's pending invites, for a
 * code shared by mistake. Any member may, as any member may create one.
 * Under the household lock a racing redemption either spent the code first
 * or finds it gone. Used invites stay as history.
 */
export async function revokeHouseholdInvite(): Promise<ActionResult> {
  const member = await requireMember();

  try {
    await db.$transaction(async (tx) => {
      await lockHousehold(tx, member.householdId);
      await tx.householdInvite.deleteMany({
        where: { householdId: member.householdId, usedAt: null },
      });
    });
    revalidateSettings();
    return ok();
  } catch (error) {
    return handleActionError("revokeHouseholdInvite", error);
  }
}

/**
 * Settings: either member edits the baby's name, birth date and sex. Last
 * write wins (§2.6). Scoped to the caller's household in the same
 * statement, so another household's baby is indistinguishable from a
 * missing one. "Prefiero no decirlo" (no sex) clears the stored one.
 */
export async function updateBaby(input: unknown): Promise<ActionResult> {
  const member = await requireMember();
  const parsed = updateBabySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { babyId, babyName, babyBirthDate, babySex } = parsed.data;
  const birthDate = toBirthDate(babyBirthDate);
  if (!(birthDate instanceof Date)) return birthDate;

  try {
    const { count } = await db.baby.updateMany({
      where: { id: babyId, householdId: member.householdId },
      data: { name: babyName, birthDate, sex: babySex ?? null },
    });
    if (count === 0) throw new NotFoundError();
    // "Hoy" greets the baby by name; settings shows name and age.
    revalidatePath("/");
    revalidatePath("/settings");
    return ok();
  } catch (error) {
    return handleActionError("updateBaby", error);
  }
}
