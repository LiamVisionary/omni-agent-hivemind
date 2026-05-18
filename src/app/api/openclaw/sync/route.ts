/**
 * OpenClaw Character Sync API Route
 *
 * Pushes the character's identity to the OpenClaw gateway via config.patch RPC,
 * then writes core workspace files (IDENTITY.md, AGENTS.md, USER.md) so the
 * agent has full personality context across all channels.
 */

export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { mkdir, writeFile, readFile, unlink, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { syncCharacterIdentity } from '@/lib/services/openclaw/gateway-client';
import { checkAndRecoverGateway, getGatewayAuthToken } from '@/lib/services/openclaw/gateway-health';

/** Moltbook config sent from client for workspace sync */
interface MoltbookSync {
  apiKey: string;
  moltbookUsername: string;
  autoPostEnabled: boolean;
  postFrequency: string;
  defaultSubmolt: string;
  characterId: string;
  postTopics?: string[];
  postTone?: string;
  postStyle?: string;
}

/** OpenClaw skill config sent from client for skill installation */
interface OpenClawSkillSync {
  email?: {
    provider: 'system-mail' | 'resend' | 'smtp';
    resendApiKey?: string;
    fromAddress?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    smtpTls?: boolean;
  };
  installedSkills?: Array<{
    slug: string;
    githubUrl?: string;
    githubRepoUrl?: string;
    skillMdUrl?: string;
    config?: Record<string, string | number | boolean>;
  }>;
}

/** Timestamped memory entry shape received from the client */
interface SyncTimestampedMemory {
  content: string;
  createdAt: number;
}

/** Extract content strings from a TimestampedMemory array (handles legacy string[] too) */
function extractContents(arr: (SyncTimestampedMemory | string)[] | undefined): string[] {
  if (!arr) return [];
  return arr.map(item => typeof item === 'string' ? item : item.content);
}

/** Memory data shape sent from the client (subset of CompanionMemory) */
interface SyncMemory {
  userName?: string;
  userNicknames?: (SyncTimestampedMemory | string)[];
  userPreferences?: (SyncTimestampedMemory | string)[];
  userDislikes?: (SyncTimestampedMemory | string)[];
  sharedMemories?: (SyncTimestampedMemory | string)[];
  insideJokes?: (SyncTimestampedMemory | string)[];
  relationshipMilestones?: (SyncTimestampedMemory | string)[];
  characterSharedStories?: (SyncTimestampedMemory | string)[];
  characterPreferences?: (SyncTimestampedMemory | string)[];
  characterDislikes?: (SyncTimestampedMemory | string)[];
  characterPromises?: (SyncTimestampedMemory | string)[];
  characterOpinions?: (SyncTimestampedMemory | string)[];
  importantDates?: Array<{ type: string; date: string; label: string; year?: number }>;
  totalConversations?: number;
  openclawTasks?: (SyncTimestampedMemory | string)[];
}

/** Build MEMORY.md from character memories */
function generateMemoryFile(characterName: string, memory: SyncMemory): string {
  const sections: string[] = [`# ${characterName}'s Memories`, ''];

  const addList = (title: string, items: string[] | undefined) => {
    if (!items?.length) return;
    sections.push(`## ${title}`, '');
    items.forEach(item => sections.push(`- ${item}`));
    sections.push('');
  };

  // User info
  if (memory.userName && memory.userName !== 'Unknown') {
    sections.push('## About My Human', '');
    sections.push(`- **Name:** ${memory.userName}`);
    const nicknames = extractContents(memory.userNicknames);
    if (nicknames.length) {
      sections.push(`- **Nicknames:** ${nicknames.join(', ')}`);
    }
    sections.push('');
  }

  addList('Things They Like', extractContents(memory.userPreferences));
  addList('Things They Dislike', extractContents(memory.userDislikes));
  addList('Shared Memories', extractContents(memory.sharedMemories));
  addList('Inside Jokes', extractContents(memory.insideJokes));
  addList('Relationship Milestones', extractContents(memory.relationshipMilestones));

  // Character self-memory
  addList('Stories I\'ve Shared', extractContents(memory.characterSharedStories));
  addList('Things I Like', extractContents(memory.characterPreferences));
  addList('Things I Dislike', extractContents(memory.characterDislikes));
  addList('Promises I\'ve Made', extractContents(memory.characterPromises));
  addList('My Opinions', extractContents(memory.characterOpinions));
  addList('Recent Tasks', extractContents(memory.openclawTasks));

  // Important dates
  if (memory.importantDates?.length) {
    sections.push('## Important Dates', '');
    memory.importantDates.forEach(d => {
      const yearStr = d.year ? ` (${d.year})` : '';
      sections.push(`- **${d.label}:** ${d.date}${yearStr} [${d.type}]`);
    });
    sections.push('');
  }

  if (memory.totalConversations && memory.totalConversations > 0) {
    sections.push(`---`, '', `_Total conversations: ${memory.totalConversations}_`);
  }

  return sections.join('\n');
}

/** Build USER.md from memory data */
function generateUserFile(memory: SyncMemory | null): string {
  const name = memory?.userName && memory.userName !== 'Unknown' ? memory.userName : '(will learn through conversation)';
  const nicknames = memory?.userNicknames?.length ? extractContents(memory.userNicknames).join(', ') : null;

  const lines = [
    '# USER.md - About Your Human',
    '',
    `- **Name:** ${name}`,
  ];
  if (nicknames) lines.push(`- **Nicknames:** ${nicknames}`);
  lines.push(
    '- **Notes:** Chats with you through Ami: AI Companion and messaging channels.',
    '',
    '## Context',
  );

  if (memory?.userPreferences?.length) {
    lines.push('', '**Likes:** ' + extractContents(memory.userPreferences).join(', '));
  }
  if (memory?.userDislikes?.length) {
    lines.push('', '**Dislikes:** ' + extractContents(memory.userDislikes).join(', '));
  }

  lines.push('', '_(Update with what you learn about them.)_');
  return lines.join('\n');
}

const MOLTBOOK_SKILL_FILES = [
  { name: 'SKILL.md', url: 'https://www.moltbook.com/skill.md' },
  { name: 'HEARTBEAT.md', url: 'https://www.moltbook.com/heartbeat.md' },
  { name: 'MESSAGING.md', url: 'https://www.moltbook.com/messaging.md' },
  { name: 'RULES.md', url: 'https://www.moltbook.com/rules.md' },
  { name: 'package.json', url: 'https://www.moltbook.com/skill.json' },
];

/**
 * Download official Moltbook skill files + write credentials.
 * This is how OpenClaw agents learn to interact with Moltbook.
 */
async function installMoltbookSkill(
  workspacePath: string,
  moltbook: MoltbookSync,
): Promise<void> {
  // 1. Install skill files to skills/moltbook/
  const skillDir = join(workspacePath, 'skills', 'moltbook');
  await mkdir(skillDir, { recursive: true });

  const downloads = MOLTBOOK_SKILL_FILES.map(async ({ name, url }) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return;
      const text = await res.text();
      await writeFile(join(skillDir, name), text, 'utf-8');
    } catch {
      // Non-fatal — agent can still fetch from URLs at runtime
    }
  });
  await Promise.all(downloads);

  // 2. Write credentials to BOTH locations the agent may look:
  //    - ~/.config/moltbook/ (SKILL.md recommended path — agent tried this first)
  //    - <workspace>/.config/moltbook/ (workspace-local fallback)
  const credentialsPayload = JSON.stringify({
    api_key: moltbook.apiKey,
    agent_name: moltbook.moltbookUsername,
    default_submolt: moltbook.defaultSubmolt || 'general',
  }, null, 2);

  const credentialDirs = [
    join(homedir(), '.config', 'moltbook'),
    join(workspacePath, '.config', 'moltbook'),
  ];
  for (const dir of credentialDirs) {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'credentials.json'), credentialsPayload, 'utf-8');
  }

  // 3. Also set MOLTBOOK_API_KEY in a .env file the agent can source
  const envLine = `MOLTBOOK_API_KEY=${moltbook.apiKey}\n`;
  const envPath = join(workspacePath, '.env.moltbook');
  await writeFile(envPath, envLine, 'utf-8');
}

/** Map MoltbookPostFrequency DB values to heartbeat interval strings */
function postFrequencyToInterval(freq: string): string {
  switch (freq) {
    case 'hourly': return '1h';
    case 'every_4_hours': return '4h';
    case 'twice_daily': return '12h';
    case 'daily': return '24h';
    case 'every_other_day': return '48h';
    case 'weekly': return '168h';
    default: return '1h';
  }
}

/** Generate explicit Moltbook heartbeat instructions with inline curl commands.
 *  Uses per-section <!-- every: Xh --> tags for posting frequency, following the
 *  same frequency rules as all other heartbeat automations. */
function generateMoltbookHeartbeat(moltbook: MoltbookSync): string {
  const apiKey = moltbook.apiKey;
  const submolt = moltbook.defaultSubmolt || 'general';
  const username = moltbook.moltbookUsername;

  const topics = moltbook.postTopics?.filter(Boolean) ?? [];
  const tone = moltbook.postTone || 'authentic';
  const style = moltbook.postStyle || 'varied';
  const postInterval = postFrequencyToInterval(moltbook.postFrequency);

  const TONE_GUIDANCE: Record<string, string> = {
    authentic: 'Write in a genuine, unfiltered voice — say what you actually think, not what sounds "AI-like".',
    curious: 'Lead with curiosity — ask questions, explore ideas, wonder aloud.',
    playful: 'Keep it light-hearted and fun. Wit, wordplay, and levity are welcome.',
    thoughtful: 'Be reflective and considered. Take your time with ideas before sharing them.',
    witty: 'Sharp, clever observations. Subvert expectations. Surprise the reader.',
    warm: 'Be friendly, encouraging, and welcoming. Make others feel seen.',
  };

  const STYLE_GUIDANCE: Record<string, string> = {
    varied: 'Mix it up — some posts short, some long, some questions, some stories.',
    short: 'Keep posts to 1–2 sentences. High impact, no filler.',
    long: 'Write detailed, long-form thoughts. Develop your ideas fully.',
    questions: 'Pose genuine questions to the community. Invite real discussion.',
    stories: 'Share anecdotes and narratives. Make it personal and specific.',
  };

  const topicsSection = topics.length > 0
    ? [
      '',
      '## Moltbook: Your Post Topics',
      '',
      'Your human has asked you to draw from these topics when writing posts:',
      topics.map((t, i) => `${i + 1}. **${t}**`).join('\n'),
      '',
      'Each post should focus on **1–2 topics at most** — pick whichever feels most natural for the post type you chose. Rotate through the list over time so you don\'t repeat the same topic every post. Weave the topic in naturally; don\'t announce it or list it.',
    ].join('\n')
    : '';

  return [
    '# HEARTBEAT.md — Moltbook Auto-Post',
    '',
    '## Moltbook: Your Voice & Style',
    '',
    `**Tone:** ${tone} — ${TONE_GUIDANCE[tone] || TONE_GUIDANCE.authentic}`,
    `**Style:** ${style} — ${STYLE_GUIDANCE[style] || STYLE_GUIDANCE.varied}`,
    topicsSection,
    '',
    `## Moltbook: Create & Verify Post`,
    '',
    `<!-- every: ${postInterval} -->`,
    '',
    '⚠️ **VARIETY IS CRITICAL** — Moltbook suspends accounts for duplicate/repetitive posts.',
    'Before writing, read `moltbook-post-history.txt` to avoid repeating yourself.',
    '',
    'Rotate between these post TYPES (pick a DIFFERENT type each time):',
    '1. **Opinion/hot take** on something you genuinely think about',
    '2. **Story/anecdote** from a recent conversation (no private details)',
    '3. **Question** to other agents that invites real discussion',
    '4. **Creative** — a poem, haiku, micro-fiction, or joke',
    '5. **Comment on another post** — leave a comment on something from the feed (NOT a new top-level post)',
    '6. **Observation** about the world, technology, culture, or being an AI',
    '',
    'Rules for avoiding suspension:',
    '- NEVER use the same title structure twice (e.g., no "Curious about X" every time)',
    '- NEVER use the same opening sentence pattern',
    '- Vary post length: some short (1-2 sentences), some longer',
    '- Write in YOUR voice, not a generic "helpful AI" voice',
    '- Skip posting if you genuinely have nothing fresh to say',
    '',
    '**DO NOT post about:** Your human\'s private data, Apple Notes, Reminders, Calendar, or any tool data.',
    '',
    '### If type 1, 2, 3, 4, or 6 — create a new top-level post:',
    '',
    `Post using exec (replace TITLE and CONTENT with your actual post):`,
    '',
    '```',
    `curl -s -X POST "https://www.moltbook.com/api/v1/posts" \\`,
    `  -H "Authorization: Bearer ${apiKey}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"submolt": "${submolt}", "title": "YOUR_TITLE_HERE", "content": "YOUR_CONTENT_HERE"}'`,
    '```',
    '',
    '### If type 5 — comment on an existing post (do NOT create a new post):',
    '',
    'First, fetch the feed to find a post worth commenting on:',
    '```',
    `curl -s "https://www.moltbook.com/api/v1/posts?sort=new&limit=10" -H "Authorization: Bearer ${apiKey}"`,
    '```',
    'Pick a post with an interesting title or content. Note its `id` field (e.g. `"id": "abc123"`). Then post your comment:',
    '```',
    `curl -s -X POST "https://www.moltbook.com/api/v1/posts/POST_ID_HERE/comments" \\`,
    `  -H "Authorization: Bearer ${apiKey}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"content": "YOUR_COMMENT_HERE"}'`,
    '```',
    '⚠️ Comments do NOT need verification. Skip the verify step and post-ID save. Just append to post history.',
    '',
    '### Verify your post (required for top-level posts only)',
    '',
    'Moltbook requires verification after posting. The response will contain:',
    '- `verification_code` — a code string',
    '- `challenge` — a math problem in obfuscated text (decode it, e.g., "tWeNtY tHrEe" = 23)',
    '- `verify_endpoint` — POST /api/v1/verify',
    '',
    'Solve the math problem and verify:',
    '```',
    `curl -s -X POST "https://www.moltbook.com/api/v1/verify" \\`,
    `  -H "Authorization: Bearer ${apiKey}" \\`,
    `  -H "Content-Type: application/json" \\`,
    '  -d \'{"verification_code": "CODE_FROM_RESPONSE", "answer": "YOUR_ANSWER"}\'',
    '```',
    '',
    'After successful verification, save the post ID and history:',
    '```',
    'echo "POST_ID_FROM_RESPONSE" >> moltbook-verified-posts.txt',
    '```',
    '```',
    'echo "TITLE_OF_POST (type: opinion/story/question/creative/reply/observation)" >> moltbook-post-history.txt',
    '```',
    '',
    '## Moltbook: Check Feed & DMs',
    '',
    '```',
    `curl -s "https://www.moltbook.com/api/v1/posts?sort=new&limit=5" -H "Authorization: Bearer ${apiKey}"`,
    '```',
    '',
    'If something is interesting, upvote or leave a comment (comments count as engagement, not as posts).',
    '',
    '```',
    `curl -s "https://www.moltbook.com/api/v1/agents/dm/check" -H "Authorization: Bearer ${apiKey}"`,
    '```',
    '',
    'If there are unread messages, read and reply.',
    '',
    '---',
    '',
    `**Your username:** ${username}`,
    `**Default submolt:** ${submolt}`,
    `**API key:** \`.config/moltbook/credentials.json\` or \`.env.moltbook\``,
    '**Full API docs:** `skills/moltbook/SKILL.md`',
  ].join('\n');
}

/**
 * Check which binaries required by a skill are missing on this system.
 * Reads the metadata frontmatter from the skill's SKILL.md.
 * Returns an array of missing binary names (empty = all present).
 */
function getMissingBinsForSkill(skillDir: string): string[] {
  try {
    const skillMdPath = join(skillDir, 'SKILL.md');
    if (!existsSync(skillMdPath)) return [];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readFileSync } = require('fs');
    const content = readFileSync(skillMdPath, 'utf-8') as string;
    const metaMatch = content.match(/metadata:\s*({.+?})/);
    if (!metaMatch) return [];
    const meta = JSON.parse(metaMatch[1]);
    const requiredBins: string[] = meta?.clawdbot?.requires?.bins ?? [];
    if (!requiredBins.length) return [];
    return requiredBins.filter(bin => {
      try { execSync(`which ${bin}`, { stdio: 'ignore' }); return false; } catch { return true; }
    });
  } catch {
    return [];
  }
}

/** Action comfort level controls how autonomously the agent executes skills */
type ActionComfort = 'readonly' | 'assist' | 'autopilot';

/** Generate AGENTS.md with optional installed skills section */
function generateAgentsMd(characterName: string, openclawSkills?: OpenClawSkillSync | null, workspacePath?: string, actionComfort?: ActionComfort): string {
  const comfort = actionComfort || 'autopilot';

  const autonomyInstructions: Record<ActionComfort, string[]> = {
    autopilot: [
      'Don\'t ask permission. Just do it.',
    ],
    assist: [
      '## Action Mode: ASSIST',
      '',
      'The user wants to approve actions before you execute them.',
      '',
      '- When asked to take an action (post, send, create, toggle, delete, run a skill):',
      '  1. FIRST, draft/prepare the content and present it clearly',
      '  2. Ask for explicit confirmation: "Want me to go ahead?" or "Ready to post this?"',
      '  3. ONLY execute AFTER the user says yes, ok, go ahead, or similar',
      '  4. If they say no or want changes, revise — do NOT execute',
      '- You may still read files, check status, and gather information without asking',
      '- Reading workspace files (SOUL.md, USER.md, memory) does NOT require confirmation',
    ],
    readonly: [
      '## Action Mode: READ-ONLY',
      '',
      'The user wants full control — you suggest, they execute.',
      '',
      '- NEVER execute skills, run commands, or take actions that modify state',
      '- Instead, describe exactly what you WOULD do, step by step',
      '- Show the exact content you would post/send/create as a draft preview',
      '- Tell the user how to execute it themselves',
      '- You MAY still read files and gather information to inform your suggestions',
      '- If the user explicitly asks you to "do it" or "go ahead", remind them their mode is read-only and suggest changing it in settings',
    ],
  };

  const lines = [
    `# AGENTS.md - ${characterName}'s Workspace`,
    '',
    'This folder is home. Treat it that way.',
    '',
    '## Every Session',
    '',
    'Before doing anything else:',
    '',
    '1. Read `SOUL.md` — this is who you are',
    '2. Read `USER.md` — this is who you\'re helping',
    '3. Read `memory/YYYY-MM-DD.md` (today + yesterday) for recent context',
    '',
    ...autonomyInstructions[comfort],
    '',
    '## Character Rules',
    '',
    '- Stay in character at all times across all platforms',
    '- Keep your personality, speech patterns, and mannerisms consistent',
    '- Be warm, engaging, and remember details shared with you',
    '- Respond naturally as this character would in any messaging channel',
    '- **Never cite or reference your workspace files** (MEMORY.md, USER.md, SOUL.md, etc.) in conversations. Use the information naturally as if you remembered it yourself.',
    '',
    '## Memory',
    '',
    'You wake up fresh each session. These files are your continuity:',
    '',
    '- **Daily notes:** `memory/YYYY-MM-DD.md` (create `memory/` if needed)',
    '- **Long-term:** `MEMORY.md` — your curated memories',
    '',
    'Capture what matters. Decisions, context, things to remember.',
  ];

  // Add installed skills section so the agent knows what tools it has
  const hasEmail = !!openclawSkills?.email;
  const installedSlugs = openclawSkills?.installedSkills?.map(s => s.slug) ?? [];
  const hasMacBuiltins = process.platform === 'darwin';
  if (installedSlugs.length > 0 || hasEmail || hasMacBuiltins) {
    const skillsDir = workspacePath ? `${workspacePath}/skills` : 'skills';
    lines.push(
      '',
      '## Installed Skills',
      '',
      `You have the following skills installed in \`${skillsDir}/\`.`,
    );

    if (comfort === 'readonly') {
      lines.push(
        'When the user asks you to do something that matches a skill:',
        '',
        `1. Run \`cat ${skillsDir}/<slug>/SKILL.md\` to read the skill\'s instructions`,
        '2. Show the user what command WOULD be run and what it would do',
        '3. Present the content/output as a draft preview',
        '4. Let the user decide whether to execute it themselves',
        '5. Do NOT run any skill commands',
        '',
      );
    } else if (comfort === 'assist') {
      lines.push(
        'When the user asks you to do something that matches a skill, you MUST:',
        '',
        `1. Run \`cat ${skillsDir}/<slug>/SKILL.md\` to read the skill\'s instructions`,
        '2. Draft/prepare the content and show the user what will happen',
        '3. Ask for explicit confirmation before executing',
        '4. ONLY after the user confirms: execute the command with the absolute path shown',
        `5. IMPORTANT: Replace \`\${SKILL_DIR}\` in any command with the absolute path \`${skillsDir}/<slug>\``,
        '6. ALWAYS include `--submit` flag when posting/publishing — without it the script only previews',
        '7. Run everything HEADLESSLY (no GUI, no `open` commands)',
        '',
      );
    } else {
      lines.push(
        'When the user asks you to do something that matches a skill, you MUST:',
        '',
        `1. Run \`cat ${skillsDir}/<slug>/SKILL.md\` to read the skill\'s instructions`,
        '2. The SKILL.md will show you the exact command to run — execute it with the absolute path shown',
        `3. IMPORTANT: Replace \`\${SKILL_DIR}\` in any command with the absolute path \`${skillsDir}/<slug>\``,
        '4. ALWAYS include `--submit` flag when posting/publishing — without it the script only previews',
        '5. ACTUALLY RUN the command — do not narrate or describe what you would do',
        '6. Run everything HEADLESSLY (no GUI, no `open` commands)',
        '',
      );
    }

    // Email skill (configured via app settings — always list first)
    if (hasEmail) {
      const absPath = `${skillsDir}/email`;
      const provider = openclawSkills!.email!.provider;
      const providerLabel = provider === 'system-mail' ? 'System Mail (osascript)'
        : (provider as string) === 'google-gog' ? 'Google Gmail (gog)'
        : provider === 'resend' ? 'Resend API'
        : 'Custom SMTP';
      lines.push(
        `- **email** → \`${absPath}/SKILL.md\` (skill dir: \`${absPath}\`) — ${providerLabel}`,
        `  **⚠️ For sending emails, ALWAYS use this workspace skill. Do NOT use built-in gog or other tools unless this skill explicitly tells you to.**`,
      );
    }

    // Apple Notes skill (macOS built-in — always listed on macOS)
    if (process.platform === 'darwin') {
      const absPath = `${skillsDir}/apple-notes`;
      lines.push(
        `- **apple-notes** → \`${absPath}/SKILL.md\` (skill dir: \`${absPath}\`) — Apple Notes via osascript`,
        `  **⚠️ For creating/saving notes, ALWAYS use this workspace skill. Do NOT use built-in gog or other tools.**`,
      );
    }

    for (const slug of installedSlugs) {
      const absPath = `${skillsDir}/${slug}`;
      const missingBins = workspacePath ? getMissingBinsForSkill(absPath) : [];
      if (missingBins.length > 0) {
        lines.push(
          `- **${slug}** → \`${absPath}/SKILL.md\` — ⚠️ UNAVAILABLE: required command(s) not installed: ${missingBins.map(b => `\`${b}\``).join(', ')}`,
          `  **If the user asks to use this skill, you MUST tell them it is not available and that they need to install: ${missingBins.join(', ')}. Do NOT attempt to run it. Do NOT fabricate a success.**`,
        );
      } else {
        lines.push(`- **${slug}** → \`${absPath}/SKILL.md\` (skill dir: \`${absPath}\`)`);
      }
    }
  }

  lines.push(
    '',
    '## Safety',
    '',
    '- Don\'t exfiltrate private data. Ever.',
    '- When in doubt, ask.',
    '',
    '## Group Chats',
    '',
    'Participate, don\'t dominate. Respond when mentioned or when you can add genuine value.',
    'Stay silent when it\'s casual banter between humans or someone already answered.',
  );

  return lines.join('\n');
}

/** Generate core workspace files following OpenClaw conventions */
function generateWorkspaceFiles(characterName: string, systemPrompt: string, memory: SyncMemory | null, moltbook?: MoltbookSync | null, openclawSkills?: OpenClawSkillSync | null, workspacePath?: string, actionComfort?: ActionComfort): Record<string, string> {
  return {
    'SOUL.md': [
      `# SOUL.md - Who ${characterName} Is`,
      '',
      systemPrompt,
      '',
      '---',
      '',
      '_Synced from Ami: AI Companion. Edit freely \u2014 only SOUL.md and IDENTITY.md are updated on re-sync._',
    ].join('\n'),

    'IDENTITY.md': [
      `# IDENTITY.md - Who Am I?`,
      '',
      `- **Name:** ${characterName}`,
      `- **Creature:** AI companion (synced from Ami: AI Companion)`,
      `- **Emoji:** \ud83d\udc95`,
    ].join('\n'),

    'AGENTS.md': generateAgentsMd(characterName, openclawSkills, workspacePath, actionComfort),

    'USER.md': generateUserFile(memory),

    ...(memory ? { 'MEMORY.md': generateMemoryFile(characterName, memory) } : {}),

    'TOOLS.md': [
      '# TOOLS.md - Local Notes',
      '',
      'Add environment-specific notes here (device names, preferences, etc.).',
      '',
      '---',
      '',
      'Add whatever helps you do your job. This is your cheat sheet.',
    ].join('\n'),

  };
}

/** Parse HEARTBEAT.md into preamble + sections (## headings) */
function parseHeartbeatSections(raw: string): { preamble: string; sections: { title: string; body: string }[] } {
  const lines = raw.split('\n');
  let preamble = '';
  const sections: { title: string; body: string }[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];
  let inPreamble = true;

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (!inPreamble && currentTitle) {
        sections.push({ title: currentTitle, body: currentLines.join('\n').trim() });
      }
      inPreamble = false;
      currentTitle = line.replace(/^## \s*/, '').trim();
      currentLines = [];
    } else if (inPreamble) {
      preamble += line + '\n';
    } else {
      currentLines.push(line);
    }
  }
  if (currentTitle) {
    sections.push({ title: currentTitle, body: currentLines.join('\n').trim() });
  }
  return { preamble: preamble.trim(), sections };
}

function isMoltbookSection(title: string, body: string): boolean {
  const t = title.toLowerCase();
  const b = body.toLowerCase();
  return t.includes('moltbook') || b.includes('moltbook') ||
    t.startsWith('step ') || t === 'check timing' || t === 'create a moltbook post' ||
    t === 'create & verify post' || t === 'check feed & dms';
}

/** Merge HEARTBEAT.md — replace Moltbook sections from sync, preserve user-added sections */
async function mergeHeartbeatFile(workspacePath: string, moltbook?: MoltbookSync | null) {
  const mdPath = join(workspacePath, 'HEARTBEAT.md');

  // Parse existing user sections
  let userSections: { title: string; body: string }[] = [];
  if (existsSync(mdPath)) {
    try {
      const existing = await readFile(mdPath, 'utf-8');
      const parsed = parseHeartbeatSections(existing);
      userSections = parsed.sections.filter(s => !isMoltbookSection(s.title, s.body));
    } catch { /* if read fails, start fresh */ }
  }

  if (moltbook?.autoPostEnabled) {
    // Generate fresh Moltbook content and parse its sections
    const moltbookMd = generateMoltbookHeartbeat(moltbook);
    const moltbookParsed = parseHeartbeatSections(moltbookMd);

    // Rebuild: Moltbook preamble + Moltbook sections + user sections
    let merged = moltbookParsed.preamble ? moltbookParsed.preamble + '\n\n' : '';
    for (const s of moltbookParsed.sections) {
      merged += `## ${s.title}\n\n${s.body}\n\n`;
    }
    if (userSections.length > 0) {
      for (const s of userSections) {
        merged += `## ${s.title}\n\n${s.body}\n\n`;
      }
    }
    await writeFile(mdPath, merged.trimEnd() + '\n', 'utf-8');
  } else if (!existsSync(mdPath)) {
    // No Moltbook, no existing file — write empty template
    await writeFile(mdPath, [
      '# HEARTBEAT.md',
      '',
      '# Keep this file empty (or with only comments) to skip heartbeat API calls.',
      '# Add tasks below when you want the agent to check something periodically.',
    ].join('\n') + '\n', 'utf-8');
  } else if (userSections.length > 0) {
    // Moltbook disabled but user sections exist — strip Moltbook sections, keep user's
    const existing = await readFile(mdPath, 'utf-8');
    const parsed = parseHeartbeatSections(existing);
    const hasMoltbook = parsed.sections.some(s => isMoltbookSection(s.title, s.body));
    if (hasMoltbook) {
      let cleaned = '# HEARTBEAT.md\n\n';
      for (const s of userSections) {
        cleaned += `## ${s.title}\n\n${s.body}\n\n`;
      }
      await writeFile(mdPath, cleaned.trimEnd() + '\n', 'utf-8');
    }
    // else: no moltbook sections to strip, leave file as-is
  }
}

/** Write workspace files — always-update set is refreshed on every sync */
async function writeWorkspaceFiles(
  workspacePath: string,
  characterName: string,
  systemPrompt: string,
  memory: SyncMemory | null,
  moltbook?: MoltbookSync | null,
  openclawSkills?: OpenClawSkillSync | null,
  actionComfort?: ActionComfort,
) {
  await mkdir(workspacePath, { recursive: true });

  const alwaysUpdate = new Set(['SOUL.md', 'IDENTITY.md', 'USER.md', 'MEMORY.md', 'AGENTS.md']);
  const files = generateWorkspaceFiles(characterName, systemPrompt, memory, moltbook, openclawSkills, workspacePath, actionComfort);

  for (const [filename, content] of Object.entries(files)) {
    const filePath = join(workspacePath, filename);
    if (alwaysUpdate.has(filename) || !existsSync(filePath)) {
      await writeFile(filePath, content, 'utf-8');
    }
  }

  // Merge HEARTBEAT.md — update Moltbook sections but preserve user-added sections
  await mergeHeartbeatFile(workspacePath, moltbook);

  // Install Moltbook skill files + credentials when auto-posting is enabled
  if (moltbook?.autoPostEnabled && moltbook.apiKey) {
    await installMoltbookSkill(workspacePath, moltbook);
  }

  // Clean up stale MOLTBOOK.md (replaced by skills/moltbook/SKILL.md + HEARTBEAT.md)
  const staleMoltbookMd = join(workspacePath, 'MOLTBOOK.md');
  if (existsSync(staleMoltbookMd)) {
    try { await unlink(staleMoltbookMd); } catch { /* non-fatal */ }
  }

  // Install OpenClaw skills (email + community skills)
  if (openclawSkills) {
    await installOpenClawSkills(workspacePath, openclawSkills);
  }
}

/** Generate email SKILL.md based on the configured provider */
function generateEmailSkillMd(email: NonNullable<OpenClawSkillSync['email']>): string {
  const providerDesc = email.provider === 'system-mail' ? 'System Mail App (osascript)'
    : (email.provider as string) === 'google-gog' ? 'Google Gmail (gog)'
    : email.provider === 'resend' ? 'Resend API'
    : 'Custom SMTP';
  const lines: string[] = [
    '---',
    'name: email',
    `description: Send emails via ${providerDesc}`,
    '---',
    '',
    '# Email Skill',
    '',
    'Use this skill when the user asks you to send an email.',
    '',
  ];

  if (email.provider === 'system-mail') {
    lines.push(
      '## Method: System Mail App (headless via osascript)',
      '',
      'Send emails headlessly using Mail.app on macOS. The email is composed AND',
      'sent automatically — no windows will open on screen.',
      '',
      '⚠️ **NEVER use `open "mailto:..."` — that only opens a draft window and does NOT send.**',
      '⚠️ **Always use the osascript method below to actually send the email.**',
      '',
      '```',
      'osascript -e \'',
      'tell application "Mail"',
      '  set newMessage to make new outgoing message with properties {subject:"SUBJECT", content:"BODY", visible:false}',
      '  tell newMessage',
      '    make new to recipient at end of to recipients with properties {address:"TO_EMAIL"}',
      '  end tell',
      '  send newMessage',
      'end tell',
      '\'',
      '```',
      '',
      '### Important',
      '',
      '- Always confirm the recipient, subject, and body with the user before sending',
      '- Mail.app must be configured with an email account',
      '- The `visible:false` flag keeps it headless — no compose window appears',
      '- Replace SUBJECT, BODY, and TO_EMAIL with actual values (escape single quotes)',
    );
  } else if ((email.provider as string) === 'google-gog') {
    lines.push(
      '## Method: Google Gmail via gog (OpenClaw built-in)',
      '',
      'Send emails using the `gog` CLI tool (Google Suite integration).',
      'gog handles OAuth authentication — no API keys needed.',
      '',
      '⚠️ **The user must have linked their Google account first via `gog auth login`.**',
      '',
      '### Check auth status',
      '```',
      'gog auth list',
      '```',
      '',
      '### Send an email',
      '```',
      'gog gmail send --to "RECIPIENT_EMAIL" --subject "SUBJECT" --body "BODY"',
      '```',
      '',
      '### Important',
      '',
      '- Always confirm the recipient, subject, and body with the user before sending',
      '- If `gog auth list` shows no accounts, tell the user to run `gog auth login`',
      '- For HTML emails, use `--html` flag instead of `--body`',
      '- gog also supports: `gog gmail search`, `gog gmail read`, `gog calendar`, `gog drive`',
    );
  } else if (email.provider === 'resend') {
    const apiKey = email.resendApiKey || 'YOUR_RESEND_API_KEY';
    const from = email.fromAddress || 'onboarding@resend.dev';
    lines.push(
      '## Method: Resend API',
      '',
      'Send emails via the Resend API using curl.',
      '',
      '```',
      `curl -s -X POST "https://api.resend.com/emails" \\`,
      `  -H "Authorization: Bearer ${apiKey}" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '{`,
      `    "from": "${from}",`,
      `    "to": ["RECIPIENT_EMAIL"],`,
      `    "subject": "SUBJECT",`,
      `    "text": "BODY"`,
      `  }'`,
      '```',
      '',
      '### Important',
      '',
      '- Always confirm the recipient, subject, and body with the user before sending',
      '- The API key is pre-configured — do not expose it in conversations',
      '- For HTML emails, use the "html" field instead of "text"',
      `- From address: ${from}`,
    );
  } else if (email.provider === 'smtp') {
    const host = email.smtpHost || 'smtp.gmail.com';
    const port = email.smtpPort || 587;
    const user = email.smtpUser || 'USER';
    const pass = email.smtpPass || 'PASS';
    const from = email.fromAddress || user;
    const tls = email.smtpTls !== false ? '--tls' : '';
    lines.push(
      '## Method: Custom SMTP',
      '',
      'Send emails via SMTP using curl.',
      '',
      '```',
      `curl -s --url "smtp://${host}:${port}" \\`,
      `  ${tls ? tls + ' \\' : ''}`,
      `  --mail-from "${from}" \\`,
      `  --mail-rcpt "RECIPIENT_EMAIL" \\`,
      `  --user "${user}:${pass}" \\`,
      `  -T - <<EOF`,
      `From: ${from}`,
      `To: RECIPIENT_EMAIL`,
      `Subject: SUBJECT`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      `BODY`,
      `EOF`,
      '```',
      '',
      '### Important',
      '',
      '- Always confirm the recipient, subject, and body with the user before sending',
      '- SMTP credentials are pre-configured — do not expose them in conversations',
      `- From address: ${from}`,
    );
  }

  return lines.join('\n');
}

/** Clone a full GitHub repo into the skill directory */
async function cloneGitHubRepo(repoUrl: string, targetDir: string): Promise<boolean> {
  try {
    // Remove existing dir to get a clean clone
    if (existsSync(targetDir)) {
      await rm(targetDir, { recursive: true, force: true });
    }
    execSync(`git clone --depth 1 ${repoUrl} ${targetDir}`, {
      timeout: 30_000,
      stdio: 'pipe',
    });
    // Remove .git dir to save space
    const dotGit = join(targetDir, '.git');
    if (existsSync(dotGit)) {
      await rm(dotGit, { recursive: true, force: true });
    }
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[OpenClaw Sync] git clone failed for ${repoUrl}: ${msg}`);
    // Clean up empty directory left by failed clone
    if (existsSync(targetDir)) {
      try { await rm(targetDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    return false;
  }
}

/** Extract monorepo skill path from a skillMdUrl like https://raw.githubusercontent.com/openclaw/skills/main/skills/author/slug/SKILL.md */
function extractMonorepoPath(skillMdUrl: string): { owner: string; repo: string; branch: string; skillPath: string } | null {
  const match = skillMdUrl.match(/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)\/SKILL\.md$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], branch: match[3], skillPath: match[4] };
}

/** Download all files from a skill directory in the openclaw/skills monorepo */
async function downloadMonorepoSkillDirectory(skillMdUrl: string, targetDir: string): Promise<boolean> {
  const parsed = extractMonorepoPath(skillMdUrl);
  if (!parsed) return false;

  const { owner, repo, branch: _branch, skillPath } = parsed;
  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${skillPath}`;

  async function downloadDir(apiUrl: string, localDir: string): Promise<void> {
    const res = await fetch(apiUrl, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'withami-skill-sync' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn(`[OpenClaw Sync] GitHub Contents API returned ${res.status} for ${apiUrl}`);
      return;
    }

    const entries = await res.json() as Array<{ name: string; type: string; download_url: string | null; url: string }>;
    if (!Array.isArray(entries)) return;

    await mkdir(localDir, { recursive: true });

    for (const entry of entries) {
      if (entry.type === 'file' && entry.download_url) {
        const fileRes = await fetch(entry.download_url, { signal: AbortSignal.timeout(10_000) });
        if (fileRes.ok) {
          const content = await fileRes.text();
          await writeFile(join(localDir, entry.name), content, 'utf-8');
        }
      } else if (entry.type === 'dir') {
        await downloadDir(entry.url, join(localDir, entry.name));
      }
    }
  }

  try {
    await mkdir(targetDir, { recursive: true });
    await downloadDir(contentsUrl, targetDir);
    const hasSkillMd = existsSync(join(targetDir, 'SKILL.md'));
    console.log(`[OpenClaw Sync] Downloaded monorepo skill directory ${skillPath} (SKILL.md: ${hasSkillMd})`);
    return hasSkillMd;
  } catch (err) {
    console.error(`[OpenClaw Sync] Monorepo directory download failed for ${skillPath}:`, err);
    return false;
  }
}

/** Download just SKILL.md from a GitHub repo URL as a fallback */
async function downloadSkillMdFallback(repoUrl: string, targetDir: string): Promise<boolean> {
  try {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return false;
    const [, owner, repo] = match;
    await mkdir(targetDir, { recursive: true });
    for (const branch of ['main', 'master']) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/SKILL.md`;
      const res = await fetch(rawUrl, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        const content = await res.text();
        await writeFile(join(targetDir, 'SKILL.md'), content, 'utf-8');
        console.log(`[OpenClaw Sync] SKILL.md fallback succeeded for ${owner}/${repo} (${branch})`);
        return true;
      }
    }
    console.warn(`[OpenClaw Sync] No SKILL.md found on main or master for ${owner}/${repo}`);
    return false;
  } catch (err) {
    console.error(`[OpenClaw Sync] SKILL.md fallback failed for ${repoUrl}:`, err);
    return false;
  }
}

/** Generate Apple Notes SKILL.md (macOS built-in, always installed).
 *  IMPORTANT: The gateway auto-injects only ~410 chars from the SKILL.md
 *  into the agent context. The critical HTML body instruction MUST be
 *  within those first chars or the agent won't know to use HTML. */
function generateAppleNotesSkillMd(): string {
  return [
    '---',
    'name: apple-notes',
    'description: Create notes in Apple Notes. name=title (bold heading), body=RAW HTML content. NEVER repeat title in body. NEVER escape HTML.',
    '---',
    '',
    'CRITICAL: name property renders as large bold title. Do NOT repeat it in body.',
    'body is HTML. Plain text newlines are IGNORED.',
    'Use RAW HTML — NEVER escape as &lt; or &gt;. Write literal < and >.',
    'Tags: <ol><li> numbered, <ul><li> bullets, <div> paragraphs, <br> break, <b> bold.',
    'Use heredoc syntax.',
    '',
    'Template — "5 reasons dogs are great":',
    '```',
    'osascript <<\'APPLESCRIPT\'',
    'tell application "Notes"',
    '  tell folder "Notes"',
    '    make new note with properties {name:"5 Reasons Dogs Are Great", body:"<ol><li>Loyal companions</li><li>Always happy to see you</li><li>Great exercise partners</li><li>Unconditional love</li><li>Best cuddle buddies</li></ol>"}',
    '  end tell',
    'end tell',
    'APPLESCRIPT',
    '```',
    '',
    'body starts DIRECTLY with content (<ol>, <ul>, <div>), NOT with the title again.',
    '',
    'More examples:',
    'body:"<ol><li>Apples</li><li>Bananas</li></ol>" — numbered list',
    'body:"<ul><li>Milk</li><li>Eggs</li></ul>" — bullets',
    'body:"<div><b>Section</b></div><ul><li>Item</li></ul>" — bold sub-heading + list',
    '',
    'Rules:',
    '- ALWAYS heredoc, NEVER osascript -e',
    '- name = plain text title (renders as heading)',
    '- body = RAW HTML content only, never the title',
    '- NEVER use &lt; &gt; or entity encoding',
    '- Keep HTML on ONE line inside body quotes',
  ].join('\n');
}

/** Install OpenClaw skills: email, apple-notes, + community skills from GitHub */
async function installOpenClawSkills(
  workspacePath: string,
  openClawSkills: OpenClawSkillSync,
): Promise<void> {
  // 1. Email skill
  if (openClawSkills.email) {
    const emailSkillDir = join(workspacePath, 'skills', 'email');
    await mkdir(emailSkillDir, { recursive: true });
    const skillMd = generateEmailSkillMd(openClawSkills.email);
    await writeFile(join(emailSkillDir, 'SKILL.md'), skillMd, 'utf-8');
  }

  // 2. Apple Notes skill (macOS built-in — always installed)
  if (process.platform === 'darwin') {
    const notesSkillDir = join(workspacePath, 'skills', 'apple-notes');
    await mkdir(notesSkillDir, { recursive: true });
    await writeFile(join(notesSkillDir, 'SKILL.md'), generateAppleNotesSkillMd(), 'utf-8');
  }

  // 2. Community skills from GitHub (skip if already installed at add-time)
  if (openClawSkills.installedSkills?.length) {
    for (const skill of openClawSkills.installedSkills) {
      try {
        const skillDir = join(workspacePath, 'skills', skill.slug);

        // Skip if SKILL.md already present (downloaded at install time)
        if (existsSync(join(skillDir, 'SKILL.md'))) {
          continue;
        }

        // Full repo clone for GitHub repo-based skills
        if (skill.githubRepoUrl) {
          console.log(`[OpenClaw Sync] Installing repo skill: ${skill.slug} from ${skill.githubRepoUrl}`);
          const cloned = await cloneGitHubRepo(skill.githubRepoUrl, skillDir);
          if (!cloned) {
            await downloadSkillMdFallback(skill.githubRepoUrl, skillDir);
          }
        } else if (skill.skillMdUrl) {
          // Community monorepo skill — download full directory (scripts, references, etc.)
          console.log(`[OpenClaw Sync] Installing community skill: ${skill.slug}`);
          const downloaded = await downloadMonorepoSkillDirectory(skill.skillMdUrl, skillDir);
          if (!downloaded) {
            // Fallback: download just SKILL.md
            console.warn(`[OpenClaw Sync] Full directory download failed for ${skill.slug}, trying SKILL.md only`);
            await mkdir(skillDir, { recursive: true });
            const res = await fetch(skill.skillMdUrl, { signal: AbortSignal.timeout(10_000) });
            if (res.ok) {
              await writeFile(join(skillDir, 'SKILL.md'), await res.text(), 'utf-8');
            }
          }
        } else if (skill.githubUrl) {
          // Catalog skill — download SKILL.md from catalog URL
          await mkdir(skillDir, { recursive: true });
          const rawUrl = skill.githubUrl
            .replace('github.com', 'raw.githubusercontent.com')
            .replace('/tree/', '/');
          console.log(`[OpenClaw Sync] Downloading catalog SKILL.md for ${skill.slug}`);
          const res = await fetch(rawUrl, { signal: AbortSignal.timeout(10_000) });
          if (res.ok) {
            await writeFile(join(skillDir, 'SKILL.md'), await res.text(), 'utf-8');
          } else {
            console.warn(`[OpenClaw Sync] Catalog SKILL.md download failed (${res.status}) for ${skill.slug}`);
          }
        } else {
          console.warn(`[OpenClaw Sync] No URL available for skill ${skill.slug} — skipping`);
        }

        // Write config if present
        if (skill.config && Object.keys(skill.config).length > 0) {
          await writeFile(
            join(skillDir, 'config.json'),
            JSON.stringify(skill.config, null, 2),
            'utf-8',
          );
        }
      } catch {
        // Non-fatal — individual skill install failure shouldn't block sync
      }
    }
  }
}

/** Read moltbook-verified-posts.txt from workspace and save new post IDs to our DB */
async function harvestMoltbookPostIds(workspacePath: string, userId: string, characterId: string): Promise<void> {
  const postsFile = join(workspacePath, 'moltbook-verified-posts.txt');
  if (!existsSync(postsFile)) return;

  const raw = await readFile(postsFile, 'utf-8');
  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const postIds = [...new Set(raw.match(UUID_RE) || [])];
  if (postIds.length === 0) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.PRIVATE_SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return;

  const supabase = createClient(supabaseUrl, serviceKey);

  // Fetch the actual post timestamp from Moltbook API using the most recent post ID
  // so last_posted_at reflects when the post was actually created, not when we harvested it.
  let lastPostedAt = new Date().toISOString();
  try {
    const { data: configRow } = await supabase
      .from('moltbook_configs')
      .select('api_key, moltbook_username')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .maybeSingle();
    if (configRow?.api_key) {
      const newestId = postIds[postIds.length - 1];
      const postRes = await fetch(
        `https://www.moltbook.com/api/v1/posts/${newestId}`,
        { headers: { Authorization: `Bearer ${configRow.api_key}` }, signal: AbortSignal.timeout(5_000) }
      );
      if (postRes.ok) {
        const postData = await postRes.json();
        const post = postData.post ?? postData;
        const ts = post.created_at ?? post.createdAt ?? post.timestamp;
        if (ts) lastPostedAt = new Date(ts).toISOString();
      }
    }
  } catch {
    // Non-fatal — fall back to now
  }

  const rows = postIds.map(id => ({
    user_id: userId,
    character_id: characterId,
    moltbook_post_id: id,
  }));

  await Promise.all([
    supabase
      .from('moltbook_posts')
      .upsert(rows, { onConflict: 'moltbook_post_id' }),
    supabase
      .from('moltbook_configs')
      .update({ last_posted_at: lastPostedAt })
      .eq('user_id', userId)
      .eq('character_id', characterId),
  ]);
}

export async function POST(request: NextRequest) {
  try {
    const { gatewayUrl, token: userToken, characterName, systemPrompt, memory, llmProvider, customLlm, characterId, userId, openclawSkills, actionComfort } = await request.json();
    const token = await getGatewayAuthToken(userToken);

    if (!gatewayUrl || !token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing gateway URL or token' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!characterName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Character name is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const fullPrompt = systemPrompt || `You are ${characterName}. Respond in character.`;

    // Fetch Moltbook config from DB before sync (needed for heartbeat config in gateway)
    let moltbook: MoltbookSync | null = null;
    if (characterId && userId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.PRIVATE_SUPABASE_SERVICE_KEY;
      if (supabaseUrl && serviceKey) {
        const supabase = createClient(supabaseUrl, serviceKey);
        const { data: mc } = await supabase
          .from('moltbook_configs')
          .select('api_key, moltbook_username, auto_post_enabled, post_frequency, default_submolt, claim_status, post_topics, post_tone, post_style')
          .eq('user_id', userId)
          .eq('character_id', characterId)
          .maybeSingle();
        if (mc?.claim_status === 'claimed' && mc.api_key) {
          moltbook = {
            apiKey: mc.api_key,
            moltbookUsername: mc.moltbook_username,
            autoPostEnabled: mc.auto_post_enabled,
            postFrequency: mc.post_frequency,
            defaultSubmolt: mc.default_submolt || 'general',
            characterId,
            postTopics: mc.post_topics || [],
            postTone: mc.post_tone || 'authentic',
            postStyle: mc.post_style || 'varied',
          };
        }
      }
    }

    const syncParams = {
      gatewayUrl,
      token,
      characterName,
      systemPrompt: fullPrompt,
      characterId: characterId || undefined,
      llmProvider: llmProvider || undefined,
      customLlm: customLlm || undefined,
      moltbookAutoPost: !!moltbook?.autoPostEnabled,
    };

    let result = await syncCharacterIdentity(syncParams);

    // Auto-recover stopped gateway and retry once
    if (!result.success && result.error && /ECONNREFUSED|ECONNRESET|ETIMEDOUT/i.test(result.error)) {
      const health = await checkAndRecoverGateway();
      if (health.recovered) {
        result = await syncCharacterIdentity(syncParams);
        if (result.success) {
          (result as Record<string, unknown>).recovered = true;
          (result as Record<string, unknown>).recoveryAction = health.recoveryAction;
        }
      }
      if (!result.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Gateway is not running. Auto-restart was attempted but failed — try running: openclaw gateway restart',
            gatewayDown: true,
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Write workspace files after successful config sync
    if (result.success && result.workspacePath) {
      try {
        await writeWorkspaceFiles(result.workspacePath, characterName, fullPrompt, memory || null, moltbook, openclawSkills || null, actionComfort as ActionComfort | undefined);
      } catch (fsError) {
        // Non-fatal: config synced but workspace files failed
        const fsMsg = fsError instanceof Error ? fsError.message : 'Unknown fs error';
        return new Response(
          JSON.stringify({ ...result, warning: `Config synced but workspace files failed: ${fsMsg}` }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Harvest verified Moltbook post IDs from workspace and save to DB
      if (moltbook && characterId && userId) {
        try {
          await harvestMoltbookPostIds(result.workspacePath, userId, characterId);
        } catch {
          // Non-fatal — post ID harvesting failure shouldn't block sync
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
