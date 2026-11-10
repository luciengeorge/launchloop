import { expect, test } from "vitest";
import { rootToken } from "./contrast";

const thrown = (read: () => unknown) => {
  try {
    read();
  } catch (error) {
    return error as Error;
  }
  throw new Error("expected a throw");
};

test("rootToken names the token it can't find, instead of a TypeError", () => {
  const error = thrown(() => rootToken("missing-token"));
  expect(error.name, error.message).not.toBe("TypeError");
  expect(error.message).toContain("--missing-token");
});

test("rootToken names the block it can't find, instead of a TypeError", () => {
  const error = thrown(() => rootToken("primary", ".missing-block"));
  expect(error.name, error.message).not.toBe("TypeError");
  expect(error.message).toContain(".missing-block");
});
