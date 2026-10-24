"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { FormFooter } from "@/components/shared/form-footer";
import { SubmitButton } from "@/components/shared/submit-button";
import { createHouseholdInvite } from "@/features/household/actions";
import { InviteCodeDisplay } from "@/features/household/components/invite-code-display";
import { callAction } from "@/lib/call-action";

type InviteCodePanelProps = {
  /** "mañana a las 14:30" when a usable code exists; it can't be shown again. */
  pendingExpiry: string | null;
};

export function InviteCodePanel({
  pendingExpiry,
}: InviteCodePanelProps): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Only in memory: the server keeps nothing that could show it again.
  const [code, setCode] = useState<string | null>(null);

  function generateCode(): void {
    startTransition(async () => {
      const result = await callAction(() => createHouseholdInvite());
      if (result.ok) {
        setCode(result.data.code);
        return;
      }
      if (result.error.code === "CONFLICT") {
        // The other parent joined meanwhile: show the complete household.
        toast.info(result.error.message);
        router.refresh();
        return;
      }
      toast.error(result.error.message);
    });
  }

  return (
    <>
      {/* Persistent live region: announces each new code, spelled out. */}
      <p aria-live="polite" className="sr-only">
        {code ? `Código generado: ${[...code].join(" ")}` : ""}
      </p>
      {code ? (
        <InviteCodeDisplay
          code={code}
          isRegenerating={isPending}
          onRegenerate={generateCode}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-6">
          <p className="text-muted-foreground">
            {pendingExpiry
              ? `Ya hay un código activo hasta ${pendingExpiry}. Por seguridad, solo se muestra una vez: si no lo guardaste, genera otro y el anterior dejará de funcionar.`
              : "Genera un código y envíaselo. Con él podrá ver y registrar todo desde su móvil."}
          </p>
          <FormFooter>
            <SubmitButton
              type="button"
              onClick={generateCode}
              isPending={isPending}
              pendingLabel="Generando…"
            >
              {pendingExpiry ? "Generar otro código" : "Generar código"}
            </SubmitButton>
          </FormFooter>
        </div>
      )}
    </>
  );
}
