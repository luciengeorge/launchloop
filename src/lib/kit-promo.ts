import "server-only";
import { after } from "next/server";
import { kitAssignment } from "./analytics-server";
import { EXPERIMENTS, type Served, type Variant } from "./experiments";
import { captureException } from "./observability";
import { store } from "./store";

/** Same lifetime as an unpaid preview (see kits.ts); a paid kit no longer shows the paywall. */
const REMEMBER_SECONDS = 60 * 60 * 24 * 30;
const rememberedKey = (kitId: string) => `kitpromo:${kitId}`;

/** exp_launch14_promo for a kit, and where it came from. */
export interface KitPromo extends Served {
  /** "posthog": assigned now. "remembered": PostHog didn't answer, so the variant it last assigned this kit. "fallback": control. */
  source: "posthog" | "remembered" | "fallback";
}

/**
 * exp_launch14_promo for a kit, resolved the same way for the paywall and /api/checkout so they agree:
 * PostHog on `kit:<kitId>`; if PostHog doesn't answer (error or timeout), the variant PostHog last
 * assigned this kit, kept server-side next to the kit (nothing in the browser); otherwise control as a
 * fallback. A flag that's off is control for every kit, never the remembered variant. Never throws.
 */
export async function resolveKitPromo(kitId: string): Promise<KitPromo> {
  const assigned = await kitAssignment(EXPERIMENTS.launchPromo, kitId);
  if (!assigned.fallback) {
    after(() => store().set(rememberedKey(kitId), assigned.variant, REMEMBER_SECONDS).catch((error) => captureException(error, { stage: "kitPromo.remember", kitId })));
    return { ...assigned, source: "posthog" };
  }
  if (assigned.fallback === "error") {
    const remembered = await store()
      .get<Variant>(rememberedKey(kitId))
      .catch(() => null);
    if (remembered === "control" || remembered === "treatment") return { variant: remembered, source: "remembered" };
  }
  return { ...assigned, source: "fallback" };
}
