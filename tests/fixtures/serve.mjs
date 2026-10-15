import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "site");
const port = Number(process.argv[2] ?? 3419);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8" };

createServer(async (req, res) => {
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
