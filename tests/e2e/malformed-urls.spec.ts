import { request as httpRequest } from "node:http";
import { expect, test } from "@playwright/test";

const ENCODED = [
  "/opengraph-image%5C",
  "/opengraph-image%5c",
  "/tools/og-preview/opengraph-image%5C",
  "/tools/product-hunt-tagline-checker/opengraph-image%5C",
  "/pricing%5C",
  "/%5Cfoo",
];

for (const path of ENCODED) {
  test(`${path} is a 404, not a 500`, async ({ request }) => {
    const res = await request.get(path);
    expect(res.status()).toBe(404);
  });
}

/** Browsers and URL parsers rewrite a raw `\` to `/`, so send the request line as-is. */
function rawGet(baseURL: string, path: string): Promise<number> {
  const { hostname, port } = new URL(baseURL);
  return new Promise((resolve, reject) => {
    httpRequest({ hostname, port, path, method: "GET" }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    })
      .on("error", reject)
      .end();
  });
}

test("a raw backslash in the path is a 404", async ({ baseURL }) => {
  expect(await rawGet(baseURL!, "/opengraph-image\\")).toBe(404);
  expect(await rawGet(baseURL!, "/tools/og-preview/opengraph-image\\")).toBe(404);
});

test("the real OG images and pages still work", async ({ request }) => {
  for (const path of ["/opengraph-image", "/tools/og-preview/opengraph-image", "/tools/product-hunt-tagline-checker/opengraph-image"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()["content-type"], path).toContain("image/png");
  }
  expect((await request.get("/pricing")).status()).toBe(200);
});
