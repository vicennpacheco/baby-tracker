import "server-only";

import { type DailySummary, summarizeDay } from "@/features/dashboard/service";
import { listDiaperChangesByDay } from "@/features/diapers/queries";
import { listFeedingsByDay } from "@/features/feeding/queries";
import { listSleepSessionsByDay } from "@/features/sleep/queries";
import type { DayRange } from "@/lib/dates";
import { db } from "@/lib/db";

// The dashboard is the one module allowed to read the others' queries
// (CLAUDE.md §2.9). Reusing the day listings keeps "Hoy" and each module's
// history in agreement, sessions across midnight included.

/** Totals of one household day for a baby already authorized by requireBaby(). */
export async function getDailySummary(
  babyId: string,
  day: DayRange,
  now: Date = new Date(),
): Promise<DailySummary> {
  const [feedings, diaperChanges, sleepSessions] = await Promise.all([
    listFeedingsByDay(babyId, day),
    listDiaperChangesByDay(babyId, day),
    listSleepSessionsByDay(babyId, day),
  ]);
  return summarizeDay({ feedings, diaperChanges, sleepSessions }, day, now);
}

/**
 * Whether the baby has any record at all, of any kind and any day: "Hoy"
 * welcomes a family on its first use instead of showing zeros. Five
 * lookups of a single id each, in parallel, on the (baby_id, …) indexes.
 */
export async function hasAnyRecord(babyId: string): Promise<boolean> {
  const where = { babyId };
  const select = { id: true };
  const found = await Promise.all([
    db.diaperChange.findFirst({ where, select }),
    db.feeding.findFirst({ where, select }),
    db.sleepSession.findFirst({ where, select }),
    db.growthMeasurement.findFirst({ where, select }),
    db.healthRecord.findFirst({ where, select }),
  ]);
  return found.some((record) => record !== null);
}
