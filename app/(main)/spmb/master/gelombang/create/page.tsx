'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
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

export default function CreateGelombangPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<GelombangFormValues>({
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

  const onSubmit = async (data: Partial<GelombangPenerimaan>) => {
    try {
      setLoading(true);
      const payload = {
        ...data,
        jalur_masuk_id: Number(data.jalur_masuk_id),
        biaya_pendaftaran: data.biaya_pendaftaran !== undefined ? Number(data.biaya_pendaftaran) : undefined,
        potongan_biaya_daftar_ulang: data.potongan_biaya_daftar_ulang !== undefined ? Number(data.potongan_biaya_daftar_ulang) : undefined,
      };
      await spmbService.createGelombang(payload as any);
      toast.success('Gelombang penerimaan baru berhasil ditambahkan');
      router.push('/spmb/master/gelombang');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan data gelombang');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Tambah Gelombang"
        description="Buat periode gelombang pendaftaran SPMB baru beserta biaya dan jadwalnya."
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
                      value={field.value}
                      onChange={(opt: any) => field.onChange(opt ? Number(opt.value) : undefined)}
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
                Simpan Gelombang
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

