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
      },
    ],
  },
  {
    label: "Trust & Safety",
    items: [
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
