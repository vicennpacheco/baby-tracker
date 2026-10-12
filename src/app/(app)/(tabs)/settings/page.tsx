import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { ThemeChoice } from "@/components/shared/theme-choice";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBaby, requireMember } from "@/features/auth/session";
import { BabyCard } from "@/features/household/components/baby-card";
import { DangerZone } from "@/features/household/components/danger-zone";
import { MemberList } from "@/features/household/components/member-list";
import { RevokeInviteButton } from "@/features/household/components/revoke-invite-button";
import {
  getPendingInvite,
  listHouseholdMembers,
} from "@/features/household/queries";
import { MAX_HOUSEHOLD_MEMBERS } from "@/features/household/service";
import {
  formatBabyAge,
  formatRelativeDayTime,
  formatShortDate,
} from "@/lib/dates";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ajustes · Métricas Bebé" };

export default function SettingsPage(): ReactNode {
  return (
    <>
      <PageHeader backHref="/more" title="Ajustes" />
      <div className="flex flex-col gap-8">
        <Suspense fallback={<SectionSkeleton rows={1} />}>
          <BabySection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton rows={2} />}>
          <FamilySection />
        </Suspense>
        <section
          aria-labelledby="appearance-title"
          className="flex flex-col gap-3"
        >
          <h2 id="appearance-title" className="text-lg font-semibold">
            Apariencia
          </h2>
          <ThemeChoice />
        </section>
        <Suspense fallback={<SectionSkeleton rows={1} />}>
          <DangerSection />
        </Suspense>
      </div>
    </>
  );
}

async function BabySection(): Promise<ReactNode> {
  const { baby } = await requireBaby();
  const now = new Date();
  const timeZone = env.APP_TIMEZONE;

  return (
    <BabyCard
      name={baby.name}
      age={formatBabyAge(baby.birthDate, now, timeZone)}
      birthDate={formatShortDate(baby.birthDate, now, timeZone)}
    />
  );
}

async function DangerSection(): Promise<ReactNode> {
  const { member, baby } = await requireBaby();
  const members = await listHouseholdMembers(member.householdId);
  const partner = members.find(({ userId }) => userId !== member.userId);

  return (
    <DangerZone
      role={member.role}
      babyName={baby.name}
      partnerName={partner?.displayName ?? null}
    />
  );
}

async function FamilySection(): Promise<ReactNode> {
  const member = await requireMember();
  const now = new Date();
  const [members, pendingInvite] = await Promise.all([
    listHouseholdMembers(member.householdId),
    getPendingInvite(member.householdId, now),
  ]);
  const isFull = members.length >= MAX_HOUSEHOLD_MEMBERS;

  return (
    <section aria-labelledby="family-title" className="flex flex-col gap-3">
      <h2 id="family-title" className="text-lg font-semibold">
        Familia
      </h2>
      <MemberList
        members={members}
        viewerId={member.userId}
        canRemove={member.role === "OWNER"}
      />
      {pendingInvite ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-muted p-4">
          <p>
            Hay un código de invitación activo hasta{" "}
            {formatRelativeDayTime(
              pendingInvite.expiresAt,
              now,
              env.APP_TIMEZONE,
            )}
            . Si lo compartiste por error, anúlalo.
          </p>
          <RevokeInviteButton />
        </div>
      ) : (
        !isFull && (
          <Link
            href="/settings/invite"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-12 w-full text-base",
            )}
          >
            <UserPlus aria-hidden className="size-5" />
            Invitar al otro progenitor
          </Link>
        )
      )}
    </section>
  );
}

function SectionSkeleton({ rows }: { rows: number }): ReactNode {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-3">
      <Skeleton className="h-7 w-24" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
