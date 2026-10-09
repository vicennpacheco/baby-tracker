import { describe, expect, it } from "vitest";

import { BABY_SEX_LABELS, BABY_SEX_OPTIONS } from "@/features/household/labels";
import { BabySex } from "@/generated/prisma/enums";

describe("baby sex labels", () => {
  it("names every sex stored in the database", () => {
    for (const sex of Object.values(BabySex)) {
      expect(BABY_SEX_LABELS[sex]).toBeTruthy();
    }
  });

  it("offers both, plus not saying, which stores nothing", () => {
    expect(BABY_SEX_OPTIONS).toEqual([
      { value: "FEMALE", label: "Niña" },
      { value: "MALE", label: "Niño" },
      { value: "", label: "Prefiero no decirlo" },
    ]);
  });
});
