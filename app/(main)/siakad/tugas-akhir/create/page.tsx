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
import { Textarea } from '@/components/ui/Textarea';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { siakadService } from '@/services/siakad.service';
import {
  TugasAkhirProposalSchema,
  type TugasAkhirProposalFormValues,
} from '@/lib/validations/siakad-pipeline.schema';
import toast from 'react-hot-toast';

export default function CreateTugasAkhirPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TugasAkhirProposalFormValues>({
    resolver: zodResolver(TugasAkhirProposalSchema),
    defaultValues: {
      tahun_akademik_id: undefined,
      judul_utama: '',
      judul_inggris: '',
      bidang_kajian: '',
      abstrak: '',
      usulan_pembimbing_1_id: undefined,
      usulan_pembimbing_2_id: undefined,
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

  const loadDosenOptions = useCallback(async (keyword: string) => {
    try {
      const res = await siakadService.getDosens({
        search: keyword || undefined,
        per_page: 50,
      });
      const list: any[] = Array.isArray(res.data) ? res.data : res.data?.items || [];
      return list.map((d: any) => ({
        value: Number(d.id),
        label: `${d.nama_lengkap || d.nama || 'Dosen'}${d.nip ? ` (${d.nip})` : ''}`,
      }));
    } catch {
      return [];
    }
  }, []);

  const onSubmit = async (values: TugasAkhirProposalFormValues) => {
    try {
      setSubmitting(true);
      const res = await siakadService.submitTugasAkhir(values);
      toast.success(res?.message || 'Proposal Tugas Akhir berhasil diajukan');
      router.push('/siakad/tugas-akhir');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengajukan proposal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengajuan Proposal Tugas Akhir"
        description="Formulir permohonan judul dan rancangan proposal Skripsi / Tugas Akhir mahasiswa."
        backUrl="/siakad/tugas-akhir"
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Tugas Akhir', href: '/siakad/tugas-akhir' },
          { label: 'Pengajuan Proposal' },
        ]}
      />

      <Card>
        <CardHeader className="p-4 border-b border-slate-200">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Informasi Judul & Rancangan Penelitian
          </h2>
          <p className="text-2xs text-slate-500">
            Pastikan judul orisinal, relevan dengan profil lulusan, dan memenuhi prasyarat SKS tempuh.
          </p>
        </CardHeader>
        <CardBody className="p-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Input
                label="Bidang Kajian / Peminatan"
                placeholder="Rekayasa Perangkat Lunak, Data Science, Jaringan"
                {...register('bidang_kajian')}
                error={errors.bidang_kajian?.message}
              />
            </div>

            <Input
              label="Judul Utama Skripsi (Bahasa Indonesia)"
              placeholder="Perancangan Sistem Informasi Akademik Berbasis Microservices..."
              {...register('judul_utama')}
              error={errors.judul_utama?.message}
            />

            <Input
              label="Judul Skripsi (Bahasa Inggris - Opsional)"
              placeholder="Design and Implementation of Academic Information System..."
              {...register('judul_inggris')}
              error={errors.judul_inggris?.message}
            />

            <Textarea
              label="Abstrak & Latar Belakang Masalah"
              placeholder="Uraikan latar belakang masalah, tujuan penelitian, metodologi yang digunakan, dan target luaran minimal 50 karakter..."
              {...register('abstrak')}
              error={errors.abstrak?.message}
              rows={5}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Controller
                name="usulan_pembimbing_1_id"
                control={control}
                render={({ field }) => (
                  <AsyncSelect
                    label="Usulan Dosen Pembimbing 1"
                    placeholder="Cari dosen pembimbing 1..."
                    loadOptions={loadDosenOptions}
                    value={field.value}
                    onChange={(val) => field.onChange(val ? Number(val) : undefined)}
                    error={errors.usulan_pembimbing_1_id?.message}
                    defaultOptions
                  />
                )}
              />
              <Controller
                name="usulan_pembimbing_2_id"
                control={control}
                render={({ field }) => (
                  <AsyncSelect
                    label="Usulan Dosen Pembimbing 2 (Opsional)"
                    placeholder="Cari dosen pembimbing 2..."
                    loadOptions={loadDosenOptions}
                    value={field.value}
                    onChange={(val) => field.onChange(val ? Number(val) : undefined)}
                    error={errors.usulan_pembimbing_2_id?.message}
                    defaultOptions
                  />
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/siakad/tugas-akhir')}
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
                Kirim Proposal
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}