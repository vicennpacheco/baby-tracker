"use client";

import { Trash } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { TextField } from "@/components/shared/text-field";
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
import { deleteHousehold } from "@/features/household/actions";
import { matchesBabyName } from "@/features/household/delete-confirmation";
import { callAction } from "@/lib/call-action";
import { useOnlineStatus } from "@/lib/use-online-status";

type DeleteHouseholdDialogProps = {
  babyName: string;
  /** The other parent, who loses access too; null when alone. */
  partnerName: string | null;
};

/**
 * The OWNER erases the family. Typing the baby's name unlocks the button
 * (and the server checks it again): a confirmation, not a data form, the
 * one input the MVP allows inside an AlertDialog (decision 071). On
 * success the action redirects to /join.
 */
export function DeleteHouseholdDialog({
  babyName,
  partnerName,
}: DeleteHouseholdDialogProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const isOnline = useOnlineStatus();
  const isConfirmed = matchesBabyName(typed, babyName);

  function changeOpen(open: boolean): void {
    setIsOpen(open);
    // A closed dialog forgets what was typed: confirming starts over.
    if (!open) {
      setTyped("");
      setError(undefined);
    }
  }

  function erase(): void {
    startTransition(async () => {
      const result = await callAction(() =>
        deleteHousehold({ babyName: typed }),
      );
      if (result.ok) return;
      const fieldError = result.error.fieldErrors?.babyName?.[0];
      if (fieldError) setError(fieldError);
      else toast.error(result.error.message);
    });
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={changeOpen}>
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
        Eliminar familia
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar la familia?</AlertDialogTitle>
          <AlertDialogDescription>
            Se borrarán para siempre los datos de {babyName} y todos sus
            registros
            {partnerName ? `, y ${partnerName} perderá el acceso` : ""}. No se
            puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <TextField
          label={`Escribe «${babyName}» para confirmar`}
          value={typed}
          onChange={(event) => {
            setTyped(event.target.value);
            setError(undefined);
          }}
          error={error}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          onKeyDown={(event) => {
            // Enter confirms once the name matches, as a form would.
            if (event.key === "Enter" && isConfirmed && !isPending) erase();
          }}
        />
        <AlertDialogFooter>
          <AlertDialogCancel className="h-12 text-base">
            Cancelar
          </AlertDialogCancel>
          {/* Solid red, as every destructive confirmation (decision 058). */}
          <AlertDialogAction
            type="button"
            disabled={!isConfirmed || isPending}
            onClick={erase}
            className="h-12 bg-destructive text-base text-background hover:bg-destructive/90"
          >
            {isPending ? "Eliminando…" : "Eliminar familia"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
