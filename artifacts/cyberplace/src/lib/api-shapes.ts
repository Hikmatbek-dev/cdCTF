import type { CtfChallenge } from "@workspace/api-client-react";

type CtfListEnvelope = {
  challenges?: unknown;
  data?: unknown;
  items?: unknown;
};

export function normalizeCtfChallenges(value: unknown): CtfChallenge[] {
  if (Array.isArray(value)) return value as CtfChallenge[];
  if (!value || typeof value !== "object") return [];

  const envelope = value as CtfListEnvelope;
  if (Array.isArray(envelope.challenges)) return envelope.challenges as CtfChallenge[];
  if (Array.isArray(envelope.data)) return envelope.data as CtfChallenge[];
  if (Array.isArray(envelope.items)) return envelope.items as CtfChallenge[];

  return [];
}
