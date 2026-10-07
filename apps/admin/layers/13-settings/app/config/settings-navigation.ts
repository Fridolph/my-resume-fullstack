import type { NavigationMenuItem } from "@nuxt/ui";

export type SettingsNavigationItem = NavigationMenuItem & {
  children?: SettingsNavigationItem[];
};

/**
 * Settings 二级导航（左侧 sidebar）。
 * `type: 'label'` 为分组标题；普通项用 `to` 指向子页面。
 */
export const settingsNavigation: SettingsNavigationItem[] = [
  { type: "label", label: "Organization" },
  { label: "Company profile", icon: "i-lucide-building-2", to: "/settings/company" },

  { type: "label", label: "Access" },
  { label: "Team members", icon: "i-lucide-users", to: "/settings/team" },
];
