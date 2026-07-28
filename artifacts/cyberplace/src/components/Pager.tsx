import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/LanguageContext";

export const PAGE_SIZE = 50;

/**
 * Previous / next for the admin lists.
 *
 * Those endpoints used to return their whole table and the pages rendered all
 * of it — fine at thirty users, not at thirty thousand, and the audit log was
 * additionally capped at 200 rows with no way to reach anything older. Now the
 * server pages and this is how you move through it.
 *
 * Renders nothing when everything fits on one page, so a small install never
 * sees controls it does not need.
 */
export function Pager({ total, offset, limit, onChange }: {
  total: number;
  offset: number;
  limit: number;
  onChange: (nextOffset: number) => void;
}) {
  const { t } = useLang();
  if (total <= limit) return null;

  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  const first = offset + 1;
  const last = Math.min(offset + limit, total);

  return (
    <div className="flex items-center justify-between gap-4 mt-4" data-testid="pager">
      <span className="text-xs text-muted-foreground">
        {t(`${first}–${last} of ${total}`, `${total} tadan ${first}–${last}`, `${first}–${last} из ${total}`)}
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm" variant="outline" className="h-7 gap-1 text-xs"
          disabled={offset === 0}
          onClick={() => onChange(Math.max(0, offset - limit))}
          data-testid="button-page-prev"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> {t("Back", "Orqaga", "Назад")}
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">{page} / {pages}</span>
        <Button
          size="sm" variant="outline" className="h-7 gap-1 text-xs"
          disabled={last >= total}
          onClick={() => onChange(offset + limit)}
          data-testid="button-page-next"
        >
          {t("Next", "Keyingi", "Вперёд")} <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
