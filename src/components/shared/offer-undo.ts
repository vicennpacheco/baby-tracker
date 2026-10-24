import { toast } from "sonner";

import type { ActionResult } from "@/lib/action-result";
import { callAction } from "@/lib/call-action";

const UNDO_DURATION_MS = 6000;

type OfferUndoOptions = {
  /** "Pañal mojado guardado". */
  message: string;
  /** Deletes the record just created, for both parents. */
  undo: () => Promise<ActionResult>;
  /** "Pañal borrado". */
  undoneMessage: string;
};

/** Success toast with "Deshacer" after logging a record (CLAUDE.md §4.3). */
export function offerUndo({
  message,
  undo,
  undoneMessage,
}: OfferUndoOptions): void {
  toast.success(message, {
    duration: UNDO_DURATION_MS,
    action: {
      label: "Deshacer",
      onClick: () => {
        void callAction(undo).then((result) => {
          if (result.ok) {
            toast.success(undoneMessage);
          } else {
            toast.error(
              "No hemos podido deshacerlo. Bórralo desde el historial.",
            );
          }
        });
      },
    },
  });
}
