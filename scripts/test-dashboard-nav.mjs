import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const page = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");

assert.match(page, /type DashboardView = [^;]*"new"/, "DashboardView should include the test New tab id");
assert.match(page, /id: "new" as const,[\s\S]*?label: "New"/, "Dashboard nav items should include the test New tab");
assert.match(page, /new: \{ label: "New", title: "New test tab" \}/, "Dashboard header copy should include the test New tab");

const navItemsBlock = page.match(/const navItems = useMemo\(\(\) => \[([\s\S]*?)\n  \], \[/);
assert.ok(navItemsBlock, "Dashboard nav items block should be present");

const renderedTabsBlock = page.match(/\{\(\[([\s\S]*?)\] as DashboardView\[\]\)/);
assert.ok(renderedTabsBlock, "Rendered dashboard tab order should be present");

const ids = [...navItemsBlock[1].matchAll(/id: "([^"]+)" as const/g)].map((match) => match[1]);
assert.deepEqual([...new Set(ids)], ids, "Dashboard nav ids should be unique");
assert.equal(ids.filter((id) => id === "chat").length, 1, "Dashboard nav should include exactly one Chat tab");
assert.equal(ids.filter((id) => id === "new").length, 1, "Dashboard nav should include exactly one New tab");
assert.match(renderedTabsBlock[1], /"new"/, "Dashboard rendered tab order should include New");

console.log("Dashboard nav includes the New test tab and has no duplicate ids.");
