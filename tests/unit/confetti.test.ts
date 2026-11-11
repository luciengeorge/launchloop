import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { claimChecklistConfetti } from "@/components/kit/confetti";

describe("checklist confetti session claim", () => {
  let reduced = false;
  let stored: Map<string, string>;

  beforeEach(() => {
    reduced = false;
    stored = new Map();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    });
    vi.stubGlobal("window", { matchMedia: () => ({ matches: reduced }) });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("claims only the first completion for a kit, independent of re-renders", () => {
    expect(claimChecklistConfetti("kit-one")).toBe(true);
    expect(claimChecklistConfetti("kit-one")).toBe(false);
    expect(claimChecklistConfetti("kit-one")).toBe(false);
  });

  it("allows a different kit its own single completion", () => {
    expect(claimChecklistConfetti("kit-one")).toBe(true);
    expect(claimChecklistConfetti("kit-two")).toBe(true);
    expect(claimChecklistConfetti("kit-two")).toBe(false);
  });

  it("does not replay an existing session claim after a revisit", () => {
    stored.set("launchloop:confetti:kit-one", "seen");
    expect(claimChecklistConfetti("kit-one")).toBe(false);
  });

  it("consumes a reduced-motion completion without firing after a preference change", () => {
    reduced = true;
    expect(claimChecklistConfetti("kit-one")).toBe(false);
    reduced = false;
    expect(claimChecklistConfetti("kit-one")).toBe(false);
  });

  it("skips entirely if reading session storage fails", () => {
    vi.stubGlobal("sessionStorage", { getItem: () => { throw new Error("Storage unavailable"); } });
    expect(claimChecklistConfetti("kit-one")).toBe(false);
  });

  it("skips entirely if the session claim cannot be saved", () => {
    vi.stubGlobal("sessionStorage", { getItem: () => null, setItem: () => { throw new Error("Storage unavailable"); } });
    expect(claimChecklistConfetti("kit-one")).toBe(false);
  });
});
