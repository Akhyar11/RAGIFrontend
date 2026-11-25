'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import BankSoalForm, { bankSoalSchema, BankSoalFormValues } from '@/components/lms/bank-soal/BankSoalForm';
import PilihanGandaOptionsEditor, { createDefaultPgOptions, PgOptionDraft } from '@/components/lms/bank-soal/PilihanGandaOptionsEditor';
import { siakadService } from '@/services/siakad.service';

export default function BankSoalCreatePage() {
  const router = useRouter();
  const [pgOptions, setPgOptions] = useState<PgOptionDraft[]>(createDefaultPgOptions());
  const [pgError, setPgError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<BankSoalFormValues>({
    resolver: zodResolver(bankSoalSchema) as any,
    defaultValues: {
      rps_id: '',
      kategori_id: '',
      tipe_soal: 'pilihan_ganda' as any,
      tingkat_kesulitan: 'sedang' as any,
      bobot: 0,
      pertanyaan: '',
      gambar_path: '',
      kunci_jawaban: '',
      pembahasan: '',
    },
  });
  const { handleSubmit, setError } = form;
  const tipeSoal = form.watch('tipe_soal');

  const validatePgOptions = (): string | null => {
    const filled = pgOptions.map((o) => ({ ...o, teks: o.teks.trim() }));
    const nonEmpty = filled.filter((o) => o.teks.length > 0);
    if (nonEmpty.length < 2) return 'Minimal 2 opsi pilihan ganda harus diisi.';
    const correctCount = filled.filter((o) => o.is_benar && o.teks.length > 0).length;
    if (correctCount !== 1) return 'Pilih tepat 1 kunci jawaban yang sudah diisi.';
    const hasEmptyCorrect = filled.some((o) => o.is_benar && o.teks.length === 0);
    if (hasEmptyCorrect) return 'Kunci jawaban harus pada opsi yang terisi.';
    return null;
  };

  const onSubmit = async (values: BankSoalFormValues) => {
    setPgError('');
    if (values.tipe_soal === 'pilihan_ganda') {
      const err = validatePgOptions();
      if (err) {
        setPgError(err);
        toast.error(err);
        return;
      }
    }

    setSubmitting(true);
    let createdId: number | null = null;
    try {
      const res = await siakadService.saveSoal({
        rps_id: Number(values.rps_id),
        kategori_id: values.kategori_id ? Number(values.kategori_id) : undefined,
        tipe_soal: values.tipe_soal,
        tingkat_kesulitan: values.tingkat_kesulitan,
        bobot: Number(values.bobot) || 0,
        pertanyaan: values.pertanyaan.trim(),
        gambar_path: values.gambar_path?.trim() || undefined,
        kunci_jawaban: values.tipe_soal === 'pilihan_ganda' ? undefined : values.kunci_jawaban?.trim() || undefined,
        pembahasan: values.pembahasan?.trim() || undefined,
      });

      createdId = res?.data?.id ?? null;
      if (values.tipe_soal === 'pilihan_ganda' && createdId) {
        const filled = pgOptions
          .map((o) => ({ ...o, teks: o.teks.trim(), gambar_path: o.gambar_path.trim() }))
          .filter((o) => o.teks.length > 0);

        for (let i = 0; i < filled.length; i++) {
          const opt = filled[i];
          await siakadService.saveOpsi(createdId, {
            teks: opt.teks,
            gambar_path: opt.gambar_path || null,
            is_benar: opt.is_benar,
            urutan: i + 1,
          });
        }
        toast.success('Soal pilihan ganda dan opsi berhasil dibuat.');
      } else {
        toast.success('Soal berhasil dibuat.');
      }

      router.push('/lms/bank-soal');
    } catch (err: any) {
      if (createdId && values.tipe_soal === 'pilihan_ganda') {
        toast.error(err?.response?.data?.message || 'Soal dibuat, tetapi gagal menyimpan sebagian opsi. Silakan lengkapi opsi.');
        router.push(`/lms/bank-soal/${createdId}/edit?tab=opsi`);
        return;
      }
      const fieldErrors = err?.response?.data?.errors || {};
      let assigned = false;
      Object.entries(fieldErrors).forEach(([field, msg]) => {
        const message = Array.isArray(msg) ? String(msg[0]) : String(msg);
        if (field in form.getValues()) {
          setError(field as keyof BankSoalFormValues, { message });
          assigned = true;
        }
      });
      if (!assigned) toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan soal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tambah Soal"
        description="Buat soal baru untuk bank soal."
        breadcrumbs={[{ label: 'LMS', href: '/lms' }, { label: 'Bank Soal', href: '/lms/bank-soal' }, { label: 'Tambah Soal' }]}
        action={
          <Button
            variant="outline"
            icon={<ArrowLeft size={16} />}
            onClick={() => router.push('/lms/bank-soal')}
            style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
          >
            Kembali
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-6">
        <BankSoalForm form={form} disabled={submitting} />

        {tipeSoal === 'pilihan_ganda' && (
          <div className="border-t border-slate-200 pt-6">
            <PilihanGandaOptionsEditor
              value={pgOptions}
              onChange={(next) => {
                setPgOptions(next);
                if (pgError) setPgError('');
              }}
              disabled={submitting}
              error={pgError}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" type="button" onClick={() => router.push('/lms/bank-soal')}>
            Batal
          </Button>
          <Button variant="primary" type="submit" icon={<Save size={16} />} loading={submitting} disabled={submitting}>
            Simpan Soal
          </Button>
        </div>
      </form>
    </div>
  );
}
