'use client';

import { useState } from 'react';
import { Controller, UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { siakadService } from '@/services/siakad.service';
import {
  TIPE_SOAL_OPTIONS,
  TIPE_SOAL_VALUES,
  TINGKAT_KESULITAN_OPTIONS,
  TINGKAT_KESULITAN_VALUES,
} from '@/types/bank-soal.types';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export const bankSoalSchema = z.object({
  rps_id: z.string().min(1, 'RPS wajib dipilih.'),
  kategori_id: z.string().optional().default(''),
  tipe_soal: z.enum(TIPE_SOAL_VALUES, { message: 'Tipe soal wajib dipilih.' }),
  tingkat_kesulitan: z.enum(TINGKAT_KESULITAN_VALUES, { message: 'Tingkat kesulitan wajib dipilih.' }),
  bobot: z.coerce.number({ message: 'Bobot harus berupa angka.' }).min(0, 'Bobot minimal 0.').max(100, 'Bobot maksimal 100.'),
  pertanyaan: z.string().min(1, 'Pertanyaan wajib diisi.'),
  gambar_path: z.string().optional().default(''),
  kunci_jawaban: z.string().optional().default(''),
  pembahasan: z.string().optional().default(''),
});

export type BankSoalFormValues = z.infer<typeof bankSoalSchema>;

function extractVal(val: unknown): string {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'object' && val !== null && 'value' in (val as Record<string, unknown>)) {
    const v = (val as { value: unknown }).value;
    return v === null || v === undefined ? '' : String(v);
  }
  return String(val);
}

export function rpsOptionLabel(r: any): string {
  const mk = r.mata_kuliah ? `${r.mata_kuliah.kode_mk || ''} — ${r.mata_kuliah.nama || ''}`.trim() : `RPS #${r.id}`;
  return `${mk}${r.tahun_ajaran ? ` (${r.tahun_ajaran})` : ''}`;
}

export async function loadRpsOptions(input: string) {
  const res: any = await siakadService.getRps({ search: input || undefined, per_page: 20 });
  const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
  return items.map((r: any) => ({ value: String(r.id), label: rpsOptionLabel(r) }));
}

export async function loadKategoriOptions(input: string) {
  const res: any = await siakadService.getSoalKategori({ search: input || undefined, per_page: 50 });
  const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
  return items.map((k: any) => ({ value: String(k.id), label: k.nama }));
}

interface Props {
  form: UseFormReturn<BankSoalFormValues>;
  disabled?: boolean;
}

export default function BankSoalForm({ form, disabled }: Props) {
  const [kategoriOpen, setKategoriOpen] = useState(false);
  const [kategoriNama, setKategoriNama] = useState('');
  const [savingKategori, setSavingKategori] = useState(false);
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = form;

  const handleSaveKategori = async () => {
    if (!kategoriNama.trim()) {
      toast.error('Nama kategori wajib diisi.');
      return;
    }
    setSavingKategori(true);
    try {
      const res: any = await siakadService.saveKategori({ nama: kategoriNama.trim() });
      const created = res.data;
      if (created?.id) setValue('kategori_id', String(created.id), { shouldValidate: true });
      toast.success('Kategori berhasil dibuat.');
      setKategoriOpen(false);
      setKategoriNama('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal membuat kategori.');
    } finally {
      setSavingKategori(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="md:col-span-2 lg:col-span-3">
          <Controller
            name="rps_id"
            control={control}
            render={({ field }) => (
              <AsyncSelect
                label="RPS"
                required
                placeholder="Cari RPS (mata kuliah)..."
                value={field.value || ''}
                onChange={(val) => field.onChange(extractVal(val))}
                loadOptions={loadRpsOptions}
                isClearable
                isDisabled={disabled}
                error={errors.rps_id?.message}
              />
            )}
          />
        </div>

        <div>
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <Controller
                name="kategori_id"
                control={control}
                render={({ field }) => (
                  <AsyncSelect
                    label="Kategori"
                    placeholder="Pilih kategori..."
                    value={field.value || ''}
                    onChange={(val) => field.onChange(extractVal(val))}
                    loadOptions={loadKategoriOptions}
                    isClearable
                    isDisabled={disabled}
                    error={errors.kategori_id?.message}
                  />
                )}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setKategoriOpen(true)}
              disabled={disabled}
              title="Buat kategori baru"
              aria-label="Buat kategori baru"
            />
          </div>
        </div>

        <Controller
          name="tipe_soal"
          control={control}
          render={({ field }) => (
            <Select
              label="Tipe Soal"
              required
              placeholder="Pilih tipe..."
              options={TIPE_SOAL_OPTIONS}
              value={field.value || ''}
              onChange={(val) => field.onChange(val)}
              isDisabled={disabled}
              error={errors.tipe_soal?.message}
            />
          )}
        />

        <Controller
          name="tingkat_kesulitan"
          control={control}
          render={({ field }) => (
            <Select
              label="Tingkat Kesulitan"
              required
              placeholder="Pilih kesulitan..."
              options={TINGKAT_KESULITAN_OPTIONS}
              value={field.value || ''}
              onChange={(val) => field.onChange(val)}
              isDisabled={disabled}
              error={errors.tingkat_kesulitan?.message}
            />
          )}
        />

        <Input
          type="number"
          label="Bobot"
          min={0}
          disabled={disabled}
          error={errors.bobot?.message}
          {...register('bobot')}
        />

        <div className="md:col-span-2 lg:col-span-3">
          <Textarea
            label="Pertanyaan"
            required
            rows={4}
            placeholder="Tulis pertanyaan soal..."
            disabled={disabled}
            error={errors.pertanyaan?.message}
            {...register('pertanyaan')}
          />
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <Input
            label="URL / Path Gambar Soal (Opsional)"
            placeholder="Contoh: https://domain.ac.id/gambar-soal.png atau /storage/soal/img1.jpg"
            disabled={disabled}
            error={errors.gambar_path?.message}
            {...register('gambar_path')}
          />
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <Textarea
            label="Kunci Jawaban"
            rows={3}
            placeholder="Kunci jawaban / jawaban benar..."
            disabled={disabled}
            error={errors.kunci_jawaban?.message}
            {...register('kunci_jawaban')}
          />
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <Textarea
            label="Pembahasan"
            rows={3}
            placeholder="Pembahasan soal (opsional)..."
            disabled={disabled}
            error={errors.pembahasan?.message}
            {...register('pembahasan')}
          />
        </div>
      </div>

      <Modal
        open={kategoriOpen}
        onClose={() => setKategoriOpen(false)}
        title="Tambah Kategori"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setKategoriOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSaveKategori} loading={savingKategori} disabled={savingKategori}>
              Simpan
            </Button>
          </div>
        }
      >
        <Input
          label="Nama Kategori"
          required
          placeholder="cth: UTS, UAS, Kuis..."
          value={kategoriNama}
          onChange={(e) => setKategoriNama(e.target.value)}
        />
      </Modal>
    </>
  );
}
