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

test("turn enforcement is shared: O cannot move on X's turn", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.locator(".ttt-role").filter({ hasText: "X" }).click();
    await b.locator(".ttt-role").filter({ hasText: "O" }).click();

    // It is X's turn (A's). O (B) tries to grab an empty cell — must be a no-op.
    await expect(b.locator(".ttt-status")).toContainText("X to move");
    await expect(b.locator(".ttt-cell").nth(0)).toBeDisabled();
    // Force the click even though the button is disabled; the doc must not change.
    await b
      .locator(".ttt-cell")
      .nth(0)
      .click({ force: true })
      .catch(() => {});
    await expect(b.locator(".ttt-cell").nth(0)).toHaveText("");
    await expect(a.locator(".ttt-cell").nth(0)).toHaveText("");
    await expect(a.locator(".ttt-status")).toContainText("X to move");
  } finally {
    await cleanup();
  }
});

test("full game to a win: X wins, both peers agree, rematch resets both", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.locator(".ttt-role").filter({ hasText: "X" }).click();
    await b.locator(".ttt-role").filter({ hasText: "O" }).click();
    await expect(a.locator(".ttt-status")).toContainText("X to move");

    // Drive an alternating game from BOTH peers. X (A) takes the top row;
    // O (B) takes the middle row. The mover must be the peer whose turn it is —
    // each .click() below only succeeds because shared turn state allows it.
    // X:0  O:3  X:1  O:4  X:2 -> X wins on line [0,1,2].
    await a.locator(".ttt-cell").nth(0).click();
    await expect(b.locator(".ttt-cell").nth(0)).toHaveText("X");
    await expect(b.locator(".ttt-status")).toContainText("O to move");

    await b.locator(".ttt-cell").nth(3).click();
    await expect(a.locator(".ttt-cell").nth(3)).toHaveText("O");
    await expect(a.locator(".ttt-status")).toContainText("X to move");

    await a.locator(".ttt-cell").nth(1).click();
    await expect(b.locator(".ttt-cell").nth(1)).toHaveText("X");

    await b.locator(".ttt-cell").nth(4).click();
    await expect(a.locator(".ttt-cell").nth(4)).toHaveText("O");

    await a.locator(".ttt-cell").nth(2).click();

    // Win is detected identically on BOTH screens.
    await expect(a.locator(".ttt-status")).toContainText("X wins!");
    await expect(b.locator(".ttt-status")).toContainText("X wins!");
    // Winning line highlight propagates to both peers.
    await expect(a.locator(".ttt-cell.is-win")).toHaveCount(3);
    await expect(b.locator(".ttt-cell.is-win")).toHaveCount(3);

    // No further moves accepted after a win (board is frozen for both).
    await expect(b.locator(".ttt-cell").nth(5)).toBeDisabled();

    // Rematch from one peer clears the board for BOTH peers and returns to X.
    await b.getByRole("button", { name: "rematch", exact: true }).click();
    for (const i of [0, 1, 2, 3, 4]) {
      await expect(a.locator(".ttt-cell").nth(i)).toHaveText("");
      await expect(b.locator(".ttt-cell").nth(i)).toHaveText("");
    }
    await expect(a.locator(".ttt-cell.is-win")).toHaveCount(0);
    await expect(b.locator(".ttt-cell.is-win")).toHaveCount(0);
    await expect(a.locator(".ttt-status")).toContainText("X to move");
    await expect(b.locator(".ttt-status")).toContainText("X to move");
  } finally {
    await cleanup();
  }
});
