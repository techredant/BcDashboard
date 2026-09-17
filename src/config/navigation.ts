import {
  LayoutDashboard,
  Users,
  Landmark,
  Newspaper,
  ShoppingBag,
  TrendingUp,
  Radio,
  ShieldCheck,
  Flag,
  ShieldAlert,
  FileSearch,
  Scale,
  ScrollText,
  Gavel,
  CircleDot,
  Command,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  description: string;
  permission?: string;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    label: "Platform",
    items: [
      {
        title: "Overview",
        url: "/",
        icon: LayoutDashboard,
        description: "Platform metrics and activity",
      },
      {
        title: "Users",
        url: "/users",
        icon: Users,
        description: "Manage accounts and moderation",
        permission: "view_users",
      },
      {
        title: "Verification",
        url: "/verification",
        icon: ShieldCheck,
        description: "Review badge applications",
        permission: "manage_verification",
      },
      {
        title: "Verification payments",
        url: "/verification/payments",
        icon: Landmark,
        description: "Review I&M Bank verification payments",
        permission: "manage_verification",
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        title: "Payment Methods",
        url: "/settings/payments/verification-methods",
        icon: CreditCard,
        description: "Country payment method configuration",
        permission: "configure_payments",
      },
      {
        title: "Verification Revenue",
        url: "/settings/payments/revenue",
        icon: CreditCard,
        description: "Verification payment analytics",
        permission: "manage_verification",
      },
    ],
  },
  {
    label: "Trust & Safety",
    items: [
      {
        title: "Command Center",
        url: "/moderation/center",
        icon: Command,
        description: "Unified moderation queue and SLA",
        permission: "view_cases",
      },
      {
        title: "Reports",
        url: "/reports",
        icon: Flag,
        description: "User reports queue",
        permission: "view_reports",
      },
      {
        title: "Moderation",
        url: "/moderation",
        icon: ShieldAlert,
        description: "Cases and AI review queue",
        permission: "view_cases",
      },
      {
        title: "Content",
        url: "/content",
        icon: FileSearch,
        description: "Posts, media, comments",
        permission: "view_cases",
      },
      {
        title: "Appeals",
        url: "/appeals",
        icon: Scale,
        description: "Review user appeals",
        permission: "view_reports",
      },
      {
        title: "Strike Policy",
        url: "/strike-policy",
        icon: Gavel,
        description: "Configure strike enforcement",
        permission: "configure_strikes",
      },
      {
        title: "Safety Policy",
        url: "/moderation/policy",
        icon: ShieldCheck,
        description: "AI risk thresholds and category rules",
        permission: "moderate_content",
      },
      {
        title: "Audit Logs",
        url: "/audit",
        icon: ScrollText,
        description: "Immutable admin actions",
        permission: "view_audit",
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        title: "Politicians",
        url: "/politicians",
        icon: Landmark,
        description: "Leaders and public figures",
      },
      {
        title: "Feeds",
        url: "/feeds",
        icon: Newspaper,
        description: "Posts and reported content",
      },
      {
        title: "Statuses",
        url: "/statuses",
        icon: CircleDot,
        description: "Status updates moderation",
        permission: "view_cases",
      },
      {
        title: "News",
        url: "/news",
        icon: Newspaper,
        description: "Sources, clusters, and scoring",
        permission: "manage_news",
      },
      {
        title: "Trends",
        url: "/trends",
        icon: TrendingUp,
        description: "Trending topics by level",
      },
      {
        title: "Livestreams",
        url: "/livestreams",
        icon: Radio,
        description: "Live broadcast monitoring",
        permission: "view_cases",
      },
    ],
  },
  {
    label: "Commerce",
    items: [
      {
        title: "Markets",
        url: "/markets",
        icon: ShoppingBag,
        description: "Marketplace listings",
        permission: "view_cases",
      },
    ],
  },
];

export const allNavItems = navSections.flatMap((s) => s.items);

export function getNavItem(pathname: string): NavItem | undefined {
  if (pathname.startsWith("/users/")) {
    return allNavItems.find((item) => item.url === "/users");
  }
  return allNavItems.find(
    (item) => item.url === pathname || (item.url !== "/" && pathname.startsWith(item.url)),
  );
}
