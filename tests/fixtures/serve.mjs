import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, gunzipSync } from "node:zlib";

const fixtures = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(fixtures, "site");
const port = Number(process.argv[2] ?? 3419);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8" };

const html = (body) => `<!doctype html><html><head><title>${body.title}</title><meta name="description" content="${body.description}"></head><body><h1>${body.title}</h1><p>${body.description}</p></body></html>`;

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const pngChunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
/** A real, solid-colour RGB PNG, so both our size reader and the browser can open it. */
const png = (w, h) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) row.set([242, 84, 27], 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), pngChunk("IHDR", ihdr), pngChunk("IDAT", deflateSync(raw)), pngChunk("IEND", Buffer.alloc(0))]);
};

const origin = `http://127.0.0.1:${port}`;
const ogPage = (head) => (_req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><html><head>${head}</head><body><h1>Fixture</h1></body></html>`);
};

/** Dynamic routes for error-state tests, plus a tiny fake of the GitHub API (GITHUB_API_URL=http://127.0.0.1:PORT/gh). */
const routes = {
  "/og/good": ogPage(`<title>Pagebird</title>
    <meta property="og:title" content="Pagebird: turn customer calls into product specs" />
    <meta property="og:description" content="Pagebird joins your calls and turns feature requests into ranked specs." />
    <meta property="og:image" content="${origin}/og/img-1200x630.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Pagebird logo and headline" />
    <meta property="og:url" content="${origin}/og/good" />
    <meta property="og:site_name" content="Pagebird" />
    <meta name="twitter:card" content="summary_large_image" />`),
  "/og/bad": ogPage(`<title>Snapshelf</title>
    <meta property="og:image" content="/og/img-400x400.png" />
    <meta name="twitter:card" content="summary" />`),
  "/og/square": ogPage(`<title>Squarely</title>
    <meta property="og:title" content="Squarely" />
    <meta property="og:description" content="A square share image." />
    <meta property="og:image" content="${origin}/og/img-1200x1200.png" />`),
  "/og/broken-image": ogPage(`<meta property="og:title" content="Brokenpic" /><meta property="og:image" content="${origin}/og/missing.png" />`),
  "/og/none": ogPage(""),
  "/slow": (_req, res) => setTimeout(() => res.end("<title>Too late</title>"), 5000),
  // Slow but inside SITE_FETCH_TIMEOUT_MS, so a preview is still being written for a moment after it's accepted.
  "/slowish": (_req, res) =>
    setTimeout(() => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html({ title: "Tortoisely", description: "Tortoisely reminds your team about stale pull requests before they rot." }));
    }, 1200),
  "/broken": (_req, res) => {
    res.writeHead(500, { "Content-Type": "text/html" });
    res.end("<h1>Internal error</h1>");
  },
  "/empty": (_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end('<!doctype html><html><head></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
  },
  "/llmfail": (_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html({ title: "Outagely LLMFAIL", description: "Outagely monitors your uptime and pages you when your app goes down for real." }));
  },
  "/kitfail": (_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html({ title: "Brittlebox KITFAIL", description: "Brittlebox backs up your Postgres database every hour and restores it in one click." }));
  },
  "/data.json": (_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ hello: "world" }));
  },
  "/gh/users/real-owner": (_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ login: "real-owner" }));
  },
  // An Elixir/Phoenix repo shaped like plausible/analytics: no homepage, no root package.json, stack in mix.exs.
  "/gh/repos/fixture-labs/pulse": json({
    html_url: "https://github.com/fixture-labs/pulse",
    description: "Simple, privacy-friendly web analytics for small sites",
    homepage: "",
    stargazers_count: 42,
    topics: ["analytics", "elixir", "phoenix", "tailwindcss"],
    language: "Elixir",
    license: { spdx_id: "AGPL-3.0" },
  }),
  "/gh/repos/fixture-labs/pulse/readme": text(
    "# Pulse\n\nSimple, privacy-friendly web analytics for small sites.\n\n## Features\n\n- Cookie-free visitor counts that need no consent banner\n- One dashboard page with every metric that matters\n- Weekly email reports for each site you track\n",
  ),
  "/gh/repos/fixture-labs/pulse/commits": json([
    { sha: "abc123pulse", commit: { message: "Add weekly email reports", author: { date: "2026-10-10T10:00:00Z" } } },
    { sha: "def456pulse", commit: { message: "Speed up the dashboard query", author: { date: "2026-10-08T10:00:00Z" } } },
  ]),
  "/gh/repos/fixture-labs/pulse/languages": json({ Elixir: 7283575, TypeScript: 1355345, HTML: 176428, JavaScript: 163351, CSS: 22840, PHP: 651 }),
  "/gh/repos/fixture-labs/pulse/contents/mix.exs": async (_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(await readFile(path.join(fixtures, "github", "mix.exs")));
  },
};

function json(body) {
  return (_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
}

function text(body) {
  return (_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(body);
  };
}

/** Every event the fake PostHog received, from the browser (via /lp-relay) and from posthog-node. */
const phEvents = [];

/** posthog-js sends one event or an array, posthog-node `{ batch }`; either may be gzipped. */
function recordPosthog(body) {
  try {
    const raw = body[0] === 0x1f && body[1] === 0x8b ? gunzipSync(body) : body;
    const text = raw.toString("utf8");
    const json = JSON.parse(text.startsWith("data=") ? Buffer.from(decodeURIComponent(text.slice(5)), "base64").toString("utf8") : text);
    for (const e of Array.isArray(json) ? json : (json.batch ?? [json])) if (e && typeof e.event === "string") phEvents.push(e);
  } catch {
    // Not an event payload (flags, config).
  }
}

/** Flag variants per distinct id, and an optional delay before answering, set by tests through POST /ph/_flags. Everyone else gets no flags. */
const flagOverrides = new Map();

/** The distinct_id in a flags request: posthog-node sends JSON; posthog-js may gzip it. */
function flagsDistinctId(body) {
  try {
    const raw = body[0] === 0x1f && body[1] === 0x8b ? gunzipSync(body) : body;
    return JSON.parse(raw.toString("utf8")).distinct_id;
  } catch {
    return undefined;
  }
}

/** A variant per flag, or false for a flag that's switched off. */
const flagsResponse = (flags = {}) => ({
  flags: Object.fromEntries(Object.entries(flags).map(([key, variant]) => [key, { key, enabled: variant !== false, variant: variant || null, reason: null, metadata: {} }])),
  errorsWhileComputingFlags: false,
});

/** Every error/message event and streamed span the fake Sentry received (SENTRY_DSN=http://public@127.0.0.1:PORT/sentry/1). */
const sentryEvents = [];
const sentrySpans = [];

/** An envelope is newline-delimited JSON: envelope header, then item header / item payload pairs. */
function recordSentry(body) {
  const raw = body[0] === 0x1f && body[1] === 0x8b ? gunzipSync(body) : body;
  const lines = raw.toString("utf8").split("\n");
  for (let i = 1; i + 1 < lines.length; i += 2) {
    try {
      const type = JSON.parse(lines[i]).type;
      if (type === "event") sentryEvents.push(JSON.parse(lines[i + 1]));
      // Span v2 container: { items: [{ name, trace_id, status, attributes: { key: { type, value } } }] }.
      if (type === "span") sentrySpans.push(...(JSON.parse(lines[i + 1]).items ?? []));
    } catch {
      // Attachments and other binary items aren't JSON.
    }
  }
}

createServer(async (req, res) => {
  if (req.url === "/ph/_events") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(phEvents));
  }
  if (req.url === "/sentry/_events") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(sentryEvents));
  }
  if (req.url === "/sentry/_spans") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(sentrySpans));
  }
  if (req.url.startsWith("/sentry/api/")) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (req.method === "POST") recordSentry(Buffer.concat(chunks));
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end("{}");
  }
  const route = routes[req.url.split("?")[0]];
  if (route) return route(req, res);
  const img = /^\/og\/img-(\d{1,4})x(\d{1,4})\.png$/.exec(req.url);
  if (img) {
    res.writeHead(200, { "Content-Type": "image/png" });
    return res.end(png(Number(img[1]), Number(img[2])));
  }
  // Fake PostHog (NEXT_PUBLIC_POSTHOG_HOST in the test build): no flags for anyone, so every
  // experiment is control unless a test sets variants for a distinct id (POST /ph/_flags
  // { distinctId, flags, delayMs }) or intercepts /lp-relay/flags in the browser.
  if (req.url.startsWith("/ph/")) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const pathname = req.url.split("?")[0];
    if (pathname === "/ph/_flags") {
      const { distinctId, flags, delayMs = 0 } = JSON.parse(body.toString("utf8"));
      flagOverrides.set(distinctId, { flags, delayMs });
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end("{}");
    }
    if (pathname.startsWith("/ph/flags")) {
      const override = flagOverrides.get(flagsDistinctId(body));
      if (override?.delayMs) await new Promise((resolve) => setTimeout(resolve, override.delayMs));
      if (res.destroyed) return;
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(flagsResponse(override?.flags)));
    }
    if (req.method === "POST") recordPosthog(body);
    // Remote config script (/array/<key>/config.js): an empty script, not JSON the browser would execute.
    if (pathname.endsWith(".js")) {
      res.writeHead(200, { "Content-Type": "application/javascript" });
      return res.end("");
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end("{}");
  }
  if (req.url.startsWith("/gh/")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ message: "Not Found" }));
  }
  const file = req.url === "/" ? "index.html" : req.url.replace(/^\/+/, "").split("?")[0];
  try {
    const body = await readFile(path.join(root, path.normalize(file).replace(/^(\.\.[/\\])+/, "")));
    res.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`fixture site on http://127.0.0.1:${port}`));
