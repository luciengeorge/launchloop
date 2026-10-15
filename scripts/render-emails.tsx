/**
 * Renders the email templates to HTML and PNG (light and dark) for review:
 *   npx tsx scripts/render-emails.tsx [outDir]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { render } from "@react-email/render";
import { chromium } from "@playwright/test";
import { KitReadyEmail } from "../src/emails/kit-ready";
import { LOGO_PNG_BASE64 } from "../src/emails/logo-data";
import { MagicLinkEmail } from "../src/emails/magic-link";
import { ShipLoopWelcomeEmail } from "../src/emails/ship-loop-welcome";

const out = process.argv[2] ?? "launchloop-emails";
const logo = `data:image/png;base64,${LOGO_PNG_BASE64}`;
// Previews inline the logo; real sends reference it as cid:launchloop-logo.
const withLogo = (html: string) => html.replaceAll("cid:launchloop-logo", logo);

const emails = {
  "magic-link": <MagicLinkEmail {...MagicLinkEmail.PreviewProps} />,
  "kit-ready": <KitReadyEmail {...KitReadyEmail.PreviewProps} />,
  "ship-loop-welcome": <ShipLoopWelcomeEmail {...ShipLoopWelcomeEmail.PreviewProps} />,
};

async function main() {
  await mkdir(out, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, node] of Object.entries(emails)) {
    const html = withLogo(await render(node));
    await writeFile(path.join(out, `${name}.html`), html);
    await writeFile(path.join(out, `${name}.txt`), await render(node, { plainText: true }));
    for (const scheme of ["light", "dark"] as const) {
      const page = await browser.newPage({ viewport: { width: 640, height: 400 }, colorScheme: scheme, deviceScaleFactor: 2 });
      await page.setContent(html, { waitUntil: "load" });
      await page.screenshot({ path: path.join(out, `${name}-${scheme}.png`), fullPage: true });
      await page.close();
    }
  }
  await browser.close();
  console.log(`Rendered ${Object.keys(emails).length} emails to ${out}`);
}

void main();
