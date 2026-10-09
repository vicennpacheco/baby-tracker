import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/shared/form-skeleton";
import { requireNoHousehold } from "@/features/auth/session";
import { CreateHouseholdForm } from "@/features/household/components/create-household-form";
import { formatDateInputValue } from "@/lib/dates";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Crea tu familia · Métricas Bebé" };

// The form draws its own header: the title and the back control follow the
// wizard step, which lives in the URL (?step=baby, decision 071).
export default function CreateHouseholdPage(): ReactNode {
  return (
    <Suspense fallback={<CreateHouseholdSkeleton />}>
      <CreateHouseholdSection />
    </Suspense>
  );
}

async function CreateHouseholdSection(): Promise<ReactNode> {
  await requireNoHousehold();
  // "Today" for the date picker's max comes from the household time zone,
  // never the browser's or the server's (CLAUDE.md §2.5).
  const today = formatDateInputValue(new Date(), env.APP_TIMEZONE);

  return <CreateHouseholdForm maxBirthDate={today} />;
}

function CreateHouseholdSkeleton(): ReactNode {
  return (
    <>
      <PageHeader backHref="/join" title="Crea tu familia" />
      <FormSkeleton fields={1} />
    </>
  );
}
