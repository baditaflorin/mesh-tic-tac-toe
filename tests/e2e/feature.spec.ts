import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("X claim by A and O claim by B; move syncs across", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.locator(".ttt-role").filter({ hasText: "X" }).click();
    await b.locator(".ttt-role").filter({ hasText: "O" }).click();

    await expect(a.locator(".ttt-status")).toContainText("X to move");

    // A plays top-left (cell 0)
    await a.locator(".ttt-cell").nth(0).click();

    await expect(b.locator(".ttt-cell").nth(0)).toHaveText("X");
    await expect(b.locator(".ttt-status")).toContainText("O to move");
  } finally {
    await cleanup();
  }
});

test("rematch resets the board", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.locator(".ttt-role").filter({ hasText: "X" }).click();
    await b.locator(".ttt-role").filter({ hasText: "O" }).click();
    await a.locator(".ttt-cell").nth(0).click();
    await b.locator(".ttt-cell").nth(4).click();
    await a.getByRole("button", { name: "rematch", exact: true }).click();
    await expect(b.locator(".ttt-cell").nth(0)).toHaveText("");
    await expect(b.locator(".ttt-cell").nth(4)).toHaveText("");
  } finally {
    await cleanup();
  }
});
