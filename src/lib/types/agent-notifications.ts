export type AgentNotificationPriority = "low" | "normal" | "high" | "urgent";

export type AgentNotificationKind = "message" | "decision" | "task" | "alert" | "system";

export type AgentNotification = {
  id: string;
  title: string;
  body: string;
  priority: AgentNotificationPriority;
  kind: AgentNotificationKind;
  agentName: string;
  agentId?: string;
  source?: string;
  createdAt: string;
  filePath: string;
  read: boolean;
  readAt?: string;
  tags: string[];
};

export type AgentNotificationSettings = {
  highPriorityMessagingEnabled: boolean;
  messagingHandledBy: string;
  updatedAt: string;
};

export type AgentNotificationSummary = {
  total: number;
  unread: number;
  highUnread: number;
  urgentUnread: number;
  folder: string;
  settings: AgentNotificationSettings;
};
