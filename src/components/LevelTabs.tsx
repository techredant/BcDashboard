import { LucideIcon } from "lucide-react";

export type LevelOption = {
  key: string;
  label: string;
  icon?: LucideIcon;
};

type LevelTabsProps = {
  options: LevelOption[];
  value: string;
  onChange: (value: string) => void;
};

export function LevelTabs({ options, value, onChange }: LevelTabsProps) {
  return (
    <div className="level-tabs">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`level-tab ${active ? "level-tab-active" : ""}`}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            <span className="capitalize">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
