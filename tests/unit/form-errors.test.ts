import { afterEach, describe, expect, it, vi } from "vitest";
import { postJson } from "@/lib/client";
import { loginRequestError, newsletterRequestError, signInCodeError, signInLinkError, waitlistRequestError } from "@/lib/form-errors";
import { LOGIN_ERRORS, RESERVED_EMAIL_ERROR, SIGN_IN_LINK_ERRORS } from "@/lib/login-errors";
import { NEWSLETTER_ERRORS } from "@/lib/newsletter";
import { WAITLIST_SERVER_ERROR } from "@/lib/waitlist";

/** What a form's postJson to `url` throws when the server answers with `response`. */
async function failureFrom(url: string, response: Response): Promise<unknown> {
  vi.stubGlobal("fetch", vi.fn(async () => response));
  return postJson(url, { email: "someone@launchloop.dev" }).then(
    () => expect.unreachable("the request should have failed"),
    (error: unknown) => error,
  );
}
const plain500 = () => new Response("Internal Server Error", { status: 500, headers: { "Content-Type": "text/plain" } });
const html502 = () => new Response("<html><body><h1>502 Bad Gateway</h1></body></html>", { status: 502, headers: { "Content-Type": "text/html" } });

afterEach(() => {
  vi.unstubAllGlobals();
});

const FORMS = [
  { form: "/login", url: "/api/auth/request", shown: loginRequestError, friendly: LOGIN_ERRORS.send, apiMessage: LOGIN_ERRORS.rate },
  { form: "newsletter", url: "/api/newsletter", shown: newsletterRequestError, friendly: NEWSLETTER_ERRORS.server, apiMessage: NEWSLETTER_ERRORS.reserved },
  { form: "Ship Loop waitlist", url: "/api/waitlist", shown: waitlistRequestError, friendly: WAITLIST_SERVER_ERROR, apiMessage: RESERVED_EMAIL_ERROR },
] as const;

describe.each(FORMS)("$form form errors", ({ url, shown, friendly, apiMessage }) => {
  it("a non-JSON 500 shows the form's friendly copy, never 'Request failed (500)'", async () => {
    const message = shown(await failureFrom(url, plain500()));
    expect(message).toBe(friendly);
    expect(message).not.toMatch(/Request failed|500|Internal Server Error/);
    expect(message).toMatch(/try again/i);
  });

  it("a gateway's HTML error and a network failure show it too", async () => {
    expect(shown(await failureFrom(url, html502()))).toBe(friendly);
    expect(shown(new TypeError("Failed to fetch"))).toBe(friendly);
    expect(shown(new Error("Something unexpected"))).toBe(friendly);
  });

  it("keeps the API's own friendly message when it sends one", async () => {
    expect(shown(await failureFrom(url, Response.json({ error: apiMessage }, { status: 429 })))).toBe(apiMessage);
  });

  it("a JSON error without a usable message falls back to the friendly copy", async () => {
    expect(shown(await failureFrom(url, Response.json({ code: "oops" }, { status: 500 })))).toBe(friendly);
    expect(shown(await failureFrom(url, Response.json({ error: "   " }, { status: 500 })))).toBe(friendly);
  });
});

describe("the paywall's sign-in link errors (save preview, log in first, the code)", () => {
  it("say 'sign-in link' like the paywall's forms, even when /api/auth/request's own message says 'login link'", async () => {
    expect(signInLinkError(await failureFrom("/api/auth/request", Response.json({ error: LOGIN_ERRORS.send, code: "send" }, { status: 500 })))).toBe(
      "We couldn't send your sign-in link. Please try again.",
    );
    expect(signInLinkError(await failureFrom("/api/auth/request", Response.json({ error: LOGIN_ERRORS.rate, code: "rate" }, { status: 429 })))).toBe(
      "Too many sign-in links requested. Try again in an hour.",
    );
  });

  it("a non-JSON 500 or a network failure gets the sign-in copy too, never 'Request failed (500)'", async () => {
    expect(signInLinkError(await failureFrom("/api/auth/request", plain500()))).toBe(SIGN_IN_LINK_ERRORS.send);
    expect(signInLinkError(new TypeError("Failed to fetch"))).toBe(SIGN_IN_LINK_ERRORS.send);
    expect(signInCodeError(await failureFrom("/api/auth/verify", plain500()))).toBe(SIGN_IN_LINK_ERRORS.code);
  });

  it("keeps the API's messages that name no link (a reserved address, a wrong code)", async () => {
    expect(signInLinkError(await failureFrom("/api/auth/request", Response.json({ error: RESERVED_EMAIL_ERROR, code: "reserved" }, { status: 400 })))).toBe(RESERVED_EMAIL_ERROR);
    const wrongCode = "That code isn't right or has expired. Check the latest email.";
    expect(signInCodeError(await failureFrom("/api/auth/verify", Response.json({ error: wrongCode, code: "invalid_code" }, { status: 400 })))).toBe(wrongCode);
  });

  it("no paywall sign-in copy says 'login'", () => {
    for (const copy of Object.values(SIGN_IN_LINK_ERRORS)) {
      expect(copy).toMatch(/sign-in link|code/);
      expect(copy).not.toMatch(/login/i);
    }
  });
});

it("the friendly copy has no em-dashes", () => {
  for (const copy of [...FORMS.map((f) => f.friendly), ...Object.values(SIGN_IN_LINK_ERRORS)]) expect(copy).not.toMatch(/\u2014|\u2013/);
});
