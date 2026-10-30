import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

const SRC = path.join(import.meta.dirname, "../../src");

/** Where a module specifier from `from` points: a file under src/, or the bare package name. */
function resolve(specifier: string, from: string): string {
  if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return specifier;
  const base = specifier.startsWith("@/") ? path.join(SRC, specifier.slice(2)) : path.resolve(path.dirname(from), specifier);
  const file = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find((candidate) => existsSync(candidate) && candidate.match(/\.tsx?$/));
  if (!file) throw new Error(`can't resolve ${specifier} from ${from}`);
  return file;
}

/** Modules a file loads when it is evaluated: static imports and re-exports, not `import type` or `import()`. */
function staticImports(file: string): string[] {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest);
  const specifiers: string[] = [];
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && !statement.importClause?.isTypeOnly) specifiers.push((statement.moduleSpecifier as ts.StringLiteral).text);
    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && !statement.isTypeOnly) specifiers.push((statement.moduleSpecifier as ts.StringLiteral).text);
  }
  return specifiers.map((specifier) => resolve(specifier, file));
}

/** Every module the proxy entry pulls in: what each matched request loads on a cold start. */
function proxyGraph(): Set<string> {
  const seen = new Set<string>();
  const queue = [path.join(SRC, "proxy.ts")];
  while (queue.length) {
    const next = queue.pop()!;
    if (seen.has(next)) continue;
    seen.add(next);
    if (next.startsWith(SRC)) queue.push(...staticImports(next));
  }
  return seen;
}

it("the proxy entry doesn't load observability or @sentry/nextjs; it imports them only when it has a failure to report", () => {
  const graph = [...proxyGraph()].map((module) => (module.startsWith(SRC) ? `@/${path.relative(SRC, module).replace(/\.tsx?$/, "")}` : module));
  expect(graph).toContain("@/lib/kit-exists");
  expect(graph).toContain("@/lib/store");
  expect(graph.filter((module) => module === "@/lib/observability" || module.startsWith("@sentry/"))).toEqual([]);
  expect(readFileSync(path.join(SRC, "proxy.ts"), "utf8")).toContain('import("@/lib/observability")');
});
