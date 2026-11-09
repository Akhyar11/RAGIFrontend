'use client';

import { useCallback, useEffect, useState } from 'react';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { siakadService } from '@/services/siakad.service';

interface PeriodeAkademikSelectProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
  isClearable?: boolean;
  hint?: string;
}

interface TahunAkademikOptionRow {
  id: number;
  nama: string;
  is_aktif?: boolean;
  is_active?: boolean;
  kode?: string;
}

function toRows(res: unknown): TahunAkademikOptionRow[] {
  if (Array.isArray(res)) return res as TahunAkademikOptionRow[];
  const obj = res as { data?: unknown } | null;
  if (obj && Array.isArray(obj.data)) return obj.data as TahunAkademikOptionRow[];
  return [];
}

function extractValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'object' && val !== null && 'value' in (val as Record<string, unknown>)) {
    const inner = (val as { value: unknown }).value;
    return inner === null || inner === undefined ? '' : String(inner);
  }
  return String(val);
}

/**
 * Hook untuk mengambil ID Periode Akademik Aktif (`is_active = true`) secara otomatis
 * saat halaman pertama kali dibuka, sehingga default tampilan selalu periode aktif.
 */
export function useActivePeriodeAkademik(onResolved?: (activeId: string) => void) {
  const [activePeriodeId, setActivePeriodeId] = useState<string>('');
  const [periodeReady, setPeriodeReady] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await siakadService.getTahunAkademiks();
        const rows = toRows((res as { data?: unknown })?.data ?? res);
        const aktif = rows.find((t) => Boolean(t.is_active || t.is_aktif));
        if (!cancelled && aktif) {
          const idStr = String(aktif.id);
          setActivePeriodeId(idStr);
          onResolved?.(idStr);
        }
      } catch {
        // abaikan bila gagal — backend juga otomatis membatasi ke periode aktif
      } finally {
        if (!cancelled) setPeriodeReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { activePeriodeId, periodeReady };
}

/**
 * Dropdown periode akademik yang bersumber dari SIAKAD
 * (`siakad_tahun_akademik` via GET /v1/siakad/akademik/tahun-akademik),
 * bukan dari master referensi. Satu-satunya sumber di modul LMS.
 *
 * Catatan: `AsyncSelect` mengirim objek option `{value, label}` (atau null
 * saat di-clear) ke onChange — WAJIB diekstrak `.value`-nya, jangan String()
 * langsung (itu menghasilkan "[object Object]").
 */
export default function PeriodeAkademikSelect({
  label = 'Periode Akademik',
  placeholder = 'Periode Akademik Aktif (Klik untuk ganti periode lama)...',
  value,
  onChange,
  isClearable = true,
  hint,
}: PeriodeAkademikSelectProps) {
  const loadOptions = useCallback(async (inputValue: string) => {
    try {
      const res = await siakadService.getTahunAkademiks();
      const rows = toRows((res as { data?: unknown })?.data ?? res);
      const keyword = inputValue.trim().toLowerCase();
      return rows
        .filter((t) => !keyword || t.nama.toLowerCase().includes(keyword))
        .map((t) => ({
          value: String(t.id),
          label: t.is_active || t.is_aktif ? `${t.nama} (Periode Aktif)` : t.nama,
        }));
    } catch {
      return [];
    }
  }, []);

  return (
    <AsyncSelect
      label={label}
      placeholder={placeholder}
      value={value || ''}
      onChange={(val) => onChange?.(extractValue(val))}
      loadOptions={loadOptions}
      isClearable={isClearable}
      hint={hint}
    />
  );
}
