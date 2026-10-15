import "server-only";

/** Reads JSON from fetch() calls, or form fields from a plain HTML form post made before hydration. */
export async function readBody(req: Request): Promise<{ data: Record<string, unknown>; isForm: boolean }> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    return { data: form ? Object.fromEntries(form.entries()) : {}, isForm: true };
  }
  return { data: ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>, isForm: false };
}
