import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const page = readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(page, /type DashboardView = [^;]*"new"/, 'DashboardView should not include the removed New tab id');
assert.doesNotMatch(page, /id: "new" as const,[\s\S]*?label: "New"/, 'Dashboard nav items should not include the removed New tab');

const navItemsBlock = page.match(/const navItems = useMemo\(\(\) => \[([\s\S]*?)\n  \], \[/);
assert.ok(navItemsBlock, 'Dashboard nav items block should be present');

const ids = [...navItemsBlock[1].matchAll(/id: "([^"]+)" as const/g)].map((match) => match[1]);
assert.deepEqual([...new Set(ids)], ids, 'Dashboard nav ids should be unique');
assert.equal(ids.filter((id) => id === 'chat').length, 1, 'Dashboard nav should include exactly one Chat tab');

console.log('Dashboard nav has no removed New tab and no duplicate ids.');
