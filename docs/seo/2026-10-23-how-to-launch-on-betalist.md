# Source check: how to launch on BetaList, 23 October 2026

Blog post requested on Wednesday 21 October 2026. Sources were read the same day from about 06:40 to 06:55 UTC. Every quote on the page was copied from the fetched page, not from memory or a search snippet, and then checked again by script (see Method).

## Page

**URL:** `/blog/how-to-launch-on-betalist`
**Title:** `How to launch on BetaList: submission guide · LaunchLoop` (56 characters)
**Description:** `How to launch on BetaList from its own pages: who it is for, what it rejects, how submission and paid plans work, review times and the day you are featured.` (156 characters)
**H1:** How to launch on BetaList. **Published and updated:** 2026-10-23, as the brief asked (bump both in `src/lib/blog.ts` if it merges on another day). **Byline:** Lucien George. **Reading time:** 15 minutes (2,957 words in the rendered body at 200 words a minute; the e2e suite recounts it).

Target queries: "how to launch on betalist" and "betalist submission". No keyword lookups were made for this post.

## Method

- `curl` with a Chrome user agent read every betalist.com page below with HTTP 200, so no browser-like fallback or archive was needed for the quotes. `betalist.com/faq` returns HTTP 301 to `betalist.com/support` (title "Support & FAQ"), so the page links `/support`.
- `betalist.com/submit` returns a Turbo redirect to `/login` when signed out (`<turbo-stream action="redirect" target="/login">`). `/newsletter` asks you to create an account. The submission form and its plans could not be read without an account, and no account was created.
- The Internet Archive has no copy of the submission form: every capture of `betalist.com/submit` from January 2025 to 6 October 2026 is an HTTP 302 redirect. It also has no capture of `/terms/submissions`.
- BetaList's 42 public Stimulus controllers (`/assets/controllers/*.js`) contain no plan names or prices.
- A web search for BetaList submission prices returned only BetaList's own FAQ, terms, Boost and guidelines pages, none of which prints a submission price.
- Cross-check: after the page was built, a script took every `<q>` from the rendered article (90 quotes, 89 unique) and searched for it in plain-text copies of the live sources (whitespace normalised). All 90 were found word for word, with BetaList's straight apostrophes. The same script found no en or em dashes in the article. Quotes are cut short wherever BetaList's sentence continues with an em dash (the own-domain rule, the "Visit Site" do-follow sentence, "Introductory pricing" and the Boost page's "one-time event" sentence). The refund time is written in the source as 5 and 10 joined by an en dash, so the page paraphrases it as "5 to 10 business days" outside a quote.
- Archive cross-check: the live FAQ matches the Internet Archive copy of 30 September 2026 (`https://web.archive.org/web/20260930083134/https://betalist.com/support`) word for word except the editing answer, which BetaList has since rewritten (quotes 53, 87 and 88 below are live only). The Submission Guidelines match the copy of 12 July 2026 (`https://web.archive.org/web/20260712213007/https://betalist.com/criteria`) and Boost matches the copy of 30 August 2026 (`https://web.archive.org/web/20260830182036/https://betalist.com/boost`).

## Sources

- Support & FAQ (also at `/faq`, which redirects): https://betalist.com/support
- Submission Guidelines: https://betalist.com/criteria
- Submission Terms (linked from the Terms of Service as "Submission Terms"): https://betalist.com/terms/submissions
- Terms of Service (governing law Singapore; links the Submission Terms; no launch rules): https://betalist.com/terms
- Boost your startup: https://betalist.com/boost
- Advertise on BetaList: https://betalist.com/advertise
- Designing your landing page, BetaList guides (linked from the guidelines; `guides.betalist.com/` itself returns 404): https://guides.betalist.com/designing-your-landing-page
- Homepage: https://betalist.com/

## Pricing, re-verified

- **Submissions are paid.** Re-verified live on 21 October 2026: the FAQ says "All submissions are paid. There is no free submission option." and "BetaList used to offer free submissions, but all submissions now require payment." PR #60 read the same wording on 20 October 2026.
- **The submission price is not public.** The FAQ says "Current plans and prices are shown at the end of the submission form.", and the form needs an account. The page says so and gives no figure.
- **Plan names.** The Submission Terms mention "Priority listing" and "Premium submissions", but no public page says which plans in the form carry those names. The page quotes both and says that.
- **Boost:** $99/week ("Billed weekly, cancel anytime") and $199/month ("Billed monthly, cancel anytime"), marked "Introductory pricing", on the Boost page and the Advertise page, 21 October 2026.
- **Sponsorship:** $4,999/month, "One sponsor at a time", on the Advertise page, 21 October 2026.

## Every quote on the page

| # | Quote (verbatim) | Source (live, 21 October 2026) | Also in an Internet Archive copy |
| --- | --- | --- | --- |
| 1 | "BetaList is the place for early adopters to discover upcoming and recently launched internet startups, and for startup founders to share their startup with the world and get early user feedback." | https://betalist.com/support | yes (2026-09-30) |
| 2 | "BetaList helps you find early-stage startups before they make it big." | https://betalist.com/ | no copy checked |
| 3 | "We feature pre-launch and recently launched startups with a clear value proposition, a good design, and an innovative idea." | https://betalist.com/support | yes (2026-09-30) |
| 4 | "Promote your product to startup founders and early adopters" | https://betalist.com/advertise | no copy checked |
| 5 | "Your product should be recently launched or still be unreleased." | https://betalist.com/criteria | yes (2026-07-12) |
| 6 | "If your product has already received significant press coverage, it may be less suitable for our audience." | https://betalist.com/criteria | yes (2026-07-12) |
| 7 | "Not available to anyone yet" | https://betalist.com/criteria | yes (2026-07-12) |
| 8 | "Private beta accessible by invitation only" | https://betalist.com/criteria | yes (2026-07-12) |
| 9 | "Recently launched" | https://betalist.com/criteria | yes (2026-07-12) |
| 10 | "Launched weeks ago or longer" | https://betalist.com/criteria | yes (2026-07-12) |
| 11 | "Already received significant press coverage" | https://betalist.com/criteria | yes (2026-07-12) |
| 12 | "App with the same functionality as a previously released app for different platform" | https://betalist.com/criteria | yes (2026-07-12) |
| 13 | "Each startup gets two opportunities to be featured. Once pre-launch, and once during launch. There should be at least a few weeks between those posts." | https://betalist.com/criteria | yes (2026-07-12) |
| 14 | "Our audience visits BetaList to discover new technology startups. It's not the right place to promote your blog, newsletter, online store, etc." | https://betalist.com/criteria | yes (2026-07-12) |
| 15 | "Software startups" | https://betalist.com/criteria | yes (2026-07-12) |
| 16 | "Hardware startups" | https://betalist.com/criteria | yes (2026-07-12) |
| 17 | "Old ideas with a new twist" | https://betalist.com/criteria | yes (2026-07-12) |
| 18 | "Blogs, online courses, books, newsletters" | https://betalist.com/criteria | yes (2026-07-12) |
| 19 | "Subscription e-commerce" | https://betalist.com/criteria | yes (2026-07-12) |
| 20 | "Old ideas without substantial improvements" | https://betalist.com/criteria | yes (2026-07-12) |
| 21 | "Consultancies / Agencies" | https://betalist.com/criteria | yes (2026-07-12) |
| 22 | "Using a template doesn't inspire confidence and result in less sign ups than expected. For this reason we do not allow templates or pages with little product information." | https://betalist.com/criteria | yes (2026-07-12) |
| 23 | "Distinct design showcasing your (upcoming) product" | https://betalist.com/criteria | yes (2026-07-12) |
| 24 | "Heavily customised template that looks original" | https://betalist.com/criteria | yes (2026-07-12) |
| 25 | "Free or paid template" | https://betalist.com/criteria | yes (2026-07-12) |
| 26 | "Default Bootstrap style" | https://betalist.com/criteria | yes (2026-07-12) |
| 27 | "Page with only an 'explainer video'" | https://betalist.com/criteria | yes (2026-07-12) |
| 28 | "Hosted page by LaunchRock, Unbounce, KickoffLabs, or similar service" | https://betalist.com/criteria | yes (2026-07-12) |
| 29 | "Free hosting subdomains (e.g., yourapp.vercel.app, yourapp.netlify.app, yourapp.herokuapp.com)" | https://betalist.com/criteria | yes (2026-07-12) |
| 30 | "Direct link to App Store, Google Play, Kickstarter, Indiegogo, or Facebook page" | https://betalist.com/criteria | yes (2026-07-12) |
| 31 | "Your startup must have its own domain" | https://betalist.com/support | yes (2026-09-30) |
| 32 | "We do not accept app store links or pages hosted on free subdomains." | https://betalist.com/terms/submissions | no copy checked |
| 33 | "There's no point in getting featured on BetaList if our audience can't engage with your product. We recommend making it easy for visitors to sign up, download, or login to your product." | https://betalist.com/criteria | yes (2026-07-12) |
| 34 | "Custom email signup form" | https://betalist.com/criteria | yes (2026-07-12) |
| 35 | "MailChimp or other form" | https://betalist.com/criteria | yes (2026-07-12) |
| 36 | "Download button or app store link" | https://betalist.com/criteria | yes (2026-07-12) |
| 37 | "Facebook, Google, or LinkedIn login" | https://betalist.com/criteria | yes (2026-07-12) |
| 38 | ""Follow us on X to get notified"" | https://betalist.com/criteria | yes (2026-07-12) |
| 39 | "We receive thousands of submissions every month. We prioritize startup submissions that have a clear value proposition, have an idea we haven't seen before, and have a well-designed landing page, because these are the things that our audience is looking for." | https://betalist.com/support | yes (2026-09-30) |
| 40 | "Unfortunately we're not able to provide specific feedback on individual submissions." | https://betalist.com/support | yes (2026-09-30) |
| 41 | "Submitting your startup does not guarantee it will be featured. BetaList maintains full editorial and curatorial discretion over which startups are featured, and this decision is final." | https://betalist.com/terms/submissions | no copy checked |
| 42 | "Submitting a startup you do not represent, including through affiliate or referral links, is not permitted." | https://betalist.com/terms/submissions | no copy checked |
| 43 | "Work in progress." | https://guides.betalist.com/designing-your-landing-page | no copy checked |
| 44 | "If your product isn't ready yet, you should still be able to create a mockup of at least one screen." | https://guides.betalist.com/designing-your-landing-page | no copy checked |
| 45 | "Don't use a generic template page." | https://guides.betalist.com/designing-your-landing-page | no copy checked |
| 46 | "The sign up form should be front and center. Don't hide it on another page. Don't ask for information you don't need. The email address should be enough." | https://guides.betalist.com/designing-your-landing-page | no copy checked |
| 47 | "Since your product isn't ready yet, "Get early access" will probably do fine." | https://guides.betalist.com/designing-your-landing-page | no copy checked |
| 48 | "What are you? Why should I care?" | https://guides.betalist.com/designing-your-landing-page | no copy checked |
| 49 | "You are responsible for ensuring your website is live, functioning correctly, and able to handle traffic at the time of featuring." | https://betalist.com/terms/submissions | no copy checked |
| 50 | "Visit the homepage and click the sign up button at the top right." | https://betalist.com/support | yes (2026-09-30) |
| 51 | "Current plans and prices are shown at the end of the submission form." | https://betalist.com/support | yes (2026-09-30) |
| 52 | "Payment is charged when you choose a plan and complete checkout. Our editorial team then reviews your startup. You'll get an email with the decision. If accepted, we feature it on the timeline for your plan." | https://betalist.com/support | yes (2026-09-30) |
| 53 | "You can update the icon, name, pitch, description, website URL, and images." | https://betalist.com/support | no: the 2026-09-30 copy predates this wording |
| 54 | "By submitting, you grant us the right to edit your submission for grammar, clarity, and length; to select, crop, or create images; and to categorize your startup as we see fit." | https://betalist.com/terms/submissions | no copy checked |
| 55 | "You retain ownership of your content." | https://betalist.com/terms/submissions | no copy checked |
| 56 | "All submissions are paid. There is no free submission option." | https://betalist.com/support | yes (2026-09-30) |
| 57 | "BetaList used to offer free submissions, but all submissions now require payment." | https://betalist.com/support | yes (2026-09-30) |
| 58 | "Plans differ mainly by how quickly your startup is featured and whether newsletter inclusion is guaranteed." | https://betalist.com/support | yes (2026-09-30) |
| 59 | "All plans include a do-follow backlink if featured, and a full refund if not selected. All submissions must still meet our submission guidelines." | https://betalist.com/support | yes (2026-09-30) |
| 60 | "If you've already submitted on a lower plan and want faster featuring or newsletter inclusion, you can upgrade from your dashboard." | https://betalist.com/support | yes (2026-09-30) |
| 61 | "Priority listing is a paid service that moves your submission to the front of the review queue." | https://betalist.com/terms/submissions | no copy checked |
| 62 | "Priority listing guarantees faster review, not acceptance or any specific results." | https://betalist.com/terms/submissions | no copy checked |
| 63 | "Premium submissions can pick a preferred date of featuring, subject to availability." | https://betalist.com/terms/submissions | no copy checked |
| 64 | "If your startup is not selected, you will receive a full refund automatically. Once your startup has been featured, refunds are not available." | https://betalist.com/support | yes (2026-09-30) |
| 65 | "If your priority listing submission is not accepted for featuring, you are generally eligible for a refund." | https://betalist.com/terms/submissions | no copy checked |
| 66 | "Refunds are provided at BetaList's discretion." | https://betalist.com/terms/submissions | no copy checked |
| 67 | "Refunds may be issued minus payment processing fees at our discretion." | https://betalist.com/terms/submissions | no copy checked |
| 68 | "Introductory pricing" | https://betalist.com/boost | yes (2026-08-30) |
| 69 | "Your startup appears in the "Boosted" section on the BetaList homepage, rotated among active boosts." | https://betalist.com/boost | yes (2026-08-30) |
| 70 | "Yes, boosts are available for startups that have been featured on BetaList." | https://betalist.com/boost | yes (2026-08-30) |
| 71 | "If you don't match the guidelines or want additional exposure you can have a look at our advertising packages." | https://betalist.com/support | yes (2026-09-30) |
| 72 | "It depends on the plan you paid for. The expected timeline is shown when you choose a plan and in your confirmation email." | https://betalist.com/support | yes (2026-09-30) |
| 73 | "Advertised timeframes for featuring represent our best effort and may vary based on volume and other factors." | https://betalist.com/terms/submissions | no copy checked |
| 74 | "If we contact you regarding your submission, you are responsible for responding promptly." | https://betalist.com/terms/submissions | no copy checked |
| 75 | "Focus on improving your value proposition, design, and uniqueness before resubmitting." | https://betalist.com/support | yes (2026-09-30) |
| 76 | "Otherwise, you cannot choose the exact date of featuring, and your startup may be featured on any day including weekends and holidays." | https://betalist.com/terms/submissions | no copy checked |
| 77 | "your startup appears on BetaList for a day and then moves down the list." | https://betalist.com/boost | yes (2026-08-30) |
| 78 | "The Trending Startups section on the homepage showcases the most popular, recently featured startups." | https://betalist.com/support | yes (2026-09-30) |
| 79 | "We take a few metrics in mind, including how many tweets a startup post has received. We're not disclosing the exact algorithm, but the more engagement your startup post receives, the higher its chances of getting trending." | https://betalist.com/support | yes (2026-09-30) |
| 80 | "When it isn't guaranteed, the newsletter only includes the most popular featured startups. It takes at least 24 hours between a startup getting featured and being included in the newsletter so we can fairly determine popularity." | https://betalist.com/support | yes (2026-09-30) |
| 81 | "The "Visit Site" button on your featured listing is a do-follow link" | https://betalist.com/support | yes (2026-09-30) |
| 82 | "It routes through a 301 redirect to your website so we can track clicks and add ref=betalist attribution." | https://betalist.com/support | yes (2026-09-30) |
| 83 | "We automatically add UTM tracking parameters to links to your website, so you can track traffic from BetaList using Google Analytics or similar tools." | https://betalist.com/support | yes (2026-09-30) |
| 84 | "We may also change how your startup is presented on our platform, including design, layout, and link attributes, without notice." | https://betalist.com/terms/submissions | no copy checked |
| 85 | "Submissions that are misleading, fraudulent, or otherwise violate these terms may be rejected or removed at any time." | https://betalist.com/terms/submissions | no copy checked |
| 86 | "If you receive sales or promotional emails after being featured, it's likely because service providers scrape startup directories (including BetaList) for leads and find publicly available contact information on your own website or social media profiles." | https://betalist.com/support | yes (2026-09-30) |
| 87 | "Most edits are approved automatically within minutes; the rest are reviewed by our team." | https://betalist.com/support | no: the 2026-09-30 copy predates this wording |
| 88 | "The one rule for moving to a new domain is that your old URL must redirect to your new one" | https://betalist.com/support | no: the 2026-09-30 copy predates this wording |
| 89 | "We generally only feature each startup once, with one exception" | https://betalist.com/support | yes (2026-09-30) |

## Paraphrased claims and their sources

- "In red beneath it": on `/criteria`, the lists of what doesn't fit are `<ul class="list-disc pl-5 text-red-500">` directly after each list of what fits. The page says "Fits" and "Doesn't" for the two lists.
- Audience figures (70,000+ newsletter subscribers, 500,000+ pageviews per month, 24,000+ startups featured) and the plan cards' "60k+ subscribers": Advertise page. Given as BetaList's own figures.
- Product Hunt is a poor fit for a bare waitlist: our own Product Hunt post, which quotes Product Hunt's featuring guidelines.
- Signed out, the submission form sends you to the sign-in page: `/submit` redirect, see Method.
- The FAQ sends you to your dashboard to check a submission's status: "How can I see the status of my startup submission? Visit your dashboard."
- Refunds can take 5 to 10 business days to reach your statement: FAQ, "How long does a refund take?" (source uses an en dash).
- Site QA nit (21 October 2026): the refund paragraph now quotes the Submission Terms' "If your priority listing submission is not accepted for featuring, you are generally eligible for a refund." before the two discretion clauses, and "The FAQ is simple:" now reads "The FAQ says:". `/terms/submissions` was fetched again at 07:12 UTC on 21 October 2026, returned HTTP 200 and was unchanged from the first read; all three refund quotes match it word for word. A second, optional nit split the eligibility quote from the discretion clauses ("They also say" instead of "but also"), so each quote ends its own sentence; the quotes themselves are unchanged.
- They reserve the right to limit or deny refunds in some cases, including repeated rejected submissions: Submission Terms, section 4 ("We reserve the right to limit or deny refunds in cases of abuse, repeated rejected submissions, violations of these terms, or if your startup is ultimately featured.").
- Boost is cancel anytime: Boost page plan cards.
- You can resubmit after a rejection: FAQ, "Can I resubmit my startup after it was rejected?" ("Yes, you are welcome to resubmit your startup in the future if you've made improvements based on our submission guidelines.").
- A startup featured before launch can be featured again at launch: FAQ, "How do I get featured again?" (the rest of the sentence after "with one exception" contains the typo "eligble", so it is paraphrased).
- Look for the source "betalist" in your analytics: FAQ ("Check your analytics dashboard for traffic from source "betalist".").
- Share your BetaList post on the day: our reading of the Trending answer ("the more engagement your startup post receives, the higher its chances of getting trending").
- None of BetaList's pages above sets upvote or launch-day conduct rules: checked on the FAQ, guidelines, Submission Terms, Terms of Service, Boost and Advertise pages.

## LaunchLoop mention

"A LaunchLoop kit drafts a tagline, a description and launch images from your repo and live page, which you can adapt for your BetaList listing. It doesn't submit anything for you." The shared preview CTA is rendered by `BlogPostLayout`.

## Left out, and why

- **The submission price and plan names.** Only at the end of the signed-in submission form; no public page or archive copy has them.
- **The submission form's fields and limits.** Behind sign-in. The page lists the parts of a listing the FAQ says you can edit (icon, name, pitch, description, website URL, images) and says the exact fields couldn't be read.
- **Review and featuring times in days.** BetaList gives none publicly: the FAQ says the timeline depends on the plan and is shown at checkout and in the confirmation email.
- **How many startups are featured per day, and the Trending algorithm.** Not stated; the FAQ says "We're not disclosing the exact algorithm".
- **The landing page guide's MailChimp credit offer** ("Use this link for a free $30 credit."). An affiliate offer, not a submission rule.
- **The API access answer** in the FAQ. Not relevant to launching.
- **Third-party BetaList guides** found while searching. Not primary, not used.
- **Any LaunchLoop metric or testimonial.** None used.
- **The Product Hunt alternatives post (PR #60).** Not on main yet. The page links it with one sentence only when `product-hunt-alternatives` is in `BLOG_POSTS`, so the link appears once #60 has merged. That sentence adds about 10 words, which keeps the reading time at 15 minutes.
