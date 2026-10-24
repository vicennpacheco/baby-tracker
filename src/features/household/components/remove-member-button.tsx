"use client";

import { UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { removeHouseholdMember } from "@/features/household/actions";
import { callAction } from "@/lib/call-action";
import { useOnlineStatus } from "@/lib/use-online-status";

type RemoveMemberButtonProps = {
  userId: string;
  displayName: string;
};

/**
 * The OWNER's answer to a leaked code: the person loses access at once and
 * pending codes are revoked (removeHouseholdMember). An AlertDialog asks
 * first, the one dialog the MVP allows (CLAUDE.md §4.3).
 */
export function RemoveMemberButton({
  userId,
  displayName,
}: RemoveMemberButtonProps): ReactNode {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isOnline = useOnlineStatus();

  function remove(): void {
    startTransition(async () => {
      const result = await callAction(() => removeHouseholdMember({ userId }));
      if (result.ok) {
        setIsOpen(false);
        toast.success(`${displayName} ya no está en la familia`);
        router.refresh();
        return;
      }
      toast.error(result.error.message);
    });
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger
        disabled={!isOnline}
        render={
          <Button
            type="button"
            variant="ghost"
            className="h-12 shrink-0 px-3 text-base text-destructive"
          />
        }
      >
        <UserMinus aria-hidden className="size-5" />
        Expulsar
        <span className="sr-only"> a {displayName}</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Expulsar a {displayName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Dejará de ver los datos del bebé al momento. Lo que registró se
            queda y los códigos de invitación pendientes dejan de valer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-12 text-base">
            Cancelar
          </AlertDialogCancel>
          {/* Solid red, as every destructive confirmation (decision 058). */}
          <AlertDialogAction
            type="button"
            disabled={isPending}
            onClick={remove}
            className="h-12 bg-destructive text-base text-background hover:bg-destructive/90"
          >
            {isPending ? "Expulsando…" : "Expulsar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
