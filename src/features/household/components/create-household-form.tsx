"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormFooter } from "@/components/shared/form-footer";
import { SubmitButton } from "@/components/shared/submit-button";
import { TextField } from "@/components/shared/text-field";
import { createHousehold } from "@/features/household/actions";
import { BabySexField } from "@/features/household/components/baby-sex-field";
import {
  createHouseholdSchema,
  type CreateHouseholdInput,
} from "@/features/household/schemas";
import { applyFieldErrors } from "@/lib/forms";

const FIELDS = ["displayName", "babyName", "babyBirthDate", "babySex"] as const;

type CreateHouseholdFormProps = {
  /** Today in the household time zone ("2026-10-08"), computed on the server. */
  maxBirthDate: string;
};

export function CreateHouseholdForm({
  maxBirthDate,
}: CreateHouseholdFormProps): ReactNode {
  const [isPending, startTransition] = useTransition();
  // Generated once per form: a retry or a double tap sends the same ids, so
  // createHousehold stays idempotent (CLAUDE.md §2.3).
  const [ids] = useState(() => ({
    householdId: crypto.randomUUID(),
    babyId: crypto.randomUUID(),
  }));
  const form = useForm({
    resolver: zodResolver(createHouseholdSchema),
    defaultValues: {
      ...ids,
      displayName: "",
      babyName: "",
      babyBirthDate: "",
    },
  });

  function onSubmit(values: CreateHouseholdInput): void {
    startTransition(async () => {
      // On success the action redirects home, so only failures come back.
      const result = await createHousehold(values);
      if (result.ok) return;
      const { message, fieldErrors } = result.error;
      if (!applyFieldErrors(form.setError, FIELDS, fieldErrors)) {
        toast.error(message);
      }
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-1 flex-col gap-6"
      noValidate
    >
      <Controller
        name="displayName"
        control={form.control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Tu nombre"
            description="Así sabrá el otro progenitor quién registró cada cosa."
            error={fieldState.error?.message}
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="next"
          />
        )}
      />
      <Controller
        name="babyName"
        control={form.control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Nombre del bebé"
            error={fieldState.error?.message}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="next"
          />
        )}
      />
      <Controller
        name="babyBirthDate"
        control={form.control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            type="date"
            max={maxBirthDate}
            label="Fecha de nacimiento"
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        name="babySex"
        control={form.control}
        render={({ field, fieldState }) => (
          <BabySexField
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <FormFooter>
        <SubmitButton isPending={isPending} pendingLabel="Creando…">
          Crear familia
        </SubmitButton>
      </FormFooter>
    </form>
  );
}
