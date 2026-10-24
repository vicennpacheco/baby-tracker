"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useTransition, type ReactNode } from "react";
import { type DefaultValues, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormFooter } from "@/components/shared/form-footer";
import { SubmitButton } from "@/components/shared/submit-button";
import { updateHealthRecord } from "@/features/health/actions";
import {
  HEALTH_FIELD_NAMES,
  HealthFields,
} from "@/features/health/components/health-fields";
import {
  healthRecordSchemas,
  type UpdateHealthRecordInput,
} from "@/features/health/schemas";
import { callAction } from "@/lib/call-action";
import { applyFieldErrors } from "@/lib/forms";

type EditHealthFormProps = {
  timeZone: string;
  /** Partial on purpose: a missing value is for the parent to choose. */
  defaultValues: DefaultValues<UpdateHealthRecordInput>;
  /** Secondary actions in the footer, e.g. delete. */
  children?: ReactNode;
};

/** A vaccine or a medication; the kind may change. */
export function EditHealthForm({
  timeZone,
  defaultValues,
  children,
}: EditHealthFormProps): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const schema = useMemo(
    () => healthRecordSchemas(timeZone).updateHealthRecordSchema,
    [timeZone],
  );
  const form = useForm<UpdateHealthRecordInput>({
    resolver: zodResolver(schema, undefined, { raw: true }),
    defaultValues,
  });

  function onSubmit(values: UpdateHealthRecordInput): void {
    startTransition(async () => {
      const result = await callAction(() => updateHealthRecord(values));
      if (result.ok) {
        toast.success("Cambios guardados");
        router.replace("/health");
        return;
      }
      const { message, fieldErrors } = result.error;
      if (!applyFieldErrors(form.setError, HEALTH_FIELD_NAMES, fieldErrors)) {
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
        <HealthFields timeZone={timeZone} />
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
