'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, Search, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { z } from 'zod';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { useAuth } from '@/hooks/useAuth';
import { siakadService } from '@/services/siakad.service';
import { arsipService } from '@/services/arsip.service';
import type { CheckSkResult } from '@/types/arsip.types';
import toast from 'react-hot-toast';

const detailSchema = z.object({
  mata_kuliah_diakui_id: z
    .number()
    .min(1, 'Pilih mata kuliah kurikulum lokal'),
  kode_mk_asal: z.string().min(1, 'Kode MK asal wajib diisi'),
  nama_mk_asal: z.string().min(1, 'Nama MK asal wajib diisi'),
  sks_asal: z
    .number()
    .min(1, 'SKS asal minimal 1')
    .max(10, 'SKS asal maksimal 10'),
  nilai_huruf_asal: z.string().min(1, 'Nilai huruf asal wajib diisi'),
});

const konversiCreateSchema = z.object({
  mahasiswa_id: z.number().optional(),
  kampus_asal: z.string().min(1, 'Perguruan tinggi / kampus asal wajib diisi'),
  prodi_asal: z.string().min(1, 'Program studi asal wajib diisi'),
  nomor_sk: z.string().max(150, 'Nomor SK maksimal 150 karakter').optional().or(z.literal('')),
  catatan: z.string().optional().or(z.literal('')),
  details: z.array(detailSchema).min(1, 'Minimal harus ada 1 baris mata kuliah konversi'),
});

type KonversiCreateFormData = z.infer<typeof konversiCreateSchema>;

export default function CreateKonversiTransferPage() {
  const router = useRouter();
  const { isMahasiswa } = useAuth();
  const [existingKonversi, setExistingKonversi] = useState<any | null>(null);

  const [skCheck, setSkCheck] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    message?: string;
    data?: CheckSkResult | null;
  }>({
    status: 'idle',
    data: null,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<KonversiCreateFormData>({
    resolver: zodResolver(konversiCreateSchema),
    defaultValues: {
      mahasiswa_id: 0,
      kampus_asal: '',
      prodi_asal: '',
      nomor_sk: '',
      catatan: '',
      details: [
        {
          mata_kuliah_diakui_id: 0,
          kode_mk_asal: '',
          nama_mk_asal: '',
          sks_asal: 3,
          nilai_huruf_asal: 'A',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'details',
  });

  const watchNomorSk = useWatch({ control, name: 'nomor_sk' });
  const canEditExisting = !existingKonversi || ['draft', 'diajukan'].includes(existingKonversi.status);

  useEffect(() => {
    setSkCheck((prev) => (prev.status === 'idle' ? prev : { status: 'idle', data: null }));
  }, [watchNomorSk]);

  useEffect(() => {
    if (!isMahasiswa) return;
    let active = true;
    siakadService.getKonversis({ per_page: 1 })
      .then((response) => {
        const rows = Array.isArray(response.data) ? response.data : [];
        const existing = rows[0] || null;
        if (!active) return;
        setExistingKonversi(existing);
        if (existing) {
          reset({
            mahasiswa_id: 0,
            kampus_asal: existing.kampus_asal || '',
            prodi_asal: existing.prodi_asal || '',
            nomor_sk: existing.nomor_sk || '',
            catatan: existing.catatan || '',
            details: (existing.details || []).map((detail: any) => ({
              mata_kuliah_diakui_id: Number(detail.mata_kuliah_diakui_id),
              kode_mk_asal: detail.kode_mk_asal || '',
              nama_mk_asal: detail.nama_mk_asal || '',
              sks_asal: Number(detail.sks_asal || 1),
              nilai_huruf_asal: detail.nilai_huruf_asal || '',
            })),
          });
        }
      })
      .catch(() => toast.error('Gagal memuat status pengajuan konversi Anda'));

    return () => {
      active = false;
    };
  }, [isMahasiswa, reset]);

  const handleCheckSk = async () => {
    const nomor = (watchNomorSk || '').trim();
    if (!nomor) {
      toast.error('Masukkan nomor SK terlebih dahulu untuk dicek ke Arsip');
      return;
    }

    setSkCheck({ status: 'checking' });
    try {
      const res = await arsipService.checkNomorSk(nomor);
      const resData = res?.data;
      if (resData?.is_valid && resData?.has_document) {
        setSkCheck({
          status: 'valid',
          message: res.message || 'Nomor SK sah dan dokumen fisik SK terverifikasi di modul Arsip.',
          data: resData,
        });
        toast.success('Nomor SK sah dan berkas dokumen terverifikasi di Arsip!');
      } else if (resData && !resData.has_document) {
        setSkCheck({
          status: 'invalid',
          message: 'Nomor SK terdaftar di sistem Arsip, namun belum memiliki lampiran berkas dokumen fisik (dokumen kosong).',
          data: resData,
        });
        toast.error('Dokumen fisik SK belum diunggah di modul Arsip');
      } else {
        setSkCheck({
          status: 'invalid',
          message: res.message || 'Nomor SK tidak memenuhi syarat keabsahan di modul Arsip.',
          data: resData,
        });
        toast.error('Nomor SK tidak sah di modul Arsip');
      }
    } catch (err: any) {
      const respData = err?.response?.data?.data;
      const msg = err?.response?.data?.message || err?.message || 'Nomor SK tidak ditemukan di modul Arsip.';
      setSkCheck({
        status: 'invalid',
        message: msg,
        data: respData || null,
      });
      toast.error(msg);
    }
  };

  const loadMahasiswaOptions = useCallback(async (inputValue: string) => {
    try {
      const res = await siakadService.getMahasiswas({
        search: inputValue || undefined,
        per_page: 20,
      });
      const data = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
      return data.map((m: any) => ({
        value: m.id,
        label: `${m.nama_lengkap} (${m.nim || 'Belum ada NIM'}) • ${m.program_studi?.nama || 'Prodi'} • Angkatan ${m.angkatan || '-'}`,
      }));
    } catch {
      return [];
    }
  }, []);

  const loadMataKuliahOptions = useCallback(async (inputValue: string) => {
    try {
      const res = await siakadService.getMataKuliahs({
        search: inputValue || undefined,
        per_page: 20,
      });
      const data = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
      return data.map((mk: any) => ({
        value: mk.id,
        label: `${mk.kode_mk || ''} - ${mk.nama || ''} (${mk.total_sks || mk.sks_total || mk.sks_teori || 0} SKS)`.trim(),
      }));
    } catch {
      return [];
    }
  }, []);

  const handleAddDetail = () => {
    append({
      mata_kuliah_diakui_id: 0,
      kode_mk_asal: '',
      nama_mk_asal: '',
      sks_asal: 3,
      nilai_huruf_asal: 'A',
    });
  };

  const onSubmit = async (data: KonversiCreateFormData) => {
    if (!isMahasiswa && !data.mahasiswa_id) {
      toast.error('Pilih mahasiswa penerima konversi terlebih dahulu.');
      return;
    }
    try {
      const payload = {
        ...data,
        status: 'diajukan',
        ...(isMahasiswa ? { mahasiswa_id: undefined } : {}),
      };
      if (isMahasiswa && existingKonversi) {
        await siakadService.updateKonversi(existingKonversi.id, payload);
      } else {
        await siakadService.createKonversi(payload);
      }
      toast.success('Pengajuan konversi nilai berhasil dikirim untuk pemetaan program studi.');
      if (isMahasiswa) {
        const response = await siakadService.getKonversis({ per_page: 1 });
        setExistingKonversi(Array.isArray(response.data) ? response.data[0] || null : null);
      } else {
        router.push('/siakad/civitas/konversi');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan data konversi');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={isMahasiswa ? 'Pengajuan Konversi Nilai' : 'Input Konversi Nilai Mahasiswa Transfer'}
        description={isMahasiswa
          ? 'Ajukan mata kuliah dari kampus sebelumnya. Pemetaan final mata kuliah lokal ditentukan oleh pengelola program studi.'
          : 'Penyetaraan dan mapping mata kuliah mahasiswa pindahan dari perguruan tinggi sebelumnya ke kurikulum aktif.'}
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Konversi Nilai', href: isMahasiswa ? '/siakad/konversi' : '/siakad/civitas/konversi' },
          { label: isMahasiswa ? 'Pengajuan' : 'Input Penyetaraan' },
        ]}
        action={
          <Button
            variant="outline"
            icon={<ArrowLeft size={16} />}
            onClick={() => router.push(isMahasiswa ? '/siakad' : '/siakad/civitas/konversi')}
          >
            Kembali
          </Button>
        }
      />

      <div className="card p-6 bg-white border border-slate-200 shadow-xs">
        {isMahasiswa && existingKonversi && !canEditExisting ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="font-bold text-slate-900">Pengajuan Anda sedang diproses</p>
              <p className="mt-1 text-sm text-slate-700">
                Status: <strong className="capitalize">{existingKonversi.status.replaceAll('_', ' ')}</strong>
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Anda dapat melihat hasil keputusan di sini. Perubahan data tidak tersedia setelah tahap verifikasi dimulai.
              </p>
            </div>
            <ul className="divide-y divide-slate-100">
              {(existingKonversi.details || []).map((detail: any) => (
                <li key={detail.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span>{detail.nama_mk_asal} ({detail.kode_mk_asal})</span>
                  <span className="text-right font-semibold text-slate-700">
                    {detail.mata_kuliah_diakui?.nama || 'Pemetaan belum tersedia'}
                    <span className="ml-2 text-xs capitalize text-slate-500">{detail.status}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900">1. Asal Perguruan Tinggi</h3>
            <p className="text-2xs text-slate-500">Isi institusi dan program studi tempat Anda pernah menempuh mata kuliah.</p>
          </div>

          <div className="space-y-4">
            {!isMahasiswa && (
              <Controller
                control={control}
                name="mahasiswa_id"
                render={({ field }) => (
                  <AsyncSelect
                    label="Pilih Mahasiswa Penerima Konversi *"
                    required
                    placeholder="Ketik nama atau NIM mahasiswa..."
                    loadOptions={loadMahasiswaOptions}
                    defaultOptions={true}
                    value={field.value}
                    onChange={(opt: any) => field.onChange(opt ? Number(opt.value) : 0)}
                    error={errors.mahasiswa_id?.message}
                  />
                )}
              />
            )}

            {isMahasiswa && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-900">
                Usulan mata kuliah lokal adalah kandidat. Kaprodi atau admin program studi menetapkan pemetaan resmi sebelum ditinjau Dosen PA.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Perguruan Tinggi / Kampus Asal *"
                required
                placeholder="Contoh: Universitas Gadjah Mada"
                error={errors.kampus_asal?.message}
                {...register('kampus_asal')}
              />

              <Input
                label="Program Studi Asal *"
                required
                placeholder="Contoh: D3 Teknik Informatika"
                error={errors.prodi_asal?.message}
                {...register('prodi_asal')}
              />
            </div>

            {!isMahasiswa && (
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Nomor SK Penyetaraan (dari Modul Arsip)"
                    placeholder="Contoh: 001/SK-KONV/UTI/2026"
                    className="font-mono uppercase"
                    error={errors.nomor_sk?.message}
                    {...register('nomor_sk')}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 shrink-0"
                  style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
                  icon={<Search size={16} />}
                  onClick={handleCheckSk}
                  loading={skCheck.status === 'checking'}
                  disabled={skCheck.status === 'checking'}
                >
                  CEK
                </Button>
              </div>
              <p className="text-2xs text-slate-500">
                Nomor SK resmi dari modul Arsip dapat diverifikasi secara langsung keabsahan surat dan kelengkapan dokumen fisiknya.
              </p>

              {/* Feedback Status Cek SK Arsip */}
              {skCheck.status === 'valid' && skCheck.data && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>SK Sah &amp; Dokumen Fisik Terverifikasi di Arsip</span>
                    </div>
                    <Badge variant="success" className="text-2xs font-mono uppercase">
                      {skCheck.data.status || 'Terpakai'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 pt-1 border-t border-emerald-100">
                    <div>
                      <span className="text-slate-400 text-2xs block">Perihal Surat:</span>
                      <span className="font-medium">{skCheck.data.perihal || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-2xs block">Tanggal Penetapan Surat:</span>
                      <span className="font-medium">{skCheck.data.tanggal_surat || '-'}</span>
                    </div>
                  </div>

                  {skCheck.data.dokumen_url && (
                    <div className="pt-1 flex items-center justify-between border-t border-emerald-100 text-2xs">
                      <span className="text-emerald-700 font-medium">Dokumen fisik SK terlampir di modul Arsip</span>
                      <a
                        href={skCheck.data.dokumen_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold underline"
                      >
                        <span>Lihat Berkas SK</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {skCheck.status === 'invalid' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs flex items-start gap-2 text-red-700 animate-fade-in">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold block">Pemeriksaan SK Gagal:</span>
                    <p className="text-2xs text-red-600 leading-relaxed">
                      {skCheck.message || 'Nomor SK tidak ditemukan atau belum memiliki lampiran berkas fisik di modul Arsip.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            )}

            <div>
              <Input
                label="Catatan Tambahan (Opsional)"
                placeholder="Catatan khusus terkait konversi nilai mahasiswa transfer ini..."
                error={errors.catatan?.message}
                {...register('catatan')}
              />
            </div>
          </div>

          <div className="border-b border-slate-100 pb-3 pt-2 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                2. Mata Kuliah Asal ({fields.length} MK)
              </h3>
              <p className="text-2xs text-slate-500">
                {isMahasiswa
                  ? 'Cantumkan riwayat mata kuliah dan kandidat padanan lokal. Program studi dapat mengubah atau menetapkan padanan resmi.'
                  : 'Cantumkan mata kuliah asal dan tentukan pemetaan kurikulum lokal untuk ditinjau PA.'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              icon={<Plus size={14} />}
              onClick={handleAddDetail}
              className="text-xs font-bold"
            >
              Tambah Baris MK
            </Button>
          </div>

          {errors.details?.message && (
            <p className="text-xs text-rose-600 font-bold">{errors.details.message}</p>
          )}

          <div className="space-y-4">
            {fields.map((field, idx) => (
              <div key={field.id} className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Baris #{idx + 1}
                  </span>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={14} className="text-rose-500" />}
                      className="text-xs text-rose-600 hover:bg-rose-50"
                      onClick={() => remove(idx)}
                    >
                      Hapus
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200">
                    <span className="text-2xs font-bold text-slate-500 block uppercase">Mata Kuliah Asal</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        label="Kode MK Asal *"
                        placeholder="CS101"
                        required
                        error={errors.details?.[idx]?.kode_mk_asal?.message}
                        {...register(`details.${idx}.kode_mk_asal`)}
                      />
                      <div className="sm:col-span-2">
                        <Input
                          label="Nama MK Asal *"
                          placeholder="Dasar Pemrograman"
                          required
                          error={errors.details?.[idx]?.nama_mk_asal?.message}
                          {...register(`details.${idx}.nama_mk_asal`)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="SKS Asal *"
                        type="number"
                        min={1}
                        max={10}
                        required
                        error={errors.details?.[idx]?.sks_asal?.message}
                        {...register(`details.${idx}.sks_asal`, { valueAsNumber: true })}
                      />
                      <Input
                        label="Nilai Huruf Asal *"
                        placeholder="A / B+"
                        required
                        error={errors.details?.[idx]?.nilai_huruf_asal?.message}
                        {...register(`details.${idx}.nilai_huruf_asal`)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200">
                    <span className="text-2xs font-bold text-slate-500 block uppercase">
                      {isMahasiswa ? 'Usulan Padanan MK Lokal' : 'Pemetaan MK Lokal'}
                    </span>
                    <Controller
                      control={control}
                      name={`details.${idx}.mata_kuliah_diakui_id`}
                      render={({ field: selectField }) => (
                        <AsyncSelect
                          label={isMahasiswa ? 'Usulan MK Kurikulum Lokal *' : 'Pilih MK Kurikulum Lokal *'}
                          required
                          placeholder="Cari kode atau nama mata kuliah..."
                          loadOptions={loadMataKuliahOptions}
                          defaultOptions={true}
                          value={selectField.value}
                          onChange={(opt: any) => selectField.onChange(opt ? Number(opt.value) : 0)}
                          error={errors.details?.[idx]?.mata_kuliah_diakui_id?.message}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(isMahasiswa ? '/siakad' : '/siakad/civitas/konversi')}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Save size={16} />}
              loading={isSubmitting}
              disabled={isSubmitting || !canEditExisting}
            >
              {isSubmitting ? 'Mengirim...' : isMahasiswa ? 'Kirim Pengajuan' : 'Simpan Konversi Transfer'}
            </Button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
