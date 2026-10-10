"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormFooter } from "@/components/shared/form-footer";
import { SubmitButton } from "@/components/shared/submit-button";
import { updateBaby } from "@/features/household/actions";
import { BabyFields } from "@/features/household/components/baby-fields";
import {
  updateBabySchema,
  type UpdateBabyInput,
} from "@/features/household/schemas";
import { applyFieldErrors } from "@/lib/forms";

const FIELDS = ["babyName", "babyBirthDate", "babySex"] as const;

type EditBabyFormProps = {
  defaultValues: UpdateBabyInput;
  /** Today in the household time zone, computed on the server. */
  maxBirthDate: string;
};

/** The baby's name, birth date and sex, editable by either parent. */
export function EditBabyForm({
  defaultValues,
  maxBirthDate,
}: EditBabyFormProps): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<UpdateBabyInput>({
    resolver: zodResolver(updateBabySchema),
    defaultValues,
  });

  function onSubmit(values: UpdateBabyInput): void {
    startTransition(async () => {
      const result = await updateBaby(values);
      if (result.ok) {
        toast.success("Cambios guardados");
        router.replace("/settings");
        return;
      }
      const { message, fieldErrors } = result.error;
      if (!applyFieldErrors(form.setError, FIELDS, fieldErrors)) {
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
        <BabyFields maxBirthDate={maxBirthDate} />
        <FormFooter>
          <SubmitButton isPending={isPending} pendingLabel="Guardando…">
            Guardar cambios
          </SubmitButton>
        </FormFooter>
      </form>
    </FormProvider>
  );
}
