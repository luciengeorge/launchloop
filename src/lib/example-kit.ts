import type { Kit } from "./schema";

/**
 * The example kit behind "See an example kit" (exp_hero_sample_cta), served at /example-kit. A fixed record, not a
 * stored kit: the built-in sample app (Snapshelf) as LaunchLoop writes it offline (the sample ingest, the brief and
 * the template copy). No owner, no email, nothing to buy, and it never expires. Only the share images are served
 * for it (/api/og/example-snapshelf/…); every other kit route treats its id as unknown.
 */
export const EXAMPLE_KIT: Kit = {
  "id": "example-snapshelf",
  "createdAt": "2026-10-21T00:00:00.000Z",
  "status": "ready",
  "source": {
    "input": "sample",
    "repoUrl": "https://github.com/snapshelf/snapshelf",
    "siteUrl": "https://snapshelf.app",
    "stars": 312,
    "commitsAnalysed": 6,
    "fingerprint": "sample@v1",
    "readmeFound": true,
    "packageJsonFound": true,
    "pageScraped": true,
    "warnings": []
  },
  "brief": {
    "name": "Snapshelf",
    "oneLiner": "Turn your screenshot folder into a searchable library. OCR, tags and instant search, all local-first.",
    "audience": "indie makers and small teams",
    "problem": "I take about 40 screenshots a day and could never find the one I needed.",
    "tone": "friendly, specific, no hype",
    "features": [
      "Search screenshots by the text inside them (on-device OCR, nothing leaves your machine)",
      "Auto-tags screenshots by app and website",
      "Drag a result straight into Slack, Linear or Figma",
      "Collections for bugs, receipts and inspiration",
      "Works offline; syncs across devices with Supabase if you want it",
      "Free for 500 screenshots"
    ],
    "proofPoints": [
      "312 GitHub stars",
      "6 commits in the last month",
      "Latest ship: Add drag-to-Slack from search results",
      "Open source (MIT)",
      "Pricing on site: $6/mo"
    ],
    "stack": [
      "Next.js",
      "React",
      "Supabase",
      "Tesseract.js",
      "Tailwind CSS",
      "Stripe"
    ],
    "url": "https://snapshelf.app",
    "repoUrl": "https://github.com/snapshelf/snapshelf"
  },
  "palette": {
    "background": "#06201d",
    "foreground": "#ffffff",
    "accent": "#14b8a6",
    "accentForeground": "#0a0a10",
    "muted": "#a0aaa9",
    "source": "site"
  },
  "preview": {
    "tagline": "Turn your screenshot folder into a searchable library",
    "xPost": "I just launched Snapshelf.\n\nTurn your screenshot folder into a searchable library. OCR, tags and instant search, all local-first.\n\n→ Search screenshots by the text inside them\n→ Auto-tags screenshots by app and website\n\nhttps://snapshelf.app"
  },
  "digest": "",
  "llm": "template",
  "paid": true,
  "attempts": 0,
  "content": {
    "landing": {
      "headline": "Turn your screenshot folder into a searchable library",
      "subheadline": "OCR, tags and instant search, all local-first. Built for indie makers and small teams.",
      "cta": "Try Snapshelf free",
      "features": [
        {
          "title": "Search screenshots by the text",
          "description": "Search screenshots by the text inside them (on-device OCR, nothing leaves your machine)."
        },
        {
          "title": "Auto-tags screenshots by app",
          "description": "Auto-tags screenshots by app and website."
        },
        {
          "title": "Drag a result",
          "description": "Drag a result straight into Slack, Linear or Figma."
        },
        {
          "title": "Collections for bugs, receipts",
          "description": "Collections for bugs, receipts and inspiration."
        },
        {
          "title": "Works offline",
          "description": "Works offline; syncs across devices with Supabase if you want it."
        },
        {
          "title": "Free for 500 screenshots",
          "description": "Free for 500 screenshots."
        }
      ],
      "metaTitle": "Turn your screenshot folder into a searchable library",
      "metaDescription": "Turn your screenshot folder into a searchable library. OCR, tags and instant search, all local-first."
    },
    "productHunt": {
      "name": "Snapshelf",
      "tagline": "Turn your screenshot folder into a searchable library",
      "description": "Turn your screenshot folder into a searchable library. OCR, tags and instant search, all local-first. Search screenshots by the text inside them (on-device OCR, nothing leaves your machine). Auto-tags screenshots by app and website.",
      "makerComment": "Hey Product Hunt 👋\n\nI'm the maker of Snapshelf. I take about 40 screenshots a day and could never find the one I needed.\n\nSo I built Snapshelf: turn your screenshot folder into a searchable library. OCR, tags and instant search, all local-first.\n\nWhat it does today:\n• Search screenshots by the text inside them\n• Auto-tags screenshots by app and website\n• Drag a result straight into Slack, Linear or Figma\n• Collections for bugs, receipts and inspiration\n\nBuilt with Next.js, React, Supabase, Tesseract.js. 312 GitHub stars.\n\nI'd really value your honest feedback, especially on search screenshots by the text inside them. What's missing for your workflow?",
      "topics": [
        "Productivity",
        "Design Tools"
      ]
    },
    "xThread": [
      "I just launched Snapshelf.\n\nTurn your screenshot folder into a searchable library. OCR, tags and instant search, all local-first.\n\n→ Search screenshots by the text inside them\n→ Auto-tags screenshots by app and website\n\nhttps://snapshelf.app",
      "The problem: I take about 40 screenshots a day and could never find the one I needed.",
      "How Snapshelf works:\n\n1. Search screenshots by the text inside them\n2. Auto-tags screenshots by app and website\n3. Drag a result straight into Slack, Linear or Figma",
      "A few more things it does:\n\n→ Collections for bugs, receipts and inspiration\n→ Works offline\n→ Free for 500 screenshots",
      "Under the hood: Next.js, React, Supabase, Tesseract.js.\n\n312 GitHub stars.\n6 commits in the last month.",
      "Try it here: https://snapshelf.app\n\nI'd love blunt feedback. What would make this a must-have for you?"
    ],
    "linkedin": "I take about 40 screenshots a day and could never find the one I needed.\n\nSo I built Snapshelf.\n\nTurn your screenshot folder into a searchable library. OCR, tags and instant search, all local-first.\n\nWhat it does:\n✅ Search screenshots by the text inside them (on-device OCR, nothing leaves your machine)\n✅ Auto-tags screenshots by app and website\n✅ Drag a result straight into Slack, Linear or Figma\n✅ Collections for bugs, receipts and inspiration\n\n312 GitHub stars. 6 commits in the last month.\n\nIt's live now: https://snapshelf.app\n\nIf you're one of the indie makers and small teams I built this for, I'd love to hear what you think. What's the one thing you'd want it to do next?\n\n#buildinpublic #indiehackers"
  },
  "checklist": [
    "Pick a launch day (Tuesday to Thursday is busiest) and schedule the Product Hunt post for 12:01am Pacific.",
    "On Product Hunt, paste the name, tagline and description from this kit, then upload the gallery image first and the other two after it.",
    "Post the maker comment as the first comment on your launch as soon as it goes live.",
    "Update your landing page hero, meta title and meta description, and set og:image to og-1200x630.png on https://snapshelf.app.",
    "Publish the X thread from your own account at launch time, attach x-1600x900.png to post 1 and pin it.",
    "Post the LinkedIn version 2 to 3 hours later to catch the UK and US mornings.",
    "Tell your users, email list and friends you've launched. Ask for feedback and questions, not votes: Product Hunt bans vote requests and penalises them.",
    "Reply to every comment within the first 6 hours, with specifics rather than \"thanks!\".",
    "Share on Indie Hackers, r/SideProject and relevant Discords, following each community's self-promotion rules.",
    "The day after, post a short follow-up with what you learned and real numbers (visitors, sign-ups, feedback themes)."
  ]
};
