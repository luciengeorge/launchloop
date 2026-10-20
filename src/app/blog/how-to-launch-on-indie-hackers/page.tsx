import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { Faq, type FaqItem } from "@/components/guide-faq";
import { post, postPath } from "@/lib/blog";
import { postPage } from "@/lib/pages";
import { blogPageMetadata } from "@/lib/seo";

const p = post("how-to-launch-on-indie-hackers");

export const metadata: Metadata = blogPageMetadata(postPage(p));

const IH = "https://www.indiehackers.com";

const SRC = {
  about: `${IH}/about`,
  terms: `${IH}/terms`,
  tips2019: `${IH}/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd`,
  tips2020: `${IH}/post/tips-for-making-successful-posts-on-indie-hackers-b04454a57a`,
  milestones: `${IH}/post/what-milestones-should-indie-hackers-be-sharing-5ff94ae08c`,
  welcome: `${IH}/post/welcome-to-indie-hackers-december-2019-welcomeIntro-2019-12-01`,
  showIh: `${IH}/post/post-a-show-ih-and-appear-on-the-indie-hackers-podcast-0d304a166d`,
  phSharing: "https://www.producthunt.com/launch/sharing-your-launch",
} as const;

const FAQ: FaqItem[] = [
  {
    q: "Does Indie Hackers allow self-promotion?",
    a: "It publishes no rule either way. There is no public guidelines page; the terms of service ban running spam, forbid posting anything Indie Hackers or its moderators consider inappropriate, and limit use of the site to personal, non-commercial use without saying how that applies to founders posting their own products. Founder Courtland Allen's advice is to share lessons and questions rather than announcements, and to put any link at the end of the post.",
  },
  {
    q: "Where do I post a product launch on Indie Hackers?",
    a: "In two places. Create a product page and post the launch there as a milestone, which Courtland Allen recommended in 2019. Then write a forum post that teaches something from the launch or asks a useful question, with the link at the end.",
  },
  {
    q: "What makes a good Indie Hackers post title?",
    a: "Courtland Allen's tips from 2020 suggest something close to a full sentence that says what the post is: the question, the opinion or the advice. The same tips say to make it useful to others and to leave your company name out of the title unless the company is extremely well known.",
  },
  {
    q: "How long should an Indie Hackers post be?",
    a: "As short as it can be, according to Courtland Allen's tips from 2019 and 2020. The 2020 tips say to put the important part first and to write as if nobody will read past the first five sentences. For a longer post, they suggest Markdown headings and lists so it can be skimmed, and blank lines between paragraphs.",
  },
  {
    q: "Is r/indiehackers the same as Indie Hackers?",
    a: "No. r/indiehackers is a subreddit on Reddit, with its own written rules, including a limit on self-promotion. Indie Hackers is the separate site at indiehackers.com. If you post in both, follow each one's rules.",
  },
];

export default function IndieHackersLaunchPostPage() {
  return (
    <BlogPostLayout post={p}>
      <p>
        Indie Hackers is a forum and product directory for founders, created by Courtland Allen, with his brother Channing as co-founder. Unlike Product Hunt or Hacker News,
        it publishes no rulebook for posting. There is no guidelines page, and its FAQ address shows the same page as <a href={SRC.about}>About</a>. What it does have is a set
        of posts by Courtland Allen about what works, the newest from 2022. This post sticks to those pages and gives the date of each one, so you can judge how current the
        advice is.
      </p>

      <h2 id="what-it-is">What Indie Hackers is for</h2>
      <p>
        The <a href={SRC.about}>About page</a> says <q>Indie Hackers is a place where the founders of profitable businesses and side projects can share their stories
        transparently, and where entrepreneurs can come to read and learn from those examples.</q> And: <q>It&apos;s also a community where individual &quot;indie hackers&quot;
        come together to share their experiences, give and receive feedback, and rely on each other for support.</q> It defines its audience broadly:{" "}
        <q>You&apos;re an indie hacker if you&apos;ve set out to make money independently.</q>
      </p>
      <p>
        Courtland Allen&apos;s <a href={SRC.tips2020}>tips for making successful posts</a> (March 2020) describe the readers you are writing for:{" "}
        <q>Indie hackers are tech founders who come here primarily to learn, talk shop, be inspired, discover new things, and (occasionally) lend a helping hand.</q> His
        advice for what to post follows from that: <q>Start interesting discussions, ask useful questions, teach people what you&apos;ve learned, and share links to relevant
        resources.</q>
      </p>
      <p>
        So a launch on Indie Hackers works best as a founder talking to other founders. An announcement on its own is a poor fit. In his{" "}
        <a href={SRC.tips2019}>2019 tips</a> he put it bluntly: <q>One-sided announcements are boring.</q>
      </p>

      <h2 id="where-to-post">Where to post your launch</h2>
      <h3>Your product page, as a milestone</h3>
      <p>
        Indie Hackers lets you create a page for your product and post updates to it, called milestones. In June 2019 Courtland Allen wrote:{" "}
        <q>Post milestones. I highly recommend creating a product page if you haven&apos;t already, and posting new milestones on a regular basis. Don&apos;t just share what you
        accomplished, but also share what you learned.</q> His <a href={SRC.welcome}>welcome post</a> for new members (December 2019) adds{" "}
        <q>Your product page is a great opportunity to get some practice building in public.</q>
      </p>
      <p>
        When a member <a href={SRC.milestones}>asked</a> what milestones are for, in October 2019, he replied that product pages are{" "}
        <q>a place to keep a log of your journey and accomplishments, both for yourself and for others.</q> and that{" "}
        <q>it&apos;s more for the important markers that you find meaningful than it is for, say, small daily tasks.</q> A launch is one of those markers. Of the milestones
        leaderboard he said <q>the general idea is that it&apos;s a way to actually get attention on the entries you post to your product page.</q> He also called both features{" "}
        <q>works in progress</q>, and the site has changed since, so check what the product page offers today when you set it up.
      </p>
      <h3>A forum post</h3>
      <p>
        The welcome post&apos;s guide to the community says: <q>Got some lessons or advice to share? Make a post on the forum.</q> A launch post on the forum should be one of
        those: what you learned building and launching the product, with the product as the example. In January 2022 Courtland Allen <a href={SRC.showIh}>invited</a> members to
        post a &ldquo;Show IH&rdquo; for a chance to appear on his podcast, telling everyone <q>what you&apos;re working on (link to it!)</q> and{" "}
        <q>how much revenue it&apos;s making</q>. That was a one-off invitation, not a standing format, but his advice in it applies to any launch post:{" "}
        <q>It&apos;s also worth thinking about what makes your post interesting to other IHers.</q>
      </p>
      <p>
        The 2020 tips also suggest posting inside a relevant group. indiehackers.com/groups no longer loads, so that advice is likely out of date.
      </p>
      <h3>Not the subreddit</h3>
      <p>
        r/indiehackers is a subreddit on Reddit with its own rules, including a limit on self-promotion. If you post there too, read{" "}
        <Link href="/how-to-promote-on-reddit">how to promote your app on Reddit</Link>, which quotes them.
      </p>

      <h2 id="self-promotion">The self-promotion line</h2>
      <p>
        Indie Hackers doesn&apos;t publish a self-promotion rule, so there is no ratio or weekly thread to follow. What is written down:
      </p>
      <ul>
        <li>
          <strong>The terms ban spam.</strong> The <a href={SRC.terms}>terms of service</a> forbid using the site in a way that{" "}
          <q>Runs Maillist, Listserv, any form of auto-responder or &quot;spam&quot; on the Services</q>, or that{" "}
          <q>Submits, posts, or distributes any content that may be considered by Indie Hackers or its moderators as offensive, defamatory, or inappropriate.</q> In other words,
          what counts as inappropriate is their call.
        </li>
        <li>
          <strong>The terms also limit commercial use.</strong> They say{" "}
          <q>You will only use the Services for your own internal, personal, non-commercial use, and not on behalf of or for the benefit of any third party, and only in a
          manner that complies with all laws that apply to you.</q> They don&apos;t say how that applies to founders posting about their own products, while Courtland
          Allen&apos;s posts encourage product pages and milestones. If you are unsure, the terms give contact@indiehackers.com for questions.
        </li>
        <li>
          <strong>Link-only posts don&apos;t work (2019 tip).</strong> From the 2019 tips: <q>If you&apos;re just posting links to your blog, you won&apos;t find a lot of success.</q> And:{" "}
          <q>you should put the useful info in the tweet itself, not in a link to a blog post. Same on Indie Hackers.</q>
        </li>
        <li>
          <strong>Problem first, product later (2019 tip).</strong> <q>State their problems first, and put your solution/question/offer later.</q>
        </li>
        <li>
          <strong>Wins are welcome, with the how.</strong> When a member complained in the comments about self-promotion, Courtland Allen replied in June 2019 that{" "}
          <q>posts where people share their wins are actually quite helpful and popular for a reason!</q> and that he wanted{" "}
          <q>more details about how people had those wins and what they learned in the process.</q>
        </li>
        <li>
          <strong>Show up before launch day.</strong> This one comes from Product Hunt, not Indie Hackers. Its <a href={SRC.phSharing}>sharing your launch</a> page warns:{" "}
          <q>Launch day is not a time to go spamming Reddit and Indie Hackers if you haven’t already been posting there</q>.
        </li>
      </ul>
      <p>
        Our reading of those pages: be a member who comments and answers questions before you launch, post the launch once as a milestone and once as a forum post that
        teaches something, and put the link at the end.
      </p>

      <h2 id="writing">How to write a launch post people answer</h2>
      <h3>The title</h3>
      <ul>
        <li>
          <strong>Say what the post is (2020 tip).</strong> The 2020 tips: <q>Describe your post in the title using something close to a full sentence.</q> And:{" "}
          <q>If you&apos;re asking a question, put your question in the title. If you&apos;re giving an opinion, put that in the title. If you&apos;re sharing advice, state the
          advice. If you&apos;re looking for feedback, say so.</q>
        </li>
        <li>
          <strong>Make it useful to someone else (2020 tip).</strong> His good example is <q>How I figured out direct sales</q>; his bad one is &ldquo;Progress report #2933&rdquo;. Other
          bad titles he lists include &ldquo;Promo&rdquo; and &ldquo;My app&rdquo;.
        </li>
        <li>
          <strong>Leave the company name out (2020 tip).</strong> <q>unless you have an extremely popular company with a recognizable name, it&apos;s almost never helpful to put your
          company&apos;s name in the title of your post.</q>
        </li>
        <li>
          <strong>Consider a question (2019 tip).</strong> <q>Posts with questions in the title are more successful than posts without.</q>
        </li>
      </ul>
      <p>For a made-up product, here is the difference:</p>
      <ul>
        <li>Weak: &ldquo;Launching Gridcast today!&rdquo; Stronger: &ldquo;What I learned building a CSV-to-dashboard tool on weekends&rdquo;</li>
        <li>Weak: &ldquo;Feedback on my app?&rdquo; Stronger: &ldquo;Would you share a dashboard by public link, or only behind a password?&rdquo;</li>
        <li>Weak: &ldquo;Gridcast v1 is live&rdquo; Stronger: &ldquo;I rebuilt my side project after the first users ignored its main feature&rdquo;</li>
      </ul>
      <h3>The body</h3>
      <ul>
        <li>
          <strong>Lead with the interesting part (2019 and 2020 tips).</strong> The 2020 tips: <q>Write as if nobody&apos;s going to read past the first 5 sentences, because in many cases, they
          won&apos;t.</q> The 2019 tips: <q>You should start offering value in your post in the first few sentences.</q>
        </li>
        <li>
          <strong>Keep it short, or make it skimmable (2019 and 2020 tips).</strong> <q>If someone opens up your posts and sees a giant wall of text, they&apos;re unlikely to engage</q>. If it has to
          be long, <q>Indie Hackers supports Markdown</q>, so use headings and lists, and <q>please, please, please put blank lines between them.</q>
        </li>
        <li>
          <strong>Give enough context to answer (2019 comment).</strong> In the comments on the 2019 tips, a member added that a request for help still needs enough backstory for people to
          give a useful answer. Courtland Allen replied: <q>Agreed, good point.</q>
        </li>
        <li>
          <strong>End with one clear ask (2019 tip).</strong> <q>If you have a question, put it at the end on its own line with a clear question mark. If you have a link, again, put it at
          the end in its own paragraph.</q>
        </li>
      </ul>
      <p>Indie Hackers publishes no template, so here is an outline built from those tips. Write it in your own words, with real details only:</p>
      <ol>
        <li>A title that states the lesson, the opinion or the question.</li>
        <li>Two or three sentences: what you built, who it is for, and the one thing you learned launching it.</li>
        <li>What you tried, what didn&apos;t work and what you changed.</li>
        <li>Anything real you can share about results so far. If you have no numbers yet, say so.</li>
        <li>The link to the product, in its own paragraph near the end.</li>
        <li>One specific question for readers, on its own line.</li>
      </ol>

      <h2 id="replies">Replying, and after you post</h2>
      <ul>
        <li>
          <strong>Comments lifted posts, according to the 2019 and 2020 tips.</strong> The 2019 tips: <q>Our ranking algorithm rewards posts that generate discussion and have more comments.</q> The 2020
          tips: <q>Indie Hackers rewards posts that generate the most discussion, because we want more people to see the best stuff.</q> Indie Hackers&apos; public pages don&apos;t say how ranking works today, but
          answering every comment with something specific is good practice either way.
        </li>
        <li>
          <strong>Share it elsewhere (2020 tip).</strong> <q>Also, don&apos;t be shy about sharing posts on Twitter or with colleagues.</q>
        </li>
        <li>
          <strong>Keep posting milestones (2019 tip).</strong> The 2019 tip was to post them <q>on a regular basis</q>, with what you learned each time.
        </li>
        <li>
          <strong>Try again (2019 tip).</strong> <q>If at first you don&apos;t succeed, there&apos;s no law against coming back to try again.</q>
        </li>
      </ul>

      <h2 id="not-documented">What Indie Hackers doesn&apos;t document</h2>
      <p>
        Several things founders ask about have no answer on Indie Hackers&apos; public pages, so this post doesn&apos;t guess: how often you may post about your own product,
        how moderators decide what to remove, what new accounts can and can&apos;t do, and which fields the product page asks for today. The product submission page showed a
        security check instead of the form, so it couldn&apos;t be read for this post.
      </p>

      <h2 id="next">Next steps</h2>
      <p>
        Launching in several places the same week? Each community has its own rules: <Link href="/how-to-promote-on-reddit">how to promote your app on Reddit</Link>, the{" "}
        <Link href="/show-hn-launch-checklist">Show HN launch checklist</Link> and{" "}
        <Link href={postPath({ slug: "how-to-launch-on-product-hunt" })}>how to launch on Product Hunt</Link>.
      </p>
      <p>
        LaunchLoop drafts your landing copy, Product Hunt post, X thread, LinkedIn post and launch images from your repo. It doesn&apos;t write Indie Hackers posts: the lessons
        in those should come from you. Start with a <Link href="/#start">free preview</Link> or see <Link href="/pricing">pricing</Link>.
      </p>

      <Faq path={postPath(p)} title="Launching on Indie Hackers: FAQ" items={FAQ} />

      <h2 id="sources">Sources</h2>
      <p>
        Checked as of October 2026. Every quote on this page was read on indiehackers.com on 20 October 2026, apart from one line from Product Hunt&apos;s launch guide.
        Most of this advice is from 2019 and 2020, and
        Indie Hackers has changed since, so treat it as the founder&apos;s guidance at the time.
      </p>
      <ul>
        <li><a href={SRC.about}>About Indie Hackers</a></li>
        <li><a href={SRC.terms}>Terms of Service</a>, Indie Hackers</li>
        <li><a href={SRC.tips2019}>How do you make a successful post on Indie Hackers?</a>, by Courtland Allen (June 2019), with his replies in the comments</li>
        <li><a href={SRC.milestones}>What milestones should indie hackers be sharing?</a>, with Courtland Allen&apos;s reply (October 2019)</li>
        <li><a href={SRC.welcome}>Welcome to Indie Hackers! (December 2019)</a>, by Courtland Allen</li>
        <li><a href={SRC.tips2020}>Tips for making successful posts on Indie Hackers</a>, by Courtland Allen (March 2020)</li>
        <li><a href={SRC.showIh}>Post a &ldquo;Show IH&rdquo; and appear on the Indie Hackers podcast</a>, by Courtland Allen (January 2022)</li>
        <li><a href={SRC.phSharing}>Sharing your launch</a>, Product Hunt launch guide</li>
      </ul>
    </BlogPostLayout>
  );
}
