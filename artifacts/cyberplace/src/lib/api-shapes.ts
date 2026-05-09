import type { Competition, CtfChallenge, LearnCategory, Lesson } from "@workspace/api-client-react";

export function normalizeCtfChallenges(value: unknown): CtfChallenge[] {
  return normalizeArray<CtfChallenge>(value, ["challenges", "data", "items"]);
}

export function normalizeCompetitions(value: unknown): Competition[] {
  return normalizeArray<Competition>(value, ["competitions", "data", "items"]);
}

export function normalizeLearnCategories(value: unknown): LearnCategory[] {
  return normalizeArray<LearnCategory>(value, ["categories", "data", "items"]);
}

export function normalizeLessons(value: unknown): Lesson[] {
  return normalizeArray<Lesson>(value, ["lessons", "data", "items"]);
}

export function normalizeArray<T>(value: unknown, keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];

  const envelope = value as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(envelope[key])) return envelope[key] as T[];
  }

  return [];
}
