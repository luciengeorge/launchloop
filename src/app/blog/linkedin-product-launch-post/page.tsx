import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { CopyButton } from "@/components/copy-button";
import { Faq, type FaqItem } from "@/components/guide-faq";
import { ScrollTable } from "@/components/scroll-table";
import { post, postPath } from "@/lib/blog";
import { LINKEDIN_EXAMPLES, LINKEDIN_TEMPLATE } from "@/lib/linkedin-launch-examples";
import { postPage } from "@/lib/pages";
import { blogPageMetadata } from "@/lib/seo";
import { OG_PREVIEW } from "@/lib/tools";

const p = post("linkedin-product-launch-post");
export const metadata: Metadata = blogPageMetadata(postPage(p));

const SRC = {
  posts: "https://www.linkedin.com/help/linkedin/answer/a528176",
  links: "https://www.linkedin.com/help/linkedin/answer/a525301",
  shareable: "https://www.linkedin.com/help/linkedin/answer/a521928",
  inspectorHelp: "https://www.linkedin.com/help/linkedin/answer/a6233775",
  inspector: "https://www.linkedin.com/post-inspector/",
  pricing: "https://launchloop.dev/pricing",
} as const;

const FAQ: FaqItem[] = [
  {
    q: "What should a LinkedIn product launch post include?",
    a: "Our suggested structure is a specific audience and job, a concrete product detail, a working link and one useful feedback question. Treat it as an editing aid, not a LinkedIn rule. Replace every placeholder and check each feature against your docs before posting.",
  },
  {
    q: "How long can a LinkedIn launch post be?",
    a: "As of 11 November 2026, LinkedIn Help says posts can contain up to 3,000 characters. That is a ceiling, not a target. The example counts here include line breaks and the literal URL, using Array.from(text.trim()).length. They are editorial counts, not a test of LinkedIn's composer. Check your final version there before publishing.",
  },
  {
    q: "Are these real LinkedIn product launch posts?",
    a: "No. They are illustrative drafts written for this guide from three public README files checked on 11 November 2026. They are not published posts, statements from the maintainers or LaunchLoop kit outputs. We measured text length, not reach, clicks or signups.",
  },
  {
    q: "Should I put my product link in the post or a comment?",
    a: "Our template puts the link in the post so the reader has a direct next step. This is an editorial choice, not a promise about feed ranking. As of 11 November 2026, LinkedIn's Share articles or links help page describes pasting a URL into a post and checking the preview. We make no reach claim for either placement.",
  },
  {
    q: "Can LaunchLoop draft my LinkedIn launch post?",
    a: "Yes. LaunchLoop is ours, and its pricing page lists a LinkedIn post in the full Launch Kit as of 11 November 2026. Start with the free preview to see the product brief and sample launch assets, then check pricing for the full kit. Review any draft against your product before you publish it yourself.",
  },
];

export default function LinkedInProductLaunchPostPage() {
  return (
    <BlogPostLayout post={p}>
      <p>
        A useful LinkedIn product launch post tells a specific person what they can do with your product, shows a concrete detail and gives them a link to try it.
        Below are three structures, a copyable template and worked examples based on public repos. These are writing examples, not evidence of what gets reach.
        LaunchLoop is ours.
      </p>

      <h2 id="structure">Choose a structure that matches what you can show</h2>
      <p>
        Start with the evidence you already have. If your strongest material is a working interaction, describe that interaction. If it is a clear setup example,
        lead with the job it helps someone do. There is no need to invent a founder story to introduce a useful tool.
      </p>
      <ScrollTable label="LinkedIn launch post structures" caption="Editorial structures, not LinkedIn ranking rules" hintTestId="linkedin-structures-hint">
        <thead>
          <tr className="border-b border-border text-foreground">
            <th scope="col" className="py-2 pr-4 font-medium">Structure</th>
            <th scope="col" className="py-2 pr-4 font-medium">Lead with</th>
            <th scope="col" className="py-2 font-medium">Bring evidence</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Feature-led</th>
            <td className="py-2 pr-4 align-top">A specific action the product supports</td>
            <td className="py-2 align-top">Docs or a working example, rather than a list of adjectives</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Demo-led</th>
            <td className="py-2 pr-4 align-top">What the reader will see happen</td>
            <td className="py-2 align-top">A real demo or a reproducible walkthrough</td>
          </tr>
          <tr>
            <th scope="row" className="py-2 pr-4 align-top font-normal">Usage-led</th>
            <td className="py-2 pr-4 align-top">The job and a way to get started</td>
            <td className="py-2 align-top">Setup instructions and any relevant trade-offs</td>
          </tr>
        </tbody>
      </ScrollTable>
      <p>
        A personal opening is fine when it is true. Write about your own reason for building the product, not an imagined struggle. If you do not have customer numbers,
        leave them out. A specific feature gives a reader more to work with than an unsupported claim that everyone loves your app.
      </p>

      <h2 id="template">A copyable LinkedIn product launch post template</h2>
      <p>
        Replace the bracketed text with facts from your product. Keep the first line useful on its own and use short paragraphs so you can scan the draft.
        Those are writing choices, not claims about a fixed feed cutoff. Ask a question you actually want answered, rather than asking people to comment for a link.
      </p>
      <pre className="whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/50 p-4 text-sm" data-testid="linkedin-template">{LINKEDIN_TEMPLATE}</pre>
      <CopyButton text={LINKEDIN_TEMPLATE} label="Copy post template" />
      <p>
        Read it once without the product name. Could it describe any app? Replace vague phrases with the action a reader can try. Then check that the linked page explains
        the same thing as the post. If you invite feedback on an unfinished feature, say what is available now and what is still planned.
      </p>

      <h2 id="examples">Three repo-based product launch post examples</h2>
      <p>
        These are illustrative drafts written for this guide, not published posts, statements by the maintainers or LaunchLoop kit outputs. The facts come from each linked
        README, frozen to a commit and read on 11 November 2026. We did not launch these projects or measure engagement. Each example shows a different starting point,
        followed by an edit to consider for your own product.
      </p>
      <p>
        Counts below use <code>Array.from(text.trim()).length</code>, including blank lines and the literal URL. All example text is ASCII, so code-point and JavaScript
        string-length counts agree. These are reproducible editorial counts, not a test of LinkedIn&apos;s composer or its handling of other Unicode text.
      </p>
      {LINKEDIN_EXAMPLES.map((example) => (
        <section key={example.id} aria-labelledby={`example-${example.id}`} className="space-y-4">
          <h3 id={`example-${example.id}`}>{example.name}: {example.structure.toLowerCase()}</h3>
          <p>
            <a href={`https://github.com/${example.repo}/blob/${example.sha}/README.md`}>Source README at <code>{example.sha.slice(0, 7)}</code></a>.
            {" "}{example.evidence}
          </p>
          <pre className="whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/50 p-4 text-sm" data-testid={`linkedin-example-${example.id}`}>{example.text}</pre>
          <p data-testid={`linkedin-count-${example.id}`}>{Array.from(example.text.trim()).length} characters, below the 3,000-character ceiling documented as of 11 November 2026.</p>
          <CopyButton text={example.text} label={`Copy ${example.name} example`} />
          <p><strong>Before using this structure:</strong> {example.edit}</p>
        </section>
      ))}

      <h2 id="limits">LinkedIn&apos;s post limit, from its own help page</h2>
      <p>
        As of 11 November 2026, LinkedIn&apos;s <a href={SRC.posts}>Post and share updates</a> help article says <q>Posts can contain up to 3,000 characters.</q>
        Use that as the maximum, not a reason to fill the space. After editing, paste the final text into the composer and check it before publishing.
        This guide gives no fixed character threshold for feed truncation and no advice based on an assumed link-reach penalty.
      </p>
      <p>
        Keep a single clear next step. A product trial, a demo and an email signup are different requests. Pick the one the linked page actually supports.
        You can ask a feedback question too, but make it about the product&apos;s job rather than demanding praise or inventing urgency.
      </p>

      <h2 id="link-preview">Check the link preview before launch day</h2>
      <p>
        As of 11 November 2026, LinkedIn&apos;s <a href={SRC.links}>Share articles or links</a> instructions say to paste the URL into the post and allow a few seconds for
        a preview image. They also say you can share the update as a link if an image cannot be retrieved. Inspect the result rather than assuming a good page title
        means the share card is ready.
      </p>
      <p>
        LinkedIn&apos;s <a href={SRC.shareable}>Make your website shareable</a> help page, checked as of 11 November 2026, asks for Open Graph tags and lists a minimum
        image size of 1200 by 627 pixels, a recommended ratio of 1.91:1 and a maximum file size of 5 MB for shared links. These are shared-link requirements, not the
        separate ad specifications later on that page. Our <Link href={OG_PREVIEW.path}>OG image preview</Link> helps inspect your page&apos;s tags and image;
        it does not reproduce LinkedIn&apos;s exact renderer. See the <Link href={postPath({ slug: "og-image-size" })}>OG image size guide</Link> for the broader setup.
      </p>
      <p>
        If the card is stale, LinkedIn&apos;s <a href={SRC.inspectorHelp}>Post Inspector help</a>, checked as of 11 November 2026, says its tool can refresh the URL.
        Use <a href={SRC.inspector}>Post Inspector</a> and confirm the preview. The help page says this affects new posts only; existing posts keep their old preview.
      </p>

      <h2 id="before-publishing">Before you publish</h2>
      <ul>
        <li>Check each product claim against a current doc, demo or release note.</li>
        <li>Replace every placeholder. Remove any feature that is not available yet, or clearly label it as planned.</li>
        <li>Open the public link without a login and check that the intended next step works.</li>
        <li>Inspect the preview and read the final draft in the composer. Do not rely on the example count after you edit.</li>
        <li>Only describe a launch result after it happens. A text-length check is not an engagement test.</li>
      </ul>
      <p>
        LaunchLoop&apos;s <a href={SRC.pricing}>pricing page</a>, read as of 11 November 2026, lists a LinkedIn post in the full Launch Kit. LaunchLoop is ours.
        Start with a <Link href="/#start">free preview</Link> to see the brief and sample launch assets, or check <Link href="/pricing">pricing</Link> for the full kit.
        The examples above are separate editorial drafts. For another channel, our <Link href={postPath({ slug: "chatgpt-vs-product-hunt-launch-kits" })}>ChatGPT versus launch kits comparison</Link>
        {" "}shows a dated Product Hunt copy test, not evidence about LinkedIn performance.
      </p>

      <Faq items={FAQ} path={postPath(p)} title="LinkedIn product launch post: FAQ" />

      <h2 id="sources">Sources</h2>
      <p>
        Checked as of November 2026. Every source below was fetched in this source check, as of 11 November 2026.
        Platform behaviour can change. The structures and feedback questions are editorial suggestions, not platform rules or tested growth advice.
      </p>
      <ul>
        <li><a href={SRC.posts}>Post and share updates</a>, LinkedIn Help: post limit.</li>
        <li><a href={SRC.links}>Share articles or links</a>, LinkedIn Help: sharing a URL and checking its preview.</li>
        <li><a href={SRC.shareable}>Make your website shareable on LinkedIn</a>, LinkedIn Help: shared-link tags and image specifications.</li>
        <li><a href={SRC.inspectorHelp}>Use Post Inspector to refresh URL</a>, LinkedIn Help: cache refresh for new posts.</li>
        {LINKEDIN_EXAMPLES.map((example) => (
          <li key={example.id}><a href={`https://github.com/${example.repo}/blob/${example.sha}/README.md`}>{example.name} README</a>, frozen source for its illustrative draft.</li>
        ))}
        <li><a href={SRC.pricing}>LaunchLoop pricing</a>: full-kit contents, not a new kit-generation test.</li>
      </ul>
    </BlogPostLayout>
  );
}
