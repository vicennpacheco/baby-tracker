import { z } from "zod";

import { normalizeInviteCode } from "@/features/household/invite-code";
import type { BabySex } from "@/generated/prisma/enums";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BABY_AGE_DAYS = 3 * 365;
const BABY_SEXES = ["FEMALE", "MALE"] as const satisfies readonly BabySex[];

const displayName = z
  .string()
  .trim()
  .min(1, { error: "Escribe cómo quieres que te llamemos." })
  .max(40, { error: "Usa 40 caracteres como máximo." });

/**
 * Timezone-agnostic plausibility, because the schema also runs in the
 * browser: not after tomorrow in any zone and not older than three years.
 */
const birthDate = z.iso
  .date({ error: "Indica la fecha de nacimiento." })
  .refine((value) => Date.parse(value) <= Date.now() + DAY_MS, {
    error: "La fecha de nacimiento no puede ser futura.",
  })
  .refine(
    (value) => Date.parse(value) >= Date.now() - MAX_BABY_AGE_DAYS * DAY_MS,
    { error: "Revisa la fecha: parece demasiado antigua." },
  );

/** The baby's data, the same rules when created and when edited. */
const babyFields = {
  babyName: z
    .string()
    .trim()
    .min(1, { error: "Escribe el nombre del bebé." })
    .max(40, { error: "Usa 40 caracteres como máximo." }),
  babyBirthDate: birthDate,
  // Optional: "Prefiero no decirlo" is undefined, stored as null (069).
  babySex: z.enum(BABY_SEXES).optional(),
};

export const createHouseholdSchema = z.object({
  householdId: z.uuid(),
  babyId: z.uuid(),
  displayName,
  ...babyFields,
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;

/** Settings: either member edits the baby; the last save wins (§2.6). */
export const updateBabySchema = z.object({
  babyId: z.uuid(),
  ...babyFields,
});

export type UpdateBabyInput = z.infer<typeof updateBabySchema>;

export const joinHouseholdSchema = z.object({
  displayName,
  code: z.string().transform((raw, ctx) => {
    const code = normalizeInviteCode(raw);
    if (!code) {
      ctx.addIssue({
        code: "custom",
        message: "El código tiene 10 letras y números, como ABCDE-FGHJK.",
      });
      return z.NEVER;
    }
    return code;
  }),
});

export type JoinHouseholdInput = z.infer<typeof joinHouseholdSchema>;

/** Settings: the OWNER removes the other parent (or a stranger). */
export const removeHouseholdMemberSchema = z.object({
  userId: z.uuid({ error: "Ese miembro no existe." }),
});

/** Settings: the OWNER types the baby's name to delete the family. */
export const deleteHouseholdSchema = z.object({
  babyName: z
    .string({ error: "Escribe el nombre del bebé para confirmar." })
    .max(80, { error: "Escribe el nombre del bebé para confirmar." }),
});
