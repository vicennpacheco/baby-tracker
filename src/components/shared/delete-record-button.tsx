"use client";

import { Trash } from "lucide-react";
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
import type { ActionResult } from "@/lib/action-result";
import { callAction } from "@/lib/call-action";
import { useOnlineStatus } from "@/lib/use-online-status";

type DeleteRecordButtonProps = {
  id: string;
  /** The module's delete Server Action, handed down by the page. */
  deleteAction: (input: { id: string }) => Promise<ActionResult>;
  /** Where to go once it is gone: the history of its day. */
  returnHref: string;
  /** "Borrar pañal": the trigger and the confirmation. */
  actionLabel: string;
  /** "¿Borrar este pañal?" */
  title: string;
  /** "Pañal borrado" */
  successMessage: string;
};

/**
 * Deleting is permanent and shared (CLAUDE.md §2.6): an AlertDialog asks
 * first, the one dialog the MVP allows (§4.3).
 */
export function DeleteRecordButton({
  id,
  deleteAction,
  returnHref,
  actionLabel,
  title,
  successMessage,
}: DeleteRecordButtonProps): ReactNode {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isOnline = useOnlineStatus();

  function remove(): void {
    startTransition(async () => {
      const result = await callAction(() => deleteAction({ id }));
      if (result.ok) {
        setIsOpen(false);
        toast.success(successMessage);
        router.replace(returnHref);
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
            size="lg"
            className="h-12 w-full text-base text-destructive"
          />
        }
      >
        <Trash aria-hidden className="size-5" />
        {actionLabel}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            Se borrará para los dos. No se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-12 text-base">
            Cancelar
          </AlertDialogCancel>
          {/* Solid red: the tinted "destructive" variant gives its text only
              3.99:1 in light mode (WCAG 1.4.3 asks 4.5:1). */}
          <AlertDialogAction
            type="button"
            disabled={isPending}
            onClick={remove}
            className="h-12 bg-destructive text-base text-background hover:bg-destructive/90"
          >
            {isPending ? "Borrando…" : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
