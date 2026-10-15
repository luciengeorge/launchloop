import { getSession } from "@/lib/auth";
import { KIT_SECTIONS, generateKitContentLegacy, generateKitSection } from "@/lib/copy";
import { devToolsEnabled } from "@/lib/dev-guard";
import { getKit } from "@/lib/kits";
import { isOwner } from "@/lib/progress";

export const maxDuration = 300;

/**
 * Preview/dev only: times the old single-call full-kit generation against the
 * new parallel per-section calls for the caller's own kit. Nothing is saved.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/dev/profile/[id]">) {
  if (!devToolsEnabled()) return Response.json({ error: "Not found" }, { status: 404 });
  const { id } = await ctx.params;
  const [kit, session] = await Promise.all([getKit(id), getSession()]);
  if (!kit || !isOwner(kit, session)) return Response.json({ error: "Log in as the kit's owner." }, { status: 403 });

  const time = async <T,>(fn: () => Promise<T>) => {
    const t0 = Date.now();
    try {
      const value = await fn();
      return { ms: Date.now() - t0, ok: true as const, value };
    } catch (error) {
      return { ms: Date.now() - t0, ok: false as const, error: (error as Error).message };
    }
  };

  const [legacy, sectioned] = await Promise.all([
    time(() => generateKitContentLegacy(kit.brief, kit.preview, kit.digest)),
    time(() => Promise.all(KIT_SECTIONS.map(async (s) => ({ s, ...(await time(() => generateKitSection(s, kit.brief, kit.preview, kit.digest))) })))),
  ]);
  return Response.json({
    legacy: { ms: legacy.ms, ok: legacy.ok, provider: legacy.ok ? legacy.value.provider : legacy.error },
    sectioned: {
      ms: sectioned.ms,
      sections: sectioned.ok ? Object.fromEntries(sectioned.value.map((r) => [r.s, { ms: r.ms, ok: r.ok, provider: r.ok ? r.value.provider : r.error }])) : sectioned.error,
    },
  });
}
