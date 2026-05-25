import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const derivedState = readFileSync(new URL("../src/features/dashboard/hooks/use-dashboard-derived-state.tsx", import.meta.url), "utf8");
const dashboardHeader = readFileSync(new URL("../src/features/dashboard/views/DashboardHeader.tsx", import.meta.url), "utf8");

assert.doesNotMatch(derivedState, /type DashboardView = [^;]*"new"/, "DashboardView should not include the removed test New tab id");
assert.doesNotMatch(derivedState, /id: "new" as const,[\s\S]*?label: "New"/, "Dashboard nav items should not include the removed test New tab");
assert.doesNotMatch(derivedState, /new: \{ label: "New", title: "New test tab" \}/, "Dashboard header copy should not include the removed test New tab");

const navItemsBlock = derivedState.match(/const navItems = useMemo\(\(\) => \[([\s\S]*?)\n  \], \[/);
assert.ok(navItemsBlock, "Dashboard nav items block should be present");

const renderedTabsBlock = dashboardHeader.match(/\{\(\[([\s\S]*?)\] as DashboardView\[\]\)/);
assert.ok(renderedTabsBlock, "Rendered dashboard tab order should be present");

const ids = [...navItemsBlock[1].matchAll(/id: "([^"]+)" as const/g)].map((match) => match[1]);
assert.deepEqual([...new Set(ids)], ids, "Dashboard nav ids should be unique");
assert.equal(ids.filter((id) => id === "chat").length, 1, "Dashboard nav should include exactly one Chat tab");
assert.equal(ids.filter((id) => id === "new").length, 0, "Dashboard nav should not include a New tab");
assert.doesNotMatch(renderedTabsBlock[1], /"new"/, "Dashboard rendered tab order should not include New");
assert.deepEqual(
  [...renderedTabsBlock[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]),
  ["agents", "kanban", "vault", "chat", "wallet", "more"],
  "Dashboard rendered tab order should be Fleet, Work, Brain, Chat, Wallets, More",
);

console.log("Dashboard nav has the expected top-level buttons and no duplicate ids.");
