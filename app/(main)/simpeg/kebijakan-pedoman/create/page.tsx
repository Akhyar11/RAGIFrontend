'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { simpegKebijakanPedomanService } from '@/services/simpeg.kebijakan-pedoman.service';
import type { CheckSkResult } from '@/types/arsip.types';

// Zod Schema Form Validation
const kebijakanFormSchema = z.object({
  nomor_surat: z.string().min(3, 'Nomor surat resmi minimal 3 karakter'),
});

type KebijakanFormValues = z.infer<typeof kebijakanFormSchema>;

export default function CreateKebijakanPedomanPage() {
  const router = useRouter();
  const [fileDokumen, setFileDokumen] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Arsip integration state
  const [isCheckingArsip, setIsCheckingArsip] = useState(false);
  const [arsipCheckResult, setArsipCheckResult] = useState<CheckSkResult | null>(null);
  const [arsipError, setArsipError] = useState<string | null>(null);

  const [defaultKategoriId, setDefaultKategoriId] = useState<string>('');

  // Muat default master kategori kebijakan di background
  useEffect(() => {
    simpegKebijakanPedomanService
      .getMasters()
      .then((res) => {
        if (res.status === 'success' && res.data && res.data.length > 0) {
          setDefaultKategoriId(res.data[0].id.toString());
        }
      })
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<KebijakanFormValues>({
    resolver: zodResolver(kebijakanFormSchema),
    defaultValues: {
      nomor_surat: '',
    },
  });

  const watchedNomorSurat = watch('nomor_surat');
  const isArsipVerified = Boolean(arsipCheckResult?.is_found);

  // Handle cek nomor ke modul Arsip
  const handleCheckNomorArsip = async () => {
    const nomor = watchedNomorSurat?.trim();
    if (!nomor) {
      setArsipError('Masukkan nomor surat terlebih dahulu untuk diverifikasi ke Arsip.');
      setArsipCheckResult(null);
      return;
    }

    setIsCheckingArsip(true);
    setArsipError(null);
    setArsipCheckResult(null);
    setFileDokumen(null);
    setFileError(null);

    try {
      const res = await simpegKebijakanPedomanService.checkNomorArsip(nomor);
      const checkData = res.data;
      setArsipCheckResult(checkData || null);

      if (checkData?.is_found) {
        toast.success('Nomor surat terdaftar pada Arsip. Silakan unggah dokumen PDF.');
      } else {
        setArsipError(
          'Nomor surat tidak terdaftar pada modul Arsip. Pastikan admin Arsip telah menerbitkan nomor tersebut.'
        );
      }
    } catch (err: any) {
      setArsipError(
        err.response?.data?.message || 'Nomor surat tidak terdaftar pada modul Arsip.'
      );
    } finally {
      setIsCheckingArsip(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isArsipVerified) return;

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

    // Maks 10 MB
    if (file.size > 10 * 1024 * 1024) {
      setFileError('Ukuran file maksimal 10 MB.');
      setFileDokumen(null);
      return;
    }

    setFileDokumen(file);
  };

  const onSubmit = async (values: KebijakanFormValues) => {
    if (!isArsipVerified || !arsipCheckResult) {
      toast.error('Pastikan nomor surat telah terdaftar dan terverifikasi pada modul Arsip.');
      return;
    }

    if (!fileDokumen) {
      setFileError('Berkas scan dokumen resmi PDF wajib diunggah.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('nomor_surat', values.nomor_surat.trim());

      if (arsipCheckResult.id) {
        formData.append('nomor_surat_arsip_id', arsipCheckResult.id.toString());
      }
      if (arsipCheckResult.perihal) {
        formData.append('judul', arsipCheckResult.perihal.trim());
      }
      if (arsipCheckResult.tanggal_surat) {
        formData.append('tanggal_penetapan', arsipCheckResult.tanggal_surat);
        formData.append('tanggal_berlaku', arsipCheckResult.tanggal_surat);
      }
      if (defaultKategoriId) {
        formData.append('kategori_kebijakan_id', defaultKategoriId);
      }
      formData.append('is_active', '1');
      formData.append('file_dokumen', fileDokumen);

      const res = await simpegKebijakanPedomanService.create(formData);
      if (res.status === 'success') {
        toast.success('Kebijakan berhasil ditambahkan dan disinkronkan ke Arsip!');
        router.push('/simpeg/kebijakan-pedoman');
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Gagal menyimpan kebijakan dan pedoman'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex-col gap-4 space-y-4">
      <PageHeader
        title="Tambah Kebijakan & Pedoman"
        description="Penerbitan kebijakan, pedoman, atau SOP kepegawaian baru terintegrasi langsung dengan nomor surat Arsip"
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

      <div className="w-full bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: Alur Penomoran Arsip */}
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs border-b border-slate-200 pb-2">
              <ShieldCheck size={16} className="text-[var(--module-primary)]" />
              Integrasi Nomor Surat Resmi (Modul Arsip)
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
                  {isCheckingArsip ? 'Memeriksa...' : 'Cek ke Modul Arsip'}
                </Button>
              </div>
            </div>

            {/* Status Pesan Pengecekan Arsip: Error / Tidak Ditemukan */}
            {arsipError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold block">Nomor Tidak Ditemukan:</span>
                  <span>{arsipError}</span>
                </div>
              </div>
            )}

            {/* Status Pesan Pengecekan Arsip: Valid / Nomor Terdaftar pada Arsip */}
            {isArsipVerified && arsipCheckResult && (
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                <div className="space-y-1 w-full">
                  <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                    Nomor Terdaftar pada Arsip
                    <span className="px-1.5 py-0.5 rounded text-2xs bg-emerald-200 text-emerald-900 font-bold uppercase">
                      Valid
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-2xs text-emerald-950 pt-1 border-t border-emerald-200/60">
                    <div>
                      <span className="text-emerald-700 font-medium">Perihal / Judul Surat:</span>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {arsipCheckResult.perihal || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-emerald-700 font-medium">Tanggal Terbit Surat:</span>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {arsipCheckResult.tanggal_surat || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-emerald-700 font-medium">Unit Kerja / Klasifikasi:</span>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {arsipCheckResult.kode_unit || '-'} / {arsipCheckResult.kode_klasifikasi || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-emerald-700 font-medium">Status Arsip:</span>
                      <p className="font-semibold text-slate-800 mt-0.5 capitalize">
                        {arsipCheckResult.status || 'Aktif'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Unggah Dokumen Scan PDF Resmi */}
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                Dokumen Scan PDF Resmi <span className="text-red-500">*</span>
                {!isArsipVerified && (
                  <span className="inline-flex items-center gap-1 text-2xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                    <Lock size={10} /> Terkunci (Perlu Verifikasi Arsip)
                  </span>
                )}
              </span>
              <span className="text-2xs text-slate-500">
                Format PDF, Maks. 10 MB (Otomatis disinkronkan ke Arsip)
              </span>
            </div>

            {!isArsipVerified ? (
              // Status SEBELUM Nomor Terdaftar pada Arsip: DOKUMEN SCAN TIDAK BISA DI-UPLOAD
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-6 bg-slate-100/70 text-slate-400 cursor-not-allowed select-none">
                <Lock size={26} className="text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-600">
                  Dokumen Scan PDF Belum Dapat Diunggah
                </span>
                <span className="text-2xs text-slate-500 mt-1 text-center max-w-md">
                  Silakan masukkan nomor surat resmi pada kolom di atas lalu klik{' '}
                  <strong className="text-slate-700 font-semibold">&quot;Cek ke Modul Arsip&quot;</strong>.
                  Setelah status <strong className="text-emerald-700 font-semibold">&quot;Nomor Terdaftar pada Arsip&quot;</strong> terkonfirmasi, tombol unggah berkas akan aktif secara otomatis.
                </span>
              </div>
            ) : !fileDokumen ? (
              // Status SETELAH Nomor Terdaftar pada Arsip: DOKUMEN LANGSUNG BISA DI-UPLOAD
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-400 rounded-lg p-6 bg-emerald-50/30 hover:border-[var(--module-primary)] hover:bg-slate-50 cursor-pointer transition-colors">
                <UploadCloud size={30} className="text-emerald-600 mb-2" />
                <span className="text-xs font-semibold text-slate-800">
                  Klik untuk pilih atau seret berkas scan PDF kebijakan ke sini
                </span>
                <span className="text-2xs text-slate-500 mt-1">
                  Berkas PDF akan otomatis disimpan ke disk privat dan disinkronkan ke nomor surat di modul Arsip
                </span>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              // Berkas PDF telah dipilih
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-50 text-red-600">
                    <FileText size={20} />
                  </div>
                  <div>
                    <span className="font-medium text-xs text-slate-800 block">
                      {fileDokumen.name}
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
                  className="text-red-600 border-red-200 hover:bg-red-50 h-8 text-xs"
                >
                  <Trash2 size={14} className="mr-1" />
                  Ganti Berkas
                </Button>
              </div>
            )}

            {fileError && (
              <span className="text-xs text-red-600 block">{fileError}</span>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Link href="/simpeg/kebijakan-pedoman">
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Batal
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !isArsipVerified || !fileDokumen}
              className="bg-[var(--module-primary)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan & Sinkron Arsip...' : 'Simpan & Sinkronkan ke Arsip'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
