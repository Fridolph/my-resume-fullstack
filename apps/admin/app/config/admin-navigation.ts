import type { AdminBrandConfig, AdminNavigationItem } from "../types/admin";

export const adminBrand: AdminBrandConfig = {
  name: "Admin Studio",
  mark: "A",
  href: "/",
};

export const adminNavigation: AdminNavigationItem[] = [
  {
    label: "Dashboard",
    icon: "i-lucide-layout-dashboard",
    to: "/",
  },
  {
    label: "Projects",
    icon: "i-lucide-folder-kanban",
    defaultOpen: true,
    children: [
      { label: "All projects", to: "/projects" },
      { label: "Recently viewed", to: "/projects/recent" },
    ],
  },
  {
    label: "Team",
    icon: "i-lucide-users",
    children: [
      { label: "Members", to: "/team/members" },
      { label: "Roles & access", to: "/team/roles" },
    ],
  },
  {
    label: "Settings",
    icon: "i-lucide-settings-2",
    to: "/settings",
  },
  {
    label: "Comps",
    icon: "i-lucide-component",
    children: [
      { label: "Modal", to: "/comps/modal" },
      { label: "Loaders", to: "/comps/loaders" },
      { label: "Tour", to: "/comps/tour" },
      { label: "Tour spotlight", to: "/comps/tour-light" },
      { label: "Text editor", to: "/comps/text-editor" },
      { label: "Upload", to: "/comps/upload" },
      { label: "Sort list", to: "/comps/sort-list" },
      { label: "Sortable bar", to: "/comps/sortable-bar" },
      { label: "Permission wrapper", to: "/comps/permission-wrapper" },
    ],
  },
  {
    label: "Demos",
    icon: "i-lucide-flask-conical",
    children: [
      { label: "PDF review", to: "/demos/pdf-review" },
      { label: "Plugins", to: "/demos/plugins" },
      { label: "Utils", to: "/demos/utils" },
      { label: "Resume config layout", to: "/demos/resume-config-layout" },
      { label: "Resume layout editor", to: "/demos/layout-editor" },
      { label: "Resume options tabs", to: "/demos/options-tabs" },
      { label: "Resume compare modal", to: "/demos/compare-modal" },
    ],
  },
];

export const adminExternalNavigation: AdminNavigationItem[] = [
  { label: "Help center", icon: "i-lucide-circle-help", to: "/help" },
  { label: "Release notes", icon: "i-lucide-megaphone", to: "/release-notes" },
];
