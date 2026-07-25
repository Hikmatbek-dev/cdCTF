/**
 * XP levels derived from points — the progress bar that makes every point feel
 * like movement, not just a number.
 *
 * The curve is triangular: reaching level L costs 50·L·(L-1) points cumulative,
 * so each level asks for 100 more than the last (L2=100, L3=300, L4=600,
 * L5=1000 …). Derived purely from `points`, so there is nothing extra to store
 * or keep in sync.
 */

/** Cumulative points required to have reached level `l`. */
function floorFor(l: number): number {
  return 50 * l * (l - 1);
}

export type LevelInfo = {
  level: number;
  /** Points into the current level. */
  intoLevel: number;
  /** Points the current level spans (current floor → next floor). */
  levelSpan: number;
  /** 0–1 progress toward the next level. */
  progress: number;
  /** Points still needed to reach the next level. */
  toNext: number;
};

export function levelFromPoints(points: number): LevelInfo {
  const p = Math.max(0, Math.floor(points || 0));
  const level = Math.floor((1 + Math.sqrt(1 + 0.08 * p)) / 2);
  const currentFloor = floorFor(level);
  const nextFloor = floorFor(level + 1);
  const levelSpan = nextFloor - currentFloor;
  const intoLevel = p - currentFloor;
  return {
    level,
    intoLevel,
    levelSpan,
    progress: levelSpan > 0 ? intoLevel / levelSpan : 0,
    toNext: Math.max(0, nextFloor - p),
  };
}
