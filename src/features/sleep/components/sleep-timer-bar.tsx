"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { offerUndo } from "@/components/shared/offer-undo";
import { StickyActionBar } from "@/components/shared/sticky-action-bar";
import {
  deleteSleepSession,
  startSleepSession,
  stopSleepSession,
} from "@/features/sleep/actions";
import {
  type RunningSleep,
  RunningSleepCard,
} from "@/features/sleep/components/running-sleep-card";
import { StartSleepButtons } from "@/features/sleep/components/start-sleep-buttons";
import type { ActionError } from "@/lib/action-result";
import { callAction } from "@/lib/call-action";
import { formatDuration, formatTime } from "@/lib/dates";
import { useOnlineStatus } from "@/lib/use-online-status";
import { useSingleFlight } from "@/lib/use-single-flight";

type SleepTimerBarProps = {
  babyId: string;
  /** ISO "now" of the server render, for the timer's clock skew. */
  serverNow: string;
  timeZone: string;
  running: RunningSleep | null;
};

/**
 * The sleep screen's sticky bar: start a siesta (now or a few minutes back)
 * or, while one runs, its timer with "Parar". Start and stop share one
 * single-flight gate. The database decides the races between both parents
 * (decision 051): this only reports them.
 */
export function SleepTimerBar({
  babyId,
  serverNow,
  timeZone,
  running,
}: SleepTimerBarProps): ReactNode {
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

  function start(minutesAgo?: number): void {
    const id = crypto.randomUUID();
    run(async () => {
      const result = await callAction(() =>
        startSleepSession({ id, babyId, minutesAgo }),
      );
      if (!result.ok) return reportAndRefresh(result.error);
      // The server may have moved a late start to the end of the previous
      // sleep: tell the time it actually stored.
      const since = formatTime(new Date(result.data.startedAt), timeZone);
      offerUndo({
        message:
          minutesAgo === undefined
            ? "Siesta en marcha"
            : `Siesta en marcha desde las ${since}`,
        undo: () => deleteSleepSession({ id }),
        undoneMessage: "Siesta borrada",
      });
    });
  }

  function stop(sleep: RunningSleep): void {
    run(async () => {
      const result = await callAction(() => stopSleepSession({ id: sleep.id }));
      if (!result.ok) return reportAndRefresh(result.error);
      const { startedAt, endedAt, wasAlreadyStopped } = result.data;
      if (wasAlreadyStopped || !endedAt) {
        toast.info("La siesta ya estaba parada.");
        return;
      }
      toast.success(
        `Siesta guardada · ${formatDuration(Date.parse(endedAt) - Date.parse(startedAt))}`,
      );
    });
  }

  return (
    <StickyActionBar
      areControlsEnabled={!isDisabled}
      swapKey={running?.id ?? null}
    >
      {running ? (
        <RunningSleepCard
          sleep={running}
          serverNow={serverNow}
          timeZone={timeZone}
          isDisabled={isDisabled}
          onStop={() => stop(running)}
        />
      ) : (
        <StartSleepButtons isDisabled={isDisabled} onStart={start} />
      )}
    </StickyActionBar>
  );
}
