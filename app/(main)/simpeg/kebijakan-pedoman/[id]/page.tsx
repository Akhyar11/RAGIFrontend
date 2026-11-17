'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Pencil,
  Trash2,
  FileText,
  ShieldCheck,
  User,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { simpegKebijakanPedomanService } from '@/services/simpeg.kebijakan-pedoman.service';
import { useAuth } from '@/hooks/useAuth';
import type { KebijakanPedoman } from '@/types/simpeg.kebijakan-pedoman.types';

export default function KebijakanPedomanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const { isAdmin, hasPermission } = useAuth();
  const canUpdate =
    isAdmin ||
    hasPermission('simpeg.kebijakan_pedoman.update') ||
    hasPermission('simpeg.kebijakan_pedoman.manage');
  const canDelete =
    isAdmin ||
    hasPermission('simpeg.kebijakan_pedoman.delete') ||
    hasPermission('simpeg.kebijakan_pedoman.manage');

  const [data, setData] = useState<KebijakanPedoman | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Delete Confirm Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await simpegKebijakanPedomanService.getById(id);
      if (res.status === 'success' && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Gagal memuat detail kebijakan dan pedoman'
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleDelete = async () => {
    if (!data) return;
    setIsDeleting(true);
    try {
      await simpegKebijakanPedomanService.delete(data.id);
      toast.success('Kebijakan dan pedoman berhasil dihapus');
      router.push('/simpeg/kebijakan-pedoman');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus kebijakan');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex-col gap-4 space-y-4">
        <PageHeader
          title="Detail Kebijakan & Pedoman"
          description="Memuat rincian informasi kebijakan..."
          action={
            <Link href="/simpeg/kebijakan-pedoman">
              <Button
                variant="outline"
                size="sm"
                className="border-[var(--module-primary)] text-[var(--module-primary)] hover:bg-[var(--module-primary-subtle)]"
              >
                <ArrowLeft size={16} className="mr-1.5" />
                Kembali
              </Button>
            </Link>
          }
        />
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          Sedang memuat data...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full flex-col gap-4 space-y-4">
        <PageHeader
          title="Detail Kebijakan & Pedoman"
          description="Data tidak ditemukan"
          action={
            <Link href="/simpeg/kebijakan-pedoman">
              <Button
                variant="outline"
                size="sm"
                className="border-[var(--module-primary)] text-[var(--module-primary)] hover:bg-[var(--module-primary-subtle)]"
              >
                <ArrowLeft size={16} className="mr-1.5" />
                Kembali
              </Button>
            </Link>
          }
        />
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          Kebijakan dan pedoman tidak ditemukan atau telah dinonaktifkan.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-col gap-4 space-y-4">
      <PageHeader
        title="Detail Kebijakan & Pedoman"
        description="Rincian informasi ketetapan kebijakan, status keabsahan arsip, dan pratinjau dokumen scan resmi"
        action={
          <div className="flex items-center gap-2">
            <Link href="/simpeg/kebijakan-pedoman">
              <Button
                variant="outline"
                size="sm"
                className="border-[var(--module-primary)] text-[var(--module-primary)] hover:bg-[var(--module-primary-subtle)]"
              >
                <ArrowLeft size={16} className="mr-1.5" />
                Kembali
              </Button>
            </Link>
            {canUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(`/simpeg/kebijakan-pedoman/${data.id}/edit`)
                }
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Pencil size={14} className="mr-1.5" />
                Ubah
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} className="mr-1.5" />
                Hapus
              </Button>
            )}
          </div>
        }
      />

      {/* Card Header Ringkasan */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm md:text-base text-slate-900">
                {data.nomor_surat}
              </span>
              <Badge
                variant={data.is_active ? 'success' : 'gray'}
                className="text-2xs px-2 py-0.5"
              >
                {data.is_active ? 'Aktif Berlaku' : 'Tidak Aktif'}
              </Badge>
              {data.kategori && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {data.kategori.nama}
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-slate-800 leading-snug">
              {data.judul}
            </h2>
          </div>

          {data.file_dokumen_url && (
            <div className="shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.open(data.file_dokumen_url as string, '_blank')}
                className="bg-[var(--module-primary)] text-white hover:opacity-90 flex items-center gap-1.5 text-xs"
              >
                <ExternalLink size={14} />
                Buka PDF di Tab Baru
              </Button>
            </div>
          )}
        </div>

        {data.deskripsi && (
          <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-100">
            <span className="font-semibold text-slate-700 block mb-1">
              Ringkasan / Keterangan:
            </span>
            {data.deskripsi}
          </div>
        )}
      </div>

      {/* Grid Informasi Rinci */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Modul Arsip */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 border-b border-slate-100 pb-2">
            <ShieldCheck size={16} className="text-[var(--module-primary)]" />
            Informasi Surat Resmi (Modul Arsip)
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Nomor Surat Arsip:</span>
              <span className="font-semibold text-slate-800">
                {data.nomor_surat_arsip?.nomor_surat || data.nomor_surat}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Perihal Resmi:</span>
              <span className="font-medium text-slate-800 text-right max-w-xs">
                {data.nomor_surat_arsip?.perihal || data.judul}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Unit / Klasifikasi:</span>
              <span className="text-slate-800">
                {data.nomor_surat_arsip?.kode_unit || '-'}{' '}
                / {data.nomor_surat_arsip?.kode_klasifikasi || '-'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Status Penomoran Arsip:</span>
              <Badge variant="success" className="text-2xs px-2 py-0.5">
                {data.nomor_surat_arsip?.status || 'Terpakai & Tersinkron'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Card Masa Berlaku & Penetapan */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 border-b border-slate-100 pb-2">
            <Calendar size={16} className="text-[var(--module-primary)]" />
            Penetapan & Masa Berlaku
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Pejabat Penetap:</span>
              <span className="font-semibold text-slate-800">
                {data.pejabat_penetap}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Tanggal Penetapan:</span>
              <span className="text-slate-800">{data.tanggal_penetapan}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Tanggal Mulai Berlaku:</span>
              <span className="font-medium text-slate-800">
                {data.tanggal_berlaku}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Tanggal Berakhir:</span>
              <span className="text-slate-800">
                {data.tanggal_berakhir || 'Tanpa Batas Akhir (Permanen)'}
              </span>
            </div>
            <div className="flex justify-between py-1 pt-2 border-t border-slate-100 text-2xs text-slate-400">
              <span className="flex items-center gap-1">
                <User size={12} /> Diinput oleh: {data.pembuat?.name || 'Admin SDM'}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} /> {new Date(data.created_at).toLocaleDateString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dokumen Scan PDF Embed / Preview */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <FileText size={16} className="text-red-500" />
            Berkas Dokumen Scan Resmi
          </div>
          {data.file_dokumen_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(data.file_dokumen_url as string, '_blank')}
              className="text-xs"
            >
              <ExternalLink size={13} className="mr-1.5" />
              Layar Penuh
            </Button>
          )}
        </div>

        {data.file_dokumen_url ? (
          <div className="w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
            <iframe
              src={data.file_dokumen_url}
              title="Pratinjau Dokumen Kebijakan"
              className="w-full h-[600px] rounded-lg"
            />
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg">
            Berkas dokumen belum tersedia atau gagal dimuat.
          </div>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Kebijakan & Pedoman"
        message={`Apakah Anda yakin ingin menghapus kebijakan "${data.judul}" (${data.nomor_surat})?`}
        confirmText="Hapus Kebijakan"
        cancelText="Batal"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}
