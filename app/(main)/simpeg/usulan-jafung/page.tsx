'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Filter, ShieldAlert, FileText, Trash2, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { simpegService } from '@/services/simpeg.service';
import type { UsulanJafung } from '@/types/simpeg.types';
import type { PaginationMeta } from '@/types/api.types';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

export default function JabatanAkademikDosenPage() {
  const { isAdmin, hasPermission } = useAuth();
  const canAccess = isAdmin || hasPermission('simpeg.usulan_jafung.verify') || hasPermission('simpeg.usulan_jafung.manage');
  const canRead = hasPermission('simpeg.usulan_jafung.read') || hasPermission('simpeg.usulan_jafung.request') || hasPermission('simpeg.usulan_jafung.verify');
  const canCreate = hasPermission('simpeg.usulan_jafung.create') || hasPermission('simpeg.usulan_jafung.request');
  const canDelete = hasPermission('simpeg.usulan_jafung.delete') || canAccess;

  const [loading, setLoading] = useState(true);
  const [jadList, setJadList] = useState<UsulanJafung[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [filterOrderBy, setFilterOrderBy] = useState('created_at');
  const [filterOrderDir, setFilterOrderDir] = useState<'asc' | 'desc'>('desc');

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<UsulanJafung | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      if (!canAccess) {
        const resMe = await simpegService.getPegawaiMe();
        if (resMe.data) {
          const pegId = resMe.data.id;
          const resUsulan = await simpegService.getUsulanJafungList({
            pegawai_id: pegId,
            page,
            limit,
            search: search || undefined,
            sort_by: filterOrderBy,
            sort_dir: filterOrderDir,
          });
          setJadList(resUsulan.data || []);
          if ((resUsulan as any).meta) setMeta((resUsulan as any).meta);
        }
      } else {
        const resUsulan = await simpegService.getUsulanJafungList({
          page,
          limit,
          search: search || undefined,
          sort_by: filterOrderBy,
          sort_dir: filterOrderDir,
        });
        setJadList(resUsulan.data || []);
        if ((resUsulan as any).meta) setMeta((resUsulan as any).meta);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memuat data Jabatan Akademik Dosen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canRead, page, limit, filterOrderBy, filterOrderDir]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await simpegService.deleteUsulanJafung(deleteTarget.id);
      toast.success('Data penetapan JAD berhasil dihapus');
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menghapus data penetapan JAD');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<UsulanJafung>[] = [
    {
      key: 'nama_dosen',
      label: 'Nama Dosen',
      render: (u) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 text-xs">
            {u.pegawai?.nama_lengkap || `Dosen ID ${u.pegawai_id}`}
          </span>
          <span className="text-2xs text-slate-500">
            NIP: {u.pegawai?.nip || '-'} • {u.pegawai?.unit_kerja?.nama || 'Dosen'}
          </span>
        </div>
      ),
    },
    {
      key: 'jabatan_akademik',
      label: 'Jabatan Akademik',
      render: (u) => (
        <Badge
          style={{
            backgroundColor: 'var(--module-primary-subtle)',
            color: 'var(--module-primary)',
            borderColor: 'var(--module-primary)',
          }}
          className="font-bold text-2xs inline-block w-fit"
        >
          {u.jafung_tujuan?.nama || `JAD ID ${u.jafung_tujuan_id}`}
        </Badge>
      ),
    },
    {
      key: 'no_sk',
      label: 'No. SK',
      render: (u) => (
        <span className="text-xs font-medium text-slate-800">
          {u.nomor_sk || u.catatan_reviewer || '-'}
        </span>
      ),
    },
    {
      key: 'tmt_berlaku',
      label: 'Tanggal Mulai Berlaku / TMT',
      render: (u) => {
        if (!u.tanggal_mulai_berlaku) {
          return <span className="text-2xs text-slate-400">-</span>;
        }
        const dMulai = new Date(u.tanggal_mulai_berlaku);
        const formattedMulai = isNaN(dMulai.getTime())
          ? u.tanggal_mulai_berlaku
          : dMulai.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

        if (u.tanggal_selesai_berlaku) {
          const dSelesai = new Date(u.tanggal_selesai_berlaku);
          const formattedSelesai = isNaN(dSelesai.getTime())
            ? u.tanggal_selesai_berlaku
            : dSelesai.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
          return (
            <div className="flex flex-col">
              <span className="text-xs text-slate-800 font-medium">
                {formattedMulai} s/d {formattedSelesai}
              </span>
            </div>
          );
        }

        return (
          <div className="flex flex-col">
            <span className="text-xs text-slate-800 font-medium">{formattedMulai}</span>
            <span className="text-2xs text-emerald-600 font-medium">Definitif / Aktif</span>
          </div>
        );
      },
    },
    {
      key: 'berkas_sk',
      label: 'Berkas SK',
      render: (u) => {
        const fileUrl = u.file_sk_hasil_url || (u.file_sk_hasil ? `/api/files/view?path=${encodeURIComponent(u.file_sk_hasil)}` : null);
        if (!fileUrl) {
          return <span className="text-2xs text-slate-400 italic">Tidak ada berkas</span>;
        }
        return (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <FileText size={12} />
            <span>Lihat SK</span>
          </a>
        );
      },
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (u) => {
        const fileUrl = u.file_sk_hasil_url || (u.file_sk_hasil ? `/api/files/view?path=${encodeURIComponent(u.file_sk_hasil)}` : null);
        const menuItems = [];

        if (fileUrl) {
          menuItems.push({
            label: 'Lihat Berkas SK',
            icon: <ExternalLink size={14} />,
            onClick: () => {
              window.open(fileUrl, '_blank');
            },
          });
        }

        if (canDelete) {
          menuItems.push({
            label: 'Hapus Data',
            icon: <Trash2 size={14} />,
            variant: 'danger' as const,
            onClick: () => setDeleteTarget(u),
          });
        }

        if (menuItems.length === 0) {
          return <span className="text-2xs text-slate-400">-</span>;
        }

        return <DropdownMenu items={menuItems} align="right" />;
      },
    },
  ];

  if (!canRead) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader
          title="Data Jabatan Akademik Dosen (JAD & SK)"
          description="Pencatatan & Unggah Berkas SK Penetapan Jabatan Fungsional Akademik Dosen"
        />
        <Card>
          <EmptyState
            icon={<ShieldAlert size={48} className="text-[var(--danger)]" />}
            title="Akses Ditolak / Dibatasi"
            description="Peran Anda saat ini tidak memiliki hak akses untuk melihat data Jabatan Akademik Dosen."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Data Jabatan Akademik Dosen (JAD & SK)"
        description="Pencatatan & Unggah Berkas SK Penetapan Jabatan Fungsional Akademik Dosen"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => setShowFilter(true)}
            >
              Filter
            </Button>
            {canCreate && (
              <Link href="/simpeg/usulan-jafung/create">
                <Button
                  icon={<Plus size={16} />}
                  style={{ backgroundColor: 'var(--module-primary)' }}
                >
                  Unggah SK JAD
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={jadList}
        isLoading={loading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        emptyMessage="Belum ada data penetapan Jabatan Akademik Dosen (JAD) yang dicatat."
      />

      {/* Drawer Filter */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Data JAD Dosen"
      >
        <div className="space-y-4">
          <Input
            label="Cari Dosen / No. SK"
            placeholder="Ketik nama, NIP, atau nomor SK..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <hr className="my-2 border-slate-200" />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              value={filterOrderBy}
              onChange={(val) => setFilterOrderBy(val)}
              options={[
                { value: 'created_at', label: 'Tanggal Input' },
                { value: 'tanggal_mulai_berlaku', label: 'Tanggal Mulai Berlaku (TMT)' },
                { value: 'nomor_sk', label: 'Nomor SK' },
                { value: 'id', label: 'ID' },
              ]}
            />
            <Select
              label="Arah Urutan"
              value={filterOrderDir}
              onChange={(val) => setFilterOrderDir(val as 'asc' | 'desc')}
              options={[
                { value: 'desc', label: 'Terbaru ke Terlama' },
                { value: 'asc', label: 'Terlama ke Terbaru' },
              ]}
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setFilterOrderBy('created_at');
                setFilterOrderDir('desc');
              }}
            >
              Reset
            </Button>
            <Button
              onClick={() => {
                setShowFilter(false);
                loadData();
              }}
              style={{ backgroundColor: 'var(--module-primary)' }}
            >
              Terapkan
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Modal Konfirmasi Hapus UI */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Data Penetapan JAD"
        message={
          deleteTarget ? (
            <span>
              Apakah Anda yakin ingin menghapus data penetapan JAD{' '}
              <strong>{deleteTarget.jafung_tujuan?.nama || `ID ${deleteTarget.jafung_tujuan_id}`}</strong> untuk dosen{' '}
              <strong>{deleteTarget.pegawai?.nama_lengkap || `ID ${deleteTarget.pegawai_id}`}</strong>?
            </span>
          ) : (
            'Apakah Anda yakin ingin menghapus data penetapan JAD ini?'
          )
        }
        confirmText="Ya, Hapus Data"
        cancelText="Batal"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
