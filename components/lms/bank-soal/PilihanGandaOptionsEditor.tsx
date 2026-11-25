'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Plus, Trash2 } from 'lucide-react';

export interface PgOptionDraft {
  teks: string;
  gambar_path: string;
  is_benar: boolean;
}

interface Props {
  value: PgOptionDraft[];
  onChange: (next: PgOptionDraft[]) => void;
  disabled?: boolean;
  error?: string;
}

function optionLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

export function createDefaultPgOptions(): PgOptionDraft[] {
  return [
    { teks: '', gambar_path: '', is_benar: true },
    { teks: '', gambar_path: '', is_benar: false },
    { teks: '', gambar_path: '', is_benar: false },
    { teks: '', gambar_path: '', is_benar: false },
  ];
}

export default function PilihanGandaOptionsEditor({ value, onChange, disabled, error }: Props) {
  const correctIndex = value.findIndex((o) => o.is_benar);
  const kunciValue = correctIndex >= 0 ? String(correctIndex) : '';

  const updateOption = (index: number, patch: Partial<PgOptionDraft>) => {
    onChange(value.map((opt, i) => (i === index ? { ...opt, ...patch } : opt)));
  };

  const setCorrect = (index: number) => {
    onChange(value.map((opt, i) => ({ ...opt, is_benar: i === index })));
  };

  const addOption = () => {
    if (value.length >= 10) return;
    onChange([...value, { teks: '', gambar_path: '', is_benar: false }]);
  };

  const removeOption = (index: number) => {
    if (value.length <= 2) return;
    const next = value.filter((_, i) => i !== index);
    if (!next.some((o) => o.is_benar) && next.length > 0) next[0].is_benar = true;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">Opsi Jawaban Pilihan Ganda</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<Plus size={16} />}
          onClick={addOption}
          disabled={disabled || value.length >= 10}
        >
          Tambah Opsi
        </Button>
      </div>

      <div className="space-y-3">
        {value.map((opt, idx) => {
          const letter = optionLabel(idx);
          return (
            <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">Pilihan {letter}</span>
                <Button
                  type="button"
                  variant="outline-danger"
                  size="sm"
                  icon={<Trash2 size={16} />}
                  onClick={() => removeOption(idx)}
                  disabled={disabled || value.length <= 2}
                  title="Hapus opsi"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label={`Teks Pilihan ${letter}`}
                  placeholder={`Tulis jawaban pilihan ${letter}...`}
                  value={opt.teks}
                  onChange={(e) => updateOption(idx, { teks: e.target.value })}
                  disabled={disabled}
                />
                <Input
                  label="URL / Path Gambar (Opsional)"
                  placeholder="https://..."
                  value={opt.gambar_path}
                  onChange={(e) => updateOption(idx, { gambar_path: e.target.value })}
                  disabled={disabled}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Kunci Jawaban"
          required
          placeholder="Pilih kunci jawaban..."
          options={value.map((_, idx) => ({ value: String(idx), label: `Pilihan ${optionLabel(idx)}` }))}
          value={kunciValue}
          onChange={(val) => {
            if (val === '' || val === null || val === undefined) return;
            setCorrect(Number(val));
          }}
          isDisabled={disabled}
        />
        <div className="flex items-end">
          <p className="text-2xs text-slate-500 pb-2">Pilih satu opsi sebagai jawaban benar.</p>
        </div>
      </div>

      {error && <p className="text-2xs text-red-600">{error}</p>}
    </div>
  );
}
