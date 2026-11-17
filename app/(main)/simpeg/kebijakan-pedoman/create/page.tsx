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
} from 'lucide-react';
import toast from 'react-hot-toast';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { simpegKebijakanPedomanService } from '@/services/simpeg.kebijakan-pedoman.service';
import type { CheckSkResult } from '@/types/arsip.types';
import type { MasterKategoriKebijakan } from '@/types/simpeg.kebijakan-pedoman.types';

// Zod Schema Form Validation
const kebijakanFormSchema = z
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

type KebijakanFormValues = z.infer<typeof kebijakanFormSchema>;

export default function CreateKebijakanPedomanPage() {
  const router = useRouter();
  const [masters, setMasters] = useState<MasterKategoriKebijakan[]>([]);
  const [fileDokumen, setFileDokumen] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Arsip integration state
  const [isCheckingArsip, setIsCheckingArsip] = useState(false);
  const [arsipCheckResult, setArsipCheckResult] = useState<CheckSkResult | null>(null);
  const [arsipError, setArsipError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<KebijakanFormValues>({
    resolver: zodResolver(kebijakanFormSchema),
    defaultValues: {
      nomor_surat: '',
      judul: '',
      kategori_kebijakan_id: '',
      pejabat_penetap: 'Rektor Institut',
      tanggal_penetapan: new Date().toISOString().split('T')[0],
      tanggal_berlaku: new Date().toISOString().split('T')[0],
      tanggal_berakhir: '',
      deskripsi: '',
      is_active: 'true',
    },
  });

  const watchedNomorSurat = watch('nomor_surat');

  // Load masters
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const res = await simpegKebijakanPedomanService.getMasters();
        if (res.status === 'success' && res.data) {
          setMasters(res.data);
          if (res.data.length > 0) {
            setValue('kategori_kebijakan_id', res.data[0].id.toString());
          }
        }
      } catch (err: any) {
        toast.error('Gagal memuat master kategori kebijakan');
      }
    };
    loadMasters();
  }, [setValue]);

  // Handle cek nomor ke modul Arsip
  const handleCheckNomorArsip = async () => {
    const nomor = watchedNomorSurat?.trim();
    if (!nomor) {
      setArsipError('Masukkan nomor surat terlebih dahulu untuk diverifikasi ke Arsip.');
      return;
    }

    setIsCheckingArsip(true);
    setArsipError(null);
    setArsipCheckResult(null);

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

    // Maks 10 MB
    if (file.size > 10 * 1024 * 1024) {
      setFileError('Ukuran file maksimal 10 MB.');
      setFileDokumen(null);
      return;
    }

    setFileDokumen(file);
  };

  const onSubmit = async (values: KebijakanFormValues) => {
    if (!fileDokumen) {
      setFileError('Berkas scan dokumen resmi wajib diunggah.');
      return;
    }

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

      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
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

            {/* Status Pesan Pengecekan Arsip */}
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
                    Nomor Terdaftar pada Arsip
                    <span className="px-1.5 py-0.2 rounded text-3xs bg-emerald-200 text-emerald-900 font-bold uppercase">
                      Valid
                    </span>
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
                    <div>
                      <span className="text-emerald-700">Unit / Klasifikasi:</span>{' '}
                      <span className="font-medium">
                        {arsipCheckResult.kode_unit || '-'} / {arsipCheckResult.kode_klasifikasi || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-700">Status Nomor:</span>{' '}
                      <span className="font-medium capitalize">{arsipCheckResult.status || 'Aktif'}</span>
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
              placeholder="Contoh: Rektor Institut / Ketua Yayasan"
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
                placeholder="Ringkasan poin pokok, sasaran kebijakan, atau catatan operasional terkait pedoman..."
                error={errors.deskripsi?.message}
                {...register('deskripsi')}
              />
            </div>
          </div>

          {/* Section 3: Unggah Dokumen Scan PDF */}
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-semibold text-xs text-slate-800">
                Dokumen Scan PDF Resmi <span className="text-red-500">*</span>
              </span>
              <span className="text-2xs text-slate-500">
                Format PDF, Maks. 10 MB (Otomatis disinkronkan ke Arsip)
              </span>
            </div>

            {!fileDokumen ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-6 bg-white hover:border-[var(--module-primary)] hover:bg-slate-50 cursor-pointer transition-colors">
                <UploadCloud size={28} className="text-slate-400 mb-2" />
                <span className="text-xs font-medium text-slate-700">
                  Pilih atau seret berkas scan PDF kebijakan ke sini
                </span>
                <span className="text-2xs text-slate-400 mt-0.5">
                  Dokumen akan disimpan aman pada penyimpanan privat dan bertanda-tangan digital
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
                  className="text-red-600 border-red-200 hover:bg-red-50 h-8"
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
              disabled={isSubmitting}
              className="bg-[var(--module-primary)] text-white hover:opacity-90"
            >
              {isSubmitting ? 'Menyimpan & Sinkron Arsip...' : 'Simpan & Sinkronkan ke Arsip'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
