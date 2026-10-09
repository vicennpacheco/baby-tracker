"use client";

import type { ReactNode } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { TextField } from "@/components/shared/text-field";
import { BabySexField } from "@/features/household/components/baby-sex-field";
import type { CreateHouseholdInput } from "@/features/household/schemas";

/** Step 2 of creating the family: the baby (FormProvider). */
export function BabyStepFields({
  maxBirthDate,
}: {
  /** Today in the household time zone, computed on the server. */
  maxBirthDate: string;
}): ReactNode {
  const { control } = useFormContext<CreateHouseholdInput>();

  return (
    <>
      <Controller
        name="babyName"
        control={control}
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
        control={control}
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
        control={control}
        render={({ field, fieldState }) => (
          <BabySexField
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
    </>
  );
}
