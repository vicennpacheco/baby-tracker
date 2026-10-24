"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useTransition, type ReactNode } from "react";
import { type DefaultValues, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormFooter } from "@/components/shared/form-footer";
import { SubmitButton } from "@/components/shared/submit-button";
import { updateFeeding } from "@/features/feeding/actions";
import {
  FEEDING_FIELD_NAMES,
  FeedingFields,
} from "@/features/feeding/components/feeding-fields";
import {
  feedingSchemas,
  type UpdateFeedingInput,
} from "@/features/feeding/schemas";
import { callAction } from "@/lib/call-action";
import { applyFieldErrors } from "@/lib/forms";

type EditFeedingFormProps = {
  timeZone: string;
  /** Partial on purpose: a missing value is for the parent to choose. */
  defaultValues: DefaultValues<UpdateFeedingInput>;
  /** The history of the feeding's own day. */
  returnHref: string;
  /** Secondary actions in the footer, e.g. delete. */
  children?: ReactNode;
};

/** A bottle or a finished breast feeding; the type may change (decision 051). */
export function EditFeedingForm({
  timeZone,
  defaultValues,
  returnHref,
  children,
}: EditFeedingFormProps): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const schema = useMemo(
    () => feedingSchemas(timeZone).updateFeedingSchema,
    [timeZone],
  );
  const form = useForm<UpdateFeedingInput>({
    resolver: zodResolver(schema, undefined, { raw: true }),
    defaultValues,
  });

  function onSubmit(values: UpdateFeedingInput): void {
    startTransition(async () => {
      const result = await callAction(() => updateFeeding(values));
      if (result.ok) {
        toast.success("Cambios guardados");
        router.replace(returnHref);
        return;
      }
      const { message, fieldErrors } = result.error;
      if (!applyFieldErrors(form.setError, FEEDING_FIELD_NAMES, fieldErrors)) {
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
        <FeedingFields timeZone={timeZone} />
        <FormFooter>
          <SubmitButton isPending={isPending} pendingLabel="Guardando…">
            Guardar cambios
          </SubmitButton>
          {children}
        </FormFooter>
      </form>
    </FormProvider>
  );
}
