import { redirect } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { actionError, ok } from "@/lib/action-result";
import { callAction, OFFLINE_MESSAGE, toCallFailure } from "@/lib/call-action";

// What the browser's fetch throws when the connection drops mid-request.
const fetchFailure = (): TypeError => new TypeError("Failed to fetch");

describe("toCallFailure", () => {
  it("blames the connection when fetch itself failed", () => {
    expect(toCallFailure(fetchFailure(), true)).toEqual(
      actionError("UNEXPECTED", "No hay conexión. Inténtalo de nuevo."),
    );
  });

  it("blames the connection whatever the error while offline", () => {
    expect(toCallFailure(new Error("boom"), false)).toEqual(
      actionError("UNEXPECTED", OFFLINE_MESSAGE),
    );
  });

  it("gives the generic message for any other failure while online", () => {
    expect(toCallFailure(new Error("boom"), true)).toEqual(
      actionError("UNEXPECTED", "Algo ha fallado. Inténtalo de nuevo."),
    );
  });
});

describe("callAction", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("passes any result through untouched, expected errors included", async () => {
    const conflict = actionError("CONFLICT", "Ya hay una toma en curso.");

    await expect(callAction(async () => ok({ id: "a" }))).resolves.toEqual(
      ok({ id: "a" }),
    );
    await expect(callAction(async () => conflict)).resolves.toBe(conflict);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("turns a dropped connection into a result and logs it", async () => {
    const failure = fetchFailure();

    const result = await callAction(() => Promise.reject(failure));

    expect(result).toEqual(actionError("UNEXPECTED", OFFLINE_MESSAGE));
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), failure);
  });

  it("reads the connection state from the browser", async () => {
    vi.stubGlobal("navigator", { onLine: false });

    const result = await callAction(() => Promise.reject(new Error("boom")));

    expect(result).toEqual(actionError("UNEXPECTED", OFFLINE_MESSAGE));
  });

  it("rethrows a server redirect so Next.js can navigate", async () => {
    // redirect() on the server rejects the client's call with NEXT_REDIRECT.
    await expect(callAction(async () => redirect("/login"))).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(consoleError).not.toHaveBeenCalled();
  });
});
