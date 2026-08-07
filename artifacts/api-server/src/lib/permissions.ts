import type { NextFunction, Request, Response } from "express";

export const USER_ROLES = ["user", "author", "moderator", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

/** Anything not recognised degrades to the least-privileged role. */
export function normalizeRole(role: unknown): UserRole {
  return isUserRole(role) ? role : "user";
}

export const PERMISSIONS = [
  "admin.panel",
  "users.read",
  "users.block",
  "users.role",
  "audit.read",
  "blocks.manage",
  "ctf.read.all",
  "ctf.create",
  "ctf.update.own",
  "ctf.update.any",
  "ctf.delete",
  "ctf.publish",
  "lessons.read.all",
  "lessons.create",
  "lessons.update.own",
  "lessons.update.any",
  "lessons.delete",
  "lessons.publish",
  "competitions.manage",
  "writeups.moderate",
  "support.manage",
  "system.maintenance",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * What each role may do. `admin` is granted every permission rather than listed,
 * so a new permission is never silently withheld from admins — but is always
 * withheld from everyone else until it is added here deliberately.
 */
const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  user: [],
  author: [
    "admin.panel",
    "ctf.read.all",
    "ctf.create",
    "ctf.update.own",
    "lessons.read.all",
    "lessons.create",
    "lessons.update.own",
  ],
  moderator: [
    "admin.panel",
    "users.read",
    "users.block",
    "audit.read",
    "blocks.manage",
    "ctf.read.all",
    "lessons.read.all",
    "writeups.moderate",
  ],
  admin: PERMISSIONS,
};

export function permissionsForRole(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}

/** True for any role that may see the admin panel at all. */
export function isStaff(role: UserRole): boolean {
  return hasPermission(role, "admin.panel");
}

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && (PERMISSIONS as readonly string[]).includes(value);
}

/**
 * The permissions a caller actually holds.
 *
 * A super-admin holds everything and cannot be locked out. A user with a
 * non-null override holds exactly that set — the role defaults are ignored, so an
 * override can grant fewer permissions than the role would (least privilege) or a
 * bespoke mix. Otherwise the role's static defaults apply.
 */
export function effectivePermissions(input: {
  role: UserRole;
  isSuperAdmin?: boolean | null;
  permissions?: readonly string[] | null;
}): Permission[] {
  if (input.isSuperAdmin) return [...PERMISSIONS];
  if (input.permissions != null) return input.permissions.filter(isPermission);
  return [...permissionsForRole(input.role)];
}

/**
 * Effective permission check for the authenticated caller on this request.
 *
 * A session carries its resolved effective permissions (role defaults, a
 * per-user override, or everything for a super-admin), computed once when the
 * request was authenticated. An API token never passes a staff gate, so falling
 * back to its role defaults is safe and keeps this total.
 */
export function reqHasPermission(req: Request, permission: Permission): boolean {
  const u = req.user;
  if (!u) return false;
  if (u.tokenType === "session") return u.permissions.includes(permission);
  return hasPermission(u.role, permission);
}

const API_TOKEN_REFUSED = "This endpoint requires an interactive session";

/**
 * API tokens are user-level by construction: no scope grants a staff permission,
 * so a token minted by an admin still cannot administer anything. Checked here
 * rather than per-route, so it holds for every permission-gated endpoint.
 */
function staffCapable(req: Request): boolean {
  return req.user?.tokenType === "session";
}

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!staffCapable(req)) return res.status(403).json({ error: API_TOKEN_REFUSED });
    if (!reqHasPermission(req, permission)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

/** Passes when the caller holds any one of the listed permissions. */
export function requireAnyPermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!staffCapable(req)) return res.status(403).json({ error: API_TOKEN_REFUSED });
    if (!permissions.some(permission => reqHasPermission(req, permission))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (!staffCapable(req)) return res.status(403).json({ error: API_TOKEN_REFUSED });
  if (!reqHasPermission(req, "admin.panel")) return res.status(403).json({ error: "Forbidden" });
  next();
}

/**
 * The gate for managing other admins: creating them, resetting their password,
 * toggling their permissions. Only a super-admin passes — this is deliberately a
 * flag check, not a permission, so it can never be granted through the very
 * permission matrix it guards.
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.user.tokenType !== "session") return res.status(403).json({ error: API_TOKEN_REFUSED });
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: "Forbidden" });
  next();
}

/**
 * Resolves whether the caller may edit a specific resource: `*.update.any`
 * covers everything, `*.update.own` only rows they authored. Rows with no author
 * (everything created before authorship existed) are editable only by `.any`.
 */
export function canEditResource(
  req: Request,
  resource: "ctf" | "lessons",
  authorId: number | null,
  userId: number,
): boolean {
  if (reqHasPermission(req, `${resource}.update.any` as Permission)) return true;
  if (!reqHasPermission(req, `${resource}.update.own` as Permission)) return false;
  return authorId !== null && authorId === userId;
}
