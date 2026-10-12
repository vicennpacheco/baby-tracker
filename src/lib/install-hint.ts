const DISMISSED_KEY = "install-hint-dismissed";

/**
 * iPhone, iPod or iPad, where installing is a manual step (Compartir ›
 * Añadir a pantalla de inicio) with no prompt of its own. iPadOS reports
 * itself as a Mac: only its touch screen tells them apart.
 */
export function isAppleMobileDevice(
  userAgent: string,
  maxTouchPoints: number,
): boolean {
  return (
    /iPhone|iPad|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
  );
}

// Reading or writing localStorage throws when the browser blocks storage;
// then the hint is offered again, and hiding it lasts for this visit only.

export function isInstallHintDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Whether the dismissal was stored and will survive this visit. */
export function rememberInstallHintDismissal(): boolean {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
    return true;
  } catch {
    return false;
  }
}
