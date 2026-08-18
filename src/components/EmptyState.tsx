import { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
};

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon ? <div className="empty-state-icon">{icon}</div> : null}
      <p className="font-semibold">{title}</p>
      {subtitle ? <p className="text-sm text-muted-foreground mt-1">{subtitle}</p> : null}
    </div>
  );
}
