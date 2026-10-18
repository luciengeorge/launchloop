import type { PackageJson, RepoData } from "./ingest/github";

/** Pure: no server-only, so it can be unit tested. Ingest (github.ts) and the brief (brief.ts) share it. */

const STACK_MAP: Record<string, string> = {
  next: "Next.js",
  react: "React",
  vue: "Vue",
  nuxt: "Nuxt",
  svelte: "Svelte",
  "@sveltejs/kit": "SvelteKit",
  astro: "Astro",
  vite: "Vite",
  "@remix-run/react": "Remix",
  tailwindcss: "Tailwind CSS",
  "@supabase/supabase-js": "Supabase",
  convex: "Convex",
  firebase: "Firebase",
  prisma: "Prisma",
  "@prisma/client": "Prisma",
  "drizzle-orm": "Drizzle",
  stripe: "Stripe",
  openai: "OpenAI",
  "@anthropic-ai/sdk": "Anthropic",
  ai: "Vercel AI SDK",
  "@clerk/nextjs": "Clerk",
  "next-auth": "Auth.js",
  "better-auth": "Better Auth",
  "tesseract.js": "Tesseract.js",
  "three": "Three.js",
  expo: "Expo",
  "react-native": "React Native",
  electron: "Electron",
  "@tauri-apps/api": "Tauri",
  hono: "Hono",
  express: "Express",
};

/** Frameworks and build tools that legitimately live in devDependencies. Servers and SDKs there are usually test or example fixtures. */
const DEV_STACK = new Set(["next", "react", "vue", "nuxt", "svelte", "@sveltejs/kit", "astro", "vite", "@remix-run/react", "tailwindcss", "prisma", "electron", "@tauri-apps/api", "expo", "react-native"]);

/** GitHub topics that name a stack, used when package.json can't tell us. */
const TOPIC_STACK: Record<string, string> = {
  nextjs: "Next.js",
  react: "React",
  reactjs: "React",
  vue: "Vue",
  vuejs: "Vue",
  nuxt: "Nuxt",
  svelte: "Svelte",
  sveltekit: "SvelteKit",
  astro: "Astro",
  vite: "Vite",
  remix: "Remix",
  tailwindcss: "Tailwind CSS",
  supabase: "Supabase",
  convex: "Convex",
  prisma: "Prisma",
  electron: "Electron",
  tauri: "Tauri",
  expo: "Expo",
  "react-native": "React Native",
  phoenix: "Phoenix",
  rails: "Ruby on Rails",
  "ruby-on-rails": "Ruby on Rails",
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  laravel: "Laravel",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  clickhouse: "ClickHouse",
};

/** Monorepo and tooling roots list every package's build and test tooling in devDependencies, so those say nothing about the product. */
const MONOREPO_TOOLS = ["turbo", "lerna", "nx"];
const isToolingRoot = (pkg: PackageJson) =>
  pkg.workspaces !== undefined ||
  MONOREPO_TOOLS.some((t) => t in (pkg.devDependencies ?? {})) ||
  (!Object.keys(pkg.dependencies ?? {}).length && Object.keys(pkg.devDependencies ?? {}).length > 40);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** How each manifest names a dependency. Python names are case-insensitive and may be followed by extras or a version. */
const dependencyPattern: Record<ManifestFile, (dep: string) => RegExp> = {
  "mix.exs": (dep) => new RegExp(`\\{\\s*:${escape(dep)}\\s*,`),
  Gemfile: (dep) => new RegExp(`^\\s*gem\\s+["']${escape(dep)}["']`, "m"),
  "go.mod": (dep) => new RegExp(`(^|\\s)${escape(dep)}(/v\\d+)?\\s+v\\d`, "m"),
  "Cargo.toml": (dep) => new RegExp(`^\\s*(${escape(dep)}\\s*=|\\[[\\w.-]*dependencies\\.${escape(dep)}\\])`, "m"),
  "pyproject.toml": (dep) => new RegExp(`(^|["'\\s])${escape(dep)}\\s*(\\[[^\\]]*\\])?\\s*([<>=~!;"']|$)`, "im"),
  "requirements.txt": (dep) => new RegExp(`^\\s*${escape(dep)}\\s*(\\[[^\\]]*\\])?\\s*([<>=~!;#]|$)`, "im"),
  "composer.json": (dep) => new RegExp(`"${escape(dep)}"\\s*:`),
};

const PYTHON_DEPS: Record<string, string> = {
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  streamlit: "Streamlit",
  gradio: "Gradio",
  langchain: "LangChain",
  sqlalchemy: "SQLAlchemy",
  celery: "Celery",
  openai: "OpenAI",
  anthropic: "Anthropic",
  torch: "PyTorch",
};

/** Per main language: the manifests to read and the dependencies in them that name the stack, in display order. */
export const LANGUAGE_MANIFESTS = {
  Elixir: {
    "mix.exs": {
      phoenix: "Phoenix",
      phoenix_live_view: "Phoenix LiveView",
      ecto_sql: "Ecto",
      ecto: "Ecto",
      ash: "Ash",
      absinthe: "Absinthe",
      oban: "Oban",
      nerves: "Nerves",
      postgrex: "PostgreSQL",
      ecto_ch: "ClickHouse",
      tailwind: "Tailwind CSS",
    },
  },
  Ruby: {
    Gemfile: { rails: "Ruby on Rails", sinatra: "Sinatra", hanami: "Hanami", "turbo-rails": "Hotwire", sidekiq: "Sidekiq", pg: "PostgreSQL", "tailwindcss-rails": "Tailwind CSS" },
  },
  Go: {
    "go.mod": {
      "github.com/gin-gonic/gin": "Gin",
      "github.com/labstack/echo": "Echo",
      "github.com/gofiber/fiber": "Fiber",
      "github.com/go-chi/chi": "chi",
      "github.com/gorilla/mux": "Gorilla",
      "gorm.io/gorm": "GORM",
      "github.com/spf13/cobra": "Cobra",
      "github.com/charmbracelet/bubbletea": "Bubble Tea",
      "github.com/wailsapp/wails": "Wails",
    },
  },
  Rust: {
    "Cargo.toml": {
      axum: "Axum",
      "actix-web": "Actix Web",
      rocket: "Rocket",
      leptos: "Leptos",
      dioxus: "Dioxus",
      yew: "Yew",
      tauri: "Tauri",
      bevy: "Bevy",
      ratatui: "Ratatui",
      tokio: "Tokio",
      sqlx: "SQLx",
      diesel: "Diesel",
    },
  },
  Python: { "pyproject.toml": PYTHON_DEPS, "requirements.txt": PYTHON_DEPS },
  PHP: {
    "composer.json": { "laravel/framework": "Laravel", "symfony/framework-bundle": "Symfony", "livewire/livewire": "Livewire", "filament/filament": "Filament" },
  },
} satisfies Record<string, Partial<Record<ManifestFile, Record<string, string>>>>;

export type ManifestFile = "mix.exs" | "Gemfile" | "go.mod" | "Cargo.toml" | "pyproject.toml" | "requirements.txt" | "composer.json";
type ManifestLanguage = keyof typeof LANGUAGE_MANIFESTS;
const hasManifests = (language: string): language is ManifestLanguage => language in LANGUAGE_MANIFESTS;

/** The JavaScript family: package.json already names their frameworks. */
const JS_LANGUAGES = new Set(["JavaScript", "TypeScript", "Vue", "Svelte", "Astro", "MDX"]);
/** Languages GitHub counts that an app isn't "written in": markup, styles, scripts, config and SQL. */
const SUPPORTING_LANGUAGES = new Set(["HTML", "CSS", "SCSS", "Sass", "Less", "Stylus", "Shell", "PowerShell", "Batchfile", "Dockerfile", "Makefile", "HCL", "Nix", "PLpgSQL", "TSQL", "PLSQL", "Jinja", "Handlebars", "EJS", "Liquid", "Mustache", "Procfile", "Jupyter Notebook"]);
/** A second language counts once it's at least this share of the code. */
const SECONDARY_SHARE = 0.2;

/**
 * The repo's main non-JavaScript languages, biggest first (at most two): the top language by bytes,
 * plus another with at least a fifth of the code. Falls back to GitHub's primary language without
 * the languages breakdown. JavaScript-family repos return [] and are read from package.json.
 */
export function mainLanguages(languages: Record<string, number> | undefined, primary?: string): string[] {
  const code = Object.entries(languages ?? {})
    .filter(([name, bytes]) => !SUPPORTING_LANGUAGES.has(name) && bytes > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!code.length) return primary && !JS_LANGUAGES.has(primary) && !SUPPORTING_LANGUAGES.has(primary) ? [primary] : [];
  const total = code.reduce((sum, [, bytes]) => sum + bytes, 0);
  return code
    .filter(([, bytes], i) => i === 0 || bytes / total >= SECONDARY_SHARE)
    .slice(0, 2)
    .map(([name]) => name)
    .filter((name) => !JS_LANGUAGES.has(name));
}

/** Manifests worth fetching for these languages. */
export function manifestsFor(languages: string[]): ManifestFile[] {
  return languages.filter(hasManifests).flatMap((language) => Object.keys(LANGUAGE_MANIFESTS[language]) as ManifestFile[]);
}

function manifestStack(language: string, manifests: RepoData["manifests"]): string[] {
  if (!hasManifests(language) || !manifests) return [];
  const found: string[] = [];
  for (const [file, deps] of Object.entries(LANGUAGE_MANIFESTS[language]) as [ManifestFile, Record<string, string>][]) {
    const text = manifests[file];
    if (!text) continue;
    for (const [dep, label] of Object.entries(deps)) if (dependencyPattern[file](dep).test(text)) found.push(label);
  }
  return found;
}

function packageStack(pkg: PackageJson): string[] {
  const runtime = Object.keys(pkg.dependencies ?? {});
  const dev = isToolingRoot(pkg) ? [] : Object.keys(pkg.devDependencies ?? {}).filter((d) => DEV_STACK.has(d));
  return [...runtime, ...dev].map((d) => STACK_MAP[d]).filter(Boolean);
}

/**
 * Main language and its frameworks first (from the GitHub languages breakdown and the language's
 * manifest: mix.exs, Gemfile, go.mod, Cargo.toml, pyproject.toml / requirements.txt, composer.json),
 * then the JavaScript stack from package.json. Topics fill in when there's no package.json to read.
 */
export function detectStack(repo: RepoData | undefined): string[] {
  if (!repo) return [];
  const stack: string[] = [];
  for (const language of mainLanguages(repo.languages, repo.language)) stack.push(language, ...manifestStack(language, repo.manifests));
  if (repo.packageJson) stack.push(...packageStack(repo.packageJson));
  if (!repo.packageJson || !stack.length) stack.push(...repo.topics.map((t) => TOPIC_STACK[t]).filter(Boolean));
  if (!stack.length && repo.language) stack.push(repo.language);
  return [...new Set(stack)];
}
