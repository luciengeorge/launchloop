import { describe, expect, it } from "vitest";
import { isEmail as serverIsEmail } from "@/lib/audience";
import { EMAIL_MAX, EMAIL_PATTERN, isEmail } from "@/lib/email-address";

describe("isEmail, shared by the API and the signup forms", () => {
  const long = `${"a".repeat(EMAIL_MAX - "@b.co".length + 1)}@b.co`;

  it.each(["a@b", "a@b.c", "a b@c.com", "@b.com", "a@.com", "", long, undefined, null, 42, ["a@b.co"], { email: "a@b.co" }])("rejects %j", (value) => {
    expect(isEmail(value)).toBe(false);
  });

  it.each(["a@b.co", "first.last+tag@sub.example.io", "delivered+qa1@resend.dev", `${"a".repeat(EMAIL_MAX - "@b.co".length)}@b.co`])("accepts %s", (value) => {
    expect(isEmail(value)).toBe(true);
  });

  it("255 characters is one too many", () => {
    expect(long).toHaveLength(255);
  });

  it("is the very function the API routes import from audience.ts", () => {
    expect(serverIsEmail).toBe(isEmail);
  });

  it("the form's pattern attribute is the same rule, as the browser applies it (anchored, v flag)", () => {
    const browser = new RegExp(`^(?:${EMAIL_PATTERN})$`, "v");
    for (const value of ["a@b", "a@b.c", "a b@c.com", "a@b.co", "first.last+tag@sub.example.io"]) expect(browser.test(value), value).toBe(isEmail(value));
  });
});
