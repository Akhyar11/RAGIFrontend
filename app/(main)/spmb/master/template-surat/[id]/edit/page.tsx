'use client';

import { useState, useEffect, use, useRef, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Download,
  HelpCircle,
  FileText,
  Archive,
  Info,
  Copy,
  CheckCircle2,
  ChevronDown,
  Pencil,
  Eye,
} from 'lucide-react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { spmbService } from '@/services/spmb.service';
import { JalurMasuk, GelombangPenerimaan, JENIS_SURAT_OPTIONS } from '@/types/spmb.types';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Checkbox } from '@/components/ui/Checkbox';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  kode: z.string().min(1, 'Kode template wajib diisi').max(50, 'Maksimal 50 karakter'),
  nama: z.string().min(1, 'Nama template wajib diisi').max(150, 'Maksimal 150 karakter'),
  jenis_surat: z.string().min(1, 'Jenis surat wajib diisi'),
  hasil: z.string().optional().nullable(),
  module_id: z.string().optional().nullable(),
  klasifikasi_surat_id: z.string().optional().nullable(),
  unit_surat_id: z.string().optional().nullable(),
  jalur_masuk_id: z.string().optional().nullable(),
  gelombang_id: z.string().optional().nullable(),
  is_active: z.boolean(),
  kop_nama_institusi: z.string().optional().nullable(),
  kop_nama_sub: z.string().optional().nullable(),
  kop_alamat_kontak: z.string().optional().nullable(),
  judul_surat: z.string().optional().nullable(),
  teks_pembuka: z.string().optional().nullable(),
  teks_pernyataan: z.string().optional().nullable(),
  teks_keputusan: z.string().optional().nullable(),
  label_keputusan: z.string().optional().nullable(),
  teks_prodi: z.string().optional().nullable(),
  teks_penutup: z.string().optional().nullable(),
  petunjuk_daftar_ulang: z.string().optional().nullable(),
  judul_petunjuk: z.string().optional().nullable(),
  kota_penetapan: z.string().optional().nullable(),
  nama_penandatangan: z.string().optional().nullable(),
  jabatan_penandatangan: z.string().optional().nullable(),
  nip_penandatangan: z.string().optional().nullable(),
  catatan_kaki: z.string().optional().nullable(),
}).superRefine((values, ctx) => {
  if (!values.is_active) return;
  if (!values.module_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['module_id'], message: 'Modul pemohon wajib dipilih.' });
  }
  if (!values.klasifikasi_surat_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['klasifikasi_surat_id'], message: 'Klasifikasi Arsip wajib dipilih.' });
  }
  if (!values.unit_surat_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['unit_surat_id'], message: 'Unit penerbit INDO wajib dipilih.' });
  }
});

type FormValues = z.infer<typeof schema>;

const AVAILABLE_PLACEHOLDERS = [
  { token: '{no_pendaftaran}', desc: 'Nomor Pendaftaran peserta' },
  { token: '{nama}', desc: 'Nama lengkap peserta' },
  { token: '{nik}', desc: 'NIK peserta' },
  { token: '{nomor_paspor}', desc: 'Nomor paspor peserta WNA' },
  { token: '{kewarganegaraan}', desc: 'Kewarganegaraan peserta' },
  { token: '{tempat_lahir}', desc: 'Tempat lahir peserta' },
  { token: '{tanggal_lahir}', desc: 'Tanggal lahir peserta' },
  { token: '{asal_sekolah}', desc: 'Nama sekolah / institusi asal' },
  { token: '{prodi_diterima}', desc: 'Nama Program Studi diterima' },
  { token: '{jenjang}', desc: 'Jenjang pendidikan (S1, D3, dll.)' },
  { token: '{jalur}', desc: 'Nama Jalur Masuk' },
  { token: '{gelombang}', desc: 'Nama Gelombang Penerimaan' },
  { token: '{tahun_akademik}', desc: 'Tahun Akademik pendaftaran' },
  { token: '{tanggal_penetapan}', desc: 'Tanggal pengesahan / hari ini' },
  { token: '{tahun}', desc: 'Tahun 4 digit (misal: 2026)' },
  { token: '{romawi_bulan}', desc: 'Bulan dalam romawi (misal: X)' },
  { token: '{kota}', desc: 'Kota penetapan surat' },
];

const SAMPLE: Record<string, string> = {
  no_pendaftaran: 'SPMB-2026-0001',
  nama: 'AHMAD FAUZI PRATAMA',
  nik: '3371012345670001',
  nomor_paspor: 'A1234567',
  kewarganegaraan: 'Warga Negara Asing',
  tempat_lahir: 'Surakarta',
  tanggal_lahir: '1 Januari 2008',
  asal_sekolah: 'SMA Negeri 1 Surakarta',
  prodi_diterima: 'Teknik Informatika',
  jenjang: 'S1',
  jalur: 'Jalur Reguler',
  gelombang: 'Gelombang I',
  tahun_akademik: '2026/2027',
  tanggal_penetapan: '5 Oktober 2026',
  tahun: '2026',
  romawi_bulan: 'X',
};

function replacePlaceholders(text: string, values: Record<string, string>): string {
  return (text || '').replace(/\{(\w+)\}/g, (m, key) => values[key] ?? m);
}

interface ArsipOptions {
  modules: { id: number; name: string; code: string }[];
  klasifikasi: { id: number; kode: string; nama: string }[];
  unit: { id: number; kode: string; nama: string }[];
  kop_surat: {
    id: number;
    nama: string;
    file_url?: string | null;
    nama_institusi?: string | null;
    alamat_institusi?: string | null;
    kontak_institusi?: string | null;
    website_institusi?: string | null;
  } | null;
}

function Editable({
  value,
  onChange,
  placeholder,
  style,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: CSSProperties;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement !== el && el.innerText !== value) {
      el.innerText = value;
    }
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder}
      onInput={(e) => onChange(e.currentTarget.innerText)}
      onBlur={(e) => onChange(e.currentTarget.innerText)}
      className={`wysiwyg-edit ${className || ''}`}
      style={style}
    />
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ width: '30%', padding: '1.5px 4px', verticalAlign: 'top' }}>{label}</td>
      <td style={{ width: '3%', padding: '1.5px 4px', verticalAlign: 'top' }}>:</td>
      <td style={{ width: '67%', padding: '1.5px 4px', verticalAlign: 'top', fontWeight: 700 }}>
        {value}
      </td>
    </tr>
  );
}

export default function EditorTemplateSuratPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showTokens, setShowTokens] = useState(false);
  const [arsipOpts, setArsipOpts] = useState<ArsipOptions | null>(null);

  const docBoxRef = useRef<HTMLDivElement>(null);
  const docInnerRef = useRef<HTMLDivElement>(null);
  const [docScale, setDocScale] = useState(0.8);
  const [docHeight, setDocHeight] = useState(1123);

  const loadJalurOptions = async (inputValue: string) => {
    try {
      const res = await spmbService.getJalurMasuk({ name: inputValue, limit: 50 });
      return (res.data || []).map((j: JalurMasuk) => ({
        value: String(j.id),
        label: `${j.kode} - ${j.nama}`,
      }));
    } catch {
      return [];
    }
  };

  const loadGelombangOptions = async (inputValue: string) => {
    try {
      const res = await spmbService.getGelombang({ nama: inputValue, per_page: 50 });
      return (res.data || []).map((g: GelombangPenerimaan) => ({
        value: String(g.id),
        label: g.nama,
      }));
    } catch {
      return [];
    }
  };

  const loadModuleOptions = async (inputValue: string) => {
    const modules = arsipOpts?.modules || [];
    const q = inputValue.toLowerCase();
    return modules
      .filter((m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q))
      .map((m) => ({ value: String(m.id), label: `${m.name} (${m.code})` }));
  };

  const loadKlasifikasiOptions = async (inputValue: string) => {
    const items = arsipOpts?.klasifikasi || [];
    const q = inputValue.toLowerCase();
    return items
      .filter((k) => k.kode.toLowerCase().includes(q) || k.nama.toLowerCase().includes(q))
      .map((k) => ({ value: String(k.id), label: `${k.kode} - ${k.nama}` }));
  };

  const loadUnitOptions = async (inputValue: string) => {
    const items = arsipOpts?.unit || [];
    const q = inputValue.toLowerCase();
    return items
      .filter((u) => u.kode.toLowerCase().includes(q) || u.nama.toLowerCase().includes(q))
      .map((u) => ({ value: String(u.id), label: `${u.kode} - ${u.nama}` }));
  };

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kode: '',
      nama: '',
      jenis_surat: 'sk_lulus',
      hasil: 'diterima',
      module_id: '',
      klasifikasi_surat_id: '',
      unit_surat_id: '',
      jalur_masuk_id: '',
      gelombang_id: '',
      is_active: true,
      kop_nama_institusi: '',
      kop_nama_sub: '',
      kop_alamat_kontak: '',
      judul_surat: '',
      teks_pembuka: '',
      teks_pernyataan: '',
      teks_keputusan: '',
      label_keputusan: '',
      teks_prodi: '',
      teks_penutup: '',
      petunjuk_daftar_ulang: '',
      judul_petunjuk: '',
      kota_penetapan: '',
      nama_penandatangan: '',
      jabatan_penandatangan: '',
      nip_penandatangan: '',
      catatan_kaki: '',
    },
  });

  const values = useWatch({ control }) as FormValues;

  const bind = (name: keyof FormValues, placeholder?: string) => ({
    value: (values?.[name] as string) || '',
    onChange: (v: string) => setValue(name, v, { shouldDirty: true }),
    placeholder,
  });

  useEffect(() => {
    spmbService
      .getTemplateSuratArsipOptions()
      .then(setArsipOpts)
      .catch(() => setArsipOpts(null));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetching(true);
        const resDetail = await spmbService.getTemplateSuratDetail(id);

        if (resDetail?.data) {
          const d = resDetail.data;
          const hasilVal = d.hasil || 'diterima';
          reset({
            kode: d.kode || '',
            nama: d.nama || '',
            jenis_surat: d.jenis_surat || 'sk_lulus',
            hasil: d.hasil || 'diterima',
            module_id: d.module_id ? String(d.module_id) : '',
            klasifikasi_surat_id: d.klasifikasi_surat_id ? String(d.klasifikasi_surat_id) : '',
            unit_surat_id: d.unit_surat_id ? String(d.unit_surat_id) : '',
            jalur_masuk_id: d.jalur_masuk_id ? String(d.jalur_masuk_id) : '',
            gelombang_id: d.gelombang_id ? String(d.gelombang_id) : '',
            is_active: d.is_active ?? true,
            kop_nama_institusi: d.kop_nama_institusi || '',
            kop_nama_sub: d.kop_nama_sub || '',
            kop_alamat_kontak: d.kop_alamat_kontak || '',
            judul_surat: d.judul_surat || 'SURAT KETERANGAN TANDA LULUS SELEKSI',
            teks_pembuka:
              d.teks_pembuka ||
              'Berdasarkan hasil evaluasi verifikasi kelengkapan berkas administrasi dan pemenuhan syarat seleksi penerimaan mahasiswa baru Tahun Akademik {tahun_akademik}, Panitia Penerimaan Mahasiswa Baru menyatakan bahwa:',
            teks_pernyataan:
              d.teks_pernyataan ||
              'Sehubungan dengan hasil seleksi penerimaan mahasiswa baru tersebut di atas, dengan ini dinyatakan:',
            teks_keputusan:
              d.teks_keputusan || (hasilVal === 'ditolak' ? 'DINYATAKAN TIDAK LULUS' : 'DINYATAKAN LULUS / DITERIMA'),
            label_keputusan: d.label_keputusan || 'Keputusan Hasil Seleksi:',
            teks_prodi: d.teks_prodi || 'Program Studi: {prodi_diterima} ({jenjang})',
            teks_penutup:
              d.teks_penutup || 'Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.',
            petunjuk_daftar_ulang:
              d.petunjuk_daftar_ulang ||
              '1. Calon mahasiswa yang dinyatakan lulus wajib melakukan Daftar Ulang melalui portal resmi SPMB pada menu Daftar Ulang.\n2. Selesaikan pembayaran biaya registrasi/UKT menggunakan nomor Virtual Account resmi yang tertera pada invoice tagihan Anda sebelum batas waktu yang ditentukan.\n3. Setelah pembayaran daftar ulang terkonfirmasi lunas, sistem akan menerbitkan Nomor Induk Mahasiswa (NIM) resmi dan akun akademik mahasiswa baru.\n4. Surat keterangan ini sah dan dihasilkan secara otomatis oleh Sistem Informasi Penerimaan Mahasiswa Baru terintegrasi.',
            judul_petunjuk: d.judul_petunjuk || 'Petunjuk & Ketentuan Daftar Ulang:',
            kota_penetapan: d.kota_penetapan || '',
            nama_penandatangan: d.nama_penandatangan || '',
            jabatan_penandatangan: d.jabatan_penandatangan || '',
            nip_penandatangan: d.nip_penandatangan || '',
            catatan_kaki: d.catatan_kaki || '',
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal memuat template';
        toast.error(message);
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [id, reset]);

  useEffect(() => {
    const box = docBoxRef.current;
    const inner = docInnerRef.current;
    if (!box || !inner) return;
    const update = () => {
      setDocScale(box.clientWidth / 794);
      setDocHeight(inner.scrollHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [fetching]);

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      const payload = {
        ...data,
        module_id: data.module_id ? Number(data.module_id) : null,
        klasifikasi_surat_id: data.klasifikasi_surat_id ? Number(data.klasifikasi_surat_id) : null,
        unit_surat_id: data.unit_surat_id ? Number(data.unit_surat_id) : null,
        jalur_masuk_id: data.jalur_masuk_id ? Number(data.jalur_masuk_id) : null,
        gelombang_id: data.gelombang_id ? Number(data.gelombang_id) : null,
      };

      await spmbService.updateTemplateSurat(id, payload);
      toast.success('Template surat berhasil diperbarui');
      router.push('/spmb/master/template-surat');
    } catch (err: unknown) {
      const error = err as AxiosError<{ message?: string }>;
      toast.error(error.response?.data?.message || error.message || 'Gagal menyimpan perubahan');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPdf = async () => {
    const toastId = toast.loading('Menyiapkan pratinjau dokumen PDF...');
    try {
      const blob = await spmbService.previewTemplateSuratPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = `Preview-Template-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Pratinjau PDF berhasil dibuka', { id: toastId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal membuka pratinjau PDF';
      toast.error(message, { id: toastId });
    }
  };

  const copyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(token);
      toast.success(`${token} disalin ke clipboard`);
      setTimeout(() => setCopiedToken(null), 1500);
    } catch {
      toast.error('Gagal menyalin token');
    }
  };

  const ph = (text?: string | null) =>
    replacePlaceholders(text || '', { ...SAMPLE, kota: values?.kota_penetapan || 'Surakarta' });

  const kopSurat = arsipOpts?.kop_surat ?? null;
  const isDitolak = values?.hasil === 'ditolak';
  const fontFamily = "'DejaVu Serif', 'Times New Roman', Times, serif";

  if (fetching) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="h-96 bg-slate-100 rounded-xl"></div>
          <div className="h-[600px] bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Editor Template Surat SPMB"
        description="Klik langsung pada teks surat di panel kanan untuk mengeditnya."
        breadcrumbs={[
          { label: 'SPMB', href: '/spmb' },
          { label: 'Master Template Surat', href: '/spmb/master/template-surat' },
          { label: 'Editor' },
        ]}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/spmb/master/template-surat')}
              style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
              icon={<ArrowLeft size={16} />}
            >
              Kembali
            </Button>
            <Button
              variant="outline"
              onClick={handlePreviewPdf}
              style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
              icon={<Download size={16} />}
            >
              Pratinjau PDF
            </Button>
          </div>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          {/* KIRI: PARAMETER */}
          <div className="space-y-6">
            <div className="card overflow-hidden">
              <div className="card-header">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: 'var(--module-primary-light, var(--primary-50))',
                      color: 'var(--module-primary, var(--primary-600))',
                    }}
                  >
                    <FileText size={18} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-800">Identitas & Ruang Lingkup</h3>
                    <p className="text-2xs text-slate-500 mt-0.5">
                      Kode, nama, jenis surat, dan cakupan jalur/gelombang.
                    </p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Kode Template"
                    placeholder="Misal: SK_LULUS_REGULER_2026"
                    required
                    hint="Kode unik template surat."
                    error={errors.kode?.message}
                    {...register('kode')}
                  />
                  <Input
                    label="Nama Template"
                    placeholder="Misal: Template SK Kelulusan Jalur Reguler"
                    required
                    hint="Nama deskriptif untuk mempermudah identifikasi."
                    error={errors.nama?.message}
                    {...register('nama')}
                  />
                  <Controller
                    name="jenis_surat"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="Jenis Surat"
                        required
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.jenis_surat?.message}
                        options={JENIS_SURAT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                      />
                    )}
                  />
                  <Controller
                    name="jalur_masuk_id"
                    control={control}
                    render={({ field }) => (
                      <AsyncSelect
                        label="Khusus Jalur Masuk"
                        placeholder="Pilih Jalur Masuk (kosongkan = semua)"
                        value={field.value}
                        onChange={(opt: { value: string; label: string } | null) =>
                          field.onChange(opt ? opt.value : '')
                        }
                        loadOptions={loadJalurOptions}
                        isClearable
                        hint="Kosongkan jika berlaku untuk semua jalur."
                      />
                    )}
                  />
                  <Controller
                    name="gelombang_id"
                    control={control}
                    render={({ field }) => (
                      <AsyncSelect
                        label="Khusus Gelombang"
                        placeholder="Pilih Gelombang (kosongkan = semua)"
                        value={field.value}
                        onChange={(opt: { value: string; label: string } | null) =>
                          field.onChange(opt ? opt.value : '')
                        }
                        loadOptions={loadGelombangOptions}
                        isClearable
                        hint="Kosongkan jika berlaku untuk semua gelombang."
                      />
                    )}
                  />
                  <div className="flex items-end pb-1">
                    <Controller
                      name="is_active"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          label="Aktifkan Template Ini"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          hint="Template aktif dipilih sistem saat menerbitkan SK."
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="card-header">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: 'var(--module-primary-light, var(--primary-50))',
                      color: 'var(--module-primary, var(--primary-600))',
                    }}
                  >
                    <Archive size={18} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-800">Penomoran & Integrasi Arsip</h3>
                    <p className="text-2xs text-slate-500 mt-0.5">
                      Nomor resmi dan urutannya diterbitkan oleh Arsip.
                    </p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
                      Format Nomor SK dari Arsip
                    </span>
                    <code className="mt-1 block text-xs font-mono font-bold text-slate-800">
                      {'{nomor_urut}/{kode_klasifikasi}/INDO/{bulan_romawi}/{tahun}'}
                    </code>
                    <p className="mt-1 text-2xs text-slate-500">
                      Arsip menerbitkan nomor setelah permohonan disetujui. SPMB tidak membuat nomor sendiri.
                    </p>
                  </div>
                  <Controller
                    name="module_id"
                    control={control}
                    render={({ field }) => (
                      <AsyncSelect
                        label="Modul Pemohon"
                        placeholder="Pilih modul SPMB..."
                        value={field.value}
                        onChange={(opt: { value: string; label: string } | null) =>
                          field.onChange(opt ? opt.value : '')
                        }
                        loadOptions={loadModuleOptions}
                        isClearable
                        required={Boolean(values?.is_active)}
                        error={errors.module_id?.message}
                        hint="Asal permohonan dicatat sebagai SPMB; unit INDO di Arsip menerbitkan nomor."
                      />
                    )}
                  />
                  <Controller
                    name="klasifikasi_surat_id"
                    control={control}
                    render={({ field }) => (
                      <AsyncSelect
                        label="Klasifikasi Surat (Arsip)"
                        placeholder="Cari kode/uraian klasifikasi..."
                        value={field.value}
                        onChange={(opt: { value: string; label: string } | null) =>
                          field.onChange(opt ? opt.value : '')
                        }
                        loadOptions={loadKlasifikasiOptions}
                        isClearable
                        required={Boolean(values?.is_active)}
                        error={errors.klasifikasi_surat_id?.message}
                        hint="Dari master Klasifikasi Surat Arsip."
                      />
                    )}
                  />
                  <Controller
                    name="unit_surat_id"
                    control={control}
                    render={({ field }) => (
                      <AsyncSelect
                        label="Unit Penerbit (Arsip)"
                        placeholder="Pilih unit INDO..."
                        value={field.value}
                        onChange={(opt: { value: string; label: string } | null) =>
                          field.onChange(opt ? opt.value : '')
                        }
                        loadOptions={loadUnitOptions}
                        isClearable
                        required={Boolean(values?.is_active)}
                        error={errors.unit_surat_id?.message}
                        hint="Nomor SK SPMB wajib memakai unit penerbit INDO dari master Arsip."
                      />
                    )}
                  />
                </div>
                <div
                  className="mt-4 flex items-start gap-2 rounded-lg border p-3 text-2xs"
                  style={{
                    borderColor: 'var(--module-primary-light, var(--primary-100))',
                    background: 'var(--module-primary-light, var(--primary-50))',
                    color: 'var(--module-primary, var(--primary-700))',
                  }}
                >
                  <Info size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Setiap nomor SK dimohonkan ke Arsip dan menunggu persetujuan. Nomor urut, format, dan unit penerbit ditentukan oleh master Arsip.
                  </span>
                </div>
              </div>
            </div>

            <div className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTokens((s) => !s)}
                className="card-header w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle size={16} style={{ color: 'var(--module-primary)' }} />
                  <h3 className="text-sm font-bold text-slate-800">Token Dinamis</h3>
                  <span className="text-2xs text-slate-400">({AVAILABLE_PLACEHOLDERS.length})</span>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform ${showTokens ? 'rotate-180' : ''}`}
                />
              </button>
              {showTokens && (
                <div className="card-body">
                  <p className="text-2xs text-slate-500 mb-3">
                    Klik token untuk menyalin, lalu tempel ke teks surat. Nilainya diganti otomatis saat
                    SK diterbitkan.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_PLACEHOLDERS.map((item) => (
                      <button
                        key={item.token}
                        type="button"
                        title={item.desc}
                        onClick={() => copyToken(item.token)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-2xs text-slate-700 transition hover:border-slate-300 hover:bg-white"
                      >
                        {copiedToken === item.token ? (
                          <CheckCircle2 size={12} className="text-emerald-500" />
                        ) : (
                          <Copy size={12} className="text-slate-400" />
                        )}
                        {item.token}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* KANAN: DOKUMEN EDITABLE */}
          <div className="xl:sticky xl:top-6">
            <div className="card overflow-hidden">
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <Eye size={16} style={{ color: 'var(--module-primary)' }} />
                  <h3 className="text-sm font-bold text-slate-800">Dokumen Surat</h3>
                  <span className="badge badge-blue">A4</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden items-center gap-1.5 text-2xs text-slate-500 sm:flex">
                    <Pencil size={12} />
                    Klik teks untuk mengedit
                  </span>
                  <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
                    <button
                      type="button"
                      onClick={() => setValue('hasil', 'diterima', { shouldDirty: true })}
                      className={`rounded-md px-3 py-1 text-2xs font-bold transition ${
                        (values?.hasil || 'diterima') === 'diterima' ? 'text-white' : 'text-slate-600'
                      }`}
                      style={
                        (values?.hasil || 'diterima') === 'diterima'
                          ? { backgroundColor: 'var(--module-primary)' }
                          : undefined
                      }
                    >
                      Diterima
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('hasil', 'ditolak', { shouldDirty: true })}
                      className={`rounded-md px-3 py-1 text-2xs font-bold transition ${
                        values?.hasil === 'ditolak' ? 'text-white' : 'text-slate-600'
                      }`}
                      style={
                        values?.hasil === 'ditolak'
                          ? { backgroundColor: 'var(--module-primary)' }
                          : undefined
                      }
                    >
                      Ditolak
                    </button>
                  </div>
                </div>
              </div>
              <div className="card-body bg-slate-100">
                <div ref={docBoxRef} className="w-full">
                  <div
                    className="relative w-full overflow-hidden rounded-md ring-1 ring-slate-200"
                    style={{ height: docHeight * docScale }}
                  >
                    <div
                      ref={docInnerRef}
                      className="absolute left-0 top-0 origin-top-left bg-white"
                      style={{ width: 794, minHeight: 1123, transform: `scale(${docScale})`, fontFamily }}
                    >
                      {/* KOP */}
                      {kopSurat?.file_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={kopSurat.file_url} alt="Kop Surat" style={{ width: 794, display: 'block' }} />
                      ) : (
                        <div style={{ padding: '14px 76px 6px', textAlign: 'center' }}>
                          <Editable
                            {...bind('kop_nama_institusi', 'Nama Institusi')}
                            style={{ fontSize: 18.7, fontWeight: 700, textTransform: 'uppercase' }}
                          />
                          <Editable
                            {...bind('kop_nama_sub', 'Sub Unit / Panitia')}
                            style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase' }}
                          />
                          <Editable
                            {...bind('kop_alamat_kontak', 'Alamat & kontak institusi')}
                            style={{ fontSize: 12, whiteSpace: 'pre-line', marginTop: 3 }}
                          />
                          <div style={{ borderTop: '2px solid #000', marginTop: 5 }} />
                          <div style={{ borderTop: '1px solid #000', marginTop: 1 }} />
                        </div>
                      )}

                      {/* BODY */}
                      <div style={{ padding: '16px 76px 56px', fontSize: 14.7, lineHeight: 1.5, color: '#000' }}>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                          <Editable
                            {...bind('judul_surat', 'Judul Surat')}
                            style={{
                              fontSize: 18.7,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              textDecoration: 'underline',
                              letterSpacing: 0.5,
                            }}
                          />
                          <div style={{ fontSize: 16, marginTop: 2 }}>Nomor: Diterbitkan oleh Arsip</div>
                        </div>

                        <Editable
                          {...bind('teks_pembuka', 'Teks pembuka / konsideran surat...')}
                          style={{ textAlign: 'justify', whiteSpace: 'pre-line', margin: '0 0 10px' }}
                        />

                        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0 0 10px 24px' }}>
                          <tbody>
                            <Row label="Nomor Pendaftaran" value={SAMPLE.no_pendaftaran} />
                            <Row label="Nama Lengkap" value={SAMPLE.nama} />
                            <Row label="NIK" value={SAMPLE.nik} />
                            <Row label="Tempat, Tanggal Lahir" value={`${SAMPLE.tempat_lahir}, ${SAMPLE.tanggal_lahir}`} />
                            <Row label="Asal Sekolah / Institusi" value={SAMPLE.asal_sekolah} />
                            <Row label="Jalur Masuk" value={SAMPLE.jalur} />
                            <Row label="Gelombang Pendaftaran" value={SAMPLE.gelombang} />
                          </tbody>
                        </table>

                        <Editable
                          {...bind(
                            'teks_pernyataan',
                            'Sehubungan dengan hasil seleksi penerimaan mahasiswa baru tersebut di atas, dengan ini dinyatakan:'
                          )}
                          style={{ textAlign: 'justify', margin: '10px 0 8px' }}
                        />

                        <div
                          style={{
                            border: '1.5px solid #000',
                            padding: '10px 14px',
                            textAlign: 'center',
                            margin: '14px 0',
                          }}
                        >
                          <Editable
                            {...bind('label_keputusan', 'Keputusan Hasil Seleksi:')}
                            style={{ fontSize: 13.3, textTransform: 'uppercase', letterSpacing: 0.5 }}
                          />
                          <Editable
                            {...bind('teks_keputusan', 'Teks keputusan kelulusan')}
                            style={{
                              fontSize: 20,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: 1,
                              margin: '4px 0 6px',
                            }}
                          />
                          {!isDitolak && (
                            <Editable
                              {...bind('teks_prodi', 'Program Studi: {prodi_diterima} ({jenjang})')}
                              style={{ fontSize: 14.7 }}
                            />
                          )}
                        </div>

                        {!isDitolak && (
                          <div style={{ margin: '12px 0 18px' }}>
                            <Editable
                              {...bind('judul_petunjuk', 'Petunjuk & Ketentuan Daftar Ulang:')}
                              style={{ fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}
                            />
                            <Editable
                              {...bind('petunjuk_daftar_ulang', 'Petunjuk & ketentuan daftar ulang...')}
                              style={{ whiteSpace: 'pre-line', textAlign: 'justify' }}
                            />
                          </div>
                        )}

                        <Editable
                          {...bind('teks_penutup', 'Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.')}
                          style={{ textAlign: 'justify', margin: '0 0 10px' }}
                        />

                        <div style={{ width: '100%', marginTop: 28 }}>
                          <div style={{ width: 234, marginLeft: 'auto', textAlign: 'center' }}>
                            <div style={{ margin: '0 0 2px' }}>
                              <Editable
                                {...bind('kota_penetapan', 'Kota')}
                                style={{ display: 'inline-block', minWidth: 60 }}
                              />
                              , {SAMPLE.tanggal_penetapan}
                            </div>
                            <Editable
                              {...bind('jabatan_penandatangan', 'Jabatan penandatangan')}
                              style={{ margin: '0 0 2px' }}
                            />
                            <div style={{ height: 83 }} />
                            <Editable
                              {...bind('nama_penandatangan', 'Nama penandatangan')}
                              style={{ fontWeight: 700, textDecoration: 'underline', margin: 0 }}
                            />
                            <div style={{ fontSize: 13.3, margin: '1px 0 0' }}>
                              NIP/NIDN:{' '}
                              <Editable {...bind('nip_penandatangan', '-')} style={{ display: 'inline-block' }} />
                            </div>
                          </div>
                        </div>

                        <Editable
                          {...bind('catatan_kaki', 'Catatan kaki dokumen...')}
                          style={{
                            marginTop: 22,
                            borderTop: '1px solid #000',
                            paddingTop: 5,
                            fontSize: 11.3,
                            textAlign: 'center',
                            lineHeight: 1.4,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/spmb/master/template-surat')}
          >
            Batal
          </Button>
          <Button
            type="submit"
            loading={loading}
            icon={<Save size={16} />}
            style={{ backgroundColor: 'var(--module-primary)' }}
          >
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </div>
  );
}
