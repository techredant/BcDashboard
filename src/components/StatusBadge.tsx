import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  resolved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  verified: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  reviewing: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  under_review: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  pending: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  processing: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  review: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  failed: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  age_restricted: "bg-orange-500/15 text-orange-800 dark:text-orange-400",
  on_feed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  open: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  none: "bg-muted text-muted-foreground",
  restricted: "bg-orange-500/15 text-orange-800 dark:text-orange-400",
  action_required: "bg-orange-500/15 text-orange-800 dark:text-orange-400",
  suspended: "bg-red-500/15 text-red-700 dark:text-red-400",
  banned: "bg-red-500/15 text-red-700 dark:text-red-400",
  removed: "bg-red-500/15 text-red-700 dark:text-red-400",
  blocked: "bg-red-500/15 text-red-700 dark:text-red-400",
  critical: "bg-red-500/15 text-red-700 dark:text-red-400",
  deleted: "bg-muted text-muted-foreground",
  inactive: "bg-muted text-muted-foreground",
  dismissed: "bg-muted text-muted-foreground",
  warned: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  warn: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  warn_content: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  limit_content: "bg-orange-500/15 text-orange-800 dark:text-orange-400",
  hide_content: "bg-muted text-muted-foreground",
  remove_content: "bg-red-500/15 text-red-700 dark:text-red-400",
  limited: "bg-orange-500/15 text-orange-800 dark:text-orange-400",
  hidden: "bg-muted text-muted-foreground",
  restored: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  low: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  high: "bg-orange-500/15 text-orange-800 dark:text-orange-400",
  eligible: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  not_eligible: "bg-muted text-muted-foreground",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
  appealed: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  recent: "bg-sky-500/15 text-sky-800 dark:text-sky-400",
  push_invalid: "bg-orange-500/15 text-orange-800 dark:text-orange-400",
  uninstall_likely: "bg-red-500/15 text-red-700 dark:text-red-400",
  valid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  invalid: "bg-red-500/15 text-red-700 dark:text-red-400",
  unknown: "bg-muted text-muted-foreground",
  unlikely: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  possible: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  likely: "bg-red-500/15 text-red-700 dark:text-red-400",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const key = String(status || "inactive").toLowerCase();
  const display = label || key.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        STATUS_STYLES[key] || "bg-muted text-muted-foreground",
        className,
      )}
    >
      {display}
    </span>
  );
}
