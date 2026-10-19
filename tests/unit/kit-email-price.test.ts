import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { Kit, PaidAmount } from "@/lib/schema";

const resend = vi.hoisted(() => ({ constructed: vi.fn(), send: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resend.send };
    constructor() {
      resend.constructed();
    }
  },
}));

const { kitFailedEmail, kitReadyEmail } = await import("@/lib/email");
const { formatPaidAmount, sessionPaidAmount } = await import("@/lib/money");

const ZIP = { filename: "shelfie-launch-kit.zip", content: new Uint8Array([1, 2, 3]) };

function paidKit(paidAmount?: PaidAmount): Kit {
  return {
    id: "kit_price_0001",
    createdAt: "2026-10-19T08:00:00.000Z",
    status: "ready",
    source: { input: "sample", commitsAnalysed: 0, readmeFound: false, packageJsonFound: false, pageScraped: false, warnings: [] },
    brief: { name: "Shelfie", oneLiner: "", audience: "", problem: "", features: [], proofPoints: [], stack: [], tone: "" },
    palette: { background: "", foreground: "", accent: "", accentForeground: "", muted: "", source: "default" },
    preview: { tagline: "t", xPost: "x" },
    digest: "",
    llm: "mock",
    paid: true,
    email: "buyer@example.com",
    paymentRef: "cs_test_0123456789abcdef",
    paidAmount,
    attempts: 1,
  };
}

const rendered = async (paidAmount?: PaidAmount) => {
  const kit = paidKit(paidAmount);
  return [await kitReadyEmail({ to: "buyer@example.com", kit, zip: ZIP }), await kitFailedEmail({ to: "buyer@example.com", kit })];
};

describe("kit emails quote the amount Stripe charged", () => {
  it("a £14 LAUNCH14 payment reads £14 everywhere, never £19", async () => {
    const [ready, failed] = await rendered({ amount: 1400, currency: "gbp" });
    for (const email of [ready, failed]) {
      expect(email.text).toContain("Receipt: LaunchLoop Launch Kit, £14 · Ref 456789abcdef.");
      expect(email.html).toContain("£14");
      expect(`${email.subject}${email.text}${email.html}`).not.toContain("£19");
    }
    expect(failed.text).toContain("or a full refund of £14.");
  });

  it("a £19 payment reads £19", async () => {
    const [ready, failed] = await rendered({ amount: 1900, currency: "gbp" });
    for (const email of [ready, failed]) {
      expect(email.text).toContain("Receipt: LaunchLoop Launch Kit, £19 · Ref");
      expect(`${email.subject}${email.text}${email.html}`).not.toContain("£14");
    }
    expect(failed.text).toContain("or a full refund of £19.");
  });

  it("without a recorded amount (kits paid before it was stored) the copy names no price", async () => {
    const [ready, failed] = await rendered(undefined);
    for (const email of [ready, failed]) {
      expect(email.text).toContain("Receipt: LaunchLoop Launch Kit · Ref");
      expect(`${email.subject}${email.text}${email.html}`).not.toMatch(/£/);
    }
    expect(failed.text).toContain("or a full refund. You don");
  });

  it("renders without touching Resend", async () => {
    await rendered({ amount: 1400, currency: "gbp" });
    expect(resend.constructed).not.toHaveBeenCalled();
    expect(resend.send).not.toHaveBeenCalled();
  });
});

describe("money helpers", () => {
  it("formats pence as GBP, whole pounds without decimals", () => {
    expect(formatPaidAmount({ amount: 1400, currency: "gbp" })).toBe("£14");
    expect(formatPaidAmount({ amount: 1900, currency: "GBP" })).toBe("£19");
    expect(formatPaidAmount({ amount: 1450, currency: "gbp" })).toBe("£14.50");
    expect(formatPaidAmount({ amount: 0, currency: "gbp" })).toBe("£0");
  });

  it("drops the price rather than guess: unknown, non-GBP or malformed amounts", () => {
    expect(formatPaidAmount(undefined)).toBeUndefined();
    expect(formatPaidAmount({ amount: 1400, currency: "usd" })).toBeUndefined();
    expect(formatPaidAmount({ amount: 14.5, currency: "gbp" })).toBeUndefined();
    expect(formatPaidAmount({ amount: -100, currency: "gbp" })).toBeUndefined();
  });

  it("reads amount_total and currency from a Checkout session", () => {
    expect(sessionPaidAmount({ amount_total: 1400, currency: "gbp" })).toEqual({ amount: 1400, currency: "gbp" });
    expect(sessionPaidAmount({ amount_total: 0, currency: "gbp" })).toEqual({ amount: 0, currency: "gbp" });
    expect(sessionPaidAmount({ amount_total: null, currency: "gbp" })).toBeUndefined();
    expect(sessionPaidAmount({ amount_total: 1400, currency: null })).toBeUndefined();
  });
});

describe("email sources", () => {
  const root = path.join(import.meta.dirname, "../..");
  const emailDir = path.join(root, "src/emails");
  const sources = [...readdirSync(emailDir).filter((f) => /\.tsx?$/.test(f) && f !== "logo-data.ts").map((f) => path.join(emailDir, f)), path.join(root, "src/lib/email.tsx")];

  it("no template or send path hard-codes a price, and none uses em or en dashes", () => {
    expect(sources.length).toBeGreaterThanOrEqual(5);
    for (const file of sources) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toContain("£19");
      expect(source, file).not.toMatch(/£\s?\d/);
      expect(source, file).not.toMatch(/priceLabel/);
      expect(source, file).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
