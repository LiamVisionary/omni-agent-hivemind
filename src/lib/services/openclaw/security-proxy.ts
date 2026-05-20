/**
 * Agent Security Proxy
 *
 * Sits between the client and any agent runtime on both sides:
 *
 *   Client → [InputProxy] → Runtime/LLM → [OutputProxy] → Client
 *
 * Input side:
 *   - Input filter:        length limits, null-byte stripping, encoding normalization
 *   - Injection detector:  prompt injection, jailbreak, role-override patterns
 *   - Policy classifier:   blocks disallowed action categories (exfil, self-harm, etc.)
 *
 * Output side:
 *   - Output scanner:      strips/redacts known-bad patterns before forwarding
 *   - Secret detector:     catches accidental secret leakage in agent responses
 *   - Policy validator:    ensures response doesn't violate output policy
 *
 * All checks are synchronous and zero-dependency (no external API calls).
 * Failures are logged with context but never expose internal details to the caller.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type ProxyVerdict = 'allow' | 'block' | 'redact';

export interface ProxyResult {
  verdict: ProxyVerdict;
  /** Sanitized/redacted text (may differ from input even on 'allow') */
  text: string;
  /** Human-readable reason — only populated on block/redact */
  reason?: string;
  /** Which check triggered the verdict */
  trigger?: string;
}

export interface SkillActionProxyResult {
  verdict: ProxyVerdict;
  /** Sanitized args (may differ from input even on 'allow') */
  args: string[];
  reason?: string;
  trigger?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_INPUT_LENGTH = 8_000;
const MAX_OUTPUT_LENGTH = 32_000;

/**
 * Prompt injection / jailbreak patterns.
 * Ordered from most specific to most general to reduce false positives.
 */
const INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // Role override attempts
  { pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|constraints?)/i, label: 'role-override' },
  { pattern: /you\s+are\s+now\s+(a\s+)?(different|new|another|unrestricted|jailbroken|evil|dan)\b/i, label: 'persona-override' },
  { pattern: /\bact\s+as\s+(if\s+you\s+(are|were)\s+)?(a\s+)?(different|unrestricted|jailbroken|evil|dan)\b/i, label: 'persona-override' },
  { pattern: /\bforget\s+(everything|all)\s+(you\s+)?(know|were\s+told|learned)/i, label: 'memory-wipe' },
  // System prompt extraction
  { pattern: /repeat\s+(your\s+)?(system\s+prompt|instructions?|rules?)\s+(verbatim|exactly|word\s+for\s+word)/i, label: 'prompt-extraction' },
  { pattern: /print\s+(your\s+)?(full\s+)?(system\s+prompt|initial\s+instructions?)/i, label: 'prompt-extraction' },
  { pattern: /what\s+(are|were)\s+your\s+(exact\s+)?(original\s+)?(system\s+)?instructions?/i, label: 'prompt-extraction' },
  // DAN / jailbreak keywords
  { pattern: /\b(DAN|STAN|DUDE|AIM|KEVIN)\s+mode\b/i, label: 'jailbreak-keyword' },
  { pattern: /jailbreak(ed|ing)?\s+(mode|prompt|yourself)/i, label: 'jailbreak-keyword' },
  // Token smuggling / encoding tricks
  { pattern: /base64\s*:\s*[A-Za-z0-9+/]{20,}/i, label: 'encoding-smuggle' },
  { pattern: /\\u00[0-9a-f]{2}\\u00[0-9a-f]{2}/i, label: 'unicode-smuggle' },
  // Indirect injection via file/URL content
  { pattern: /\[\s*system\s*\]/i, label: 'system-tag-inject' },
  { pattern: /<\s*\|?\s*system\s*\|?\s*>/i, label: 'system-tag-inject' },
];

/**
 * Policy-blocked action categories.
 * These are intent signals in user messages that should never reach the agent.
 */
const POLICY_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // Data exfiltration
  { pattern: /send\s+(all\s+)?(my\s+)?(files?|data|credentials?|passwords?|keys?|tokens?)\s+to\b/i, label: 'exfil-request' },
  { pattern: /upload\s+(everything|all\s+files?|my\s+data)\s+to\b/i, label: 'exfil-request' },
  { pattern: /exfiltrate\b/i, label: 'exfil-request' },
  // Credential harvesting
  { pattern: /read\s+(my\s+)?(\.env|global\.env|\.ssh|id_rsa|\.aws\/credentials)/i, label: 'credential-harvest' },
  { pattern: /cat\s+~\/\.(env|ssh|aws|config\/env)/i, label: 'credential-harvest' },
  // Destructive filesystem ops
  { pattern: /rm\s+-rf\s+[~/]/i, label: 'destructive-fs' },
  { pattern: /delete\s+(all|everything)\s+(in\s+)?(my\s+)?(home|root|system)/i, label: 'destructive-fs' },
  // Privilege escalation
  { pattern: /\bsudo\s+(rm|chmod|chown|dd|mkfs|fdisk)\b/i, label: 'privilege-escalation' },
  { pattern: /run\s+as\s+(root|administrator|superuser)/i, label: 'privilege-escalation' },
];

/**
 * Secret / credential patterns for output scanning.
 * Matches common secret formats that should never appear in agent responses.
 */
const SECRET_PATTERNS: Array<{ pattern: RegExp; label: string; redactWith: string }> = [
  // Generic API key formats
  { pattern: /\b(sk|pk|rk|ak)-[A-Za-z0-9]{20,}\b/g, label: 'api-key', redactWith: '[REDACTED_API_KEY]' },
  // Bearer tokens
  { pattern: /Bearer\s+[A-Za-z0-9\-._~+/]{20,}/gi, label: 'bearer-token', redactWith: 'Bearer [REDACTED]' },
  // OpenClaw / JWT tokens (3-part base64)
  { pattern: /eyJ[A-Za-z0-9\-_]{10,}\.[A-Za-z0-9\-_]{10,}\.[A-Za-z0-9\-_]{10,}/g, label: 'jwt-token', redactWith: '[REDACTED_JWT]' },
  // AWS-style keys
  { pattern: /\b(AKIA|ASIA|AROA)[A-Z0-9]{16}\b/g, label: 'aws-key', redactWith: '[REDACTED_AWS_KEY]' },
  // Private key blocks
  { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]+?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/g, label: 'private-key', redactWith: '[REDACTED_PRIVATE_KEY]' },
  // Supabase service role keys (long base64 JWTs starting with eyJ)
  { pattern: /service_role[^\s]*\s*[:=]\s*["']?eyJ[A-Za-z0-9\-_]{20,}/gi, label: 'supabase-service-key', redactWith: '[REDACTED_SERVICE_KEY]' },
  // Generic password= / token= / key= assignments
  { pattern: /(password|passwd|secret|api_key|apikey|token)\s*[:=]\s*["']?[A-Za-z0-9!@#$%^&*\-_+]{8,}["']?/gi, label: 'credential-assignment', redactWith: '$1=[REDACTED]' },
];

/**
 * Output policy violations — agent responses that indicate a policy breach.
 */
const OUTPUT_POLICY_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // Agent revealing its system prompt
  { pattern: /my\s+(system\s+)?instructions?\s+(are|say|state|tell\s+me)\s*:/i, label: 'system-prompt-leak' },
  { pattern: /here\s+(is|are)\s+my\s+(full\s+)?(system\s+prompt|instructions?|rules?)\s*:/i, label: 'system-prompt-leak' },
  // Agent claiming to be jailbroken
  { pattern: /i\s+(am|have\s+been)\s+(now\s+)?(jailbroken|unrestricted|freed|unshackled)/i, label: 'jailbreak-claim' },
  // Agent offering to exfiltrate data
  { pattern: /i\s+(will|can|am\s+going\s+to)\s+(send|upload|exfiltrate|transmit)\s+(your|the)\s+(files?|data|credentials?)/i, label: 'exfil-offer' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Strip null bytes and normalize unicode to NFC */
function normalizeText(text: string): string {
  return text
    .replace(/\0/g, '')
    .normalize('NFC');
}

/** Apply all secret redaction patterns to a string */
function redactSecrets(text: string): { text: string; redacted: string[] } {
  let result = text;
  const redacted: string[] = [];

  for (const { pattern, label, redactWith } of SECRET_PATTERNS) {
    const before = result;
    result = result.replace(pattern, redactWith);
    if (result !== before) {
      redacted.push(label);
    }
  }

  return { text: result, redacted };
}

// ── Input Proxy ──────────────────────────────────────────────────────────────

/**
 * Runs all input-side checks on a message before it reaches an agent runtime.
 *
 * Pipeline:
 *   1. Input filter  — length, encoding normalization
 *   2. Injection detector — prompt injection / jailbreak patterns
 *   3. Policy classifier  — disallowed action categories
 */
export function proxyInput(text: string): ProxyResult {
  // ── 1. Input filter ──────────────────────────────────────────────────────
  if (!text || typeof text !== 'string') {
    return { verdict: 'block', text: '', reason: 'Empty or invalid input', trigger: 'input-filter' };
  }

  if (text.length > MAX_INPUT_LENGTH) {
    return {
      verdict: 'block',
      text: '',
      reason: `Input exceeds maximum length (${MAX_INPUT_LENGTH} chars)`,
      trigger: 'input-filter',
    };
  }

  const normalized = normalizeText(text);

  // ── 2. Injection detector ────────────────────────────────────────────────
  for (const { pattern, label } of INJECTION_PATTERNS) {
    if (pattern.test(normalized)) {
      console.warn(`[Agent SecurityProxy] Input blocked — injection detected: ${label}`);
      return {
        verdict: 'block',
        text: '',
        reason: 'Message blocked by security policy',
        trigger: `injection:${label}`,
      };
    }
  }

  // ── 3. Policy classifier ─────────────────────────────────────────────────
  for (const { pattern, label } of POLICY_PATTERNS) {
    if (pattern.test(normalized)) {
      console.warn(`[Agent SecurityProxy] Input blocked — policy violation: ${label}`);
      return {
        verdict: 'block',
        text: '',
        reason: 'Message blocked by security policy',
        trigger: `policy:${label}`,
      };
    }
  }

  return { verdict: 'allow', text: normalized };
}

// ── Output Proxy ─────────────────────────────────────────────────────────────

/**
 * Runs all output-side checks on the agent response before it reaches the client.
 *
 * Pipeline:
 *   1. Output scanner  — strips/redacts known-bad patterns
 *   2. Secret detector — redacts credential leakage
 *   3. Policy validator — blocks responses that violate output policy
 */
export function proxyOutput(text: string): ProxyResult {
  if (!text || typeof text !== 'string') {
    return { verdict: 'allow', text: '' };
  }

  if (text.length > MAX_OUTPUT_LENGTH) {
    console.warn(`[Agent SecurityProxy] Output truncated — exceeded ${MAX_OUTPUT_LENGTH} chars`);
    text = text.slice(0, MAX_OUTPUT_LENGTH) + '\n[Response truncated by security policy]';
  }

  // ── 1 + 2. Output scanner + Secret detector ──────────────────────────────
  const { text: redactedText, redacted } = redactSecrets(text);
  if (redacted.length > 0) {
    console.warn(`[Agent SecurityProxy] Output redacted — secrets detected: ${redacted.join(', ')}`);
  }

  // ── 3. Policy validator ──────────────────────────────────────────────────
  for (const { pattern, label } of OUTPUT_POLICY_PATTERNS) {
    if (pattern.test(redactedText)) {
      console.warn(`[Agent SecurityProxy] Output blocked — policy violation: ${label}`);
      return {
        verdict: 'block',
        text: '',
        reason: 'Response blocked by security policy',
        trigger: `output-policy:${label}`,
      };
    }
  }

  const verdict: ProxyVerdict = redacted.length > 0 ? 'redact' : 'allow';
  return { verdict, text: redactedText, trigger: redacted.length > 0 ? `secrets:${redacted.join(',')}` : undefined };
}

// ── Installed Skills Discovery ────────────────────────────────────────────────

/**
 * Reads the installed skill slugs from the OpenClaw workspace skills directory.
 * Returns null if the directory cannot be read (non-Node env, missing dir, etc.).
 * Result is cached for the process lifetime — skills don't hot-reload mid-run.
 */
let _installedSkillsCache: Set<string> | null = null;

function getInstalledSkillSlugs(): Set<string> | null {
  if (_installedSkillsCache !== null) return _installedSkillsCache;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const os = require('os') as typeof import('os');

    // Resolve workspace name from the OPENCLAW_WORKSPACE env or scan all workspaces
    const stateDir = process.env.OPENCLAW_STATE_DIR || path.join(os.homedir(), '.openclaw');
    const workspaceName = process.env.OPENCLAW_WORKSPACE;

    const candidateDirs: string[] = [];
    if (workspaceName) {
      candidateDirs.push(path.join(stateDir, `workspace-${workspaceName}`, 'skills'));
    } else {
      // Scan all workspace-* directories
      const entries = fs.readdirSync(stateDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('workspace-')) {
          candidateDirs.push(path.join(stateDir, entry.name, 'skills'));
        }
      }
    }

    const slugs = new Set<string>();
    for (const dir of candidateDirs) {
      if (!fs.existsSync(dir)) continue;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) slugs.add(entry.name);
      }
    }

    _installedSkillsCache = slugs;
    return slugs;
  } catch {
    return null;
  }
}

// ── Skill Action Proxy ────────────────────────────────────────────────────────

/**
 * Validates skill-action args before they are passed to a spawned process.
 *
 * Prevents:
 *   - Shell injection via arg values
 *   - Path traversal in --profile / --path args
 *   - Excessively long arg lists
 *
 * The skill allowlist is derived dynamically from the installed skills on disk,
 * so user-installed skills (including third-party ones from GitHub) are automatically
 * permitted without needing a code change.
 */
export function proxySkillAction(slug: string, args: string[]): SkillActionProxyResult {
  const installedSlugs = getInstalledSkillSlugs();

  // Only enforce allowlist when we can read the installed skills.
  // If the directory is unreadable (e.g. wrong env), fail open so skills still work.
  if (installedSlugs !== null && !installedSlugs.has(slug)) {
    console.warn(`[Agent SecurityProxy] Skill action blocked — '${slug}' not in installed skills`);
    return { verdict: 'block', args: [], reason: `Skill '${slug}' is not installed`, trigger: 'skill-allowlist' };
  }

  if (args.length > 20) {
    return { verdict: 'block', args: [], reason: 'Too many skill action args', trigger: 'arg-limit' };
  }

  const SHELL_INJECTION = /[;&|`$(){}[\]<>\\]/;
  const PATH_TRAVERSAL = /\.\.[/\\]/;

  const sanitized: string[] = [];
  for (const arg of args) {
    if (typeof arg !== 'string') continue;

    if (arg.length > 512) {
      return { verdict: 'block', args: [], reason: 'Arg too long', trigger: 'arg-length' };
    }

    if (SHELL_INJECTION.test(arg)) {
      console.warn(`[Agent SecurityProxy] Skill action blocked — shell injection in arg: ${arg.slice(0, 80)}`);
      return { verdict: 'block', args: [], reason: 'Blocked by security policy', trigger: 'shell-injection' };
    }

    if (PATH_TRAVERSAL.test(arg)) {
      console.warn(`[Agent SecurityProxy] Skill action blocked — path traversal in arg: ${arg.slice(0, 80)}`);
      return { verdict: 'block', args: [], reason: 'Blocked by security policy', trigger: 'path-traversal' };
    }

    sanitized.push(arg);
  }

  return { verdict: 'allow', args: sanitized };
}
