'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileText,
  Trash2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { simpegKebijakanPedomanService } from '@/services/simpeg.kebijakan-pedoman.service';
import type { CheckSkResult } from '@/types/arsip.types';
import type {
  KebijakanPedoman,
  MasterKategoriKebijakan,
} from '@/types/simpeg.kebijakan-pedoman.types';

// Zod Schema
const kebijakanEditFormSchema = z
  .object({
    nomor_surat: z.string().min(3, 'Nomor surat resmi minimal 3 karakter'),
    judul: z.string().min(5, 'Judul kebijakan minimal 5 karakter'),
    kategori_kebijakan_id: z.string().min(1, 'Kategori kebijakan wajib dipilih'),
    pejabat_penetap: z.string().min(3, 'Pejabat penetap minimal 3 karakter'),
    tanggal_penetapan: z.string().min(1, 'Tanggal penetapan wajib diisi'),
    tanggal_berlaku: z.string().min(1, 'Tanggal mulai berlaku wajib diisi'),
    tanggal_berakhir: z.string().optional(),
    deskripsi: z.string().optional(),
    is_active: z.string().min(1, 'Status keberlakuan wajib dipilih'),
  })
  .refine(
    (data) => {
      if (data.tanggal_berlaku && data.tanggal_berakhir) {
        return new Date(data.tanggal_berakhir) >= new Date(data.tanggal_berlaku);
      }
      return true;
    },
    {
      message: 'Tanggal berakhir harus sama atau setelah tanggal mulai berlaku',
      path: ['tanggal_berakhir'],
    }
  );

type KebijakanEditFormValues = z.infer<typeof kebijakanEditFormSchema>;

export default function EditKebijakanPedomanPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const [initialData, setInitialData] = useState<KebijakanPedoman | null>(null);
  const [masters, setMasters] = useState<MasterKategoriKebijakan[]>([]);
  const [fileDokumen, setFileDokumen] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Arsip integration state
  const [isCheckingArsip, setIsCheckingArsip] = useState(false);
  const [arsipCheckResult, setArsipCheckResult] = useState<CheckSkResult | null>(null);
  const [arsipError, setArsipError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<KebijakanEditFormValues>({
    resolver: zodResolver(kebijakanEditFormSchema),
    defaultValues: {
      nomor_surat: '',
      judul: '',
      kategori_kebijakan_id: '',
      pejabat_penetap: '',
      tanggal_penetapan: '',
      tanggal_berlaku: '',
      tanggal_berakhir: '',
      deskripsi: '',
      is_active: 'true',
    },
  });

  const watchedNomorSurat = watch('nomor_surat');

  // Load masters & existing data
  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [mastersRes, detailRes] = await Promise.all([
        simpegKebijakanPedomanService.getMasters(),
        simpegKebijakanPedomanService.getById(id),
      ]);

      if (mastersRes.status === 'success' && mastersRes.data) {
        setMasters(mastersRes.data);
      }

      if (detailRes.status === 'success' && detailRes.data) {
        const item = detailRes.data;
        setInitialData(item);
        reset({
          nomor_surat: item.nomor_surat,
          judul: item.judul,
          kategori_kebijakan_id: item.kategori_kebijakan_id.toString(),
          pejabat_penetap: item.pejabat_penetap,
          tanggal_penetapan: item.tanggal_penetapan,
          tanggal_berlaku: item.tanggal_berlaku,
          tanggal_berakhir: item.tanggal_berakhir || '',
          deskripsi: item.deskripsi || '',
          is_active: item.is_active ? 'true' : 'false',
        });

        if (item.nomor_surat_arsip) {
          setArsipCheckResult({
            is_found: true,
            is_valid: true,
            has_document: !!item.nomor_surat_arsip.file_surat_path,
            id: item.nomor_surat_arsip.id,
            nomor_surat: item.nomor_surat_arsip.nomor_surat,
            perihal: item.nomor_surat_arsip.perihal,
            kode_unit: item.nomor_surat_arsip.kode_unit,
            kode_klasifikasi: item.nomor_surat_arsip.kode_klasifikasi,
            tanggal_surat: item.nomor_surat_arsip.tanggal_surat,
            status: item.nomor_surat_arsip.status as any,
          });
        }
      }
    } catch (err: any) {
      toast.error('Gagal memuat data kebijakan untuk diedit');
    } finally {
      setIsLoading(false);
    }
  }, [id, reset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle cek nomor ke modul Arsip
  const handleCheckNomorArsip = async () => {
    const nomor = watchedNomorSurat?.trim();
    if (!nomor) {
      setArsipError('Masukkan nomor surat terlebih dahulu untuk diverifikasi ke Arsip.');
      return;
    }

    setIsCheckingArsip(true);
    setArsipError(null);

    try {
      const res = await simpegKebijakanPedomanService.checkNomorArsip(nomor);
      const checkData = res.data;
      setArsipCheckResult(checkData || null);

      if (checkData?.is_found) {
        if (checkData.perihal) {
          setValue('judul', checkData.perihal, { shouldValidate: true });
        }
        if (checkData.tanggal_surat) {
          setValue('tanggal_penetapan', checkData.tanggal_surat, { shouldValidate: true });
        }
        toast.success('Nomor surat terdaftar pada modul Arsip. Perihal otomatis ditarik.');
      } else {
        setArsipError(
          'Nomor surat tidak terdaftar pada modul Arsip. Pastikan admin Arsip telah menerbitkan nomor tersebut.'
        );
      }
    } catch (err: any) {
      setArsipError(
        err.response?.data?.message || 'Gagal memverifikasi nomor surat ke modul Arsip.'
      );
    } finally {
      setIsCheckingArsip(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);

    if (!file) {
      setFileDokumen(null);
      return;
    }

    if (file.type !== 'application/pdf') {
      setFileError('Berkas harus berupa file PDF.');
      setFileDokumen(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError('Ukuran file maksimal 10 MB.');
      setFileDokumen(null);
      return;
    }

    setFileDokumen(file);
  };

  const onSubmit = async (values: KebijakanEditFormValues) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('nomor_surat', values.nomor_surat.trim());
      formData.append('judul', values.judul.trim());
      formData.append('kategori_kebijakan_id', values.kategori_kebijakan_id);
      formData.append('pejabat_penetap', values.pejabat_penetap.trim());
      formData.append('tanggal_penetapan', values.tanggal_penetapan);
      formData.append('tanggal_berlaku', values.tanggal_berlaku);
      formData.append('is_active', values.is_active === 'true' ? '1' : '0');

      if (values.tanggal_berakhir) {
        formData.append('tanggal_berakhir', values.tanggal_berakhir);
      }
      if (values.deskripsi) {
        formData.append('deskripsi', values.deskripsi.trim());
      }
      if (arsipCheckResult?.is_found && arsipCheckResult.id) {
        formData.append('nomor_surat_arsip_id', arsipCheckResult.id.toString());
      }

      if (fileDokumen) {
        formData.append('file_dokumen', fileDokumen);
      }

      const res = await simpegKebijakanPedomanService.update(id, formData);
      if (res.status === 'success') {
        toast.success('Kebijakan berhasil diperbarui dan disinkronkan!');
        router.push(`/simpeg/kebijakan-pedoman/${id}`);
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Gagal memperbarui kebijakan dan pedoman'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex-col gap-4 space-y-4">
        <PageHeader
          title="Ubah Kebijakan & Pedoman"
          description="Memuat data kebijakan..."
          action={
            <Link href={`/simpeg/kebijakan-pedoman/${id}`}>
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
          Sedang memuat data kebijakan...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-col gap-4 space-y-4">
      <PageHeader
        title="Ubah Kebijakan & Pedoman"
        description="Perbarui informasi dokumen kebijakan atau ganti berkas scan PDF resmi"
        action={
          <Link href={`/simpeg/kebijakan-pedoman/${id}`}>
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

      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: Alur Penomoran Arsip */}
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs border-b border-slate-200 pb-2">
              <ShieldCheck size={16} className="text-[var(--module-primary)]" />
              Verifikasi Nomor Surat Resmi (Modul Arsip)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <Input
                  label="Nomor Surat Resmi"
                  placeholder="Contoh: 025/SK-REK/IT/2026"
                  required
                  error={errors.nomor_surat?.message}
                  {...register('nomor_surat')}
                />
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCheckNomorArsip}
                  disabled={isCheckingArsip}
                  className="w-full border-[var(--module-primary)] text-[var(--module-primary)] hover:bg-[var(--module-primary-subtle)] text-xs h-10"
                >
                  <Search size={14} className="mr-1.5" />
                  {isCheckingArsip ? 'Memeriksa...' : 'Cek Ulang ke Arsip'}
                </Button>
              </div>
            </div>

            {arsipError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold block">Nomor Tidak Ditemukan:</span>
                  <span>{arsipError}</span>
                </div>
              </div>
            )}

            {arsipCheckResult?.is_found && (
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                    Nomor Terverifikasi pada Modul Arsip
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-2xs text-emerald-950">
                    <div>
                      <span className="text-emerald-700">Perihal:</span>{' '}
                      <span className="font-medium">{arsipCheckResult.perihal || '-'}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700">Tanggal Terbit:</span>{' '}
                      <span className="font-medium">{arsipCheckResult.tanggal_surat || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Informasi Pokok Kebijakan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Judul Kebijakan / Pedoman"
                placeholder="Contoh: Pedoman Tata Tertib dan Jam Kerja Tenaga Kependidikan"
                required
                error={errors.judul?.message}
                {...register('judul')}
              />
            </div>

            <Select
              label="Kategori Kebijakan"
              required
              error={errors.kategori_kebijakan_id?.message}
              options={masters.map((m) => ({
                value: m.id.toString(),
                label: `${m.kode} - ${m.nama}`,
              }))}
              {...register('kategori_kebijakan_id')}
            />

            <Input
              label="Pejabat Penetap"
              required
              error={errors.pejabat_penetap?.message}
              {...register('pejabat_penetap')}
            />

            <Input
              label="Tanggal Penetapan"
              type="date"
              required
              error={errors.tanggal_penetapan?.message}
              {...register('tanggal_penetapan')}
            />

            <Input
              label="Tanggal Mulai Berlaku"
              type="date"
              required
              error={errors.tanggal_berlaku?.message}
              {...register('tanggal_berlaku')}
            />

            <Input
              label="Tanggal Berakhir (Opsional)"
              type="date"
              error={errors.tanggal_berakhir?.message}
              {...register('tanggal_berakhir')}
            />

            <Select
              label="Status Keberlakuan"
              options={[
                { value: 'true', label: 'Aktif (Berlaku)' },
                { value: 'false', label: 'Tidak Aktif (Kadaluarsa / Dicabut)' },
              ]}
              {...register('is_active')}
            />

            <div className="md:col-span-2">
              <Textarea
                label="Ringkasan / Keterangan Tambahan"
                error={errors.deskripsi?.message}
                {...register('deskripsi')}
              />
            </div>
          </div>

          {/* Section 3: Unggah Dokumen Scan PDF */}
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-semibold text-xs text-slate-800">
                Ganti Berkas Dokumen Scan PDF (Opsional)
              </span>
              <span className="text-2xs text-slate-500">
                Format PDF, Maks. 10 MB (Kosongkan jika tidak ingin mengganti)
              </span>
            </div>

            {/* Berkas yang sedang aktif saat ini */}
            {initialData?.file_dokumen_url && !fileDokumen && (
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <FileText size={20} />
                  </div>
                  <div>
                    <span className="font-medium text-xs text-slate-800 block">
                      Dokumen Scan PDF Saat Ini Tersimpan
                    </span>
                    <span className="text-2xs text-slate-500">
                      Tersimpan di disk privat & tersinkronisasi ke modul Arsip
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(initialData.file_dokumen_url as string, '_blank')
                  }
                  className="text-xs h-8"
                >
                  <ExternalLink size={13} className="mr-1" />
                  Pratinjau PDF
                </Button>
              </div>
            )}

            {!fileDokumen ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-5 bg-white hover:border-[var(--module-primary)] hover:bg-slate-50 cursor-pointer transition-colors">
                <UploadCloud size={24} className="text-slate-400 mb-1" />
                <span className="text-xs font-medium text-slate-700">
                  Klik untuk mengunggah berkas PDF baru pengganti
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-50 text-red-600">
                    <FileText size={20} />
                  </div>
                  <div>
                    <span className="font-medium text-xs text-slate-800 block">
                      {fileDokumen.name} (Berkas Baru)
                    </span>
                    <span className="text-2xs text-slate-500">
                      {(fileDokumen.size / (1024 * 1024)).toFixed(2)} MB • File PDF
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFileDokumen(null)}
                  className="text-red-600 border-red-200 hover:bg-red-50 h-8"
                >
                  <Trash2 size={14} className="mr-1" />
                  Batal Ganti
                </Button>
              </div>
            )}

            {fileError && (
              <span className="text-xs text-red-600 block">{fileError}</span>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Link href={`/simpeg/kebijakan-pedoman/${id}`}>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Batal
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="bg-[var(--module-primary)] text-white hover:opacity-90"
            >
              {isSubmitting ? 'Menyimpan Perubahan...' : 'Simpan Perubahan & Sinkronkan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
