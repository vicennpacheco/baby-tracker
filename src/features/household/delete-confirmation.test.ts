import { describe, expect, it } from "vitest";

import { matchesBabyName } from "@/features/household/delete-confirmation";

describe("matchesBabyName", () => {
  it.each([
    ["Lucía", "Lucía"],
    ["  lucía ", "Lucía"],
    ["LUCÍA", "Lucía"],
    ["Ana  María", "Ana María"],
  ])("accepts %j for %j", (typed, name) => {
    expect(matchesBabyName(typed, name)).toBe(true);
  });

  it.each([
    ["Lucia", "Lucía"],
    ["Luc", "Lucía"],
    ["", "Lucía"],
    ["   ", "Lucía"],
  ])("refuses %j for %j", (typed, name) => {
    expect(matchesBabyName(typed, name)).toBe(false);
  });
});
