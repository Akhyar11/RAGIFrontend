'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Check, Copy, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Modal } from '@/components/ui/Modal';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Textarea } from '@/components/ui/Textarea';
import { spmbService, type GelombangResolveResult } from '@/services/spmb.service';
import { formatJalurGelombang } from '@/lib/spmb/gelombang';
import { useAuth } from '@/hooks/useAuth';
import { validateApplicantIdentity } from '@/lib/spmb/applicant-identity';
import { ASAL_LULUSAN_OPTIONS, AGAMA_OPTIONS, PEKERJAAN_OPTIONS, PENGHASILAN_OPTIONS, STATUS_SIPIL_OPTIONS } from '@/lib/spmb/registration-options';
import { spmbReferenceService } from '@/services/spmb-reference.service';
import { SpmbResidenceFields } from '@/components/spmb/SpmbResidenceFields';

const manualRegistrationSchema = z.object({
  email: z.string().trim().email('Email calon wajib diisi dengan format yang benar.').max(255),
  gelombang_id: z.string().min(1, 'Gelombang wajib dipilih.'),
  jalur_masuk_id: z.string().min(1, 'Jalur Pendaftaran wajib dipilih.'),
  program_studi_id: z.string().min(1, 'Program studi wajib dipilih.'),
  program_studi_pilihan2_id: z.string().optional(),
  nama_lengkap: z.string().trim().min(1, 'Nama lengkap wajib diisi.').max(255),
  nik: z.string().trim().max(20).optional(),
  kewarganegaraan_id: z.string().min(1, 'Kewarganegaraan wajib dipilih.'),
  nomor_paspor: z.string().max(50).optional(),
  negara_penerbit_paspor: z.string().max(100).optional(),
  negara_kewarganegaraan: z.string().max(100).optional(),
  kode_negara_kewarganegaraan: z.string().max(2).optional(),
  tanggal_lahir: z.string().min(1, 'Tanggal lahir wajib diisi.').refine((date) => date < new Date().toISOString().slice(0, 10), 'Tanggal lahir harus sebelum hari ini.'),
  tempat_lahir: z.string().trim().min(2, 'Tempat lahir wajib diisi.').max(100),
  jenis_kelamin: z.string().optional(),
  agama: z.string().max(50).optional(),
  status_sipil: z.string().min(1, 'Status sipil wajib dipilih.').refine((value): boolean => value === 'menikah' || value === 'belum_menikah', 'Status sipil tidak valid.'),
  kewarganegaraan: z.string().max(50).optional(),
  negara_domisili: z.string().max(100).optional(),
  no_hp: z.string().trim().min(1, 'Nomor HP wajib diisi.').max(30),
  alamat: z.string().trim().min(1, 'Alamat wajib diisi.').max(2000),
  provinsi: z.string().max(100).optional(),
  kota_kabupaten: z.string().max(100).optional(),
  kecamatan: z.string().max(100).optional(),
  kode_pos: z.string().max(20).optional(),
  asal_sekolah: z.string().max(255).optional(),
  alamat_sekolah: z.string().max(1000).optional(),
  jurusan_sekolah: z.string().max(100).optional(),
  tahun_lulus: z.string().max(4).optional(),
  nama_ayah: z.string().max(255).optional(),
  pekerjaan_ayah: z.string().max(100).optional(),
  nama_ibu: z.string().max(255).optional(),
  pekerjaan_ibu: z.string().max(100).optional(),
  alamat_ortu: z.string().max(1000).optional(),
  nama_wali: z.string().max(255).optional(),
  telepon_wali: z.string().max(30).optional(),
  telepon_ayah: z.string().max(30).optional(),
  penghasilan_ayah: z.string().max(100).optional(),
  telepon_ibu: z.string().max(30).optional(),
  penghasilan_ibu: z.string().max(100).optional(),
  pekerjaan_wali: z.string().max(100).optional(),
  penghasilan_wali: z.string().max(100).optional(),
  asal_lulusan: z.enum(['sekolah', 'pt']).or(z.literal('')).optional(),
  asal_pt: z.string().max(255).optional(),
  jenis_pt: z.string().max(100).optional(),
  alamat_pt: z.string().max(1000).optional(),
  jenjang_pt: z.string().max(50).optional(),
  progdi_pt: z.string().max(255).optional(),
  ipk_pt: z.string().optional(),
  nim_pt: z.string().max(30).optional(),
  tahun_lulus_pt: z.string().max(4).optional(),
  info_daftar: z.string().max(100).optional(),
  ket_info_daftar: z.string().max(255).optional(),
  referrer_user_id: z.string().optional(),
  pihak_ketiga_user_ids: z.array(z.string()).max(20),
}).superRefine((values, context) => {
  const identityErrors = validateApplicantIdentity({
    nationalityCode: values.kewarganegaraan || '',
    nik: values.nik || '',
    passportNumber: values.nomor_paspor || '',
    passportIssuingCountry: values.negara_penerbit_paspor || '',
    citizenshipCountry: values.negara_kewarganegaraan || '',
    citizenshipCountryCode: values.kode_negara_kewarganegaraan || '',
    residenceCountry: values.kewarganegaraan?.toUpperCase() === 'WNA' ? 'WNA' : (values.negara_domisili || ''),
    address: values.alamat,
    province: values.provinsi || '',
    city: values.kota_kabupaten || '',
    district: values.kecamatan || '',
  });
  for (const [path, message] of Object.entries(identityErrors)) {
    context.addIssue({ code: 'custom', path: [path], message });
  }
});

type ManualRegistrationValues = z.infer<typeof manualRegistrationSchema>;
type SelectOption = { value: string; label: string };
type NationalityOption = SelectOption & { code: string };

const GENDER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Pilih jenis kelamin' },
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
];

const thirdPartyAccountSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi.').max(255, 'Nama maksimal 255 karakter.'),
  email: z.string().trim().email('Format email tidak valid.').max(255, 'Email maksimal 255 karakter.'),
  phone: z.string().trim().max(30, 'Nomor handphone maksimal 30 karakter.'),
});

interface ManualRegistrationResult {
  no_pendaftaran: string;
  username: string;
  email: string;
  password_sementara: string;
}

export default function CreateManualPendaftaranPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('spmb.manage');
  const [gelombangResult, setGelombangResult] = useState<GelombangResolveResult | null>(null);
  const [gelombangFailedFor, setGelombangFailedFor] = useState('');
  const [jalurOptions, setJalurOptions] = useState<SelectOption[]>([]);
  const [jalurPtEnabled, setJalurPtEnabled] = useState<Record<string, boolean>>({});
  const [nationalityOptions, setNationalityOptions] = useState<NationalityOption[]>([]);
  const [programOptions, setProgramOptions] = useState<SelectOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [result, setResult] = useState<ManualRegistrationResult | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [thirdPartyOptions, setThirdPartyOptions] = useState<SelectOption[]>([]);
  const [thirdPartyModalOpen, setThirdPartyModalOpen] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ManualRegistrationValues>({
    resolver: zodResolver(manualRegistrationSchema),
    defaultValues: {
      email: '',
      gelombang_id: '',
      jalur_masuk_id: '',
      program_studi_id: '',
      program_studi_pilihan2_id: '',
      nama_lengkap: '',
      nik: '',
      kewarganegaraan_id: '',
      nomor_paspor: '',
      negara_penerbit_paspor: '',
      negara_kewarganegaraan: '',
      kode_negara_kewarganegaraan: '',
      tanggal_lahir: '',
      tempat_lahir: '',
      jenis_kelamin: '',
      agama: '',
      status_sipil: '',
      kewarganegaraan: 'WNI',
      negara_domisili: 'Indonesia',
      no_hp: '',
      alamat: '',
      provinsi: '',
      kota_kabupaten: '',
      kecamatan: '',
      kode_pos: '',
      asal_sekolah: '',
      alamat_sekolah: '',
      jurusan_sekolah: '',
      tahun_lulus: '',
      nama_ayah: '',
      pekerjaan_ayah: '',
      nama_ibu: '',
      pekerjaan_ibu: '',
      alamat_ortu: '',
      nama_wali: '',
      telepon_wali: '',
      telepon_ayah: '',
      penghasilan_ayah: '',
      telepon_ibu: '',
      penghasilan_ibu: '',
      pekerjaan_wali: '',
      penghasilan_wali: '',
      asal_lulusan: '',
      asal_pt: '',
      jenis_pt: '',
      alamat_pt: '',
      jenjang_pt: '',
      progdi_pt: '',
      ipk_pt: '',
      nim_pt: '',
      tahun_lulus_pt: '',
      info_daftar: '',
      ket_info_daftar: '',
      referrer_user_id: '',
      pihak_ketiga_user_ids: [],
    },
  });
  const {
    register: registerThirdParty,
    handleSubmit: handleThirdPartySubmit,
    reset: resetThirdPartyForm,
    formState: { errors: thirdPartyFormErrors, isSubmitting: isCreatingThirdParty },
  } = useForm<z.infer<typeof thirdPartyAccountSchema>>({
    resolver: zodResolver(thirdPartyAccountSchema),
    defaultValues: { name: '', email: '', phone: '' },
  });
  const selectedThirdPartyIds = useWatch({ control, name: 'pihak_ketiga_user_ids' }) || [];
  const selectedNationality = useWatch({ control, name: 'kewarganegaraan' }) || 'WNI';
  const isWna = selectedNationality.toUpperCase() === 'WNA';
  useEffect(() => {
    if (isWna) {
      setValue('provinsi', '');
      setValue('kota_kabupaten', '');
      setValue('kecamatan', '');
      setValue('kode_pos', '');
      setValue('negara_domisili', '');
    }
  }, [isWna, setValue]);
  const selectedThirdPartyList = selectedThirdPartyIds.map((id) => {
    const option = thirdPartyOptions.find((item) => item.value === id);
    const [name, username, email] = option?.label.split(' • ') || ['Akun terpilih', '-', '-'];
    return { id, name, username, email };
  });
  const selectedThirdPartyColumns: ColumnDef<(typeof selectedThirdPartyList)[number]>[] = [
    { key: 'name', label: 'NAMA', render: (row) => <span className="text-xs font-semibold text-slate-800">{row.name}</span> },
    { key: 'username', label: 'USERNAME', render: (row) => <span className="text-xs text-slate-600">{row.username}</span> },
    { key: 'email', label: 'EMAIL', render: (row) => <span className="text-xs text-slate-600">{row.email}</span> },
  ];

  const selectedJalur = useWatch({ control, name: 'jalur_masuk_id' }) || '';
  // Isian perguruan tinggi hanya aktif bila jalur terpilih mengaktifkannya (master jalur masuk).
  const ptEnabled = Boolean(selectedJalur) && Boolean(jalurPtEnabled[String(selectedJalur)]);

  useEffect(() => {
    if (ptEnabled) return;
    (['asal_lulusan', 'asal_pt', 'jenis_pt', 'alamat_pt', 'jenjang_pt', 'progdi_pt', 'ipk_pt', 'nim_pt', 'tahun_lulus_pt'] as const)
      .forEach((name) => setValue(name, ''));
  }, [ptEnabled, setValue]);
  // Hasil resolver hanya berlaku untuk jalur yang sedang dipilih.
  const currentGelombangResult = gelombangResult && String(gelombangResult.jalur_masuk_id) === String(selectedJalur) ? gelombangResult : null;
  const resolvingGelombang = Boolean(selectedJalur) && !currentGelombangResult && gelombangFailedFor !== selectedJalur;

  // Jalur dipilih lebih dulu; gelombang mengikuti aturan pemetaan jalur.
  useEffect(() => {
    setValue('gelombang_id', '');
    if (!selectedJalur) return;
    let active = true;
    spmbService.resolveGelombang(selectedJalur, 'manual')
      .then((result) => {
        if (!active) return;
        setGelombangResult(result);
        if (result.mode === 'otomatis' && result.gelombang) {
          setValue('gelombang_id', String(result.gelombang.id), { shouldValidate: true });
        }
      })
      .catch(() => {
        if (!active) return;
        setGelombangFailedFor(selectedJalur);
        toast.error('Gagal menentukan gelombang untuk jalur ini.');
      });
    return () => {
      active = false;
    };
  }, [selectedJalur, setValue]);

  // Pilihan gelombang diambil dari server sesuai jalur terpilih (terpetakan, atau gelombang umum).
  const loadGelombangOptions = useCallback(async (search: string) => {
    if (!selectedJalur) return [];
    try {
      const result = await spmbService.resolveGelombang(selectedJalur, 'manual');
      const keyword = search.trim().toLowerCase();
      return result.options
        .filter((item) => !keyword || item.nama.toLowerCase().includes(keyword))
        .map((item) => ({
          value: String(item.id),
          label: `${item.nama} • ${formatJalurGelombang(item)}`,
        }));
    } catch {
      return [];
    }
  }, [selectedJalur]);

  useEffect(() => {
    if (!canManage) return;
    const loadOptions = async () => {
      try {
        const [jalurResponse, programs, nationalities] = await Promise.all([
          spmbService.getJalurMasuk({ status: 'aktif', limit: 100 }),
          spmbService.getProgramStudi(),
          spmbService.getReferensi('kewarganegaraan'),
        ]);
        const jalurData = (jalurResponse?.data || []) as Array<{ id: number; nama: string; pilih_perguruan_tinggi?: boolean }>;
        const programData = (programs?.data || []) as Array<{ id: number; nama: string; jenjang?: string }>;
        setJalurOptions(jalurData.map((item) => ({ value: String(item.id), label: item.nama })));
        setJalurPtEnabled(Object.fromEntries(jalurData.map((item) => [String(item.id), Boolean(item.pilih_perguruan_tinggi)])));
        setProgramOptions(programData.map((item) => ({
          value: String(item.id),
          label: `${item.nama}${item.jenjang ? ` (${item.jenjang})` : ''}`,
        })));
        const nationalityData = Array.isArray(nationalities?.data) ? nationalities.data : [];
        const mappedNationalities: NationalityOption[] = nationalityData.map((item: { id: number; nama: string; kode?: string }) => ({
          value: String(item.id),
          label: item.nama,
          code: String(item.kode || '').toUpperCase(),
        }));
        setNationalityOptions(mappedNationalities);
        const wni = mappedNationalities.find((item) => item.code === 'WNI');
        if (wni) {
          setValue('kewarganegaraan_id', wni.value);
          setValue('kewarganegaraan', wni.code);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Gagal memuat pilihan pendaftaran.';
        toast.error(message);
      } finally {
        setLoadingOptions(false);
      }
    };
    loadOptions();
  }, [canManage, setValue]);


  const loadReferrers = useCallback(async (search: string) => {
    try {
      const response = await spmbService.getPendaftaranManualReferrers(search || undefined);
      return (response.data || []).map((user) => ({
        value: String(user.id),
        label: `${user.name} • ${user.username} • ${user.referral_code}`,
      }));
    } catch {
      return [];
    }
  }, []);

  const loadThirdParties = useCallback(async (search: string) => {
    try {
      const response = await spmbService.getPendaftaranManualThirdParties(search || undefined);
      const options = (response.data || []).map((user) => ({
        value: String(user.id),
        label: `${user.name} • ${user.username} • ${user.email}`,
      }));
      setThirdPartyOptions((current) => {
        const merged = new Map(current.map((option) => [option.value, option]));
        options.forEach((option) => merged.set(option.value, option));
        return Array.from(merged.values());
      });
      return options;
    } catch {
      return [];
    }
  }, []);

  const createThirdParty = async (values: z.infer<typeof thirdPartyAccountSchema>) => {
    try {
      const response = await spmbService.createPendaftaranManualThirdParty(values);
      const account = response.data;
      setThirdPartyOptions((current) => [...current, {
        value: String(account.id),
        label: `${account.name} • ${account.username} • ${account.email}`,
      }]);
      const currentIds = getValues('pihak_ketiga_user_ids') || [];
      setValue('pihak_ketiga_user_ids', [...currentIds, String(account.id)], { shouldValidate: true });
      setThirdPartyModalOpen(false);
      resetThirdPartyForm();
      toast.success('Akun pihak ketiga berhasil dibuat.');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const message = axiosError.response?.data?.errors
        ? Object.values(axiosError.response.data.errors).flat().join(' ')
        : axiosError.response?.data?.message || 'Gagal membuat akun pihak ketiga.';
      toast.error(message);
    }
  };

  const onSubmit = async (values: ManualRegistrationValues) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (key === 'pihak_ketiga_user_ids') return;
      if (value !== undefined && value !== '') formData.append(key, String(value));
    });
    values.pihak_ketiga_user_ids.forEach((id, index) => formData.append(`pihak_ketiga_user_ids[${index}]`, id));
    if (proofFile) formData.append('bukti_transfer', proofFile);

    try {
      const response = await spmbService.createPendaftaranManual(formData);
      const registration = response?.data?.pendaftaran;
      const account = response?.data?.akun;
      setResult({
        no_pendaftaran: registration?.no_pendaftaran || '-',
        username: account?.username || '-',
        email: account?.email || values.email,
        password_sementara: account?.password_sementara || '',
      });
      toast.success('Pendaftaran manual berhasil dibuat.');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const message = axiosError.response?.data?.errors
        ? Object.values(axiosError.response.data.errors).flat().join(' ')
        : axiosError.response?.data?.message || 'Gagal membuat pendaftaran manual.';
      toast.error(message);
    }
  };

  const copyCredentials = async () => {
    if (!result) return;
    const credentials = `No. Pendaftaran: ${result.no_pendaftaran}\nEmail: ${result.email}\nUsername: ${result.username}\nPassword sementara: ${result.password_sementara}`;
    try {
      await navigator.clipboard.writeText(credentials);
      setCopiedCredentials(true);
      toast.success('Kredensial berhasil disalin.');
    } catch {
      toast.error('Tidak dapat menyalin kredensial di browser ini.');
    }
  };

  if (!canManage) {
    return <div className="card p-6 text-sm text-slate-600">Anda tidak memiliki izin untuk membuat pendaftaran manual.</div>;
  }

  if (result) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Pendaftaran Manual Berhasil" description="Akun calon mahasiswa sudah dibuat." />
        <div className="card max-w-3xl space-y-5 p-6">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <Check size={18} className="mt-0.5 shrink-0" />
            <p>Pendaftaran tersimpan. Bukti transfer (jika ada) menunggu verifikasi dan status pembayaran tetap belum bayar. Password sementara hanya ditampilkan pada halaman ini; salin sebelum meninggalkannya.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><p className="text-2xs text-slate-500">Nomor Pendaftaran</p><p className="text-xs font-semibold text-slate-800">{result.no_pendaftaran}</p></div>
            <div><p className="text-2xs text-slate-500">Email</p><p className="text-xs font-semibold text-slate-800">{result.email}</p></div>
            <div><p className="text-2xs text-slate-500">Username</p><p className="text-xs font-semibold text-slate-800">{result.username}</p></div>
            <div><p className="text-2xs text-slate-500">Password Sementara</p><p className="font-mono text-xs font-semibold text-slate-800">{result.password_sementara || 'Tidak tersedia'}</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={<Copy size={16} />} onClick={copyCredentials} style={{ backgroundColor: 'var(--module-primary)' }}>
              {copiedCredentials ? 'Salin Lagi' : 'Salin Kredensial'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/spmb/pendaftaran')} style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}>
              Kembali ke Data Pendaftaran
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Input Pendaftaran Manual"
        description="Input data formulir offline, buat akun calon, dan lampirkan bukti transfer bila tersedia."
        action={(
          <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => router.push('/spmb/pendaftaran')} style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}>
            Kembali
          </Button>
        )}
      />

      <p className="text-xs text-slate-500"><span className="font-bold text-red-600">*</span> Wajib diisi.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="card space-y-4 p-5">
          <div><h2 className="text-xs font-bold text-slate-900">Data Pendaftaran</h2><p className="mt-1 text-2xs text-slate-500">Pendaftaran manual dapat menggunakan gelombang aktif walaupun form online sudah ditutup.</p></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Controller name="jalur_masuk_id" control={control} render={({ field }) => (
              <Select label="Jalur Pendaftaran" required options={jalurOptions} value={field.value} onChange={field.onChange} error={errors.jalur_masuk_id?.message} isDisabled={loadingOptions} />
            )} />
            {currentGelombangResult?.mode === 'otomatis' && currentGelombangResult.gelombang ? (
              <Input label="Gelombang Penerimaan" value={currentGelombangResult.gelombang.nama} hint="Ditentukan otomatis karena gelombang ini dipetakan ke jalur yang dipilih." disabled readOnly />
            ) : (
              <Controller name="gelombang_id" control={control} render={({ field }) => (
                <AsyncSelect
                  key={selectedJalur || 'belum-dipilih'}
                  label="Gelombang Penerimaan"
                  required
                  loadOptions={loadGelombangOptions}
                  defaultOptions
                  value={field.value}
                  onChange={(option: { value: string } | null) => field.onChange(option?.value || '')}
                  error={errors.gelombang_id?.message || (currentGelombangResult?.mode === 'tidak_tersedia' ? 'Tidak ada gelombang aktif untuk jalur ini.' : undefined)}
                  hint={!selectedJalur ? 'Pilih jalur pendaftaran terlebih dahulu.' : 'Jalur ini tidak memiliki gelombang khusus; pilih gelombang aktif yang berlaku untuk semua jalur.'}
                  isDisabled={loadingOptions || resolvingGelombang || !selectedJalur}
                />
              )} />
            )}
            <Controller name="program_studi_id" control={control} render={({ field }) => (
              <Select label="Program Studi Pilihan 1" required options={programOptions} value={field.value} onChange={field.onChange} error={errors.program_studi_id?.message} isDisabled={loadingOptions} />
            )} />
            <Controller name="program_studi_pilihan2_id" control={control} render={({ field }) => (
              <Select label="Program Studi Pilihan 2" options={programOptions} value={field.value} onChange={field.onChange} error={errors.program_studi_pilihan2_id?.message} isDisabled={loadingOptions} isClearable />
            )} />
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <div><h2 className="text-xs font-bold text-slate-900">Identitas dan Akun Calon</h2><p className="mt-1 text-2xs text-slate-500">Akun calon dibuat otomatis. Email harus unik dan digunakan sebagai alamat login/pemulihan akun.</p></div>
          <div className="space-y-4">
            <Input label="Nama Lengkap" required error={errors.nama_lengkap?.message} {...register('nama_lengkap')} />
            <Input type="email" label="Email Calon" required error={errors.email?.message} {...register('email')} />
            <Controller name="kewarganegaraan_id" control={control} render={({ field }) => (
              <AsyncSelect
                label="Kewarganegaraan"
                required
                loadOptions={async (search) => nationalityOptions
                  .filter((option) => `${option.label} ${option.code}`.toLowerCase().includes(search.toLowerCase()))
                  .map(({ value, label }) => ({ value, label }))}
                defaultOptions={nationalityOptions.map(({ value, label }) => ({ value, label }))}
                isDisabled={loadingOptions}
                value={field.value}
                onChange={(option: { value: string } | null) => {
                  const reference = nationalityOptions.find((item) => item.value === String(option?.value || ''));
                  field.onChange(reference?.value || '');
                  setValue('kewarganegaraan', reference?.code || '');
                  if (reference?.code === 'WNA') setValue('nik', '');
                  if (reference?.code === 'WNI') {
                    setValue('nomor_paspor', '');
                    setValue('negara_penerbit_paspor', '');
                  }
                }}
                error={errors.kewarganegaraan_id?.message}
              />
            )} />
            {isWna ? (
              <>
                <Input label="Nomor Paspor" required error={errors.nomor_paspor?.message} {...register('nomor_paspor')} />
                <Input label="Negara Penerbit Paspor" required error={errors.negara_penerbit_paspor?.message} {...register('negara_penerbit_paspor')} />
                <Input label="Negara Kewarganegaraan" required error={errors.negara_kewarganegaraan?.message} {...register('negara_kewarganegaraan')} />
                <Input label="Kode Negara (ISO 2 Huruf)" required maxLength={2} error={errors.kode_negara_kewarganegaraan?.message} {...register('kode_negara_kewarganegaraan')} />
              </>
            ) : (
              <Input label="NIK" required error={errors.nik?.message} {...register('nik')} />
            )}
            <Input type="date" label="Tanggal Lahir" required error={errors.tanggal_lahir?.message} {...register('tanggal_lahir')} />
            <Input label="Tempat Lahir" required error={errors.tempat_lahir?.message} {...register('tempat_lahir')} />
            <Controller name="jenis_kelamin" control={control} render={({ field }) => (
              <Select label="Jenis Kelamin" options={GENDER_OPTIONS} value={field.value} onChange={field.onChange} />
            )} />
            <Controller name="agama" control={control} render={({ field }) => (
              <Select label="Agama" options={AGAMA_OPTIONS} value={field.value} onChange={field.onChange} />
            )} />
            <Controller name="status_sipil" control={control} render={({ field }) => (
              <Select label="Status Sipil" required options={STATUS_SIPIL_OPTIONS} value={field.value} onChange={field.onChange} error={errors.status_sipil?.message} />
            )} />
            <Input label="Nomor Handphone" required error={errors.no_hp?.message} {...register('no_hp')} />
          </div>
          <SpmbResidenceFields control={control} setValue={setValue} errors={errors} isWna={isWna} />
          <Textarea label="Alamat Domisili" required rows={3} error={errors.alamat?.message} {...register('alamat')} />
        </section>

        <section className="card space-y-4 p-5">
          <div><h2 className="text-xs font-bold text-slate-900">Data Pendidikan dan Keluarga</h2><p className="mt-1 text-2xs text-slate-500">Lengkapi informasi yang tercantum pada formulir kertas.</p></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Controller name="asal_sekolah" control={control} render={({ field }) => (
              <AsyncSelect
                label="Asal Sekolah"
                isCreatable
                loadOptions={spmbReferenceService.searchSchools}
                value={field.value}
                onChange={(option: SelectOption | null) => {
                  const school = option as (SelectOption & { address?: string; __isNew__?: boolean }) | null;
                  if (school?.__isNew__) {
                    spmbReferenceService.createSchool(String(school.value))
                      .then(({ created }) => toast.success(created ? 'Sekolah baru disimpan ke master sekolah.' : 'Sekolah sudah ada di master sekolah.'))
                      .catch(() => toast.error('Gagal menyimpan sekolah baru ke master sekolah.'));
                  }
                  field.onChange(school?.value || '');
                  if (school?.address) setValue('alamat_sekolah', school.address);
                }}
                placeholder="Cari atau ketik nama sekolah"
              />
            )} />
            <Input label="Jurusan Sekolah" {...register('jurusan_sekolah')} />
            <Input label="Tahun Lulus" {...register('tahun_lulus')} />
          </div>
          <Textarea label="Alamat Sekolah" rows={2} {...register('alamat_sekolah')} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 rounded border border-slate-200 p-4">
              <h3 className="text-xs font-bold text-slate-800 md:col-span-2 lg:col-span-3">Ayah</h3>
              <Input label="Nama Ayah" {...register('nama_ayah')} />
              <Input label="Nomor Telepon Ayah" type="tel" {...register('telepon_ayah')} />
              <Controller name="pekerjaan_ayah" control={control} render={({ field }) => <Select label="Pekerjaan Ayah" options={PEKERJAAN_OPTIONS} value={field.value} onChange={field.onChange} />} />
              <Controller name="penghasilan_ayah" control={control} render={({ field }) => <Select label="Penghasilan Ayah" options={PENGHASILAN_OPTIONS} value={field.value} onChange={field.onChange} />} />
            </section>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 rounded border border-slate-200 p-4">
              <h3 className="text-xs font-bold text-slate-800 md:col-span-2 lg:col-span-3">Ibu</h3>
              <Input label="Nama Ibu" {...register('nama_ibu')} />
              <Input label="Nomor Telepon Ibu" type="tel" {...register('telepon_ibu')} />
              <Controller name="pekerjaan_ibu" control={control} render={({ field }) => <Select label="Pekerjaan Ibu" options={PEKERJAAN_OPTIONS} value={field.value} onChange={field.onChange} />} />
              <Controller name="penghasilan_ibu" control={control} render={({ field }) => <Select label="Penghasilan Ibu" options={PENGHASILAN_OPTIONS} value={field.value} onChange={field.onChange} />} />
            </section>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 rounded border border-slate-200 p-4">
              <h3 className="text-xs font-bold text-slate-800 md:col-span-2 lg:col-span-3">Wali</h3>
              <Input label="Nama Wali" {...register('nama_wali')} />
              <Input label="Nomor Telepon Wali" type="tel" {...register('telepon_wali')} />
              <Controller name="pekerjaan_wali" control={control} render={({ field }) => <Select label="Pekerjaan Wali" options={PEKERJAAN_OPTIONS} value={field.value} onChange={field.onChange} />} />
              <Controller name="penghasilan_wali" control={control} render={({ field }) => <Select label="Penghasilan Wali" options={PENGHASILAN_OPTIONS} value={field.value} onChange={field.onChange} />} />
            </section>
          </div>
          <Textarea label="Alamat Orang Tua/Wali" rows={2} {...register('alamat_ortu')} />
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold text-slate-800">Data Pendidikan Tinggi Sebelumnya (Opsional)</h3>
            <p className="mb-3 mt-1 text-2xs text-slate-500">{ptEnabled ? 'Jalur ini mengaktifkan pilihan perguruan tinggi asal.' : 'Aktif hanya untuk jalur yang mengaktifkan pilihan perguruan tinggi. Pilih jalur terlebih dahulu.'}</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Controller name="asal_lulusan" control={control} render={({ field }) => (
                <Select label="Asal Lulusan" options={ASAL_LULUSAN_OPTIONS} value={field.value} onChange={field.onChange} isDisabled={!ptEnabled} isClearable />
              )} />
              <Input label="Asal Perguruan Tinggi" disabled={!ptEnabled} {...register('asal_pt')} />
              <Input label="Jenis Perguruan Tinggi" disabled={!ptEnabled} {...register('jenis_pt')} />
              <Input label="Jenjang Sebelumnya" disabled={!ptEnabled} {...register('jenjang_pt')} />
              <Input label="Program Studi Sebelumnya" disabled={!ptEnabled} {...register('progdi_pt')} />
              <Input type="number" min="0" max="4" step="0.01" label="IPK Sebelumnya" disabled={!ptEnabled} {...register('ipk_pt')} />
              <Input label="NIM Sebelumnya" disabled={!ptEnabled} {...register('nim_pt')} />
              <Input label="Tahun Lulus Sebelumnya" disabled={!ptEnabled} {...register('tahun_lulus_pt')} />
            </div>
            <div className="mt-4"><Textarea label="Alamat Perguruan Tinggi Sebelumnya" rows={2} disabled={!ptEnabled} {...register('alamat_pt')} /></div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Sumber Informasi Pendaftaran" {...register('info_daftar')} />
            <Input label="Keterangan Sumber Informasi" {...register('ket_info_daftar')} />
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <div><h2 className="text-xs font-bold text-slate-900">Referral dan Pihak Ketiga</h2><p className="mt-1 text-2xs text-slate-500">Pilih pemilik referral dari pengguna aktif. Pihak ketiga dapat diisi lebih dari satu.</p></div>
          <Controller name="referrer_user_id" control={control} render={({ field }) => (
            <AsyncSelect
              label="Direferensikan Oleh (Opsional)"
              loadOptions={loadReferrers}
              value={field.value}
              onChange={(option) => field.onChange(option?.value || '')}
              placeholder="Cari nama, username, email, atau kode referral"
              isClearable
            />
          )} />
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto]">
            <Controller name="pihak_ketiga_user_ids" control={control} render={({ field }) => (
              <AsyncSelect
                label="Pihak Ketiga"
                loadOptions={loadThirdParties}
                defaultOptions
                value={field.value}
                onChange={(selected) => field.onChange(Array.isArray(selected) ? selected.map((option: SelectOption) => String(option.value)) : [])}
                placeholder="Cari akun pihak ketiga..."
                isMulti
                error={errors.pihak_ketiga_user_ids?.message}
              />
            )} />
            <Button type="button" variant="outline" icon={<Plus size={16} />} onClick={() => setThirdPartyModalOpen(true)}>
              Tambah Pihak Ketiga
            </Button>
          </div>
          <DataTable
            columns={selectedThirdPartyColumns}
            data={selectedThirdPartyList}
            keyExtractor={(row) => row.id}
            emptyMessage="Belum ada pihak ketiga dipilih."
          />
        </section>

        <section className="card space-y-4 p-5">
          <div><h2 className="text-xs font-bold text-slate-900">Bukti Transfer Biaya Pendaftaran</h2><p className="mt-1 text-2xs text-slate-500">Opsional. Unggahan disimpan privat untuk diverifikasi dan tidak otomatis mengubah status pembayaran menjadi lunas.</p></div>
          <Input type="file" label="Bukti Transfer (PDF/JPG/PNG)" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setProofFile(event.target.files?.[0] || null)} />
          {proofFile && <p className="text-2xs text-slate-600">File dipilih: {proofFile.name}</p>}
        </section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/spmb/pendaftaran')} disabled={isSubmitting}>Batal</Button>
          <Button type="submit" variant="primary" loading={isSubmitting} disabled={loadingOptions} style={{ backgroundColor: 'var(--module-primary)' }}>
            Simpan Pendaftaran Manual
          </Button>
        </div>
      </form>
      <Modal
        open={thirdPartyModalOpen}
        onClose={() => setThirdPartyModalOpen(false)}
        title="Tambah Akun Pihak Ketiga"
        size="md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setThirdPartyModalOpen(false)}>Batal</Button>
            <Button type="submit" form="third-party-account-form" loading={isCreatingThirdParty} style={{ backgroundColor: 'var(--module-primary)' }}>Buat Akun</Button>
          </div>
        )}
      >
        <form id="third-party-account-form" onSubmit={handleThirdPartySubmit(createThirdParty)} noValidate className="space-y-4">
          <p className="text-2xs text-slate-500">Role akun diberikan otomatis mengikuti pengaturan role pihak ketiga di Pengaturan Sistem.</p>
          <Input label="Nama Lengkap" required error={thirdPartyFormErrors.name?.message} {...registerThirdParty('name')} />
          <Input type="email" label="Email" required error={thirdPartyFormErrors.email?.message} {...registerThirdParty('email')} />
          <Input label="Nomor Handphone" error={thirdPartyFormErrors.phone?.message} {...registerThirdParty('phone')} />
        </form>
      </Modal>
    </div>
  );
}
