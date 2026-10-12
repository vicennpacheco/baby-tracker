import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { DayNav } from "@/components/shared/day-nav";
import { InstallHint } from "@/components/shared/install-hint";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBaby } from "@/features/auth/session";
import { DaySummary } from "@/features/dashboard/components/day-summary";
import { FirstUseCard } from "@/features/dashboard/components/first-use-card";
import { LastFeedingCard } from "@/features/dashboard/components/last-feeding-card";
import { RunningTimers } from "@/features/dashboard/components/running-timers";
import { getDailySummary, hasAnyRecord } from "@/features/dashboard/queries";
import {
  describeLastFeeding,
  FEEDING_TYPE_LABELS,
} from "@/features/feeding/labels";
import {
  getActiveFeeding,
  getLastBreastFeeding,
  getLastFeeding,
} from "@/features/feeding/queries";
import { suggestNextBreast } from "@/features/feeding/service";
import { formatWeight } from "@/features/growth/labels";
import { getLatestGrowthMeasurement } from "@/features/growth/queries";
import { InvitePartnerCard } from "@/features/household/components/invite-partner-card";
import { listHouseholdMembers } from "@/features/household/queries";
import { MAX_HOUSEHOLD_MEMBERS } from "@/features/household/service";
import { getActiveSleepSession } from "@/features/sleep/queries";
import { authorLabel, authorNamesOf } from "@/lib/authors";
import {
  dayNavProps,
  formatDayLabel,
  formatShortDate,
  resolveDay,
} from "@/lib/dates";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Hoy · Métricas Bebé" };

export default function TodayPage({ searchParams }: PageProps<"/">): ReactNode {
  return (
    <>
      <PageHeader title="Hoy" />
      <Suspense fallback={<TodaySkeleton />}>
        <TodaySection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function TodaySection({
  searchParams,
}: Pick<PageProps<"/">, "searchParams">): Promise<ReactNode> {
  const { member, baby } = await requireBaby();
  const { day: dayParam } = await searchParams;
  const now = new Date();
  const timeZone = env.APP_TIMEZONE;
  // The selected day lives in the URL (CLAUDE.md §2.4).
  const day = resolveDay(
    typeof dayParam === "string" ? dayParam : undefined,
    now,
    timeZone,
  );
  // Past days show the summary only (decision D4); one parallel batch.
  const today = day.isToday;
  const [
    summary,
    members,
    last,
    lastBreast,
    feeding,
    sleep,
    growth,
    hasRecords,
  ] = await Promise.all([
    getDailySummary(baby.id, day.range, now),
    listHouseholdMembers(member.householdId),
    today ? getLastFeeding(baby.id) : null,
    today ? getLastBreastFeeding(baby.id) : null,
    today ? getActiveFeeding(baby.id) : null,
    today ? getActiveSleepSession(baby.id) : null,
    today ? getLatestGrowthMeasurement(baby.id) : null,
    today ? hasAnyRecord(baby.id) : true,
  ]);
  const names = authorNamesOf(members);
  const byWhom = (userId: string): string | null =>
    authorLabel(userId, member.userId, names);
  const serverNow = now.toISOString();

  return (
    <div className="flex flex-1 flex-col gap-4">
      <DayNav
        label={formatDayLabel(day, now, timeZone)}
        {...dayNavProps("/", day, now, timeZone)}
      />
      {/* First use: a welcome instead of a summary of zeros. */}
      {!hasRecords && <FirstUseCard babyName={baby.name} />}
      {today && members.length < MAX_HOUSEHOLD_MEMBERS && <InvitePartnerCard />}
      {today && <InstallHint />}
      <RunningTimers
        serverNow={serverNow}
        feeding={
          feeding && feeding.type !== "BOTTLE"
            ? {
                id: feeding.id,
                label: FEEDING_TYPE_LABELS[feeding.type],
                startedAt: feeding.startedAt.toISOString(),
                startedBy: byWhom(feeding.createdById),
              }
            : null
        }
        sleep={
          sleep && {
            id: sleep.id,
            startedAt: sleep.startedAt.toISOString(),
            startedBy: byWhom(sleep.createdById),
          }
        }
      />
      {/* The running feeding already has its own card. */}
      {last && last.id !== feeding?.id && (
        <LastFeedingCard
          description={describeLastFeeding(last)}
          startedAt={last.startedAt.toISOString()}
          serverNow={serverNow}
          author={byWhom(last.createdById)}
          nextBreast={
            feeding
              ? null
              : FEEDING_TYPE_LABELS[
                  suggestNextBreast(lastBreast?.type ?? null)
                ].toLowerCase()
          }
        />
      )}
      {hasRecords && (
        <DaySummary
          summary={summary}
          isToday={today}
          dayQuery={today ? "" : `?day=${day.date}`}
          latestWeight={
            growth?.weightGrams != null
              ? {
                  value: formatWeight(growth.weightGrams),
                  detail: `Último peso, ${formatShortDate(growth.measuredAt, now, timeZone)}`,
                }
              : null
          }
        />
      )}
    </div>
  );
}

function TodaySkeleton(): ReactNode {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="flex flex-1 flex-col gap-4"
    >
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}
