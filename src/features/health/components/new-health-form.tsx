"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FormFooter } from "@/components/shared/form-footer";
import { offerUndo } from "@/components/shared/offer-undo";
import { SubmitButton } from "@/components/shared/submit-button";
import {
  createHealthRecord,
  deleteHealthRecord,
} from "@/features/health/actions";
import {
  HEALTH_FIELD_NAMES,
  HealthFields,
} from "@/features/health/components/health-fields";
import {
  type RecentMedicationOption,
  RecentMedications,
} from "@/features/health/components/recent-medications";
import {
  type CreateHealthRecordInput,
  healthRecordSchemas,
} from "@/features/health/schemas";
import type { HealthRecordKind } from "@/generated/prisma/enums";
import { callAction } from "@/lib/call-action";
import { applyFieldErrors } from "@/lib/forms";

type NewHealthFormProps = {
  babyId: string;
  timeZone: string;
  /** From the "Vacuna" / "Medicamento" link; none means the parent picks. */
  kind: HealthRecordKind | undefined;
  /** Household wall-clock "now" from the server. */
  administeredAt: string;
  recentMedications: readonly RecentMedicationOption[];
};

const SAVE_LABELS: Readonly<Record<HealthRecordKind, string>> = {
  VACCINE: "Guardar vacuna",
  MEDICATION: "Guardar medicamento",
};

/** A vaccine or a medication, with its dose and any reaction. */
export function NewHealthForm({
  babyId,
  timeZone,
  kind,
  administeredAt,
  recentMedications,
}: NewHealthFormProps): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // One id per form: a retry or a double tap re-sends the same record.
  const [id] = useState(() => crypto.randomUUID());
  const schema = useMemo(
    () => healthRecordSchemas(timeZone).createHealthRecordSchema,
    [timeZone],
  );
  // raw: the server converts the time and the dose once (decision 049).
  const form = useForm<CreateHealthRecordInput>({
    resolver: zodResolver(schema, undefined, { raw: true }),
    defaultValues: {
      id,
      babyId,
      kind,
      name: "",
      administeredAt,
      reaction: "",
      notes: "",
    },
  });
  const chosenKind = useWatch({ control: form.control, name: "kind" });

  function onSubmit(values: CreateHealthRecordInput): void {
    startTransition(async () => {
      const result = await callAction(() => createHealthRecord(values));
      if (result.ok) {
        offerUndo({
          message:
            values.kind === "VACCINE"
              ? "Vacuna guardada"
              : "Medicamento guardado",
          undo: () => deleteHealthRecord({ id }),
          undoneMessage: "Registro borrado",
        });
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
        <HealthFields timeZone={timeZone}>
          <RecentMedications medications={recentMedications} />
        </HealthFields>
        <FormFooter>
          <SubmitButton isPending={isPending} pendingLabel="Guardando…">
            {chosenKind ? SAVE_LABELS[chosenKind] : "Guardar"}
          </SubmitButton>
        </FormFooter>
      </form>
    </FormProvider>
  );
}
