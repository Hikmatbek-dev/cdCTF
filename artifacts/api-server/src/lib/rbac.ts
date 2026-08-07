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
    // `avatarUrl` is deliberately absent for everyone below admin.
    //
    // It accepted any https URL and was then rendered as <img src> on the public
    // scoreboard, the talent directory and every profile — so one account could
    // point it at a host they control and collect the IP and user-agent of every
    // visitor to those pages. Nobody needs to write it directly: POST
    // /users/:id/avatar uploads a file and sets the URL server-side, which is
    // what the profile page has always used. Admins keep it so a bad avatar can
    // be cleared.
    user: ["nickname", "openToWork"],
    author: ["nickname", "openToWork"],
    moderator: ["nickname", "openToWork"],
    admin: ["nickname", "avatarUrl", "openToWork", "points", "role", "isBlocked", "email", "emailVerified"],
  },
  ctf_tasks: {
    user: [],
    // Authors write content; they may not set their own scoring or publish state.
    author: [
      "name", "nameUz", "nameRu", "description", "descriptionUz", "descriptionRu",
      "category", "difficulty", "hint", "hintUz", "hintRu", "flag", "fileUrl",
    ],
    moderator: [],
    admin: [
      "name", "nameUz", "nameRu", "description", "descriptionUz", "descriptionRu",
      "category", "difficulty", "points", "hint", "hintUz", "hintRu", "flag", "fileUrl", "hintCost", "isPublished",
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
    admin: ["name", "description", "type", "format", "maxTeamSize", "startTime", "endTime", "inviteCode", "sponsorName", "sponsorLogoUrl", "sponsorUrl", "prize", "inviteRequirement", "telegramUrl"],
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
