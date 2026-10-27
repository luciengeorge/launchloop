import { charLength } from "./limits";

/**
 * Show HN title and first-comment checks. Every "rule" check enforces a sentence quoted word for word from
 * Hacker News's own pages (fetched 27 October 2026, see docs/seo/2026-10-27-show-hn-title-checker.md); a "tip" is
 * LaunchLoop's own heuristic and is labelled as such everywhere it is shown. HN states no title length limit on these
 * pages, so the length is a plain count with no pass or warn.
 */
export const HN_SOURCES = {
  showhn: { url: "https://news.ycombinator.com/showhn.html", name: "Show HN guidelines" },
  guidelines: { url: "https://news.ycombinator.com/newsguidelines.html", name: "Hacker News guidelines" },
  faq: { url: "https://news.ycombinator.com/newsfaq.html", name: "Hacker News FAQ" },
} as const;

export type HnSource = keyof typeof HN_SOURCES;

export type HnQuote = { text: string; source: HnSource };

export const HN_FETCHED = "2026-10-27";

export const HN_QUOTES = {
  prefix: { text: 'To post, submit a story whose title begins with "Show HN".', source: "showhn" },
  titles: { text: "Please don't do things to make titles stand out, like using uppercase or exclamation points, or saying how great an article is.", source: "guidelines" },
  siteName: { text: "If the title includes the name of the site, please take it out, because the site name will be displayed after the link.", source: "guidelines" },
  number: { text: "If the title contains a gratuitous number or number + adjective, we'd appreciate it if you'd crop it.", source: "guidelines" },
  numberException: { text: 'Exception: when the number is meaningful, e.g. "The 5 Platonic Solids."', source: "guidelines" },
  media: { text: "If you submit a video or pdf, please warn us by appending [video] or [pdf] to the title.", source: "guidelines" },
  upgrades: { text: 'New features and upgrades ("Foo 1.3.1 is out") generally aren\'t substantive enough to be Show HNs. A major overhaul is probably ok.', source: "showhn" },
  offTopic: { text: "Off topic: blog posts, sign-up pages, newsletters, lists, and other reading material.", source: "showhn" },
  notReady: { text: "If your work isn't ready for users to try out, please don't do a Show HN.", source: "showhn" },
  landing: { text: "Don't post landing pages or fundraisers.", source: "showhn" },
  askFriends: { text: "Please don't ask friends to upvote or comment. That's not ok on HN.", source: "showhn" },
  solicit: { text: "Don't solicit upvotes, comments, or submissions.", source: "guidelines" },
  penalty: { text: "We penalize or ban submissions, accounts, and sites that break this rule, so please don't.", source: "faq" },
  easyToTry: { text: "Please make it easy for users to try your thing out, ideally without barriers such as signups or emails.", source: "showhn" },
  emphasis: { text: "Please don't use uppercase for emphasis. Instead, put *asterisks* around it and it will get italicized.", source: "guidelines" },
  howWhy: { text: "Explain how and why.", source: "showhn" },
  playWith: { text: "Show HN is for something you've made that other people can play with.", source: "showhn" },
  nonTrivial: { text: "The project should be non-trivial. Don't post quickly-generated one-offs; anybody can do that now.", source: "showhn" },
  personal: { text: "The project must be something you've worked on personally and which you're around to discuss.", source: "showhn" },
  generatedPosts: { text: "Please don't put generated text in HN posts.", source: "guidelines" },
  generatedComments: { text: "Don't post generated text or AI-edited text. HN is for conversation between humans.", source: "guidelines" },
  editorialize: { text: "Otherwise please use the original title, unless it is misleading or linkbait; don't editorialize.", source: "guidelines" },
} as const satisfies Record<string, HnQuote>;

export type CheckId = "prefix" | "caps" | "exclaim" | "hype" | "domain" | "number" | "media" | "upgrade" | "describes" | "offtopic" | "asks" | "signup" | "emphasis" | "howwhy";

export type CheckField = "title" | "comment" | "both";

/** "rule": enforces the quoted HN sentence. "tip": LaunchLoop's own heuristic, not an HN rule. */
export type CheckKind = "rule" | "tip";

export type CheckStatus = "pass" | "warn";

export type LinkType = "project" | "video" | "pdf";

export interface ShowHnRule {
  id: CheckId;
  kind: CheckKind;
  field: CheckField;
  name: string;
  /** What the tool looks for, in plain words, so the page can say exactly how each rule is checked. */
  how: string;
  quotes: readonly HnQuote[];
}

const HYPE: { label: string; re: RegExp }[] = [
  { label: "best", re: /\bbest\b/i },
  { label: "greatest", re: /\bgreatest\b/i },
  { label: "ultimate", re: /\bultimate\b/i },
  { label: "amazing", re: /\bamazing\b/i },
  { label: "awesome", re: /\bawesome\b/i },
  { label: "incredible", re: /\bincredibl[ey]\b/i },
  { label: "insanely", re: /\binsane(ly)?\b/i },
  { label: "revolutionary", re: /\brevolution(ary|ise|ize|ises|izes|ising|izing)\b/i },
  { label: "game-changing", re: /\bgame[\s-]?chang(er|ers|ing)\b/i },
  { label: "groundbreaking", re: /\bground[\s-]?breaking\b/i },
  { label: "mind-blowing", re: /\bmind[\s-]?blowing\b/i },
  { label: "world's first", re: /\bworld['’]s\s+first\b/i },
  { label: "world-class", re: /\bworld[\s-]class\b/i },
  { label: "cutting-edge", re: /\bcutting[\s-]edge\b/i },
  { label: "next-level", re: /\bnext[\s-]level\b/i },
  { label: "blazing fast", re: /\bblazing(ly)?[\s-]fast\b/i },
  { label: "lightning fast", re: /\blightning[\s-]fast\b/i },
  { label: "stunning", re: /\bstunning\b/i },
  { label: "magical", re: /\bmagical(ly)?\b/i },
  { label: "killer", re: /\bkiller\b/i },
  { label: "epic", re: /\bepic\b/i },
  { label: "unbelievable", re: /\bunbelievabl[ey]\b/i },
];

export const HYPE_WORDS = HYPE.map((h) => h.label);

/** All-caps words of 4+ letters that are normally written that way, so they are never flagged as shouting. */
const ACRONYMS = new Set([
  "ASCII", "BIOS", "CMYK", "CORS", "CRDT", "CRUD", "CUDA", "DRAM", "FIDO", "FPGA", "GDPR", "GPIO", "GTFS", "HIPAA", "HTML", "HTMX", "HTTP", "HTTPS",
  "IMAP", "IPFS", "JPEG", "JSON", "LDAP", "LIDAR", "MIDI", "MQTT", "NASA", "NVIDIA", "NVME", "OAUTH", "OIDC", "POSIX", "RAID", "REST", "RISC",
  "SAML", "SCIM", "SMTP", "SOAP", "SQLITE", "TODO", "TOML", "TOTP", "UART", "UNIX", "VRAM", "WASM", "WEBP", "WYSIWYG", "XMPP", "YAML",
]);
/** Short words people capitalise to shout, which are too short for the 4-letter rule. */
const SHOUTED_SHORT = new Set(["NEW", "NOW", "ALL", "YOU", "OUR", "THE", "AND", "FOR", "ANY", "NOT", "WOW", "OMG"]);

const PREFIX = /^show hn\b\s*:?\s*/i;
const DOMAIN = /(?<![@\w.-])(?:www\.)?[a-z0-9][a-z0-9-]*\.(?:com|net|org|io|dev|app|ai|co|sh|me|xyz|gg|tech|site|run|tools|page|cloud|studio|design|fm|tv|ly|to|us|uk|de|fr|club|lol|fyi)\b/i;
const NUMBER_ADJECTIVE = new RegExp(`(?:^|\\s)\\d[\\d,]*\\+?\\s+(?:${HYPE.map((h) => h.re.source.replace(/^\\b|\\b$/g, "")).join("|")}|essential|great|surprising|powerful)\\b`, "i");
const LISTICLE = /(?:^|\s)\d[\d,]*\+?\s+(?:\w+\s+)?(?:ways|reasons|things|tips|tricks|secrets|hacks|lessons|mistakes|facts|ideas|examples|steps|resources)\b/i;
const VERSION = /\bv\d+(?:\.\d+)*\b|\b\d+\.\d+\.\d+\b|\b(?:is out|is now out|now available|now supports|new version|just released)\b/i;
const OFF_TOPIC: { label: string; re: RegExp }[] = [
  { label: "a waitlist", re: /\b(?:join|on|sign up for)\s+(?:the|our|my)\s+wait[\s-]?list\b|\b(?:my|our)\s+wait[\s-]?list\b/i },
  { label: "a newsletter", re: /\b(?:my|our)\s+newsletter\b|\bsubscribe\s+to\s+(?:my|our|the)\b/i },
  { label: "a blog post", re: /\b(?:my|our)\s+(?:new\s+)?blog\s+post\b/i },
  { label: "a landing page", re: /\b(?:my|our)\s+landing\s+page\b/i },
  { label: "a fundraiser", re: /\bfundrais(?:er|ing)\b|\bcrowdfunding\b|\bkickstarter\b|\bindiegogo\b|\bpre-?orders?\b/i },
  { label: "coming soon", re: /\bcoming\s+soon\b|\blaunching\s+soon\b/i },
];
const ASKS: RegExp[] = [
  /\bup-?vot(?:e|es|ed|ing)\b/i,
  /\bvot(?:e|es|ing)\s+(?:for|on)\s+(?:us|me|our|my|it|this)\b/i,
  /\b(?:please|pls|plz|kindly)\b[^.!?\n]{0,40}\b(?:vote|comment|retweet|boost)\b/i,
  /\b(?:leave|drop|post|write)\s+(?:a|us\s+a|me\s+a|your)\s+comments?\b/i,
  /\bcomment\s+below\b/i,
  /\bsupport\s+(?:us|me)\s+on\s+(?:hn|hacker\s*news)\b/i,
  /\bhelp\s+(?:us|me)\s+(?:get\s+to|reach|hit|climb\s+to)\s+(?:the\s+)?(?:front\s*page|top|#\s?1|number\s+one)\b/i,
  /\bshow\s+(?:us\s+|me\s+)?(?:some\s+)?love\b/i,
];
const SIGNUP = /\bsign[\s-]?(?:up|in)\b|\bsigning\s+up\b|\bregist(?:er|ration)\b|\blog[\s-]?in\b|\bcreate\s+an\s+account\b|\baccount\s+(?:is\s+)?(?:required|needed)\b|\b(?:your|an)\s+email(?:\s+address)?\b/i;
const NEGATION = /\b(?:no|without|never|zero|nothing)\b|n['’]t\b|\bnot\b/i;
/** "You can't try it without signing up" negates twice: still a barrier. */
const DOUBLE_NEGATION = /\b(?:can['’]?t|cannot|won['’]t)\b[^.!?\n]{0,40}\bwithout\b/i;
const HOW_WHY = /\bbecause\b|\bwhy\b|\bhow\b|\bi\s+(?:built|made|wrote|started|wanted|needed|was)\b|\bthe\s+idea\b|\bproblem\b|\bbackstory\b/i;
const MIN_DESCRIBING_WORDS = 3;

const q = (...quotes: HnQuote[]) => quotes;

export const SHOW_HN_RULES: readonly ShowHnRule[] = [
  { id: "prefix", kind: "rule", field: "title", name: "Starts with “Show HN”", how: "Checks the title begins with Show HN, in that case.", quotes: q(HN_QUOTES.prefix) },
  { id: "caps", kind: "rule", field: "title", name: "No uppercase to stand out", how: "Flags all-caps words of four or more letters, and shouted short words like NEW or FREE, but not common acronyms such as JSON or HTTP.", quotes: q(HN_QUOTES.titles) },
  { id: "exclaim", kind: "rule", field: "title", name: "No exclamation points", how: "Flags any exclamation mark in the title.", quotes: q(HN_QUOTES.titles) },
  { id: "hype", kind: "rule", field: "title", name: "No saying how great it is", how: `Flags superlatives and hype from our own word list: ${HYPE_WORDS.join(", ")}.`, quotes: q(HN_QUOTES.titles) },
  { id: "domain", kind: "rule", field: "title", name: "No site name", how: "Flags anything that looks like a domain, such as gridcast.app.", quotes: q(HN_QUOTES.siteName) },
  { id: "number", kind: "rule", field: "title", name: "No gratuitous numbers", how: "Flags listicle numbers like 10 Ways or 14 Amazing. A meaningful number is fine, as HN says.", quotes: q(HN_QUOTES.number, HN_QUOTES.numberException) },
  { id: "media", kind: "rule", field: "title", name: "[video] or [pdf] for videos and PDFs", how: "If you say your link is a video or a PDF, checks the title ends with [video] or [pdf].", quotes: q(HN_QUOTES.media) },
  { id: "upgrade", kind: "rule", field: "title", name: "Not just a version bump", how: "Flags version numbers like 1.3.1 or v2 and phrases like is out or now supports.", quotes: q(HN_QUOTES.upgrades) },
  { id: "offtopic", kind: "rule", field: "both", name: "Something people can try now", how: "Flags a waitlist, newsletter, blog post, landing page, fundraiser or crowdfunding campaign, or coming soon, in the title or text.", quotes: q(HN_QUOTES.offTopic, HN_QUOTES.notReady, HN_QUOTES.landing) },
  { id: "asks", kind: "rule", field: "both", name: "No asking for upvotes or comments", how: "Flags asking people to upvote, vote, comment, share or help you reach the front page. Asking for feedback isn't flagged.", quotes: q(HN_QUOTES.askFriends, HN_QUOTES.solicit, HN_QUOTES.penalty) },
  { id: "signup", kind: "rule", field: "comment", name: "Easy to try without a sign-up", how: "Flags mentions of signing up, logging in, an account or an email address, unless the sentence says you don't need one.", quotes: q(HN_QUOTES.easyToTry) },
  { id: "emphasis", kind: "rule", field: "comment", name: "No uppercase for emphasis", how: "Flags all-caps words in your text, except common acronyms.", quotes: q(HN_QUOTES.emphasis) },
  { id: "describes", kind: "tip", field: "title", name: "Says what it is, not just the name", how: `Our tip, not an HN rule: warns when fewer than ${MIN_DESCRIBING_WORDS} words follow Show HN.`, quotes: q() },
  { id: "howwhy", kind: "tip", field: "comment", name: "Explains how and why", how: "Our guess at an HN sentence: looks for words like because, why, how, problem or I built. It can't tell whether you actually explained anything.", quotes: q(HN_QUOTES.howWhy) },
];

export const RULE_BY_ID = Object.fromEntries(SHOW_HN_RULES.map((r) => [r.id, r])) as Record<CheckId, ShowHnRule>;

export interface ShowHnCheck {
  id: CheckId;
  kind: CheckKind;
  status: CheckStatus;
  label: string;
  detail: string;
}

/** "pass": every rule and tip passes. "tips": every HN rule passes, a tip doesn't. "warn": at least one HN rule to fix. */
export type Verdict = "pass" | "tips" | "warn";

export interface ShowHnResult {
  titleLength: number;
  commentLength: number;
  verdict: Verdict;
  checks: ShowHnCheck[];
}

export interface ShowHnInput {
  title: string;
  comment?: string;
  link?: LinkType;
}

const quoteList = (words: string[]) => words.map((w) => `“${w}”`).join(", ");

/** The title after the "Show HN:" prefix, or the whole title if it has none. */
export const titleBody = (title: string) => title.trim().replace(PREFIX, "");

export const hypeWords = (text: string) => HYPE.filter((h) => h.re.test(text)).map((h) => h.label);

export function shoutedWords(text: string): string[] {
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
  const shouted = words.filter((w) => {
    const letters = w.replace(/[^\p{L}]/gu, "");
    if (!letters || letters !== letters.toUpperCase() || letters === letters.toLowerCase()) return false;
    const bare = w.replace(/['’-]/g, "").toUpperCase();
    if (ACRONYMS.has(bare)) return false;
    return letters.length >= 4 || SHOUTED_SHORT.has(bare);
  });
  return [...new Set(shouted)];
}

export const findDomain = (text: string) => text.match(DOMAIN)?.[0] ?? null;
export const hasGratuitousNumber = (text: string) => LISTICLE.test(text) || NUMBER_ADJECTIVE.test(text);
export const looksLikeUpgrade = (text: string) => VERSION.test(text);
export const offTopicSigns = (text: string) => OFF_TOPIC.filter((o) => o.re.test(text)).map((o) => o.label);
export const asksForEngagement = (text: string) => ASKS.some((re) => re.test(text));
export const explainsHowWhy = (text: string) => HOW_WHY.test(text);

/** True if a sentence mentions a sign-up, login, account or email without saying it isn't needed. */
export function mentionsSignupBarrier(text: string): boolean {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  return sentences.some((s) => SIGNUP.test(s) && (!NEGATION.test(s) || DOUBLE_NEGATION.test(s)));
}

const result = (id: CheckId, status: CheckStatus, label: string, detail: string): ShowHnCheck => ({ id, kind: RULE_BY_ID[id].kind, status, label, detail });
const pass = (id: CheckId, label: string, detail: string) => result(id, "pass", label, detail);
const warn = (id: CheckId, label: string, detail: string) => result(id, "warn", label, detail);

function prefixCheck(title: string): ShowHnCheck {
  if (title.startsWith("Show HN")) return pass("prefix", "Starts with “Show HN”", "Posted with this title, it counts as a Show HN.");
  if (PREFIX.test(title)) return warn("prefix", "Write it as “Show HN”", "HN's rule spells it “Show HN”, with a capital S, H and N. Match it exactly.");
  return warn("prefix", "Doesn't start with “Show HN”", "Start the title with “Show HN: ” so it's posted as a Show HN.");
}

function mediaCheck(title: string, link: LinkType): ShowHnCheck {
  switch (link) {
    case "project":
      return pass("media", "No [video] or [pdf] needed", "Your link isn't a video or a PDF.");
    case "video":
    case "pdf": {
      const tag = `[${link}]`;
      return title.toLowerCase().endsWith(tag)
        ? pass("media", `Ends with ${tag}`, "Readers know what the link opens.")
        : warn("media", `Add ${tag} to the end`, `Your link is a ${link === "pdf" ? "PDF" : "video"}, so HN asks for ${tag} at the end of the title.`);
    }
    default: {
      const unreachable: never = link;
      return unreachable;
    }
  }
}

function titleChecks(title: string, link: LinkType): ShowHnCheck[] {
  const body = titleBody(title);
  const caps = shoutedWords(body);
  const hype = hypeWords(body);
  const domain = findDomain(body);
  const words = body.match(/[\p{L}\p{N}]+/gu) ?? [];
  return [
    prefixCheck(title),
    caps.length ? warn("caps", `Capitals: ${quoteList(caps)}`, "Write it in normal case. If it's an acronym, ignore this.") : pass("caps", "No shouting in capitals", "Acronyms like JSON or HTTP are fine."),
    body.includes("!") ? warn("exclaim", "Has an exclamation point", "Drop it. HN asks titles not to use them to stand out.") : pass("exclaim", "No exclamation points", "Reads as a plain description."),
    hype.length ? warn("hype", `Hype: ${quoteList(hype)}`, "Replace it with what the project does. Let readers decide how good it is.") : pass("hype", "No hype words", "Says what it is, not how great it is."),
    domain ? warn("domain", `Site name: “${domain}”`, "HN already shows your domain after the link. Use the space to say what it does.") : pass("domain", "No site name", "HN shows your domain next to the title."),
    hasGratuitousNumber(body)
      ? warn("number", "Looks like a listicle number", "Crop numbers that are only there for effect. If the number means something, ignore this.")
      : pass("number", "No gratuitous numbers", "Any number left is doing work."),
    mediaCheck(title, link),
    looksLikeUpgrade(body)
      ? warn("upgrade", "Looks like a release or upgrade", "A new version or feature usually isn't a Show HN. A major overhaul probably is: say what changed.")
      : pass("upgrade", "Not a version bump", "Reads as a project, not a release note."),
    words.length >= MIN_DESCRIBING_WORDS ? pass("describes", "Says what it is", "There are words after the name.") : warn("describes", "Only a name?", "Our tip: add a few plain words saying what it does."),
  ];
}

function offTopicCheck(text: string): ShowHnCheck {
  const signs = offTopicSigns(text);
  return signs.length
    ? warn("offtopic", `Mentions ${signs.join(", ")}`, "Show HN is for things people can try now. If they can't yet, come back when they can.")
    : pass("offtopic", "Reads as something to try now", "No waitlist, newsletter or fundraiser.");
}

function asksCheck(text: string): ShowHnCheck {
  return asksForEngagement(text)
    ? warn("asks", "Asks for upvotes or comments", "Take it out. HN penalises submissions that ask, even politely.")
    : pass("asks", "No asking for votes or comments", "Asking for feedback isn't flagged.");
}

function commentChecks(comment: string): ShowHnCheck[] {
  const caps = shoutedWords(comment);
  return [
    mentionsSignupBarrier(comment)
      ? warn("signup", "Mentions a sign-up, login or email", "If people need an account to try it, add a demo or guest mode. If they don't, say so.")
      : pass("signup", "No sign-up barrier mentioned", "Readers can try it straight away."),
    caps.length ? warn("emphasis", `Capitals: ${quoteList(caps)}`, "HN italicises *asterisks*. Use those instead, or drop the emphasis.") : pass("emphasis", "No capitals for emphasis", "Use *asterisks* if you need emphasis."),
    explainsHowWhy(comment)
      ? pass("howwhy", "Explains how or why", "Our guess from your wording. Check it says why you built it and how it works.")
      : warn("howwhy", "Doesn't seem to say how or why", "Our tip: add why you built it and how it works."),
  ];
}

/** Runs every check. Text checks run only on a non-empty title or comment. */
export function checkShowHn({ title: rawTitle, comment: rawComment = "", link = "project" }: ShowHnInput): ShowHnResult {
  const title = rawTitle.trim();
  const comment = rawComment.trim();
  const checks: ShowHnCheck[] = [];
  if (title) checks.push(...titleChecks(title, link));
  if (title || comment) {
    const both = `${title}\n${comment}`;
    checks.push(offTopicCheck(both), asksCheck(both));
  }
  if (comment) checks.push(...commentChecks(comment));
  const rulesWarn = checks.some((c) => c.kind === "rule" && c.status === "warn");
  const tipsWarn = checks.some((c) => c.kind === "tip" && c.status === "warn");
  const verdict: Verdict = rulesWarn ? "warn" : tipsWarn ? "tips" : "pass";
  return { titleLength: charLength(title), commentLength: charLength(comment), verdict, checks };
}

/** A before/after pair shown on the page. Unit tests run both through checkShowHn, so the page can't disagree with the checker. */
export interface ShowHnExample {
  before: { title: string; comment?: string };
  after: { title: string; comment?: string };
  link?: LinkType;
  /** The checks `before` fails. `after` passes every check. */
  fixes: CheckId[];
}

export const SHOW_HN_EXAMPLES: readonly ShowHnExample[] = [
  {
    before: { title: "Show HN: GRIDCAST, the best dashboard tool ever!" },
    after: { title: "Show HN: Gridcast, turn a CSV into a dashboard you can share by link" },
    fixes: ["caps", "hype", "exclaim"],
  },
  {
    before: { title: "Show HN: Gridcast.app, 10 amazing dashboard templates" },
    after: { title: "Show HN: Gridcast, dashboards from a CSV that never leave your browser" },
    fixes: ["domain", "number", "hype"],
  },
  {
    before: { title: "Show HN: Gridcast 2.4.1 is out with dark mode" },
    after: { title: "Show HN: Gridcast, a CSV dashboard tool I rebuilt around DuckDB" },
    fixes: ["upgrade"],
  },
  {
    before: { title: "Show HN: Join the waitlist for my budgeting app" },
    after: { title: "Show HN: A budgeting app that reads your bank's CSV export" },
    fixes: ["offtopic"],
  },
  {
    before: { title: "Show HN: Building a split keyboard from scratch" },
    after: { title: "Show HN: Building a split keyboard from scratch [video]" },
    link: "video",
    fixes: ["media"],
  },
  {
    before: {
      title: "Show HN: Ledgerline, plain-text accounting in the terminal",
      comment: "Please upvote and leave a comment! You need to sign up with your email to try it, because it saves your ledger. It is REALLY fast.",
    },
    after: {
      title: "Show HN: Ledgerline, plain-text accounting in the terminal",
      comment: "I built Ledgerline because my spreadsheet budget kept breaking. It reads plain-text files and runs in the terminal. The demo loads sample data, no sign-up needed. It's *fast* on a 10-year ledger.",
    },
    fixes: ["asks", "signup", "emphasis"],
  },
];
