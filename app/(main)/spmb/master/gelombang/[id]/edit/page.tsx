'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Info, 
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { spmbService } from '@/services/spmb.service';
import { GelombangPenerimaan } from '@/types/spmb.types';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { PeriodeTanggalInput } from '@/components/spmb/PeriodeTanggalInput';

// ============================================================
// VALIDATION SCHEMA (MANDATORY ZOD STANDARD)
// ============================================================
const gelombangFormSchema = z.object({
  nama: z.string().min(1, 'Nama gelombang wajib diisi').max(255, 'Nama gelombang maksimal 255 karakter'),
  jalur_masuk_id: z.number().min(1, 'Jalur masuk wajib dipilih'),
  biaya_pendaftaran: z.number().min(0, 'Biaya pendaftaran minimal 0').optional(),
  potongan_biaya_daftar_ulang: z.number().min(0, 'Potongan biaya daftar ulang minimal 0').max(100, 'Potongan biaya daftar ulang maksimal 100').optional(),
  kuota_total: z.number().min(1, 'Kuota pendaftar minimal 1'),
  tanggal_buka: z.string().regex(/^\d{2}-\d{2}$/, 'Periode buka pendaftaran wajib diisi'),
  tanggal_tutup: z.string().regex(/^\d{2}-\d{2}$/, 'Periode tutup pendaftaran wajib diisi'),
  tanggal_pengumuman: z.string().optional().nullable(),
  status: z.enum(['draft', 'aktif', 'ditutup', 'selesai']),
});

type GelombangFormValues = z.infer<typeof gelombangFormSchema>;

// ============================================================
// MOLECULES: SECTION HEADER
// ============================================================
function SectionHeader({ title, description, icon: Icon }: { title: string; description: string; icon: any }) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
      <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 border border-primary-100 shadow-2xs">
        <Icon size={20} />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 text-base md:text-lg tracking-tight">{title}</h3>
        <p className="text-xs text-slate-500 font-medium">{description}</p>
      </div>
    </div>
  );
}

// ============================================================
// MOLECULES: STATUS HELPER ALERT
// ============================================================
function StatusAlert({ status }: { status?: string }) {
  if (status === 'aktif') {
    return (
      <div className="p-3.5 bg-emerald-50 border border-emerald-200/90 rounded-xl flex items-start gap-2.5 text-emerald-900 text-xs font-semibold animate-fade-in shadow-2xs">
        <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-emerald-950">Jadwal Aktif (Otomatis)</span>
          <span>Backend membuka pendaftaran saat tanggal saat ini masuk ke periode tahunan yang disetel.</span>
        </div>
      </div>
    );
  }
  if (status === 'draft') {
    return (
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-slate-700 text-xs font-semibold animate-fade-in shadow-2xs">
        <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-slate-900">Status: Draft (Belum Dipublikasikan)</span>
          <span>Gelombang ini masih dalam tahap perancangan dan belum dapat didaftar oleh calon mahasiswa.</span>
        </div>
      </div>
    );
  }
  if (status === 'ditutup') {
    return (
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs font-semibold animate-fade-in shadow-2xs">
        <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-amber-950">Status: Ditutup (Pendaftaran Berakhir)</span>
          <span>Gelombang ini telah ditutup. Calon mahasiswa baru tidak dapat lagi melakukan registrasi di gelombang ini.</span>
        </div>
      </div>
    );
  }
  if (status === 'selesai') {
    return (
      <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-2.5 text-indigo-900 text-xs font-semibold animate-fade-in shadow-2xs">
        <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-indigo-950">Status: Selesai (Sudah Pengumuman)</span>
          <span>Seluruh proses pendaftaran dan seleksi pada gelombang ini telah selesai dilaksanakan.</span>
        </div>
      </div>
    );
  }
  return null;
}

// ============================================================
// MAIN PAGE COMPONENT (EDIT GELOMBANG SPMB)
// ============================================================
export default function EditGelombangPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const id = Number(resolvedParams.id);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Selected Option States for AsyncSelects to ensure instant label display
  const [selectedJalur, setSelectedJalur] = useState<any>(null);

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<GelombangFormValues>({
    resolver: zodResolver(gelombangFormSchema) as any,
    defaultValues: {
      nama: '',
      kuota_total: 100,
      status: 'draft',
      biaya_pendaftaran: 0,
      potongan_biaya_daftar_ulang: 0,
      tanggal_buka: '',
      tanggal_tutup: '',
      tanggal_pengumuman: '',
    }
  });

  const selectedStatus = watch('status');
  const loadJalurMasuk = useCallback(async (input: string) => {
    try {
      const res = await spmbService.getJalurMasuk();
      const list = res?.data || [];
      return list
        .filter((j: any) => j.is_active && (j.nama || '').toLowerCase().includes(input.toLowerCase()))
        .map((j: any) => ({
          value: j.id,
          label: j.nama,
          ...j
        }));
    } catch {
      return [];
    }
  }, []);

  // Load Existing Gelombang Detail
  useEffect(() => {
    if (!id) return;
    
    const fetchDetail = async () => {
      try {
        setFetching(true);
        const res = await spmbService.getGelombangById(id);
        const row = res.data;
        const rowNominal = Math.round(Number(row.biaya_pendaftaran || 0));

        if (row.jalur_masuk) {
          setSelectedJalur({
            value: row.jalur_masuk.id,
            label: row.jalur_masuk.nama,
            ...row.jalur_masuk
          });
        } else if (row.jalur_masuk_id) {
          setSelectedJalur({
            value: row.jalur_masuk_id,
            label: `Jalur Masuk #${row.jalur_masuk_id}`
          });
        }

        reset({
          nama: row.nama,
          jalur_masuk_id: row.jalur_masuk_id ? Number(row.jalur_masuk_id) : undefined,
          biaya_pendaftaran: rowNominal,
          potongan_biaya_daftar_ulang: Number(row.potongan_biaya_daftar_ulang || 0),
          kuota_total: row.kuota_total,
          status: row.status,
          tanggal_buka: row.tanggal_buka || '',
          tanggal_tutup: row.tanggal_tutup || '',
          tanggal_pengumuman: row.tanggal_pengumuman ? new Date(row.tanggal_pengumuman).toISOString().split('T')[0] : '',
        });
      } catch (error: any) {
        toast.error('Gagal memuat data gelombang');
        router.push('/spmb/master/gelombang');
      } finally {
        setFetching(false);
      }
    };
    
    fetchDetail();
  }, [id, reset, router]);

  // Submit Handler
  const onSubmit = async (data: Partial<GelombangPenerimaan>) => {
    try {
      setLoading(true);
      const payload = {
        ...data,
        jalur_masuk_id: Number(data.jalur_masuk_id),
        biaya_pendaftaran: data.biaya_pendaftaran !== undefined ? Number(data.biaya_pendaftaran) : undefined,
        potongan_biaya_daftar_ulang: data.potongan_biaya_daftar_ulang !== undefined ? Number(data.potongan_biaya_daftar_ulang) : undefined,
      };
      await spmbService.updateGelombang(id, payload as any);
      toast.success('Konfigurasi Gelombang berhasil diperbarui');
      router.push('/spmb/master/gelombang');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan data gelombang');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="space-y-6 py-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-xl w-64"></div>
        <div className="card p-6 bg-white border border-slate-200 rounded-xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="h-12 bg-slate-100 rounded-lg"></div>
            <div className="h-12 bg-slate-100 rounded-lg"></div>
            <div className="h-12 bg-slate-100 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Edit Gelombang"
        description="Perbarui informasi, biaya, status, dan jadwal gelombang pendaftaran SPMB."
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
            {/* GRID LAYOUT MAKS 3 KOLOM */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Controller
                  name="jalur_masuk_id"
                  control={control}
                  render={({ field }) => (
                    <AsyncSelect
                      label="Jalur Masuk"
                      required
                      placeholder="Pilih Jalur Masuk..."
                      loadOptions={loadJalurMasuk}
                      defaultOptions
                      value={selectedJalur ?? field.value}
                      onChange={(opt: any) => {
                        setSelectedJalur(opt);
                        field.onChange(opt ? Number(opt.value) : undefined);
                      }}
                      error={errors.jalur_masuk_id?.message}
                      hint="Jalur penerimaan yang dinaungi."
                    />
                  )}
                />
              </div>

              <div>
                <Input 
                  label="Nama Gelombang"
                  placeholder="Contoh: Gelombang 1 - Prestasi"
                  required
                  error={errors.nama?.message}
                  {...register('nama')} 
                />
              </div>

              <div>
                <Input 
                  type="number"
                  label="Kuota Pendaftar"
                  placeholder="100"
                  required
                  hint="Jumlah maksimal kuota pendaftar."
                  error={errors.kuota_total?.message}
                  {...register('kuota_total', { valueAsNumber: true })} 
                />
              </div>

              <div>
                <Input 
                  type="number"
                  label="Biaya Pendaftaran (Rp)"
                  placeholder="0"
                  hint="Nominal biaya pendaftaran gelombang ini."
                  error={errors.biaya_pendaftaran?.message}
                  {...register('biaya_pendaftaran', { valueAsNumber: true })} 
                />
              </div>

              <div>
                <Input 
                  type="number"
                  label="Potongan Biaya Daftar Ulang (%)"
                  placeholder="0"
                  min={0}
                  max={100}
                  hint="Persentase potongan biaya daftar ulang (0-100%)."
                  error={errors.potongan_biaya_daftar_ulang?.message}
                  {...register('potongan_biaya_daftar_ulang', { valueAsNumber: true })} 
                />
              </div>

              <div>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Status Gelombang"
                      required
                      options={[
                        { value: 'draft', label: 'Draft (Belum Dipublikasikan)' },
                        { value: 'aktif', label: 'Aktifkan Jadwal (Dibuka Otomatis pada Periode)' },
                        { value: 'ditutup', label: 'Ditutup (Pendaftaran Berakhir)' },
                        { value: 'selesai', label: 'Selesai (Sudah Pengumuman)' }
                      ]}
                      value={field.value}
                      onChange={field.onChange}
                      hint="Jadwal aktif akan membuka pendaftaran otomatis sesuai tanggal dan bulan yang dipilih."
                      error={errors.status?.message}
                    />
                  )}
                />
              </div>

              <div>
                <Controller
                  name="tanggal_buka"
                  control={control}
                  render={({ field }) => (
                    <PeriodeTanggalInput
                      label="Periode Buka Pendaftaran"
                      required
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.tanggal_buka?.message}
                    />
                  )}
                />
              </div>

              <div>
                <Controller
                  name="tanggal_tutup"
                  control={control}
                  render={({ field }) => (
                    <PeriodeTanggalInput
                      label="Periode Tutup Pendaftaran"
                      required
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.tanggal_tutup?.message}
                    />
                  )}
                />
              </div>

              <div>
                <Input 
                  type="date"
                  label="Tanggal Pengumuman"
                  hint="Opsional, jadwal pengumuman kelulusan."
                  error={errors.tanggal_pengumuman?.message}
                  {...register('tanggal_pengumuman')} 
                />
              </div>
            </div>

            <div className="mt-4">
              <StatusAlert status={selectedStatus} />
            </div>

            {/* ACTION AREA */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                disabled={loading}
              >
                Batal
              </Button>
              
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={loading}
                icon={<Save size={16} />}
              >
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
