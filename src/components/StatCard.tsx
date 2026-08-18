import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  accent?: "default" | "success" | "warning" | "info";
}

function formatValue(value: string | number) {
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  return value;
}

const accentStyles = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  accent = "default",
}: StatCardProps) {
  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 truncate text-2xl font-bold font-display tracking-tight">
            {formatValue(value)}
          </p>
        </div>
        <div className={`rounded-xl p-2.5 ${accentStyles[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {change ? (
        <p
          className={`mt-3 text-xs font-medium ${
            changeType === "positive"
              ? "text-success"
              : changeType === "negative"
                ? "text-destructive"
                : "text-muted-foreground"
          }`}
        >
          {change}
        </p>
      ) : null}
    </div>
  );
}
