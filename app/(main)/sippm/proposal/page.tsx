'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FilePlus, Filter, Search, Eye, Edit, Send, Users, ShieldAlert, User, Shield, UserCheck, FlaskConical } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { SippmBadge } from '@/components/sippm/SippmBadge';
import { sippmService } from '@/services/sippm.service';
import { simpegService } from '@/services/simpeg.service';
import type { ProposalKegiatan, StatusProposal, JenisKegiatan } from '@/types/sippm.types';
import type { PaginationMeta } from '@/types/api.types';
import { useAuth } from '@/hooks/useAuth';

export default function ProposalListPage() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();

  // Pure RBAC checks (per rbac-refactoring-standard)
  const canRead = hasPermission('sippm.proposal.read') || hasPermission('sippm.proposal.manage');
  const canCreate = hasPermission('sippm.proposal.create') || hasPermission('sippm.proposal.manage');
  const isLppmAdmin = hasPermission('sippm.proposal.manage') || hasPermission('sippm.reviewer.assign');

  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<ProposalKegiatan[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();

  // Filter Drawer & Pagination state
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDosen, setFilterDosen] = useState<string>('all');
  const [selectedDosenOption, setSelectedDosenOption] = useState<any>(null);
  const [filterOrderBy, setFilterOrderBy] = useState('created_at');
  const [filterOrderDir, setFilterOrderDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const fetchProposals = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const params: any = {
        page,
        per_page: limit,
        search: search || undefined,
        jenis_kegiatan: filterJenis !== 'all' ? (filterJenis as JenisKegiatan) : undefined,
        status: filterStatus !== 'all' ? (filterStatus as StatusProposal) : undefined,
        sort_by: filterOrderBy,
        sort_dir: filterOrderDir,
      };

      const res: any = await sippmService.getProposals(params);
      if (res?.data) {
        const dataItems = Array.isArray(res.data.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.items || [];
        setProposals(dataItems);
        if (res.data.meta) setMeta(res.data.meta);
        else if (res.meta) setMeta(res.meta);
      } else if (Array.isArray(res)) {
        setProposals(res);
      } else {
        setProposals([]);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memuat daftar proposal');
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, [canRead, page, limit, search, filterJenis, filterStatus, filterOrderBy, filterOrderDir]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const loadDosenOptions = useCallback(async (inputValue: string) => {
    try {
      const res = await simpegService.getPegawaiList({ search: inputValue || undefined, jenis_pegawai: 'dosen' });
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
      return [
        { value: 'all', label: 'Semua Dosen Pengusul' },
        ...list.map((d: any) => ({
          value: d.id.toString(),
          label: `${d.nama_lengkap || d.name} (${d.unit_kerja?.nama || 'Dosen'})`,
        })),
      ];
    } catch (err) {
      return [{ value: 'all', label: 'Semua Dosen Pengusul' }];
    }
  }, []);

  const [confirmSubmitId, setConfirmSubmitId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitProposal = (id: number) => {
    setConfirmSubmitId(id);
  };

  const executeSubmitProposal = async () => {
    if (!confirmSubmitId) return;
    try {
      setSubmitting(true);
      await sippmService.submitProposal(confirmSubmitId);
      toast.success('Proposal berhasil diajukan ke LPPM');
      fetchProposals();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengajukan proposal');
    } finally {
      setSubmitting(false);
      setConfirmSubmitId(null);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  // Scoped list filtering (dosen mode vs admin mode)
  const displayedProposals = proposals.filter((p) => {
    if (!isLppmAdmin) {
      const isMine =
        p.dosen_ketua_id === user?.id ||
        p.ketua?.nip === user?.username ||
        ((user as any)?.nama_lengkap && p.ketua?.nama_lengkap && p.ketua.nama_lengkap.toLowerCase().includes((user as any).nama_lengkap.toLowerCase()));
      if (!isMine) return false;
    }

    if (isLppmAdmin && filterDosen !== 'all') {
      const matchesDosen =
        p.dosen_ketua_id === Number(filterDosen) ||
        p.ketua?.nama_lengkap === filterDosen;
      if (!matchesDosen) return false;
    }

    return true;
  });

  const columns: ColumnDef<ProposalKegiatan>[] = [
    {
      key: 'judul',
      label: 'Judul Proposal & Skema',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900 line-clamp-1">{row.judul}</div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span className="font-medium text-primary-700">{row.skema?.nama_skema || row.skema?.nama || 'Skema Riset'}</span>
            <span>•</span>
            <span className="capitalize">{row.rumpun_ilmu}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'ketua',
      label: 'Ketua Pengusul',
      render: (row) => (
        <div>
          <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <User size={14} className="text-slate-400" />
            {row.ketua?.nama_lengkap || 'Dosen Pengusul'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{row.ketua?.nip || 'NIP Verified'}</div>
        </div>
      ),
    },
    {
      key: 'anggaran_diajukan',
      label: 'Dana Diusulkan',
      render: (row) => (
        <span className="font-bold text-primary-700 text-sm">
          {formatRupiah(row.anggaran_diajukan ?? row.dana_diusulkan ?? 0)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <SippmBadge status={row.status} />,
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (row) => {
        const menuItems: DropdownMenuItem[] = [
          {
            label: 'Detail Proposal',
            icon: <Eye size={14} />,
            onClick: () => router.push(`/sippm/proposal/${row.id}`),
          },
        ];

        if (isLppmAdmin && row.status === 'submitted') {
          menuItems.push({
            label: 'Plot Reviewer',
            icon: <Users size={14} />,
            onClick: () => router.push(`/sippm/reviewer`),
          });
        }

        if (row.status === 'draft') {
          menuItems.push({
            label: 'Edit Proposal',
            icon: <Edit size={14} />,
            onClick: () => router.push(`/sippm/proposal/${row.id}/edit`),
          });
          menuItems.push({
            label: 'Ajukan ke LPPM',
            icon: <Send size={14} />,
            onClick: () => handleSubmitProposal(row.id),
          });
        }

        return (
          <div className="flex justify-end">
            <DropdownMenu items={menuItems} />
          </div>
        );
      },
    },
  ];

  if (!canRead) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader
          title="Proposal Usulan Riset & PkM"
          description="Daftar pengajuan proposal usulan hibah penelitian dan pengabdian masyarakat"
        />
        <div className="card p-6 text-center">
          <ShieldAlert size={56} className="mx-auto mb-4 opacity-40" />
          <h2 className="text-xl font-bold mb-2">Akses Ditolak / Dibatasi</h2>
          <p className="max-w-[500px] mx-auto opacity-70">
            Peran Anda saat ini tidak memiliki permission untuk melihat Modul Proposal SIPPM.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Proposal Usulan Riset & PkM"
        description={
          isLppmAdmin
            ? 'Panel Admin LPPM untuk mengelola, meninjau, dan memplot reviewer proposal seluruh dosen.'
            : 'Daftar pengajuan proposal usulan hibah penelitian dan pengabdian masyarakat milik Anda.'
        }
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => setShowFilter(true)}
            >
              Filter
            </Button>
            {canCreate && (
              <Button icon={<FilePlus size={16} />} onClick={() => router.push('/sippm/proposal/create')}>
                Buat Proposal Baru
              </Button>
            )}
          </div>
        }
      />

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={displayedProposals}
        isLoading={loading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        emptyMessage={
          <div className="py-8 text-center opacity-70">
            <FlaskConical size={48} className="mx-auto mb-4 opacity-40" />
            <p>Tidak ada proposal usulan yang cocok.</p>
          </div>
        }
      />

      {/* Filter Drawer Slide Right-to-Left */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter & Urutkan Proposal"
      >
        <div className="space-y-4">
          <Input
            label="Pencarian Judul / Pengusul"
            placeholder="Cari proposal..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          {isLppmAdmin && (
            <AsyncSelect
              label="Filter Dosen Pengusul"
              placeholder="Cari & pilih dosen pengusul..."
              loadOptions={loadDosenOptions}
              value={
                filterDosen === 'all'
                  ? { value: 'all', label: 'Semua Dosen Pengusul' }
                  : selectedDosenOption
              }
              onChange={(val: any) => {
                setFilterDosen(val ? val.value : 'all');
                setSelectedDosenOption(val);
                setPage(1);
              }}
              isClearable
            />
          )}

          <Select
            label="Filter Jenis Kegiatan"
            value={filterJenis}
            onChange={(val) => {
              setFilterJenis(val);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'Semua Jenis Kegiatan' },
              { value: 'penelitian', label: 'Penelitian' },
              { value: 'pengabdian', label: 'Pengabdian Masyarakat' },
            ]}
          />

          <Select
            label="Filter Status Proposal"
            value={filterStatus}
            onChange={(val) => {
              setFilterStatus(val);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'Semua Status' },
              { value: 'draft', label: 'Draft' },
              { value: 'submitted', label: 'Diajukan' },
              { value: 'under_review', label: 'Dalam Review' },
              { value: 'approved', label: 'Disetujui' },
              { value: 'rejected', label: 'Ditolak' },
              { value: 'contracted', label: 'Kontrak Hibah' },
            ]}
          />

          <hr className="my-2" />

          {/* Grid 2 Kolom Sorting */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              value={filterOrderBy}
              onChange={(val) => setFilterOrderBy(val)}
              options={[
                { value: 'created_at', label: 'Tanggal Dibuat' },
                { value: 'judul', label: 'Judul Proposal' },
                { value: 'anggaran_diajukan', label: 'Dana Diusulkan' },
              ]}
            />

            <Select
              label="Arah Pengurutan"
              value={filterOrderDir}
              onChange={(val) => setFilterOrderDir(val as 'asc' | 'desc')}
              options={[
                { value: 'desc', label: 'Mundur (DESC)' },
                { value: 'asc', label: 'Maju (ASC)' },
              ]}
            />
          </div>
        </div>
      </Drawer>

      {/* Confirm Dialog for Submit Proposal */}
      <ConfirmDialog
        isOpen={!!confirmSubmitId}
        onClose={() => setConfirmSubmitId(null)}
        onConfirm={executeSubmitProposal}
        title="Ajukan Proposal ke LPPM"
        message="Apakah Anda yakin ingin mengajukan proposal ini? Proposal yang telah diajukan tidak dapat diubah kembali dan akan diproses ke tahap seleksi."
        confirmText="Ya, Ajukan"
        variant="primary"
        isLoading={submitting}
      />
    </div>
  );
}
