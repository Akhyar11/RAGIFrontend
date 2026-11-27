'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { spmbService } from '@/services/spmb.service';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  kode: z.string().min(1, 'Kode jalur wajib diisi'),
  nama: z.string().min(1, 'Nama jalur wajib diisi'),
  deskripsi: z.string().optional().nullable(),
  ada_wawancara: z.boolean(),
  pilih_perguruan_tinggi: z.boolean(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function EditJalurPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      is_active: true,
      ada_wawancara: false,
      pilih_perguruan_tinggi: false
    }
  });

  useEffect(() => {
    if (!id) return;
    
    const fetchDetail = async () => {
      try {
        setFetching(true);
        const res = await spmbService.getJalurMasukById(id);
        reset(res.data);
      } catch (error: any) {
        toast.error('Gagal memuat data jalur masuk');
        router.push('/spmb/master/jalur');
      } finally {
        setFetching(false);
      }
    };
    
    fetchDetail();
  }, [id, reset, router]);

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      const payload = {
        ...data,
        deskripsi: data.deskripsi === null ? undefined : data.deskripsi,
      };
      await spmbService.updateJalurMasuk(id, payload as any);
      toast.success('Jalur masuk berhasil diperbarui');
      router.push('/spmb/master/jalur');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Edit Jalur Masuk"
        description="Perbarui informasi data jalur pendaftaran"
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
              <Input 
                label="Kode Jalur"
                placeholder="Misal: REG"
                required
                hint="Kode singkat unik untuk jalur ini."
                error={errors.kode?.message}
                {...register('kode')} 
              />
              
              <div className="md:col-span-1 lg:col-span-2">
                <Input 
                  label="Nama Jalur"
                  placeholder="Misal: Reguler"
                  required
                  hint="Nama lengkap jalur pendaftaran."
                  error={errors.nama?.message}
                  {...register('nama')} 
                />
              </div>
              
              <div className="col-span-full">
                <Textarea 
                  label="Deskripsi Keterangan"
                  placeholder="Penjelasan singkat mengenai jalur ini (opsional)"
                  hint="Opsional, ditampilkan sebagai informasi jalur."
                  error={errors.deskripsi?.message}
                  {...register('deskripsi')} 
                />
              </div>

              <div>
                <Checkbox 
                  label="Membutuhkan Wawancara" 
                  hint="Aktifkan jika pendaftar jalur ini wajib mengikuti wawancara."
                  {...register('ada_wawancara')} 
                />
              </div>

              <div>
                <Checkbox 
                  label="Aktifkan Pilihan Perguruan Tinggi"
                  hint="Jika aktif, form registrasi dan input manual membuka isian perguruan tinggi asal (transfer/alih jenjang). Jika tidak, isian tersebut dinonaktifkan."
                  {...register('pilih_perguruan_tinggi')} 
                />
              </div>

              <div>
                <Checkbox 
                  label="Status Aktif (Jalur ini digunakan)"
                  hint="Jalur aktif dapat dipilih saat pendaftaran."
                  {...register('is_active')} 
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