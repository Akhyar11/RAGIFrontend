'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { siakadService } from '@/services/siakad.service';
import BankSoalForm, { bankSoalSchema, BankSoalFormValues, rpsOptionLabel } from '@/components/lms/bank-soal/BankSoalForm';
import OpsiManager from '@/components/lms/bank-soal/OpsiManager';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BankSoalEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const soalId = Number(params?.id);
  const initialTab = searchParams.get('tab') === 'opsi' ? 'opsi' : 'form';

  const [isLoading, setIsLoading] = useState(true);
  const [tipeSoal, setTipeSoal] = useState('pilihan_ganda');
  const [kunciJawaban, setKunciJawaban] = useState('');
  const [rpsLabel, setRpsLabel] = useState('');

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
  const { handleSubmit, reset, setError, watch, formState: { isSubmitting } } = form;
  const watchedTipe = watch('tipe_soal');

  useEffect(() => {
    if (!Number.isFinite(soalId) || soalId <= 0) {
      toast.error('ID soal tidak valid.');
      router.push('/lms/bank-soal');
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const res: any = await siakadService.getSoalDetail(soalId);
        const row = res.data;
        if (cancelled) return;
        if (!row?.id) {
          toast.error('Data soal tidak ditemukan.');
          router.push('/lms/bank-soal');
          return;
        }
        reset({
          rps_id: row.rps_id ? String(row.rps_id) : '',
          kategori_id: row.kategori_id ? String(row.kategori_id) : '',
          tipe_soal: row.tipe_soal || 'pilihan_ganda',
          tingkat_kesulitan: row.tingkat_kesulitan || 'sedang',
          bobot: Number(row.bobot ?? 0),
          pertanyaan: String(row.pertanyaan || '').replace(/<[^>]*>/g, ''),
          gambar_path: row.gambar_path || '',
          kunci_jawaban: String(row.kunci_jawaban || '').replace(/<[^>]*>/g, ''),
          pembahasan: String(row.pembahasan || '').replace(/<[^>]*>/g, ''),
        });
        setTipeSoal(row.tipe_soal || 'pilihan_ganda');
        setKunciJawaban(String(row.kunci_jawaban || '').replace(/<[^>]*>/g, ''));
        if (row.rps) setRpsLabel(rpsOptionLabel(row.rps));
        else if (row.rps_id) {
          try {
            const rpsRes: any = await siakadService.showRps(Number(row.rps_id));
            if (rpsRes.data) setRpsLabel(rpsOptionLabel(rpsRes.data));
          } catch { /* abaikan */ }
        }
      } catch (err: any) {
        toast.error(err?.message || 'Gagal memuat data soal.');
        router.push('/lms/bank-soal');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soalId]);

  const onSubmit = async (values: BankSoalFormValues) => {
    try {
      await siakadService.updateSoal(soalId, {
        rps_id: Number(values.rps_id),
        kategori_id: values.kategori_id ? Number(values.kategori_id) : null,
        tipe_soal: values.tipe_soal,
        tingkat_kesulitan: values.tingkat_kesulitan,
        bobot: Number(values.bobot) || 0,
        pertanyaan: values.pertanyaan.trim(),
        gambar_path: values.gambar_path?.trim() || null,
        kunci_jawaban: values.kunci_jawaban?.trim() || null,
        pembahasan: values.pembahasan?.trim() || null,
      });
      toast.success('Soal berhasil diperbarui.');
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

  const efektifTipe = watchedTipe || tipeSoal;

  return (
    <div className="w-full flex flex-col space-y-4">
      <PageHeader
        title="Ubah Soal"
        description={rpsLabel ? `Perbarui butir soal — ${rpsLabel}.` : 'Perbarui butir soal bank soal.'}
        breadcrumbs={[{ label: 'LMS', href: '/lms' }, { label: 'Bank Soal', href: '/lms/bank-soal' }, { label: 'Ubah Soal' }]}
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
        {isLoading ? (
          <p className="text-xs text-slate-500 animate-pulse">Memuat data soal...</p>
        ) : (
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
        )}
      </div>

      {!isLoading && (
        <div id="kelola-opsi" className="space-y-4">
          {efektifTipe === 'pilihan_ganda' ? (
            <OpsiManager soalId={soalId} tipeSoal={efektifTipe} />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Kunci Jawaban</h5>
              <Input label="Kunci Jawaban" value={kunciJawaban || watch('kunci_jawaban') || ''} disabled readOnly hint="Soal isian singkat / uraian memakai kunci jawaban di atas." />
              {initialTab === 'opsi' ? (
                <p className="text-2xs text-slate-500 mt-2">Soal bertipe {efektifTipe} tidak memiliki opsi pilihan ganda.</p>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
