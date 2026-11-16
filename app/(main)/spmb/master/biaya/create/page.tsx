'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, AlertCircle, Trash2, Info, Search, CheckCircle2, ExternalLink } from 'lucide-react';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { spmbService } from '@/services/spmb.service';
import { arsipService } from '@/services/arsip.service';
import { formatRupiah } from '@/lib/utils';
import { EVIDENCE_TYPE_OPTIONS } from '@/lib/spmb/master-biaya-options';
import type { MasterKomponenBiaya, MasterTipeJalur } from '@/types/spmb.types';
import type { CheckSkResult } from '@/types/arsip.types';
import toast from 'react-hot-toast';

const masterBiayaFormSchema = z.object({
  master_tipe_jalur_id: z.string().min(1, 'Tipe jalur masuk wajib dipilih'),
  program_studi_id: z.string().min(1, 'Program studi wajib dipilih'),
  evidence_type: z.enum(['arsip', 'upload']),
  nomor_sk: z.string().max(150, 'Nomor SK maksimal 150 karakter').optional().or(z.literal('')),
  dokumen_pendukung: z.any().optional(),
  is_active: z.boolean(),
  keterangan: z.string().max(255, 'Keterangan maksimal 255 karakter').optional().or(z.literal('')),
  items: z.array(
    z.object({
      komponen_biaya_id: z.number(),
      nominal: z.number().min(0, 'Nominal tidak boleh negatif'),
      dibebankan_saat_pendaftaran: z.boolean().optional(),
      berlaku_diskon: z.boolean().optional(),
      nama: z.string(),
      kode: z.string(),
      kategori: z.string().optional().nullable(),
      keterangan: z.string().optional().nullable(),
    })
  ),
}).superRefine((values, context) => {
  if (values.evidence_type === 'arsip' && !values.nomor_sk?.trim()) {
    context.addIssue({ code: 'custom', path: ['nomor_sk'], message: 'Nomor SK wajib diisi.' });
  }
  if (values.evidence_type === 'upload' && !values.dokumen_pendukung?.length) {
    context.addIssue({ code: 'custom', path: ['dokumen_pendukung'], message: 'Dokumen pendukung wajib diunggah.' });
  }
});

type MasterBiayaFormValues = z.infer<typeof masterBiayaFormSchema>;

export default function CreateMasterBiayaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tipeJalurList, setTipeJalurList] = useState<MasterTipeJalur[]>([]);
  const [komponenMaster, setKomponenMaster] = useState<MasterKomponenBiaya[]>([]);
  const [prodiList, setProdiList] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const isLoadedRef = useRef(false);

  const [skCheck, setSkCheck] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    message?: string;
    data?: CheckSkResult | null;
  }>({
    status: 'idle',
    data: null,
  });

  const defaultTipeJalurId = searchParams.get('master_tipe_jalur_id') || '';
  const defaultProdiId = searchParams.get('program_studi_id') || '';

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<MasterBiayaFormValues>({
    resolver: zodResolver(masterBiayaFormSchema),
    defaultValues: {
      master_tipe_jalur_id: defaultTipeJalurId,
      program_studi_id: defaultProdiId,
      evidence_type: 'arsip',
      nomor_sk: '',
      dokumen_pendukung: undefined,
      is_active: true,
      keterangan: '',
      items: [],
    },
  });

  const { fields, replace, remove, append } = useFieldArray({
    control,
    name: 'items',
  });

  const watchItems = useWatch({ control, name: 'items' });
  const watchNomorSk = useWatch({ control, name: 'nomor_sk' });
  const evidenceType = useWatch({ control, name: 'evidence_type' });

  useEffect(() => {
    setSkCheck((prev) => (prev.status === 'idle' ? prev : { status: 'idle', data: null }));
  }, [watchNomorSk]);

  const handleCheckSk = async () => {
    const nomor = (watchNomorSk || '').trim();
    if (!nomor) {
      toast.error('Masukkan nomor SK terlebih dahulu untuk dicek');
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
        toast.success('Nomor SK sah dan dokumen fisik terlampir');
      } else if (resData && !resData.has_document) {
        setSkCheck({
          status: 'invalid',
          message: 'Nomor SK terdaftar di sistem Arsip, tetapi dokumen/berkas fisik SK belum diunggah (dokumen masih kosong).',
          data: resData,
        });
        toast.error('Dokumen fisik SK belum diunggah di modul Arsip');
      } else {
        setSkCheck({
          status: 'invalid',
          message: res.message || 'Nomor SK tidak memenuhi syarat keabsahan di Arsip.',
          data: resData,
        });
        toast.error('Nomor SK tidak sah');
      }
    } catch (err: any) {
      const respData = err?.response?.data?.data;
      const msg = err?.response?.data?.message || err?.message || 'Nomor SK tidak ditemukan atau belum sah di modul Arsip.';
      setSkCheck({
        status: 'invalid',
        message: msg,
        data: respData || null,
      });
      toast.error(msg);
    }
  };

  useEffect(() => {
    if (isLoadedRef.current) return;
    isLoadedRef.current = true;

    const loadPrerequisites = async () => {
      try {
        setLoadingInitial(true);
        const [tipeRes, prodiRes, kompRes] = await Promise.all([
          spmbService.getMasterTipeJalur({ limit: 100 }),
          spmbService.getProgramStudi({ limit: 100 }),
          spmbService.getKomponenBiayaList({ is_active: true, limit: 100 }),
        ]);

        const tipesRaw = tipeRes?.data;
        const tipes: MasterTipeJalur[] = Array.isArray(tipesRaw) ? tipesRaw : tipesRaw?.items || [];
        setTipeJalurList(tipes);
        if (tipes.length > 0 && !defaultTipeJalurId) {
          setValue('master_tipe_jalur_id', String(tipes[0].id));
        }

        const prodis = Array.isArray(prodiRes?.data) ? prodiRes.data : [];
        setProdiList(prodis);
        if (prodis.length > 0 && !defaultProdiId) {
          setValue('program_studi_id', String(prodis[0].id));
        }

        const komps = Array.isArray(kompRes?.data) ? kompRes.data : [];
        setKomponenMaster(komps);

        // Komponen bertanda default otomatis dimuat ke rincian.
        const defaultItems = komps
          .filter((k: MasterKomponenBiaya) => k.is_default_master_biaya)
          .map((k: MasterKomponenBiaya) => ({
            komponen_biaya_id: k.id,
            nominal: 0,
            dibebankan_saat_pendaftaran: false,
            berlaku_diskon: false,
            nama: k.nama,
            kode: k.kode,
            kategori: k.kategori,
            keterangan: k.keterangan,
          }));
        replace(defaultItems);

      } catch (error) {
        console.error('Failed to load initial data:', error);
        toast.error('Gagal memuat data master pendukung');
      } finally {
        setLoadingInitial(false);
      }
    };

    loadPrerequisites();
  }, [defaultTipeJalurId, defaultProdiId, replace, setValue]);

  const handleNominalChange = (index: number, rawValue: string) => {
    const cleanNumber = Math.max(0, Number(rawValue.replace(/\D/g, '')) || 0);
    setValue(`items.${index}.nominal`, cleanNumber, { shouldValidate: true });
  };

  // Live Total
  const calculatedTotal = (watchItems || []).reduce(
    (acc, val) => acc + (Number(val?.nominal) || 0),
    0
  );

  // Total beban awal (dibebankan saat pendaftaran) & sisanya (daftar ulang)
  const calculatedPendaftaran = (watchItems || [])
    .filter((v) => v?.dibebankan_saat_pendaftaran)
    .reduce((acc, val) => acc + (Number(val?.nominal) || 0), 0);

  const calculatedDaftarUlang = Math.max(0, calculatedTotal - calculatedPendaftaran);

  const onSubmit = async (values: MasterBiayaFormValues) => {
    if (values.items.length === 0) {
      toast.error('Belum ada komponen biaya aktif. Tambahkan komponen biaya terlebih dahulu.');
      return;
    }

    const trimmedSk = values.evidence_type === 'arsip' ? values.nomor_sk?.trim() : '';

    if (values.evidence_type === 'arsip' && trimmedSk && (skCheck.status !== 'valid' || skCheck.data?.nomor_surat !== trimmedSk)) {
      try {
        setSubmitting(true);
        const checkRes = await arsipService.checkNomorSk(trimmedSk);
        if (!checkRes?.data?.is_valid || !checkRes?.data?.has_document) {
          toast.error('Nomor SK tidak sah atau dokumen fisik belum diunggah di modul Arsip');
          setSkCheck({
            status: 'invalid',
            message: checkRes?.message || 'Nomor SK belum memiliki berkas fisik di modul Arsip.',
            data: checkRes?.data,
          });
          setSubmitting(false);
          return;
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Nomor SK tidak sah atau belum memiliki berkas fisik di modul Arsip.';
        toast.error(msg);
        setSkCheck({
          status: 'invalid',
          message: msg,
          data: err?.response?.data?.data,
        });
        setSubmitting(false);
        return;
      }
    }

    try {
      setSubmitting(true);
      await spmbService.createMasterBiayaWithEvidence({
        master_tipe_jalur_id: Number(values.master_tipe_jalur_id),
        program_studi_id: Number(values.program_studi_id),
        evidence_type: values.evidence_type,
        nomor_sk: trimmedSk || undefined,
        dokumen_pendukung: values.evidence_type === 'upload' ? values.dokumen_pendukung?.[0] : undefined,
        is_active: values.is_active,
        keterangan: values.keterangan?.trim() || undefined,
        items: values.items.map((it) => ({
          komponen_biaya_id: it.komponen_biaya_id,
          nominal: it.nominal || 0,
          dibebankan_saat_pendaftaran: it.dibebankan_saat_pendaftaran ?? false,
          berlaku_diskon: it.berlaku_diskon ?? false,
        })),
      });

      toast.success('Konfigurasi biaya program studi berhasil disimpan');
      router.push('/spmb/master/biaya');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'Gagal menyimpan data');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Tambah Master Biaya"
        description="Tetapkan paket biaya awal (DPI, UKT, Seragam, dll) untuk program studi pada tipe jalur masuk pilihan"
        action={
          <Button
            variant="outline"
            onClick={() => router.back()}
            style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
            icon={<ArrowLeft size={16} />}
          >
            Kembali
          </Button>
        }
      />

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* 1. INFORMASI TIPE JALUR & PRODI */}
            <div className="border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">
                Informasi Tipe Jalur &amp; Program Studi
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  control={control}
                  name="master_tipe_jalur_id"
                  render={({ field }) => (
                    <Select
                      label="Tipe Jalur Masuk"
                      required
                      value={field.value}
                      onChange={field.onChange}
                      options={tipeJalurList.map((t) => ({
                        value: String(t.id),
                        label: `${t.nama}${t.kode ? ` (${t.kode})` : ''}`,
                      }))}
                      error={errors.master_tipe_jalur_id?.message}
                      hint="Biaya berlaku untuk semua gelombang pada tipe jalur ini."
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="program_studi_id"
                  render={({ field }) => (
                    <Select
                      label="Program Studi"
                      required
                      value={field.value}
                      onChange={field.onChange}
                      options={prodiList.map((p) => ({
                        value: String(p.id),
                        label: `${p.jenjang ? `[${p.jenjang}] ` : ''}${p.nama}`,
                      }))}
                      error={errors.program_studi_id?.message}
                      hint="Pilih program studi yang akan diatur biayanya."
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="evidence_type"
                  render={({ field }) => (
                    <Select
                      label="Dasar Dokumen"
                      required
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        setValue('nomor_sk', '');
                        setValue('dokumen_pendukung', undefined);
                        setSkCheck({ status: 'idle', data: null });
                      }}
                      options={EVIDENCE_TYPE_OPTIONS}
                      error={errors.evidence_type?.message}
                      hint="Pilih satu dasar penetapan biaya."
                    />
                  )}
                />

                {evidenceType === 'arsip' ? <div className="col-span-full space-y-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        label="Nomor SK Penetapan Biaya"
                        required
                        placeholder="Contoh: 001/SK-BIAYA/UTI/2026"
                        className="font-mono uppercase"
                        {...register('nomor_sk')}
                        error={errors.nomor_sk?.message}
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
                    Nomor SK resmi diverifikasi melalui modul Arsip dan harus memiliki dokumen fisik.
                  </p>

                  {/* Feedback Status Cek SK */}
                  {skCheck.status === 'valid' && skCheck.data && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>SK Sah &amp; Dokumen Fisik Terverifikasi</span>
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
                          <span className="text-slate-400 text-2xs block">Tanggal Surat / Penetapan:</span>
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
                </div> : (
                  <div className="col-span-full">
                    <Input
                      type="file"
                      label="Dokumen Pendukung"
                      required
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      error={errors.dokumen_pendukung?.message as string | undefined}
                      {...register('dokumen_pendukung')}
                    />
                    <p className="form-hint">PDF, JPG, JPEG, atau PNG. Maksimal 5 MB. File disimpan privat.</p>
                  </div>
                )}

                <div className="col-span-full">
                  <Checkbox
                    label="Status Aktif (Konfigurasi biaya ini berlaku)"
                    hint="Nonaktifkan jika tarif pembiayaan prodi ini sedang tidak diberlakukan."
                    {...register('is_active')}
                  />
                </div>
              </div>
            </div>

            {/* 2. RINCIAN KOMPONEN BIAYA */}
            <div className="border-b border-slate-100 pb-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
                    Rincian Komponen Biaya
                  </h3>
                  <p className="text-xs text-slate-500 mt-2">
                    Masukkan nominal rupiah untuk masing-masing pos komponen pembiayaan prodi.
                  </p>
                  <div className="mt-2 flex items-start gap-1.5 text-2xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <Info size={13} className="shrink-0 mt-0.5 text-slate-400" />
                    <span>
                      Komponen dengan toggle <strong>Berlaku Diskon</strong> aktif akan mengikuti proses diskon
                      menyesuaikan <strong>gelombang yang berlaku</strong> (potongan biaya daftar ulang pada gelombang).
                    </span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                  <div className="w-full sm:w-64">
                    <Select
                      label="Tambah Komponen"
                      placeholder="Pilih komponen biaya..."
                      value=""
                      onChange={(val) => {
                        const komp = komponenMaster.find((k) => String(k.id) === val);
                        if (komp) {
                          append({
                            komponen_biaya_id: komp.id,
                            nominal: 0,
                            dibebankan_saat_pendaftaran: false,
                            berlaku_diskon: false,
                            nama: komp.nama,
                            kode: komp.kode,
                            kategori: komp.kategori,
                            keterangan: komp.keterangan,
                          });
                        }
                      }}
                      options={komponenMaster
                        .filter((k) => !(watchItems || []).some((it) => it?.komponen_biaya_id === k.id))
                        .map((k) => ({ value: String(k.id), label: `${k.nama}${k.kode ? ` (${k.kode})` : ''}` }))}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    icon={<Plus size={16} />}
                    onClick={() => router.push('/spmb/master/komponen-biaya')}
                  >
                    Kelola Komponen
                  </Button>
                </div>
              </div>

              {loadingInitial ? (
                <div className="py-6 text-center text-sm text-slate-400">
                  Memuat rincian komponen...
                </div>
              ) : fields.length === 0 ? (
                <div className="py-6 px-4 text-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                  <AlertCircle size={20} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-medium text-slate-700">
                    {komponenMaster.length === 0
                      ? 'Belum ada data komponen biaya aktif di sistem'
                      : 'Belum ada komponen biaya dipilih'}
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 mb-4">
                    {komponenMaster.length === 0
                      ? 'Tambahkan komponen pembiayaan (seperti UKT, DPI, Seragam) di Master Komponen Biaya sebelum mengatur rincian biaya per program studi.'
                      : 'Pilih komponen biaya pada dropdown "Tambah Komponen" di atas untuk memasukkannya ke rincian master biaya ini.'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<Plus size={16} />}
                    onClick={() => router.push('/spmb/master/komponen-biaya')}
                  >
                    Tambah Komponen Biaya Dulu
                  </Button>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                  <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-white border-b border-slate-200 text-2xs font-bold uppercase text-slate-500">
                    <div className="col-span-1 text-center">No</div>
                    <div className="col-span-3">Komponen Biaya</div>
                    <div className="col-span-1 text-center">Kode</div>
                    <div className="col-span-2 text-right">Nominal (Rp)</div>
                    <div className="col-span-2 text-center">Beban Pendaftaran</div>
                    <div className="col-span-2 text-center">Berlaku Diskon</div>
                    <div className="col-span-1 text-center">Aksi</div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {fields.map((field, index) => {
                      const currentNom = watchItems?.[index]?.nominal ?? 0;

                      return (
                        <div
                          key={field.id}
                          className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 bg-white hover:bg-slate-50 transition-colors items-center"
                        >
                          <div className="hidden md:block col-span-1 text-center text-slate-400 font-mono text-xs">
                            {index + 1}
                          </div>
                          <div className="md:col-span-3">
                            <div className="font-medium text-slate-800">{field.nama}</div>
                            {field.keterangan && (
                              <div className="text-xs text-slate-400 mt-2">{field.keterangan}</div>
                            )}
                          </div>
                          <div className="md:col-span-1 md:text-center">
                            <Badge variant="secondary" className="font-mono text-xs bg-slate-100 text-slate-700 border border-slate-200">
                              {field.kode}
                            </Badge>
                          </div>
                          <div className="md:col-span-2">
                            <Input
                              placeholder="0"
                              className="text-right font-mono"
                              prefixIcon={<span className="text-xs font-semibold text-slate-400">Rp</span>}
                              value={currentNom > 0 ? currentNom.toLocaleString('id-ID') : ''}
                              onChange={(e) => handleNominalChange(index, e.target.value)}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Controller
                              control={control}
                              name={`items.${index}.dibebankan_saat_pendaftaran`}
                              render={({ field }) => (
                                <div className="flex flex-col items-center gap-2">
                                  <ToggleSwitch
                                    checked={!!field.value}
                                    disabled={currentNom <= 0}
                                    onChange={field.onChange}
                                  />
                                  <span className="text-2xs text-slate-400 font-medium">
                                    {field.value ? 'Beban awal' : 'Saat daftar ulang'}
                                  </span>
                                </div>
                              )}
                            />
                          </div>
                          <div
                            className="md:col-span-2"
                            title="Jika aktif, komponen ini mengikuti proses diskon menyesuaikan potongan biaya daftar ulang pada gelombang yang berlaku."
                          >
                            <Controller
                              control={control}
                              name={`items.${index}.berlaku_diskon`}
                              render={({ field }) => (
                                <div className="flex flex-col items-center gap-2">
                                  <ToggleSwitch
                                    checked={!!field.value}
                                    disabled={currentNom <= 0}
                                    onChange={field.onChange}
                                  />
                                  <span className="text-2xs text-slate-400 font-medium">
                                    {field.value ? 'Berhak diskon' : 'Tanpa diskon'}
                                  </span>
                                </div>
                              )}
                            />
                          </div>
                          <div className="md:col-span-1 flex md:justify-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              title="Hapus komponen dari rincian"
                              onClick={() => remove(index)}
                            >
                              <Trash2 size={16} className="text-red-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="bg-white border-t-2 border-slate-200 divide-y divide-slate-100">
                    <div className="flex items-center justify-between px-4 py-2">
                      <span className="text-xs text-slate-600">Total Beban Pendaftaran:</span>
                      <span className="font-mono text-sm" style={{ color: 'var(--module-primary)' }}>{formatRupiah(calculatedPendaftaran)}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2">
                      <span className="text-xs text-slate-600">Total Beban Daftar Ulang:</span>
                      <span className="font-mono text-sm text-slate-700">{formatRupiah(calculatedDaftarUlang)}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-slate-700 font-semibold">Total Biaya Awal Masuk:</span>
                      <span className="font-mono text-base font-bold" style={{ color: 'var(--module-primary)' }}>{formatRupiah(calculatedTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. KETERANGAN / CATATAN */}
            <div className="mb-6">
              <Textarea
                label="Keterangan / Catatan Tambahan (Opsional)"
                placeholder="Contoh: DPI dapat diangsur selama 3 semester. Biaya seragam mencakup 2 stel praktek & almamater."
                hint="Opsional, catatan khusus mengenai ketentuan pembiayaan prodi ini."
                {...register('keterangan')}
                error={errors.keterangan?.message}
                rows={3}
              />
            </div>

            {/* 4. ACTION BUTTONS */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                disabled={submitting || loadingInitial}
                icon={<Save size={16} />}
              >
                Simpan Konfigurasi Biaya
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
