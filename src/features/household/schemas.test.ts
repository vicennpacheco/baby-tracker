import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createHouseholdSchema,
  joinHouseholdSchema,
} from "@/features/household/schemas";

// Pin the clock: the birth date rules are relative to "now".
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-08T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

const VALID_HOUSEHOLD = {
  householdId: "5eed0000-0000-4000-8000-000000000001",
  babyId: "5eed0000-0000-4000-8000-000000000002",
  displayName: "  Ana ",
  babyName: "Lucía",
  babyBirthDate: "2026-08-27",
};

describe("createHouseholdSchema", () => {
  it.each(["FEMALE", "MALE", undefined])(
    "accepts the baby's sex %s, optional (decision 069)",
    (babySex) => {
      expect(
        createHouseholdSchema.parse({ ...VALID_HOUSEHOLD, babySex }).babySex,
      ).toBe(babySex);
    },
  );

  it("trims names and keeps the date as YYYY-MM-DD", () => {
    expect(createHouseholdSchema.parse(VALID_HOUSEHOLD)).toMatchObject({
      displayName: "Ana",
      babyBirthDate: "2026-08-27",
    });
  });

  it.each([
    ["displayName", ""],
    ["babyName", "   "],
    ["babyBirthDate", "2026-02-31"],
    ["babyBirthDate", "2099-01-01"],
    ["babyBirthDate", "2019-01-01"],
    ["householdId", "not-a-uuid"],
    ["babySex", "OTHER"],
  ])("rejects %s = %j", (field, value) => {
    const result = createHouseholdSchema.safeParse({
      ...VALID_HOUSEHOLD,
      [field]: value,
    });
    expect(result.success).toBe(false);
  });
});

describe("joinHouseholdSchema", () => {
  it("normalizes the code as typed on a phone", () => {
    expect(
      joinHouseholdSchema.parse({ displayName: "Pablo", code: "abcde fghjk" }),
    ).toEqual({ displayName: "Pablo", code: "ABCDEFGHJK" });
  });

  it("rejects malformed codes with a message on the code field", () => {
    const result = joinHouseholdSchema.safeParse({
      displayName: "Pablo",
      code: "ABC",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["code"]);
  });
});
