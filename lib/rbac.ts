export interface ModuleConfig {
  key: string;
  label: string;
  route: string;
}

export const ADMIN_MODULES: ModuleConfig[] = [
  { key: "dashboard", label: "Dashboard", route: "/admin" },
  { key: "series", label: "Series & Frameworks", route: "/series" },
  { key: "chapters", label: "Chapters Hub", route: "/chapters" },
  { key: "qna", label: "Question Bank", route: "/questions" },
  { key: "categories", label: "Categories", route: "/categories" },
  { key: "banners", label: "Banners Spotlight", route: "/banners" },
];

/**
 * Returns the first route that the user has permission to access (view or edit).
 * If dashboard is restricted, it proceeds to the next allowed module in order.
 */
export function getFirstAllowedRoute(
  role?: string | null,
  access?: Record<string, string> | null
): string {
  // Master Admin or regular admin has full access to dashboard
  if (!role || role === "master_admin" || role === "admin") {
    return "/admin";
  }

  if (!access) {
    return "/admin";
  }

  for (const mod of ADMIN_MODULES) {
    const lvl = access[mod.key];
    if (lvl === "view" || lvl === "edit") {
      return mod.route;
    }
  }

  // If user has no access to any module
  return "/admin/restricted?reason=restrict&module=all";
}

/**
 * Checks whether a user has view or edit access to a module.
 */
export function isModuleAllowed(
  moduleKey: string,
  role?: string | null,
  access?: Record<string, string> | null
): boolean {
  if (!role || role === "master_admin" || role === "admin") {
    return true;
  }
  if (!access) return false;
  const lvl = access[moduleKey];
  return lvl === "view" || lvl === "edit";
}

/**
 * Checks whether a user has edit access to a module.
 */
export function canEditModule(
  moduleKey: string,
  role?: string | null,
  access?: Record<string, string> | null
): boolean {
  if (!role || role === "master_admin" || role === "admin") {
    return true;
  }
  if (!access) return false;
  return access[moduleKey] === "edit";
}

