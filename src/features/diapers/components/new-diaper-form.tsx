"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormFooter } from "@/components/shared/form-footer";
import { offerUndo } from "@/components/shared/offer-undo";
import { SubmitButton } from "@/components/shared/submit-button";
import {
  createDiaperChange,
  deleteDiaperChange,
} from "@/features/diapers/actions";
import {
  DIAPER_FIELD_NAMES,
  DiaperFields,
} from "@/features/diapers/components/diaper-fields";
import {
  diaperChangeSchemas,
  type CreateDiaperChangeInput,
} from "@/features/diapers/schemas";
import { callAction } from "@/lib/call-action";
import { applyFieldErrors } from "@/lib/forms";

type NewDiaperFormProps = {
  babyId: string;
  timeZone: string;
  /** "Now" in the household zone, from the server. */
  defaultOccurredAt: string;
};

/** A diaper with its own time and details, for one logged late. */
export function NewDiaperForm({
  babyId,
  timeZone,
  defaultOccurredAt,
}: NewDiaperFormProps): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // One id per form: a retry or a double tap re-sends the same diaper.
  const [id] = useState(() => crypto.randomUUID());
  const schema = useMemo(
    () => diaperChangeSchemas(timeZone).createDiaperChangeSchema,
    [timeZone],
  );
  // raw: the server converts the local time once (decision 049).
  const form = useForm<CreateDiaperChangeInput>({
    resolver: zodResolver(schema, undefined, { raw: true }),
    defaultValues: { id, babyId, type: "WET", occurredAt: defaultOccurredAt },
  });

  function onSubmit(values: CreateDiaperChangeInput): void {
    startTransition(async () => {
      const result = await callAction(() => createDiaperChange(values));
      if (result.ok) {
        offerUndo({
          message: "Pañal guardado",
          undo: () => deleteDiaperChange({ id }),
          undoneMessage: "Pañal borrado",
        });
        router.replace("/diapers");
        return;
      }
      const { message, fieldErrors } = result.error;
      if (!applyFieldErrors(form.setError, DIAPER_FIELD_NAMES, fieldErrors)) {
        toast.error(message);
      }
    });
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-1 flex-col gap-6"
        noValidate
      >
        <DiaperFields timeZone={timeZone} />
        <FormFooter>
          <SubmitButton isPending={isPending} pendingLabel="Guardando…">
            Guardar pañal
          </SubmitButton>
        </FormFooter>
      </form>
    </FormProvider>
  );
}
