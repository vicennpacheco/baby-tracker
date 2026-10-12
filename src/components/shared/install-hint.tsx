"use client";

import { Share, Smartphone } from "lucide-react";
import { useState, useSyncExternalStore, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  isAppleMobileDevice,
  isInstallHintDismissed,
  rememberInstallHintDismissal,
} from "@/lib/install-hint";

const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(STANDALONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isInstalled(): boolean {
  return (
    window.matchMedia(STANDALONE_QUERY).matches ||
    // Older iOS versions only report it here.
    ("standalone" in navigator && navigator.standalone === true)
  );
}

function shouldOffer(): boolean {
  return (
    isAppleMobileDevice(navigator.userAgent, navigator.maxTouchPoints) &&
    !isInstalled() &&
    !isInstallHintDismissed()
  );
}

// The server cannot know the device: nothing until hydration.
function shouldOfferOnServer(): boolean {
  return false;
}

/**
 * On iPhone and iPad, opened in the browser: how to install the app, since
 * iOS has no install prompt of its own (decision 072). Safari and the
 * installed app do not share the session, hence the warning to sign in
 * again.
 */
export function InstallHint(): ReactNode {
  const canOffer = useSyncExternalStore(
    subscribe,
    shouldOffer,
    shouldOfferOnServer,
  );
  const [isHidden, setIsHidden] = useState(false);

  if (!canOffer || isHidden) return null;
  return (
    <section
      aria-labelledby="install-hint-title"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex gap-3">
        <Smartphone
          aria-hidden
          className="mt-0.5 size-6 shrink-0 text-muted-foreground"
        />
        <div className="flex flex-col gap-2">
          <h2 id="install-hint-title" className="font-semibold text-balance">
            Añádela a tu pantalla de inicio
          </h2>
          <ol className="flex list-decimal flex-col gap-1 pl-5">
            <li>
              Toca Compartir{" "}
              <Share aria-hidden className="inline size-5 align-text-bottom" />{" "}
              (o <span aria-hidden>⋯</span>
              <span className="sr-only">Más</span> › Compartir).
            </li>
            <li>Elige «Añadir a pantalla de inicio».</li>
          </ol>
          <p className="text-muted-foreground">
            Se abrirá a pantalla completa. La primera vez, vuelve a entrar con
            tu email.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="lg"
        className="h-12 self-end px-5 text-base"
        onClick={() => {
          rememberInstallHintDismissal();
          setIsHidden(true);
        }}
      >
        Ocultar
      </Button>
    </section>
  );
}
