"use client";

import { StatusBadge } from "@/components/StatusBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type AppStatusSummary = {
  status?: string;
  label?: string;
  uninstallLikelihood?: string;
};

export function AppStatusBadge({ appStatus }: { appStatus?: AppStatusSummary | null }) {
  const status = appStatus?.status || "unknown";
  const label = appStatus?.label || "Unknown";
  const isUninstallLikely = status === "uninstall_likely";

  const badge = <StatusBadge status={status} label={label} />;

  if (!isUninstallLikely) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{badge}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          All registered devices have invalid push tokens and no recent app activity.
          This is inferred from FCM delivery failures — the user may still have the app
          installed with notifications disabled.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
