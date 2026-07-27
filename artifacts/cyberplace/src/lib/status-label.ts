/**
 * A competition's status, in the reader's language.
 *
 * The server sends `upcoming` / `active` / `ended`, and the pages printed that
 * enum straight out with a `capitalize` class — so an Uzbek learner read
 * "Upcoming" on an otherwise Uzbek page. Same class of defect as the difficulty
 * badge: an English enum leaking into the interface because it happened to be a
 * word.
 */
type Translate = (en: string, uz?: string, ru?: string) => string;

export function statusLabel(t: Translate, status: string | null | undefined): string {
  switch ((status || "").toLowerCase()) {
    case "active": return t("Live", "Jonli", "Идёт");
    case "upcoming": return t("Upcoming", "Yaqinda", "Скоро");
    case "ended": return t("Ended", "Yakunlandi", "Завершено");
    default: return status ?? "";
  }
}
