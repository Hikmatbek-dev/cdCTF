import { USER_ROLES, type UserRole } from "./permissions";

export type ColumnPermissions = {
  [table: string]: Partial<Record<UserRole, readonly string[]>>;
};

/**
 * Column-level allowlist for updates — the structural defence against mass
 * assignment. A role that cannot reach a column here cannot set it, no matter
 * what the request body contains.
 *
 * Every column named must exist on the table. `isPublished` used to be listed
 * for tables that had no such column, so it silently allowed a write that the
 * database would then reject.
 */
export const columnPermissions: ColumnPermissions = {
  users: {
    user: ["nickname", "avatarUrl"],
    author: ["nickname", "avatarUrl"],
    moderator: ["nickname", "avatarUrl"],
    admin: ["nickname", "avatarUrl", "points", "role", "isBlocked", "email", "emailVerified"],
  },
  ctf_tasks: {
    user: [],
    // Authors write content; they may not set their own scoring or publish state.
    author: [
      "name", "nameUz", "nameRu", "description", "descriptionUz", "descriptionRu",
      "category", "difficulty", "hint", "flag", "fileUrl",
    ],
    moderator: [],
    admin: [
      "name", "nameUz", "nameRu", "description", "descriptionUz", "descriptionRu",
      "category", "difficulty", "points", "hint", "flag", "fileUrl", "hintCost", "isPublished",
    ],
  },
  lessons: {
    user: [],
    author: [
      "title", "titleUz", "titleRu", "content", "contentUz", "contentRu", "categoryId", "moduleId",
    ],
    moderator: [],
    admin: [
      "title", "titleUz", "titleRu", "content", "contentUz", "contentRu",
      "categoryId", "moduleId", "points", "isPublished",
    ],
  },
  competitions: {
    user: [],
    author: [],
    moderator: [],
    admin: ["name", "description", "type", "startTime", "endTime", "inviteCode"],
  },
};

/**
 * Narrows `data` to the columns `role` may write on `table`.
 *
 * Fails closed: an unknown table or a role with no entry yields no writable
 * columns at all. The previous version fell back to the `user` allowlist for
 * unknown tables, which is a guess, not a decision.
 */
export function filterAllowedUpdates(
  role: UserRole,
  table: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const allowedColumns = columnPermissions[table]?.[role] ?? [];
  const filtered: Record<string, unknown> = {};

  for (const key of Object.keys(data)) {
    if (allowedColumns.includes(key)) filtered[key] = data[key];
  }

  return filtered;
}

/** Every column any role may write on a table — used by tests and tooling. */
export function writableColumns(table: string): string[] {
  const perTable = columnPermissions[table];
  if (!perTable) return [];
  return [...new Set(USER_ROLES.flatMap(role => perTable[role] ?? []))];
}
