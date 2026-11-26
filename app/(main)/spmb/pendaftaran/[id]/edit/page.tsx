'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Download, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Textarea } from '@/components/ui/Textarea';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { useAuth } from '@/hooks/useAuth';
import { spmbService, type PendaftaranCalonMhs } from '@/services/spmb.service';
import { spmbReferenceService } from '@/services/spmb-reference.service';
import { ASAL_LULUSAN_OPTIONS, AGAMA_OPTIONS, NATIONALITY_CODE, PEKERJAAN_OPTIONS, PENGHASILAN_OPTIONS, SPMB_STATUS, STATUS_SIPIL_OPTIONS } from '@/lib/spmb/registration-options';
import { SpmbResidenceFields } from '@/components/spmb/SpmbResidenceFields';
import { formatJalurGelombang } from '@/lib/spmb/gelombang';

const optional = (max: number) => z.string().max(max).optional();

const editSchema = z.object({
  email: z.string().trim().email('Email wajib diisi dengan format yang benar.').max(255),
  jalur_masuk_id: z.string().optional(),
  gelombang_id: z.string().optional(),
  program_studi_id: z.string().min(1, 'Program studi wajib dipilih.'),
  program_studi_pilihan2_id: z.string().optional(),
  nama_lengkap: z.string().trim().min(1, 'Nama lengkap wajib diisi.').max(255),
  nik: z.string().trim().max(20).optional(),
  kewarganegaraan_id: z.string().optional(),
  nomor_paspor: optional(50),
  negara_penerbit_paspor: optional(100),
  negara_kewarganegaraan: optional(100),
  kode_negara_kewarganegaraan: optional(2),
  tanggal_lahir: z.string().optional().refine((d) => !d || d < new Date().toISOString().slice(0, 10), 'Tanggal lahir harus sebelum hari ini.'),
  tempat_lahir: optional(100),
  jenis_kelamin: z.string().optional(),
  agama: optional(50),
  status_sipil: z.string().optional(),
  negara_domisili: optional(100),
  no_hp: optional(30),
  alamat: optional(2000),
  provinsi: optional(100),
  kota_kabupaten: optional(100),
  kecamatan: optional(100),
  kode_pos: optional(20),
  asal_sekolah: optional(255),
  alamat_sekolah: optional(1000),
  jurusan_sekolah: optional(255),
  tahun_lulus: optional(4),
  nama_ayah: optional(255),
  pekerjaan_ayah: optional(100),
  telepon_ayah: optional(30),
  penghasilan_ayah: optional(100),
  nama_ibu: optional(255),
  pekerjaan_ibu: optional(100),
  telepon_ibu: optional(30),
  penghasilan_ibu: optional(100),
  nama_wali: optional(255),
  pekerjaan_wali: optional(100),
  telepon_wali: optional(30),
  penghasilan_wali: optional(100),
  nama_ortu: optional(255),
  pekerjaan_ortu: optional(100),
  telp_ortu: optional(30),
  alamat_ortu: optional(1000),
  asal_lulusan: z.enum(['sekolah', 'pt']).or(z.literal('')).optional(),
  asal_pt: optional(255),
  jenis_pt: optional(100),
  alamat_pt: optional(255),
  jenjang_pt: optional(50),
  progdi_pt: optional(255),
  ipk_pt: z.string().optional(),
  nim_pt: optional(30),
  tahun_lulus_pt: optional(4),
  info_daftar: optional(100),
  ket_info_daftar: optional(255),
  referrer_user_id: z.string().optional(),
  pihak_ketiga_user_ids: z.array(z.string()).max(20),
  bukti_transfer: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'Ukuran bukti transfer maksimal 10 MB.')
    .refine((file) => /\.(pdf|jpe?g|png)$/i.test(file.name), 'Bukti transfer harus berformat PDF, JPG, atau PNG.')
    .optional(),
});

type EditValues = z.infer<typeof editSchema>;
type SelectOption = { value: string; label: string };
type NationalityOption = SelectOption & { code: string };
type ListItem = { id: number; nama: string; jenjang?: string; kode?: string; jalur_masuk?: { nama?: string }; daftar_jalur?: Array<{ nama: string }> };
type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
type ProofItem = NonNullable<PendaftaranCalonMhs['bukti_pembayaran_manual']>[number];

const GENDER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Pilih jenis kelamin' },
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
];

function listOf(res: { data?: ListItem[] | { data?: ListItem[] } } | undefined): ListItem[] {
  const data = res?.data;
  return Array.isArray(data) ? data : data?.data ?? [];
}

function str(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

// Field yang diisi khusus (relasi/akun); sisanya disalin langsung dari data pendaftar.
const SPECIAL_FIELDS = new Set<string>([
  'email', 'jalur_masuk_id', 'gelombang_id', 'program_studi_id', 'program_studi_pilihan2_id',
  'kewarganegaraan_id', 'referrer_user_id', 'pihak_ketiga_user_ids', 'bukti_transfer',
]);
const VALUE_KEYS = Object.keys(editSchema.shape).filter((k) => !SPECIAL_FIELDS.has(k)) as Array<keyof EditValues>;

function toDefaults(p: PendaftaranCalonMhs & Record<string, unknown>): EditValues {
  const values: Record<string, unknown> = {};
  for (const key of VALUE_KEYS) values[key] = str(p[key]);
  values.tanggal_lahir = str(p.tanggal_lahir).slice(0, 10);
  const user = p.user as { email?: string } | undefined;
  return {
    ...(values as EditValues),
    email: user?.email || '',
    // Data lama belum memiliki jalur sendiri: ikuti jalur gelombangnya.
    jalur_masuk_id: str(p.jalur_masuk_id ?? (p.gelombang_penerimaan as { jalur_masuk_id?: number | null } | undefined)?.jalur_masuk_id),
    gelombang_id: str(p.gelombang_id),
    program_studi_id: str(p.program_studi_id),
    program_studi_pilihan2_id: str(p.program_studi_pilihan2_id),
    kewarganegaraan_id: str(p.kewarganegaraan_id),
    referrer_user_id: str(p.referrer_user_id),
    pihak_ketiga_user_ids: ((p.pihak_ketiga as Array<{ user_id?: number }> | undefined) || [])
      .map((item) => str(item.user_id)).filter(Boolean),
  };
}

export default function EditPendaftaranPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('spmb.manage');
  const backUrl = '/spmb/pendaftaran';

  const [pendaftar, setPendaftar] = useState<PendaftaranCalonMhs | null>(null);
  const [loading, setLoading] = useState(true);
  const [waveOptions, setWaveOptions] = useState<Array<SelectOption & { jalur: string }>>([]);
  const [jalurSeed, setJalurSeed] = useState<SelectOption[]>([]);
  const [programOptions, setProgramOptions] = useState<SelectOption[]>([]);
  const [nationalityOptions, setNationalityOptions] = useState<NationalityOption[]>([]);
  const [thirdPartyOptions, setThirdPartyOptions] = useState<SelectOption[]>([]);
  const [referrerSeed, setReferrerSeed] = useState<SelectOption[]>([]);

  const {
    register, handleSubmit, control, setValue, reset, trigger,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({ resolver: zodResolver(editSchema), defaultValues: { pihak_ketiga_user_ids: [] } });

  const nationalityId = useWatch({ control, name: 'kewarganegaraan_id' }) || '';
  const selectedJalur = useWatch({ control, name: 'jalur_masuk_id' }) || '';
  const selectedThirdPartyIds = useWatch({ control, name: 'pihak_ketiga_user_ids' }) || [];
  const isWna = nationalityOptions.find((o) => o.value === nationalityId)?.code === NATIONALITY_CODE.WNA;

  const loadThirdParties = useCallback(async (search: string) => {
    try {
      const response = await spmbService.getPendaftaranManualThirdParties(search || undefined);
      const options = (response.data || []).map((user) => ({
        value: String(user.id),
        label: `${user.name} • ${user.username} • ${user.email}`,
      }));
      setThirdPartyOptions((current) => {
        const merged = new Map(current.map((o) => [o.value, o]));
        options.forEach((o) => merged.set(o.value, o));
        return Array.from(merged.values());
      });
      return options;
    } catch {
      return [];
    }
  }, []);

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

  const loadNationalityOptions = useCallback(async (search: string) => {
    try {
      const res = await spmbService.getReferensi('kewarganegaraan');
      const items: Array<{ id: number; nama: string; kode?: string }> = Array.isArray(res?.data) ? res.data : [];
      const keyword = search.trim().toLowerCase();
      return items
        .filter((n) => !keyword || `${n.nama} ${n.kode || ''}`.toLowerCase().includes(keyword))
        .map((n) => ({ value: String(n.id), label: n.nama }));
    } catch {
      return [];
    }
  }, []);

  const loadJalurOptions = useCallback(async (search: string) => {
    try {
      const res = await spmbService.getJalurMasuk({ name: search || undefined, limit: 50 });
      return listOf(res).map((j) => ({ value: String(j.id), label: j.nama }));
    } catch {
      return [];
    }
  }, []);

  // Pilihan gelombang mengikuti jalur: gelombang terpetakan ke jalur, atau gelombang umum.
  const loadWaveOptions = useCallback(async (search: string) => {
    try {
      const toOption = (g: ListItem) => ({
        value: String(g.id),
        label: `${g.nama} • ${formatJalurGelombang(g)}`,
        jalur: formatJalurGelombang(g),
      });
      let options: Array<SelectOption & { jalur: string }>;
      if (selectedJalur) {
        const result = await spmbService.resolveGelombang(selectedJalur, 'manual');
        const candidates = result.mode === 'otomatis' && result.gelombang ? [result.gelombang] : result.options;
        const keyword = search.trim().toLowerCase();
        options = (candidates as unknown as ListItem[])
          .filter((g) => !keyword || g.nama.toLowerCase().includes(keyword))
          .map(toOption);
      } else {
        const res = await spmbService.getGelombang({ nama: search || undefined, per_page: 50 });
        options = listOf(res).map(toOption);
      }
      setWaveOptions((current) => {
        const merged = new Map(current.map((o) => [o.value, o]));
        options.forEach((o) => merged.set(o.value, o));
        return Array.from(merged.values());
      });
      return options;
    } catch {
      return [];
    }
  }, [selectedJalur]);

  const loadProgramOptions = useCallback(async (search: string) => {
    try {
      const res = await spmbService.getProgramStudi({ search: search || undefined, limit: 50 });
      return listOf(res).map((p) => ({ value: String(p.id), label: `${p.nama}${p.jenjang ? ` (${p.jenjang})` : ''}` }));
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (!canManage) return;
    const load = async () => {
      try {
        const [detail, waves, programs, nationalities] = await Promise.all([
          spmbService.getPendaftaranDetail(Number(id)),
          spmbService.getGelombang({ per_page: 100 }),
          spmbService.getProgramStudi({ limit: 100 }),
          spmbService.getReferensi('kewarganegaraan'),
        ]);
        const data = (detail.data?.id ? detail.data : detail.data?.data || detail) as PendaftaranCalonMhs & Record<string, unknown>;

        setWaveOptions(listOf(waves).map((g) => ({
          value: String(g.id),
          label: `${g.nama} • ${formatJalurGelombang(g)}`,
          jalur: formatJalurGelombang(g),
        })));
        setProgramOptions(listOf(programs).map((p) => ({
          value: String(p.id),
          label: `${p.nama}${p.jenjang ? ` (${p.jenjang})` : ''}`,
        })));
        const nat: NationalityOption[] = (Array.isArray(nationalities?.data) ? nationalities.data : [])
          .map((n: { id: number; nama: string; kode?: string }) => ({
            value: String(n.id), label: n.nama, code: String(n.kode || '').toUpperCase(),
          }));
        setNationalityOptions(nat);

        const defaults = toDefaults(data);
        // Data lama (import) belum memiliki kewarganegaraan: gunakan WNI sebagai nilai awal formulir.
        if (!defaults.kewarganegaraan_id) {
          defaults.kewarganegaraan_id = nat.find((n) => n.code === NATIONALITY_CODE.WNI)?.value || '';
        }
        const referrer = data.referrer as { id: number; name?: string; username?: string; referral_code?: string } | undefined;
        if (referrer) {
          setReferrerSeed([{ value: String(referrer.id), label: `${referrer.name || referrer.username} • ${referrer.username} • ${referrer.referral_code}` }]);
        }
        const thirdParties = (data.pihak_ketiga as Array<{ user_id?: number; nama: string }> | undefined) || [];
        setThirdPartyOptions(thirdParties.filter((t) => t.user_id).map((t) => ({ value: String(t.user_id), label: `${t.nama} • - • -` })));

        const jalurData = (data.jalur_masuk as { id: number; nama: string } | null | undefined)
          ?? (data.gelombang_penerimaan?.jalur_masuk as { id: number; nama: string } | null | undefined);
        if (jalurData) setJalurSeed([{ value: String(jalurData.id), label: jalurData.nama }]);

        setPendaftar(data);
        reset(defaults);
        loadThirdParties('');
      } catch (error) {
        toast.error((error as ApiError)?.response?.data?.message || 'Gagal memuat data pendaftar.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, canManage, reset, loadThirdParties]);

  const selectedThirdPartyList = selectedThirdPartyIds.map((tid) => {
    const [name, username, email] = (thirdPartyOptions.find((o) => o.value === tid)?.label.split(' • ')) || ['Akun terpilih', '-', '-'];
    return { id: tid, name, username, email };
  });
  const thirdPartyColumns: ColumnDef<(typeof selectedThirdPartyList)[number]>[] = [
    { key: 'name', label: 'NAMA', render: (row) => <span className="text-xs font-semibold text-slate-800">{row.name}</span> },
    { key: 'username', label: 'USERNAME', render: (row) => <span className="text-xs text-slate-600">{row.username}</span> },
    { key: 'email', label: 'EMAIL', render: (row) => <span className="text-xs text-slate-600">{row.email}</span> },
  ];

  const downloadProof = async (proof: ProofItem) => {
    if (!pendaftar) return;
    try {
      const blob = await spmbService.downloadBuktiTransferManual(pendaftar.id, proof.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = proof.original_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Gagal mengunduh bukti transfer.');
    }
  };

  const onSubmit = async (values: EditValues) => {
    if (!pendaftar) return;
    const payload: Record<string, string | number | number[] | null> = {};
    for (const [key, value] of Object.entries(values)) {
      if (key === 'pihak_ketiga_user_ids' || key === 'bukti_transfer') continue;
      payload[key] = value === '' || value === undefined ? null : (value as string);
    }
    payload.email = values.email;
    payload.referrer_user_id = values.referrer_user_id ? Number(values.referrer_user_id) : null;
    payload.pihak_ketiga_user_ids = values.pihak_ketiga_user_ids.map(Number);
    if (isWna) payload.nik = null;

    try {
      await spmbService.updatePendaftaran(pendaftar.id, payload);
      if (values.bukti_transfer) await spmbService.uploadBuktiTransferPendaftaran(pendaftar.id, values.bukti_transfer);
      toast.success('Data pendaftar berhasil diperbarui.');
      router.push(backUrl);
    } catch (error) {
      const data = (error as ApiError)?.response?.data;
      toast.error(data?.errors ? Object.values(data.errors).flat().join(' ') : data?.message || 'Gagal menyimpan perubahan.');
    }
  };

  if (!canManage) {
    return <div className="card p-6 text-sm text-slate-600">Anda tidak memiliki izin untuk mengedit pendaftar.</div>;
  }
  if (loading) {
    return <div className="card animate-pulse p-6 text-sm text-slate-500">Memuat data pendaftar...</div>;
  }
  if (!pendaftar) {
    return <div className="card p-6 text-sm text-slate-600">Data pendaftar tidak ditemukan.</div>;
  }
  if (pendaftar.status === SPMB_STATUS.MAHASISWA_BARU) {
    return (
      <div className="card space-y-4 p-6 text-sm text-slate-600">
        <p>Data pendaftar yang sudah dikonversi menjadi mahasiswa tidak dapat diubah.</p>
        <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => router.push(backUrl)}>Kembali</Button>
      </div>
    );
  }

  const proofs = pendaftar.bukti_pembayaran_manual || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Edit Data Pendaftar"
        description={`${pendaftar.no_pendaftaran} — ${pendaftar.nama_lengkap}`}
        action={(
          <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => router.push(backUrl)} disabled={isSubmitting} style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}>
            Kembali
          </Button>
        )}
      />

      <p className="text-xs text-slate-500"><span className="font-bold text-red-600">*</span> Wajib diisi.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="card space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-2"><h2 className="text-xs font-bold text-slate-900">Data Pendaftaran</h2><p className="text-2xs text-slate-500">Pilih jalur lebih dulu, lalu gelombang yang berlaku. Kosongkan bila belum ditetapkan.</p></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Controller name="jalur_masuk_id" control={control} render={({ field }) => (
              <AsyncSelect
                label="Jalur Pendaftaran"
                loadOptions={loadJalurOptions}
                defaultOptions={jalurSeed.length ? jalurSeed : true}
                value={field.value}
                onChange={async (option: { value: string } | null) => {
                  const next = option?.value || '';
                  field.onChange(next);
                  setValue('gelombang_id', '');
                  if (!next) return;
                  try {
                    const result = await spmbService.resolveGelombang(next, 'manual');
                    if (result.mode === 'otomatis' && result.gelombang) {
                      setValue('gelombang_id', String(result.gelombang.id));
                    }
                  } catch {
                    toast.error('Gagal menentukan gelombang untuk jalur ini.');
                  }
                }}
                error={errors.jalur_masuk_id?.message}
                placeholder="Belum ditetapkan"
                isClearable
              />
            )} />
            <Controller name="gelombang_id" control={control} render={({ field }) => (
              <AsyncSelect
                key={selectedJalur || 'semua'}
                label="Gelombang Penerimaan"
                loadOptions={loadWaveOptions}
                defaultOptions={true}
                value={field.value}
                onChange={(option: { value: string } | null) => field.onChange(option?.value || '')}
                error={errors.gelombang_id?.message}
                hint={selectedJalur ? 'Gelombang khusus jalur ini, atau gelombang umum bila jalur tidak punya gelombang khusus.' : undefined}
                placeholder="Belum ditetapkan"
                isClearable
              />
            )} />
            <Controller name="program_studi_id" control={control} render={({ field }) => (
              <AsyncSelect
                label="Program Studi Pilihan 1"
                required
                loadOptions={loadProgramOptions}
                defaultOptions={programOptions}
                value={field.value}
                onChange={(option: { value: string } | null) => field.onChange(option?.value || '')}
                error={errors.program_studi_id?.message}
              />
            )} />
            <Controller name="program_studi_pilihan2_id" control={control} render={({ field }) => (
              <AsyncSelect
                label="Program Studi Pilihan 2"
                loadOptions={loadProgramOptions}
                defaultOptions={programOptions}
                value={field.value}
                onChange={(option: { value: string } | null) => field.onChange(option?.value || '')}
                error={errors.program_studi_pilihan2_id?.message}
                isClearable
              />
            )} />
          </div>
        </section>

        <section className="card space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-2"><h2 className="text-xs font-bold text-slate-900">Identitas dan Akun Calon</h2><p className="text-2xs text-slate-500">Email adalah alamat login akun calon dan harus unik. Mengubah nama atau nomor HP juga memperbarui akun.</p></div>
          <div className="space-y-4">
            <Input label="Nama Lengkap" required error={errors.nama_lengkap?.message} {...register('nama_lengkap')} />
            <Input type="email" label="Email Calon" required error={errors.email?.message} {...register('email')} />
            <Controller name="kewarganegaraan_id" control={control} render={({ field }) => (
              <AsyncSelect
                label="Kewarganegaraan"
                loadOptions={loadNationalityOptions}
                defaultOptions={nationalityOptions.map(({ value, label }) => ({ value, label }))}
                value={field.value}
                onChange={(option: { value: string } | null) => {
                  const ref = nationalityOptions.find((o) => o.value === String(option?.value || ''));
                  field.onChange(ref?.value || '');
                  if (ref?.code === NATIONALITY_CODE.WNA) setValue('nik', '');
                  if (ref?.code === NATIONALITY_CODE.WNI) {
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
              <Input label="NIK" hint="Kosongkan bila belum diketahui (data import). Jika diisi harus 16 digit." maxLength={16} error={errors.nik?.message} {...register('nik')} />
            )}
            <Input type="date" label="Tanggal Lahir" error={errors.tanggal_lahir?.message} {...register('tanggal_lahir')} />
            <Input label="Tempat Lahir" error={errors.tempat_lahir?.message} {...register('tempat_lahir')} />
            <Controller name="jenis_kelamin" control={control} render={({ field }) => (
              <Select label="Jenis Kelamin" options={GENDER_OPTIONS} value={field.value} onChange={field.onChange} />
            )} />
            <Controller name="agama" control={control} render={({ field }) => (
              <Select label="Agama" options={AGAMA_OPTIONS} value={field.value} onChange={field.onChange} isClearable />
            )} />
            <Controller name="status_sipil" control={control} render={({ field }) => (
              <Select label="Status Sipil" options={STATUS_SIPIL_OPTIONS} value={field.value} onChange={field.onChange} error={errors.status_sipil?.message} isClearable />
            )} />
            <Input label="Nomor Handphone" error={errors.no_hp?.message} {...register('no_hp')} />
          </div>
          <SpmbResidenceFields control={control} setValue={setValue} errors={errors} isWna={isWna} />
          <Textarea label="Alamat Domisili" rows={3} error={errors.alamat?.message} {...register('alamat')} />
        </section>

        <section className="card space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-2"><h2 className="text-xs font-bold text-slate-900">Data Pendidikan dan Keluarga</h2><p className="text-2xs text-slate-500">Lengkapi informasi yang tercantum pada formulir pendaftaran.</p></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Controller name="asal_sekolah" control={control} render={({ field }) => (
              <AsyncSelect
                label="Asal Sekolah"
                isCreatable
                loadOptions={spmbReferenceService.searchSchools}
                defaultOptions={field.value ? [{ value: field.value, label: field.value }] : true}
                value={field.value}
                onChange={(option: SelectOption | null) => {
                  const school = option as (SelectOption & { address?: string }) | null;
                  field.onChange(school?.value || '');
                  if (school?.address) setValue('alamat_sekolah', school.address);
                }}
                placeholder="Cari atau ketik nama sekolah"
              />
            )} />
            <Input label="Jurusan Sekolah" {...register('jurusan_sekolah')} />
            <Input label="Tahun Lulus" maxLength={4} error={errors.tahun_lulus?.message} {...register('tahun_lulus')} />
          </div>
          <Textarea label="Alamat Sekolah" rows={2} {...register('alamat_sekolah')} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {([
              ['Ayah', 'ayah'],
              ['Ibu', 'ibu'],
              ['Wali', 'wali'],
            ] as const).map(([title, key]) => (
              <section key={key} className="grid grid-cols-1 gap-4 rounded border border-slate-200 p-4 md:grid-cols-2 lg:grid-cols-3">
                <h3 className="text-xs font-bold text-slate-800 md:col-span-2 lg:col-span-3">{title}</h3>
                <Input label={`Nama ${title}`} {...register(`nama_${key}`)} />
                <Input label={`Nomor Telepon ${title}`} type="tel" {...register(`telepon_${key}`)} />
                <Controller name={`pekerjaan_${key}`} control={control} render={({ field }) => <Select label={`Pekerjaan ${title}`} options={PEKERJAAN_OPTIONS} value={field.value} onChange={field.onChange} isClearable />} />
                <Controller name={`penghasilan_${key}`} control={control} render={({ field }) => <Select label={`Penghasilan ${title}`} options={PENGHASILAN_OPTIONS} value={field.value} onChange={field.onChange} isClearable />} />
              </section>
            ))}
          </div>
          <section className="grid grid-cols-1 gap-4 rounded border border-slate-200 p-4 md:grid-cols-3">
            <h3 className="text-xs font-bold text-slate-800 md:col-span-3">Orang Tua (Umum)</h3>
            <Input label="Nama Orang Tua" {...register('nama_ortu')} />
            <Input label="Telepon Orang Tua" type="tel" {...register('telp_ortu')} />
            <Input label="Pekerjaan Orang Tua" {...register('pekerjaan_ortu')} />
          </section>
          <Textarea label="Alamat Orang Tua/Wali" rows={2} {...register('alamat_ortu')} />
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold text-slate-800">Data Pendidikan Tinggi Sebelumnya (Opsional)</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Controller name="asal_lulusan" control={control} render={({ field }) => (
                <Select label="Asal Lulusan" options={ASAL_LULUSAN_OPTIONS} value={field.value} onChange={field.onChange} isClearable />
              )} />
              <Input label="Asal Perguruan Tinggi" {...register('asal_pt')} />
              <Input label="Jenis Perguruan Tinggi" {...register('jenis_pt')} />
              <Input label="Jenjang Sebelumnya" {...register('jenjang_pt')} />
              <Input label="Program Studi Sebelumnya" {...register('progdi_pt')} />
              <Input type="number" min="0" max="4" step="0.01" label="IPK Sebelumnya" {...register('ipk_pt')} />
              <Input label="NIM Sebelumnya" {...register('nim_pt')} />
              <Input label="Tahun Lulus Sebelumnya" maxLength={4} error={errors.tahun_lulus_pt?.message} {...register('tahun_lulus_pt')} />
            </div>
            <Textarea label="Alamat Perguruan Tinggi Sebelumnya" rows={2} {...register('alamat_pt')} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Sumber Informasi Pendaftaran" {...register('info_daftar')} />
            <Input label="Keterangan Sumber Informasi" {...register('ket_info_daftar')} />
          </div>
        </section>

        <section className="card space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-2"><h2 className="text-xs font-bold text-slate-900">Referral dan Pihak Ketiga</h2><p className="text-2xs text-slate-500">Referral tidak dapat diubah setelah pendaftaran diverifikasi.</p></div>
          <Controller name="referrer_user_id" control={control} render={({ field }) => (
            <AsyncSelect
              label="Direferensikan Oleh (Opsional)"
              loadOptions={loadReferrers}
              defaultOptions={referrerSeed.length ? referrerSeed : true}
              value={field.value}
              onChange={(option) => field.onChange(option?.value || '')}
              placeholder="Cari nama, username, email, atau kode referral"
              isClearable
            />
          )} />
          <Controller name="pihak_ketiga_user_ids" control={control} render={({ field }) => (
            <AsyncSelect
              label="Pihak Ketiga"
              loadOptions={loadThirdParties}
              defaultOptions={thirdPartyOptions}
              value={field.value}
              onChange={(selected) => field.onChange(Array.isArray(selected) ? selected.map((o: SelectOption) => String(o.value)) : [])}
              placeholder="Cari akun pihak ketiga..."
              isMulti
              error={errors.pihak_ketiga_user_ids?.message}
            />
          )} />
          <DataTable
            columns={thirdPartyColumns}
            data={selectedThirdPartyList}
            keyExtractor={(row) => row.id}
            emptyMessage="Belum ada pihak ketiga dipilih."
          />
        </section>

        <section className="card space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-2"><h2 className="text-xs font-bold text-slate-900">Bukti Transfer Biaya Pendaftaran</h2><p className="text-2xs text-slate-500">Unggahan baru ditambahkan ke daftar bukti dan menunggu verifikasi; tidak otomatis mengubah status pembayaran.</p></div>
          {proofs.length > 0 ? (
            <ul className="divide-y divide-slate-100 rounded border border-slate-200 text-xs">
              {proofs.map((proof) => (
                <li key={proof.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="truncate font-semibold text-slate-800">{proof.original_name}</span>
                  <span className="shrink-0 text-2xs text-slate-500">{proof.status.replace(/_/g, ' ')}</span>
                  <Button type="button" variant="ghost" size="sm" icon={<Download size={14} />} onClick={() => downloadProof(proof)}>Unduh</Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-2xs text-slate-500">Belum ada bukti transfer.</p>
          )}
          <Input
            type="file"
            label="Tambah Bukti Transfer (PDF/JPG/PNG)"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            error={errors.bukti_transfer?.message}
            onChange={async (event) => {
              setValue('bukti_transfer', event.target.files?.[0], { shouldValidate: false });
              await trigger('bukti_transfer');
            }}
          />
        </section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push(backUrl)} disabled={isSubmitting}>Batal</Button>
          <Button type="submit" variant="primary" loading={isSubmitting} icon={<Save size={16} />} style={{ backgroundColor: 'var(--module-primary)' }}>
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </div>
  );
}
