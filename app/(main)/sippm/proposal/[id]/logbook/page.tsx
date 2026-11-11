'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  CheckCircle2,
  Clock,
  TrendingUp,
  FlaskConical,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { sippmService } from '@/services/sippm.service';
import type { ProposalKegiatan } from '@/types/sippm.types';
import { useAuth } from '@/hooks/useAuth';

const logbookSchema = z.object({
  tgl_kegiatan: z.string().min(1, 'Tanggal kegiatan wajib diisi'),
  persentase_capaian: z.number().min(1, 'Persentase minimal 1%').max(100, 'Persentase maksimal 100%'),
  uraian_kegiatan: z.string().min(10, 'Uraian kegiatan minimal 10 karakter'),
  hambatan: z.string().optional(),
});

type LogbookFormValues = z.infer<typeof logbookSchema>;

interface LogbookEntry {
  id: number;
  tgl_kegiatan: string;
  persentase_capaian: number;
  uraian_kegiatan: string;
  hambatan?: string;
  status_verifikasi: 'verified' | 'pending';
}

export default function LogbookKegiatanPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const proposalId = Number(resolvedParams.id);
  const { hasPermission } = useAuth();

  // Pure RBAC check (per rbac-refactoring-standard)
  const canAccess = hasPermission('sippm.proposal.read') || hasPermission('sippm.proposal.manage');

  const [proposal, setProposal] = useState<ProposalKegiatan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [logbookEntries, setLogbookEntries] = useState<any[]>([]);

  const fetchLogbooks = async () => {
    try {
      const res = await sippmService.getLogbooks(proposalId);
      if (res?.data) {
        const entries = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
        setLogbookEntries(entries);
      }
    } catch {
      // ignore
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LogbookFormValues>({
    resolver: zodResolver(logbookSchema) as any,
    defaultValues: {
      tgl_kegiatan: new Date().toISOString().split('T')[0],
      persentase_capaian: 75,
      uraian_kegiatan: '',
      hambatan: '',
    },
  });

  useEffect(() => {
    if (!canAccess) return;
    const fetchProposal = async () => {
      try {
        setLoading(true);
        const [resProp, resLog] = await Promise.allSettled([
          sippmService.getProposalDetail(proposalId),
          sippmService.getLogbooks(proposalId),
        ]);
        if (resProp.status === 'fulfilled' && resProp.value.data) {
          setProposal(resProp.value.data);
        }
        if (resLog.status === 'fulfilled' && resLog.value.data) {
          setLogbookEntries(resLog.value.data);
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Gagal memuat logbook riset');
      } finally {
        setLoading(false);
      }
    };
    fetchProposal();
  }, [canAccess, proposalId]);

  const onSubmit = async (data: LogbookFormValues) => {
    try {
      setSubmitting(true);
      const fullUraian = data.hambatan ? `${data.uraian_kegiatan} (Kendala: ${data.hambatan})` : data.uraian_kegiatan;
      await sippmService.storeLogbook(proposalId, {
        tgl_kegiatan: data.tgl_kegiatan,
        tanggal: data.tgl_kegiatan,
        persentase_capaian: data.persentase_capaian,
        uraian_kegiatan: data.uraian_kegiatan,
        hambatan: data.hambatan,
      } as any);
      toast.success('Catatan logbook riset berhasil disimpan ke server');
      setIsModalOpen(false);
      reset();
      await fetchLogbooks();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menambah logbook kegiatan');
    } finally {
      setSubmitting(false);
    }
  };

  // Highest recorded progress percentage
  const maxProgress = logbookEntries.reduce((max, entry) => Math.max(max, entry.persentase_capaian), 0);

  if (!canAccess) {
    return (
      <div className="animate-fade-in space-y-6 max-w-5xl mx-auto pb-12">
        <PageHeader
          title="Logbook Activities & Monev Riset"
          description="Catatan kemajuan pelaksanaan riset harian/mingguan dan verifikasi monev"
          action={
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              Kembali
            </Button>
          }
        />
        <div className="card p-6 text-center">
          <ShieldAlert size={56} className="mx-auto mb-4 opacity-40 text-rose-500" />
          <h2 className="text-xl font-bold mb-2">Akses Ditolak / Dibatasi</h2>
          <p className="max-w-[500px] mx-auto opacity-70">
            Peran Anda saat ini tidak memiliki permission untuk mengelola logbook riset SIPPM.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6 max-w-5xl mx-auto pb-12">
        <PageHeader
          title="Logbook Activities & Monev Riset"
          description="Memuat logbook kegiatan riset..."
          action={
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              Kembali
            </Button>
          }
        />
        <div className="card p-12 text-center text-slate-400">
          Memuat logbook kegiatan riset...
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Logbook Activities & Monev Riset"
        description="Catatan kemajuan pelaksanaan riset harian/mingguan dan verifikasi monev."
        action={
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              Kembali
            </Button>
            <Button
              icon={<Plus size={18} />}
              onClick={() => setIsModalOpen(true)}
            >
              Tambah Catatan Logbook
            </Button>
          </div>
        }
      />

      {/* Header Context Banner */}
      {proposal && (
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <Badge variant="info">
                {proposal.skema?.nama_skema || 'Skema Riset'}
              </Badge>
              <h2 className="text-xl font-extrabold text-slate-900 leading-tight">{proposal.judul}</h2>
              <div className="text-xs text-slate-500 flex items-center gap-3 pt-1">
                <span>Ketua: <strong>{proposal.ketua?.nama_lengkap || 'Dosen Pengusul'}</strong></span>
                <span>•</span>
                <span>Tahun: <strong>{proposal.created_at?.substring(0, 4) || '2026'}</strong></span>
              </div>
            </div>

            {/* Progress Meter */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shrink-0 min-w-56 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-bold">TOTAL KEMAJUAN RISET</span>
                <span className="font-mono font-black">{maxProgress}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
                <div className="h-full bg-slate-700 rounded-full transition-all duration-300" style={{ width: `${maxProgress}%` }}></div>
              </div>
              <div className="text-[11px] text-slate-500 text-center font-medium pt-0.5">
                {maxProgress >= 70 ? '✅ Syarat Monev & Pencairan 30% Terpenuhi' : '⏳ Capai min 70% untuk Termin 2'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logbook History Entries */}
      <div className="card">
        <div className="card-header border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <TrendingUp size={18} /> Riwayat Logbook Progres Kegiatan Lapangan
          </h2>
          <span className="text-xs text-slate-500 font-medium">Total {logbookEntries.length} Catatan Masuk</span>
        </div>
        <div className="card-body p-0">
          {logbookEntries.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Belum ada catatan logbook kegiatan riset. Klik tombol <strong>Tambah Catatan Logbook</strong> untuk mulai mencatat.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logbookEntries.map((entry) => (
                <div key={entry.id} className="p-5 hover:bg-slate-50/70 transition-colors space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="info">{entry.tanggal || entry.tgl_kegiatan}</Badge>
                      <Badge variant="success">Progress: {entry.persentase_capaian}%</Badge>
                    </div>
                    <div>
                      {entry.status_verifikasi === 'verified' ? (
                        <Badge variant="success">
                          <CheckCircle2 size={12} className="mr-1" /> Diverifikasi Reviewer Monev
                        </Badge>
                      ) : (
                        <Badge variant="warning">
                          <Clock size={12} className="mr-1" /> Menunggu Review Monev
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-800 text-sm font-medium leading-relaxed">{entry.uraian_kegiatan}</p>

                  {entry.hambatan && (
                    <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-2">
                      <AlertCircle size={14} className="shrink-0 text-amber-600" />
                      <span><strong>Catatan Kendala:</strong> {entry.hambatan}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL FORM <= 5 INPUTS (Standard Modal per Admin CRUD Rule 8) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Input Catatan Logbook Kegiatan Riset"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input 1: Tanggal Kegiatan */}
            <Input
              label="Tanggal Kegiatan"
              type="date"
              required
              error={errors.tgl_kegiatan?.message}
              {...register('tgl_kegiatan')}
            />

            {/* Input 2: Persentase Capaian (%) */}
            <Input
              label="Capaian Progres (%)"
              type="number"
              required
              placeholder="1 - 100"
              error={errors.persentase_capaian?.message}
              {...register('persentase_capaian', { valueAsNumber: true })}
            />
          </div>

          {/* Input 3: Uraian Kegiatan */}
          <Textarea
            label="Uraian Aktivitas Kemajuan"
            required
            rows={3}
            placeholder="Ketik rincian aktivitas riset, pengumpulan data, pengujian laboratorium..."
            error={errors.uraian_kegiatan?.message}
            {...register('uraian_kegiatan')}
          />

          {/* Input 4: Hambatan / Kendala (Optional) */}
          <Input
            label="Hambatan / Catatan Solusi (Opsional)"
            placeholder="Hambatan alat, akses jurnal, atau kondisi cuaca lapangan..."
            {...register('hambatan')}
          />

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              isLoading={submitting}
              icon={<Plus size={16} />}
            >
              Simpan Logbook
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
