"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { requestEmailOtp } from "@/features/auth/actions";
import {
  requestEmailOtpSchema,
  type RequestEmailOtpInput,
} from "@/features/auth/schemas";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { callAction } from "@/lib/call-action";
import { applyFieldErrors } from "@/lib/forms";

type EmailStepProps = {
  defaultEmail: string;
  onCodeSent: (email: string) => void;
};

export function EmailStep({
  defaultEmail,
  onCodeSent,
}: EmailStepProps): ReactNode {
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    resolver: zodResolver(requestEmailOtpSchema),
    defaultValues: { email: defaultEmail },
  });

  function onSubmit(values: RequestEmailOtpInput): void {
    startTransition(async () => {
      const result = await callAction(() => requestEmailOtp(values));
      if (result.ok) {
        onCodeSent(values.email);
        return;
      }
      const { code, message, fieldErrors } = result.error;
      // Rate limited means a code was sent moments ago: let them type it.
      if (code === "CONFLICT") {
        toast.info(message);
        onCodeSent(values.email);
        return;
      }
      if (!applyFieldErrors(form.setError, ["email"], fieldErrors)) {
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
        name="email"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="login-email">Email</FieldLabel>
            <Input
              {...field}
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              placeholder="tu@email.com"
              aria-invalid={fieldState.invalid}
              className="h-12 text-base"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Button
        type="submit"
        size="lg"
        disabled={isPending}
        className="mt-auto h-14 w-full text-base"
      >
        {isPending ? "Enviando…" : "Enviarme el código"}
      </Button>
    </form>
  );
}
