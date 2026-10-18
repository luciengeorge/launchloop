import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import type { RepoData } from "../../src/lib/ingest/github";
import { liveHomepage } from "../../src/lib/ingest/homepage";
import { detectStack, mainLanguages, manifestsFor } from "../../src/lib/stack";

const repo = (over: Partial<RepoData>): RepoData => ({ owner: "o", name: "n", url: "https://github.com/o/n", topics: [], commits: [], ...over });
const mixExs = readFileSync(path.join(__dirname, "../fixtures/github/mix.exs"), "utf8");
/** plausible/analytics' real GitHub languages breakdown. */
const plausibleLanguages = { Elixir: 7283575, TypeScript: 1355345, HTML: 176428, JavaScript: 163351, PLpgSQL: 78793, CSS: 22840, HCL: 8012, Makefile: 5690, Shell: 3777, Dockerfile: 2893, PHP: 651 };

test("Elixir/Phoenix repo with no package.json: language and framework from the languages API and mix.exs", () => {
  expect(mainLanguages(plausibleLanguages, "Elixir")).toEqual(["Elixir"]);
  expect(manifestsFor(["Elixir"])).toEqual(["mix.exs"]);
  const stack = detectStack(
    repo({ language: "Elixir", languages: plausibleLanguages, manifests: { "mix.exs": mixExs }, topics: ["analytics", "elixir", "phoenix", "postgresql", "clickhouse", "tailwindcss"] }),
  );
  expect(stack.slice(0, 3)).toEqual(["Elixir", "Phoenix", "Phoenix LiveView"]);
  expect(stack).toEqual(expect.arrayContaining(["Ecto", "Oban", "PostgreSQL", "ClickHouse", "Tailwind CSS"]));
  expect(new Set(stack).size).toBe(stack.length);
});

test("without the languages API or a manifest, the primary language and stack topics still show", () => {
  expect(detectStack(repo({ language: "Elixir", topics: ["phoenix", "tailwindcss", "analytics"] }))).toEqual(["Elixir", "Phoenix", "Tailwind CSS"]);
});

test("other ecosystems: Gemfile, go.mod, Cargo.toml, pyproject / requirements and composer.json", () => {
  const cases: { language: string; manifests: RepoData["manifests"]; expected: string[] }[] = [
    { language: "Ruby", manifests: { Gemfile: `source "https://rubygems.org"\ngem "rails", "~> 7.1"\ngem 'pg'\ngem "rails-controller-testing"\n` }, expected: ["Ruby", "Ruby on Rails", "PostgreSQL"] },
    { language: "Go", manifests: { "go.mod": "module example.com/app\n\ngo 1.22\n\nrequire (\n\tgithub.com/labstack/echo/v4 v4.11.4\n\tgorm.io/gorm v1.25.7\n)\n" }, expected: ["Go", "Echo", "GORM"] },
    { language: "Rust", manifests: { "Cargo.toml": '[package]\nname = "app"\n\n[dependencies]\naxum = "0.7"\ntokio = { version = "1", features = ["full"] }\n\n[dependencies.sqlx]\nversion = "0.7"\n' }, expected: ["Rust", "Axum", "Tokio", "SQLx"] },
    { language: "Python", manifests: { "pyproject.toml": '[project]\ndependencies = ["fastapi[standard]>=0.110", "sqlalchemy>=2", "flask-cors"]\n' }, expected: ["Python", "FastAPI", "SQLAlchemy"] },
    { language: "Python", manifests: { "requirements.txt": "Django==5.0.2\ncelery[redis]>=5.3 # workers\ndjango-extensions\n" }, expected: ["Python", "Django", "Celery"] },
    { language: "PHP", manifests: { "composer.json": JSON.stringify({ require: { php: "^8.2", "laravel/framework": "^11.0", "livewire/livewire": "^3.0" } }) }, expected: ["PHP", "Laravel", "Livewire"] },
  ];
  for (const { language, manifests, expected } of cases) {
    expect(detectStack(repo({ language, languages: { [language]: 1000, HTML: 50 }, manifests })), language).toEqual(expected);
  }
});

test("JavaScript repos keep reading package.json; a big second language is added in front", () => {
  const pkg = { dependencies: { next: "16", react: "19" }, devDependencies: { tailwindcss: "4" } };
  expect(mainLanguages({ TypeScript: 9000, CSS: 500 }, "TypeScript")).toEqual([]);
  expect(detectStack(repo({ language: "TypeScript", languages: { TypeScript: 9000, CSS: 500 }, packageJson: pkg, topics: ["django"] }))).toEqual(["Next.js", "React", "Tailwind CSS"]);
  expect(mainLanguages({ TypeScript: 6000, Python: 4000 }, "TypeScript")).toEqual(["Python"]);
  expect(detectStack(repo({ languages: { TypeScript: 6000, Python: 4000 }, packageJson: pkg, manifests: { "requirements.txt": "fastapi\n" } }))).toEqual(["Python", "FastAPI", "Next.js", "React", "Tailwind CSS"]);
});

test("Live page: only a real site counts as the repo's homepage", () => {
  expect(liveHomepage(undefined, undefined)).toBeUndefined();
  expect(liveHomepage("", "https://github.com/o/n#readme")).toBeUndefined();
  expect(liveHomepage(undefined, ".")).toBeUndefined();
  expect(liveHomepage("https://www.npmjs.com/package/n", undefined)).toBeUndefined();
  expect(liveHomepage("https://plausible.io", undefined)).toBe("https://plausible.io");
  expect(liveHomepage("https://github.com/o/n", "https://o.github.io/n")).toBe("https://o.github.io/n");
});
