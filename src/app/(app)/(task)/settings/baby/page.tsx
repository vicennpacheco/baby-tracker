import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/shared/form-skeleton";
import { requireBaby } from "@/features/auth/session";
import { EditBabyForm } from "@/features/household/components/edit-baby-form";
import { getBabyProfile } from "@/features/household/queries";
import { formatDateInputValue } from "@/lib/dates";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Datos del bebé · Métricas Bebé" };

export default function EditBabyPage(): ReactNode {
  return (
    <>
      <PageHeader
        backHref="/settings"
        title="Datos del bebé"
        description="Cualquiera de los dos puede cambiarlos."
      />
      <Suspense fallback={<FormSkeleton fields={3} />}>
        <EditBabySection />
      </Suspense>
    </>
  );
}

async function EditBabySection(): Promise<ReactNode> {
  const { member, baby } = await requireBaby();
  const profile = await getBabyProfile(baby.id, member.householdId);
  // Deleted between the two reads: the same 404 as any missing record.
  if (!profile) notFound();
  const timeZone = env.APP_TIMEZONE;

  return (
    <EditBabyForm
      maxBirthDate={formatDateInputValue(new Date(), timeZone)}
      defaultValues={{
        babyId: profile.id,
        babyName: profile.name,
        babyBirthDate: formatDateInputValue(profile.birthDate, timeZone),
        babySex: profile.sex ?? undefined,
      }}
    />
  );
}
