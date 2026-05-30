---
name: cloudflare-management
description: Bootstrap and manage Cloudflare from the CLI via Wrangler. Ensure Wrangler is installed and authenticated, install the official Cloudflare agent skills during login, and replicate them (agent-agnostic) into a shared skill vault. Use when setting up Cloudflare access, "log me into Cloudflare/Wrangler", making Cloudflare skills available across agents, or doing common management tasks (R2 buckets + public hosting, Workers, secrets). Includes the gotchas around public r2.dev URLs.
metadata:
  short-description: Bootstrap Wrangler auth + propagate official Cloudflare skills; CF management recipes
license: MIT
---

# Cloudflare Management

A portable, agent-agnostic entry point for managing Cloudflare from the command
line. It does two jobs:

1. **Bootstrap** — make sure `wrangler` runs and is authenticated, and install
   the *official* Cloudflare skills (Cloudflare ships them and Wrangler installs
   them on login).
2. **Propagate** — copy those official skills, stripped of any single-agent
   framing, into a shared skill vault so every agent can use them.

Then it points at those official skills for deep work, and carries a few
operational gotchas that aren't obvious.

> This skill assumes nothing about your project, repo, or org. Everything below
> works for any user, any coding agent, and any (or no) shared vault.

---

## Step 1 — Ensure Wrangler runs

Wrangler is **npm-only**. Do **not** try Homebrew — the `wrangler` formula was
**disabled upstream (2025-07-01)** and `brew install wrangler` errors out.

```bash
npx wrangler --version      # needs v4.x+; npx fetches it on demand, no global install
```

- If that prints a version → done, go to Step 2.
- If `npx`/`npm` is missing → the user needs Node.js (LTS). Tell them to install
  Node, then retry. (Don't install Node for them silently.)
- A global install is optional: `npm i -g wrangler`. `npx wrangler` is fine and
  avoids polluting global packages.

## Step 2 — Ensure authenticated

```bash
npx wrangler whoami         # prints account name + Account ID + token scopes, or "not authenticated"
```

If **not** authenticated, the user must do the login themselves — it opens a
browser and blocks on consent, so an agent can't complete it:

> **Tell the user, verbatim-ish:**
> "Run `npx wrangler login` in your terminal and approve the browser consent.
> During login Wrangler will ask something like *'Wrangler detected the
> following AI coding agents: … Would you like to install Cloudflare skills for
> them?'* — answer **yes**. Then tell me it's set."

Notes:
- The "install Cloudflare skills" prompt is what seeds the official skills (Step
  3). To skip the prompt and install non-interactively, login (or any wrangler
  command) accepts `--install-skills`.
- **Auth persistence matters for agents.** `wrangler login` writes an OAuth
  session to disk (`~/.wrangler/`), so it survives across separate shells and
  across agent tool-calls — an agent that runs each command in a fresh shell
  will still be authenticated. An exported `CLOUDFLARE_API_TOKEN`, by contrast,
  lives only in the shell that set it and will **not** carry across independent
  tool-calls. For unattended/CI use, prefer an API token passed explicitly each
  invocation; for interactive agent work, prefer `wrangler login`.
- The **Account ID** printed by `whoami` is **not** secret (it's in every R2/API
  URL). The **API token** is — never print, echo, or log it.
- OAuth scope can vary; if a command 403s on permissions, the user may need to
  re-login or mint an API token with the needed product scope (e.g. R2 edit).

When the user says it's set, re-run `npx wrangler whoami` to confirm.

## Step 3 — Locate the installed official skills

On login-with-yes (or `--install-skills`), Wrangler installs Cloudflare's
official skills into **each detected agent's skills directory**. Locations vary
by agent, e.g.:

- Claude Code: `~/.claude/skills/`
- Codex: `${CODEX_HOME:-~/.codex}/skills/`
- Other agents: their own skills dir

The Cloudflare skill set typically includes: `cloudflare` (umbrella),
`wrangler`, `workers-best-practices`, `agents-sdk`, `durable-objects`,
`sandbox-sdk`, `cloudflare-email-service`. List the target dir to see what
landed:

```bash
ls -1 ~/.claude/skills 2>/dev/null   # adjust to the detected agent's skills dir
```

## Step 4 — Propagate into a shared skill vault (if one exists)

A "shared skill vault" is any directory of skills shared across agents (often an
Obsidian vault's `Skills/`, or a synced `skills/` folder). If the user has one,
copy the official Cloudflare skills there **made agent-agnostic** so any agent
can use them.

**Detect the vault generically** — don't hardcode a path. Check, in order:
1. An env var the user points you at (e.g. `$SKILLS_VAULT`, `$SHARED_SKILLS`).
2. A path the user names when asked.
3. A skills index referenced in the user's global agent config (e.g. a
   `CLAUDE.md`/`AGENTS.md` that names a vault).

If none → skip this step and just tell the user the official skills are
installed for the current agent.

**Make each copied skill agent-agnostic** (this is the important part):
- Keep the `name` + `description` frontmatter; drop agent-only frontmatter keys
  the vault doesn't use.
- Replace agent-specific skill paths (`~/.claude/skills`, `$CODEX_HOME/skills`,
  etc.) with neutral wording like "this skill's directory" / "your skills dir".
- Replace agent-specific tool names (e.g. a built-in `cloudflare-docs` search
  tool, `WebFetch`, `Read`) with capability-neutral phrasing: "fetch the docs
  page at <URL>", "open the file", "search the docs".
- Keep all the Cloudflare substance (commands, decision trees, references).
- Preserve helper files referenced by the skill (copy the whole folder).

**Register** each copied skill in the vault's index (if it has one) — match the
existing entry style (e.g. a `[[<slug>/SKILL]] - <description>` line in
`README.md`), placed in the index's existing order.

**Don't clobber**: if a destination skill folder already exists, diff first and
ask before overwriting.

---

## Management recipes

For anything substantial (Workers, D1, KV, Vectorize, Queues, Pages, AI), defer
to the official `cloudflare` and `wrangler` skills — they bias toward live-doc
retrieval and stay current. A couple of high-value recipes + gotchas live here
because they bite people:

### R2: public file hosting (downloads, release artifacts, assets)

```bash
npx wrangler r2 bucket create <bucket>
npx wrangler r2 object put "<bucket>/<key>" --file <local> --remote   # --remote hits the real bucket, not local sim
```

To serve those objects publicly you have three options — **choose deliberately**:

| Option | Command / setup | When |
|--------|-----------------|------|
| **`r2.dev` URL** | `wrangler r2 bucket dev-url enable <bucket>` → `https://pub-<hash>.r2.dev` | Quick + zero-domain. **But:** Cloudflare **rate-limits** it and labels it **not for production**, and some ISPs / national DNS filters **block or hijack `r2.dev`** outright. |
| **Worker in front of R2** | tiny Worker with an `r2_buckets` binding that streams objects, served at `<name>.workers.dev` | No custom domain needed, **not** rate-limited, and `*.workers.dev` is far less likely to be filtered than `r2.dev`. Best default when you don't own a CF domain. |
| **Custom domain** | `wrangler r2 bucket domain add <bucket> --domain <dl.example.com> --zone-id <id>` | Cleanest/production. Requires the domain to be a zone on the Cloudflare account. |

**Gotcha — verify public objects from a clean resolver.** `r2.dev` (and
sometimes `workers.dev`) can be **DNS-hijacked or SNI-filtered** on the network
you're testing from (corporate filters, national content filters). A failed
`curl` there does **not** mean the upload failed. Confirm reachability by
bypassing the local resolver:

```bash
curl --doh-url https://1.1.1.1/dns-query -sI \
  "https://pub-<hash>.r2.dev/<key>"        # 200 + correct Content-Length => object is genuinely public
```

If DoH succeeds but the plain request is hijacked (e.g. resolves to an unrelated
host / serves the wrong TLS cert), the object is fine — the *network* is
filtering that hostname. Switch to a Worker-proxy or custom domain.

### Secrets — never on the command line

```bash
npx wrangler secret put <NAME>            # interactive prompt (preferred)
npx wrangler secret put <NAME> < file     # from a file (CI/PEM)
```

Never pass secret values as CLI args or via `echo` — they leak into shell
history and process listings.

---

## Reference: the official Cloudflare skills (load the relevant sibling)

This skill is the **hub**. The official Cloudflare skills below are installed
alongside it (in this same skills collection / vault). For anything beyond the
bootstrap + recipes above, **load the relevant sibling skill** and work from it:

- **cloudflare** — umbrella: Workers, Pages, KV/D1/R2, AI/Vectorize, networking,
  security, IaC. Start here; it has decision trees that point to the rest.
- **wrangler** — the CLI: commands, flags, `wrangler.jsonc` config, bindings.
- **workers-best-practices** — authoring/reviewing Workers against prod patterns.
- **agents-sdk** — stateful agents, Workflows, MCP servers on Workers.
- **durable-objects** — DO coordination, RPC, SQLite, alarms, WebSockets.
- **sandbox-sdk** — sandboxed code execution (interpreters, CI, untrusted code).
- **cloudflare-email-service** — transactional email send/receive on Workers.

If a sibling is missing, run the bootstrap (Steps 1–4) to install + propagate
it. All of them bias toward retrieving the **latest** Cloudflare docs over
baked-in knowledge — flags, limits, and config shapes change.
