---
name: tailscale-generation-skill-authoring
description: This skill should be used when the user asks to "create a Tailscale generation skill", "add a local generation skill", "document a generation endpoint", "add an image generation provider", "add a TTS provider", "add video generation", "add 3D generation", or needs guidance on where HivemindOS Tailscale or local generation providers belong in the shared skills shelf.
version: 0.1.0
---

# Tailscale Generation Skill Authoring

Create and maintain shared skills for generation services that run either locally on the current machine or remotely on a private HivemindOS Tailnet. Keep provider documentation organized by output category, not by individual machine, so agents can find the right generation workflow quickly.

## Category routing

Route providers by output type:

- **Image generation**: add provider blocks to `comfyui-image-generation`.
  - Include ComfyUI, Z-Image, Flux, SDXL, Stable Diffusion, image editing, inpainting, and other image workflows.
- **TTS / speech audio generation**: add provider blocks to `localtts`.
  - Include Qwen3-TTS, Kokoro, Chatterbox, Dia, Orpheus, XTTS, and OpenAI-compatible local voice servers.
- **Video generation**: create or update a dedicated video-generation skill, such as `local-video-generation`, unless one already exists.
- **3D model generation**: create or update a dedicated 3D-generation skill, such as `local-3d-generation`, unless one already exists.
- **Music/song generation**: use or create a music/audio-generation skill distinct from TTS.
- **LLM inference, embeddings, transcription, OCR, and analysis services**: use the most specific non-generation skill unless the user asks for a generation-facing workflow.

Do not create one skill per model when a category skill exists. Add a new block to the category skill instead.

## Local vs Tailnet design

Use the **same category skill** for local and Tailnet variants of the same output type. Split by route mode inside the provider block:

- **Tailnet mode**: client calls a remote HivemindOS service over Tailscale. The client should not need the model repo, service files, LaunchAgent, systemd unit, or localhost port.
- **Local mode**: generation happens on the current machine. Localhost paths, service labels, and model directories are valid only in this mode.

Prefer Tailnet mode for multi-machine HivemindOS workflows. Keep local mode as a template for users who want to run the service on the same machine as the agent.

## Provider block template

Use this structure when adding a provider block to a category skill:

```markdown
### Provider name block

Use this block for ...

**Route modes**

- Tailnet mode: `http(s)://<tailnet-host>:<port>`
- Local mode: `http://127.0.0.1:<port>`
- Prefer Tailnet mode when the provider runs on another HivemindOS machine.
- Use localhost only when the service runs on the current machine or when debugging on the service host.

**Client configuration**

- Required URL: `<BASE_URL>`
- Model/default preset: `<MODEL_ID>`
- Output extension: `.png`, `.wav`, `.mp4`, `.glb`, etc.
- Auth, if any: environment variable name only; never include secret values.

**Tailnet client preflight**

```bash
curl -fsS --max-time 5 http://<tailnet-host>:<port>/health
curl -fsS --max-time 5 http://<tailnet-host>:<port>/models
```

**Local client preflight**

```bash
curl -fsS --max-time 5 http://127.0.0.1:<port>/health
lsof -nP -iTCP:<port> -sTCP:LISTEN || true
```

**Generation example**

```bash
curl -fsS -X POST http://<host>:<port>/<generation-endpoint> \
  -H 'Content-Type: application/json' \
  -d '{...}' \
  -o /tmp/output.ext
```

**Verification**

```bash
ls -lh /tmp/output.ext
file /tmp/output.ext
```

**Service-host diagnostics only**

- Service directory: `<path>`
- Service manager: `launchctl`, `systemctl`, `docker`, or direct process
- Logs: `<path or command>`
- Known failure modes: `<list>`
```

## Tailnet-first rule

For Tailnet workflows, document client usage through the Tailscale address first. Do not tell the client to inspect service-host files or local ports. Make service-host commands clearly optional and labeled **Service-host diagnostics only**.

Use wording like:

- “Run these checks from the client over Tailscale.”
- “Use localhost only when directly logged into the service host.”
- “If the client lacks the service directory or service manager entry, that is expected.”

Avoid wording like:

- “Check `~/service-dir` on the client.”
- “Use `127.0.0.1` from the client for a remote provider.”
- “Install the model locally before calling the Tailnet endpoint.”

## Reliability notes

Document raw `100.x` Tailscale IPs as current examples, not permanent identifiers. Prefer MagicDNS or a stable Tailscale Serve name when available. Use placeholders in bundled app skills; private Tailnet IPs and personal machine names belong in the user's shared vault, not in the public app bundle.

## Verification before finishing

After editing or creating a generation skill:

1. Verify the provider is routed to the correct category skill.
2. Verify frontmatter has `name`, `description`, and `version`.
3. Verify Tailnet examples do not require client-local service files or localhost ports.
4. Verify local examples are clearly marked as local mode.
5. Verify the skill is listed in `Skills/README.md` after seeding.

## Current category homes

- Image generation: `comfyui-image-generation`
- TTS / speech audio: `localtts`

Create new category skills only when the output type is not covered by those homes.
