import type { BabySex } from "@/generated/prisma/enums";

// Spanish UI texts of the household module. Isomorphic and exhaustive: a new
// enum value fails to compile until it has a label.

export const BABY_SEX_LABELS: Readonly<Record<BabySex, string>> = {
  FEMALE: "Niña",
  MALE: "Niño",
};

/**
 * The baby's sex is optional (decision 069): "Prefiero no decirlo" maps to
 * the empty value, stored as null. Asked for the WHO growth charts, which
 * are drawn by sex; the rest of the app keeps its gender-neutral copy.
 */
export const BABY_SEX_OPTIONS: readonly {
  value: BabySex | "";
  label: string;
}[] = [
  { value: "FEMALE", label: BABY_SEX_LABELS.FEMALE },
  { value: "MALE", label: BABY_SEX_LABELS.MALE },
  { value: "", label: "Prefiero no decirlo" },
];
