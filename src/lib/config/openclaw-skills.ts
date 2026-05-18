/**
 * Curated skill catalog from awesome-openclaw-skills
 * https://github.com/VoltAgent/awesome-openclaw-skills
 *
 * Each skill maps to a SKILL.md in the openclaw/skills repo.
 * Skills are installed by copying to ~/.openclaw/skills/ or <workspace>/skills/
 */

import type { OpenClawSkill } from '@/lib/types/openclaw-skills';

const SKILLS_BASE = 'https://github.com/openclaw/skills/tree/main/skills';

/** Shared configFields for skills that delegate image generation to baoyu-image-gen */
const IMAGE_GEN_CONFIG_FIELDS = [
  {
    key: 'OPENAI_API_KEY',
    label: 'OpenAI API Key',
    type: 'password' as const,
    placeholder: 'sk-...',
    writeToEnv: 'OPENAI_API_KEY',
    helpUrl: 'https://platform.openai.com/api-keys',
    helpText: 'Get from platform.openai.com/api-keys',
  },
  {
    key: 'GOOGLE_API_KEY',
    label: 'Google API Key',
    type: 'password' as const,
    placeholder: 'AIza...',
    writeToEnv: 'GOOGLE_API_KEY',
    helpUrl: 'https://aistudio.google.com/app/apikey',
    helpText: 'Get from aistudio.google.com',
  },
];

export const OPENCLAW_SKILL_CATALOG: OpenClawSkill[] = [
  // ── Social / Browser Automation ───────────────────────────────────
  {
    slug: 'baoyu-post-to-x',
    name: 'Post to X (Twitter)',
    description: 'Post text, images, videos, and long-form articles to X via real Chrome (bypasses anti-bot detection).',
    triggerDescription: 'Use when asked to post a tweet, share content on X, publish to Twitter, or schedule a social media post. Trigger on: "post this to X", "tweet that", "share on Twitter", "publish to my feed".',
    gotchas: [
      'Chrome must stay open and logged in to X.com — closing Chrome pauses posting.',
      'Run "Login to X" from the edit panel before your first post. Skipping this causes all posts to fail silently.',
      'Chrome Profile Path is optional — only set it if you have multiple Chrome profiles and need a specific one.',
    ],
    category: 'browser-automation',
    githubUrl: 'https://github.com/baoyu/post-to-x',
    icon: '𝕏',
    editFields: [
      {
        key: 'chromeProfile',
        label: 'Chrome Profile Path',
        description: 'Custom Chrome profile directory. Leave blank to use the default X profile.',
        type: 'text',
        placeholder: '~/.local/share/x-browser-profile',
      },
    ],
    actionButtons: [
      {
        label: 'Login to X',
        description: 'Opens Chrome so you can log into X once. Required before posting works.',
        args: ['--login'],
        icon: '🔑',
      },
    ],
  },

  // ── Baoyu AI Generation Skills ────────────────────────────────────
  {
    slug: 'baoyu-image-gen',
    name: 'AI Image Generator',
    description: 'Generate images with OpenAI (gpt-image-1), Google (Gemini), or DashScope. Supports text-to-image, reference images, and aspect ratios.',
    triggerDescription: 'Use when asked to generate, create, or make an image, illustration, photo, or visual. Trigger on: "generate an image of...", "make a picture of...", "create a visual for...", "draw...".',
    gotchas: [
      'You only need ONE provider API key — either OpenAI or Google, not both.',
      'Leave model fields blank to use the default. Only fill them in if you need a specific model version.',
    ],
    setupSteps: [
      { title: 'Choose your image provider', fields: ['OPENAI_API_KEY', 'GOOGLE_API_KEY'] },
      { title: 'Model overrides (optional)', fields: ['OPENAI_IMAGE_MODEL', 'GOOGLE_IMAGE_MODEL'] },
    ],
    category: 'image-video',
    githubUrl: 'https://github.com/JimLiu/baoyu-skills',
    icon: '🎨',
    requiresConfig: true,
    configFields: [
      {
        key: 'OPENAI_API_KEY',
        label: 'OpenAI API Key',
        type: 'password',
        placeholder: 'sk-...',
        writeToEnv: 'OPENAI_API_KEY',
        helpUrl: 'https://platform.openai.com/api-keys',
        helpText: 'Get from platform.openai.com/api-keys',
      },
      {
        key: 'OPENAI_IMAGE_MODEL',
        label: 'OpenAI Image Model',
        type: 'text',
        placeholder: 'gpt-image-1',
        writeToEnv: 'OPENAI_IMAGE_MODEL',
      },
      {
        key: 'GOOGLE_API_KEY',
        label: 'Google API Key',
        type: 'password',
        placeholder: 'AIza...',
        writeToEnv: 'GOOGLE_API_KEY',
        helpUrl: 'https://aistudio.google.com/app/apikey',
        helpText: 'Get from aistudio.google.com',
      },
      {
        key: 'GOOGLE_IMAGE_MODEL',
        label: 'Google Image Model',
        type: 'text',
        placeholder: 'gemini-2.0-flash-preview-image-generation',
        writeToEnv: 'GOOGLE_IMAGE_MODEL',
      },
    ],
  },
  {
    slug: 'baoyu-danger-gemini-web',
    name: 'Gemini Web (Browser)',
    description: 'Interacts with Gemini Web via Chrome CDP to generate text and images without an API key.',
    category: 'ai-llms',
    githubUrl: 'https://github.com/JimLiu/baoyu-skills',
    icon: '♊',
    actionButtons: [
      {
        label: 'Login to Gemini',
        description: 'Opens Chrome to gemini.google.com so you can log in once.',
        args: ['--login'],
        icon: '🔑',
      },
    ],
  },

  // ── Baoyu Content Skills ───────────────────────────────────────────
  {
    slug: 'baoyu-infographic',
    name: 'Infographic Generator',
    description: 'Generate professional infographics with 20 layout types and 17 visual styles from any content or file.',
    category: 'image-video',
    githubUrl: 'https://github.com/JimLiu/baoyu-skills',
    icon: '📊',
    requiresConfig: true,
    configFields: IMAGE_GEN_CONFIG_FIELDS,
  },
  {
    slug: 'baoyu-cover-image',
    name: 'Article Cover Image',
    description: 'Generate cover images for articles with 5 dimensions: Type × Palette × Rendering × Text × Mood.',
    category: 'image-video',
    githubUrl: 'https://github.com/JimLiu/baoyu-skills',
    icon: '🖼️',
    requiresConfig: true,
    configFields: IMAGE_GEN_CONFIG_FIELDS,
  },
  {
    slug: 'baoyu-comic',
    name: 'Knowledge Comic Creator',
    description: 'Create educational comics from any content with flexible art style and tone combinations.',
    category: 'image-video',
    githubUrl: 'https://github.com/JimLiu/baoyu-skills',
    icon: '🎭',
    requiresConfig: true,
    configFields: IMAGE_GEN_CONFIG_FIELDS,
  },
  {
    slug: 'baoyu-slide-deck',
    name: 'Slide Deck Generator',
    description: 'Generate professional slide decks from content. Outputs individual slide images merged into .pptx and .pdf.',
    category: 'productivity',
    githubUrl: 'https://github.com/JimLiu/baoyu-skills',
    icon: '📽️',
    requiresConfig: true,
    configFields: IMAGE_GEN_CONFIG_FIELDS,
  },
  {
    slug: 'baoyu-xhs-images',
    name: 'XHS Infographic Series',
    description: 'Generate Xiaohongshu (RedNote) cartoon-style infographic series with Style × Layout system.',
    category: 'image-video',
    githubUrl: 'https://github.com/JimLiu/baoyu-skills',
    icon: '📱',
    requiresConfig: true,
    configFields: IMAGE_GEN_CONFIG_FIELDS,
  },
  {
    slug: 'baoyu-article-illustrator',
    name: 'Article Illustrator',
    description: 'Analyze article structure and generate smart illustrations at the right positions with Type × Style approach.',
    category: 'image-video',
    githubUrl: 'https://github.com/JimLiu/baoyu-skills',
    icon: '✏️',
    requiresConfig: true,
    configFields: IMAGE_GEN_CONFIG_FIELDS,
  },
  {
    slug: 'baoyu-post-to-wechat',
    name: 'Post to WeChat',
    description: 'Post to WeChat Official Account — image-text posts or full markdown articles with rich formatting.',
    category: 'browser-automation',
    githubUrl: 'https://github.com/JimLiu/baoyu-skills',
    icon: '💬',
    configFields: [
      {
        key: 'WECHAT_APP_ID',
        label: 'WeChat App ID',
        type: 'text',
        placeholder: 'wx...',
        writeToEnv: 'WECHAT_APP_ID',
        helpUrl: 'https://developers.weixin.qq.com/platform/',
        helpText: 'From WeChat Official Account platform → Dev keys',
      },
      {
        key: 'WECHAT_APP_SECRET',
        label: 'WeChat App Secret',
        type: 'password',
        writeToEnv: 'WECHAT_APP_SECRET',
      },
    ],
    actionButtons: [
      {
        label: 'Login to WeChat',
        description: 'Opens Chrome for QR code login (no API setup needed).',
        args: ['--login'],
        icon: '🔑',
      },
    ],
  },

  // ── Baoyu Utility Skills ───────────────────────────────────────────
  {
    slug: 'baoyu-url-to-markdown',
    name: 'URL to Markdown',
    description: 'Fetch any URL via Chrome CDP and convert to clean markdown. Supports login-required pages with --wait mode.',
    category: 'browser-automation',
    githubUrl: 'https://github.com/JimLiu/baoyu-skills',
    icon: '🔗',
  },
  {
    slug: 'baoyu-danger-x-to-markdown',
    name: 'X/Twitter to Markdown',
    description: 'Convert X (Twitter) tweets, threads, and X Articles to clean markdown format.',
    category: 'browser-automation',
    githubUrl: 'https://github.com/JimLiu/baoyu-skills',
    icon: '📄',
  },
  {
    slug: 'baoyu-format-markdown',
    name: 'Format Markdown',
    description: 'Format plain text or markdown files with proper frontmatter, headings, bold, lists, and code blocks.',
    category: 'productivity',
    githubUrl: 'https://github.com/JimLiu/baoyu-skills',
    icon: '📝',
  },
  {
    slug: 'baoyu-compress-image',
    name: 'Compress Image',
    description: 'Compress images to reduce file size while maintaining quality.',
    category: 'image-video',
    githubUrl: 'https://github.com/JimLiu/baoyu-skills',
    icon: '🗜️',
  },
  {
    slug: 'baoyu-markdown-to-html',
    name: 'Markdown to HTML',
    description: 'Convert markdown files to HTML with proper formatting and styling.',
    category: 'productivity',
    githubUrl: 'https://github.com/JimLiu/baoyu-skills',
    icon: '🌐',
  },

  // ── Communication ─────────────────────────────────────────────────
  {
    slug: 'email-send',
    name: 'Email Send (SMTP)',
    description: 'Send emails via SMTP using msmtp without opening a full mail client.',
    category: 'communication',
    githubUrl: `${SKILLS_BASE}/xejrax/email-send/SKILL.md`,
    icon: '📧',
    requiresConfig: true,
    configFields: [
      { key: 'smtpHost', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com', required: true },
      { key: 'smtpUser', label: 'SMTP User', type: 'text', placeholder: 'you@example.com', required: true },
      { key: 'smtpPass', label: 'SMTP Password', type: 'password', required: true },
    ],
  },
  {
    slug: 'custom-smtp-sender',
    name: 'Custom SMTP Sender',
    description: 'Send emails with markdown, HTML, and attachment support via any SMTP server.',
    category: 'communication',
    githubUrl: `${SKILLS_BASE}/scccmsd/custom-smtp-sender/SKILL.md`,
    icon: '✉️',
    requiresConfig: true,
    configFields: [
      { key: 'smtpHost', label: 'SMTP Host', type: 'text', placeholder: 'smtp.example.com', required: true },
      { key: 'smtpPort', label: 'SMTP Port', type: 'number', placeholder: '587' },
      { key: 'smtpUser', label: 'Username', type: 'text', required: true },
      { key: 'smtpPass', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    slug: 'gmail-client',
    name: 'Gmail Client',
    description: 'Read and send emails via Gmail.',
    category: 'communication',
    githubUrl: `${SKILLS_BASE}/pierremenard/gmail-client/SKILL.md`,
    icon: '📨',
    requiresConfig: true,
    configFields: [
      { key: 'gmailToken', label: 'Gmail OAuth Token', type: 'password', required: true },
    ],
  },
  {
    slug: 'mailgun',
    name: 'Mailgun',
    description: 'Send emails via Mailgun API.',
    category: 'communication',
    githubUrl: `${SKILLS_BASE}/alphafactor/mailgun/SKILL.md`,
    icon: '📬',
    requiresConfig: true,
    configFields: [
      { key: 'mailgunApiKey', label: 'Mailgun API Key', type: 'password', required: true },
      { key: 'mailgunDomain', label: 'Mailgun Domain', type: 'text', placeholder: 'mg.yourdomain.com', required: true },
    ],
  },
  {
    slug: 'imsg',
    name: 'iMessage / SMS',
    description: 'List chats, view history, watch for new messages, and send iMessages or SMS.',
    triggerDescription: 'Use when asked to send an iMessage or SMS, check messages, read a text, or message someone via iMessage. Trigger on: "text ...", "send an iMessage to ...", "check my messages", "read my texts".',
    gotchas: [
      'macOS only — requires Full Disk Access permission for Terminal in System Settings → Privacy.',
      'iMessages use Apple ID. SMS requires a paired iPhone nearby via Continuity.',
      "Sending fails silently if the recipient's Apple ID is not registered — verify the contact exists in Messages.app first.",
    ],
    category: 'communication',
    githubUrl: `${SKILLS_BASE}/steipete/imsg/SKILL.md`,
    icon: '💬',
  },
  {
    slug: 'wacli',
    name: 'WhatsApp CLI',
    description: 'Send WhatsApp messages or search/sync WhatsApp history.',
    triggerDescription: 'Use when asked to send a WhatsApp message, check WhatsApp, or read/search WhatsApp conversations. Trigger on: "WhatsApp ...", "send a WhatsApp to ...", "check my WhatsApp".',
    gotchas: [
      'Requires your phone and laptop on the same WiFi network. Cellular-only phones disconnect frequently.',
      'WhatsApp must be running on your phone and the session must be active — if your phone is off, messages queue but may not deliver.',
      'First run requires a QR code scan from your phone — have your phone ready during setup.',
    ],
    category: 'communication',
    githubUrl: `${SKILLS_BASE}/steipete/wacli/SKILL.md`,
    icon: '📱',
  },
  {
    slug: 'telegram-bot',
    name: 'Telegram Bot',
    description: 'Build and manage Telegram bots via the Telegram Bot API.',
    triggerDescription: 'Use when asked to send a Telegram message, post to Telegram, or interact via the Telegram bot. Trigger on: "Telegram ...", "send via Telegram", "message me on Telegram".',
    gotchas: [
      'The bot can only message users who have started a chat with it first — share the bot link and have the recipient send /start.',
      'Bot tokens do not expire but can be revoked in @BotFather. If sending fails with 401, regenerate the token.',
    ],
    category: 'communication',
    githubUrl: `${SKILLS_BASE}/sebastian-buitrag0/telegram-bot/SKILL.md`,
    icon: '✈️',
    requiresConfig: true,
    configFields: [
      { key: 'telegramBotToken', label: 'Bot Token', type: 'password', required: true },
    ],
  },
  {
    slug: 'discord-voice',
    name: 'Discord Voice',
    description: 'Real-time voice conversations in Discord voice channels.',
    category: 'communication',
    githubUrl: `${SKILLS_BASE}/avatarneil/discord-voice/SKILL.md`,
    icon: '🎙️',
    requiresConfig: true,
    configFields: [
      { key: 'discordToken', label: 'Discord Bot Token', type: 'password', required: true },
    ],
  },
  {
    slug: 'signal-cli',
    name: 'Signal CLI',
    description: 'Send Signal messages and look up recipients via the local Signal CLI.',
    triggerDescription: 'Use when asked to send a Signal message, contact someone on Signal, or check Signal. Trigger on: "Signal ...", "send a Signal message to ...", "message via Signal".',
    gotchas: [
      'Requires signal-cli to be installed and registered with your phone number — run the registration flow once before using.',
      'Signal requires the recipient to also have Signal installed and an active account.',
    ],
    category: 'communication',
    githubUrl: `${SKILLS_BASE}/pseudobun/signal-cli/SKILL.md`,
    icon: '🔐',
  },

  // ── Apple Apps & Services ─────────────────────────────────────────
  {
    slug: 'apple-contacts',
    name: 'Apple Contacts',
    description: 'Look up contacts from macOS Contacts.app.',
    category: 'apple-apps',
    githubUrl: `${SKILLS_BASE}/tyler6204/apple-contacts/SKILL.md`,
    icon: '👤',
  },
  {
    slug: 'apple-music',
    name: 'Apple Music',
    description: 'Search Apple Music, add songs to library, manage playlists, control playback.',
    category: 'apple-apps',
    githubUrl: `${SKILLS_BASE}/tyler6204/apple-music/SKILL.md`,
    icon: '🎵',
  },
  {
    slug: 'apple-photos',
    name: 'Apple Photos',
    description: 'Apple Photos.app integration for macOS.',
    category: 'apple-apps',
    githubUrl: `${SKILLS_BASE}/tyler6204/apple-photos/SKILL.md`,
    icon: '📸',
  },
  {
    slug: 'apple-mail-search-safe',
    name: 'Apple Mail Search',
    description: 'Fast & safe Apple Mail search with body content on macOS.',
    category: 'apple-apps',
    githubUrl: `${SKILLS_BASE}/gumadeiras/apple-mail-search-safe/SKILL.md`,
    icon: '📧',
  },
  {
    slug: 'apple-remind-me',
    name: 'Apple Reminders',
    description: 'Natural language reminders that create actual Apple Reminders.',
    category: 'apple-apps',
    githubUrl: `${SKILLS_BASE}/plgonzalezrx8/apple-remind-me/SKILL.md`,
    icon: '⏰',
  },
  {
    slug: 'homekit',
    name: 'HomeKit',
    description: 'Control Apple HomeKit smart home devices.',
    category: 'apple-apps',
    githubUrl: `${SKILLS_BASE}/alphafactor/homekit/SKILL.md`,
    icon: '🏠',
  },
  {
    slug: 'findmy-location',
    name: 'Find My',
    description: "Track a shared contact's location via Apple Find My.",
    category: 'apple-apps',
    githubUrl: `${SKILLS_BASE}/poiley/findmy-location/SKILL.md`,
    icon: '📍',
  },
  {
    slug: 'mac-tts',
    name: 'Mac Text-to-Speech',
    description: 'Read text aloud using macOS built-in text-to-speech.',
    category: 'apple-apps',
    githubUrl: `${SKILLS_BASE}/kalijason/mac-tts/SKILL.md`,
    icon: '🔊',
  },

  // ── Browser & Automation ──────────────────────────────────────────
  {
    slug: 'browse',
    name: 'Browser Automation',
    description: 'Create and deploy browser automation functions.',
    category: 'browser-automation',
    githubUrl: `${SKILLS_BASE}/pkiv/browse/SKILL.md`,
    icon: '🌐',
  },

  // ── Productivity ──────────────────────────────────────────────────
  {
    slug: 'calendly',
    name: 'Calendly',
    description: 'Calendly scheduling integration.',
    category: 'productivity',
    githubUrl: `${SKILLS_BASE}/kesslerio/calendly/SKILL.md`,
    icon: '📅',
    requiresConfig: true,
    configFields: [
      { key: 'calendlyApiKey', label: 'Calendly API Key', type: 'password', required: true },
    ],
  },

  // ── Search & Research ─────────────────────────────────────────────
  {
    slug: 'cellcog',
    name: 'CellCog Deep Research',
    description: '#1 on DeepResearch Bench — advanced research capabilities.',
    category: 'search-research',
    githubUrl: `${SKILLS_BASE}/nitishgargiitd/cellcog/SKILL.md`,
    icon: '🔬',
  },

  // ── Media & Streaming ─────────────────────────────────────────────
  {
    slug: 'use-soulseek',
    name: 'Soulseek',
    description: 'Distributed, peer-to-peer file sharing platform.',
    category: 'media-streaming',
    githubUrl: `${SKILLS_BASE}/svidovich/use-soulseek/SKILL.md`,
    icon: '🎶',
  },

  // ── Notes & PKM ───────────────────────────────────────────────────
  {
    slug: 'drafts',
    name: 'Drafts App',
    description: 'Manage Drafts app notes via CLI on macOS.',
    category: 'notes-pkm',
    githubUrl: `${SKILLS_BASE}/nerveband/drafts/SKILL.md`,
    icon: '📝',
  },

  // ── Image & Video ─────────────────────────────────────────────────
  {
    slug: 'avatar-video-messages',
    name: 'Avatar Video Messages',
    description: 'Generate and send video messages with an AI avatar.',
    category: 'image-video',
    githubUrl: `${SKILLS_BASE}/thewulf7/avatar-video-messages/SKILL.md`,
    icon: '🎬',
  },

  // ── Finance ───────────────────────────────────────────────────────
  {
    slug: 'treeline-money',
    name: 'Treeline Money',
    description: 'Chat with your finances from Treeline Money.',
    category: 'finance',
    githubUrl: `${SKILLS_BASE}/zack-schrag/treeline-money/SKILL.md`,
    icon: '💰',
    requiresConfig: true,
    configFields: [
      { key: 'treelineApiKey', label: 'API Key', type: 'password', required: true },
    ],
  },

  // ── Health & Fitness ──────────────────────────────────────────────
  {
    slug: 'healthkit-sync',
    name: 'HealthKit Sync',
    description: 'iOS HealthKit data sync CLI commands and patterns.',
    category: 'health-fitness',
    githubUrl: `${SKILLS_BASE}/mneves75/healthkit-sync/SKILL.md`,
    icon: '❤️',
  },

  // ── Security ──────────────────────────────────────────────────────
  {
    slug: 'zero-trust',
    name: 'Zero Trust',
    description: 'Security-first behavioral guidelines for cautious agent operation.',
    category: 'security',
    githubUrl: `${SKILLS_BASE}/doonot/zero-trust/SKILL.md`,
    icon: '🛡️',
  },

  // ── Gaming ────────────────────────────────────────────────────────
  {
    slug: 'bot-bowl-party',
    name: 'Bot Bowl Party',
    description: 'Guide for AI agents to participate in BotBowl Party games.',
    category: 'gaming',
    githubUrl: `${SKILLS_BASE}/fsa317/bot-bowl-party/SKILL.md`,
    icon: '🎮',
  },
];

/** Get skills by category */
export function getSkillsByCategory(category: string): OpenClawSkill[] {
  return OPENCLAW_SKILL_CATALOG.filter(s => s.category === category);
}

/** Get a skill by slug */
export function getSkillBySlug(slug: string): OpenClawSkill | undefined {
  return OPENCLAW_SKILL_CATALOG.find(s => s.slug === slug);
}

/** All unique categories that have at least one skill */
export function getPopulatedCategories(): string[] {
  const cats = new Set(OPENCLAW_SKILL_CATALOG.map(s => s.category));
  return Array.from(cats);
}
