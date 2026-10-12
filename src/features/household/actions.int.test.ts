import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  createHousehold,
  createHouseholdInvite,
  deleteHousehold,
  joinHousehold,
  leaveHousehold,
  removeHouseholdMember,
  revokeHouseholdInvite,
  updateBaby,
} from "@/features/household/actions";
import { db } from "@/lib/db";
import { parseDateOnly } from "@/lib/dates";
import { requireMember } from "@/test/session-double";
import {
  createDiaperChange,
  createFamily,
  createFeeding,
  createGrowthMeasurement,
  createHealthRecord,
  createInvite,
  createMember,
  createSleepSession,
} from "@/test/factories";
import { session } from "@/test/session-double";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock("@/features/auth/session", () => import("@/test/session-double"));

const DAY_MS = 24 * 60 * 60 * 1000;
// Relative to today so the "at most three years old" rule never expires the test.
const BIRTH_DATE = new Date(Date.now() - 30 * DAY_MS)
  .toISOString()
  .slice(0, 10);

function validInput(): Record<string, unknown> {
  return {
    householdId: randomUUID(),
    babyId: randomUUID(),
    displayName: "Ana",
    babyName: "Lucía",
    babyBirthDate: BIRTH_DATE,
  };
}

describe("createHousehold", () => {
  it("creates the household, its OWNER and the baby, then goes home", async () => {
    session.userId = randomUUID();
    await expect(createHousehold(validInput())).rejects.toThrow("REDIRECT:/");

    const member = await db.householdMember.findUniqueOrThrow({
      where: { userId: session.userId },
      include: { household: { include: { babies: true } } },
    });
    expect(member).toMatchObject({ role: "OWNER", displayName: "Ana" });
    expect(member.household.babies).toHaveLength(1);
    expect(member.household.babies[0]?.birthDate).toEqual(
      parseDateOnly(BIRTH_DATE, "Europe/Madrid"),
    );
  });

  it("is idempotent on a repeated submit with the same ids", async () => {
    session.userId = randomUUID();
    const input = validInput();
    await expect(createHousehold(input)).rejects.toThrow("REDIRECT:/");
    await expect(createHousehold(input)).rejects.toThrow("REDIRECT:/");
    expect(await db.household.count()).toBe(1);
  });

  it("creates a single household on a simultaneous double tap", async () => {
    session.userId = randomUUID();
    const input = validInput();
    const outcomes = await Promise.allSettled([
      createHousehold(input),
      createHousehold(input),
    ]);

    expect(
      outcomes.map((outcome) =>
        outcome.status === "rejected" && outcome.reason instanceof Error
          ? outcome.reason.message
          : "returned",
      ),
    ).toEqual(["REDIRECT:/", "REDIRECT:/"]);
    expect(await db.household.count()).toBe(1);
    expect(await db.baby.count()).toBe(1);
  });

  it("returns field errors and writes nothing on invalid input", async () => {
    session.userId = randomUUID();
    const result = await createHousehold({ ...validInput(), babyName: " " });
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION",
        fieldErrors: { babyName: expect.any(Array) },
      },
    });
    expect(await db.household.count()).toBe(0);
  });

  it("does not create a second household for a user who already has one", async () => {
    const family = await createFamily();
    session.userId = family.userId;
    await expect(createHousehold(validInput())).rejects.toThrow("REDIRECT:/");
    expect(await db.household.count()).toBe(1);
  });
});

const CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/;

/** A family whose OWNER has just generated an invite; returns the shown code. */
async function familyWithInvite(): Promise<{
  family: Awaited<ReturnType<typeof createFamily>>;
  code: string;
}> {
  const family = await createFamily();
  session.userId = family.userId;
  const result = await createHouseholdInvite();
  if (!result.ok) throw new Error(result.error.message);
  return { family, code: result.data.code };
}

async function outcomeOf(promise: Promise<unknown>): Promise<string> {
  return promise.then(
    (result) =>
      typeof result === "object" && result !== null && "error" in result
        ? JSON.stringify(result)
        : "returned",
    (error: unknown) => (error instanceof Error ? error.message : "thrown"),
  );
}

describe("createHouseholdInvite", () => {
  it("returns the code once and stores only its hash", async () => {
    const { family, code } = await familyWithInvite();

    expect(code).toMatch(CODE_PATTERN);
    const rows = await db.householdInvite.findMany({
      where: { householdId: family.householdId },
    });
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(code.replace("-", ""));
  });

  it("replaces the previous pending invite", async () => {
    const { family, code: firstCode } = await familyWithInvite();
    session.userId = family.userId;
    await createHouseholdInvite();

    session.userId = randomUUID();
    expect(
      await joinHousehold({ displayName: "Pablo", code: firstCode }),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
    expect(
      await db.householdInvite.count({
        where: { householdId: family.householdId },
      }),
    ).toBe(1);
  });

  it("refuses when the household already has two members", async () => {
    const family = await createFamily();
    await createMember(family.householdId, {
      role: "MEMBER",
      displayName: "Pablo",
    });
    session.userId = family.userId;
    expect(await createHouseholdInvite()).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
  });
});

describe("joinHousehold", () => {
  it("adds the user as MEMBER, spends the code and goes home", async () => {
    const { family, code } = await familyWithInvite();
    const partnerId = randomUUID();
    session.userId = partnerId;

    const typedOnAPhone = code.toLowerCase().replace("-", " ");
    await expect(
      joinHousehold({ displayName: "Pablo", code: typedOnAPhone }),
    ).rejects.toThrow("REDIRECT:/");
    expect(
      await db.householdMember.findUnique({ where: { userId: partnerId } }),
    ).toMatchObject({ householdId: family.householdId, role: "MEMBER" });
    expect(
      await db.householdInvite.findFirst({
        where: { householdId: family.householdId },
      }),
    ).toMatchObject({ usedById: partnerId });
  });

  it("answers unknown, used and expired codes identically", async () => {
    const { family, code } = await familyWithInvite();
    session.userId = randomUUID();
    await expect(joinHousehold({ displayName: "Pablo", code })).rejects.toThrow(
      "REDIRECT:/",
    );
    await createInvite(family.householdId, {
      code: "EXP1RED000",
      createdById: family.userId,
      expiresAt: new Date(Date.now() - 1000),
    });

    session.userId = randomUUID();
    const results = await Promise.all([
      joinHousehold({ displayName: "Eva", code }), // used
      joinHousehold({ displayName: "Eva", code: "EXP1RED000" }), // expired
      joinHousehold({ displayName: "Eva", code: "ZZZZZ-ZZZZZ" }), // unknown
    ]);

    expect(new Set(results.map((result) => JSON.stringify(result))).size).toBe(
      1,
    );
    expect(results[0]).toMatchObject({
      ok: false,
      error: { code: "VALIDATION", fieldErrors: { code: expect.any(Array) } },
    });
  });

  it("lets exactly one of two simultaneous redemptions win", async () => {
    const { family, code } = await familyWithInvite();

    const attempt = (userId: string): Promise<string> => {
      // The mocked requireUserId reads session.userId synchronously, before
      // the action's first await, so each call keeps its own user.
      session.userId = userId;
      return outcomeOf(joinHousehold({ displayName: "Pablo", code }));
    };
    const outcomes = await Promise.all([
      attempt(randomUUID()),
      attempt(randomUUID()),
    ]);

    expect(outcomes.filter((outcome) => outcome === "REDIRECT:/")).toHaveLength(
      1,
    );
    expect(
      outcomes.filter((outcome) => outcome.includes('"VALIDATION"')),
    ).toHaveLength(1);
    expect(
      await db.householdMember.count({
        where: { householdId: family.householdId },
      }),
    ).toBe(2);
  });

  it("rejects an old code once the household is full, without spending it", async () => {
    const { family, code } = await familyWithInvite();
    await createMember(family.householdId, {
      role: "MEMBER",
      displayName: "Pablo",
    });

    session.userId = randomUUID();
    expect(await joinHousehold({ displayName: "Eva", code })).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
    expect(
      await db.householdInvite.findFirst({
        where: { householdId: family.householdId },
      }),
    ).toMatchObject({ usedAt: null, usedById: null });
  });

  it("keeps an existing household and rejects joining another", async () => {
    const { family, code } = await familyWithInvite();
    const other = await createFamily();
    session.userId = other.userId;

    expect(await joinHousehold({ displayName: "Ana", code })).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
    expect(
      await db.householdMember.findUnique({ where: { userId: other.userId } }),
    ).toMatchObject({ householdId: other.householdId });
    expect(
      await db.householdInvite.findFirst({
        where: { householdId: family.householdId },
      }),
    ).toMatchObject({ usedAt: null });
  });
});

/** OWNER "Ana" (signed in) and MEMBER "Luis" of one household. */
async function familyWithPartner(): Promise<{
  householdId: string;
  babyId: string;
  owner: string;
  partner: string;
}> {
  const family = await createFamily();
  const { userId: partner } = await createMember(family.householdId, {
    role: "MEMBER",
    displayName: "Luis",
  });
  session.userId = family.userId;
  return {
    householdId: family.householdId,
    babyId: family.babyId,
    owner: family.userId,
    partner,
  };
}

function pendingInvites(householdId: string): Promise<number> {
  return db.householdInvite.count({ where: { householdId, usedAt: null } });
}

describe("removeHouseholdMember", () => {
  it("removes the MEMBER, who loses access; their records stay", async () => {
    const family = await familyWithPartner();
    const record = await createHealthRecord(family.babyId, {
      createdById: family.partner,
    });

    await expect(
      removeHouseholdMember({ userId: family.partner }),
    ).resolves.toEqual({ ok: true, data: undefined });

    session.userId = family.partner;
    await expect(requireMember()).rejects.toThrow("REDIRECT:/join");
    await expect(
      db.healthRecord.count({ where: { id: record.id } }),
    ).resolves.toBe(1);
  });

  it("revokes the pending invites with it", async () => {
    const family = await familyWithPartner();
    await createInvite(family.householdId, {
      code: "ABCDEFGHJK",
      createdById: family.owner,
    });

    await removeHouseholdMember({ userId: family.partner });

    await expect(pendingInvites(family.householdId)).resolves.toBe(0);
    session.userId = randomUUID();
    const joined = await joinHousehold({
      displayName: "Intrusa",
      code: "ABCDE-FGHJK",
    });
    expect(joined).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
  });

  it("lets only the OWNER remove someone", async () => {
    const family = await familyWithPartner();
    session.userId = family.partner;

    const result = await removeHouseholdMember({ userId: family.owner });

    expect(result).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    await expect(
      db.householdMember.count({ where: { householdId: family.householdId } }),
    ).resolves.toBe(2);
  });

  it("never removes the OWNER themself", async () => {
    const family = await familyWithPartner();

    const result = await removeHouseholdMember({ userId: family.owner });

    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
    session.userId = family.owner;
    await expect(requireMember()).resolves.toMatchObject({ role: "OWNER" });
  });

  it("never touches another household's member", async () => {
    // Signed in as the OWNER of a household of their own.
    await familyWithPartner();
    const other = await createFamily();
    const { userId: stranger } = await createMember(other.householdId, {
      role: "MEMBER",
    });

    // The same answer as an already removed member: nothing to reveal.
    await expect(removeHouseholdMember({ userId: stranger })).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    await expect(
      db.householdMember.count({ where: { userId: stranger } }),
    ).resolves.toBe(1);
  });

  it("is idempotent, even on a simultaneous double tap", async () => {
    const family = await familyWithPartner();
    const input = { userId: family.partner };

    const results = await Promise.all([
      removeHouseholdMember(input),
      removeHouseholdMember(input),
    ]);

    expect(results).toEqual([
      { ok: true, data: undefined },
      { ok: true, data: undefined },
    ]);
    await expect(
      db.householdMember.count({ where: { householdId: family.householdId } }),
    ).resolves.toBe(1);
  });

  it("validates the input", async () => {
    await familyWithPartner();
    await expect(
      removeHouseholdMember({ userId: "not-a-uuid" }),
    ).resolves.toMatchObject({ ok: false, error: { code: "VALIDATION" } });
  });
});

describe("revokeHouseholdInvite", () => {
  it("makes the pending code useless and keeps used ones", async () => {
    const { family, code } = await familyWithInvite();
    await createInvite(family.householdId, {
      code: "ZZZZZZZZZZ",
      createdById: family.userId,
      usedAt: new Date(),
    });

    await expect(revokeHouseholdInvite()).resolves.toEqual({
      ok: true,
      data: undefined,
    });

    await expect(pendingInvites(family.householdId)).resolves.toBe(0);
    await expect(
      db.householdInvite.count({ where: { householdId: family.householdId } }),
    ).resolves.toBe(1);
    session.userId = randomUUID();
    await expect(
      joinHousehold({ displayName: "Pablo", code }),
    ).resolves.toMatchObject({ ok: false, error: { code: "VALIDATION" } });
  });

  it("is a no-op without a pending code", async () => {
    const family = await createFamily();
    session.userId = family.userId;
    await expect(revokeHouseholdInvite()).resolves.toEqual({
      ok: true,
      data: undefined,
    });
  });

  it("leaves a coherent household when racing a redemption", async () => {
    const { family, code } = await familyWithInvite();
    const joiner = randomUUID();

    const [joined] = await Promise.all([
      outcomeOf(
        (async () => {
          session.userId = joiner;
          return joinHousehold({ displayName: "Pablo", code });
        })(),
      ),
      (async () => {
        session.userId = family.userId;
        return revokeHouseholdInvite();
      })(),
    ]);

    const members = await db.householdMember.count({
      where: { householdId: family.householdId },
    });
    // Either the code was spent first (two members) or revoked (one).
    expect(members).toBe(joined === "REDIRECT:/" ? 2 : 1);
    await expect(pendingInvites(family.householdId)).resolves.toBe(0);
  });
});

describe("updateBaby", () => {
  function edit(babyId: string): Record<string, unknown> {
    return {
      babyId,
      babyName: "  Martina ",
      babyBirthDate: BIRTH_DATE,
      babySex: "FEMALE",
    };
  }

  function storedBaby(babyId: string): Promise<{
    name: string;
    birthDate: Date;
    sex: string | null;
  }> {
    return db.baby.findUniqueOrThrow({
      where: { id: babyId },
      select: { name: true, birthDate: true, sex: true },
    });
  }

  it("saves the name, birth date and sex, for either member", async () => {
    const family = await familyWithPartner();
    session.userId = family.partner;

    await expect(updateBaby(edit(family.babyId))).resolves.toEqual({
      ok: true,
      data: undefined,
    });

    await expect(storedBaby(family.babyId)).resolves.toEqual({
      name: "Martina",
      birthDate: parseDateOnly(BIRTH_DATE, "Europe/Madrid"),
      sex: "FEMALE",
    });
  });

  it("clears the sex when the parent prefers not to say", async () => {
    const family = await familyWithPartner();
    await updateBaby(edit(family.babyId));

    await updateBaby({ ...edit(family.babyId), babySex: undefined });

    await expect(storedBaby(family.babyId)).resolves.toMatchObject({
      sex: null,
    });
  });

  it("answers another household's baby as not found, untouched", async () => {
    await familyWithPartner();
    const other = await createFamily();
    const before = await storedBaby(other.babyId);

    const result = await updateBaby(edit(other.babyId));

    expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    await expect(storedBaby(other.babyId)).resolves.toEqual(before);
  });

  it("validates the input and saves nothing", async () => {
    const family = await familyWithPartner();
    const before = await storedBaby(family.babyId);

    const result = await updateBaby({ ...edit(family.babyId), babyName: " " });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION",
        fieldErrors: { babyName: expect.any(Array) },
      },
    });
    await expect(storedBaby(family.babyId)).resolves.toEqual(before);
  });
});

describe("leaveHousehold", () => {
  it("takes the MEMBER out; their records and the family stay", async () => {
    const family = await familyWithPartner();
    const record = await createFeeding(family.babyId, {
      createdById: family.partner,
    });
    session.userId = family.partner;

    await expect(leaveHousehold()).rejects.toThrow("REDIRECT:/join");

    await expect(
      db.householdMember.findMany({
        where: { householdId: family.householdId },
        select: { userId: true },
      }),
    ).resolves.toEqual([{ userId: family.owner }]);
    await expect(db.feeding.count({ where: { id: record.id } })).resolves.toBe(
      1,
    );
  });

  it("refuses the OWNER, who can only delete the family", async () => {
    const family = await familyWithPartner();

    const result = await leaveHousehold();

    expect(result).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    await expect(
      db.householdMember.count({ where: { householdId: family.householdId } }),
    ).resolves.toBe(2);
  });
});

describe("deleteHousehold", () => {
  /** One record of every kind and a pending code, all of them to go. */
  async function fillHousehold(
    family: Awaited<ReturnType<typeof familyWithPartner>>,
  ): Promise<void> {
    const author = { createdById: family.owner };
    await createDiaperChange(family.babyId, author);
    await createFeeding(family.babyId, author);
    await createSleepSession(family.babyId, author);
    await createGrowthMeasurement(family.babyId, author);
    await createHealthRecord(family.babyId, author);
    await createInvite(family.householdId, {
      code: "ABCDEFGHJK",
      createdById: family.owner,
    });
  }

  async function leftovers(
    householdId: string,
    babyId: string,
  ): Promise<number[]> {
    return Promise.all([
      db.household.count({ where: { id: householdId } }),
      db.householdMember.count({ where: { householdId } }),
      db.householdInvite.count({ where: { householdId } }),
      db.baby.count({ where: { householdId } }),
      db.diaperChange.count({ where: { babyId } }),
      db.feeding.count({ where: { babyId } }),
      db.sleepSession.count({ where: { babyId } }),
      db.growthMeasurement.count({ where: { babyId } }),
      db.healthRecord.count({ where: { babyId } }),
    ]);
  }

  it("erases the family and everything in it once the name is typed", async () => {
    const family = await familyWithPartner();
    await fillHousehold(family);
    const other = await createFamily();
    await createFeeding(other.babyId, { createdById: other.userId });
    session.userId = family.owner;

    // Case and extra spaces do not matter.
    await expect(deleteHousehold({ babyName: "  lucía " })).rejects.toThrow(
      "REDIRECT:/join",
    );

    await expect(leftovers(family.householdId, family.babyId)).resolves.toEqual(
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
    );
    await expect(leftovers(other.householdId, other.babyId)).resolves.toEqual([
      1, 1, 0, 1, 0, 1, 0, 0, 0,
    ]);
  });

  it("deletes nothing when the typed name does not match", async () => {
    const family = await familyWithPartner();
    await fillHousehold(family);

    const result = await deleteHousehold({ babyName: "Lucia" });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION",
        fieldErrors: { babyName: expect.any(Array) },
      },
    });
    await expect(leftovers(family.householdId, family.babyId)).resolves.toEqual(
      [1, 2, 1, 1, 1, 1, 1, 1, 1],
    );
  });

  it("refuses a MEMBER, even with the right name", async () => {
    const family = await familyWithPartner();
    session.userId = family.partner;

    const result = await deleteHousehold({ babyName: "Lucía" });

    expect(result).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    await expect(
      db.household.count({ where: { id: family.householdId } }),
    ).resolves.toBe(1);
  });

  it("validates the input", async () => {
    await familyWithPartner();
    await expect(deleteHousehold({})).resolves.toMatchObject({
      ok: false,
      error: { code: "VALIDATION" },
    });
  });

  it("leaves no member behind when a code is redeemed meanwhile", async () => {
    const { family, code } = await familyWithInvite();
    const joiner = randomUUID();

    await Promise.all([
      outcomeOf(
        (async () => {
          session.userId = family.userId;
          return deleteHousehold({ babyName: "Lucía" });
        })(),
      ),
      outcomeOf(
        (async () => {
          session.userId = joiner;
          return joinHousehold({ displayName: "Pablo", code });
        })(),
      ),
    ]);

    // Joined first and then erased with the family, or found the code gone.
    await expect(
      db.household.count({ where: { id: family.householdId } }),
    ).resolves.toBe(0);
    await expect(
      db.householdMember.count({ where: { userId: joiner } }),
    ).resolves.toBe(0);
  });
});
