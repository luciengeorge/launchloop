import { shownError } from "./client";
import { LOGIN_ERRORS } from "./login-errors";
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
