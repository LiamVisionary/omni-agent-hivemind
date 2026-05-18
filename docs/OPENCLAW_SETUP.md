# OpenClaw Setup Guide

> **Developer setup guide.** For the user-facing feature walkthrough see [AMICLAW_GUIDE.md](AMICLAW_GUIDE.md).

OpenClaw gives Ami the ability to control your Mac — creating notes, setting reminders, managing calendar events, controlling music, and more. It runs a local gateway on your machine that Ami talks to when you ask her to do things.

> **Privacy note:** OpenClaw runs entirely on your device. Your gateway token never leaves your machine. Only the gateway URL (without the token) is synced to the cloud so you can use the same config across devices.

---

## Prerequisites

- **macOS** (required for Apple Notes, Reminders, Calendar, Music tools)
- **Node.js 22+** — check with `node --version`

If you don't have Node 22+:
```bash
brew install node@22
```

---

## Step 1: Install OpenClaw

Run the installer script in Terminal:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

This will install the CLI and start the onboarding wizard automatically.

**Alternative (npm):**
```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

### Verify the install

```bash
openclaw doctor
```

If `openclaw` is not found, add it to your PATH:
```bash
echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

---

## Step 2: Start the Gateway

The onboarding wizard installs a background daemon that starts the gateway automatically. To check if it's running:

```bash
openclaw gateway status
```

If you need to start it manually:
```bash
openclaw gateway --port 18789
```

### Find your gateway token

Your token is in `~/.openclaw/openclaw.json` under `gateway.auth.token`. You can view it with:

```bash
cat ~/.openclaw/openclaw.json | grep '"token"' | head -1
```

Keep this token — you'll need it in the next step.

---

## Step 3: Connect Ami to OpenClaw

1. Open the Ami app and go to **Settings** (gear icon)
2. Scroll down to **Advanced** section
3. Expand **OpenClaw Gateway**
4. Fill in the fields:

| Field | Value |
|-------|-------|
| **Gateway URL** | `ws://127.0.0.1:18789` |
| **Gateway Token** | *(paste the token from Step 2)* |

5. Toggle on **Route web chat through OpenClaw**
6. Click **Save**

### Optional toggles

| Toggle | What it does |
|--------|--------------|
| **Sync identity** | Pushes Ami's name and personality to the gateway so other channels (WhatsApp, Discord) use the same character |
| **Pull memories** | Imports memories from the agent workspace into the app on character load |
| **Push memories** | Auto-syncs app memories to the agent workspace every 10 minutes |

---

## Step 4: Set Up the Agent Workspace

OpenClaw uses a workspace folder to give the agent its personality and tool instructions. The default workspace is at `~/.openclaw/workspace-ami/`.

It should contain two files:

### SOUL.md — Personality

This file is auto-synced from the app when "Sync identity" is enabled. It defines who Ami is and how she responds. You can also edit it manually:

```
~/.openclaw/workspace-ami/SOUL.md
```

### TOOLS.md — Tool Instructions

This is Ami's cheat sheet for using macOS tools. It should already be set up, but if you need to recreate it:

```
~/.openclaw/workspace-ami/TOOLS.md
```

The file contains `osascript` commands for each tool. See [Available Tools](#available-tools) below.

---

## Available Tools

Once connected, you can ask Ami to do any of these:

### Apple Notes
> "Write me a note about grocery ideas"
>
> "Save a note titled Weekend Plans"

### Reminders
> "Remind me to call the dentist at 3pm"
>
> "Set a reminder to water the plants tomorrow"

### Calendar
> "What's on my schedule today?"
>
> "Add a meeting with Jake on Friday at 2pm"

### Music
> "Play some music"
>
> "Pause the music"
>
> "Skip to the next song"
>
> "What's currently playing?"

### System Controls
> "Toggle dark mode"
>
> "Set a timer for 5 minutes"
>
> "What's my battery level?"

### Open Apps & URLs
> "Open Safari"
>
> "Open the website twitter.com"

### Email (via OpenClaw)
> "Send an email to jake@example.com about the weekend plans"
>
> "Email mom and tell her I'll be home for dinner"

Email requires configuration via **Tune OpenClaw** in the OpenClaw settings. Three modes:
- **System Mail App** (default) — uses Mail.app on macOS, or `mailto:` on other platforms
- **Resend API** — programmatic sending via [resend.com](https://resend.com) (free tier available)
- **Custom SMTP** — any SMTP provider (Gmail, SendGrid, Postmark, etc.)

### Community Skills (via OpenClaw)

Install additional skills from the [awesome-openclaw-skills](https://github.com/VoltAgent/awesome-openclaw-skills) catalog:
- iMessage/SMS, WhatsApp, Telegram, Discord, Signal
- Apple Contacts, Photos, HomeKit, Find My
- Browser automation, Calendly, deep research
- And 3,000+ more from the community

Open **Tune OpenClaw** → **Browse Skill Store** to install.

---

## Troubleshooting

### "Gateway not responding"

Check if the gateway is running:
```bash
openclaw gateway status
```

If it's not running, start it:
```bash
openclaw gateway --port 18789
```

### "Handshake failed"

Your token is incorrect. Double-check it matches what's in `~/.openclaw/openclaw.json` under `gateway.auth.token`.

### Tools are slow on first use (~15–18s)

The first message in a new session has a cold start while the agent loads its workspace. After that, responses should be **~5 seconds** or less. The app pre-warms the session in the background to minimize this.

### "Command not found: openclaw"

Add the npm global bin to your PATH:
```bash
echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Calendar/Reminders not working

macOS may prompt you to grant Terminal (or the OpenClaw process) access to Calendar and Reminders. Go to:

**System Settings → Privacy & Security → Automation**

Make sure Terminal (or the OpenClaw daemon) has permission to control Calendar, Reminders, Notes, and Music.

### Tool UI not showing in the app

The tool preview cards (Notes, Music player, etc.) trigger based on keywords in your message. If the UI didn't show, try being more explicit:
- Instead of "jot this down" → say **"write me a note about..."**
- Instead of "play something" → say **"play some music"**

---

## Updating OpenClaw

```bash
npm update -g openclaw
```

Or re-run the installer:
```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

---

## Architecture (for the curious)

```
┌──────────────┐     WebSocket      ┌──────────────────┐     osascript     ┌──────────────┐
│   Ami App    │ ──────────────────► │ OpenClaw Gateway │ ────────────────► │  macOS APIs  │
│  (browser)   │ ◄────────────────── │  (localhost)     │ ◄──────────────── │ Notes, Music │
│              │    SSE streaming    │  Port 18789      │    tool results   │ Calendar etc │
└──────────────┘                     └──────────────────┘                   └──────────────┘
                                            │
                                     ┌──────┴──────┐
                                     │  Workspace  │
                                     │  SOUL.md    │
                                     │  TOOLS.md   │
                                     └─────────────┘
```

1. You send a message to Ami in the browser
2. The app detects if it's a tool request and shows a preview card immediately
3. The message is routed through the OpenClaw gateway via WebSocket
4. The gateway's agent reads TOOLS.md, runs the appropriate `osascript` command
5. The agent responds with confirmation, which Ami speaks back to you
