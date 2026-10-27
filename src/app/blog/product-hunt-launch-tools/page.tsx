import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { Faq, type FaqItem } from "@/components/guide-faq";
import { ScrollTable } from "@/components/scroll-table";
import { SortableTable, type SortableCell } from "@/components/sortable-table";
import { post, postPath } from "@/lib/blog";
import { postPage } from "@/lib/pages";
import { blogPageMetadata } from "@/lib/seo";
import { OG_PREVIEW, TAGLINE_CHECKER } from "@/lib/tools";

const p = post("product-hunt-launch-tools");

export const metadata: Metadata = blogPageMetadata(postPage(p));

const REPO = {
  url: "https://github.com/emilkowalski/sonner",
  sha: "8e4662b39255120b62138312058f5d77c0139a5e",
  tree: "https://github.com/emilkowalski/sonner/tree/8e4662b39255120b62138312058f5d77c0139a5e",
  license: "https://github.com/emilkowalski/sonner/blob/8e4662b39255120b62138312058f5d77c0139a5e/LICENSE.md",
  homepage: "https://sonner.emilkowal.ski",
} as const;

const PH = {
  launchGuide: "https://help.producthunt.com/en/articles/17350772-launch-guide",
  howToPost: "https://help.producthunt.com/en/articles/479557-how-to-post-a-product",
  preparing: "https://www.producthunt.com/launch/preparing-for-launch",
} as const;

const TOOL = {
  launchloopPricing: "https://launchloop.dev/pricing",
  launchloopHome: "https://launchloop.dev/",
  startkitz: "https://startkitz.com/",
  startkitzKit: "https://startkitz.com/product-hunt-launch-kit",
  shipproofTool: "https://shipproof.io/tools/launch-copy",
  phlaunchkitTool: "https://phlaunchkit.com/tools/product-hunt-tagline-generator",
  chatgptPricing: "https://chatgpt.com/pricing",
  chatgpt: "https://chatgpt.com/",
  screenhanceTool: "https://screenhance.com/product-hunt-gallery-generator",
  screenhancePricing: "https://screenhance.com/pricing",
  mydentifyTool: "https://mydentify.com/tools/launch-image-listing-asset-pack",
  perspectoTool: "https://perspecto.io/product-hunt-mockup-generator",
  perspectoPricing: "https://perspecto.io/pricing",
  whixframeTool: "https://www.whixframe.com/tools/product-hunt-gallery-generator",
  whixframePricing: "https://www.whixframe.com/pricing",
  marketingPack: "https://getmarketingpack.com/",
  marketingPackKit: "https://getmarketingpack.com/product-hunt-launch-kit",
} as const;

const OTHERS = {
  overnightCut: "https://overnightcut.com/tools/launch-copy-writer",
  simpleAppShipper: "https://simpleappshipper.com/launch-kit",
  launchCopy: "https://trylaunchcopy.com",
  launchNudge: "https://launchnudge.ai",
  repomix: "https://repomix.com",
} as const;

const NONE: SortableCell = { text: "None", sort: null };
const n = (value: number, text = String(value)): SortableCell => ({ text, sort: value });
const t = (text: string): SortableCell => ({ text, sort: text });
const run = (start: string, end: string): SortableCell => ({ text: start === end ? start : `${start} to ${end}`, sort: start });

const COLUMNS = [
  { label: "Tool" },
  { label: "Job" },
  { label: "Input" },
  { label: "Taglines" },
  { label: "Longest tagline (chars)" },
  { label: "Description (chars)" },
  { label: "Maker comment (chars)" },
  { label: "Gallery image" },
  { label: "Note" },
  { label: "Run (Paris)" },
] as const;

const ROWS: SortableCell[][] = [
  [{ text: "LaunchLoop (ours)", sort: "LaunchLoop", href: TOOL.launchloopPricing }, t("Copy and images"), t("Repo URL"), n(1), n(54), NONE, NONE, t("1270x760, watermarked"), t("Description and maker comment are in the paid kit"), run("10:07", "10:09")],
  [{ text: "StartKitz", sort: "StartKitz", href: TOOL.startkitz }, t("Copy"), t("Website URL"), n(3, "3, one over 60"), n(79), NONE, NONE, NONE, t("Product Hunt copy is in a paid plan"), run("10:09", "10:10")],
  [{ text: "ShipProof", sort: "ShipProof", href: TOOL.shipproofTool }, t("Copy"), t("Typed text"), n(1), n(43), n(588), n(370), NONE, t("Output described ShipProof, not Sonner"), run("10:12", "10:14")],
  [{ text: "PH LaunchKit", sort: "PH LaunchKit", href: TOOL.phlaunchkitTool }, t("Taglines"), t("Typed text"), n(8), n(48), NONE, NONE, NONE, t("Taglines only, by design"), run("10:12", "10:12")],
  [{ text: "ChatGPT (free, logged out)", sort: "ChatGPT", href: TOOL.chatgpt }, t("Copy"), t("Typed text"), n(1), n(53), n(193), n(716), NONE, t("Its on-screen counts differed from ours"), run("10:13", "10:13")],
  [{ text: "Screenhance", sort: "Screenhance", href: TOOL.screenhanceTool }, t("Gallery images"), t("Screenshot"), NONE, NONE, NONE, NONE, t("1270x760, watermarked"), t("Template text left as it came"), run("10:13", "10:14")],
  [{ text: "Mydentify", sort: "Mydentify", href: TOOL.mydentifyTool }, t("Images"), t("Website URL"), NONE, NONE, NONE, NONE, t("Error, no output"), t("Same error on the one retry"), run("10:14", "10:15")],
  [{ text: "Perspecto", sort: "Perspecto", href: TOOL.perspectoTool }, t("Gallery images"), t("Screenshot"), NONE, NONE, NONE, NONE, t("1270x760, watermarked"), t("Transparent background, the default"), run("10:15", "10:17")],
  [{ text: "WhixFrame", sort: "WhixFrame", href: TOOL.whixframeTool }, t("Gallery images"), t("Screenshot"), NONE, NONE, NONE, NONE, t("1270x760, watermarked"), t("We typed the headline ourselves"), run("10:17", "10:17")],
  [{ text: "Marketing Pack", sort: "Marketing Pack", href: TOOL.marketingPackKit }, t("Copy and images"), t("Website URL"), n(1), n(28), n(162), n(465), t("1270x760, no visible watermark"), t("Read the brand as Emil Kowalski"), run("10:18", "10:19")],
];

const FAQ: FaqItem[] = [
  {
    q: "What are the best Product Hunt launch tools?",
    a: "It depends on the job, so this post doesn't pick one. On 27 October 2026 we ran one open-source repo through the free tier of 10 tools. Two free runs, ChatGPT and Marketing Pack, gave a description about the product within Product Hunt's 260 characters. Five gave a 1270x760 gallery image, four of them watermarked. PH LaunchKit gave the most tagline options, eight, all within 60 characters.",
  },
  {
    q: "How long can a Product Hunt tagline be?",
    a: "60 characters. Product Hunt's Launch Guide says the tagline caps at 60 characters, and its Preparing for launch page says max 60 characters.",
  },
  {
    q: "How long can the Product Hunt description be?",
    a: "Product Hunt's own pages disagree. The Launch Guide and How to post a product say 260 characters, while Preparing for launch says 500. This post tested every description against 260 and also reports whether it fits 500.",
  },
  {
    q: "What size should Product Hunt gallery images be?",
    a: "Product Hunt recommends 1270x760. It is a recommendation, not a requirement. How to post a product says the gallery needs 2 or more images before it is viewable, and Preparing for launch says two are required.",
  },
  {
    q: "Is 1270x760 a 16:9 image?",
    a: "No. 1270x760 is about 1.67:1. A 16:9 image 1270 pixels wide would be about 714 pixels tall.",
  },
  {
    q: "What is in a Product Hunt launch kit?",
    a: "The fields Product Hunt asks for: a tagline of up to 60 characters, a description of up to 260 (500 on one of its pages), a maker comment and at least two gallery images, with 1270x760 recommended. In our test, Marketing Pack was the only free tier that gave a tagline, a description, a maker comment and a gallery image about the product in one run, from its website URL.",
  },
  {
    q: "Can a tool go from a GitHub repo to launch copy?",
    a: "Of the 10 tools we tested, only LaunchLoop took a GitHub repo URL. Its free preview gave a tagline, a product brief, a first X post and three watermarked images; its description and maker comment are in the paid kit, which we didn't buy. LaunchCopy and LaunchNudge also take a repo, but we didn't test them. Their own pages don't mention Product Hunt output, and LaunchCopy asks you to sign up.",
  },
  {
    q: "Do these tools post to Product Hunt for you?",
    a: "We didn't let any of them. Nothing was submitted or posted during the test: every tool's output was copied or downloaded and left there. LaunchLoop, which is ours, never posts anything for you.",
  },
  {
    q: "Is LaunchLoop free?",
    a: "The preview is. It gives a product brief, a Product Hunt tagline, the first post of an X thread and three watermarked images, with no account. The full kit, with the Product Hunt description and maker comment, is a one-off payment. We make LaunchLoop, and it publishes this post.",
  },
];

export default function ProductHuntLaunchToolsPostPage() {
  return (
    <BlogPostLayout post={p}>
      <p>
        On Tuesday 27 October 2026 we ran one public repo through the free tier of 10 Product Hunt launch tools, one run each, and checked what came out against Product
        Hunt&apos;s own limits. The repo is <a href={REPO.url}>emilkowalski/sonner</a>, an MIT-licensed toast component for React, pinned at commit{" "}
        <code>{REPO.sha}</code>. Tools that read a website instead of a repo got Sonner&apos;s live homepage, <a href={REPO.homepage}>sonner.emilkowal.ski</a>, as it was on
        the test day. Every price and free-tier line below was read on the tool&apos;s own pages that morning.
      </p>
      <p>
        LaunchLoop is ours, and it is in the test under the same rules as the others: free tier only, first output only, no paid unlock. There are no scores, rankings or
        winner here, only what each free run gave, with character counts and pixel sizes. If you haven&apos;t launched before, read{" "}
        <Link href={postPath({ slug: "how-to-launch-on-product-hunt" })}>how to launch on Product Hunt</Link> first.
      </p>

      <h2 id="at-a-glance">The results at a glance</h2>
      <p>
        One row per tool, in the order we ran them. Click a column heading to sort by it, and click again to reverse. Character counts are ours, not the tools&apos;. A tool
        that gave no tagline, description or maker comment on its free tier shows None.
      </p>
      <SortableTable
        label="Comparison table: Product Hunt launch tools tested on one repo"
        caption="10 Product Hunt launch tools, one free run each on 27 October 2026: what each produced, with character counts and image sizes. Column headings are buttons that sort the table."
        hintTestId="at-a-glance-scroll-hint"
        columns={COLUMNS}
        rows={ROWS}
      />
      <p>Tested on 27 October 2026, between 10:07 and 10:20 Paris time. n = 10 tools, one run each.</p>

      <h2 id="ph-specs">What Product Hunt asks for</h2>
      <p>Product Hunt states its limits on three pages, and they don&apos;t all agree. All three were read on 27 October 2026.</p>
      <ul>
        <li>
          <strong>Tagline: 60 characters.</strong> The <a href={PH.launchGuide}>Launch Guide</a> says the <q>tagline caps at 60 characters</q>, and{" "}
          <a href={PH.preparing}>Preparing for launch</a> lists <q>Tagline (max 60 characters)</q>.
        </li>
        <li>
          <strong>Description: 260 or 500 characters.</strong> The Launch Guide says <q>260 characters max</q> and{" "}
          <a href={PH.howToPost}>How to post a product</a> says <q>within 260 characters</q>, but Preparing for launch says <q>Description (max 500 characters)</q>. We
          tested every description against 260, the stricter figure, and also report whether it fits 500.
        </li>
        <li>
          <strong>Gallery: 1270x760 recommended, two images or more.</strong> Both How to post a product and Preparing for launch say{" "}
          <q>The recommended size for images in the gallery is 1270x760.</q> That size is recommended, not required. How to post a product adds{" "}
          <q>The gallery will need 2+ images before it is viewable.</q> and Preparing for launch says <q>Gallery images (Two required)</q>.
        </li>
      </ul>
      <p>
        One more piece of arithmetic, because some pages call the gallery size 16:9: 1270x760 is about 1.67:1. A 16:9 image 1270 pixels wide would be about 714 pixels
        tall. To count a tagline the way we did, paste it into the free <Link href={TAGLINE_CHECKER.path}>Product Hunt tagline checker</Link>.
      </p>

      <h2 id="method">How we tested</h2>
      <ul>
        <li>
          <strong>One repo, fixed in advance.</strong> <a href={REPO.tree}>Sonner at commit 8e4662b</a>, under the <a href={REPO.license}>MIT licence</a>. Neither we nor
          any tested tool owns it. Its main branch was still at that commit after the run.
        </li>
        <li>
          <strong>Four frozen inputs.</strong> Each tool got whichever it asks for: the repo URL, the homepage URL, a text blurb (the README&apos;s first paragraph, word
          for word, without its link markup) or a screenshot of the homepage at 1440x900, captured that morning. One tool took the repo URL, three took the website URL,
          three took typed text and three took the screenshot.
        </li>
        <li>
          <strong>Free tier only.</strong> No trial that needs a card, no paid unlock and no email trial. No tool asked for a card or an account, so none had to be skipped.
          The browser we used for LaunchLoop happened to be signed in to our own account; its free preview doesn&apos;t need one.
        </li>
        <li>
          <strong>One run, first output.</strong> No regenerating to pick a better answer. A tool that showed an error got one retry, and we say so.
        </li>
        <li>
          <strong>Counting.</strong> Characters are Unicode code points after trimming, the same rule as our tagline checker, so an emoji counts as one. Where a tool showed
          its own count we compared it with ours. Image sizes were read from the downloaded files, not from the tools&apos; labels.
        </li>
      </ul>
      <p>
        AI output changes from run to run, so this is a snapshot of one morning. Screenshots of every run are on file.
      </p>

      <h2 id="copy-tools">Tools that write your listing copy</h2>
      <p>
        For writing a tagline by hand, see <Link href="/how-to-write-a-product-hunt-tagline">how to write a Product Hunt tagline</Link>. Here is what each tool wrote for
        Sonner.
      </p>

      <h3 id="launchloop">LaunchLoop (ours)</h3>
      <p>
        <strong>Input:</strong> the repo URL. <strong>Free tier:</strong> its <a href={TOOL.launchloopPricing}>pricing page</a> lists the free preview as{" "}
        <q>Product brief from your repo</q>, <q>Product Hunt tagline</q>, <q>First post of your X thread</q> and <q>3 watermarked images</q>, with{" "}
        <q>Public repos only. 10 per hour, 40 per day.</q> and <q>Paste a public GitHub repo or your live site. No account needed.</q>
      </p>
      <p>
        <strong>What it gave:</strong> one tagline, <q>Toast notifications for React with built-in animations</q>, 54 characters, which matches the 54/60 the tool showed. A
        product brief, a first X post and three watermarked images: 1200x630, 1600x900 and a 1270x760 Product Hunt image. No description and no maker comment: those are in
        the paid kit, which we didn&apos;t buy, so LaunchLoop gets None in those columns like every other tool whose free tier lacks them.
      </p>
      <p>
        <strong>What we noticed:</strong> on the Product Hunt image, the browser frame showed a mostly white capture of the homepage.
      </p>

      <h3 id="startkitz">StartKitz</h3>
      <p>
        <strong>Input:</strong> the website URL. Its <a href={TOOL.startkitzKit}>launch kit page</a> says <q>StartKitz reads your product&apos;s landing page</q>.{" "}
        <strong>Free tier:</strong> the <a href={TOOL.startkitz}>homepage</a> says <q>Free to generate. No account required. Results in under 30 seconds.</q> Its pricing
        block lists <q>Product Hunt + Hacker News launch copy</q> and <q>Product Hunt topics + first comment</q> under <q>Starter $19 one-time</q>, not under Free.
      </p>
      <p>
        <strong>What it gave:</strong> five one-liners and three taglines, <q>Custom Toasts, Simplified</q> (25 characters), <q>Customize React toasts with ease</q> (32)
        and <q>Effortless notification customization for React developers seeking flexibility.</q> (79). The third is over 60. StartKitz labelled it long and showed its
        79 characters itself, and its taglines are positioning lines rather than ones labelled for Product Hunt. No Product Hunt description or maker comment: that copy is
        in a paid plan. The free preview also gave a launch score, headline variants and draft X, LinkedIn and Reddit posts.
      </p>

      <h3 id="shipproof">ShipProof</h3>
      <p>
        <strong>Input:</strong> typed fields: the name, the blurb as the pitch and the problem, and React developers as the audience. <strong>Free tier:</strong> the{" "}
        <a href={TOOL.shipproofTool}>launch copy generator</a> says <q>Free • No signup required • Powered by Claude AI</q>.
      </p>
      <p>
        <strong>What it gave:</strong> a Product Hunt tagline, description, maker comment and first comment, an X thread and a Reddit post. On 27 October all of it
        described ShipProof itself, not Sonner, although the form showed our inputs filled in. Our screenshots show both. No error appeared, and under our first-output rule
        we didn&apos;t regenerate, so we can&apos;t say whether this happens every time. For the record, its tagline was 43 characters, its description 588 (over both 260
        and 500) and its maker comment 370.
      </p>

      <h3 id="ph-launchkit">PH LaunchKit</h3>
      <p>
        <strong>Input:</strong> typed fields: the name, Developer Tools as the category, React developers as the audience, and the blurb. <strong>Free tier:</strong> its{" "}
        <a href={TOOL.phlaunchkitTool}>tagline generator</a> says{" "}
        <q>Yes. Describe your product and you get 8 tagline options tuned to the 60-character limit, free and without an account.</q>
      </p>
      <p>
        <strong>What it gave:</strong> eight taglines, all within 60 characters, from 37 to 48. Its own counts matched ours for all eight. The shortest was{" "}
        <q>Ship polished React toasts in minutes</q> and the longest <q>React toast notifications without the setup pain</q>. It is a tagline tool, so no description or
        maker comment was expected.
      </p>

      <h3 id="chatgpt">ChatGPT (free, logged out)</h3>
      <p>
        <strong>Input:</strong> the same blurb and the repo URL, typed into a logged-out chat. <strong>Free tier:</strong> its{" "}
        <a href={TOOL.chatgptPricing}>pricing page</a> says <q>The free version of ChatGPT is available to everyone.</q> The chat worked without logging in.
      </p>
      <p>
        <strong>What it gave:</strong> a tagline, <q>Beautiful toast notifications for React, made simple.</q> (53 characters), a description,{" "}
        <q>
          Meet Sonner, an opinionated toast component for React. Create beautiful, customizable notifications with a delightful developer experience and minimal setup.
          Just install, integrate, and toast!
        </q>{" "}
        (193 characters, within 260 and 500), and a maker comment of 716 characters that links the repo.
      </p>
      <p>
        <strong>What we noticed:</strong> the interface showed 43/60 for the tagline and 143/260 for the description. Our counts are 53 and 193. Both are within Product
        Hunt&apos;s limits either way, but if you rely on a count, check it with a counter of your own.
      </p>

      <h3 id="marketing-pack">Marketing Pack</h3>
      <p>
        <strong>Input:</strong> the website URL. Its <a href={TOOL.marketingPack}>homepage</a> says{" "}
        <q>Paste a public website URL to get source-backed launch copy, Product Hunt assets, an X post, screenshots, and a downloadable ZIP.</q>{" "}
        <strong>Free tier:</strong> <q>One free pack every 30 days. Additional packs are $5 each.</q> We used the free monthly pack; it asked for no email and no sign-in.
        Its <a href={TOOL.marketingPackKit}>Product Hunt page</a> lists <q>Tagline: up to 60 characters.</q>, <q>Description: up to 260 characters.</q> and{" "}
        <q>Maker comment: up to 2,000 characters.</q>
      </p>
      <p>
        <strong>What it gave:</strong> in about a minute and a half, a tagline, <q>Opinionated toasts for React</q> (28 characters), a description,{" "}
        <q>
          Sonner is an opinionated React toast component with configurable positions, types, actions, promises, loading states, custom content, themes, and styling
          options.
        </q>{" "}
        (162 characters, within 260 and 500), and a maker comment that opens with <q>Draft: personalize this maker comment before posting.</q> It is 465 characters with
        that line and 411 without. It also gave one 1270x760 gallery image, an X post draft and a ZIP. It detected the brand name as Emil Kowalski, the author&apos;s name,
        rather than Sonner; the copy itself names Sonner.
      </p>

      <h2 id="gallery-tools">Tools that make gallery images</h2>
      <p>
        Four tools here only make images: three took our homepage screenshot and Mydentify took the URL. LaunchLoop and Marketing Pack, above, made one image each as part
        of a wider output. We measured every file. Our free <Link href={OG_PREVIEW.path}>OG image preview</Link> checks the 1200x630 card your link shows when it is shared, not the Product Hunt gallery, so use
        it for that card only.
      </p>

      <h3 id="screenhance">Screenhance</h3>
      <p>
        <strong>Input:</strong> the screenshot, in the first template, PH Sorbet Launch, with its stock headline text left as it came. <strong>Free tier:</strong> its{" "}
        <a href={TOOL.screenhanceTool}>gallery generator</a> says <q>Pre-sized to 1270×760. Pick a template, drop in your screenshots, and export your gallery.</q> and the{" "}
        <a href={TOOL.screenhancePricing}>pricing page</a> says{" "}
        <q>
          Yes. The free plan includes 3 exports per month with every template and device frame unlocked, plus screen recordings up to 5 minutes with a watermarked video
          preview. No credit card is required.
        </q>
      </p>
      <p>
        <strong>What it gave:</strong> one PNG at 1270x760, with no sign-in. The pricing page says{" "}
        <q>Free plan exports include a small &quot;Made with Screenhance&quot; mark in the bottom corner.</q> On our export, Made with Screenhance was tiled diagonally
        across the image. The download screen offered watermark-free exports for $12 a month or a $6 one-time pass.
      </p>

      <h3 id="mydentify">Mydentify</h3>
      <p>
        <strong>Input:</strong> the website URL; the tool takes a URL only. <strong>Free tier:</strong> its <a href={TOOL.mydentifyTool}>asset pack page</a> says{" "}
        <q>No account required</q> and lists a <q>1200×630 social cover, 1600×900 launch cover, and 1270×760 Product Hunt gallery image</q> among its outputs.
      </p>
      <p>
        <strong>What it gave:</strong> no output on 27 October. After we clicked Build asset pack it showed the error <q>Input buffer contains unsupported image format</q>.
        We retried once and got the same error.
      </p>

      <h3 id="perspecto">Perspecto</h3>
      <p>
        <strong>Input:</strong> the screenshot, in its Product Hunt template, at its Product Hunt 1270x760 size and 1x, with the default transparent background.{" "}
        <strong>Free tier:</strong> its <a href={TOOL.perspectoPricing}>pricing page</a> says <q>Free $0 No sign-up, no card.</q> and <q>3 PNG exports a day, at 1×</q>, and
        the <a href={TOOL.perspectoTool}>mockup generator</a> says <q>Free with a small watermark; Pro ($19 once) removes it and exports at up to 4×.</q>
      </p>
      <p>
        <strong>What it gave:</strong> one PNG at 1270x760 with a small via perspecto.io watermark, as its page says. Because we kept the default transparent background, the
        tilted screenshot sits on transparency, which some viewers show as white.
      </p>

      <h3 id="whixframe">WhixFrame</h3>
      <p>
        <strong>Input:</strong> the screenshot, in the free no-signup tool, with the browser frame, the Product Hunt gallery 1270x760 size and the first background preset.
        We typed the headline and subheadline ourselves, and left the frame&apos;s address bar at its default, acme.com. <strong>Free tier:</strong> its{" "}
        <a href={TOOL.whixframeTool}>gallery tool</a> says{" "}
        <q>Yes. It runs in your browser with no account and no download limit. Exports include a small WhixFrame watermark.</q>
      </p>
      <p>
        <strong>What it gave:</strong> one PNG at 1270x760 with a Made with whixframe.com watermark in the corner, as its page says. The AI version needs an account, so we
        didn&apos;t use it.
      </p>

      <h2 id="repo-to-launch-copy">GitHub repo to launch copy: one repo, side by side</h2>
      <p>
        This is the same repo and commit, with what its own files say next to what each tool wrote. At commit 8e4662b, Sonner&apos;s <code>package.json</code> gives the
        name sonner, version 2.0.8, the MIT licence, the homepage and the description <q>An opinionated toast component for React.</q> Its keywords are react,
        notifications, toast, snackbar and message, and it works with React 18 and 19. The README opens with the same sentence, links a post on why and how it was built,
        and shows <code>npm install sonner</code>, a <code>&lt;Toaster /&gt;</code> and a call to <code>toast()</code>.
      </p>
      <ScrollTable
        label="Repo facts next to generated launch copy"
        caption="What each tool wrote for Sonner, with the input it took and our character counts"
        hintTestId="repo-copy-scroll-hint"
      >
        <thead>
          <tr className="border-b border-border text-foreground">
            <th scope="col" className="py-2 pr-4 font-medium">Tool</th>
            <th scope="col" className="py-2 pr-4 font-medium">Input it took</th>
            <th scope="col" className="py-2 pr-4 font-medium">Tagline (chars)</th>
            <th scope="col" className="py-2 pr-4 font-medium">Description (chars)</th>
            <th scope="col" className="py-2 font-medium">Maker comment (chars)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">The repo itself</th>
            <td className="py-2 pr-4 align-top">package.json and README</td>
            <td className="py-2 pr-4 align-top">None; the package description is 41</td>
            <td className="py-2 pr-4 align-top">None</td>
            <td className="py-2 align-top">None</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">LaunchLoop (ours)</th>
            <td className="py-2 pr-4 align-top">Repo URL</td>
            <td className="py-2 pr-4 align-top">Toast notifications for React with built-in animations (54)</td>
            <td className="py-2 pr-4 align-top">In the paid kit, not tested</td>
            <td className="py-2 align-top">In the paid kit, not tested</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">ChatGPT</th>
            <td className="py-2 pr-4 align-top">Typed blurb and repo URL</td>
            <td className="py-2 pr-4 align-top">Beautiful toast notifications for React, made simple. (53)</td>
            <td className="py-2 pr-4 align-top">193</td>
            <td className="py-2 align-top">716</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Marketing Pack</th>
            <td className="py-2 pr-4 align-top">Website URL</td>
            <td className="py-2 pr-4 align-top">Opinionated toasts for React (28)</td>
            <td className="py-2 pr-4 align-top">162</td>
            <td className="py-2 align-top">465, or 411 without its draft line</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">PH LaunchKit</th>
            <td className="py-2 pr-4 align-top">Typed blurb</td>
            <td className="py-2 pr-4 align-top">8 options, 37 to 48</td>
            <td className="py-2 pr-4 align-top">None</td>
            <td className="py-2 align-top">None</td>
          </tr>
          <tr>
            <th scope="row" className="py-2 pr-4 align-top font-normal">StartKitz</th>
            <td className="py-2 pr-4 align-top">Website URL</td>
            <td className="py-2 pr-4 align-top">3 options, 25, 32 and 79</td>
            <td className="py-2 pr-4 align-top">In a paid plan</td>
            <td className="py-2 align-top">In a paid plan</td>
          </tr>
        </tbody>
      </ScrollTable>
      <p>What the side-by-side shows:</p>
      <ul>
        <li>
          <strong>Every tool that wrote about Sonner used the words React and toast.</strong> Both are in the package description, so any tool that read the README, the
          homepage or our blurb had them.
        </li>
        <li>
          <strong>Some details come from beyond the README.</strong> LaunchLoop&apos;s tagline says built-in animations, and StartKitz&apos;s taglines stress customization.
          Neither word is in the README or package.json at that commit. LaunchLoop&apos;s brief lists the features it found in the repo, and StartKitz reads the homepage.
          Marketing Pack&apos;s description lists positions, promises, loading states and themes, and its maker comment says Sonner&apos;s documentation covers them. LaunchLoop&apos;s brief also
          gave the version as v2.0.8, which matches package.json.
        </li>
        <li>
          <strong>Only one took the repo.</strong> LaunchLoop read the repo URL. ChatGPT got the repo URL along with the typed blurb; Marketing Pack and StartKitz read the
          website; PH LaunchKit worked from the blurb alone.
        </li>
        <li>
          <strong>LaunchLoop&apos;s description and maker comment weren&apos;t tested.</strong> They are in the paid kit, so this comparison only has its free tagline and
          brief.
        </li>
      </ul>
      <h3 id="repo-in-tools">Other repo-in and launch copy tools we found</h3>
      <p>
        These came up after the test list was fixed on 25 October, so we didn&apos;t run them. Each line is from the tool&apos;s own page, read on 27 October 2026.
      </p>
      <ul>
        <li>
          <strong><a href={OTHERS.overnightCut}>Overnight Cut</a></strong> takes typed answers, not a repo:{" "}
          <q>Answer a few questions and get a Product Hunt tagline, description and first comment, plus an X post and a LinkedIn post, with live character counts.</q> It is{" "}
          <q>Free tool · no signup</q>, and <q>It uses templates, not AI, and it runs in your browser: nothing you type is sent to us.</q> It gives the description limit as
          500, the figure on Product Hunt&apos;s Preparing for launch page.
        </li>
        <li>
          <strong><a href={OTHERS.simpleAppShipper}>Simple App Shipper</a></strong> takes typed fields and an optional App Store or landing URL, and offers{" "}
          <q>5 free kits per day per account</q>, so it needs an account.
        </li>
        <li>
          <strong><a href={OTHERS.launchCopy}>LaunchCopy</a></strong> takes a repo:{" "}
          <q>Paste a GitHub URL and let our AI turn your codebase into ready-to-publish social posts, blog articles, and case studies.</q> Its free plan is{" "}
          <q>Try it out with one scan</q>, behind a sign-up. Its page doesn&apos;t mention Product Hunt output.
        </li>
        <li>
          <strong><a href={OTHERS.launchNudge}>LaunchNudge</a></strong> takes a repo or changelog:{" "}
          <q>LaunchNudge&apos;s AI turns your repo into viral HN, Reddit, and X posts in 5 minutes.</q> It is taking sign-ups for early access:{" "}
          <q>Join the waiting list for early access and a shot at free lifetime upgrades.</q> Its page states no free tier and doesn&apos;t mention Product Hunt.
        </li>
        <li>
          <strong><a href={OTHERS.repomix}>Repomix</a></strong> writes no copy itself. It is MIT-licensed, offers to{" "}
          <q>Pack your codebase into AI-friendly formats</q>, and says that once it is packed <q>you can send it to an AI assistant (like ChatGPT, Claude)</q>. That is
          the ChatGPT row above with more of the repo pasted in.
        </li>
      </ul>

      <h2 id="gaps">What the free tiers left out of a Product Hunt launch kit</h2>
      <p>Raw counts from the 10 tools on 27 October 2026, one run each:</p>
      <ul>
        <li>
          <strong>Taglines:</strong> 6 of 10 tools gave at least one, 15 taglines in all. 14 were within 60 characters and 1 was over. One tool&apos;s tagline (ShipProof)
          described a different product.
        </li>
        <li>
          <strong>Descriptions:</strong> 3 of 10 gave one. 2 were about Sonner and within 260 (ChatGPT at 193, Marketing Pack at 162), and 1 was 588 characters and about
          ShipProof.
        </li>
        <li>
          <strong>Maker comments:</strong> 3 of 10 gave one: ChatGPT, Marketing Pack and ShipProof (about ShipProof).
        </li>
        <li>
          <strong>Gallery images:</strong> 5 of 10 gave a Product Hunt image, all 5 at exactly 1270x760. 4 were watermarked (LaunchLoop, Screenhance, Perspecto, WhixFrame)
          and 1 had no visible watermark (Marketing Pack). Each run gave one image, and Product Hunt wants two or more, so you would need a second run or a second tool.
        </li>
        <li>
          <strong>Everything at once:</strong> 1 of 10 free runs, Marketing Pack, gave a tagline, a description, a maker comment and a gallery image about the product.
        </li>
        <li>
          <strong>Errors:</strong> 1 of 10 (Mydentify) gave no output after one retry. 0 needed a card or an account.
        </li>
      </ul>

      <h2 id="check">Check your own listing before you submit</h2>
      <p>Whatever wrote your copy, check it yourself before it goes on Product Hunt:</p>
      <ul>
        <li>
          <strong>Count the tagline.</strong> The <Link href={TAGLINE_CHECKER.path}>Product Hunt tagline checker</Link> counts it against the 60-character limit and flags
          hype words and emoji. One tool&apos;s on-screen counts didn&apos;t match ours in this test.
        </li>
        <li>
          <strong>Count the description against 260.</strong> If it fits 260, it fits every Product Hunt page.
        </li>
        <li>
          <strong>Read it for the right product.</strong> One run here described the tool instead of the product, and one read the brand as the author&apos;s name.
        </li>
        <li>
          <strong>Make two gallery images or more.</strong> 1270x760 is the recommended size. Check the file&apos;s real pixel size, and whether the free export is
          watermarked.
        </li>
        <li>
          <strong>Check your share card.</strong> The <Link href={OG_PREVIEW.path}>OG image preview</Link> shows the 1200x630 card your link gets on X, LinkedIn and Slack.
          It doesn&apos;t check the gallery.
        </li>
      </ul>
      <p>
        Then work through the <Link href="/product-hunt-launch-checklist">Product Hunt launch checklist</Link>. If Product Hunt isn&apos;t your only launch, see{" "}
        <Link href={postPath({ slug: "product-hunt-alternatives" })}>Product Hunt alternatives</Link> for where else to post.
      </p>

      <h2 id="left-out">Tools we left out or skipped, and why</h2>
      <ul>
        <li>
          <strong>Skipped for needing a card or an account:</strong> none of the 10. The account-only parts of two tools, WhixFrame&apos;s AI version and Perspecto&apos;s
          email trial, weren&apos;t used.
        </li>
        <li>
          <strong>Ran but gave nothing:</strong> Mydentify, which showed an error twice. It stays in the table and the counts.
        </li>
        <li>
          <strong>Found too late for the test:</strong> Overnight Cut, Simple App Shipper, LaunchCopy, LaunchNudge and Repomix, covered from their own pages{" "}
          <a href="#repo-in-tools">above</a>.
        </li>
        <li>
          <strong>Out of scope:</strong> general design tools, directory submission services and tools that turn commits into social posts without Product Hunt output. We
          also left out tools whose free tier we couldn&apos;t confirm on their own pages.
        </li>
      </ul>

      <p>
        LaunchLoop is ours. It isn&apos;t a launch platform and it doesn&apos;t post for you: it drafts launch copy and images from your repo or live site. Its free preview,
        the one tested here, gives a product brief, a Product Hunt tagline, the first post of an X thread and three watermarked images. The paid kit, a one-off payment,
        adds the Product Hunt description and maker comment, the rest of the X thread, landing copy, a LinkedIn post and unwatermarked images. We held it to the same rules
        as every other tool. Try it with a <Link href="/#start">free preview</Link> or see <Link href="/pricing">pricing</Link>.
      </p>

      <Faq path={postPath(p)} title="Product Hunt launch tools: FAQ" items={FAQ} />

      <h2 id="sources">Sources</h2>
      <p>
        Checked as of October 2026. Quotes were read from each site&apos;s own pages on 27 October 2026, between 10:07 and 10:09 Paris time, and the test outputs were
        recorded the same morning between 10:07 and 10:20. Repo facts are from Sonner&apos;s README, package.json and licence at commit 8e4662b. Prices change, so check
        before you pay.
      </p>
      <ul>
        <li>
          <a href={PH.launchGuide}>Launch Guide</a>, <a href={PH.howToPost}>How to post a product</a> and <a href={PH.preparing}>Preparing for launch</a>, Product Hunt
        </li>
        <li><a href={REPO.tree}>emilkowalski/sonner at commit 8e4662b</a> and its <a href={REPO.license}>MIT licence</a>, GitHub</li>
        <li><a href={TOOL.launchloopPricing}>Pricing</a> and <a href={TOOL.launchloopHome}>homepage</a>, LaunchLoop</li>
        <li><a href={TOOL.startkitz}>Homepage and pricing block</a> and <a href={TOOL.startkitzKit}>Product Hunt launch kit</a>, StartKitz</li>
        <li><a href={TOOL.shipproofTool}>AI Launch Copy Generator</a>, ShipProof</li>
        <li><a href={TOOL.phlaunchkitTool}>Product Hunt tagline generator</a>, PH LaunchKit</li>
        <li><a href={TOOL.chatgptPricing}>Pricing</a>, ChatGPT</li>
        <li><a href={TOOL.screenhanceTool}>Product Hunt gallery generator</a> and <a href={TOOL.screenhancePricing}>pricing</a>, Screenhance</li>
        <li><a href={TOOL.mydentifyTool}>Launch Image and Listing Asset Pack</a>, Mydentify</li>
        <li><a href={TOOL.perspectoTool}>Product Hunt mockup generator</a> and <a href={TOOL.perspectoPricing}>pricing</a>, Perspecto</li>
        <li><a href={TOOL.whixframeTool}>Product Hunt gallery generator</a> and <a href={TOOL.whixframePricing}>pricing</a>, WhixFrame</li>
        <li><a href={TOOL.marketingPack}>Homepage</a> and <a href={TOOL.marketingPackKit}>Product Hunt launch kit</a>, Marketing Pack</li>
        <li>
          <a href={OTHERS.overnightCut}>Overnight Cut</a>, <a href={OTHERS.simpleAppShipper}>Simple App Shipper</a>, <a href={OTHERS.launchCopy}>LaunchCopy</a>,{" "}
          <a href={OTHERS.launchNudge}>LaunchNudge</a> and <a href={OTHERS.repomix}>Repomix</a>
        </li>
      </ul>
    </BlogPostLayout>
  );
}
