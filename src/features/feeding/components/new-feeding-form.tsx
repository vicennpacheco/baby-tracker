"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormFooter } from "@/components/shared/form-footer";
import { offerUndo } from "@/components/shared/offer-undo";
import { SubmitButton } from "@/components/shared/submit-button";
import { createFeeding, deleteFeeding } from "@/features/feeding/actions";
import {
  FEEDING_FIELD_NAMES,
  FeedingFields,
} from "@/features/feeding/components/feeding-fields";
import {
  feedingSchemas,
  type CreateFeedingInput,
} from "@/features/feeding/schemas";
import type { BottleContent, FeedingType } from "@/generated/prisma/enums";
import { callAction } from "@/lib/call-action";
import { applyFieldErrors } from "@/lib/forms";

export type NewFeedingDefaults = {
  type: FeedingType;
  /** Household wall-clock times from the server. */
  startedAt: string;
  endedAt: string;
  /** The last bottle's, so a usual bottle takes two taps (§4.2). */
  amountMl?: number;
  bottleContent?: BottleContent;
};

type NewFeedingFormProps = {
  babyId: string;
  timeZone: string;
  defaults: NewFeedingDefaults;
};

/** A bottle, or a breast feeding logged late with its start and end. */
export function NewFeedingForm({
  babyId,
  timeZone,
  defaults,
}: NewFeedingFormProps): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // One id per form: a retry or a double tap re-sends the same feeding.
  const [id] = useState(() => crypto.randomUUID());
  const schema = useMemo(
    () => feedingSchemas(timeZone).createFeedingSchema,
    [timeZone],
  );
  // raw: the server converts the local times once (decision 049).
  const form = useForm<CreateFeedingInput>({
    resolver: zodResolver(schema, undefined, { raw: true }),
    defaultValues: { id, babyId, ...defaults },
  });

  function onSubmit(values: CreateFeedingInput): void {
    startTransition(async () => {
      const result = await callAction(() => createFeeding(values));
      if (result.ok) {
        offerUndo({
          message:
            values.type === "BOTTLE" ? "Biberón guardado" : "Toma guardada",
          undo: () => deleteFeeding({ id }),
          undoneMessage: "Toma borrada",
        });
        router.replace("/feeding");
        return;
      }
      const { message, fieldErrors } = result.error;
      if (!applyFieldErrors(form.setError, FEEDING_FIELD_NAMES, fieldErrors)) {
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
        <FeedingFields timeZone={timeZone} />
        <FormFooter>
          <SubmitButton isPending={isPending} pendingLabel="Guardando…">
            Guardar toma
          </SubmitButton>
        </FormFooter>
      </form>
    </FormProvider>
  );
}
