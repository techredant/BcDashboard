"use client";

import { DashboardSidebar } from "./DashboardSidebar";
import { Bell, Menu } from "lucide-react";
import { ModeToggle } from "./mode-toggle";
import { usePathname } from "next/navigation";
import { getNavItem } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const current = getNavItem(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="dashboard-shell flex min-h-screen w-full">
      <DashboardSidebar className="hidden lg:flex" />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="dashboard-header sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <DashboardSidebar
                  className="flex h-full w-full border-0"
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                BroadCast Admin
              </p>
              <h2 className="truncate text-base font-semibold font-display sm:text-lg">
                {current?.title ?? "Dashboard"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Badge variant="outline" className="hidden font-normal sm:inline-flex">
              Mobile ops
            </Badge>

            <ModeToggle />

            <button
              type="button"
              className="relative rounded-lg p-2 transition-colors hover:bg-secondary"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
            </button>

            <div className="admin-avatar" title="Administrator">
              AD
            </div>
          </div>
        </header>

        <main className="dashboard-main flex-1 overflow-auto">
          <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
