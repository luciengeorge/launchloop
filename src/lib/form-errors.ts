import { ApiError, shownError } from "./client";
import { LOGIN_ERRORS, SIGN_IN_LINK_ERRORS } from "./login-errors";
import { NEWSLETTER_ERRORS } from "./newsletter";
import { WAITLIST_SERVER_ERROR } from "./waitlist";

/**
 * What each signup form shows when its request fails: the API's own message when it sent one (a reserved address, a
 * rate limit), else the form's friendly copy, never "Request failed (500)" from a plain-text error or a raw
 * "Failed to fetch". Each form keeps its submit button enabled, so it's also the retry.
 */
export const loginRequestError = (error: unknown) => shownError(error, LOGIN_ERRORS.send);
export const newsletterRequestError = (error: unknown) => shownError(error, NEWSLETTER_ERRORS.server);
export const waitlistRequestError = (error: unknown) => shownError(error, WAITLIST_SERVER_ERROR);

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
