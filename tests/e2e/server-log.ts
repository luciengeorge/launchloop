import { existsSync, readFileSync, statSync } from "node:fs";

/** The test server's stdout and stderr, teed here by playwright.config.ts. */
export const SERVER_LOG = ".next-test/server.log";

export const serverLogSize = () => (existsSync(SERVER_LOG) ? statSync(SERVER_LOG).size : 0);

export const serverLogSince = (offset: number) => (existsSync(SERVER_LOG) ? readFileSync(SERVER_LOG).subarray(offset).toString("utf8") : "");
