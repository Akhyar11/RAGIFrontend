'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { siakadService } from '@/services/siakad.service';
import BankSoalForm, { bankSoalSchema, BankSoalFormValues } from '@/components/lms/bank-soal/BankSoalForm';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BankSoalCreatePage() {
  const router = useRouter();
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
  const { handleSubmit, setError, formState: { isSubmitting } } = form;

  const onSubmit = async (values: BankSoalFormValues) => {
    try {
      await siakadService.saveSoal({
        rps_id: Number(values.rps_id),
        kategori_id: values.kategori_id ? Number(values.kategori_id) : undefined,
        tipe_soal: values.tipe_soal,
        tingkat_kesulitan: values.tingkat_kesulitan,
        bobot: Number(values.bobot) || 0,
        pertanyaan: values.pertanyaan.trim(),
        gambar_path: values.gambar_path?.trim() || undefined,
        kunci_jawaban: values.kunci_jawaban?.trim() || undefined,
        pembahasan: values.pembahasan?.trim() || undefined,
      });
      toast.success('Soal berhasil dibuat.');
      router.push('/lms/bank-soal');
    } catch (err: any) {
      const fieldErrors = err?.response?.data?.errors || {};
      let mapped = false;
      (['rps_id', 'pertanyaan', 'bobot', 'kunci_jawaban', 'pembahasan'] as const).forEach((key) => {
        if (fieldErrors[key]) {
          setError(key as any, { message: String(fieldErrors[key][0]) });
          mapped = true;
        }
      });
      toast.error(mapped ? 'Periksa kembali data yang diisi.' : err?.response?.data?.message || 'Gagal menyimpan soal.');
    }
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      <PageHeader
        title="Tambah Soal"
        description="Buat butir soal baru ke bank soal."
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <BankSoalForm form={form} disabled={isSubmitting} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.push('/lms/bank-soal')} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" icon={<Save size={16} />} loading={isSubmitting} disabled={isSubmitting}>
              Simpan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
