"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { offerUndo } from "@/components/shared/offer-undo";
import { StickyActionBar } from "@/components/shared/sticky-action-bar";
import {
  deleteFeeding,
  startFeeding,
  stopFeeding,
  switchFeedingSide,
} from "@/features/feeding/actions";
import {
  type RunningFeeding,
  RunningFeedingCard,
} from "@/features/feeding/components/running-feeding-card";
import { StartFeedingButtons } from "@/features/feeding/components/start-feeding-buttons";
import { FEEDING_TYPE_LABELS } from "@/features/feeding/labels";
import { type BreastSide, getOppositeBreast } from "@/features/feeding/service";
import type { ActionError } from "@/lib/action-result";
import { callAction } from "@/lib/call-action";
import { formatDuration } from "@/lib/dates";
import { useOnlineStatus } from "@/lib/use-online-status";
import { useSingleFlight } from "@/lib/use-single-flight";

type BreastTimerBarProps = {
  babyId: string;
  /** ISO "now" of the server render, for the timer's clock skew. */
  serverNow: string;
  suggestedSide: BreastSide;
  running: RunningFeeding | null;
};

/**
 * The feeding screen's sticky bar (thumb zone, CLAUDE.md §4.2): start a
 * breast or log a bottle, or, while a feeding runs, its timer with "Cambiar
 * de pecho" and "Parar". Start, stop and switch share one single-flight
 * gate, so a double tap never sends two of them. The database decides the
 * races between both parents (decision 051): this only reports them.
 */
export function BreastTimerBar({
  babyId,
  serverNow,
  suggestedSide,
  running,
}: BreastTimerBarProps): ReactNode {
  const router = useRouter();
  const { isBusy, run } = useSingleFlight();
  const isOnline = useOnlineStatus();
  const isDisabled = isBusy || !isOnline;

  // The other parent may have started, stopped or deleted it meanwhile: show
  // why, then the current state. Not after an unexpected failure: offline, a
  // failed refresh makes Next.js fall back to a full page load, i.e. the
  // service worker's offline page. RealtimeSync refreshes once back online.
  function reportAndRefresh(error: ActionError): void {
    toast.error(error.message);
    if (error.code !== "UNEXPECTED") router.refresh();
  }

  function start(side: BreastSide): void {
    const id = crypto.randomUUID();
    run(async () => {
      const result = await callAction(() =>
        startFeeding({ id, babyId, type: side }),
      );
      if (!result.ok) return reportAndRefresh(result.error);
      offerUndo({
        message: `${FEEDING_TYPE_LABELS[side]} en marcha`,
        undo: () => deleteFeeding({ id }),
        undoneMessage: "Toma borrada",
      });
    });
  }

  function stop(feeding: RunningFeeding): void {
    run(async () => {
      const result = await callAction(() => stopFeeding({ id: feeding.id }));
      if (!result.ok) return reportAndRefresh(result.error);
      const { startedAt, endedAt, wasAlreadyStopped } = result.data;
      if (wasAlreadyStopped || !endedAt) {
        toast.info("La toma ya estaba parada.");
        return;
      }
      toast.success(
        `Toma guardada · ${formatDuration(Date.parse(endedAt) - Date.parse(startedAt))}`,
      );
    });
  }

  function switchSide(feeding: RunningFeeding): void {
    // A new id per tap: the server stops this feeding and starts the other
    // breast in one transaction, or does neither.
    const id = crypto.randomUUID();
    run(async () => {
      const result = await callAction(() =>
        switchFeedingSide({ activeId: feeding.id, id }),
      );
      if (!result.ok) return reportAndRefresh(result.error);
      toast.success(
        `Cambiado a ${FEEDING_TYPE_LABELS[getOppositeBreast(feeding.type)].toLowerCase()}`,
      );
    });
  }

  return (
    <StickyActionBar
      areControlsEnabled={!isDisabled}
      swapKey={running?.id ?? null}
    >
      {running ? (
        <RunningFeedingCard
          feeding={running}
          serverNow={serverNow}
          isDisabled={isDisabled}
          onSwitch={() => switchSide(running)}
          onStop={() => stop(running)}
        />
      ) : (
        <StartFeedingButtons
          suggestedSide={suggestedSide}
          isDisabled={isDisabled}
          onStart={start}
        />
      )}
    </StickyActionBar>
  );
}
