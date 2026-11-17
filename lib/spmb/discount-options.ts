import type { SelectOption } from '@/components/ui/Select';

export const SPMB_DISCOUNT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'persen', label: 'Persentase (%)' },
  { value: 'nominal', label: 'Potongan Nominal (Rupiah)' },
  { value: 'total_tetap', label: 'Target Total Biaya (Rupiah)' },
];