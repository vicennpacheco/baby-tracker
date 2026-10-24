"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useTransition, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { requestEmailOtp, verifyEmailOtp } from "@/features/auth/actions";
import {
  OTP_LENGTH,
  verifyEmailOtpSchema,
  type VerifyEmailOtpInput,
} from "@/features/auth/schemas";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { callAction } from "@/lib/call-action";
import { applyFieldErrors } from "@/lib/forms";

type CodeStepProps = {
  email: string;
  onChangeEmail: () => void;
};

const SLOT_INDEXES = Array.from({ length: OTP_LENGTH }, (_, index) => index);

export function CodeStep({ email, onChangeEmail }: CodeStepProps): ReactNode {
  const [isVerifying, startVerify] = useTransition();
  const [isResending, startResend] = useTransition();
  const form = useForm({
    resolver: zodResolver(verifyEmailOtpSchema),
    defaultValues: { email, token: "" },
  });

  function onSubmit(values: VerifyEmailOtpInput): void {
    startVerify(async () => {
      // On success the action redirects, so only failures come back.
      const result = await callAction(() => verifyEmailOtp(values));
      if (result.ok) return;
      const { message, fieldErrors } = result.error;
      if (!applyFieldErrors(form.setError, ["token"], fieldErrors)) {
        toast.error(message);
      }
    });
  }

  function resendCode(): void {
    startResend(async () => {
      const result = await callAction(() => requestEmailOtp({ email }));
      if (result.ok) toast.success("Código enviado. Revisa tu email.");
      else toast.error(result.error.message);
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-1 flex-col gap-6"
      noValidate
    >
      <p className="text-muted-foreground">
        Te lo hemos enviado a{" "}
        <span className="font-medium text-foreground">{email}</span>. Puede
        tardar un minuto en llegar.
      </p>
      <Controller
        name="token"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="login-code">
              Código de {OTP_LENGTH} dígitos
            </FieldLabel>
            {/* Slots share the full width: 8 fixed 48 px slots would overflow
                a 375 px screen. The tap target is the whole row. */}
            <InputOTP
              id="login-code"
              maxLength={OTP_LENGTH}
              pattern={REGEXP_ONLY_DIGITS}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              onComplete={() => void form.handleSubmit(onSubmit)()}
              aria-invalid={fieldState.invalid}
              containerClassName="w-full"
            >
              <InputOTPGroup className="w-full">
                {SLOT_INDEXES.map((index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="h-12 min-w-0 flex-1 text-xl tabular-nums"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="mt-auto flex flex-col gap-3">
        <Button
          type="submit"
          size="lg"
          disabled={isVerifying}
          className="h-14 w-full text-base"
        >
          {isVerifying ? "Comprobando…" : "Entrar"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={isResending}
          onClick={resendCode}
          className="h-12 w-full text-base"
        >
          {isResending ? "Enviando…" : "Enviarme otro código"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={onChangeEmail}
          className="h-12 w-full text-base"
        >
          Usar otro email
        </Button>
      </div>
    </form>
  );
}
