import type { RepoData } from "./github";
import type { SiteData } from "./site";

/** Typing "sample" (or clicking "Try a sample app") ingests this fixture instead of hitting the network. */
export const SAMPLE_INPUT = "sample";

export const sampleRepo: RepoData = {
  owner: "snapshelf",
  name: "snapshelf",
  url: "https://github.com/snapshelf/snapshelf",
  description: "Turn your screenshot folder into a searchable library. OCR, tags and instant search, all local-first.",
  homepage: "https://snapshelf.app",
  stars: 312,
  topics: ["screenshots", "ocr", "productivity", "nextjs", "supabase"],
  language: "TypeScript",
  license: "MIT",
  readme: `# Snapshelf

Turn your screenshot folder into a searchable library.

Snapshelf watches your screenshots folder, reads the text in every image with on-device OCR, and lets you find any screenshot in under a second by typing what was in it.

## Features

- Search screenshots by the text inside them (on-device OCR, nothing leaves your machine)
- Auto-tags screenshots by app and website
- Drag a result straight into Slack, Linear or Figma
- Collections for bugs, receipts and inspiration
- Works offline; syncs across devices with Supabase if you want it

## Why

I take about 40 screenshots a day and could never find the one I needed. Snapshelf indexed 11,000 of mine in four minutes.

## Stack

Next.js 15, Tailwind, Supabase, Tesseract.js. Built with Cursor in a weekend.
`,
  packageJson: {
    name: "snapshelf",
    description: "Searchable screenshot library",
    dependencies: {
      next: "15.3.0",
      react: "19.0.0",
      "@supabase/supabase-js": "2.45.0",
      "tesseract.js": "5.1.0",
      tailwindcss: "4.0.0",
      stripe: "17.0.0",
    },
  },
  commits: [
    { message: "Add drag-to-Slack from search results", date: "2026-10-13T18:22:00Z" },
    { message: "Index 11k screenshots in under 4 minutes (batch OCR workers)", date: "2026-10-12T21:05:00Z" },
    { message: "Collections: bugs, receipts, inspiration", date: "2026-10-11T10:40:00Z" },
    { message: "Auto-tag by source app using window titles", date: "2026-10-09T16:12:00Z" },
    { message: "Offline mode with optional Supabase sync", date: "2026-10-07T09:30:00Z" },
    { message: "Fix OCR on retina screenshots", date: "2026-10-05T14:01:00Z" },
  ],
};

export const sampleSite: SiteData = {
  url: "https://snapshelf.app",
  title: "Snapshelf: find any screenshot by typing what's in it",
  description: "Snapshelf turns your screenshot folder into a searchable library with on-device OCR.",
  siteName: "Snapshelf",
  h1: "Find any screenshot by typing what's in it",
  headings: ["On-device OCR", "Auto-tagging", "Drag anywhere", "Free for 500 screenshots"],
  paragraphs: [
    "Snapshelf reads the text in every screenshot on your machine, so you can search them like documents.",
  ],
  listItems: ["Search by text inside images", "Tags by app and website", "Works offline"],
  prices: ["$6/mo"],
  themeColor: "#0f766e",
  css: ":root{--background:#06201d;--primary:#14b8a6;--foreground:#ecfdf5} .btn{background:#14b8a6} a{color:#5eead4}",
};
