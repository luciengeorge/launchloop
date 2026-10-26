/** The one email rule, shared by the API routes (through audience.ts) and the signup forms. Pure, so the browser can use it. */
export const EMAIL_PATTERN = "[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}";
const EMAIL_RE = new RegExp(`^${EMAIL_PATTERN}$`);
export const EMAIL_MAX = 254;

export const isEmail = (v: unknown): v is string => typeof v === "string" && v.length <= EMAIL_MAX && EMAIL_RE.test(v);
