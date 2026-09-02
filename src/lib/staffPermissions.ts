/** Mirrors backend/src/constants/staffPermissions.js for client gating. */
export const STAFF_PERMISSIONS = {
  VIEW_USERS: "view_users",
  VIEW_REPORTS: "view_reports",
  VIEW_CASES: "view_cases",
  VIEW_AUDIT: "view_audit",
  MODERATE_CONTENT: "moderate_content",
  RESOLVE_REPORTS: "resolve_reports",
  WARN_USER: "warn_user",
  RESTRICT_USER: "restrict_user",
  SUSPEND_USER: "suspend_user",
  BAN_USER: "ban_user",
  DELETE_USER: "delete_user",
  RESTORE_USER: "restore_user",
  MANAGE_APPEALS: "manage_appeals",
  CONFIGURE_STRIKES: "configure_strikes",
  ASSIGN_ROLES: "assign_roles",
  MANAGE_VERIFICATION: "manage_verification",
  CONFIGURE_PAYMENTS: "configure_payments",
} as const;

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  support: [
    STAFF_PERMISSIONS.VIEW_USERS,
    STAFF_PERMISSIONS.VIEW_REPORTS,
    STAFF_PERMISSIONS.VIEW_CASES,
    STAFF_PERMISSIONS.VIEW_AUDIT,
  ],
  moderator: [
    STAFF_PERMISSIONS.VIEW_USERS,
    STAFF_PERMISSIONS.VIEW_REPORTS,
    STAFF_PERMISSIONS.VIEW_CASES,
    STAFF_PERMISSIONS.VIEW_AUDIT,
    STAFF_PERMISSIONS.MODERATE_CONTENT,
    STAFF_PERMISSIONS.RESOLVE_REPORTS,
    STAFF_PERMISSIONS.WARN_USER,
    STAFF_PERMISSIONS.RESTRICT_USER,
    STAFF_PERMISSIONS.SUSPEND_USER,
    STAFF_PERMISSIONS.RESTORE_USER,
    STAFF_PERMISSIONS.MANAGE_APPEALS,
  ],
  admin: [
    STAFF_PERMISSIONS.VIEW_USERS,
    STAFF_PERMISSIONS.VIEW_REPORTS,
    STAFF_PERMISSIONS.VIEW_CASES,
    STAFF_PERMISSIONS.VIEW_AUDIT,
    STAFF_PERMISSIONS.MODERATE_CONTENT,
    STAFF_PERMISSIONS.RESOLVE_REPORTS,
    STAFF_PERMISSIONS.WARN_USER,
    STAFF_PERMISSIONS.RESTRICT_USER,
    STAFF_PERMISSIONS.SUSPEND_USER,
    STAFF_PERMISSIONS.BAN_USER,
    STAFF_PERMISSIONS.RESTORE_USER,
    STAFF_PERMISSIONS.MANAGE_APPEALS,
    STAFF_PERMISSIONS.MANAGE_VERIFICATION,
    STAFF_PERMISSIONS.CONFIGURE_PAYMENTS,
  ],
  super_admin: Object.values(STAFF_PERMISSIONS),
};

export function roleHasPermission(role: string | undefined | null, permission: string) {
  const r = String(role || "").trim();
  if (r === "super_admin") return true;
  const list = ROLE_PERMISSIONS[r];
  if (list) return list.includes(permission);
  return false;
}
