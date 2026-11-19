'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  Search,
  Users,
  Award,
  CheckCircle2,
  AlertTriangle,
  User,
  FlaskConical,
  XCircle,
  FileText,
  ShieldCheck,
  Building2,
  CheckSquare,
  Sparkles,
  Info,
  Filter,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { sippmService } from '@/services/sippm.service';
import { useAuth } from '@/hooks/useAuth';
import type { ProposalKegiatan, RubrikIndikator } from '@/types/sippm.types';
import type { PaginationMeta } from '@/types/api.types';
import toast from 'react-hot-toast';

export default function ReviewerPortalPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Active Tab: 'tahap1' (Kaprodi), 'tahap2' (Admin SIPPM), 'tahap3' (Dual Reviewer Lolos)
  const [activeTab, setActiveTab] = useState<'tahap1' | 'tahap2' | 'tahap3'>('tahap1');

  // Proposal Lists per Stage
  const [tahap1List, setTahap1List] = useState<ProposalKegiatan[]>([]);
  const [tahap2List, setTahap2List] = useState<ProposalKegiatan[]>([]);
  const [tahap3List, setTahap3List] = useState<ProposalKegiatan[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination Meta State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState<PaginationMeta>({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
  });

  // Filter & Search State
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filterOrderBy, setFilterOrderBy] = useState('id');
  const [filterOrderDir, setFilterOrderDir] = useState('desc');
  const [appliedOrderBy, setAppliedOrderBy] = useState('id');
  const [appliedOrderDir, setAppliedOrderDir] = useState('desc');

  // Rubrik Evaluation Modal State
  const [selectedProposal, setSelectedProposal] = useState<ProposalKegiatan | null>(null);
  const [evaluationStage, setEvaluationStage] = useState<'kaprodi' | 'admin'>('kaprodi');
  const [rubriks, setRubriks] = useState<RubrikIndikator[]>([]);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [catatan, setCatatan] = useState('');
  const [submittingEval, setSubmittingEval] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [evalSuccess, setEvalSuccess] = useState<string | null>(null);

  // Fetch Proposals with Server-Side Params
  const fetchAllProposals = useCallback(async () => {
    try {
      setLoading(true);

      const params: any = {
        page,
        limit,
        search: appliedSearch || undefined,
        order_by: appliedOrderBy,
        order_dir: appliedOrderDir,
      };

      const res = await sippmService.getProposals(params);
      const items: ProposalKegiatan[] = Array.isArray(res?.data)
        ? res.data
        : (res?.data as any)?.items || (res?.data as any)?.data || [];

      const responseMeta = (res as any)?.meta || (res?.data as any)?.meta;
      if (responseMeta) {
        setMeta(responseMeta);
      } else {
        setMeta({
          current_page: page,
          per_page: limit,
          total: items.length,
          last_page: Math.ceil(items.length / limit) || 1,
          from: items.length > 0 ? (page - 1) * limit + 1 : 0,
          to: Math.min(page * limit, items.length),
        });
      }

      // Categorize proposals into 3 review stages
      const t1 = items.filter((p) => (p.status as any) === 'diajukan' || (p.status as any) === 'submitted');
      const t2 = items.filter((p) => (p.status as any) === 'disetujui_kaprodi');
      const t3 = items.filter(
        (p) =>
          (p.status as any) === 'disetujui_admin' ||
          (p.status as any) === 'lolos' ||
          (p.status as any) === 'approved'
      );

      setTahap1List(t1);
      setTahap2List(t2);
      setTahap3List(t3);
    } catch (err) {
      console.error('Failed to load proposals for reviewer portal', err);
      toast.error('Gagal memuat antrean proposal reviewer');
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedSearch, appliedOrderBy, appliedOrderDir]);

  useEffect(() => {
    fetchAllProposals();
  }, [fetchAllProposals]);

  // Apply Filter Handler
  const handleApplyFilter = () => {
    setAppliedSearch(search);
    setAppliedOrderBy(filterOrderBy);
    setAppliedOrderDir(filterOrderDir);
    setPage(1);
    setShowFilter(false);
  };

  // Reset Filter Handler
  const handleResetFilter = () => {
    setSearch('');
    setAppliedSearch('');
    setFilterOrderBy('id');
    setFilterOrderDir('desc');
    setAppliedOrderBy('id');
    setAppliedOrderDir('desc');
    setPage(1);
    setShowFilter(false);
  };

  // Open Evaluation Modal for Tahap 1 or Tahap 2
  const handleOpenEvaluationModal = async (proposal: ProposalKegiatan, stage: 'kaprodi' | 'admin') => {
    setSelectedProposal(proposal);
    setEvaluationStage(stage);
    setScores({});
    setCatatan('');
    setEvalError(null);
    setEvalSuccess(null);

    try {
      const res = await sippmService.indexRubrik({ tipe_reviewer: stage });
      const rubrikList = Array.isArray(res?.data)
        ? res.data
        : (res?.data as any)?.items || (res?.data as any)?.data || [];

      setRubriks(rubrikList);

      const initialScores: Record<number, number> = {};
      rubrikList.forEach((r: RubrikIndikator) => {
        initialScores[r.id] = 0;
      });
      setScores(initialScores);
    } catch (err) {
      console.error('Failed to load rubriks for evaluation', err);
      toast.error('Gagal memuat indikator rubrik penilaian');
    }
  };

  // Calculate Weighted Total Score
  const calculateTotalScore = (): number => {
    if (rubriks.length === 0) return 0;
    const totalBobot = rubriks.reduce((acc: number, r: RubrikIndikator) => acc + (r.bobot || 0), 0);

    if (totalBobot > 0) {
      const weightedSum = rubriks.reduce((acc: number, r: RubrikIndikator) => {
        const score = scores[r.id] || 0;
        return acc + score * (r.bobot / totalBobot);
      }, 0);
      return Math.round(weightedSum * 10) / 10;
    } else {
      const sum = rubriks.reduce((acc: number, r: RubrikIndikator) => acc + (scores[r.id] || 0), 0);
      return Math.round((sum / rubriks.length) * 10) / 10;
    }
  };

  const currentTotalScore = calculateTotalScore();
  const isPassing = currentTotalScore > 80;

  // Submit Rubrik Evaluation
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposal) return;

    try {
      setSubmittingEval(true);
      setEvalError(null);

      let nextStatus = '';
      if (evaluationStage === 'kaprodi') {
        nextStatus = isPassing ? 'disetujui_kaprodi' : 'revisi';
      } else {
        nextStatus = isPassing ? 'disetujui_admin' : 'revisi';
      }

      await sippmService.updateProposal(selectedProposal.id, {
        status: nextStatus,
      } as any);

      toast.success(
        `Berhasil menyimpan hasil penilaian Rubrik ${
          evaluationStage === 'kaprodi' ? 'Tahap 1' : 'Tahap 2'
        }! Status: "${nextStatus}".`
      );

      setSelectedProposal(null);
      fetchAllProposals();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyimpan hasil penilaian rubrik';
      setEvalError(msg);
      toast.error(msg);
    } finally {
      setSubmittingEval(false);
    }
  };

  // DataTable Column Definitions
  const columnsTahap1: ColumnDef<ProposalKegiatan>[] = [
    {
      key: 'judul',
      label: 'Judul Proposal Usulan',
      render: (row: ProposalKegiatan) => (
        <div className="space-y-0.5">
          <div className="font-bold text-slate-900 text-xs line-clamp-1">{row.judul}</div>
          <div className="text-2xs text-indigo-700 font-medium">{row.rumpun_ilmu}</div>
        </div>
      ),
    },
    {
      key: 'ketua',
      label: 'Ketua Pengusul & Prodi',
      render: (row: ProposalKegiatan) => (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <User size={14} className="text-slate-400" />
            {row.ketua?.nama_lengkap || (row as any).ketua_pegawai?.nama_lengkap || 'Dosen Pengusul'}
          </div>
          <div className="text-2xs text-slate-400 font-mono">
            NIP: {row.ketua?.nip || (row as any).ketua_pegawai?.nip || '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'skema',
      label: 'Skema & Dana',
      render: (row: ProposalKegiatan) => (
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-slate-700">
            {row.skema?.nama_skema || row.skema?.nama || 'Skema Riset'}
          </div>
          <div className="text-xs font-mono font-bold text-primary-700">
            Rp {(row.dana_diusulkan || (row as any).anggaran_diajukan || 0).toLocaleString('id-ID')}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status Tahap 1',
      render: () => (
        <Badge variant="amber" className="font-bold text-2xs inline-flex items-center gap-1">
          <AlertTriangle size={12} /> Review Kaprodi
        </Badge>
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (row: ProposalKegiatan) => (
        <div className="flex justify-end">
          <DropdownMenu
            items={[
              {
                label: 'Nilai Rubrik Tahap 1',
                icon: <Award size={14} className="text-indigo-600" />,
                onClick: () => handleOpenEvaluationModal(row, 'kaprodi'),
              },
              {
                label: 'Detail Desk Evaluation',
                icon: <FileText size={14} className="text-purple-600" />,
                onClick: () => router.push(`/sippm/reviewer/${row.id}/evaluate`),
              },
              {
                label: 'Lihat Detail Proposal',
                icon: <Eye size={14} />,
                onClick: () => router.push(`/sippm/proposal/${row.id}`),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  const columnsTahap2: ColumnDef<ProposalKegiatan>[] = [
    {
      key: 'judul',
      label: 'Judul Proposal Usulan',
      render: (row: ProposalKegiatan) => (
        <div className="space-y-0.5">
          <div className="font-bold text-slate-900 text-xs line-clamp-1">{row.judul}</div>
          <div className="text-2xs text-purple-700 font-medium">{row.rumpun_ilmu}</div>
        </div>
      ),
    },
    {
      key: 'ketua',
      label: 'Ketua Pengusul & Prodi',
      render: (row: ProposalKegiatan) => (
        <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          <User size={14} className="text-slate-400" />
          {row.ketua?.nama_lengkap || (row as any).ketua_pegawai?.nama_lengkap || 'Dosen Pengusul'}
        </div>
      ),
    },
    {
      key: 'skema',
      label: 'Skema & Dana',
      render: (row: ProposalKegiatan) => (
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-slate-700">
            {row.skema?.nama_skema || row.skema?.nama || 'Skema Riset'}
          </div>
          <div className="text-xs font-mono font-bold text-primary-700">
            Rp {(row.dana_diusulkan || (row as any).anggaran_diajukan || 0).toLocaleString('id-ID')}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Verifikasi Tahap 1',
      render: () => (
        <Badge variant="green" className="font-bold text-2xs inline-flex items-center gap-1">
          <CheckCircle2 size={12} /> Disetujui Kaprodi (&gt; 80)
        </Badge>
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (row: ProposalKegiatan) => (
        <div className="flex justify-end">
          <DropdownMenu
            items={[
              {
                label: 'Nilai Rubrik Tahap 2',
                icon: <ShieldCheck size={14} className="text-purple-600" />,
                onClick: () => handleOpenEvaluationModal(row, 'admin'),
              },
              {
                label: 'Detail Desk Evaluation',
                icon: <FileText size={14} className="text-indigo-600" />,
                onClick: () => router.push(`/sippm/reviewer/${row.id}/evaluate`),
              },
              {
                label: 'Lihat Detail Proposal',
                icon: <Eye size={14} />,
                onClick: () => router.push(`/sippm/proposal/${row.id}`),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  const columnsTahap3: ColumnDef<ProposalKegiatan>[] = [
    {
      key: 'judul',
      label: 'Judul Proposal Usulan',
      render: (row: ProposalKegiatan) => (
        <div className="space-y-0.5">
          <div className="font-bold text-slate-900 text-xs line-clamp-1">{row.judul}</div>
          <div className="text-2xs text-emerald-700 font-medium">{row.rumpun_ilmu}</div>
        </div>
      ),
    },
    {
      key: 'ketua',
      label: 'Ketua Pengusul & Prodi',
      render: (row: ProposalKegiatan) => (
        <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          <User size={14} className="text-slate-400" />
          {row.ketua?.nama_lengkap || (row as any).ketua_pegawai?.nama_lengkap || 'Dosen Pengusul'}
        </div>
      ),
    },
    {
      key: 'skema',
      label: 'Skema & Dana Disetujui',
      render: (row: ProposalKegiatan) => (
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-slate-700">
            {row.skema?.nama_skema || row.skema?.nama || 'Skema Riset'}
          </div>
          <div className="text-xs font-mono font-bold text-emerald-700">
            Rp {(row.dana_disetujui || (row as any).anggaran_disetujui || row.dana_diusulkan || 0).toLocaleString('id-ID')}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status Reviewer',
      render: () => (
        <Badge variant="green" className="font-bold text-2xs inline-flex items-center gap-1">
          <CheckCircle2 size={12} /> Dual Reviewer Lolos (2/2)
        </Badge>
      ),
    },
    {
      key: 'keterangan',
      label: 'Keterangan Persetujuan',
      render: () => (
        <div className="text-xs text-slate-600 font-medium flex items-center gap-1">
          <CheckSquare size={14} className="text-emerald-600" />
          Disetujui Kaprodi & Admin SIPPM
        </div>
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (row: ProposalKegiatan) => (
        <div className="flex justify-end">
          <DropdownMenu
            items={[
              {
                label: 'Lihat Detail Proposal',
                icon: <Eye size={14} />,
                onClick: () => router.push(`/sippm/proposal/${row.id}`),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header (Atomic Standard) */}
      <PageHeader
        title="Portal Reviewer & Verifikator Proposal"
        description="Penilaian bertahap indikator Keilmuan & Linieritas (Tahap 1 Kaprodi) dan Administrasi & Kelayakan Kelompok (Tahap 2 Admin SIPPM)."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIPPM', href: '/sippm' },
          { label: 'Portal Reviewer' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => setShowFilter(true)}
              className="font-bold"
            >
              Filter
            </Button>
          </div>
        }
      />

      {/* 3 STAGE TABS (Tahap 1, Tahap 2, Tahap 3) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab('tahap1');
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'tahap1'
              ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 size={16} />
          <span>Tahap 1: Review Kaprodi</span>
          <Badge variant={activeTab === 'tahap1' ? 'blue' : 'gray'} className="text-2xs">
            {tahap1List.length}
          </Badge>
        </button>

        <button
          onClick={() => {
            setActiveTab('tahap2');
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'tahap2'
              ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck size={16} />
          <span>Tahap 2: Review Admin SIPPM</span>
          <Badge variant={activeTab === 'tahap2' ? 'blue' : 'gray'} className="text-2xs">
            {tahap2List.length}
          </Badge>
        </button>

        <button
          onClick={() => {
            setActiveTab('tahap3');
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'tahap3'
              ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 size={16} />
          <span>Tahap 3: Proposal Lolos Dual Reviewer</span>
          <Badge variant={activeTab === 'tahap3' ? 'blue' : 'gray'} className="text-2xs">
            {tahap3List.length}
          </Badge>
        </button>
      </div>

      {/* Threshold Information Card */}
      <div className="card p-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 border-slate-200">
        <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
          <Info size={16} className="text-primary-600 shrink-0" />
          <span>
            Batas Minimal Kelulusan Skor per Tahap: <strong className="text-slate-900 font-bold">&gt; 80 / 100</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="blue">Tahap 1: Linieritas Prodi</Badge>
          <Badge variant="purple">Tahap 2: Administrasi SIPPM</Badge>
        </div>
      </div>

      {/* TAB CONTENTS (DataTable + Server-Side Pagination) */}
      {activeTab === 'tahap1' && (
        <DataTable
          columns={columnsTahap1}
          data={tahap1List}
          isLoading={loading}
          meta={meta}
          onPageChange={(newPage) => setPage(newPage)}
        />
      )}

      {activeTab === 'tahap2' && (
        <DataTable
          columns={columnsTahap2}
          data={tahap2List}
          isLoading={loading}
          meta={meta}
          onPageChange={(newPage) => setPage(newPage)}
        />
      )}

      {activeTab === 'tahap3' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
            <Sparkles size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Informasi Alur Tahap 3 (Final Approved)</strong>: Seluruh proposal pada tab ini dinyatakan{' '}
              <strong>Disetujui oleh Kaprodi (Tahap 1)</strong> dan <strong>Disetujui oleh Admin SIPPM (Tahap 2)</strong>.
            </div>
          </div>

          <DataTable
            columns={columnsTahap3}
            data={tahap3List}
            isLoading={loading}
            meta={meta}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      )}

      {/* FILTER DRAWER SLIDE RIGHT-TO-LEFT */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter & Urutkan Data Proposal"
      >
        <div className="space-y-4">
          <Input
            label="Cari Proposal / Pengusul"
            placeholder="Ketik judul proposal atau nama dosen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <hr style={{ borderTop: '1px solid var(--border-light)', margin: '0.5rem 0' }} />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              value={filterOrderBy}
              onChange={(val) => setFilterOrderBy(val)}
              options={[
                { value: 'id', label: 'ID Proposal' },
                { value: 'judul', label: 'Judul Proposal' },
                { value: 'created_at', label: 'Tanggal Pengajuan' },
              ]}
            />
            <Select
              label="Arah"
              value={filterOrderDir}
              onChange={(val) => setFilterOrderDir(val)}
              options={[
                { value: 'desc', label: 'Z - A (Terbaru)' },
                { value: 'asc', label: 'A - Z (Terlama)' },
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              icon={<RotateCcw size={14} />}
              onClick={handleResetFilter}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              icon={<Filter size={14} />}
              onClick={handleApplyFilter}
            >
              Terapkan Filter
            </Button>
          </div>
        </div>
      </Drawer>

      {/* FORM SCORING RUBRIK MODAL (UI KIT COMPLIANT) */}
      <Modal
        open={Boolean(selectedProposal)}
        onClose={() => setSelectedProposal(null)}
        title={`Form Penilaian Rubrik Proposal — ${
          evaluationStage === 'kaprodi' ? 'Tahap 1 (Kaprodi)' : 'Tahap 2 (Admin SIPPM)'
        }`}
        size="lg"
      >
        {selectedProposal && (
          <div className="space-y-4">
            {/* Context Box Proposal */}
            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 space-y-1 text-xs">
              <div className="font-extrabold text-slate-900">{selectedProposal.judul}</div>
              <div className="text-slate-600 flex items-center gap-3 flex-wrap">
                <span>
                  Ketua:{' '}
                  <strong>
                    {selectedProposal.ketua?.nama_lengkap ||
                      (selectedProposal as any).ketua_pegawai?.nama_lengkap ||
                      'Dosen Pengusul'}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Prodi: <strong>{selectedProposal.rumpun_ilmu}</strong>
                </span>
              </div>
            </div>

            {evalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                <XCircle size={16} /> {evalError}
              </div>
            )}

            {evalSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 size={16} /> {evalSuccess}
              </div>
            )}

            <form onSubmit={handleSaveEvaluation} className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Indikator Penilaian Rubrik ({rubriks.length} Indikator Terdaftar)
                </h3>

                {rubriks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                    Memuat indikator rubrik dari Master Data...
                  </div>
                ) : (
                  rubriks.map((rub) => (
                    <div key={rub.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                            {rub.nama_indikator}
                            <Badge variant="gray" className="text-2xs font-mono">
                              Bobot: {rub.bobot}%
                            </Badge>
                          </div>
                          {rub.deskripsi && <div className="text-2xs text-slate-500 mt-0.5">{rub.deskripsi}</div>}
                        </div>
                        <div className="w-32 shrink-0">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={scores[rub.id] ?? ''}
                            onChange={(e) =>
                              setScores({
                                ...scores,
                                [rub.id]: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                              })
                            }
                            required
                            className="text-right font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Total Live Score Summary Highlight */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  isPassing
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide">TOTAL SKOR AKHIR RUBRIK</div>
                  <div className="text-xs mt-0.5">
                    {isPassing ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 size={14} /> Lolos Reviewer (Skor &gt; 80) — Proposal Lanjut ke Tahap Berikutnya
                      </span>
                    ) : (
                      <span className="text-rose-700 font-bold flex items-center gap-1">
                        <XCircle size={14} /> Belum Memenuhi Batas Minimal (&le; 80) — Proposal Perlu Revisi
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-3xl font-extrabold font-mono">{currentTotalScore} / 100</div>
              </div>

              {/* Catatan Tambahan Reviewer */}
              <Textarea
                label="Catatan & Masukan Reviewer"
                rows={3}
                placeholder="Ketik catatan evaluasi keilmuan, linieritas, atau catatan administrasi kelompok..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setSelectedProposal(null)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={submittingEval}
                  className="font-bold"
                >
                  Simpan &amp; Tetapkan Status Proposal
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
