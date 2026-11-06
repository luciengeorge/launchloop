import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  getFeatureFlag: vi.fn<(key: string, distinctId: string, options: unknown) => Promise<unknown>>(async () => undefined),
  hasPosthog: true,
}));

vi.mock("next/cache", () => ({ cacheLife: () => {} }));
vi.mock("@/lib/analytics-server", () => ({ posthog: () => (m.hasPosthog ? { getFeatureFlag: m.getFeatureFlag } : null) }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn() }));

const { isNewsletterCalendarOn, NEWSLETTER_CALENDAR_FLAG } = await import("@/lib/newsletter-flag-server");
const { newsletterWelcomeEmail } = await import("@/lib/email");

const DASHES = /[\u2012-\u2015]/;
const CHECKLIST = "https://launchloop.dev/product-hunt-launch-checklist?utm_source=newsletter&utm_medium=email&utm_campaign=welcome";
const CALENDAR = "https://launchloop.dev/7-day-launch-calendar?utm_source=newsletter&utm_medium=email&utm_campaign=welcome";

/** The checklist welcome email's plain text on main at 251da04, before the calendar reward existed. */
const CHECKLIST_EMAIL_TEXT = `LaunchLoop

Your launch-day checklist

Thanks for subscribing to Weekly launch teardowns. Here's the checklist I promised.

It's what I work through before every launch: what to fix a week out, the Product Hunt listing limits, image sizes, and what to do on the day, in order.

Open the checklist ${CHECKLIST}

Once a week I'll send you one launch teardown. A real launch, what worked, what didn't, and what you can copy. Short and practical.

----------------------------------------

Every issue has an unsubscribe link. If you didn't sign up, ignore this email or reply and I'll take you off the list.

Button not working? Paste this into your browser:
${CHECKLIST}

LaunchLoop · Paste your repo. Get your whole launch.
launchloop.dev https://launchloop.dev`;

beforeEach(() => {
  m.hasPosthog = true;
  m.getFeatureFlag.mockResolvedValue(undefined);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://launchloop.dev");
  vi.stubEnv("NEWSLETTER_CALENDAR", "");
});

const inEnv = (vercelEnv: "production" | "preview" | "") => {
  vi.stubEnv("VERCEL_ENV", vercelEnv);
  vi.stubEnv("VERCEL_BRANCH_URL", "");
  vi.stubEnv("VERCEL_URL", "");
};

describe("isNewsletterCalendarOn (newsletter-calendar-reward)", () => {
  it("reads its own flag for the marketing id, with deploy_env, and never sends a $feature_flag_called event", async () => {
    inEnv("production");
    m.getFeatureFlag.mockResolvedValue(true);
    expect(await isNewsletterCalendarOn()).toBe(true);
    expect(NEWSLETTER_CALENDAR_FLAG).toBe("newsletter-calendar-reward");
    expect(m.getFeatureFlag).toHaveBeenCalledWith("newsletter-calendar-reward", expect.any(String), { sendFeatureFlagEvents: false, personProperties: { deploy_env: "production" } });
  });

  it("production with no flag yet, a false, an error or no PostHog key: off", async () => {
    inEnv("production");
    expect(await isNewsletterCalendarOn()).toBe(false);
    m.getFeatureFlag.mockResolvedValue(false);
    expect(await isNewsletterCalendarOn()).toBe(false);
    m.getFeatureFlag.mockRejectedValue(new Error("flags down"));
    expect(await isNewsletterCalendarOn()).toBe(false);
    m.hasPosthog = false;
    expect(await isNewsletterCalendarOn()).toBe(false);
  });

  it("preview with no flag yet: on; an explicit false there turns it off", async () => {
    inEnv("preview");
    expect(await isNewsletterCalendarOn()).toBe(true);
    m.hasPosthog = false;
    expect(await isNewsletterCalendarOn()).toBe(true);
    m.hasPosthog = true;
    m.getFeatureFlag.mockResolvedValue(false);
    expect(await isNewsletterCalendarOn()).toBe(false);
  });

  it("NEWSLETTER_CALENDAR=off wins in preview; NEWSLETTER_CALENDAR=on can't turn production on", async () => {
    inEnv("preview");
    vi.stubEnv("NEWSLETTER_CALENDAR", "off");
    expect(await isNewsletterCalendarOn()).toBe(false);
    inEnv("production");
    vi.stubEnv("NEWSLETTER_CALENDAR", "on");
    expect(await isNewsletterCalendarOn()).toBe(false);
  });
});

describe("newsletterWelcomeEmail", () => {
  it("flag off: today's checklist email, unchanged", async () => {
    inEnv("production");
    const mail = await newsletterWelcomeEmail({ to: "maker@example.com" });
    expect(mail.subject).toBe("Your launch-day checklist");
    expect(mail.text).toBe(CHECKLIST_EMAIL_TEXT);
    expect(mail.html).not.toMatch(/calendar/i);
  });

  it("flag on: the calendar email, its one button on the calendar and the checklist as a second, quiet link", async () => {
    inEnv("production");
    m.getFeatureFlag.mockResolvedValue(true);
    const mail = await newsletterWelcomeEmail({ to: "maker@example.com" });
    expect(mail.subject).toBe("Your 7-day launch calendar");
    expect(mail.text).toContain("Your 7-day launch calendar");
    expect(mail.text).toContain("Thanks for subscribing to Weekly launch teardowns. Here's the 7-day launch calendar I promised.");
    expect(mail.text).toContain(`Open the 7-day launch calendar ${CALENDAR}`);
    expect(mail.text).toContain(`Also useful if you're aiming at Product Hunt: the launch-day checklist ${CHECKLIST}&utm_content=ph-checklist`);
    expect(mail.text).toContain(`Button not working? Paste this into your browser:\n${CALENDAR}`);
    expect(mail.text).toContain("Every issue has an unsubscribe link.");
    // One button: the calendar. The checklist is a plain link.
    expect(mail.html.match(/<a[^>]+href="[^"]*7-day-launch-calendar[^"]*"/g)).toHaveLength(2);
    expect(mail.html).toContain("Here&#x27;s the 7-day launch calendar I promised.");
    expect(`${mail.subject}\n${mail.text}`).not.toMatch(DASHES);
    expect(mail.text).not.toMatch(/exclusive|subscribers only|private/i);
  });

  it("on Preview, links point at the deployment being tested", async () => {
    inEnv("preview");
    vi.stubEnv("VERCEL_BRANCH_URL", "launchloop-git-x.vercel.app");
    const mail = await newsletterWelcomeEmail({ to: "delivered+calendar@resend.dev" });
    expect(mail.subject).toBe("Your 7-day launch calendar");
    expect(mail.text).toContain("https://launchloop-git-x.vercel.app/7-day-launch-calendar?utm_source=newsletter");
  });
});
