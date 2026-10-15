import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "site");
const port = Number(process.argv[2] ?? 3419);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8" };

const html = (body) => `<!doctype html><html><head><title>${body.title}</title><meta name="description" content="${body.description}"></head><body><h1>${body.title}</h1><p>${body.description}</p></body></html>`;

/** Dynamic routes for error-state tests, plus a tiny fake of the GitHub API (GITHUB_API_URL=http://127.0.0.1:PORT/gh). */
const routes = {
  "/slow": (_req, res) => setTimeout(() => res.end("<title>Too late</title>"), 5000),
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
};

createServer(async (req, res) => {
  const route = routes[req.url.split("?")[0]];
  if (route) return route(req, res);
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
