'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import {
  Boxes,
  Hash,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { sinapraService } from '@/services/sinapra.service';
import { simpegService } from '@/services/simpeg.service';
import { siakadService } from '@/services/siakad.service';
import type { KategoriAset, Ruangan, PreviewNomorInventarisData } from '@/types/sinapra.types';

const asetFormSchema = z.object({
  mode: z.enum(['satuan', 'bulk']),
  kategori_id: z.number().int().min(1, 'Kategori aset wajib dipilih'),
  ruangan_id: z.number().int().nullable().optional(),
  program_studi_id: z.number().int().nullable().optional(),
  penanggung_jawab_pegawai_id: z.number().int().nullable().optional(),
  nama: z.string().min(2, 'Nama barang / inventaris minimal 2 karakter'),
  merk: z.string().optional(),
  model: z.string().optional(),
  nomor_seri: z.string().optional(),
  jumlah_barang: z.number().int().min(1, 'Minimal 1 unit barang').max(100, 'Maksimal 100 unit barang'),
  nomor_urut: z.number().int().min(1, 'Nomor urut minimal 1').nullable().optional(),
  tanggal_perolehan: z.string().min(1, 'Tanggal perolehan wajib diisi'),
  harga_perolehan: z.number().min(0, 'Harga perolehan tidak boleh bernilai negatif'),
  kondisi: z.enum(['baik', 'rusak_ringan', 'rusak_berat']),
  status: z.enum(['tersedia', 'dipinjam', 'maintenance', 'disetujui_diapkir']),
  is_borrowable: z.boolean(),
  is_lab_asset: z.boolean(),
  spesifikasi: z.string().optional(),
  keterangan: z.string().optional(),
});

type AsetFormData = z.infer<typeof asetFormSchema>;

export default function CreateAsetPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('sinapra.aset.create');

  const [submitting, setSubmitting] = useState(false);
  const [selectedKategori, setSelectedKategori] = useState<{ value: string; label: string; kode?: string } | null>(null);
  const [selectedRuangan, setSelectedRuangan] = useState<{ value: string; label: string; id?: number } | null>(null);
  const [selectedProdi, setSelectedProdi] = useState<{ value: string; label: string } | null>(null);
  const [selectedPegawai, setSelectedPegawai] = useState<{ value: string; label: string } | null>(null);

  const [previewData, setPreviewData] = useState<PreviewNomorInventarisData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<AsetFormData>({
    resolver: zodResolver(asetFormSchema),
    defaultValues: {
      mode: 'satuan',
      kategori_id: 0,
      ruangan_id: null,
      program_studi_id: null,
      penanggung_jawab_pegawai_id: null,
      nama: '',
      merk: '',
      model: '',
      nomor_seri: '',
      jumlah_barang: 1,
      nomor_urut: null,
      tanggal_perolehan: todayStr,
      harga_perolehan: 0,
      kondisi: 'baik',
      status: 'tersedia',
      is_borrowable: true,
      is_lab_asset: false,
      spesifikasi: '',
      keterangan: '',
    },
  });

  const watchMode = watch('mode');
  const watchKategori = watch('kategori_id');
  const watchRuangan = watch('ruangan_id');
  const watchTanggal = watch('tanggal_perolehan');
  const watchJumlah = watch('jumlah_barang');
  const watchNomorUrut = watch('nomor_urut');

  // Kalkulasi tahun dari tanggal perolehan
  const parsedDate = watchTanggal ? new Date(watchTanggal) : new Date();
  const tahunAset = isNaN(parsedDate.getFullYear()) ? new Date().getFullYear() : parsedDate.getFullYear();

  // Load preview dari server
  const fetchPreview = useCallback(async () => {
    try {
      setLoadingPreview(true);
      const res = await sinapraService.getPreviewNomorAset({
        kategori_id: watchKategori ? Number(watchKategori) : undefined,
        ruangan_id: watchRuangan ? Number(watchRuangan) : undefined,
        tahun: tahunAset,
        nomor_urut: watchNomorUrut ? Number(watchNomorUrut) : undefined,
        jumlah: watchMode === 'bulk' ? (watchJumlah || 1) : 1,
      });
      if (res.data) {
        setPreviewData(res.data);
      }
    } catch {
      // Ignore preview errors silently
    } finally {
      setLoadingPreview(false);
    }
  }, [watchKategori, watchRuangan, tahunAset, watchNomorUrut, watchMode, watchJumlah]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPreview();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchPreview]);

  // Fallback simulasi kode jika preview server belum kembali
  const displayKodeRuangan = previewData?.kode_ruangan || (watchRuangan ? `RF${String(watchRuangan).padStart(3, '0')}` : 'RF000');
  const displayKodeKategori = previewData?.kode_kategori || (selectedKategori?.kode || 'AST');
  const displayStartUrut = previewData?.nomor_urut_mulai || (watchNomorUrut || 1);
  const displayEndUrut = previewData?.nomor_urut_selesai || (displayStartUrut + (watchMode === 'bulk' ? (watchJumlah || 1) : 1) - 1);

  const displaySingle = `${displayStartUrut}/${displayKodeRuangan}/${displayKodeKategori}/INDO/${tahunAset}`;
  const displayBulk = `${displayStartUrut} s/d ${displayEndUrut}/${displayKodeRuangan}/${displayKodeKategori}/INDO/${tahunAset}`;

  // Option Loaders untuk AsyncSelect
  const loadKategoriOptions = async (inputValue: string) => {
    try {
      const res: any = await sinapraService.getKategoriList({ search: inputValue });
      const list = res?.data?.items || res?.data || res || [];
      if (Array.isArray(list)) {
        return list.map((k: KategoriAset) => ({
          value: k.id.toString(),
          label: `${k.kode} - ${k.nama}`,
          kode: k.kode,
        }));
      }
      return [];
    } catch {
      return [];
    }
  };

  const loadRuanganOptions = async (inputValue: string) => {
    try {
      const res: any = await sinapraService.getRuanganList({ search: inputValue });
      const list = res?.data?.items || res?.data || res || [];
      if (Array.isArray(list)) {
        return list.map((r: Ruangan) => ({
          value: r.id.toString(),
          label: `${r.kode} - ${r.nama}`,
          id: r.id,
        }));
      }
      return [];
    } catch {
      return [];
    }
  };

  const loadPegawaiOptions = async (inputValue: string) => {
    try {
      const res: any = await simpegService.getPegawaiList({ search: inputValue, limit: 20 });
      const list = res?.data?.items || res?.data?.data || res?.data || [];
      if (Array.isArray(list)) {
        return list.map((p: any) => ({
          value: p.id.toString(),
          label: `${p.nama_lengkap || p.nama}${p.nip ? ` (${p.nip})` : ''}`,
        }));
      }
      return [];
    } catch {
      return [];
    }
  };

  const loadProdiOptions = async (inputValue: string) => {
    try {
      const res: any = await siakadService.getProdi({ search: inputValue });
      const list = res?.data || res || [];
      if (Array.isArray(list)) {
        return list.map((p: any) => ({
          value: p.id.toString(),
          label: `${p.nama} (${p.kode_prodi})`,
        }));
      }
      return [];
    } catch {
      return [];
    }
  };

  const onSubmit = async (data: AsetFormData) => {
    try {
      setSubmitting(true);
      const payload: any = {
        mode: data.mode,
        jumlah_barang: data.mode === 'bulk' ? data.jumlah_barang : 1,
        nomor_urut: data.nomor_urut || undefined,
        kategori_id: data.kategori_id,
        ruangan_id: data.ruangan_id || undefined,
        program_studi_id: data.program_studi_id || undefined,
        penanggung_jawab_pegawai_id: data.penanggung_jawab_pegawai_id || undefined,
        nama: data.nama,
        merk: data.merk || undefined,
        model: data.model || undefined,
        nomor_seri: data.mode === 'satuan' ? (data.nomor_seri || undefined) : undefined,
        tanggal_perolehan: data.tanggal_perolehan,
        harga_perolehan: data.harga_perolehan,
        kondisi: data.kondisi,
        status: data.status,
        is_borrowable: data.is_borrowable,
        is_lab_asset: data.is_lab_asset,
        spesifikasi: data.spesifikasi || undefined,
        keterangan: data.keterangan || undefined,
      };

      const res = await sinapraService.createAset(payload);

      if (Array.isArray(res.data)) {
        toast.success(`Berhasil menambahkan ${res.data.length} unit barang inventaris aset sekaligus!`);
      } else {
        toast.success(`Barang inventaris ${res.data?.nama || ''} (${res.data?.kode_aset || ''}) berhasil ditambahkan!`);
      }

      router.push('/sinapra/aset');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan barang inventaris aset');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canCreate) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader
          title="Tambah Inventaris Aset Baru"
          description="Formulir pendataan barang sarana dan prasarana kampus (Modul SINAPRA)"
          action={
            <Link href="/sinapra/aset">
              <Button
                variant="outline"
                size="md"
                className="border-[var(--module-primary)] text-[var(--module-primary)] hover:bg-[var(--module-primary-subtle)]"
              >
                <ArrowLeft size={16} className="mr-1.5" />
                Kembali
              </Button>
            </Link>
          }
        />
        <div className="bg-white border border-red-200 rounded-xl p-6 text-center shadow-xs">
          <ShieldAlert size={36} className="text-red-500 mx-auto mb-2" />
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Akses Ditolak</h2>
          <p className="text-2xs text-slate-500 max-w-sm mx-auto mb-4">
            Anda tidak memiliki izin (permission <code className="font-mono">sinapra.aset.create</code>) untuk mendaftarkan inventaris aset baru.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push('/sinapra/aset')}
          >
            Kembali ke Daftar Aset
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Tambah Inventaris Aset Baru"
        description="Pendaftaran barang sarana dan prasarana kampus dengan format nomor inventaris baku dan dukungan registrasi satuan atau masal (bulk)"
        action={
          <Link href="/sinapra/aset">
            <Button
              variant="outline"
              size="md"
              className="border-[var(--module-primary)] text-[var(--module-primary)] hover:bg-[var(--module-primary-subtle)]"
            >
              <ArrowLeft size={16} className="mr-1.5" />
              Kembali
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Form Input */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5"
          >
            {/* Header Form */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Boxes size={18} className="text-[var(--module-primary)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Data Inventaris Barang Aset
                </h3>
              </div>
              <Badge
                variant="sinapra"
                className="text-2xs font-mono uppercase border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)]"
              >
                {watchMode === 'bulk' ? 'Pendaftaran Masal (Bulk)' : 'Pendaftaran Satuan'}
              </Badge>
            </div>

            {/* Pilihan Mode Pendaftaran (Satuan vs Masal) */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setValue('mode', 'satuan');
                  setValue('jumlah_barang', 1);
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-md transition-all text-center cursor-pointer ${
                  watchMode === 'satuan'
                    ? 'bg-white text-[var(--module-primary)] font-bold shadow-xs border border-[var(--module-primary)]/20'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Satuan (1 Barang/Aset)
              </button>
              <button
                type="button"
                onClick={() => {
                  setValue('mode', 'bulk');
                  if (watchJumlah < 2) setValue('jumlah_barang', 2);
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-md transition-all text-center cursor-pointer ${
                  watchMode === 'bulk'
                    ? 'bg-white text-[var(--module-primary)] font-bold shadow-xs border border-[var(--module-primary)]/20'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sekaligus / Banyak Barang (Masal / Bulk)
              </button>
            </div>

            {/* Form Fields: Grid 2 Kolom Compact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Kategori Aset */}
              <Controller
                name="kategori_id"
                control={control}
                render={({ field }) => (
                  <AsyncSelect
                    label="Kategori Aset *"
                    placeholder="Cari kategori aset..."
                    loadOptions={loadKategoriOptions}
                    value={selectedKategori}
                    onChange={(sel: any) => {
                      setSelectedKategori(sel);
                      field.onChange(sel ? Number(sel.value) : 0);
                    }}
                    error={errors.kategori_id?.message}
                    required
                  />
                )}
              />

              {/* Lokasi Ruangan */}
              <Controller
                name="ruangan_id"
                control={control}
                render={({ field }) => (
                  <AsyncSelect
                    label="Lokasi Penempatan Ruangan"
                    placeholder="Cari ruangan penempatan..."
                    loadOptions={loadRuanganOptions}
                    value={selectedRuangan}
                    onChange={(sel: any) => {
                      setSelectedRuangan(sel);
                      field.onChange(sel ? Number(sel.value) : null);
                    }}
                    error={errors.ruangan_id?.message}
                    isClearable
                  />
                )}
              />

              {/* Nama Barang */}
              <div className="sm:col-span-2">
                <Input
                  label="Nama Barang / Aset *"
                  placeholder="Contoh: Monitor LED Samsung 24 Inch / Kursi Kuliah Ergonomis"
                  {...register('nama')}
                  error={errors.nama?.message}
                />
              </div>

              {/* Merk */}
              <Input
                label="Merk / Brand"
                placeholder="Contoh: Samsung, Dell, Futura, Asus..."
                {...register('merk')}
                error={errors.merk?.message}
              />

              {/* Model / Tipe */}
              <Input
                label="Tipe / Model"
                placeholder="Contoh: S24R350, Precision 3660, F-101..."
                {...register('model')}
                error={errors.model?.message}
              />

              {/* Mode Masal: Input Jumlah Unit */}
              {watchMode === 'bulk' ? (
                <div className="sm:col-span-2 bg-[var(--module-primary-subtle)] border border-[var(--module-primary)]/20 rounded-lg p-3">
                  <Input
                    label="Jumlah Unit Barang yang Didaftarkan Sekaligus *"
                    type="number"
                    min={1}
                    max={100}
                    placeholder="Contoh: 10"
                    {...register('jumlah_barang', { valueAsNumber: true })}
                    error={errors.jumlah_barang?.message}
                  />
                  <p className="text-2xs text-slate-700 mt-1">
                    Sistem akan membuat <strong>{watchJumlah || 1} unit</strong> record aset identik secara otomatis di database dengan nomor urut berurutan.
                  </p>
                </div>
              ) : (
                /* Mode Satuan: Input Nomor Seri */
                <Input
                  label="Nomor Seri (Serial Number)"
                  placeholder="Contoh: SN-889912001 (Opsional)"
                  {...register('nomor_seri')}
                  error={errors.nomor_seri?.message}
                />
              )}

              {/* Tanggal Perolehan */}
              <Input
                label="Tanggal Perolehan / Pembelian *"
                type="date"
                {...register('tanggal_perolehan')}
                error={errors.tanggal_perolehan?.message}
              />

              {/* Harga Perolehan */}
              <Input
                label={watchMode === 'bulk' ? 'Harga Perolehan Satuan (Rp) *' : 'Harga Perolehan (Rp) *'}
                type="number"
                min={0}
                placeholder="Contoh: 1850000"
                {...register('harga_perolehan', { valueAsNumber: true })}
                error={errors.harga_perolehan?.message}
              />

              {/* Custom Nomor Urut Awal */}
              <div className="sm:col-span-2">
                <Input
                  label="Titik Awal Nomor Urut Inventaris (Opsional)"
                  type="number"
                  min={1}
                  placeholder={`Otomatis melanjutkan sistem: ${previewData?.nomor_urut_mulai || 1}`}
                  {...register('nomor_urut', {
                    setValueAs: (v) => (v === '' || v === null || isNaN(v) ? null : Number(v)),
                  })}
                  error={errors.nomor_urut?.message}
                />
                <p className="text-2xs text-slate-400 mt-1">
                  Kosongkan field ini jika ingin sistem mengalokasikan nomor urut berikutnya secara otomatis dari database.
                </p>
              </div>

              {/* Program Studi */}
              <Controller
                name="program_studi_id"
                control={control}
                render={({ field }) => (
                  <AsyncSelect
                    label="Kepemilikan Aset Prodi (SIAKAD)"
                    placeholder="Pilih prodi pemilik (Opsional)..."
                    loadOptions={loadProdiOptions}
                    value={selectedProdi}
                    onChange={(sel: any) => {
                      setSelectedProdi(sel);
                      field.onChange(sel ? Number(sel.value) : null);
                    }}
                    error={errors.program_studi_id?.message}
                    isClearable
                  />
                )}
              />

              {/* PIC Pegawai */}
              <Controller
                name="penanggung_jawab_pegawai_id"
                control={control}
                render={({ field }) => (
                  <AsyncSelect
                    label="PIC Pegawai Penanggung Jawab (SIMPEG)"
                    placeholder="Cari nama atau NIP pegawai..."
                    loadOptions={loadPegawaiOptions}
                    value={selectedPegawai}
                    onChange={(sel: any) => {
                      setSelectedPegawai(sel);
                      field.onChange(sel ? Number(sel.value) : null);
                    }}
                    error={errors.penanggung_jawab_pegawai_id?.message}
                    isClearable
                  />
                )}
              />

              {/* Kondisi Fisik */}
              <Controller
                name="kondisi"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Kondisi Fisik *"
                    options={[
                      { value: 'baik', label: 'Baik' },
                      { value: 'rusak_ringan', label: 'Rusak Ringan' },
                      { value: 'rusak_berat', label: 'Rusak Berat' },
                    ]}
                    value={field.value}
                    onChange={(val) => field.onChange(val as any)}
                    error={errors.kondisi?.message}
                  />
                )}
              />

              {/* Status Operasional */}
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Status Operasional *"
                    options={[
                      { value: 'tersedia', label: 'Tersedia' },
                      { value: 'dipinjam', label: 'Dipinjam' },
                      { value: 'maintenance', label: 'Maintenance' },
                      { value: 'disetujui_diapkir', label: 'Diapkir / Non-aktif' },
                    ]}
                    value={field.value}
                    onChange={(val) => field.onChange(val as any)}
                    error={errors.status?.message}
                  />
                )}
              />

              {/* Izin Peminjaman */}
              <Controller
                name="is_borrowable"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Izin Peminjaman Aset *"
                    options={[
                      { value: 'true', label: 'Bisa Dipinjam (Mahasiswa / Dosen / Tendik)' },
                      { value: 'false', label: 'Tidak Bisa Dipinjam (Khusus Internal Ruangan)' },
                    ]}
                    value={field.value ? 'true' : 'false'}
                    onChange={(val) => field.onChange(val === 'true')}
                  />
                )}
              />

              {/* Kategori Lab */}
              <Controller
                name="is_lab_asset"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Aset Khusus Laboratorium *"
                    options={[
                      { value: 'false', label: 'Bukan Aset Khusus Lab (Umum / Kelas / Kantor)' },
                      { value: 'true', label: 'Ya, Aset Peralatan Khusus Laboratorium' },
                    ]}
                    value={field.value ? 'true' : 'false'}
                    onChange={(val) => field.onChange(val === 'true')}
                  />
                )}
              />

              {/* Spesifikasi Tambahan */}
              <div className="sm:col-span-2">
                <Textarea
                  label="Spesifikasi Tambahan (Opsional)"
                  rows={2}
                  placeholder="Contoh: Layar 24 Inch FHD, 75Hz, Panel IPS, Input HDMI & VGA, Konsumsi daya 25 Watt..."
                  {...register('spesifikasi')}
                  error={errors.spesifikasi?.message}
                />
              </div>

              {/* Catatan / Keterangan */}
              <div className="sm:col-span-2">
                <Textarea
                  label="Catatan / Keterangan Pengadaan (Opsional)"
                  rows={2}
                  placeholder="Contoh: Pengadaan fasilitas lab komputer semester ganjil tahun 2023, garansi resmi 3 tahun distributor..."
                  {...register('keterangan')}
                  error={errors.keterangan?.message}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => router.push('/sinapra/aset')}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="bg-[var(--module-primary)] hover:opacity-90 text-white"
                isLoading={submitting}
              >
                <CheckCircle2 size={16} className="mr-1.5" />
                {watchMode === 'bulk'
                  ? `Daftarkan ${watchJumlah || 1} Unit Aset Sekaligus`
                  : 'Simpan Barang Aset'}
              </Button>
            </div>
          </form>
        </div>

        {/* Kolom Kanan: Preview Format & Pedoman */}
        <div className="space-y-4">
          {/* Card Preview Format Penomoran */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Hash size={16} className="text-[var(--module-primary)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Preview Nomor Inventaris
                </h3>
              </div>
              {loadingPreview && (
                <span className="text-2xs text-[var(--module-primary)] animate-pulse font-medium">
                  Menghitung...
                </span>
              )}
            </div>

            {/* Simulasi Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center space-y-1">
              <span className="text-2xs uppercase tracking-wider font-semibold text-slate-400 block">
                {watchMode === 'bulk' ? 'Rentang Nomor Inventaris Masal' : 'Simulasi Nomor Inventaris Satuan'}
              </span>
              <p className="font-mono text-xs font-bold text-slate-900 break-all">
                {watchMode === 'bulk' ? displayBulk : displaySingle}
              </p>
              <span className="text-2xs text-slate-500 block">
                Tahun Terbit: {tahunAset} • Kode Institusi: INDO
              </span>
            </div>

            {/* Status Info */}
            <div className="flex items-center gap-1.5">
              <Badge
                variant="sinapra"
                className="text-2xs font-semibold border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)]"
              >
                Format: {`{nomor_urut}/{kode_ruangan}/{kode_kategori}/INDO/{tahun}`}
              </Badge>
            </div>

            {/* Rincian Komponen Nomor Inventaris */}
            <div className="space-y-2 text-2xs text-slate-600 border-t border-slate-100 pt-3">
              <span className="font-bold text-slate-800 block text-xs">
                Rincian Elemen Nomor:
              </span>

              <div className="flex items-start gap-2 bg-slate-50/80 p-2 rounded-md">
                <span className="font-mono font-bold text-[var(--module-primary)] w-12 shrink-0">
                  {watchMode === 'bulk' ? `${displayStartUrut}-${displayEndUrut}` : displayStartUrut}
                </span>
                <span>
                  <strong>Nomor Urut Inventaris:</strong> Urutan otomatis berurutan dari database atau custom titik awal.
                </span>
              </div>

              <div className="flex items-start gap-2 bg-slate-50/80 p-2 rounded-md">
                <span className="font-mono font-bold text-slate-800 w-12 shrink-0">
                  {displayKodeRuangan}
                </span>
                <span>
                  <strong>Kode Ruangan:</strong> Diambil dari isian Lokasi Penempatan Ruangan (contoh: RF075 dari ruangan ID 75).
                </span>
              </div>

              <div className="flex items-start gap-2 bg-slate-50/80 p-2 rounded-md">
                <span className="font-mono font-bold text-slate-800 w-12 shrink-0">
                  {displayKodeKategori}
                </span>
                <span>
                  <strong>Kode Barang:</strong> Diambil dari kode master Kategori Aset yang dipilih.
                </span>
              </div>

              <div className="flex items-start gap-2 bg-slate-50/80 p-2 rounded-md">
                <span className="font-mono font-bold text-slate-800 w-12 shrink-0">
                  INDO
                </span>
                <span>
                  <strong>Kode Default Institusi:</strong> Kode identitas tetap institusi untuk seluruh aset kampus.
                </span>
              </div>

              <div className="flex items-start gap-2 bg-slate-50/80 p-2 rounded-md">
                <span className="font-mono font-bold text-slate-800 w-12 shrink-0">
                  {tahunAset}
                </span>
                <span>
                  <strong>Tahun Nomor Terbit:</strong> Diambil dari tahun tanggal perolehan/pembelian barang.
                </span>
              </div>
            </div>
          </div>

          {/* Card Pedoman & Barcode */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Sparkles size={16} className="text-[var(--module-primary)]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Panduan Registrasi Masal & Label
              </h3>
            </div>

            <div className="text-2xs text-slate-500 space-y-2">
              <div className="flex items-start gap-2">
                <Layers size={14} className="text-[var(--module-primary)] shrink-0 mt-0.5" />
                <p>
                  <strong className="text-slate-700">Pendaftaran Masal (Bulk):</strong> Cocok untuk pembelian banyak barang sejenis di ruangan yang sama (seperti 10 monitor, 30 kursi kelas). Sistem secara aman mengalokasikan nomor urut berurutan dalam satu transaksi.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-slate-700">Pencetakan QR Code & Label Fisik:</strong> Setelah disimpan, Anda dapat langsung mencetak lembar stiker barcode dan QR Code fisik pada menu aksi tabel aset.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
