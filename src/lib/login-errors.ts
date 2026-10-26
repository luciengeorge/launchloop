export const RESERVED_EMAIL_ERROR = "That address uses a reserved test domain (like example.com) that can't receive email. Use your real address.";

/** Shared by /api/auth/request (JSON and form redirects) and the /login page, which reads `?error=<code>`. */
export const LOGIN_ERRORS = {
  invalid: "Enter a valid email address.",
  reserved: RESERVED_EMAIL_ERROR,
  rate: "Too many login links requested. Try again in an hour.",
  send: "We couldn't send your login link. Please try again.",
  expired: "That login link has expired or was already used. Request a new one.",
  code: "That code didn't work or has expired. Request a new login email.",
} as const;

export type LoginErrorCode = keyof typeof LOGIN_ERRORS;

/**
 * The kit paywall's wording for the same failures: its forms (save this preview, log in first) promise a "sign-in
 * link", so its errors say so too. Only the codes whose LOGIN_ERRORS copy names the link; the rest are shown as sent.
 */
export const SIGN_IN_LINK_ERRORS = {
  rate: "Too many sign-in links requested. Try again in an hour.",
  send: "We couldn't send your sign-in link. Please try again.",
  code: "That code didn't work or has expired. Resend the code, or use the sign-in link in the email.",
} as const satisfies Partial<Record<LoginErrorCode, string>>;

export const loginError = (code: unknown): string | undefined =>
  typeof code === "string" && Object.hasOwn(LOGIN_ERRORS, code) ? LOGIN_ERRORS[code as LoginErrorCode] : undefined;
