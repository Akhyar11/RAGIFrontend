'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Send,
  FlaskConical,
  DollarSign,
  FileText,
  Users,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SippmBadge } from '@/components/sippm/SippmBadge';
import { sippmService } from '@/services/sippm.service';
import type { ProposalKegiatan } from '@/types/sippm.types';
import { useAuth } from '@/hooks/useAuth';

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { hasPermission } = useAuth();

  // Pure RBAC check (per rbac-refactoring-standard)
  const canRead = hasPermission('sippm.proposal.read') || hasPermission('sippm.proposal.manage');
  const canEdit = hasPermission('sippm.proposal.create') || hasPermission('sippm.proposal.manage');

  const [proposal, setProposal] = useState<ProposalKegiatan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canRead) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await sippmService.getProposalDetail(Number(resolvedParams.id));
        if (res.data) setProposal(res.data);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Gagal memuat detail proposal');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [canRead, resolvedParams.id]);

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submittingProposal, setSubmittingProposal] = useState(false);

  const handleSubmitProposal = () => {
    setShowSubmitConfirm(true);
  };

  const executeSubmitProposal = async () => {
    if (!proposal) return;
    try {
      setSubmittingProposal(true);
      await sippmService.submitProposal(proposal.id);
      toast.success('Proposal berhasil diajukan ke LPPM');
      router.refresh();
      const res = await sippmService.getProposalDetail(proposal.id);
      if (res.data) setProposal(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengajukan proposal');
    } finally {
      setSubmittingProposal(false);
      setShowSubmitConfirm(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  if (!canRead) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader
          title="Rincian Proposal Usulan SIPPM"
          description="Detail lengkap usulan hibah penelitian dan pengabdian masyarakat"
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
            Peran Anda saat ini tidak memiliki permission untuk melihat rincian proposal SIPPM.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6 max-w-5xl mx-auto pb-12">
        <PageHeader
          title="Rincian Proposal Usulan SIPPM"
          description="Memuat detail proposal usulan..."
          action={
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              Kembali
            </Button>
          }
        />
        <div className="card p-12 text-center text-slate-400">
          Memuat detail proposal usulan...
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="animate-fade-in space-y-6 max-w-5xl mx-auto pb-12">
        <PageHeader
          title="Rincian Proposal Usulan SIPPM"
          description="Data proposal tidak ditemukan"
          action={
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              Kembali
            </Button>
          }
        />
        <div className="card p-12 text-center space-y-4">
          <div className="text-slate-500 font-medium">Data proposal tidak ditemukan.</div>
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            Kembali ke Daftar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title={proposal.judul}
        description={`ID Proposal: #${proposal.id} • Rumpun Ilmu: ${proposal.rumpun_ilmu}`}
        action={
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              Kembali
            </Button>
            {proposal.status === 'draft' && canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Edit size={16} />}
                  onClick={() => router.push(`/sippm/proposal/${proposal.id}/edit`)}
                >
                  Edit Proposal
                </Button>
                <Button
                  size="sm"
                  icon={<Send size={16} />}
                  onClick={handleSubmitProposal}
                >
                  Submit Proposal
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Status Badge Container */}
      <div className="flex items-center gap-2">
        <SippmBadge status={proposal.status} />
        <Badge variant="gray">Status Terverifikasi Sistem</Badge>
      </div>

      {/* Main Info Card */}
      <div className="card">
        <div className="card-body grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-slate-400 font-semibold mb-1">SKEMA KEGIATAN</div>
            <div className="font-bold text-primary-800 text-sm flex items-center gap-1.5">
              <FlaskConical size={16} className="text-primary-600" />
              {proposal.skema?.nama_skema || proposal.skema?.nama || 'Skema Riset'}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 font-semibold mb-1">RUMPUN ILMU</div>
            <div className="font-bold text-slate-800 text-sm">{proposal.rumpun_ilmu}</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 font-semibold mb-1">DANA DIUSULKAN</div>
            <div className="font-extrabold text-primary-700 text-sm flex items-center gap-1">
              <DollarSign size={16} />
              {formatRupiah(proposal.dana_diusulkan || (proposal as any).anggaran_diajukan || 0)}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 font-semibold mb-1">DANA DISETUJUI</div>
            <div className="font-extrabold text-emerald-700 text-sm">
              {proposal.dana_disetujui || (proposal as any).anggaran_disetujui
                ? formatRupiah(proposal.dana_disetujui || (proposal as any).anggaran_disetujui)
                : 'Belum ditetapkan'}
            </div>
          </div>
        </div>
      </div>

      {/* Abstrak Card */}
      <div className="card">
        <div className="card-header border-b px-6 py-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <FileText size={18} className="text-primary-600" /> Abstrak Usulan
          </h2>
        </div>
        <div className="card-body p-6">
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
            {proposal.abstrak}
          </p>
        </div>
      </div>

      {/* Tim Anggota Card */}
      <div className="card">
        <div className="card-header border-b px-6 py-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Users size={18} className="text-primary-600" /> Tim Ketua & Anggota
          </h2>
        </div>
        <div className="card-body p-6 space-y-3">
          {/* Ketua */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-700 text-white font-extrabold flex items-center justify-center text-sm">
                K
              </div>
              <div>
                <div className="font-extrabold text-slate-900 text-sm">
                  {proposal.ketua?.nama_lengkap || (proposal as any).ketua_pegawai?.nama_lengkap || 'Ketua Pengusul'}
                </div>
                <div className="text-xs text-primary-700 font-medium">Ketua Tim • NIP: {proposal.ketua?.nip || (proposal as any).ketua_pegawai?.nip || '-'}</div>
              </div>
            </div>
            <Badge variant="blue">Ketua Pengusul</Badge>
          </div>

          {/* Anggota */}
          {proposal.anggota && proposal.anggota.length > 0 ? (
            proposal.anggota.map((ang) => (
              <div key={ang.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                    A
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{ang.nama || (ang.pegawai ? ang.pegawai.nama_lengkap : 'Anggota Tim')}</div>
                    <div className="text-xs text-slate-500">{ang.tugas || ang.tugas_kegiatan || 'Anggota Tim'}</div>
                  </div>
                </div>
                <Badge variant="gray">{(ang.peran || ang.peran_dalam_tim || 'anggota').replace(/_/g, ' ')}</Badge>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400 italic">Belum ada anggota tim terdaftar.</div>
          )}
        </div>
      </div>

      {/* Confirm Dialog for Submit Proposal */}
      <ConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={executeSubmitProposal}
        title="Ajukan Proposal ke LPPM"
        message="Apakah Anda yakin ingin mengajukan proposal ini ke LPPM? Setelah diajukan, usulan akan masuk tahap review dan seleksi."
        confirmText="Ya, Ajukan"
        variant="primary"
        isLoading={submittingProposal}
      />
    </div>
  );
}
