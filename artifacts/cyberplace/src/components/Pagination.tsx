import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "./ui/button";
import { useLang } from "@/lib/LanguageContext";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Four icon-only buttons announced as "button, button, button, button", and
 * "Page 1 of 5" hardcoded in English on the scoreboard and the challenge list.
 * Both fixed here: every control has a translated accessible name, and the
 * counter is translated and readable rather than 10px uppercase tracking-widest.
 */
export function Pagination({ currentPage, totalPages, onPageChange, className = "" }: PaginationProps) {
  const { t } = useLang();
  if (totalPages <= 1) return null;

  return (
    <nav className={`flex items-center justify-center gap-1 ${className}`} aria-label={t("Pagination", "Sahifalar", "Страницы")}>
      <div className="flex items-center bg-background/50 border border-border rounded-xl overflow-hidden shadow-xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label={t("First page", "Birinchi sahifa", "Первая страница")}
          className="h-10 w-10 rounded-none border-r border-border hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-30"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label={t("Previous page", "Oldingi sahifa", "Предыдущая страница")}
          className="h-10 w-10 rounded-none border-r border-border hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <div className="px-6 h-10 flex items-center justify-center border-r border-border min-w-[120px]">
          <span className="text-xs font-medium text-muted-foreground" aria-live="polite">
            {t(`Page ${currentPage} of ${totalPages}`,
               `${currentPage} / ${totalPages}-sahifa`,
               `Страница ${currentPage} из ${totalPages}`)}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label={t("Next page", "Keyingi sahifa", "Следующая страница")}
          className="h-10 w-10 rounded-none border-r border-border hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label={t("Last page", "Oxirgi sahifa", "Последняя страница")}
          className="h-10 w-10 rounded-none hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-30"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </nav>
  );
}
