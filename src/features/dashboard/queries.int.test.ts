import { describe, expect, it } from "vitest";

import { getDailySummary, hasAnyRecord } from "@/features/dashboard/queries";
import { getDayRange } from "@/lib/dates";
import {
  createBaby,
  createDiaperChange,
  createFamily,
  createFeeding,
  createGrowthMeasurement,
  createHealthRecord,
  createSleepSession,
} from "@/test/factories";

const MINUTE_MS = 60_000;
// Oct 1 in Madrid (UTC+2): 22:00 UTC on Sep 30 → 22:00 UTC on Oct 1.
const OCT_1 = getDayRange(new Date("2026-10-01T12:00:00Z"), "Europe/Madrid");

describe("getDailySummary", () => {
  it("summarizes the household day from the three modules", async () => {
    const family = await createFamily();
    const author = { createdById: family.userId };
    // 23:00 on Sep 30 → 01:00 on Oct 1: one hour belongs to Oct 1.
    await createSleepSession(family.babyId, {
      ...author,
      startedAt: new Date("2026-09-30T21:00:00Z"),
      endedAt: new Date("2026-09-30T23:00:00Z"),
    });
    // 13:00 → 14:30 on Oct 1.
    await createSleepSession(family.babyId, {
      ...author,
      startedAt: new Date("2026-10-01T11:00:00Z"),
      endedAt: new Date("2026-10-01T12:30:00Z"),
    });
    await createFeeding(family.babyId, {
      ...author,
      type: "BOTTLE",
      startedAt: new Date("2026-10-01T07:00:00Z"),
      amountMl: 90,
    });
    await createFeeding(family.babyId, {
      ...author,
      type: "BOTTLE",
      startedAt: new Date("2026-10-01T10:00:00Z"),
      amountMl: 120,
    });
    // 23:50 on Oct 1 → 00:10 on Oct 2: ten minutes belong to Oct 1.
    await createFeeding(family.babyId, {
      ...author,
      startedAt: new Date("2026-10-01T21:50:00Z"),
      endedAt: new Date("2026-10-01T22:10:00Z"),
    });
    await createDiaperChange(family.babyId, {
      ...author,
      type: "WET",
      occurredAt: new Date("2026-10-01T06:00:00Z"),
    });
    await createDiaperChange(family.babyId, {
      ...author,
      type: "MIXED",
      occurredAt: new Date("2026-10-01T09:00:00Z"),
    });
    // 00:30 on Oct 2 in Madrid: not part of Oct 1.
    await createDiaperChange(family.babyId, {
      ...author,
      type: "DIRTY",
      occurredAt: new Date("2026-10-01T22:30:00Z"),
    });

    await expect(getDailySummary(family.babyId, OCT_1)).resolves.toEqual({
      feedings: {
        count: 3,
        bottleCount: 2,
        bottleMl: 210,
        breastCount: 1,
        breastMs: 10 * MINUTE_MS,
      },
      diapers: { total: 2, wet: 2, dirty: 1 },
      sleep: { count: 1, totalMs: 150 * MINUTE_MS },
    });
  });

  it("never mixes in another baby's records", async () => {
    const family = await createFamily();
    const sibling = await createBaby(family.householdId);
    await createDiaperChange(sibling.babyId, {
      createdById: family.userId,
      occurredAt: new Date("2026-10-01T09:00:00Z"),
    });

    const summary = await getDailySummary(family.babyId, OCT_1);

    expect(summary.diapers.total).toBe(0);
  });
});

describe("hasAnyRecord", () => {
  it("is false for a baby without any record yet", async () => {
    const family = await createFamily();
    await expect(hasAnyRecord(family.babyId)).resolves.toBe(false);
  });

  it.each([
    ["a diaper", createDiaperChange],
    ["a feeding", createFeeding],
    ["a sleep", createSleepSession],
    ["a growth measurement", createGrowthMeasurement],
    ["a health record", createHealthRecord],
  ] as const)("is true once there is %s", async (_kind, create) => {
    const family = await createFamily();
    await create(family.babyId, { createdById: family.userId });

    await expect(hasAnyRecord(family.babyId)).resolves.toBe(true);
  });

  it("never counts a sibling's records", async () => {
    const family = await createFamily();
    const sibling = await createBaby(family.householdId);
    await createFeeding(sibling.babyId, { createdById: family.userId });

    await expect(hasAnyRecord(family.babyId)).resolves.toBe(false);
  });
});
