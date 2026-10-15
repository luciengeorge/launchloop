/** Non-secret hint so client code can tell a session exists. Never trusted on the server. */
export const SESSION_HINT_COOKIE = "ll_auth";

export function hasSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").includes(`${SESSION_HINT_COOKIE}=1`);
}
