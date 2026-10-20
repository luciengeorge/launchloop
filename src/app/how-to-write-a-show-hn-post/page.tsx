import type { Metadata } from "next";
import Link from "next/link";
import { type FaqItem, GuideFaq } from "@/components/guide-faq";
import { GuideLayout } from "@/components/guide-layout";
import { guide } from "@/lib/guides";
import { guidePage } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";

const g = guide("how-to-write-a-show-hn-post");

export const metadata: Metadata = pageMetadata(guidePage(g));

const SRC = {
  showHn: "https://news.ycombinator.com/showhn.html",
  guidelines: "https://news.ycombinator.com/newsguidelines.html",
  faq: "https://news.ycombinator.com/newsfaq.html",
  tips: "https://news.ycombinator.com/item?id=22336638",
  enkel: "https://news.ycombinator.com/item?id=22336296",
  neutralTitle: "https://news.ycombinator.com/item?id=23263421",
  boseTitle: "https://news.ycombinator.com/item?id=27041703",
  textPosts: "https://news.ycombinator.com/item?id=20773107",
  problem: "https://news.ycombinator.com/item?id=27317842",
  notProductHunt: "https://news.ycombinator.com/item?id=46704026",
  substance: "https://news.ycombinator.com/item?id=46705186",
  obstacles: "https://news.ycombinator.com/item?id=47561124",
  playFree: "https://news.ycombinator.com/item?id=46333434",
  autokilled: "https://news.ycombinator.com/item?id=49561867",
  spelling: "https://news.ycombinator.com/item?id=49984080",
} as const;

const FAQ: FaqItem[] = [
  {
    q: "What is the title format for a Show HN post?",
    a: "The only fixed rule is that the title begins with \"Show HN\". After that, say what the project is in plain words: HN moderator dang has asked people to make the title say in a neutral and direct way what the project is. A common pattern is the name followed by a short description, such as \"Show HN: Gridcast, turn a CSV into a dashboard you can share by link\" (a made-up product). Leave out your site name, because HN shows the domain after the link, and skip capitals, exclamation marks and claims about how great it is.",
  },
  {
    q: "Should a Show HN be a link post or a text post?",
    a: "A link post, with your text added. Put the address where people can try the project in the URL field and your explanation in the text field. The Show HN tips from dang say the text should appear at the top of the submission, and to post it as the first comment if it doesn't. A text-only post is a poor fit: the HN FAQ says you can't make a link in a text submission, and in 2019 dang said text posts are penalized compared to posts with URLs.",
  },
  {
    q: "What should I write in the text of a Show HN?",
    a: "Start with a clear statement of what the project is or does, then the backstory of how you came to work on it and what is different about it, as dang's Show HN tips ask. In 2026 HN moderator tomhow listed what used to make Show HNs interesting: the obstacles, the approaches that didn't work, the breakthrough and what you learned. Use factual, direct language, link any earlier HN threads about the project, and say how to try it without paying.",
  },
  {
    q: "Can I use an LLM to polish my Show HN text or replies?",
    a: "Write it yourself. The HN guidelines say not to post generated or AI-edited text, and dang's Show HN tips say not to use an LLM for any of your text, not even to edit it. In October 2026 tomhow said spelling and grammar checks, and suggestions you apply by hand to text you wrote, are fine, but pasting text from a chatbot or translation tool is not. HN's software can automatically kill comments it classifies as LLM-generated or polished.",
  },
  {
    q: "How should I reply to critical comments on my Show HN?",
    a: "Answer the strongest reading of the point, as the HN guidelines ask, and be specific: what you tried, what you will change, or that you don't know yet. Don't suggest critics are shills or astroturfers, and don't comment on the voting, because the guidelines ask everyone not to. If you tend to reply in the heat of the moment, the delay setting in your HN profile holds your comments back for up to 10 minutes so you can edit them.",
  },
];

export default function ShowHnPostGuidePage() {
  return (
    <GuideLayout guide={g}>
      <p>
        A Show HN lives or dies on a few lines of text: the title, the link, and the note you write about what you built. Hacker News is unusually specific about how those
        should read, and its moderators say so in public. This guide is only about writing the post, with every rule quoted from Hacker News and linked. For eligibility,
        preparing your app, timing and what to do afterwards, use the <Link href="/show-hn-launch-checklist">Show HN launch checklist</Link>.
      </p>

      <h2 id="what-hn-wants">Who you are writing for</h2>
      <p>
        The <a href={SRC.showHn}>Show HN guidelines</a> open with: <q>Show HN is for something you&apos;ve made that other people can play with.</q> The guidelines expect readers
        to try it out, give feedback and ask questions in the thread. They are not there to be sold to. HN moderator tomhow put it bluntly in January 2026:{" "}
        <q>Show HN isn&rsquo;t Product Hunt; it&rsquo;s not for launching your product and capturing signups, it&rsquo;s for showcasing interesting/deep innovation that others
        can learn from.</q> (<a href={SRC.notProductHunt}>source</a>)
      </p>
      <p>
        In December 2025 he described Show HN as <q>showcasing an interesting project you&rsquo;ve built (with a focus on technology discovery) rather than announcing a product
        people can buy.</q> (<a href={SRC.playFree}>source</a>) So write as the person who built the thing, explaining it to people who might want to build something similar.
        Every section below follows from that.
      </p>

      <h2 id="title">The title</h2>
      <p>
        The rule itself is one line in the guidelines: <q>To post, submit a story whose title begins with &quot;Show HN&quot;.</q> Everything after those two words is up to
        you, within the general <a href={SRC.guidelines}>HN guidelines</a>.
      </p>
      <h3>Say what it is, plainly</h3>
      <p>
        When a founder posted a clever, baity title, dang <a href={SRC.neutralTitle}>replied</a>: <q>Users will flag the baity title and complain that it isn&apos;t clear what
        this is.</q> His advice was to <q>make the title say in a neutral and direct way what this product/project is.</q>
      </p>
      <p>
        A common shape is the name, a separator, then what it does. The thread dang&apos;s Show HN tips were posted on is an example of the form:{" "}
        <a href={SRC.enkel}><q>Show HN: Enkel – A clean and simple RSS Reader</q></a>. Any separator does the job; the examples on this page use a comma. If the name tells
        readers nothing, leave it out and describe the thing.
      </p>
      <p>
        Moderators edit titles too. In one case dang <a href={SRC.boseTitle}>changed</a> <q>Show HN: I reverse engineered the Bose iOS app and
        rebuilt it for Mac</q> to what the project&apos;s page said, <q>Show HN: Control your Bose headphones from your Mac&apos;s menubar</q>, which he called <q>more
        informative anyhow.</q> The interesting story (reverse engineering an app) belongs in your text. The title says what readers get when they click.
      </p>
      <h3>What the guidelines rule out</h3>
      <ul>
        <li>
          <strong>Hype.</strong> <q>Please don&apos;t do things to make titles stand out, like using uppercase or exclamation points, or saying how great an article is.</q>
        </li>
        <li>
          <strong>Your domain.</strong> <q>If the title includes the name of the site, please take it out, because the site name will be displayed after the link.</q> HN
          already shows your domain next to the title, so &ldquo;Show HN: Gridcast.app&rdquo; wastes the space.
        </li>
        <li>
          <strong>Gratuitous numbers.</strong> <q>If the title contains a gratuitous number or number + adjective, we&apos;d appreciate it if you&apos;d crop it.</q> A number
          that means something, such as the size of a binary or a supported file format version, is fine.
        </li>
        <li>
          <strong>Unlabelled videos.</strong> <q>If you submit a video or pdf, please warn us by appending [video] or [pdf] to the title.</q> That matters for hardware, where
          the Show HN guidelines accept a video or a detailed article instead of something people can run.
        </li>
        <li>
          <strong>Linkbait.</strong> The guidelines ask for the original title <q>unless it is misleading or linkbait; don&apos;t editorialize.</q> For a Show HN you write the
          title, so make it one a moderator wouldn&apos;t need to rewrite.
        </li>
      </ul>
      <h3>Weak and stronger titles</h3>
      <p>These are for made-up products. Concrete details such as &ldquo;open source&rdquo;, &ldquo;self-hosted&rdquo; or &ldquo;runs in the browser&rdquo; tell readers what they are clicking on. Adjectives don&apos;t.</p>
      <ul>
        <li>Weak: &ldquo;Show HN: GRIDCAST, the future of dashboards!&rdquo; Stronger: &ldquo;Show HN: Gridcast, turn a CSV into a dashboard you can share by link&rdquo;</li>
        <li>Weak: &ldquo;Show HN: The AI-powered productivity platform for modern teams&rdquo; Stronger: &ldquo;Show HN: A habit tracker that syncs through your own WebDAV server&rdquo;</li>
        <li>Weak: &ldquo;Show HN: My new app (please check it out)&rdquo; Stronger: &ldquo;Show HN: I turned my bank&apos;s CSV export into a budgeting app&rdquo;</li>
      </ul>

      <h2 id="link-or-text">Link post or text post</h2>
      <p>
        The submit form has a URL field and a text field. For a Show HN, fill in both: the URL is the thing people can try, and the text is your explanation.
      </p>
      <ul>
        <li>
          <strong>The URL should be the project itself.</strong> A live demo, the app, a download page or the repository. Not a blog post about it: the guidelines list{" "}
          <q>blog posts, sign-up pages, newsletters, lists, and other reading material</q> as off topic, and add <q>Don&apos;t post landing pages or fundraisers.</q>
        </li>
        <li>
          <strong>The text goes in the text field.</strong> dang&apos;s <a href={SRC.tips}>Show HN tips</a> say: <q>Your text should show up at the top of the Show HN
          submission, but if for some reason it doesn&apos;t, add it as a first comment to the thread. Either way is fine.</q>
        </li>
        <li>
          <strong>Avoid a text-only post.</strong> The <a href={SRC.faq}>HN FAQ</a> answers <q>How do I make a link in a text submission?</q> with <q>You can&apos;t. This is to
          prevent people from submitting a link with their comments in a privileged position at the top of the page.</q> A text-only Show HN leaves readers copying your
          address by hand. In 2019 dang also <a href={SRC.textPosts}>told</a> a founder: <q>Make the submission link to your site, and add your text as a first comment to the
          new thread. (Don&apos;t make it a text post; those are penalized compared to posts with URLs.)</q> That comment is from 2019, so treat it as dang&apos;s view at the
          time rather than a current published rule. The FAQ point alone is reason enough to lead with a link.
        </li>
      </ul>

      <h2 id="text">The text: what to say</h2>
      <p>
        This is where the post is won or lost. The <a href={SRC.tips}>Show HN tips</a> from dang, linked from the Show HN guidelines, ask for four things:
      </p>
      <ul>
        <li>
          <strong>What it is.</strong> <q>Include a clear statement of what your project is or does. If you don&apos;t, the discussion will consist of &quot;I can&apos;t tell
          what this is&quot;.</q>
        </li>
        <li>
          <strong>The backstory, and what is different.</strong> <q>Include text giving the backstory of how you came to work on this, and explaining what&apos;s different
          about it. That tends to seed discussion in a good direction.</q>
        </li>
        <li>
          <strong>Earlier threads.</strong> <q>Include links to any previous HN threads that are relevant. Readers like those.</q>
        </li>
        <li>
          <strong>Facts, not pitch.</strong> <q>Use factual, direct language. Personal stories and technical details are great.</q>
        </li>
      </ul>
      <p>
        dang has also <a href={SRC.problem}>written</a>: <q>For even better results, explain what problem you&apos;re solving and why it matters. What&apos;s the pain your
        product addresses?</q>
      </p>
      <h3>Say what you figured out</h3>
      <p>
        The Show HN guidelines ask for non-trivial projects and end that rule with <q>Explain how and why.</q> Moderators have said this part of the text matters more now
        that code is cheap to generate. tomhow{" "}
        <a href={SRC.obstacles}>wrote</a> in March that code generation <q>has basically eaten everything that used to be interesting about most Show HN posts. I.e.: What were
        the obstacles to making it work? What approaches did you try that didn&apos;t work? What was the breakthrough that made it work? What do you learn?</q> In January he
        described the ideal as <q>a backstory, a real world problem that was causing real costs or difficulties for people</q> that led the developer to an &ldquo;a-ha&rdquo;
        moment. (<a href={SRC.substance}>source</a>)
      </p>
      <p>
        If you built with Cursor, Lovable, Bolt or v0, that is the part to write about honestly: what the tools got wrong, what you had to work out yourself, and what you
        know now about the problem that you didn&apos;t when you started.
      </p>
      <h3>Say how to try it, and what it costs</h3>
      <p>
        The Show HN guidelines ask you to <q>make it easy for users to try your thing out, ideally without barriers such as signups or emails.</q> Your text should tell people how:
        the demo link, the guest mode, the one-line install. If there is a paid plan, say what is free and what isn&apos;t. When tomhow removed the Show HN label from one post
        in December 2025, the reason was that <q>it&rsquo;s not clear that this is something people can play with without paying anything.</q>{" "}
        (<a href={SRC.playFree}>source</a>)
      </p>
      <h3>An outline to write from</h3>
      <p>An outline, not text to copy. Write each part in your own words.</p>
      <ol>
        <li>One or two sentences on what it is and who it is for.</li>
        <li>The problem, with one real detail from your own experience.</li>
        <li>What you tried first, what didn&apos;t work, and the idea that did.</li>
        <li>How it works: the stack, the one interesting technical decision, and what it can&apos;t do yet.</li>
        <li>How it differs from what already exists, with links to earlier HN threads if there are any.</li>
        <li>How to try it without signing up, and what is free or paid.</li>
        <li>The specific feedback you want.</li>
      </ol>
      <p>For a made-up product, here is the difference in the opening lines:</p>
      <ul>
        <li>Weak: &ldquo;We&apos;re thrilled to launch Gridcast, the AI-powered platform that revolutionises how teams visualise data!&rdquo;</li>
        <li>
          Stronger: &ldquo;Gridcast turns a CSV into a dashboard you can share by link. I built it because I was pasting spreadsheet screenshots into Slack every Monday. It
          runs in the browser and nothing is uploaded until you publish.&rdquo;
        </li>
      </ul>

      <h2 id="tone">Tone</h2>
      <ul>
        <li>
          <strong>No marketing voice.</strong> The tips are direct about it: <q>Drop any language that sounds like marketing or sales. On HN, that is an instant turnoff.</q>{" "}
          Write &ldquo;I built&rdquo;, not &ldquo;we&apos;re excited to announce&rdquo;. Swap every adjective for a fact.
        </li>
        <li>
          <strong>Write it by hand.</strong> The first of dang&apos;s tips, added in March 2026: <q>Write your text by hand. Don&apos;t use an LLM to generate any of it (not even
          a tiny bit, including to edit or spruce it up).</q> The <a href={SRC.guidelines}>HN guidelines</a> say the same for comments:{" "}
          <q>Don&apos;t post generated text or AI-edited text. HN is for conversation between humans.</q>
        </li>
        <li>
          <strong>Imperfect is fine.</strong> When tomhow explained why a founder&apos;s replies on their Show HN had been hidden, he said <q>The community here much prefers
          imperfect-but-authentic writing</q>. (<a href={SRC.autokilled}>source</a>) A slightly rough paragraph in your own voice reads better on HN than a polished one that
          sounds generated.
        </li>
        <li>
          <strong>Be upfront about limits.</strong> Saying what it doesn&apos;t do yet, what is rough and what you are unsure about saves readers from finding out for
          themselves, and gives them something useful to comment on.
        </li>
        <li>
          <strong>Don&apos;t oversell the size of the work.</strong> The Show HN guidelines say <q>A Show HN needn&apos;t be complicated or look slick.</q> Early work is welcome when
          it is described honestly.
        </li>
      </ul>
      <p>
        On LLMs, one nuance from October 2026: tomhow <a href={SRC.spelling}>wrote</a>{" "}
        <q>We&apos;re fine with using LLMs for checking of spelling and grammar, and for suggesting improvements to text you&apos;ve authored yourself, and then using your own
        human judgement to apply the changes back into your text.</q> What isn&apos;t fine, in his words: <q>don&apos;t copy+paste something from an LLM chatbot or translation
        tool into the Hacker News comment box and submit it.</q> dang&apos;s tips are stricter, so the safe course is to write and edit it yourself.
      </p>

      <h2 id="replies">Replying to comments</h2>
      <p>
        Your replies are part of the post. The <Link href="/show-hn-launch-checklist#replies">Show HN launch checklist</Link> covers being around to answer them; this
        section is about how to write them.
      </p>
      <ul>
        <li>
          <strong>Write replies by hand too.</strong> On one Show HN in September 2026, tomhow told the founder{" "}
          <q>your comments have been autokilled as our software classifies them as likely LLM-generated or edited/polished.</q> (<a href={SRC.autokilled}>source</a>) The HN
          FAQ says dead posts aren&apos;t displayed by default.
        </li>
        <li>
          <strong>Read criticism generously.</strong> The HN guidelines ask: <q>Please respond to the strongest plausible interpretation of what someone says, not a weaker one
          that&apos;s easier to criticize. Assume good faith.</q> Thank people, give the real detail, and say what you will change or that you don&apos;t know yet.
        </li>
        <li>
          <strong>Don&apos;t accuse critics.</strong> <q>Please don&apos;t post insinuations about astroturfing, shilling, brigading, foreign agents, and the like.</q> And{" "}
          <q>Please don&apos;t comment about the voting on comments.</q>
        </li>
        <li>
          <strong>Keep friends out of it.</strong> The tips say: <q>Make sure your friends and users do not add booster comments in the thread.</q>
        </li>
        <li>
          <strong>Give yourself a buffer.</strong> The <a href={SRC.faq}>HN FAQ</a> describes the <em>delay</em> setting in your profile: <q>It gives you time to edit your
          comments before they appear to others. Set it to the number of minutes you&apos;d like. The maximum is 10.</q>
        </li>
        <li>
          <strong>Emphasis without shouting.</strong> <q>Please don&apos;t use uppercase for emphasis. Instead, put *asterisks* around it and it will get italicized.</q>
        </li>
      </ul>

      <h2 id="before-you-submit">Before you hit submit</h2>
      <ul>
        <li>The title starts with &ldquo;Show HN&rdquo; and says plainly what the thing is, with no domain, capitals, exclamation marks or superlatives.</li>
        <li>The URL goes to something people can try now, not a landing page or a blog post.</li>
        <li>The text opens with what it is, then why you built it, how it works, what is different and how to try it.</li>
        <li>Every sentence is yours, typed by you. Read it aloud and cut anything you wouldn&apos;t say to a friend who builds software.</li>
        <li>Nothing in it, or anywhere else, asks people to upvote or comment.</li>
      </ul>

      <h2 id="next">Next steps</h2>
      <p>
        The <Link href="/show-hn-launch-checklist">Show HN launch checklist</Link> covers what qualifies, getting your app ready for a spike, timing, the voting rules and
        what to do if the post gets no attention. Launching on Product Hunt the same week? It rewards a different kind of writing: read{" "}
        <Link href="/how-to-write-a-product-hunt-tagline">how to write a Product Hunt tagline</Link>.
      </p>
      <p>
        LaunchLoop drafts your landing copy, Product Hunt post, X thread, LinkedIn post and launch images from your repo. It doesn&apos;t write Show HN posts: that text should
        come from you. Start with a <Link href="/#start">free preview</Link> or see <Link href="/pricing">pricing</Link>.
      </p>

      <GuideFaq guide={g} title="Show HN post FAQ" items={FAQ} />

      <h2 id="sources">Sources</h2>
      <p>
        Checked as of October 2026. Every quote on this page was read on Hacker News on 20 October 2026. HN changes its guidance without notice (dang&apos;s tips gained a new
        first item in March 2026), so check the links before you post.
      </p>
      <ul>
        <li><a href={SRC.showHn}>Show HN guidelines</a>, Hacker News</li>
        <li><a href={SRC.guidelines}>Hacker News guidelines</a></li>
        <li><a href={SRC.faq}>Hacker News FAQ</a></li>
        <li><a href={SRC.tips}>Tips for presenting a Show HN</a>, by HN moderator dang (February 2020, edited March 2026), linked from the Show HN guidelines</li>
        <li><a href={SRC.neutralTitle}>dang on making a title neutral and direct</a> (May 2020)</li>
        <li><a href={SRC.boseTitle}>dang on rewriting a Show HN title</a> (May 2021)</li>
        <li><a href={SRC.textPosts}>dang on link posts and text posts</a> (August 2019)</li>
        <li><a href={SRC.problem}>dang on explaining the problem you solve</a> (May 2021)</li>
        <li><a href={SRC.playFree}>tomhow on what Show HN is for</a> (December 2025)</li>
        <li><a href={SRC.notProductHunt}>tomhow: Show HN isn&apos;t Product Hunt</a> (January 2026)</li>
        <li><a href={SRC.substance}>tomhow on what moderators mean by substance</a> (January 2026)</li>
        <li><a href={SRC.obstacles}>tomhow on Show HNs in the era of AI-generated code</a> (March 2026)</li>
        <li><a href={SRC.autokilled}>tomhow on replies hidden as LLM-generated</a> (September 2026)</li>
        <li><a href={SRC.spelling}>tomhow on spelling and grammar checks</a> (October 2026)</li>
        <li><a href={SRC.enkel}>Show HN: Enkel</a>, the thread the Show HN tips were posted on, quoted for its title</li>
      </ul>
    </GuideLayout>
  );
}
