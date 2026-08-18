import {
  LayoutDashboard,
  Users,
  Landmark,
  Newspaper,
  ShoppingBag,
  TrendingUp,
  Radio,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  description: string;
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
      },
    ],
  },
];

export const allNavItems = navSections.flatMap((s) => s.items);

export function getNavItem(pathname: string): NavItem | undefined {
  return allNavItems.find((item) => item.url === pathname);
}
