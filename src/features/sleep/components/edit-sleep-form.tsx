"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useTransition, type ReactNode } from "react";
import { type DefaultValues, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormFooter } from "@/components/shared/form-footer";
import { SubmitButton } from "@/components/shared/submit-button";
import { updateSleepSession } from "@/features/sleep/actions";
import {
  SLEEP_FIELD_NAMES,
  SleepFields,
} from "@/features/sleep/components/sleep-fields";
import {
  sleepSessionSchemas,
  type UpdateSleepSessionInput,
} from "@/features/sleep/schemas";
import { callAction } from "@/lib/call-action";
import { applyFieldErrors } from "@/lib/forms";

type EditSleepFormProps = {
  timeZone: string;
  /** Partial on purpose: a missing value is for the parent to choose. */
  defaultValues: DefaultValues<UpdateSleepSessionInput>;
  /** The history of the siesta's own day. */
  returnHref: string;
  /** Secondary actions in the footer, e.g. delete. */
  children?: ReactNode;
};

/** A finished siesta: a running one is only stopped (decision 051). */
export function EditSleepForm({
  timeZone,
  defaultValues,
  returnHref,
  children,
}: EditSleepFormProps): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const schema = useMemo(
    () => sleepSessionSchemas(timeZone).updateSleepSessionSchema,
    [timeZone],
  );
  const form = useForm<UpdateSleepSessionInput>({
    resolver: zodResolver(schema, undefined, { raw: true }),
    defaultValues,
  });

  function onSubmit(values: UpdateSleepSessionInput): void {
    startTransition(async () => {
      const result = await callAction(() => updateSleepSession(values));
      if (result.ok) {
        toast.success("Cambios guardados");
        router.replace(returnHref);
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
            Guardar cambios
          </SubmitButton>
          {children}
        </FormFooter>
      </form>
    </FormProvider>
  );
}
