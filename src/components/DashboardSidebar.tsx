"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { navSections } from "@/config/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type DashboardSidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

export function DashboardSidebar({ className, onNavigate }: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "dashboard-sidebar flex min-h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64",
        className,
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <img
          src="/icon.jpg"
          alt="BroadCast"
          className="h-10 w-10 shrink-0 rounded-xl object-cover ring-2 ring-sidebar-primary/30"
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight text-sidebar-accent-foreground font-display">
              BroadCast
            </p>
            <p className="truncate text-[11px] text-sidebar-foreground/70">
              Admin Console
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
        {navSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.url;
                const link = (
                  <NavLink
                    key={item.url}
                    href={item.url}
                    onClick={onNavigate}
                    className={cn(
                      "sidebar-nav-item",
                      active && "sidebar-nav-item-active",
                    )}
                    activeClassName=""
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.url} delayDuration={0}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return link;
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <p className="mb-2 px-1 text-[10px] text-sidebar-foreground/50">
            BroadCast Mobile · v1.0
          </p>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto flex rounded-lg p-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
