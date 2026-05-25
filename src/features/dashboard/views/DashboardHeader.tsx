"use client";

/* eslint-disable react-hooks/immutability, react-hooks/purity */

import type { Dispatch, ElementType, ReactNode, SetStateAction } from "react";
import type { AgentNotificationSummary } from "@/lib/types/agent-notifications";
import type { KanbanBoard } from "@/lib/types/kanban";
import type { DashboardView } from "@/features/dashboard/dashboard-types";

type DashboardHeaderProps = {
  Image: ElementType;
  Tooltip: ElementType;
  TooltipContent: ElementType;
  TooltipProvider: ElementType;
  TooltipTrigger: ElementType;
  activeHeader: { eyebrow: string; title: string };
  activeView: DashboardView;
  fleetCheckedAt?: number;
  formatRelativeTime: (timestamp: number) => string;
  isWorkView: (view: DashboardView) => boolean;
  kanbanBoard?: KanbanBoard | null;
  navItems: Array<{ id: DashboardView; label: string; detail: string }>;
  notificationClass: (...names: string[]) => string;
  notificationSummary?: AgentNotificationSummary | null;
  setActiveView: Dispatch<SetStateAction<DashboardView>>;
  setKanbanLoading: Dispatch<SetStateAction<boolean>>;
  viewIcon: (view: DashboardView) => ReactNode;
};

export function DashboardHeader(props: DashboardHeaderProps) {
  const {
    Image,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
    activeHeader,
    activeView,
    fleetCheckedAt,
    formatRelativeTime,
    isWorkView,
    kanbanBoard,
    navItems,
    notificationClass,
    notificationSummary,
    setActiveView,
    setKanbanLoading,
    viewIcon,
  } = props;

  return (
    <TooltipProvider delayDuration={120}>
      <header className="commandTopbar" aria-label="Control room navigation">
        <div className="topbarMasthead">
          <div className="brandIntro">
            <button
              type="button"
              className="brandHex"
              aria-label="Return to Fleet"
              title="Return to Fleet"
              onClick={() => setActiveView("agents")}
            >
              <Image className="brandLogo" src="/hivemindos-logo.png" alt="" width={190} height={194} priority />
            </button>
            <div className="brandCopy">
              <p className="eyebrow">{activeHeader.eyebrow}</p>
              <strong>{activeHeader.title}</strong>
            </div>
          </div>

          <div className="topbarSignal" aria-label="Brain sync status">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            <span>· brain ·</span>
            <span>synced {fleetCheckedAt ? formatRelativeTime(fleetCheckedAt) : "38s ago"}</span>
          </div>

          <nav className="viewTabs" aria-label="Dashboard views">
            {(["agents", "kanban", "vault", "chat", "wallet", "more"] as DashboardView[])
              .map((id) => navItems.find((item) => item.id === id))
              .filter((item): item is (typeof navItems)[number] => Boolean(item))
              .map((item) => {
                const active = item.id === activeView
                  || (item.id === "kanban" && isWorkView(activeView))
                  || (item.id === "more" && (activeView === "maintenance" || activeView === "files" || activeView === "notifications" || activeView === "env" || activeView === "integrations"));
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={`viewTab ${active ? "active" : ""}`}
                        aria-pressed={active}
                        title={`${item.label}: ${item.detail}`}
                        onClick={() => {
                          if (item.id === "kanban" && !kanbanBoard) setKanbanLoading(true);
                          setActiveView(item.id);
                        }}
                      >
                        {viewIcon(item.id)}
                        <span>
                          {item.label}
                          {item.id === "notifications" && notificationSummary?.unread ? (
                            <i className={notificationClass("navBadge")} aria-label={`${notificationSummary.unread} unread notifications`}>
                              {notificationSummary.unread > 99 ? "99+" : notificationSummary.unread}
                            </i>
                          ) : null}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <strong className="block">{item.label}</strong>
                      <span className="block text-[var(--muted)]">{item.detail}</span>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
          </nav>
        </div>
      </header>
    </TooltipProvider>
  );
}
