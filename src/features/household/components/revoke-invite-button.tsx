"use client";

import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { revokeHouseholdInvite } from "@/features/household/actions";
import { callAction } from "@/lib/call-action";
import { useOnlineStatus } from "@/lib/use-online-status";

/**
 * "Anular código": a code shared by mistake stops working. Nothing is lost
 * (a new code takes one tap), so no confirmation.
 */
export function RevokeInviteButton(): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isOnline = useOnlineStatus();

  function revoke(): void {
    startTransition(async () => {
      const result = await callAction(() => revokeHouseholdInvite());
      if (result.ok) {
        toast.success("Código anulado");
        router.refresh();
        return;
      }
      toast.error(result.error.message);
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending || !isOnline}
      onClick={revoke}
      className="h-12 w-full text-base"
    >
      <Ban aria-hidden className="size-5" />
      {isPending ? "Anulando…" : "Anular código"}
    </Button>
  );
}
