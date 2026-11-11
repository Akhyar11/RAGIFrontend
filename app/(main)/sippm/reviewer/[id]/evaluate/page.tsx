'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Save,
  Award,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { sippmService } from '@/services/sippm.service';
import type { ReviewerKegiatan } from '@/types/sippm.types';
import toast from 'react-hot-toast';

const evaluationSchema = z.object({
  skor_rekam_jejak: z.number().min(0, 'Skor minimal 0').max(100, 'Skor maksimal 100'),
  skor_substansi: z.number().min(0, 'Skor minimal 0').max(100, 'Skor maksimal 100'),
  skor_rab: z.number().min(0, 'Skor minimal 0').max(100, 'Skor maksimal 100'),
  catatan_reviewer: z.string().min(10, 'Catatan masukan reviewer minimal 10 karakter'),
  rekomendasi: z.enum(['terima', 'revisi', 'tolak'] as const),
});

type EvaluationFormValues = z.infer<typeof evaluationSchema>;

export default function EvaluateProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [reviewerData, setReviewerData] = useState<ReviewerKegiatan | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EvaluationFormValues>({
    resolver: zodResolver(evaluationSchema) as any,
    defaultValues: {
      skor_rekam_jejak: 0,
      skor_substansi: 0,
      skor_rab: 0,
      catatan_reviewer: '',
      rekomendasi: 'terima',
    },
  });

  const skorRekamJejak = watch('skor_rekam_jejak') || 0;
  const skorSubstansi = watch('skor_substansi') || 0;
  const skorRab = watch('skor_rab') || 0;
  const rekomendasiVal = watch('rekomendasi');

  // Total Skor Weighted (25% Rekam Jejak, 50% Substansi, 25% RAB)
  const totalSkor = Math.round(skorRekamJejak * 0.25 + skorSubstansi * 0.5 + skorRab * 0.25);

  useEffect(() => {
    const loadAssigned = async () => {
      try {
        setLoading(true);
        const res = await sippmService.myAssignedProposals();
        const list = Array.isArray(res?.data)
          ? res.data
          : (res?.data as any)?.items || (res?.data as any)?.data || [];
        let found = list.find((r: any) => r.id === Number(resolvedParams.id) || r.proposal_id === Number(resolvedParams.id));
        if (!found) {
          try {
            const propRes = await sippmService.getProposalDetail(Number(resolvedParams.id));
            if (propRes?.data) {
              found = {
                id: Number(resolvedParams.id),
                proposal_id: propRes.data.id,
                proposal: propRes.data,
                status: 'assigned',
              } as any;
            }
          } catch {
            // ignore
          }
        }
        if (found) {
          setReviewerData(found);
          if (found.penilaian) {
            setValue('skor_rekam_jejak', found.penilaian.skor_rekam_jejak || 0);
            setValue('skor_substansi', found.penilaian.skor_substansi || 0);
            setValue('skor_rab', found.penilaian.skor_rencana_anggaran || found.penilaian.skor_rab || 0);
            setValue('catatan_reviewer', found.penilaian.catatan_revisi || found.penilaian.catatan_reviewer || '');
            setValue('rekomendasi', (found.penilaian.rekomendasi === 'diterima' ? 'terima' : (found.penilaian.rekomendasi === 'ditolak' ? 'tolak' : found.penilaian.rekomendasi)) || 'terima');
          }
        }
      } catch (err) {
        console.error('Failed to load assigned reviewer item', err);
        toast.error('Gagal memuat rincian usulan reviewer');
      } finally {
        setLoading(false);
      }
    };
    loadAssigned();
  }, [resolvedParams.id, setValue]);

  const onSubmit = async (data: EvaluationFormValues) => {
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const targetId = reviewerData?.id || Number(resolvedParams.id);
      await sippmService.submitPenilaian(targetId, {
        skor_rekam_jejak: data.skor_rekam_jejak,
        skor_substansi: data.skor_substansi,
        skor_rab: data.skor_rab,
        skor_rencana_anggaran: data.skor_rab,
        catatan_reviewer: data.catatan_reviewer,
        catatan_revisi: data.catatan_reviewer,
        rekomendasi: data.rekomendasi === 'terima' ? 'diterima' : (data.rekomendasi === 'tolak' ? 'ditolak' : data.rekomendasi),
      } as any);
      toast.success('Penilaian desk evaluation berhasil disimpan!');
      router.push('/sippm/reviewer');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyimpan penilaian proposal';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Memuat form desk evaluation...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header (PageHeader Atomic Standard) */}
      <PageHeader
        title="Form Penilaian Desk Evaluation"
        description="Berikan bobot skor rubrik & rekomendasi kelayakan proposal riset."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIPPM', href: '/sippm' },
          { label: 'Portal Reviewer', href: '/sippm/reviewer' },
          { label: 'Desk Evaluation' },
        ]}
        action={
          <Button
            variant="outline"
            icon={<ArrowLeft size={16} />}
            onClick={() => router.back()}
            className="font-bold"
          >
            Kembali
          </Button>
        }
      />

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-2">
          <XCircle size={18} /> {errorMsg}
        </div>
      )}

      {/* Ringkasan Proposal Card */}
      {reviewerData?.proposal && (
        <div className="card bg-slate-900 text-white p-6 shadow-md border-none rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <Badge variant="blue" className="font-bold">
                {reviewerData.proposal.skema?.nama_skema || 'Skema Riset'}
              </Badge>
              <h2 className="text-xl font-extrabold text-white leading-tight">
                {reviewerData.proposal.judul}
              </h2>
              <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                <span>
                  Ketua: <strong>{reviewerData.proposal.ketua?.nama_lengkap || 'Dosen Pengusul'}</strong>
                </span>
                <span>•</span>
                <span>
                  Dana Diusulkan:{' '}
                  <strong>
                    Rp {(reviewerData.proposal.dana_diusulkan || 0).toLocaleString('id-ID')}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* RUBRIK PENILAIAN CARD (COMPACT GRID LAYOUT MAKS 3 KOLOM) */}
        <div className="card p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Award size={18} className="text-primary-600" /> Rubrik Bobot Penilaian (Skala 0 - 100)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Field 1: Rekam Jejak (25%) */}
            <Input
              label="Skor Rekam Jejak (Bobot 25%)"
              type="number"
              min={0}
              max={100}
              placeholder="0 - 100"
              error={errors.skor_rekam_jejak?.message}
              {...register('skor_rekam_jejak', { valueAsNumber: true })}
            />

            {/* Field 2: Substansi (50%) */}
            <Input
              label="Skor Substansi Usulan (Bobot 50%)"
              type="number"
              min={0}
              max={100}
              placeholder="0 - 100"
              error={errors.skor_substansi?.message}
              {...register('skor_substansi', { valueAsNumber: true })}
            />

            {/* Field 3: RAB (25%) */}
            <Input
              label="Skor Kelayakan RAB (Bobot 25%)"
              type="number"
              min={0}
              max={100}
              placeholder="0 - 100"
              error={errors.skor_rab?.message}
              {...register('skor_rab', { valueAsNumber: true })}
            />

            {/* Total Skor Calculation Highlight */}
            <div className="col-span-full p-4 rounded-xl bg-primary-50 border border-primary-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-primary-800 uppercase tracking-wide">TOTAL SKOR PENILAIAN</div>
                <div className="text-xs text-primary-600">Terhitung otomatis dari 3 kriteria di atas (Weighted)</div>
              </div>
              <div className="text-3xl font-extrabold text-primary-800 font-mono">{totalSkor} / 100</div>
            </div>

            {/* Rekomendasi Select */}
            <div className="col-span-full md:col-span-1">
              <Select
                label="Rekomendasi Akhir Reviewer"
                value={rekomendasiVal}
                onChange={(val) => setValue('rekomendasi', val as any)}
                options={[
                  { value: 'terima', label: 'Terima (Disetujui)' },
                  { value: 'revisi', label: 'Perlu Revisi Usulan' },
                  { value: 'tolak', label: 'Tolak Usulan' },
                ]}
                error={errors.rekomendasi?.message}
              />
            </div>

            {/* Catatan Masukan Reviewer */}
            <div className="col-span-full">
              <Textarea
                label="Catatan & Masukan Kritis Reviewer"
                rows={5}
                placeholder="Ketik uraian evaluasi substansi, masukan perbaikan metode, serta kewajaran alokasi dana RAB..."
                error={errors.catatan_reviewer?.message}
                {...register('catatan_reviewer')}
              />
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS (Atomic UI Kit) */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={submitting}
            icon={<Save size={16} />}
            className="font-bold"
          >
            Simpan Desk Evaluation
          </Button>
        </div>
      </form>
    </div>
  );
}
