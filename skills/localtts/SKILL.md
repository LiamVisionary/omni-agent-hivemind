---
name: localtts
description: This skill should be used when the user asks to "generate local TTS", "use local text to speech", "use remote TTS over Tailscale", "make speech audio", "add a TTS provider", "use Qwen3-TTS", or needs TTS endpoint setup through local or HivemindOS Tailscale routes.
version: 0.1.0
---

# LocalTTS

Generate speech audio through local or HivemindOS Tailnet TTS services. Keep speech providers in this skill as blocks so agents can add new voices and engines without creating one skill per model.

## Route modes

Use one of two modes:

- **Tailnet mode**: call a remote TTS host over Tailscale. Use this when the voice model runs on another HivemindOS machine.
- **Local mode**: call a TTS server running on the current machine. Use this only when the current machine owns the model files and service process.

Do not require Tailnet clients to have the TTS repo, model files, LaunchAgent, systemd unit, or localhost port. Do not use client-local `127.0.0.1` for a remote TTS provider.

## Recommended endpoint contract

A local/Tailnet TTS provider should document at least these endpoints. Prefer OpenAI-compatible paths where possible, and add simple aliases only when they make clients easier to write.

**Discovery and health**

```text
GET /health
GET /v1/models
GET /v1/voices
```

- `GET /health`: liveness/readiness probe. Include service name, status, loaded model, device/backend, and version when available.
- `GET /v1/models`: OpenAI-style model list. Return the model IDs accepted by generation calls.
- `GET /v1/voices`: voice discovery. Return stable voice IDs/names, display names, languages, genders/styles if known, and provider-specific metadata needed by clients.

**Useful optional endpoints**

```text
GET  /voices
GET  /v1/voices/<voice-id>
POST /v1/voices
POST /v1/audio/speech
POST /tts/synthesize
POST /synthesize
POST /api/tts
GET  /openapi.json
GET  /docs
```

- `GET /voices`: compatibility alias for clients that do not use `/v1/*`; should return the same data shape as `/v1/voices` or clearly document differences.
- `GET /v1/voices/<voice-id>`: details for one voice, including language support, sample rate, tags, and whether it requires a reference sample.
- `POST /v1/voices`: register a new local cloned voice profile from multipart reference audio. Requires `name` and `ref_audio`; accepts `language`, `description`, `model`, `ref_text`, and `x_vector_only_mode`.
- `POST /v1/audio/speech`: primary OpenAI-style speech generation endpoint. Accept `model`, `input`, `voice`, `response_format`, and provider extras such as `language`, `instruct`, `speed`, `temperature`, `top_p`, `max_new_tokens`, or `seed`.
- `POST /tts/synthesize`: canonical JSON/base64 compatibility endpoint for clients that cannot handle binary audio responses.
- `POST /synthesize` or `POST /api/tts`: JSON-native compatibility aliases for non-OpenAI clients. Document request/response exactly if the provider supports them.
- `GET /openapi.json` and `GET /docs`: optional API schema and Swagger/ReDoc docs for human/client discovery.

**Voice endpoint response template**

```json
{
  "object": "list",
  "data": [
    {
      "id": "<voice-id>",
      "name": "<display-name>",
      "language": "English",
      "languages": ["English"],
      "description": "Warm neutral narration voice.",
      "styles": ["neutral", "warm", "narration"],
      "sample_rate": 24000,
      "requires_reference_audio": false,
      "provider": "<provider-name>"
    }
  ]
}
```

**Endpoint smoke tests**

```bash
curl -fsS --max-time 5 http://<host>:<port>/health
curl -fsS --max-time 5 http://<host>:<port>/v1/models
curl -fsS --max-time 5 http://<host>:<port>/v1/voices
curl -fsS --max-time 5 http://<host>:<port>/voices || true
```

## Generic Tailnet TTS template

Use this block when documenting an OpenAI-compatible or JSON TTS endpoint reachable through Tailscale.

**Client route**

- Primary base URL: `http://<magicdns-or-tailnet-ip>:<port>`
- HTTPS base URL, if configured: `https://<magicdns-or-tailnet-ip>:<port>`
- Do not use `127.0.0.1` from the client unless the client is also the service host.

**Tailnet client preflight**

```bash
curl -fsS --max-time 5 http://<tailnet-host>:<port>/health
curl -fsS --max-time 5 http://<tailnet-host>:<port>/v1/models
curl -fsS --max-time 5 http://<tailnet-host>:<port>/v1/voices
```

If discovery endpoints fail, diagnose Tailnet reachability or the remote TTS host. Do not substitute unrelated local services on other ports.

**OpenAI-style generation example**

```bash
curl -fsS -X POST http://<tailnet-host>:<port>/v1/audio/speech \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "<model-id>",
    "input": "Hello from the HivemindOS Tailnet TTS endpoint.",
    "voice": "<voice-name>",
    "language": "English",
    "instruct": "Speak clearly and warmly.",
    "response_format": "wav",
    "max_new_tokens": 512
  }' \
  -o /tmp/tailnet-tts-output.wav
```

**Verify output**

```bash
ls -lh /tmp/tailnet-tts-output.wav
file /tmp/tailnet-tts-output.wav
```

## Generic local TTS template

Use this block when the current machine runs the TTS service.

**Local preflight**

```bash
curl -fsS --max-time 5 http://127.0.0.1:<port>/health
curl -fsS --max-time 5 http://127.0.0.1:<port>/v1/models
curl -fsS --max-time 5 http://127.0.0.1:<port>/v1/voices
lsof -nP -iTCP:<port> -sTCP:LISTEN || true
```

**Local generation example**

```bash
curl -fsS -X POST http://127.0.0.1:<port>/v1/audio/speech \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "<model-id>",
    "input": "Hello from the local TTS endpoint.",
    "voice": "<voice-name>",
    "response_format": "wav"
  }' \
  -o /tmp/local-tts-output.wav
```

## Qwen3-TTS provider template

Use this block as a starting point for Qwen3-TTS or a Qwen3-compatible local voice server.

**Provider fields to fill in**

- Tailnet base URL: `http://<qwen-tts-host>:<port>`
- Local service-host URL: `http://127.0.0.1:<port>`
- Default model: `<qwen3-tts-model-id>`
- Default voice: `<voice-name>`
- Service directory on host: `<path>`
- Service manager: `<launchctl/systemd/docker/manual>`
- Logs: `<path or command>`
- Precision/hardware note: `<mps/cuda/cpu dtype constraints>`

**Service-host diagnostics only**

```bash
curl -fsS --max-time 5 http://127.0.0.1:<port>/health || true
curl -fsS --max-time 5 http://127.0.0.1:<port>/v1/models || true
curl -fsS --max-time 5 http://127.0.0.1:<port>/v1/voices || true
curl -fsS --max-time 5 http://127.0.0.1:<port>/voices || true
lsof -nP -iTCP:<port> -sTCP:LISTEN || true
# macOS example:
launchctl print gui/$(id -u)/<service-label> || true
# Linux example:
systemctl --user status <service-name> || true
```

## Delivery pattern

When generating audio for a chat user, save a `.wav`, `.mp3`, or `.ogg` under a stable absolute path and include it in the final response as a native media attachment when the runtime supports it.

## Pitfalls

- Keep TTS providers in this skill; do not create a new skill for every speech model.
- Use a separate music/song skill for non-speech music generation.
- Separate Tailnet client instructions from service-host diagnostics.
- Treat raw Tailnet IPs as current examples, not permanent identifiers.
- Do not store private Tailnet IPs, voice samples, transcripts, or machine-specific paths in bundled public templates unless they are placeholders.
