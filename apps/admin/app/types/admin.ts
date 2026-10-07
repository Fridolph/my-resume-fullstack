import type { NavigationMenuItem } from "@nuxt/ui";

export type AdminNavigationItem = NavigationMenuItem & {
  children?: AdminNavigationItem[];
};

export interface AdminBrandConfig {
  name: string;
  mark?: string;
  logoSrc?: string;
  href?: string;
}

export interface AuthSplitLayoutConfig {
  imageSrc?: string;
  imageAlt?: string;
  imageSide?: "left" | "right";
  imageOverlay?: string;
}

export interface AdminBreadcrumb {
  label: string;
  to?: string;
}
