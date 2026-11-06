'use client';

import { useEffect, useState } from 'react';
import { Select } from '@/components/ui/Select';

const MONTHS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

interface PeriodeTanggalInputProps {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

export function PeriodeTanggalInput({ label, value, onChange, error, required }: PeriodeTanggalInputProps) {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');

  useEffect(() => {
    const match = value?.match(/^(\d{2})-(\d{2})$/);
    if (match) {
      setMonth(match[1]);
      setDay(match[2]);
    } else if (!value) {
      setMonth('');
      setDay('');
    }
  }, [value]);

  const dayCount = month ? new Date(Date.UTC(2000, Number(month), 0)).getUTCDate() : 31;
  const dayOptions = Array.from({ length: dayCount }, (_, index) => {
    const value = String(index + 1).padStart(2, '0');
    return { value, label: value };
  });
  const emit = (nextMonth: string, nextDay: string) => {
    onChange(nextMonth && nextDay ? `${nextMonth}-${nextDay}` : '');
  };

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-4 sm:col-span-3">
          <Select
            label={label}
            required={required}
            options={[{ value: '', label: 'Tgl' }, ...dayOptions]}
            value={day}
            onChange={(nextDay) => {
              const newDay = String(nextDay || '');
              setDay(newDay);
              emit(month, newDay);
            }}
            placeholder="Tgl"
          />
        </div>
        <div className="col-span-8 sm:col-span-9">
          <Select
            label="Bulan"
            options={[{ value: '', label: 'Pilih bulan' }, ...MONTHS]}
            value={month}
            onChange={(nextMonth) => {
              const newMonth = String(nextMonth || '');
              const maxDay = newMonth ? new Date(Date.UTC(2000, Number(newMonth), 0)).getUTCDate() : 31;
              const newDay = day && Number(day) > maxDay ? String(maxDay).padStart(2, '0') : day;
              setMonth(newMonth);
              setDay(newDay);
              emit(newMonth, newDay);
            }}
            placeholder="Pilih bulan"
          />
        </div>
      </div>
      <p className={error ? 'text-2xs font-medium text-rose-500' : 'text-2xs text-slate-500'}>
        {error || 'Periode berulang setiap tahun; masukkan tanggal dan bulan saja.'}
      </p>
    </div>
  );
}
