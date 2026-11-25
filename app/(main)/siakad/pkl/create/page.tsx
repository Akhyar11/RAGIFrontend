'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Send } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { siakadService } from '@/services/siakad.service';
import {
  PklSubmissionSchema,
  type PklSubmissionFormValues,
} from '@/lib/validations/siakad-pipeline.schema';
import { JENIS_PKL_OPTIONS } from '@/lib/constants/siakad.constant';
import toast from 'react-hot-toast';

export default function CreatePklPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PklSubmissionFormValues>({
    resolver: zodResolver(PklSubmissionSchema),
    defaultValues: {
      jenis: 'pkl_reguler',
      tahun_akademik_id: undefined,
      instansi_nama: '',
      instansi_alamat: '',
      instansi_kota: '',
      pembimbing_lapangan_nama: '',
      pembimbing_lapangan_kontak: '',
      pembimbing_lapangan_jabatan: '',
      tanggal_mulai: '',
      tanggal_selesai: '',
    },
  });

  const loadTahunAkademikOptions = useCallback(async (keyword: string) => {
    try {
      const res = await siakadService.getTahunAkademiks({
        search: keyword || undefined,
        per_page: 30,
      });
      const list: any[] = Array.isArray(res.data) ? res.data : res.data?.items || [];
      return list.map((ta) => ({
        value: Number(ta.id),
        label: `${ta.nama || ta.kode} ${ta.is_active ? '• (Aktif)' : ''}`.trim(),
      }));
    } catch {
      return [];
    }
  }, []);

  const onSubmit = async (values: PklSubmissionFormValues) => {
    try {
      setSubmitting(true);
      const res = await siakadService.submitPkl(values);
      toast.success(res?.message || 'Pengajuan PKL berhasil dikirimkan');
      router.push('/siakad/pkl');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengajukan PKL');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengajuan PKL / Magang Baru"
        description="Formulir permohonan pelaksanaan Praktek Kerja Lapangan (PKL) atau Magang Industri mahasiswa."
        backUrl="/siakad/pkl"
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Praktek Lapangan', href: '/siakad/pkl' },
          { label: 'Pengajuan Baru' },
        ]}
      />

      <Card>
        <CardHeader className="p-4 border-b border-slate-200">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Informasi Instansi & Periode Magang
          </h2>
          <p className="text-2xs text-slate-500">
            Lengkapi data instansi dan pembimbing lapangan tempat Anda melaksanakan magang.
          </p>
        </CardHeader>
        <CardBody className="p-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Controller
                name="jenis"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Jenis Program PKL"
                    options={JENIS_PKL_OPTIONS.filter((o) => o.value !== 'ALL')}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.jenis?.message}
                  />
                )}
              />
              <Controller
                name="tahun_akademik_id"
                control={control}
                render={({ field }) => (
                  <AsyncSelect
                    label="Tahun Akademik"
                    placeholder="Pilih Tahun Akademik..."
                    loadOptions={loadTahunAkademikOptions}
                    value={field.value}
                    onChange={(val) => field.onChange(val ? Number(val) : undefined)}
                    error={errors.tahun_akademik_id?.message}
                    defaultOptions
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nama Perusahaan / Instansi"
                placeholder="PT. Telekomunikasi Indonesia"
                {...register('instansi_nama')}
                error={errors.instansi_nama?.message}
              />
              <Input
                label="Kota Instansi"
                placeholder="Jakarta Pusat"
                {...register('instansi_kota')}
                error={errors.instansi_kota?.message}
              />
            </div>

            <Input
              label="Alamat Lengkap Instansi"
              placeholder="Jl. Jend. Sudirman Kav. 52..."
              {...register('instansi_alamat')}
              error={errors.instansi_alamat?.message}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Pembimbing Lapangan"
                placeholder="Nama mentor kantor"
                {...register('pembimbing_lapangan_nama')}
                error={errors.pembimbing_lapangan_nama?.message}
              />
              <Input
                label="Kontak Pembimbing"
                placeholder="08123456789"
                {...register('pembimbing_lapangan_kontak')}
                error={errors.pembimbing_lapangan_kontak?.message}
              />
              <Input
                label="Jabatan Pembimbing"
                placeholder="Senior Software Engineer"
                {...register('pembimbing_lapangan_jabatan')}
                error={errors.pembimbing_lapangan_jabatan?.message}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Tanggal Mulai"
                type="date"
                {...register('tanggal_mulai')}
                error={errors.tanggal_mulai?.message}
              />
              <Input
                label="Tanggal Selesai"
                type="date"
                {...register('tanggal_selesai')}
                error={errors.tanggal_selesai?.message}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/siakad/pkl')}
                className="text-xs font-semibold"
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={submitting}
                icon={<Send size={14} />}
                className="text-xs font-bold"
              >
                Kirim Pengajuan
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}