import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isAppleMobileDevice,
  isInstallHintDismissed,
  rememberInstallHintDismissal,
} from "@/lib/install-hint";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";

describe("isAppleMobileDevice", () => {
  it("recognizes an iPhone", () => {
    expect(isAppleMobileDevice(IPHONE, 5)).toBe(true);
  });

  it("recognizes an iPad that reports itself as a Mac with touch", () => {
    expect(isAppleMobileDevice(IPAD_AS_MAC, 5)).toBe(true);
  });

  it("ignores a Mac without a touch screen", () => {
    expect(isAppleMobileDevice(IPAD_AS_MAC, 0)).toBe(false);
  });

  it("ignores Android, which offers its own install prompt", () => {
    expect(isAppleMobileDevice(ANDROID, 5)).toBe(false);
  });
});

describe("install hint dismissal", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is remembered once stored", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    });

    expect(isInstallHintDismissed()).toBe(false);
    expect(rememberInstallHintDismissal()).toBe(true);
    expect(isInstallHintDismissed()).toBe(true);
  });

  it("falls back to offering the hint when storage is blocked", () => {
    const blocked = (): never => {
      throw new DOMException("Storage is blocked", "SecurityError");
    };
    vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked });

    expect(isInstallHintDismissed()).toBe(false);
    expect(rememberInstallHintDismissal()).toBe(false);
  });
});
