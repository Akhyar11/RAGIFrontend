import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage?: number;
  totalPages?: number;
  page?: number;
  lastPage?: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  page,
  lastPage,
  onPageChange,
  disabled = false,
  className = '',
}: PaginationProps) {
  const current = currentPage ?? page ?? 1;
  const total = totalPages ?? lastPage ?? 1;

  if (total <= 1) {
    return null;
  }

  return (
    <nav aria-label="Navigasi halaman" className={`flex items-center gap-2 ${className}`.trim()}>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled || current <= 1}
        onClick={() => onPageChange(current - 1)}
        aria-label="Halaman sebelumnya"
        icon={<ChevronLeft size={16} />}
      >
        Sebelumnya
      </Button>
      <span className="text-2xs text-slate-600 font-medium">
        Halaman {current} dari {total}
      </span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled || current >= total}
        onClick={() => onPageChange(current + 1)}
        aria-label="Halaman berikutnya"
        icon={<ChevronRight size={16} />}
      >
        Berikutnya
      </Button>
    </nav>
  );
}
