import { describe, expect, it } from "vitest";

import {
  getBabyProfile,
  getPendingInvite,
  listHouseholdMembers,
} from "@/features/household/queries";
import { createFamily, createInvite, createMember } from "@/test/factories";

describe("listHouseholdMembers", () => {
  it("lists only the household's members, oldest first", async () => {
    const family = await createFamily();
    await createMember(family.householdId, {
      role: "MEMBER",
      displayName: "Pablo",
    });
    await createFamily();

    const members = await listHouseholdMembers(family.householdId);
    expect(members.map((member) => member.displayName)).toEqual([
      "Ana",
      "Pablo",
    ]);
    expect(members.map((member) => member.role)).toEqual(["OWNER", "MEMBER"]);
  });
});

describe("getPendingInvite", () => {
  it("returns only the expiry of an unused, unexpired invite", async () => {
    const family = await createFamily();
    const now = new Date("2026-10-08T12:00:00Z");
    await createInvite(family.householdId, {
      code: "AAAAAAAAAA",
      createdById: family.userId,
      expiresAt: new Date("2026-10-08T11:00:00Z"),
    });
    await createInvite(family.householdId, {
      code: "BBBBBBBBBB",
      createdById: family.userId,
      usedAt: now,
      expiresAt: new Date("2026-10-09T12:00:00Z"),
    });
    expect(await getPendingInvite(family.householdId, now)).toBeNull();

    await createInvite(family.householdId, {
      code: "CCCCCCCCCC",
      createdById: family.userId,
      expiresAt: new Date("2026-10-09T12:00:00Z"),
    });
    expect(await getPendingInvite(family.householdId, now)).toEqual({
      expiresAt: new Date("2026-10-09T12:00:00Z"),
    });
  });

  it("never sees another household's invite", async () => {
    const mine = await createFamily();
    const theirs = await createFamily();
    await createInvite(theirs.householdId, {
      code: "DDDDDDDDDD",
      createdById: theirs.userId,
    });
    expect(await getPendingInvite(mine.householdId)).toBeNull();
  });
});

describe("getBabyProfile", () => {
  it("gives the household's baby, sex included", async () => {
    const family = await createFamily();

    await expect(
      getBabyProfile(family.babyId, family.householdId),
    ).resolves.toMatchObject({ id: family.babyId, sex: null });
  });

  it("never returns another household's baby", async () => {
    const family = await createFamily();
    const other = await createFamily();

    await expect(
      getBabyProfile(other.babyId, family.householdId),
    ).resolves.toBeNull();
  });
});
