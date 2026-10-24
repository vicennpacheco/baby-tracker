"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { FormFooter } from "@/components/shared/form-footer";
import { SubmitButton } from "@/components/shared/submit-button";
import { TextField } from "@/components/shared/text-field";
import { createHousehold } from "@/features/household/actions";
import { BabyFields } from "@/features/household/components/baby-fields";
import {
  createHouseholdSchema,
  type CreateHouseholdInput,
} from "@/features/household/schemas";
import { callAction } from "@/lib/call-action";
import { applyFieldErrors } from "@/lib/forms";

const FIELDS = ["displayName", "babyName", "babyBirthDate", "babySex"] as const;
const BASE_PATH = "/join/create";
const BABY_STEP_PATH = `${BASE_PATH}?step=baby`;

type CreateHouseholdFormProps = {
  /** Today in the household time zone ("2026-10-08"), computed on the server. */
  maxBirthDate: string;
};

/**
 * Creating the family in two steps, you then the baby, sent once at the end
 * (decision 071): the family, its OWNER and the baby are still one insert
 * (decision 044), so no household ever exists without its baby. The step
 * lives in the URL through history.pushState, which Next.js syncs with
 * useSearchParams without a server round trip: the system back button
 * returns to step 1 and the form keeps what was typed.
 */
export function CreateHouseholdForm({
  maxBirthDate,
}: CreateHouseholdFormProps): ReactNode {
  const searchParams = useSearchParams();
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
  const displayName = useWatch({ control: form.control, name: "displayName" });
  const wantsBabyStep = searchParams.get("step") === "baby";
  // Step 2 only after step 1: a reload or a shared link to it starts over.
  const step = wantsBabyStep && displayName.trim() ? "baby" : "you";
  const shownStep = useRef(step);

  useEffect(() => {
    if (wantsBabyStep && step === "you") {
      window.history.replaceState(null, "", BASE_PATH);
    }
  }, [wantsBabyStep, step]);

  useEffect(() => {
    // Keyboard and screen reader users land on the new step's first field;
    // the first load leaves focus where the browser puts it.
    if (shownStep.current === step) return;
    shownStep.current = step;
    form.setFocus(step === "baby" ? "babyName" : "displayName");
  }, [step, form]);

  function onSubmit(values: CreateHouseholdInput): void {
    startTransition(async () => {
      // On success the action redirects home, so only failures come back.
      const result = await callAction(() => createHousehold(values));
      if (result.ok) return;
      const { message, fieldErrors } = result.error;
      if (!applyFieldErrors(form.setError, FIELDS, fieldErrors)) {
        toast.error(message);
      }
      // Step 1's field is not on screen: go back to show its error.
      if (fieldErrors?.displayName) window.history.back();
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    if (step === "baby") {
      void form.handleSubmit(onSubmit)(event);
      return;
    }
    event.preventDefault();
    void form.trigger("displayName").then((isValid) => {
      if (isValid) window.history.pushState(null, "", BABY_STEP_PATH);
    });
  }

  return (
    <FormProvider {...form}>
      {/* Focus jumps to the new step's field; this says which step it is.
          Present from the first render, so loading the page announces
          nothing. */}
      <p role="status" className="sr-only">
        {step === "you" ? "Paso 1 de 2: tú." : "Paso 2 de 2: tu bebé."}
      </p>
      {step === "you" ? (
        <PageHeader
          backHref="/join"
          title="Crea tu familia"
          description="Paso 1 de 2. Después podrás invitar al otro progenitor."
        />
      ) : (
        <PageHeader
          onBack={() => window.history.back()}
          title="Tu bebé"
          description="Paso 2 de 2."
        />
      )}
      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-6"
        noValidate
      >
        {step === "you" ? (
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
        ) : (
          <BabyFields maxBirthDate={maxBirthDate} />
        )}
        <FormFooter>
          <SubmitButton isPending={isPending} pendingLabel="Creando…">
            {step === "you" ? "Continuar" : "Crear familia"}
          </SubmitButton>
        </FormFooter>
      </form>
    </FormProvider>
  );
}
