'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Filter, Printer, Upload, FileText, Send, CheckCircle2, ShieldAlert, FileSearch } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Badge } from '@/components/ui/Badge';
import { sippmService } from '@/services/sippm.service';
import type { PengumumanHibah } from '@/types/sippm.types';
import type { PaginationMeta } from '@/types/api.types';
import { useAuth } from '@/hooks/useAuth';

export default function PengumumanHibahPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canRead = hasPermission('sippm.pengumuman.read') || hasPermission('sippm.pengumuman.manage');
  const canCreate = hasPermission('sippm.pengumuman.create') || hasPermission('sippm.pengumuman.manage');

  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<PengumumanHibah[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();

  // Filter Drawer & Pagination state
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTahun, setFilterTahun] = useState('');
  const [filterOrderBy, setFilterOrderBy] = useState('created_at');
  const [filterOrderDir, setFilterOrderDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Modal State
  const [showUploadSignedModal, setShowUploadSignedModal] = useState<number | null>(null);
  const [showUploadTemplateModal, setShowUploadTemplateModal] = useState<number | null>(null);

  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [templateType, setTemplateType] = useState<'mitra_indo' | 'mitra_intl'>('mitra_indo');
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
        search: search || undefined,
        status: filterStatus || undefined,
        tahun_anggaran: filterTahun || undefined,
        orderBy: filterOrderBy,
        orderDir: filterOrderDir,
      };

      const res: any = await sippmService.indexPengumuman(params);
      if (res?.data) {
        const dataItems = Array.isArray(res.data.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.items || [];
        setAnnouncements(dataItems);
        if (res.data.meta) setMeta(res.data.meta);
        else if (res.meta) setMeta(res.meta);
      } else if (Array.isArray(res)) {
        setAnnouncements(res);
      } else {
        setAnnouncements([]);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memuat daftar pengumuman');
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [canRead, page, limit, search, filterStatus, filterTahun, filterOrderBy, filterOrderDir]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleUploadSigned = async (id: number) => {
    if (!signedFile) return;
    setSubmitting(true);
    try {
      await sippmService.uploadSignedPengumuman(id, signedFile);
      toast.success('Scan surat TTD basah berhasil diunggah!');
      setShowUploadSignedModal(null);
      setSignedFile(null);
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengunggah file scan TTD');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadTemplate = async (id: number) => {
    if (!templateFile) return;
    setSubmitting(true);
    try {
      await sippmService.uploadTemplatePengumuman(id, templateType, templateFile);
      toast.success('File template proposal berhasil diunggah!');
      setShowUploadTemplateModal(null);
      setTemplateFile(null);
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengunggah file template proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const [confirmPublishId, setConfirmPublishId] = useState<number | null>(null);

  const handlePublish = (id: number) => {
    setConfirmPublishId(id);
  };

  const executePublish = async () => {
    if (!confirmPublishId) return;
    setSubmitting(true);
    try {
      await sippmService.publishPengumuman(confirmPublishId);
      toast.success('Pengumuman berhasil DIPUBLISH! Periode pengusulan proposal aktif.');
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mempublish pengumuman');
    } finally {
      setSubmitting(false);
      setConfirmPublishId(null);
    }
  };

  const formatDateString = (val?: string) => {
    if (!val) return '-';
    return val.split('T')[0];
  };

  const getApiUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="warning">Draf (Belum TTD)</Badge>;
      case 'pending_scan':
        return <Badge variant="blue">Scan TTD Uploaded</Badge>;
      case 'published':
        return (
          <Badge variant="success">
            <CheckCircle2 size={12} className="inline mr-1" /> Published & Aktif
          </Badge>
        );
      default:
        return <Badge variant="gray">{status}</Badge>;
    }
  };

  const columns: ColumnDef<PengumumanHibah>[] = [
    {
      key: 'nomor_surat',
      label: 'Nomor & Perihal Surat',
      render: (row) => (
        <div>
          <div className="font-bold">{row.nomor_surat}</div>
          <div className="text-xs opacity-80 mt-0.5">{row.hal_surat}</div>
          <div className="text-[11px] opacity-60 mt-1">Surakarta, {formatDateString(row.tgl_surat)}</div>
        </div>
      ),
    },
    {
      key: 'tahun_anggaran',
      label: 'Tahun Anggaran',
      render: (row) => <span className="font-semibold">T.A. {row.tahun_anggaran}</span>,
    },
    {
      key: 'periode',
      label: 'Periode Pengusulan',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-medium text-emerald-600">Buka: {formatDateString(row.tgl_buka_proposal)}</div>
          <div className="font-medium text-rose-600">Tutup: {formatDateString(row.tgl_tutup_proposal)}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status Siklus',
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: 'aksi',
      label: 'Aksi / Kontrol Surat',
      align: 'right',
      render: (row) => {
        const menuItems: DropdownMenuItem[] = [
          {
            label: 'Cetak Draf PDF',
            icon: <Printer size={14} />,
            onClick: () => {
              window.open(`${getApiUrl()}/sippm/pengumuman/${row.id}/html-draft`, '_blank');
            },
          },
          {
            label: 'Upload Scan TTD',
            icon: <Upload size={14} />,
            onClick: () => setShowUploadSignedModal(row.id),
          },
          {
            label: 'Upload Template',
            icon: <FileText size={14} />,
            onClick: () => setShowUploadTemplateModal(row.id),
          },
        ];

        if (row.status !== 'published') {
          menuItems.push({
            label: 'Publish Pengumuman',
            icon: <Send size={14} />,
            onClick: () => handlePublish(row.id),
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
          title="Pengumuman Hibah Internal"
          description="Panel Admin UPPM untuk mengelola, menerbitkan, dan mencetak surat pengumuman hibah institusi"
        />
        <div className="card p-6 text-center">
          <ShieldAlert size={56} className="mx-auto mb-4 opacity-40" />
          <h2 className="text-xl font-bold mb-2">Akses Ditolak / Dibatasi</h2>
          <p className="max-w-[500px] mx-auto opacity-70">
            Peran Anda saat ini tidak memiliki permission untuk melihat Pengumuman Hibah.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Pengumuman Hibah Internal"
        description="Panel Admin UPPM untuk mengelola, menerbitkan, dan mencetak surat pengumuman hibah institusi"
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
              <Button icon={<Plus size={16} />} onClick={() => router.push('/sippm/pengumuman/create')}>
                Terbitkan Pengumuman Baru
              </Button>
            )}
          </div>
        }
      />

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={announcements}
        isLoading={loading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        emptyMessage={
          <div className="py-8 text-center opacity-70">
            <FileSearch size={48} className="mx-auto mb-4 opacity-40" />
            <p>Belum ada pengumuman penerimaan proposal hibah yang diterbitkan.</p>
          </div>
        }
      />

      {/* Filter Drawer Slide Right-to-Left */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter & Urutkan Pengumuman"
      >
        <div className="space-y-4">
          <Input
            label="Pencarian Perihal / Nomor Surat"
            placeholder="Cari perihal atau nomor..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <Select
            label="Filter Status"
            value={filterStatus}
            onChange={(val) => {
              setFilterStatus(val);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Semua Status' },
              { value: 'draft', label: 'Draf (Belum TTD)' },
              { value: 'pending_scan', label: 'Scan TTD Uploaded' },
              { value: 'published', label: 'Published & Aktif' },
            ]}
          />

          <Input
            label="Filter Tahun Anggaran"
            placeholder="Contoh: 2026"
            value={filterTahun}
            onChange={(e) => {
              setFilterTahun(e.target.value);
              setPage(1);
            }}
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
                { value: 'tahun_anggaran', label: 'Tahun Anggaran' },
                { value: 'nomor_surat', label: 'Nomor Surat' },
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

      {/* Modal 1: Upload Signed Scan PDF */}
      {showUploadSignedModal !== null && (
        <Modal
          open={showUploadSignedModal !== null}
          onClose={() => setShowUploadSignedModal(null)}
          title="Upload Scan Surat TTD Basah"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowUploadSignedModal(null)}>
                Batal
              </Button>
              <Button
                onClick={() => handleUploadSigned(showUploadSignedModal)}
                disabled={!signedFile || submitting}
                loading={submitting}
              >
                Simpan Scan TTD
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-xs opacity-70">
              Unggah file hasil scan dokumen surat pengumuman resmi yang sudah ditandatangani basah dan distempel oleh Direktur & Ketua UPPM (Format PDF / Gambar, maks 10MB).
            </p>
            <Input
              type="file"
              label="File Scan TTD (.pdf, .jpg, .png)"
              onChange={(e) => setSignedFile(e.target.files?.[0] || null)}
            />
          </div>
        </Modal>
      )}

      {/* Modal 2: Upload Proposal Templates */}
      {showUploadTemplateModal !== null && (
        <Modal
          open={showUploadTemplateModal !== null}
          onClose={() => setShowUploadTemplateModal(null)}
          title="Upload Template Proposal Dosen"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowUploadTemplateModal(null)}>
                Batal
              </Button>
              <Button
                onClick={() => handleUploadTemplate(showUploadTemplateModal)}
                disabled={!templateFile || submitting}
                loading={submitting}
              >
                Unggah Template
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Select
              label="Kategori Template Proposal"
              value={templateType}
              onChange={(val) => setTemplateType(val as any)}
              options={[
                { value: 'mitra_indo', label: 'Template Proposal Mitra Indonesia (.docx)' },
                { value: 'mitra_intl', label: 'Template Proposal Mitra Internasional (.docx)' },
              ]}
            />
            <Input
              type="file"
              label="Pilih File Template (.docx / .pdf)"
              onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
            />
          </div>
        </Modal>
      )}

      {/* Confirm Dialog for Publish */}
      <ConfirmDialog
        isOpen={!!confirmPublishId}
        onClose={() => setConfirmPublishId(null)}
        onConfirm={executePublish}
        title="Publish Pengumuman Hibah"
        message="Apakah Anda yakin ingin mempublish pengumuman ini? Periode pengusulan proposal di sistem akan OTOMATIS DIBUKA bagi seluruh dosen."
        confirmText="Ya, Publish"
        variant="primary"
        isLoading={submitting}
      />
    </div>
  );
}
