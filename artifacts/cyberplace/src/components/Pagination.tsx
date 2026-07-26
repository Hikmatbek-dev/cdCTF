import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "./ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className = "" }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      <div className="flex items-center bg-background/50 border border-border rounded-xl overflow-hidden shadow-xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="h-10 w-10 rounded-none border-r border-border hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-30"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-10 w-10 rounded-none border-r border-border hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <div className="px-6 h-10 flex items-center justify-center border-r border-border min-w-[120px]">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Page <span className="text-foreground">{currentPage}</span> of <span className="text-foreground">{totalPages}</span>
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-10 w-10 rounded-none border-r border-border hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="h-10 w-10 rounded-none hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-30"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
