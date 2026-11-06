'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { spmbService } from '@/services/spmb.service';
import type { SpmbKodeDiskon, SpmbKodeDiskonPayload, SpmbKodeDiskonTipe } from '@/types/spmb.types';

const optionalPositiveNumber = z.string().refine(
  (value) => value === '' || (Number.isFinite(Number(value)) && Number(value) > 0),
  'Nilai harus lebih besar dari 0.',
);

const schema = z.object({
  kode: z.string().min(1, 'Kode diskon wajib diisi.').max(50, 'Kode maksimal 50 karakter.')
    .regex(/^[A-Za-z0-9_-]+$/, 'Kode hanya boleh berisi huruf, angka, tanda hubung, dan garis bawah.'),
  nama: z.string().min(1, 'Nama diskon wajib diisi.').max(150, 'Nama maksimal 150 karakter.'),
  tipe_diskon: z.enum(['persen', 'nominal']),
  nilai: z.string().min(1, 'Nilai diskon wajib diisi.')
    .refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, 'Nilai harus lebih besar dari 0.'),
  maksimum_potongan: optionalPositiveNumber,
  batas_penggunaan: z.string().refine(
    (value) => value === '' || (/^\d+$/.test(value) && Number(value) > 0),
    'Maksimal klaim harus berupa bilangan bulat lebih besar dari 0.',
  ),
  berlaku_mulai: z.string(),
  berlaku_sampai: z.string(),
  is_active: z.boolean(),
}).superRefine((values, ctx) => {
  if (values.tipe_diskon === 'persen' && Number(values.nilai) > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nilai'], message: 'Diskon persentase maksimal 100%.' });
  }
  if (values.berlaku_mulai && values.berlaku_sampai && values.berlaku_sampai < values.berlaku_mulai) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['berlaku_sampai'], message: 'Tanggal akhir harus sama atau setelah tanggal mulai.' });
  }
});

type FormValues = z.infer<typeof schema>;

interface KodeDiskonFormProps {
  mode: 'create' | 'edit';
  initial?: SpmbKodeDiskon | null;
}

const tipeOptions = [
  { value: 'persen', label: 'Persentase (%)' },
  { value: 'nominal', label: 'Nominal (Rupiah)' },
];

export function KodeDiskonForm({ mode, initial }: KodeDiskonFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kode: '', nama: '', tipe_diskon: 'nominal', nilai: '', maksimum_potongan: '',
      batas_penggunaan: '', berlaku_mulai: '', berlaku_sampai: '', is_active: true,
    },
  });

  const tipeDiskon = watch('tipe_diskon');

  useEffect(() => {
    if (!initial) return;
    reset({
      kode: initial.kode || '',
      nama: initial.nama || '',
      tipe_diskon: initial.tipe_diskon,
      nilai: String(initial.nilai ?? ''),
      maksimum_potongan: initial.maksimum_potongan === null ? '' : String(initial.maksimum_potongan),
      batas_penggunaan: initial.batas_penggunaan === null ? '' : String(initial.batas_penggunaan),
      berlaku_mulai: initial.berlaku_mulai?.slice(0, 10) || '',
      berlaku_sampai: initial.berlaku_sampai?.slice(0, 10) || '',
      is_active: Boolean(initial.is_active),
    });
  }, [initial, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload: SpmbKodeDiskonPayload = {
      kode: values.kode.trim().toUpperCase(),
      nama: values.nama.trim(),
      tipe_diskon: values.tipe_diskon as SpmbKodeDiskonTipe,
      nilai: Number(values.nilai),
      maksimum_potongan: values.maksimum_potongan ? Number(values.maksimum_potongan) : null,
      batas_penggunaan: values.batas_penggunaan ? Number(values.batas_penggunaan) : null,
      berlaku_mulai: values.berlaku_mulai || null,
      berlaku_sampai: values.berlaku_sampai || null,
      is_active: values.is_active,
    };

    try {
      setSubmitting(true);
      if (mode === 'edit' && initial) {
        await spmbService.updateKodeDiskon(initial.id, payload);
        toast.success('Kode diskon berhasil diperbarui.');
      } else {
        await spmbService.createKodeDiskon(payload);
        toast.success('Kode diskon berhasil dibuat.');
      }
      router.push('/spmb/master/kode-diskon');
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      const firstFieldError = Object.values(axiosError.response?.data?.errors || {})[0]?.[0];
      toast.error(firstFieldError || axiosError.response?.data?.message || 'Gagal menyimpan kode diskon.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={mode === 'edit' ? 'Edit Kode Diskon' : 'Tambah Kode Diskon'}
        description="Atur nilai, masa berlaku, kuota klaim, dan status kode diskon pendaftaran."
        action={(
          <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => router.push('/spmb/master/kode-diskon')} style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}>
            Kembali
          </Button>
        )}
      />

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Input label="Kode Diskon" required placeholder="Contoh: SPMBHEMAT" hint="Kode dinormalisasi menjadi huruf kapital." error={errors.kode?.message} {...register('kode')} />
              <Input label="Nama Diskon" required placeholder="Contoh: Diskon Pendaftaran Gelombang 1" error={errors.nama?.message} {...register('nama')} />
              <Controller
                name="tipe_diskon"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Jenis Diskon"
                    options={tipeOptions}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.tipe_diskon?.message}
                  />
                )}
              />
              <Input type="number" min="0.01" step="0.01" label={tipeDiskon === 'persen' ? 'Nilai Diskon (%)' : 'Nilai Diskon (Rupiah)'} required error={errors.nilai?.message} {...register('nilai')} />
              <Input type="number" min="0.01" step="0.01" label="Maksimum Potongan (Opsional)" hint="Batas nominal maksimum untuk satu penggunaan." error={errors.maksimum_potongan?.message} {...register('maksimum_potongan')} />
              <Input type="number" min="1" step="1" label="Maksimal Klaim (Opsional)" hint="Kuota total pemakaian kode. Misalnya 10 berarti hanya 10 pendaftar pertama; kosongkan untuk tanpa batas." error={errors.batas_penggunaan?.message} {...register('batas_penggunaan')} />
              <Input type="date" label="Berlaku Mulai" error={errors.berlaku_mulai?.message} {...register('berlaku_mulai')} />
              <Input type="date" label="Berlaku Sampai" error={errors.berlaku_sampai?.message} {...register('berlaku_sampai')} />
            </div>

            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="is_active"
                  label="Aktif"
                  hint="Kode aktif dapat digunakan selama masih dalam masa berlaku dan kuotanya tersedia."
                  checked={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  error={errors.is_active?.message}
                />
              )}
            />

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
              Satu klaim dihitung saat kode diterapkan ke tagihan pendaftaran. Kode diskon hanya memotong komponen Master Biaya SPMB yang disetel sebagai beban pendaftaran; kode tidak berlaku untuk tarif fallback atau tagihan daftar ulang.
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button type="button" variant="outline" onClick={() => router.push('/spmb/master/kode-diskon')} disabled={submitting}>Batal</Button>
              <Button type="submit" variant="primary" loading={submitting}>{mode === 'edit' ? 'Simpan Perubahan' : 'Simpan Kode Diskon'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
