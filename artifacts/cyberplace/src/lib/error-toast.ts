/**
 * One translated headline for every failure, with the server's own words kept
 * underneath.
 *
 * Roughly fifteen call sites did `toast({ title: e instanceof Error ? e.message
 * : "Failed" })`. Two problems with that: the fallback is the bare English word
 * "Failed" on a platform that defaults to Uzbek, and `e.message` is whatever the
 * API said — also English, and written for a developer. So every failure path in
 * the app spoke English, to learners who had chosen not to.
 *
 * The detail is not thrown away. It goes in the description, where it is useful
 * to whoever can read it and ignorable to whoever cannot.
 */
type Translate = (en: string, uz?: string, ru?: string) => string;

export function errorToast(t: Translate, err: unknown, title?: string) {
  const detail = err instanceof Error && err.message.trim() ? err.message.trim() : "";
  return {
    title: title ?? t("Something went wrong", "Xatolik yuz berdi", "Что-то пошло не так"),
    description: detail || undefined,
    variant: "destructive" as const,
  };
}
