import { expect, test } from "@playwright/test";
import { BLOG_POSTS, postPath } from "../../src/lib/blog";
import { expectNewsletterSurvivesNetworkFailure, makeSampleKit } from "./helpers";

// A dropped connection on each newsletter form shows the friendly copy, never the browser's "Failed to fetch".
// The inline blocks only render with NEWSLETTER_INLINE=on, so newsletter-inline.spec.ts covers those two.
const freshIp = () => `203.2.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
test.beforeEach(async ({ context }) => context.setExtraHTTPHeaders({ "x-forwarded-for": freshIp() }));

const CHECKLIST_FORM = { label: "Email for the launch-day checklist", button: "Send me the checklist" };

test("footer form: a network failure keeps the email, says to try again, and the retry subscribes", async ({ page }) => {
  await page.goto("/pricing");
  await expectNewsletterSurvivesNetworkFailure(page, page.getByRole("contentinfo"), { label: "Weekly launch teardowns", button: "Subscribe" });
});

test("end-of-post blog form: a network failure keeps the email, says to try again, and the retry subscribes", async ({ page }) => {
  await page.goto(postPath(BLOG_POSTS[0]));
  await expectNewsletterSurvivesNetworkFailure(page, page.getByTestId("blog-newsletter"), CHECKLIST_FORM);
});

test("kit preview form: a network failure keeps the email, says to try again, and the retry subscribes", async ({ page }) => {
  await makeSampleKit(page);
  await expect(page.getByTestId("preview-newsletter")).toBeVisible();
  await expectNewsletterSurvivesNetworkFailure(page, page.getByTestId("preview-newsletter"), CHECKLIST_FORM);
});
