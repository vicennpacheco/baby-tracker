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
  createSleepSession,
  deleteSleepSession,
} from "@/features/sleep/actions";
import {
  SLEEP_FIELD_NAMES,
  SleepFields,
} from "@/features/sleep/components/sleep-fields";
import {
  type CreateSleepSessionInput,
  sleepSessionSchemas,
} from "@/features/sleep/schemas";
import { callAction } from "@/lib/call-action";
import { applyFieldErrors } from "@/lib/forms";

type NewSleepFormProps = {
  babyId: string;
  timeZone: string;
  /** Household wall-clock times from the server. */
  defaults: { startedAt: string; endedAt: string };
};

/** A finished siesta logged late, with when it began and ended. */
export function NewSleepForm({
  babyId,
  timeZone,
  defaults,
}: NewSleepFormProps): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // One id per form: a retry or a double tap re-sends the same siesta.
  const [id] = useState(() => crypto.randomUUID());
  const schema = useMemo(
    () => sleepSessionSchemas(timeZone).createSleepSessionSchema,
    [timeZone],
  );
  // raw: the server converts the local times once (decision 049).
  const form = useForm<CreateSleepSessionInput>({
    resolver: zodResolver(schema, undefined, { raw: true }),
    defaultValues: { id, babyId, ...defaults, notes: "" },
  });

  function onSubmit(values: CreateSleepSessionInput): void {
    startTransition(async () => {
      const result = await callAction(() => createSleepSession(values));
      if (result.ok) {
        offerUndo({
          message: "Siesta guardada",
          undo: () => deleteSleepSession({ id }),
          undoneMessage: "Siesta borrada",
        });
        router.replace("/sleep");
        return;
      }
      const { message, fieldErrors } = result.error;
      if (!applyFieldErrors(form.setError, SLEEP_FIELD_NAMES, fieldErrors)) {
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
        <SleepFields timeZone={timeZone} />
        <FormFooter>
          <SubmitButton isPending={isPending} pendingLabel="Guardando…">
            Guardar siesta
          </SubmitButton>
        </FormFooter>
      </form>
    </FormProvider>
  );
}
