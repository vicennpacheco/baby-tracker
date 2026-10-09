"use client";

import type { ReactNode } from "react";

import { ChoiceGrid } from "@/components/shared/choice-grid";
import { BABY_SEX_OPTIONS } from "@/features/household/labels";
import type { BabySex } from "@/generated/prisma/enums";

type BabySexFieldProps = {
  name: string;
  /** Undefined until chosen, or when "Prefiero no decirlo". */
  value: BabySex | undefined;
  onChange: (value: BabySex | undefined) => void;
  error?: string;
};

/** The optional sex of the baby as three large choices (decision 069). */
export function BabySexField({
  name,
  value,
  onChange,
  error,
}: BabySexFieldProps): ReactNode {
  return (
    <ChoiceGrid
      legend="Sexo (opcional)"
      name={name}
      columns={3}
      value={value ?? ""}
      onChange={(choice) => onChange(choice === "" ? undefined : choice)}
      error={error}
      options={BABY_SEX_OPTIONS}
    />
  );
}
