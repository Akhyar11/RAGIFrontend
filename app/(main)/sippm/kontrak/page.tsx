'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FileCheck,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  DollarSign,
  Calendar,
  FileText,
  User,
  Award,
  Filter,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { sippmService } from '@/services/sippm.service';
import type { KontrakKegiatan, ProposalKegiatan } from '@/types/sippm.types';
import type { PaginationMeta } from '@/types/api.types';
import toast from 'react-hot-toast';

const kontrakSchema = z.object({
  proposal_kegiatan_id: z.number().min(1, 'Pilih proposal usulan'),
  nomor_kontrak: z.string().min(5, 'Nomor kontrak minimal 5 karakter'),
  nominal_disetujui: z.number().min(1000000, 'Nominal disetujui minimal Rp 1.000.000'),
  tgl_mulai: z.string().min(1, 'Tanggal mulai wajib diisi'),
  tgl_selesai: z.string().min(1, 'Tanggal selesai wajib diisi'),
});

type KontrakFormValues = z.infer<typeof kontrakSchema>;

interface CombinedKontrakRow {
  id: string;
  type: 'pending' | 'contracted';
  proposal_id: number;
  nomor_kontrak: string;
  judul_proposal: string;
  ketua_pengusul: string;
  jangka_waktu: string;
  dana_diusulkan: number | null;
  dana_disetujui: number | null;
  status_kontrak: string;
  rawProposal?: ProposalKegiatan;
  rawKontrak?: KontrakKegiatan;
}

export default function KontrakPage() {
  const router = useRouter();
  const [kontrakList, setKontrakList] = useState<KontrakKegiatan[]>([]);
  const [proposalTahap3, setProposalTahap3] = useState<ProposalKegiatan[]>([]);
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProp, setSelectedProp] = useState<ProposalKegiatan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<KontrakFormValues>({
    resolver: zodResolver(kontrakSchema) as any,
    defaultValues: {
      proposal_kegiatan_id: 0,
      nomor_kontrak: `001/LPPM/SPK/${new Date().getFullYear()}`,
      nominal_disetujui: 25000000,
      tgl_mulai: `${new Date().getFullYear()}-09-01`,
      tgl_selesai: `${new Date().getFullYear() + 1}-02-28`,
    },
  });

  const selectedPropId = watch('proposal_kegiatan_id');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resKontrak, resProp] = await Promise.all([
        sippmService.indexKontrak(),
        sippmService.getProposals({
          page,
          per_page: limit,
          search: appliedSearch || undefined,
          order_by: appliedOrderBy,
          order_dir: appliedOrderDir,
        } as any),
      ]);

      let contracts: KontrakKegiatan[] = [];
      if (resKontrak.data) {
        contracts = Array.isArray(resKontrak.data) ? resKontrak.data : (resKontrak.data as any).data || [];
        setKontrakList(contracts);
      }

      if (resProp.data) {
        const items: ProposalKegiatan[] = Array.isArray(resProp.data)
          ? resProp.data
          : (resProp.data as any).items || (resProp.data as any).data || [];

        const t3 = items.filter(
          (p) =>
            (p.status as any) === 'disetujui_admin' ||
            (p.status as any) === 'lolos' ||
            (p.status as any) === 'approved'
        );
        setProposalTahap3(t3);
      }

      const responseMeta = (resProp as any)?.meta || (resProp?.data as any)?.meta;
      if (responseMeta) {
        setMeta(responseMeta);
      } else {
        setMeta({
          current_page: page,
          per_page: limit,
          total: kontrakList.length + proposalTahap3.length,
          last_page: 1,
          from: 1,
          to: kontrakList.length + proposalTahap3.length,
        });
      }
    } catch (err) {
      console.error('Failed to load kontrak data', err);
      toast.error('Gagal memuat data penetapan kontrak hibah');
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedSearch, appliedOrderBy, appliedOrderDir]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Build Unified Single Table Rows
  const buildCombinedRows = (): CombinedKontrakRow[] => {
    const contractedPropIds = new Set(kontrakList.map((k) => (k as any).proposal_id || k.proposal?.id));
    const rows: CombinedKontrakRow[] = [];

    // 1. Pending Proposals from Tahap 3 (not yet contracted)
    proposalTahap3.forEach((p) => {
      if (!contractedPropIds.has(p.id)) {
        rows.push({
          id: `prop-${p.id}`,
          type: 'pending',
          proposal_id: p.id,
          nomor_kontrak: '-',
          judul_proposal: p.judul,
          ketua_pengusul: p.ketua?.nama_lengkap || (p as any).ketua_pegawai?.nama_lengkap || '-',
          jangka_waktu: '-',
          dana_diusulkan: p.dana_diusulkan || (p as any).anggaran_diajukan || null,
          dana_disetujui: null,
          status_kontrak: 'Tahap 3 Lolos (Belum Terbit SPK)',
          rawProposal: p,
        });
      }
    });

    // 2. Existing Issued Contracts
    kontrakList.forEach((k) => {
      const p = k.proposal;
      rows.push({
        id: `kontrak-${k.id}`,
        type: 'contracted',
        proposal_id: (k as any).proposal_id || k.proposal?.id || 0,
        nomor_kontrak: k.nomor_kontrak || '-',
        judul_proposal: p?.judul || 'Proposal Usulan',
        ketua_pengusul: p?.ketua?.nama_lengkap || (p as any)?.ketua_pegawai?.nama_lengkap || '-',
        jangka_waktu: k.tgl_mulai && k.tgl_selesai ? `${k.tgl_mulai} s.d ${k.tgl_selesai}` : '-',
        dana_diusulkan: p?.dana_diusulkan || (p as any)?.anggaran_diajukan || null,
        dana_disetujui: (k as any).dana_disetujui || k.nominal_dana || null,
        status_kontrak: k.is_signed ? 'Kontrak Tertandatangani' : 'SPK Diterbitkan',
        rawProposal: p,
        rawKontrak: k,
      });
    });

    return rows;
  };

  const combinedRows = buildCombinedRows();

  // Filtered Rows
  const filteredRows = combinedRows.filter(
    (row) =>
      row.nomor_kontrak.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      row.judul_proposal.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      row.ketua_pengusul.toLowerCase().includes(appliedSearch.toLowerCase())
  );

  // Open Modal for Setting Nominal & Issuing SPK
  const handleOpenCreateModal = (proposal?: ProposalKegiatan) => {
    if (proposal) {
      setSelectedProp(proposal);
      setValue('proposal_kegiatan_id', proposal.id);
      setValue('nominal_disetujui', proposal.dana_diusulkan || (proposal as any).anggaran_diajukan || 25000000);
      setValue('nomor_kontrak', `SPK/LPPM/${new Date().getFullYear()}/${String(proposal.id).padStart(3, '0')}`);
    } else {
      setSelectedProp(null);
      setValue('proposal_kegiatan_id', 0);
      setValue('nominal_disetujui', 25000000);
      setValue('nomor_kontrak', `001/LPPM/SPK/${new Date().getFullYear()}`);
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (data: KontrakFormValues) => {
    try {
      setSubmitting(true);

      await sippmService.storeKontrak(data.proposal_kegiatan_id, {
        nomor_kontrak: data.nomor_kontrak,
        dana_disetujui: data.nominal_disetujui,
        tgl_mulai: data.tgl_mulai,
        tgl_selesai: data.tgl_selesai,
      });

      await sippmService.updateProposal(data.proposal_kegiatan_id, {
        dana_disetujui: data.nominal_disetujui,
        status: 'lolos',
      } as any);

      toast.success(
        `Kontrak SPK (${data.nomor_kontrak}) berhasil diterbitkan! Nominal: ${formatRupiah(data.nominal_disetujui)}.`
      );

      setIsModalOpen(false);
      reset();
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menerbitkan kontrak hibah. Periksa inputan form.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (val: number | null) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  // DataTable Column Definitions
  const columns: ColumnDef<CombinedKontrakRow>[] = [
    {
      key: 'nomor_kontrak',
      label: 'No Kontrak',
      render: (row: CombinedKontrakRow) => (
        <span className="font-mono text-xs font-bold text-slate-900">
          {row.nomor_kontrak !== '-' ? (
            <span className="text-amber-800">{row.nomor_kontrak}</span>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </span>
      ),
    },
    {
      key: 'judul_proposal',
      label: 'Judul Proposal Usulan',
      render: (row: CombinedKontrakRow) => (
        <div className="font-bold text-slate-900 text-xs line-clamp-1">{row.judul_proposal}</div>
      ),
    },
    {
      key: 'ketua_pengusul',
      label: 'Ketua Pengusul',
      render: (row: CombinedKontrakRow) => (
        <div className="text-xs text-slate-700 font-semibold">{row.ketua_pengusul}</div>
      ),
    },
    {
      key: 'jangka_waktu',
      label: 'Jangka Waktu',
      render: (row: CombinedKontrakRow) => (
        <div className="text-xs text-slate-600 font-mono font-medium">{row.jangka_waktu}</div>
      ),
    },
    {
      key: 'dana_diusulkan',
      label: 'Dana Diusulkan',
      render: (row: CombinedKontrakRow) => (
        <span className="font-bold text-primary-700 text-xs">{formatRupiah(row.dana_diusulkan)}</span>
      ),
    },
    {
      key: 'dana_disetujui',
      label: 'Dana Disetujui',
      render: (row: CombinedKontrakRow) => (
        <span className="font-extrabold text-emerald-700 text-xs">{formatRupiah(row.dana_disetujui)}</span>
      ),
    },
    {
      key: 'status_kontrak',
      label: 'Status Kontrak',
      render: (row: CombinedKontrakRow) =>
        row.type === 'pending' ? (
          <Badge variant="amber" className="font-bold text-2xs">
            Belum Terbit SPK
          </Badge>
        ) : (
          <Badge variant="green" className="font-bold text-2xs inline-flex items-center gap-1">
            <CheckCircle2 size={12} /> {row.status_kontrak}
          </Badge>
        ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (row: CombinedKontrakRow) => (
        <div className="flex justify-end">
          <DropdownMenu
            items={[
              ...(row.type === 'pending' && row.rawProposal
                ? [
                    {
                      label: 'Tetapkan & Terbitkan SPK',
                      icon: <DollarSign size={14} className="text-emerald-600" />,
                      onClick: () => handleOpenCreateModal(row.rawProposal),
                    },
                  ]
                : []),
              {
                label: 'Lihat Detail Proposal',
                icon: <Eye size={14} />,
                onClick: () => router.push(`/sippm/proposal/${row.proposal_id}`),
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
        title="Penetapan Nominal Disetujui & Kontrak Hibah SPK"
        description="Tabel terintegrasi penetapan nominal hibah disetujui dan penerbitan SPK untuk seluruh proposal Tahap 3."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIPPM', href: '/sippm' },
          { label: 'Kontrak SPK' },
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
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => handleOpenCreateModal()}
              className="font-bold"
            >
              Terbitkan Kontrak Manual
            </Button>
          </div>
        }
      />

      {/* DataTable Component */}
      <DataTable
        columns={columns}
        data={filteredRows}
        isLoading={loading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
      />

      {/* FILTER DRAWER SLIDE RIGHT-TO-LEFT */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter & Urutkan Kontrak SPK"
      >
        <div className="space-y-4">
          <Input
            label="Cari No Kontrak / Proposal / Ketua"
            placeholder="Ketik no kontrak, judul proposal, atau nama ketua..."
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
                { value: 'id', label: 'ID Kontrak' },
                { value: 'nomor_kontrak', label: 'Nomor SPK' },
                { value: 'created_at', label: 'Tanggal Penerbitan' },
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

      {/* MODAL FORM PENETAPAN NOMINAL & KONTRAK SPK (UI KIT & GRID 2 KOLOM) */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Penetapan Nominal & Terbitkan SPK"
        size="lg"
      >
        <div className="space-y-4">
          {selectedProp && (
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-1">
              <div className="font-extrabold text-slate-900">{selectedProp.judul}</div>
              <div className="text-slate-700 flex items-center gap-3">
                <span>
                  Dana Diusulkan Dosen:{' '}
                  <strong className="text-primary-800 font-bold">
                    {formatRupiah(selectedProp.dana_diusulkan || (selectedProp as any).anggaran_diajukan || 0)}
                  </strong>
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Select
              label="Pilih Proposal Tahap 3 Disetujui"
              value={selectedPropId}
              onChange={(val) => {
                const idNum = Number(val);
                setValue('proposal_kegiatan_id', idNum);
                const found = proposalTahap3.find((p) => p.id === idNum);
                if (found) {
                  setSelectedProp(found);
                  setValue('nominal_disetujui', found.dana_diusulkan || (found as any).anggaran_diajukan || 25000000);
                  setValue('nomor_kontrak', `SPK/LPPM/${new Date().getFullYear()}/${String(found.id).padStart(3, '0')}`);
                }
              }}
              options={[
                { value: 0, label: '-- Pilih Proposal Tahap 3 --' },
                ...proposalTahap3.map((p) => ({
                  value: p.id,
                  label: `${p.judul} (Diusulkan: ${formatRupiah(p.dana_diusulkan || (p as any).anggaran_diajukan || 0)})`,
                })),
              ]}
              error={errors.proposal_kegiatan_id?.message}
            />

            {/* Grid 2 Kolom per crud-ui-standard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nomor Surat SPK Kontrak"
                placeholder="001/LPPM/SPK/2026"
                error={errors.nomor_kontrak?.message}
                {...register('nomor_kontrak')}
                className="font-mono text-xs"
              />

              <Input
                label="Nominal Dana Disetujui (Rp)"
                type="number"
                placeholder="25000000"
                error={errors.nominal_disetujui?.message}
                {...register('nominal_disetujui', { valueAsNumber: true })}
                className="font-bold text-emerald-800 text-xs"
              />

              <Input
                label="Tanggal Mulai SPK"
                type="date"
                error={errors.tgl_mulai?.message}
                {...register('tgl_mulai')}
              />

              <Input
                label="Tanggal Selesai SPK"
                type="date"
                error={errors.tgl_selesai?.message}
                {...register('tgl_selesai')}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={submitting}
                className="font-bold"
              >
                Tetapkan Nominal &amp; Terbitkan SPK
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
