"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useTransition, type ReactNode } from "react";
import { type DefaultValues, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormFooter } from "@/components/shared/form-footer";
import { SubmitButton } from "@/components/shared/submit-button";
import { updateGrowthMeasurement } from "@/features/growth/actions";
import {
  GROWTH_FIELD_NAMES,
  GrowthFields,
} from "@/features/growth/components/growth-fields";
import {
  growthMeasurementSchemas,
  type UpdateGrowthMeasurementInput,
} from "@/features/growth/schemas";
import { callAction } from "@/lib/call-action";
import { applyFieldErrors } from "@/lib/forms";

type EditGrowthFormProps = {
  timeZone: string;
  /** Partial on purpose: a missing measure stays empty. */
  defaultValues: DefaultValues<UpdateGrowthMeasurementInput>;
  /** Secondary actions in the footer, e.g. delete. */
  children?: ReactNode;
};

export function EditGrowthForm({
  timeZone,
  defaultValues,
  children,
}: EditGrowthFormProps): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const schema = useMemo(
    () => growthMeasurementSchemas(timeZone).updateGrowthMeasurementSchema,
    [timeZone],
  );
  const form = useForm<UpdateGrowthMeasurementInput>({
    resolver: zodResolver(schema, undefined, { raw: true }),
    defaultValues,
  });

  function onSubmit(values: UpdateGrowthMeasurementInput): void {
    startTransition(async () => {
      const result = await callAction(() => updateGrowthMeasurement(values));
      if (result.ok) {
        toast.success("Cambios guardados");
        router.replace("/growth");
        return;
      }
      const { message, fieldErrors } = result.error;
      if (!applyFieldErrors(form.setError, GROWTH_FIELD_NAMES, fieldErrors)) {
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
        <GrowthFields timeZone={timeZone} />
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
