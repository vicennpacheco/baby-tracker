import type { ReactNode } from "react";

import { DeleteHouseholdDialog } from "@/features/household/components/delete-household-dialog";
import { LeaveHouseholdButton } from "@/features/household/components/leave-household-button";
import type { HouseholdRole } from "@/generated/prisma/enums";

type DangerZoneProps = {
  role: HouseholdRole;
  babyName: string;
  partnerName: string | null;
};

/**
 * The end of Settings: the invited parent may leave, the creator may only
 * delete the family (no ownership transfer in the MVP, decision 071).
 */
export function DangerZone({
  role,
  babyName,
  partnerName,
}: DangerZoneProps): ReactNode {
  const isOwner = role === "OWNER";

  return (
    <section aria-labelledby="danger-title" className="flex flex-col gap-3">
      <h2 id="danger-title" className="text-lg font-semibold">
        Zona peligrosa
      </h2>
      <p className="text-muted-foreground">
        {isOwner
          ? `Eliminar la familia borra los datos de ${babyName} para los dos.`
          : `Si sales, dejarás de ver los datos de ${babyName}.`}
      </p>
      {isOwner ? (
        <DeleteHouseholdDialog babyName={babyName} partnerName={partnerName} />
      ) : (
        <LeaveHouseholdButton babyName={babyName} />
      )}
    </section>
  );
}
