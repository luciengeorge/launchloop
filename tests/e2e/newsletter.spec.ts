import { expect, test, type APIRequestContext } from "@playwright/test";
import { newsletterReturnPath } from "../../src/lib/newsletter";
import { contrast, makeSampleKit, uniqueEmail } from "./helpers";

// A fresh IP per call gets its own newsletter and preview rate-limit buckets, so specs don't eat each other's budget.
const freshIp = () => `203.0.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
test.use({ extraHTTPHeaders: { "x-forwarded-for": freshIp() } });

const CHECKLIST = "/product-hunt-launch-checklist";

async function welcomeEmails(request: APIRequestContext, email: string) {
  const { emails } = (await (await request.get("/api/dev/outbox")).json()) as { emails: { to: string; subject: string; text: string }[] };
  return emails.filter((e) => e.to === email && e.subject === "Your launch-day checklist");
}

async function welcomeEmail(request: APIRequestContext, email: string) {
  await expect.poll(async () => (await welcomeEmails(request, email)).length).toBe(1);
  return (await welcomeEmails(request, email))[0];
}

const postJson = (request: APIRequestContext, data: Record<string, string>, ip = freshIp()) =>
  request.post("/api/newsletter", { data, headers: { "x-forwarded-for": ip } });

const postForm = (request: APIRequestContext, form: Record<string, string>, ip = freshIp()) =>
  request.post("/api/newsletter", { form, headers: { "x-forwarded-for": ip }, maxRedirects: 0 });

/** A Location the browser can only resolve to this site. */
function expectSameOrigin(location: string | undefined) {
  expect(location).toMatch(/^\/(?![/\\])/);
  expect(new URL(location!, "https://launchloop.test").origin).toBe("https://launchloop.test");
}

test("after the free preview: a quiet signup under the paywall, and the £19 kit CTA is the only primary button", async ({ page }) => {
  await makeSampleKit(page);
  const signup = page.getByTestId("preview-newsletter");
  await expect(signup.getByRole("heading", { name: "Not launching this week?" })).toBeVisible();
  await expect(signup).toContainText("launch-day checklist");

  // Paywall first, then the signup, then the locked kit.
  const tops = await page.evaluate(() =>
    ["preview-paywall", "preview-newsletter", "locked-kit"].map((id) => document.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect().top),
  );
  expect(tops[0]).toBeLessThan(tops[1]);
  expect(tops[1]).toBeLessThan(tops[2]);

  const unlock = page.getByRole("button", { name: "Unlock the full kit, £19" });
  const subscribe = signup.getByRole("button", { name: "Send me the checklist" });
  await expect(unlock).toHaveClass(/\bbg-primary\b/);
  await expect(subscribe).not.toHaveClass(/\bbg-primary\b/);
  await expect(page.getByRole("contentinfo").getByRole("button", { name: "Subscribe" })).not.toHaveClass(/\bbg-primary\b/);
  // Visible action buttons (the shared Button): the home page stays mounted but hidden after client navigation,
  // and the checklist's selected stage tab is a raw button styled as a pill.
  await expect(page.locator('[data-slot="button"].bg-primary:visible')).toHaveCount(1);
  // Same on a full page load of the kit link.
  await page.reload();
  await expect(page.getByRole("contentinfo").getByRole("button", { name: "Subscribe" })).not.toHaveClass(/\bbg-primary\b/);
  await expect(page.locator('[data-slot="button"].bg-primary:visible')).toHaveCount(1);
  await expect(page.getByRole("button", { name: /£19/ })).toHaveCount(1);

  const email = uniqueEmail("preview-news");
  await signup.getByLabel("Email for the launch-day checklist").fill(email);
  await subscribe.click();
  const done = signup.getByRole("status");
  await expect(done).toHaveAttribute("data-welcome", "sent");
  await expect(done).toContainText("You're subscribed");
  await expect(done).toContainText("I've emailed you the link too.");
  await expect(done.getByRole("link", { name: "Open your launch-day checklist" })).toHaveAttribute("href", CHECKLIST);
  // The kit CTA is untouched by subscribing.
  await expect(unlock).toBeVisible();

  const mail = await welcomeEmail(page.request, email);
  expect(mail.text).toContain(`${CHECKLIST}?utm_source=newsletter&utm_medium=email&utm_campaign=welcome`);
  expect(mail.text).not.toMatch(/[\u2013\u2014]/);

  await done.getByRole("link", { name: "Open your launch-day checklist" }).click();
  await page.waitForURL((u) => u.pathname === CHECKLIST);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Product Hunt launch checklist");
});

test("the footer Subscribe button is primary everywhere except kit pages", async ({ page }) => {
  for (const path of ["/", "/pricing", CHECKLIST]) {
    await page.goto(path);
    await expect(page.getByRole("contentinfo").getByRole("button", { name: "Subscribe" })).toHaveClass(/\bbg-primary\b/);
  }
});

test("newsletter-inline-signup off (no flag, as in production until it's created): no inline blocks, the end-of-post block and the footer form", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-inline-newsletter]")).toHaveCount(0);
  await expect(page.locator('[id="newsletter"]')).toHaveCount(0);
  await expect(page.getByRole("contentinfo").getByRole("button", { name: "Subscribe" })).toBeVisible();
  await expect(page.getByTestId("footer-newsletter-link")).toHaveCount(0);
  await page.goto("/blog/og-image-size");
  await expect(page.locator("[data-inline-newsletter]")).toHaveCount(0);
  await expect(page.getByTestId("blog-newsletter")).toBeVisible();
  await expect(page.locator('[id="newsletter"]')).toHaveCount(1);
  await expect(page.getByTestId("footer-newsletter-link")).toHaveCount(0);
});

test("a@b is stopped in the browser with the server's message, without a request, and editing clears it", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/newsletter")) posts.push(r.url());
  });
  await page.goto("/pricing");
  const footer = page.getByRole("contentinfo");
  await expect(page.locator('p[id^="newsletter-"]')).toHaveCount(0);
  const field = footer.getByLabel("Weekly launch teardowns");
  await field.fill("a@b");
  await footer.getByRole("button", { name: "Subscribe" }).click();
  const alert = footer.getByRole("alert");
  await expect(alert).toHaveText("Enter a valid email address.");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  const alertId = await alert.getAttribute("id");
  expect(alertId).toBeTruthy();
  expect((await field.getAttribute("aria-describedby"))?.split(" ")).toContain(alertId);
  await expect(field).toBeFocused();
  // The form is novalidate once hydrated, so the browser's own bubble didn't take over.
  expect(await field.evaluate((el: HTMLInputElement) => el.form!.noValidate)).toBe(true);

  await field.pressSequentially(".co");
  await expect(alert).toHaveCount(0);
  await expect(field).not.toHaveAttribute("aria-invalid");
  await expect(field).toHaveAttribute("aria-describedby", /hint/);
  await page.waitForTimeout(300);
  expect(posts).toEqual([]);

  // The server is still the judge: the same address posted directly is a 400.
  const direct = await postJson(page.request, { email: "a@b", placement: "footer" });
  expect(direct.status()).toBe(400);
  expect(await direct.json()).toMatchObject({ code: "invalid" });
});

test("dark text on the orange buttons: the footer Subscribe and the hero kit button pass 4.5:1, at rest and hovered", async ({ page }) => {
  await page.goto("/");
  const subscribe = page.getByRole("contentinfo").getByRole("button", { name: "Subscribe" });
  const kit = page.getByRole("form", { name: "Generate a launch kit" }).getByRole("button", { name: /Get my free preview/ });
  for (const [name, button] of [["footer Subscribe", subscribe], ["hero kit button", kit]] as const) {
    // Still the brand orange, with dark text on it.
    await expect(button).toHaveClass(/\bbg-primary\b/);
    await expect(button).toHaveClass(/\btext-primary-foreground\b/);
    await button.scrollIntoViewIfNeeded();
    const rest = await contrast(button);
    expect(rest, name).toBeGreaterThanOrEqual(4.5);
    await button.hover();
    await page.waitForTimeout(300);
    const hovered = await contrast(button);
    expect(hovered, `${name} (hovered)`).toBeGreaterThanOrEqual(4.5);
    await page.mouse.move(0, 0);
    console.log(`contrast ${name}: ${rest.toFixed(2)} at rest, ${hovered.toFixed(2)} hovered`);
  }
});

test.describe("newsletter_form_viewed", () => {
  test.use({
    // posthog-js drops every event from a likely bot (HeadlessChrome UA or brand, navigator.webdriver).
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  });
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
      Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
    });
  });

  const viewed = async (request: APIRequestContext, campaign: string) =>
    (await phEvents(request)).filter((e) => e.event === "newsletter_form_viewed" && e.properties.utm_campaign === campaign);

  test("the forms that exist today report a view once, with the landing's UTMs and a scrubbed path", async ({ page }) => {
    const campaign = `viewed-${Date.now()}`;
    await page.goto(`/pricing?utm_source=devhunt&utm_medium=directory&utm_campaign=${campaign}&utm_term=x`);
    await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
    await expect.poll(async () => (await viewed(page.request, campaign)).length).toBe(1);
    const [footer] = await viewed(page.request, campaign);
    expect(footer.properties).toMatchObject({ placement: "footer", path: "/pricing", utm_source: "devhunt", utm_medium: "directory", utm_campaign: campaign });
    // posthog-js adds every utm_* from the URL itself; the event adds nothing else of the attribution.
    expect(footer.properties).not.toHaveProperty("referring_domain");
    // Scrolling away and back on the same page doesn't send it again.
    await page.mouse.wheel(0, -5000);
    await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    expect(await viewed(page.request, campaign)).toHaveLength(1);

    // The footer stays mounted through a client navigation, and reports itself again for the new page.
    await page.getByRole("contentinfo").getByRole("link", { name: "FAQ" }).click();
    await page.waitForURL((u) => u.pathname === "/faq");
    await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
    await expect.poll(async () => (await viewed(page.request, campaign)).map((e) => e.properties.path)).toEqual(["/pricing", "/faq"]);
  });

  test("on a kit page the path never carries the kit id", async ({ page }) => {
    const campaign = `viewed-kit-${Date.now()}`;
    await page.goto(`/?utm_campaign=${campaign}`);
    await page.getByRole("button", { name: "Try a sample app" }).click();
    await page.waitForURL(/\/kit\/[\w-]+$/);
    const kitId = new URL(page.url()).pathname.split("/").pop()!;
    await page.getByTestId("preview-newsletter").scrollIntoViewIfNeeded();
    let events: PhEvent[] = [];
    await expect.poll(async () => (events = await viewed(page.request, campaign)).some((e) => e.properties.placement === "preview")).toBe(true);
    expect(events.find((e) => e.properties.placement === "preview")!.properties.path).toBe("/kit/[id]");
    expect(JSON.stringify(events)).not.toContain(kitId);
    expect(JSON.stringify(events)).not.toContain("@");
  });
});

test("not shown on the way to checkout (?unlock=1)", async ({ page }) => {
  const kitId = await makeSampleKit(page);
  await expect(page.getByTestId("preview-newsletter")).toBeVisible();
  // Signed out, ?unlock=1 goes straight on to guest checkout: hold that request so the page can be checked on the way.
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/checkout", async (route) => {
    await held;
    await route.continue();
  });
  await page.goto(`/kit/${kitId}?unlock=1`);
  await expect(page.getByTestId("unlock-panel")).toBeVisible();
  await expect(page.getByTestId("unlock-panel")).toHaveAttribute("data-step", "redirecting");
  await expect(page.getByTestId("preview-newsletter")).toHaveCount(0);
  release();
  await page.waitForURL(/\/checkout\/mock\?product=kit/);
});

test("footer signup offers the checklist; signing up again says so and doesn't resend it", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText("launch-day checklist");

  const email = uniqueEmail("footer-news");
  await footer.getByLabel("Weekly launch teardowns").fill(email);
  await footer.getByRole("button", { name: "Subscribe" }).click();
  const done = footer.getByRole("status");
  await expect(done).toHaveAttribute("data-welcome", "sent");
  await expect(done).toContainText("You're subscribed");
  await expect(done.getByRole("link", { name: "Open your launch-day checklist" })).toHaveAttribute("href", CHECKLIST);
  await welcomeEmail(page.request, email);

  // Same address again: still a success, but no new email, and the copy doesn't claim one.
  await page.reload();
  await footer.getByLabel("Weekly launch teardowns").fill(email.toUpperCase());
  await footer.getByRole("button", { name: "Subscribe" }).click();
  await expect(done).toHaveAttribute("data-welcome", "existing");
  await expect(done).toContainText("You're already on the list. Here's the launch-day checklist:");
  await expect(done).not.toContainText("emailed");
  await expect(done.getByRole("link", { name: "Open the checklist" })).toHaveAttribute("href", CHECKLIST);

  const again = await postJson(page.request, { email, placement: "preview" });
  expect(await again.json()).toEqual({ ok: true, welcome: "existing" });
  // A fresh signup after them: once its email lands, the repeats' would have too.
  const sentinel = uniqueEmail("footer-news-sentinel");
  expect((await postJson(page.request, { email: sentinel })).ok()).toBe(true);
  await welcomeEmail(page.request, sentinel);
  expect(await welcomeEmails(page.request, email)).toHaveLength(1);
});

test("success copy only mentions an email when one was sent", async ({ page }) => {
  await page.goto("/?subscribed=1&welcome=skipped");
  const footer = page.getByRole("contentinfo").getByRole("status");
  await expect(footer).toHaveAttribute("data-welcome", "skipped");
  await expect(footer).toContainText("You're subscribed. One useful launch teardown a week, no spam.");
  await expect(footer).toContainText("Here's the launch-day checklist:");
  await expect(footer).not.toContainText("emailed");
  await expect(footer.getByRole("link", { name: "Open the checklist" })).toHaveAttribute("href", CHECKLIST);
  await page.goto("/?subscribed=1&welcome=existing");
  await expect(footer).toContainText("You're already on the list. Here's the launch-day checklist:");
  await expect(footer).not.toContainText("emailed");
  await expect(footer.getByRole("link", { name: "Open the checklist" })).toHaveAttribute("href", CHECKLIST);

  // The kit page knows the result on the server, so the post-preview card renders it straight away.
  const kitId = await makeSampleKit(page);
  await page.goto(`/kit/${kitId}?subscribed=1&from=preview&welcome=existing#newsletter`);
  const card = page.getByTestId("preview-newsletter").getByRole("status");
  await expect(card).toHaveAttribute("data-welcome", "existing");
  await expect(card).not.toContainText("emailed");
  const html = await (await page.request.get(`/kit/${kitId}?subscribed=1&from=preview&welcome=skipped`)).text();
  expect(html).toContain('data-welcome="skipped"');
  expect(html).not.toMatch(/[\u2013\u2014]/);
});

type PhEvent = { event: string; distinct_id?: string; properties: Record<string, unknown> };
const phEvents = async (request: APIRequestContext) => (await (await request.get("http://127.0.0.1:3419/ph/_events")).json()) as PhEvent[];
const signupEvents = async (request: APIRequestContext) => (await phEvents(request)).filter((e) => e.event === "newsletter_subscribed");

// This spec runs in a stock automated browser (navigator.webdriver, HeadlessChrome), like a QA agent's.
test("a signup from an automated browser is still counted: the server records newsletter_subscribed, though posthog-js drops the page's own events", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const request = page.waitForRequest((r) => r.url().endsWith("/api/newsletter") && r.method() === "POST");
  await page.getByRole("contentinfo").getByLabel("Weekly launch teardowns").fill(uniqueEmail("bot-news"));
  await page.getByRole("contentinfo").getByRole("button", { name: "Subscribe" }).click();
  await expect(page.getByRole("contentinfo").getByRole("status")).toContainText("You're subscribed");
  const { analyticsId } = (await request).postDataJSON() as { analyticsId: string };

  let event: PhEvent | undefined;
  await expect.poll(async () => (event = (await signupEvents(page.request)).find((e) => e.distinct_id === analyticsId))).toBeTruthy();
  expect(event!.properties).toMatchObject({ placement: "footer", welcome: "sent", submitted: "js", is_webdriver: true, $lib: "posthog-node" });
  expect(JSON.stringify(event)).not.toContain("@example.com");
  // The browser SDK sent nothing for this page at all, which is why the event had to move to the server.
  await page.goto("/pricing");
  expect((await phEvents(page.request)).filter((e) => e.distinct_id === analyticsId && e.properties.$lib === "web")).toEqual([]);
});

test("a plain form post (no JavaScript) is counted once, as submitted: form", async ({ request }) => {
  const formSignups = async () => (await signupEvents(request)).filter((e) => e.properties.submitted === "form").length;
  const before = await formSignups();
  const res = await postForm(request, { email: uniqueEmail("nojs-count"), placement: "blog", next: "/blog/how-to-launch-on-product-hunt" });
  expect(res.status()).toBe(303);
  await expect.poll(formSignups).toBe(before + 1);
  const event = (await signupEvents(request)).filter((e) => e.properties.submitted === "form").at(-1)!;
  expect(event.properties).toMatchObject({ placement: "blog", welcome: "sent" });
  expect(event.properties).not.toHaveProperty("is_webdriver");
  expect(event.distinct_id).toMatch(/^server_/);
  // A failed post records nothing.
  await postForm(request, { email: "not-an-email", placement: "blog" });
  await new Promise((r) => setTimeout(r, 500));
  expect(await formSignups()).toBe(before + 1);
});

test("a signup with a Resend test address is is_test, and the address isn't in the event", async ({ request }) => {
  const analyticsId = crypto.randomUUID();
  const res = await postJson(request, { email: `delivered+${Date.now()}@resend.dev`, placement: "footer", analyticsId });
  expect(await res.json()).toMatchObject({ ok: true });
  let event: PhEvent | undefined;
  await expect.poll(async () => (event = (await signupEvents(request)).find((e) => e.distinct_id === analyticsId))).toBeTruthy();
  expect(event!.properties).toMatchObject({ placement: "footer", submitted: "js", is_test: true });
  expect(JSON.stringify(event)).not.toMatch(/resend\.dev|delivered/);
});

test("concurrent signups for one new address send one welcome email", async ({ request }) => {
  const email = uniqueEmail("race");
  const responses = await Promise.all([1, 2, 3, 4].map((n) => postJson(request, { email, placement: n % 2 ? "footer" : "preview" })));
  for (const res of responses) expect(res.ok()).toBe(true);
  const outcomes = (await Promise.all(responses.map(async (r) => ((await r.json()) as { welcome: string }).welcome))).sort();
  expect(outcomes).toEqual(["existing", "existing", "existing", "sent"]);
  const sentinel = uniqueEmail("race-sentinel");
  expect((await postJson(request, { email: sentinel })).ok()).toBe(true);
  await welcomeEmail(request, sentinel);
  expect(await welcomeEmails(request, email)).toHaveLength(1);
});

test.describe("plain form posts", () => {
  // The kit page itself needs JavaScript, but a submit before hydration is still a plain form post.
  test("post-preview signup submitted before hydration comes back to the kit with the checklist link", async ({ page }) => {
    const kitId = await makeSampleKit(page);
    const signup = page.getByTestId("preview-newsletter");
    const email = uniqueEmail("prehydration-preview");
    await signup.getByLabel("Email for the launch-day checklist").fill(email);
    // form.submit() skips React's onSubmit, exactly like a submit that lands before hydration.
    await signup.getByRole("form", { name: "Newsletter signup" }).evaluate((form: HTMLFormElement) => form.submit());
    await page.waitForURL((u) => u.pathname === `/kit/${kitId}` && u.searchParams.get("subscribed") === "1" && u.searchParams.get("from") === "preview" && u.hash === "#newsletter");
    expect(page.url()).not.toContain("example.com");
    await expect(signup.getByRole("status")).toContainText("You're subscribed");
    await expect(signup.getByRole("link", { name: "Open your launch-day checklist" })).toHaveAttribute("href", CHECKLIST);
    // The footer form on the same page isn't the one that was used, so it stays a form.
    await expect(page.getByRole("contentinfo").getByRole("button", { name: "Subscribe" })).toBeVisible();
    await welcomeEmail(page.request, email);
  });

  test("redirects go back to a same-origin path", async ({ request }) => {
    const res = await postForm(request, { email: uniqueEmail("nojs-next"), placement: "preview", next: "/kit/abc" });
    expect(res.status()).toBe(303);
    expect(res.headers().location).toBe("/kit/abc?subscribed=1&from=preview#newsletter");
    const footer = await postForm(request, { email: uniqueEmail("nojs-footer") });
    expect(footer.status()).toBe(303);
    expect(footer.headers().location).toBe("/?subscribed=1");
  });

  // Each of these passes a naive "starts with one slash" check, then normalises to //evil.com (or another host).
  const OPEN_REDIRECTS = [
    "/.//evil.com",
    "/..//evil.com",
    "/a/..//evil.com",
    "/%2e//evil.com",
    "/%2e%2e//evil.com",
    "/./\\evil.com",
    "/.\\/evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "//evil.com",
    "https://evil.com/kit/abc",
  ];
  for (const next of OPEN_REDIRECTS) {
    test(`no open redirect for next=${JSON.stringify(next)}, on the success, invalid-email and repeat branches`, async ({ request }) => {
      const email = uniqueEmail("redirect");
      const branches: [Record<string, string>, string][] = [
        [{ email }, "/?subscribed=1&from=preview#newsletter"],
        [{ email: "not-an-email" }, "/?subscribed=0&error=invalid&from=preview#newsletter-preview-invalid"],
        [{}, "/?subscribed=0&error=invalid&from=preview#newsletter-preview-invalid"],
        [{ email }, "/?subscribed=1&welcome=existing&from=preview#newsletter"],
      ];
      for (const [fields, expected] of branches) {
        for (const placement of ["preview", "footer"]) {
          const res = await postForm(request, { ...fields, placement, next });
          expect(res.status()).toBe(303);
          const location = res.headers().location;
          expectSameOrigin(location);
          expect(location).not.toContain("evil.com");
          if (placement === "preview") expect(location).toBe(expected);
          else expect(location.startsWith("/?subscribed=")).toBe(true);
        }
      }
      for (const result of [{ ok: true, welcome: "sent" }, { ok: true, welcome: "skipped" }, { ok: false, error: "rate" }, { ok: false, error: "server" }] as const) {
        expect(newsletterReturnPath(next, "preview", result)).toMatch(/^\/\?subscribed=/);
      }
    });
  }

  test("past the per-IP limit: JSON gets a 429, a form post is redirected with a plain message", async ({ request }) => {
    const ip = freshIp();
    for (let i = 0; i < 10; i++) await postJson(request, { email: "not-an-email" }, ip);
    const json = await postJson(request, { email: uniqueEmail("limited") }, ip);
    expect(json.status()).toBe(429);
    expect(await json.json()).toMatchObject({ code: "rate", error: "Too many attempts. Try again later." });
    const form = await postForm(request, { email: uniqueEmail("limited") }, ip);
    expect(form.status()).toBe(303);
    expect(form.headers().location).toBe("/?subscribed=0&error=rate#newsletter-footer-rate");
    const preview = await postForm(request, { email: uniqueEmail("limited"), placement: "preview", next: "/kit/abc" }, ip);
    expect(preview.headers().location).toBe("/kit/abc?subscribed=0&error=rate&from=preview#newsletter-preview-rate");
    // The rate-limited branch fires before anything else is read, and still can't be pointed off-site.
    for (const next of ["/.//evil.com", "/..//evil.com", "/./\\evil.com"]) {
      const res = await postForm(request, { placement: "preview", next }, ip);
      expect(res.headers().location).toBe("/?subscribed=0&error=rate&from=preview#newsletter-preview-rate");
    }
    // A server error takes the same path with its own code.
    expect(newsletterReturnPath(undefined, "footer", { ok: false, error: "server" })).toBe("/?subscribed=0&error=server#newsletter-footer-server");
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("a rate-limited footer post lands back with a plain error message", async ({ page }) => {
      const ip = freshIp();
      for (let i = 0; i < 10; i++) await postJson(page.request, { email: "not-an-email" }, ip);
      await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
      await page.goto("/");
      const footer = page.getByRole("contentinfo");
      await footer.getByLabel("Weekly launch teardowns").fill(uniqueEmail("nojs-limited"));
      await footer.getByRole("button", { name: "Subscribe" }).click();
      await page.waitForURL((u) => u.searchParams.get("subscribed") === "0" && u.searchParams.get("error") === "rate");
      expect(page.url()).not.toContain("example.com");
      await expect(footer.getByText("Too many attempts. Try again later.")).toBeVisible();
      await expect(footer.getByText("Couldn't subscribe you right now. Please try again.")).toBeHidden();
    });

    test("a signup from a ?qa=1 page is is_test, though no JavaScript ran; the same signup from an untagged page isn't", async ({ page }) => {
      const blog = "/blog/how-to-launch-on-product-hunt";
      const formEvents = async () => (await signupEvents(page.request)).filter((e) => e.properties.submitted === "form");
      for (const [query, tagged] of [["?qa=1", true], ["", false]] as const) {
        const before = (await formEvents()).length;
        await page.setExtraHTTPHeaders({ "x-forwarded-for": freshIp() });
        await page.goto(`${blog}${query}`);
        const block = page.getByTestId("blog-newsletter");
        await block.getByLabel("Email for the launch-day checklist").fill(uniqueEmail("nojs-qa"));
        await block.getByRole("button", { name: "Send me the checklist" }).click();
        await page.waitForURL((u) => u.pathname === blog && u.searchParams.get("subscribed") === "1");
        await expect.poll(async () => (await formEvents()).length).toBe(before + 1);
        const event = (await formEvents()).at(-1)!;
        expect(event.properties).toMatchObject({ placement: "blog", welcome: "sent" });
        if (tagged) expect(event.properties.is_test).toBe(true);
        else expect(event.properties).not.toHaveProperty("is_test");
      }
    });

    test("the browser itself blocks a@b (the field's pattern is the server's rule), so nothing is posted", async ({ page }) => {
      const posts: string[] = [];
      page.on("request", (r) => {
        if (r.url().includes("/api/newsletter")) posts.push(r.url());
      });
      await page.goto("/pricing");
      const field = page.getByRole("contentinfo").getByLabel("Weekly launch teardowns");
      await field.fill("a@b");
      await page.getByRole("contentinfo").getByRole("button", { name: "Subscribe" }).click();
      expect(await field.evaluate((el: HTMLInputElement) => el.validity.patternMismatch)).toBe(true);
      await page.waitForTimeout(500);
      expect(posts).toEqual([]);
      expect(new URL(page.url()).pathname).toBe("/pricing");
      await field.fill("a@b.co");
      expect(await field.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(true);
    });

    test("a server error message shows without JavaScript", async ({ page }) => {
      await page.goto(newsletterReturnPath("/pricing", "footer", { ok: false, error: "server" }));
      await expect(page.getByRole("contentinfo").getByText("Couldn't subscribe you right now. Please try again.")).toBeVisible();
      await expect(page.getByRole("contentinfo").getByText("Too many attempts. Try again later.")).toBeHidden();
    });
  });

  test("with JavaScript, the redirected error code shows its own message", async ({ page }) => {
    await page.goto("/?subscribed=0&error=rate");
    await expect(page.getByRole("contentinfo").getByRole("alert")).toHaveText("Too many attempts. Try again later.");
    await page.goto("/?subscribed=0");
    await expect(page.getByRole("contentinfo").getByRole("alert")).toHaveText("Enter a valid email address.");
  });
});
