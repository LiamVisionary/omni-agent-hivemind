---
name: comfyui-image-generation
description: This skill should be used when the user asks to "generate images", "generate images with ComfyUI", "use local ComfyUI", "use remote ComfyUI", "use Z-Image", "add an image generation provider", or needs image-generation endpoint setup through local or HivemindOS Tailscale routes.
version: 0.1.0
---

# ComfyUI Image Generation

Generate images through ComfyUI-style local or remote services. Keep image providers in this skill as blocks so agents can compare local and Tailnet routes without scattering image-generation instructions across separate skills.

## Route modes

Use one of two modes:

- **Tailnet mode**: call a remote HivemindOS image-generation host over Tailscale. Use this when the generator runs on a different machine than the requesting agent.
- **Local mode**: call a generator running on the current machine. Use this only when the current machine owns the model files and service process.

Do not require Tailnet clients to have ComfyUI installed locally. Do not use client-local `127.0.0.1` for a remote generator.

## Generic Tailnet image-generation template

Use this block when documenting a remote ComfyUI/Z-Image/Flux/SD image endpoint available through Tailscale.

**Client route**

- Primary UI/API: `https://<magicdns-or-tailnet-ip>:<https-port>` or `http://<magicdns-or-tailnet-ip>:<http-port>`
- HTTP fallback: `http://<magicdns-or-tailnet-ip>:<http-port>`
- Do not use `127.0.0.1` from the client unless the client is also the service host.

**Tailnet client preflight**

```bash
curl -kfsS -I --max-time 8 https://<tailnet-host>:<https-port>/ || true
curl -fsS -I --max-time 8 http://<tailnet-host>:<http-port>/ || true
```

If both fail, diagnose Tailnet reachability or the remote image-generation service. Do not fall back to local ComfyUI paths on the client.

**Service-host facts to fill in**

- Service host label: `<machine-name>`
- Service manager: `<launchctl/systemd/docker/manual>`
- User-facing lifecycle command: `<command>`
- Raw ComfyUI URL on service host: `http://127.0.0.1:<port>`
- Wrapper/API URL on service host: `http://127.0.0.1:<port>`
- Output storage root: `<path>`
- Model/default workflow: `<model or workflow name>`
- Hardware notes: `<cuda/mps/cpu/ram/vram constraints>`

**Browser generation flow**

1. Open the Tailnet UI from the client.
2. Enter the prompt and settings through the UI.
3. Confirm queue/progress feedback appears.
4. Verify previews and final images load clearly.
5. Return image files or links only after verifying the output exists.

**API generation flow**

Inspect the wrapper's documented API shape before guessing endpoint names. Prefer wrapper APIs that redact prompt history and preserve output privacy. Avoid raw ComfyUI `/queue` and `/history` unless the user explicitly authorizes plaintext prompt inspection.

## Generic local image-generation template

Use this block when the current machine runs the image generator.

**Local preflight**

```bash
curl -fsS --max-time 5 http://127.0.0.1:<comfy-port>/system_stats
curl -fsS -I --max-time 5 http://127.0.0.1:<ui-port>/ || true
lsof -nP -iTCP:<comfy-port> -sTCP:LISTEN || true
```

**Local generation notes**

- Use local paths and lifecycle commands only in local mode.
- Verify GPU/runtime availability before claiming acceleration.
- Save outputs to an explicit private output directory when privacy matters.
- Verify final image files with `file` or a browser/image preview before returning them.

## Z-Image provider template

Use this block as a starting point for a Z-Image-backed ComfyUI wrapper.

**Recommended shape**

- Tailnet UI: `https://<z-image-host>.<tailnet-name>.ts.net:<port>` or `https://<tailnet-ip>:<port>`
- HTTP fallback: `http://<tailnet-host>:<port>`
- Remote lifecycle: one command that starts/stops the whole stack, not separate user-facing commands for ComfyUI, wrapper, frontend, and tunnel.
- Private outputs: hidden/no-index output storage when the host is a personal Mac.
- Apple Silicon: prefer MPS-safe launch flags and avoid CUDA-only packages such as `flash-attn`.

**Service-host diagnostics only**

```bash
<stack-command> status
curl -fsS --max-time 5 http://127.0.0.1:<comfy-port>/system_stats
curl -fsS --max-time 5 http://127.0.0.1:<wrapper-port>/health
curl -fsS -I --max-time 5 http://127.0.0.1:<ui-port>/
```

## Pitfalls

- Keep image providers in this skill; do not create a new skill for every image model.
- Use a new category skill only for a new output type, such as video or 3D model generation.
- Separate Tailnet client instructions from service-host diagnostics.
- Treat raw Tailnet IPs as current examples, not permanent identifiers.
- Do not store private Tailnet IPs, prompts, or machine-specific paths in bundled public templates unless they are placeholders.
