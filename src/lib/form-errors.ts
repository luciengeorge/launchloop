import { ApiError, shownError } from "./client";
import { LOGIN_ERRORS, SIGN_IN_LINK_ERRORS } from "./login-errors";
import { NEWSLETTER_ERRORS } from "./newsletter";

/**
 * What the login and newsletter forms show when their request fails: the API's own message when it sent one (a
 * reserved address, a rate limit), else the form's friendly copy, never "Request failed (500)" from a plain-text error
 * or a raw "Failed to fetch". Each form keeps its submit button enabled, so it's also the retry. (The Ship Loop
 * waitlist has its own, with a reason per status for waitlist_error: see joinWaitlist.)
 */
export const loginRequestError = (error: unknown) => shownError(error, LOGIN_ERRORS.send);
export const newsletterRequestError = (error: unknown) => shownError(error, NEWSLETTER_ERRORS.server);

/**
 * The kit paywall's sign-in link requests (save this preview, log in first): /api/auth/request's own messages for
 * the codes whose copy says "login link" are reworded to the paywall's "sign-in link" (SIGN_IN_LINK_ERRORS).
 */
export function signInLinkError(error: unknown): string {
  if (error instanceof ApiError && (error.code === "rate" || error.code === "send")) return SIGN_IN_LINK_ERRORS[error.code];
  return shownError(error, SIGN_IN_LINK_ERRORS.send);
}

/** The paywall's 6-digit code check: /api/auth/verify's messages name no link, so only the fallback is the paywall's. */
export const signInCodeError = (error: unknown) => shownError(error, SIGN_IN_LINK_ERRORS.code);
