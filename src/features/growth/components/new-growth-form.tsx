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
  createGrowthMeasurement,
  deleteGrowthMeasurement,
} from "@/features/growth/actions";
import {
  GROWTH_FIELD_NAMES,
  GrowthFields,
} from "@/features/growth/components/growth-fields";
import {
  type CreateGrowthMeasurementInput,
  growthMeasurementSchemas,
} from "@/features/growth/schemas";
import { callAction } from "@/lib/call-action";
import { applyFieldErrors } from "@/lib/forms";

type NewGrowthFormProps = {
  babyId: string;
  timeZone: string;
  /** Household wall-clock "now" from the server. */
  measuredAt: string;
};

/** Weight, length and head circumference of a check-up, in kg and cm. */
export function NewGrowthForm({
  babyId,
  timeZone,
  measuredAt,
}: NewGrowthFormProps): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // One id per form: a retry or a double tap re-sends the same measurement.
  const [id] = useState(() => crypto.randomUUID());
  const schema = useMemo(
    () => growthMeasurementSchemas(timeZone).createGrowthMeasurementSchema,
    [timeZone],
  );
  // raw: the server converts time and units once (decisions 049, 052).
  const form = useForm<CreateGrowthMeasurementInput>({
    resolver: zodResolver(schema, undefined, { raw: true }),
    defaultValues: { id, babyId, measuredAt },
  });

  function onSubmit(values: CreateGrowthMeasurementInput): void {
    startTransition(async () => {
      const result = await callAction(() => createGrowthMeasurement(values));
      if (result.ok) {
        offerUndo({
          message: "Medida guardada",
          undo: () => deleteGrowthMeasurement({ id }),
          undoneMessage: "Medida borrada",
        });
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
            Guardar medida
          </SubmitButton>
        </FormFooter>
      </form>
    </FormProvider>
  );
}
