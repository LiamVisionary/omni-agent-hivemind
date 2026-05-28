"use client";

import { useState, type Dispatch, type ElementType, type ReactNode, type SetStateAction } from "react";
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
  const [mobileRoutesOpen, setMobileRoutesOpen] = useState(false);
  const primaryNavItems = (["agents", "kanban", "vault", "chat", "wallet", "more"] as DashboardView[])
    .map((id) => navItems.find((item) => item.id === id))
    .filter((item): item is (typeof navItems)[number] => Boolean(item));
  const isActiveRoute = (id: DashboardView) => id === activeView
    || (id === "kanban" && isWorkView(activeView))
    || (id === "more" && (activeView === "maintenance" || activeView === "memory" || activeView === "files" || activeView === "notifications" || activeView === "env" || activeView === "integrations" || activeView === "my-apps"));
  const activeNavLabel = navItems.find((item) => item.id === activeView)?.label
    ?? primaryNavItems.find((item) => isActiveRoute(item.id))?.label
    ?? activeHeader.title;
  const closeMobileRoutes = () => {
    setMobileRoutesOpen(false);
  };
  const selectRoute = (id: DashboardView) => {
    if (id === "kanban" && !kanbanBoard) setKanbanLoading(true);
    setActiveView(id);
    closeMobileRoutes();
  };

  return (
    <TooltipProvider delayDuration={120}>
      <header className="commandTopbar" aria-label="Control room navigation">
        <div id="mobile-route-drawer-shell" className={`mobileRouteShell ${mobileRoutesOpen ? "open" : ""}`}>
          <button
            type="button"
            className="mobileRouteToggle"
            aria-expanded={mobileRoutesOpen}
            aria-controls="mobile-route-drawer"
            aria-label="Open route drawer"
            onClick={() => setMobileRoutesOpen(true)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mobileRouteBackdrop"
            aria-label="Close route drawer"
            hidden={!mobileRoutesOpen}
            onClick={closeMobileRoutes}
          />
          <div id="mobile-route-drawer" className="mobileRouteDrawer" hidden={!mobileRoutesOpen}>
            <div className="mobileRouteDrawerHeader">
              <div>
                <span>{activeHeader.eyebrow}</span>
                <strong>{activeNavLabel}</strong>
              </div>
              <button type="button" className="mobileRouteClose" aria-label="Close route drawer" onClick={closeMobileRoutes}>
                Close
              </button>
            </div>
            <nav aria-label="Mobile dashboard routes">
              {navItems.map((item) => {
                const active = isActiveRoute(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={active ? "active" : ""}
                    aria-pressed={active}
                    onClick={() => selectRoute(item.id)}
                  >
                    {viewIcon(item.id)}
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </span>
                    {item.id === "notifications" && notificationSummary?.unread ? (
                      <i className={notificationClass("navBadge")} aria-label={`${notificationSummary.unread} unread notifications`}>
                        {notificationSummary.unread > 99 ? "99+" : notificationSummary.unread}
                      </i>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

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
            {primaryNavItems.map((item) => {
                const active = isActiveRoute(item.id);
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={`viewTab ${active ? "active" : ""}`}
                        aria-pressed={active}
                        title={`${item.label}: ${item.detail}`}
                        onClick={() => selectRoute(item.id)}
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
