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

export const loginError = (code: unknown): string | undefined =>
  typeof code === "string" && Object.hasOwn(LOGIN_ERRORS, code) ? LOGIN_ERRORS[code as LoginErrorCode] : undefined;
