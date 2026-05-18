/**
 * OpenClaw Configuration Types
 *
 * Manages OpenClaw skill installation, email provider config,
 * and the curated skill catalog from awesome-openclaw-skills.
 */

/** Email provider mode for the agent */
export type EmailProvider = 'system-mail' | 'google-gog' | 'resend' | 'smtp';

/** Configuration for email sending */
export interface EmailConfig {
  provider: EmailProvider;
  /** Resend API key (stored locally only) */
  resendApiKey?: string;
  /** Default "from" address for API-based sending */
  fromAddress?: string;
  /** SMTP host for custom SMTP */
  smtpHost?: string;
  /** SMTP port */
  smtpPort?: number;
  /** SMTP username */
  smtpUser?: string;
  /** SMTP password (stored locally only) */
  smtpPass?: string;
  /** Use TLS for SMTP */
  smtpTls?: boolean;
}

/** A one-click action button shown in the skill edit panel (e.g. "Login to X") */
export interface SkillActionButton {
  /** Button label */
  label: string;
  /** Short description shown below the button */
  description?: string;
  /** CLI args to pass to the skill's script (e.g. ['--login']) */
  args: string[];
  /** Icon emoji */
  icon?: string;
}

/** A skill from the awesome-openclaw-skills catalog */
export interface OpenClawSkill {
  /** Unique slug (matches ClawHub slug) */
  slug: string;
  /** Display name */
  name: string;
  /** Short description shown in the UI to the user */
  description: string;
  /**
   * Model-facing trigger conditions injected into the agent's AGENTS.md.
   * Describes *when* to invoke this skill, not *what* it does.
   * If omitted, falls back to `description`.
   */
  triggerDescription?: string;
  /** Common setup pitfalls shown post-install as dismissable hints */
  gotchas?: string[];
  /** Slugs of skills this skill depends on — checked at install time */
  requires?: string[];
  /**
   * Step-by-step guided setup for skills with many configFields.
   * Each step shows a subset of fields. If omitted, all fields show at once.
   */
  setupSteps?: { title: string; fields: string[] }[];
  /** Category for grouping */
  category: SkillCategory;
  /** GitHub URL to SKILL.md */
  githubUrl: string;
  /** Whether this skill requires an API key or config */
  requiresConfig?: boolean;
  /** Config fields this skill needs (for UI rendering) */
  configFields?: SkillConfigField[];
  /** Icon emoji for the skill card */
  icon?: string;
  /** Post-install editable config fields (shown in the edit panel for installed skills) */
  editFields?: SkillEditField[];
  /** One-click action buttons shown in the edit panel (e.g. login flows, setup steps) */
  actionButtons?: SkillActionButton[];
}

/** Categories matching the awesome-openclaw-skills repo */
export type SkillCategory =
  | 'communication'
  | 'apple-apps'
  | 'browser-automation'
  | 'productivity'
  | 'search-research'
  | 'media-streaming'
  | 'smart-home'
  | 'devops-cloud'
  | 'ai-llms'
  | 'notes-pkm'
  | 'calendar-scheduling'
  | 'coding'
  | 'image-video'
  | 'cli-utilities'
  | 'git-github'
  | 'finance'
  | 'health-fitness'
  | 'shopping'
  | 'security'
  | 'gaming';

/** Config field definition for skill-specific settings */
export interface SkillConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'toggle';
  placeholder?: string;
  required?: boolean;
  /**
   * When set, the field value is written to ~/.baoyu-skills/.env under this env var name.
   * The value is stored locally in IndexedDB and written to disk — never sent to the cloud.
   */
  writeToEnv?: string;
  /** Helper link shown below the field (e.g. link to get an API key) */
  helpUrl?: string;
  helpText?: string;
}

/** An installed skill with its config values */
export interface InstalledSkill {
  slug: string;
  /** Skill-specific config values (API keys, settings) */
  config?: Record<string, string | number | boolean>;
  /** When the skill was installed */
  installedAt: string;
  /** Full GitHub repo URL for repo-based skills (e.g., https://github.com/user/skill-repo) */
  githubRepoUrl?: string;
  /** Display name for repo-based skills (fetched from GitHub) */
  repoDisplayName?: string;
  /** Direct raw URL to SKILL.md for community monorepo skills */
  skillMdUrl?: string;
  /**
   * When true (default), the app injects a headless execution prompt patch
   * that tells the agent to run the skill's script directly without opening
   * a visible browser window. Disable to let the agent handle it naturally
   * (useful for debugging or skills that intentionally open a UI).
   */
  headlessPatch?: boolean;
}

/** Config field definitions for skills that have post-install configurable settings */
export interface SkillEditField {
  key: string;
  label: string;
  description?: string;
  type: 'text' | 'password' | 'number' | 'toggle';
  placeholder?: string;
}

/** Post frequency for the X Auto-Poster workflow */
export type XAutoPosterFrequency =
  | 'manual'
  | 'hourly'
  | 'every_4_hours'
  | 'twice_daily'
  | 'daily'
  | 'every_other_day'
  | 'weekly';

export const X_AUTOPOSTER_FREQUENCY_OPTIONS: { value: XAutoPosterFrequency; labelKey: string; descKey: string }[] = [
  { value: 'manual', labelKey: 'personalityModal.xFreqManualLabel', descKey: 'personalityModal.xFreqManualDesc' },
  { value: 'hourly', labelKey: 'personalityModal.xFreqHourlyLabel', descKey: 'personalityModal.xFreqHourlyDesc' },
  { value: 'every_4_hours', labelKey: 'personalityModal.xFreqEvery4hLabel', descKey: 'personalityModal.xFreqEvery4hDesc' },
  { value: 'twice_daily', labelKey: 'personalityModal.xFreqTwiceDailyLabel', descKey: 'personalityModal.xFreqTwiceDailyDesc' },
  { value: 'daily', labelKey: 'personalityModal.xFreqDailyLabel', descKey: 'personalityModal.xFreqDailyDesc' },
  { value: 'every_other_day', labelKey: 'personalityModal.xFreqEveryOtherDayLabel', descKey: 'personalityModal.xFreqEveryOtherDayDesc' },
  { value: 'weekly', labelKey: 'personalityModal.xFreqWeeklyLabel', descKey: 'personalityModal.xFreqWeeklyDesc' },
];

/** Settings for the X Auto-Poster curated workflow */
export interface XAutoPosterConfig {
  enabled: boolean;
  contentDir: string;
  frequency: XAutoPosterFrequency;
  chromeProfile?: string;
  aiRewrite: boolean;
}

/** Curated workflow configs */
export interface WorkflowsConfig {
  xAutoPoster: XAutoPosterConfig;
}

/** Full OpenClaw skill configuration persisted in IndexedDB */
export interface OpenClawConfig {
  /** Email sending configuration */
  email: EmailConfig;
  /** Skills the user has installed */
  installedSkills: InstalledSkill[];
  /** Curated workflow settings */
  workflows?: WorkflowsConfig;
}

export const DEFAULT_X_AUTOPOSTER_CONFIG: XAutoPosterConfig = {
  enabled: false,
  contentDir: '~/social-media-content',
  frequency: 'manual',
  aiRewrite: true,
};

export const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  provider: 'system-mail',
};

export const DEFAULT_OPENCLAW_SKILL_CONFIG: OpenClawConfig = {
  email: DEFAULT_EMAIL_CONFIG,
  installedSkills: [],
  workflows: {
    xAutoPoster: DEFAULT_X_AUTOPOSTER_CONFIG,
  },
};

/** A skill fetched from the remote GitHub skill index */
export interface RemoteSkill {
  slug: string;
  name: string;
  author: string;
  githubUrl: string;
  skillMdUrl: string;
}

/** Response from /api/openclaw/skills */
export interface SkillSearchResponse {
  skills: RemoteSkill[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

/** Category metadata for the UI */
export interface SkillCategoryMeta {
  id: SkillCategory;
  labelKey: string;
  icon: string;
  color: string;
}

export const SKILL_CATEGORIES: SkillCategoryMeta[] = [
  { id: 'communication', labelKey: 'personalityModal.skillCatCommunication', icon: '💬', color: 'blue' },
  { id: 'apple-apps', labelKey: 'personalityModal.skillCatAppleApps', icon: '🍎', color: 'gray' },
  { id: 'browser-automation', labelKey: 'personalityModal.skillCatBrowserAutomation', icon: '🌐', color: 'indigo' },
  { id: 'productivity', labelKey: 'personalityModal.skillCatProductivity', icon: '📋', color: 'green' },
  { id: 'search-research', labelKey: 'personalityModal.skillCatSearchResearch', icon: '🔍', color: 'purple' },
  { id: 'media-streaming', labelKey: 'personalityModal.skillCatMediaStreaming', icon: '🎵', color: 'pink' },
  { id: 'smart-home', labelKey: 'personalityModal.skillCatSmartHome', icon: '🏠', color: 'amber' },
  { id: 'notes-pkm', labelKey: 'personalityModal.skillCatNotesPkm', icon: '📝', color: 'yellow' },
  { id: 'calendar-scheduling', labelKey: 'personalityModal.skillCatCalendar', icon: '📅', color: 'red' },
  { id: 'ai-llms', labelKey: 'personalityModal.skillCatAiLlms', icon: '🤖', color: 'cyan' },
  { id: 'image-video', labelKey: 'personalityModal.skillCatImageVideo', icon: '🎨', color: 'rose' },
  { id: 'cli-utilities', labelKey: 'personalityModal.skillCatCliUtilities', icon: '⌨️', color: 'slate' },
  { id: 'finance', labelKey: 'personalityModal.skillCatFinance', icon: '💰', color: 'emerald' },
  { id: 'health-fitness', labelKey: 'personalityModal.skillCatHealthFitness', icon: '💪', color: 'lime' },
  { id: 'security', labelKey: 'personalityModal.skillCatSecurity', icon: '🔒', color: 'orange' },
  { id: 'gaming', labelKey: 'personalityModal.skillCatGaming', icon: '🎮', color: 'violet' },
];
