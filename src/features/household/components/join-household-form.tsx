"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormFooter } from "@/components/shared/form-footer";
import { SubmitButton } from "@/components/shared/submit-button";
import { TextField } from "@/components/shared/text-field";
import { joinHousehold } from "@/features/household/actions";
import {
  joinHouseholdSchema,
  type JoinHouseholdInput,
} from "@/features/household/schemas";
import { callAction } from "@/lib/call-action";
import { applyFieldErrors } from "@/lib/forms";

const FIELDS = ["code", "displayName"] as const;

export function JoinHouseholdForm(): ReactNode {
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    resolver: zodResolver(joinHouseholdSchema),
    defaultValues: { code: "", displayName: "" },
  });

  function onSubmit(values: JoinHouseholdInput): void {
    startTransition(async () => {
      // On success the action redirects home, so only failures come back.
      const result = await callAction(() => joinHousehold(values));
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
        name="code"
        control={form.control}
        render={({ field, fieldState }) => (
          // A plain input, not InputOTP: ten slots do not fit 375 px, and the
          // usual path is pasting it from a chat. Case, spaces, hyphens and
          // O/I/L are normalized by the schema.
          <TextField
            {...field}
            label="Código de invitación"
            description="10 letras y números, como ABCDE-FGHJK. Caduca a las 24 horas."
            error={fieldState.error?.message}
            placeholder="ABCDE-FGHJK"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            maxLength={20}
            autoFocus
            className="font-mono text-xl tracking-widest uppercase"
          />
        )}
      />
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
            enterKeyHint="go"
          />
        )}
      />
      <FormFooter>
        <SubmitButton isPending={isPending} pendingLabel="Comprobando…">
          Unirme a la familia
        </SubmitButton>
      </FormFooter>
    </form>
  );
}
