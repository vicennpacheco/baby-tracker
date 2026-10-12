"use client";

import { LogOut } from "lucide-react";
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
import { leaveHousehold } from "@/features/household/actions";
import { useOnlineStatus } from "@/lib/use-online-status";

/**
 * The invited parent's way out (decision 071). On success the action
 * redirects to /join, so only a failure comes back here.
 */
export function LeaveHouseholdButton({
  babyName,
}: {
  babyName: string;
}): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isOnline = useOnlineStatus();

  function leave(): void {
    startTransition(async () => {
      const result = await leaveHousehold();
      if (!result.ok) toast.error(result.error.message);
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
        <LogOut aria-hidden className="size-5" />
        Salir de la familia
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Salir de la familia?</AlertDialogTitle>
          <AlertDialogDescription>
            Dejarás de ver los datos de {babyName} en todos tus dispositivos. Lo
            que registraste se queda. Para volver, necesitarás un código nuevo.
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
            onClick={leave}
            className="h-12 bg-destructive text-base text-background hover:bg-destructive/90"
          >
            {isPending ? "Saliendo…" : "Salir de la familia"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
