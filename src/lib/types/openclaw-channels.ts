/**
 * OpenClaw channel configuration types.
 *
 * Mirrors the subset of config options from OpenClaw's plugin-sdk that
 * we expose in the HivemindOS companion UI for per-channel control.
 */

export type DmPolicy = 'pairing' | 'allowlist' | 'open' | 'disabled';
export type GroupPolicy = 'open' | 'disabled' | 'allowlist';

/** Settings shared across all messaging channels. */
export interface BaseChannelConfig {
  dmPolicy?: DmPolicy;
  allowFrom?: string[];
  groupPolicy?: GroupPolicy;
  groupAllowFrom?: string[];
  historyLimit?: number;
  dmHistoryLimit?: number;
  sendReadReceipts?: boolean;
  mediaMaxMb?: number;
  responsePrefix?: string;
}

/** WhatsApp-specific config. */
export interface WhatsAppChannelConfig extends BaseChannelConfig {
  selfChatMode?: boolean;
  ackReaction?: { emoji?: string; direct?: boolean; group?: 'always' | 'mentions' | 'never' };
  debounceMs?: number;
}

/** Telegram-specific config. */
export interface TelegramChannelConfig extends BaseChannelConfig {
  streamMode?: 'off' | 'partial' | 'block';
  reactionLevel?: 'off' | 'ack' | 'minimal' | 'extensive';
  linkPreview?: boolean;
}

/** Signal-specific config. */
export interface SignalChannelConfig extends BaseChannelConfig {
  reactionLevel?: 'off' | 'ack' | 'minimal' | 'extensive';
}

/** iMessage-specific config. */
export interface IMessageChannelConfig extends BaseChannelConfig {
  service?: 'imessage' | 'sms' | 'auto';
}

export type ChannelId = 'whatsapp' | 'telegram' | 'signal' | 'imessage';

export type ChannelConfigMap = {
  whatsapp: WhatsAppChannelConfig;
  telegram: TelegramChannelConfig;
  signal: SignalChannelConfig;
  imessage: IMessageChannelConfig;
};

/** Payload sent to the config API (PATCH semantics — only changed keys). */
export interface ChannelConfigPatch {
  channel: ChannelId;
  config: Partial<ChannelConfigMap[ChannelId]>;
}

/** DM policy descriptions shown in the UI. */
export const DM_POLICY_OPTIONS: { value: DmPolicy; labelKey: string; descKey: string }[] = [
  { value: 'disabled', labelKey: 'personalityModal.dmPolicyDisabledLabel', descKey: 'personalityModal.dmPolicyDisabledDesc' },
  { value: 'pairing', labelKey: 'personalityModal.dmPolicyPairingLabel', descKey: 'personalityModal.dmPolicyPairingDesc' },
  { value: 'allowlist', labelKey: 'personalityModal.dmPolicyAllowlistLabel', descKey: 'personalityModal.dmPolicyAllowlistDesc' },
  { value: 'open', labelKey: 'personalityModal.dmPolicyOpenLabel', descKey: 'personalityModal.dmPolicyOpenDesc' },
];

export const GROUP_POLICY_OPTIONS: { value: GroupPolicy; labelKey: string; descKey: string }[] = [
  { value: 'disabled', labelKey: 'personalityModal.groupPolicyDisabledLabel', descKey: 'personalityModal.groupPolicyDisabledDesc' },
  { value: 'allowlist', labelKey: 'personalityModal.groupPolicyAllowlistLabel', descKey: 'personalityModal.groupPolicyAllowlistDesc' },
  { value: 'open', labelKey: 'personalityModal.groupPolicyOpenLabel', descKey: 'personalityModal.groupPolicyOpenDesc' },
];
