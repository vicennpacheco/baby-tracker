import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  requireBaby,
  requireMember,
  requireNoHousehold,
  requireUserId,
} from "@/features/auth/session";

// vi.mock factories are hoisted above imports; vi.hoisted shares the mocks.
const { getClaims, getMemberByUserId, getPrimaryBaby } = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getMemberByUserId: vi.fn(),
  getPrimaryBaby: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseReadOnlyServerClient: async () => ({ auth: { getClaims } }),
}));
vi.mock("@/features/auth/queries", () => ({
  getMemberByUserId,
  getPrimaryBaby,
}));

const MEMBER = {
  memberId: "m1",
  userId: "u1",
  householdId: "h1",
  role: "OWNER",
  displayName: "Ana",
};
const SIGNED_IN = { data: { claims: { sub: "u1" } }, error: null };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireUserId", () => {
  it("redirects to /login without a valid session", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("expired") });
    await expect(requireUserId()).rejects.toThrow("REDIRECT:/login");
  });

  it("returns the user id without requiring a household", async () => {
    getClaims.mockResolvedValue(SIGNED_IN);
    await expect(requireUserId()).resolves.toBe("u1");
    expect(getMemberByUserId).not.toHaveBeenCalled();
  });
});

describe("requireMember", () => {
  it("redirects to /login without a valid session, e.g. expired in an action", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("expired") });
    await expect(requireMember()).rejects.toThrow("REDIRECT:/login");
    expect(getMemberByUserId).not.toHaveBeenCalled();
  });

  it("redirects to /join when the user has no household", async () => {
    getClaims.mockResolvedValue(SIGNED_IN);
    getMemberByUserId.mockResolvedValue(null);
    await expect(requireMember()).rejects.toThrow("REDIRECT:/join");
  });

  it("returns the member of the signed-in user", async () => {
    getClaims.mockResolvedValue(SIGNED_IN);
    getMemberByUserId.mockResolvedValue(MEMBER);
    await expect(requireMember()).resolves.toEqual(MEMBER);
    expect(getMemberByUserId).toHaveBeenCalledWith("u1");
  });
});

describe("requireNoHousehold", () => {
  it("redirects to /login without a valid session", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("expired") });
    await expect(requireNoHousehold()).rejects.toThrow("REDIRECT:/login");
    expect(getMemberByUserId).not.toHaveBeenCalled();
  });

  it("sends a user who already has a household home", async () => {
    getClaims.mockResolvedValue(SIGNED_IN);
    getMemberByUserId.mockResolvedValue(MEMBER);
    await expect(requireNoHousehold()).rejects.toThrow("REDIRECT:/");
  });

  it("returns the user id while the user has no household", async () => {
    getClaims.mockResolvedValue(SIGNED_IN);
    getMemberByUserId.mockResolvedValue(null);
    await expect(requireNoHousehold()).resolves.toBe("u1");
    expect(getMemberByUserId).toHaveBeenCalledWith("u1");
  });
});

describe("requireBaby", () => {
  it("fails loudly, without redirecting, when the household has no baby", async () => {
    getClaims.mockResolvedValue(SIGNED_IN);
    getMemberByUserId.mockResolvedValue(MEMBER);
    getPrimaryBaby.mockResolvedValue(null);
    await expect(requireBaby()).rejects.toThrow("Household h1 has no baby");
    expect(getPrimaryBaby).toHaveBeenCalledWith("h1");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns the member and the household's baby", async () => {
    const baby = {
      id: "b1",
      name: "Lucía",
      birthDate: new Date("2026-08-27T08:00:00Z"),
    };
    getClaims.mockResolvedValue(SIGNED_IN);
    getMemberByUserId.mockResolvedValue(MEMBER);
    getPrimaryBaby.mockResolvedValue(baby);
    await expect(requireBaby()).resolves.toEqual({ member: MEMBER, baby });
  });
});
