'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, FlaskConical, ShieldAlert, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { sippmService } from '@/services/sippm.service';
import { useAuth } from '@/hooks/useAuth';

const editSchema = z.object({
  judul: z.string().min(10, 'Judul proposal minimal 10 karakter'),
  rumpun_ilmu: z.string().min(3, 'Rumpun ilmu wajib diisi'),
  dana_diusulkan: z.number().min(1000000, 'Dana diusulkan minimal Rp 1.000.000'),
  abstrak: z.string().min(50, 'Abstrak proposal minimal 50 karakter'),
});

type EditFormValues = z.infer<typeof editSchema>;

export default function EditProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { hasPermission } = useAuth();

  // Pure RBAC check (per rbac-refactoring-standard)
  const canEdit = hasPermission('sippm.proposal.create') || hasPermission('sippm.proposal.manage');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema) as any,
  });

  useEffect(() => {
    if (!canEdit) return;
    const fetchProposal = async () => {
      try {
        setLoading(true);
        const res = await sippmService.getProposalDetail(Number(resolvedParams.id));
        if (res.data) {
          setValue('judul', res.data.judul);
          setValue('rumpun_ilmu', res.data.rumpun_ilmu);
          setValue('dana_diusulkan', res.data.dana_diusulkan ?? res.data.anggaran_diajukan ?? 0);
          setValue('abstrak', res.data.abstrak);
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Gagal memuat data proposal');
      } finally {
        setLoading(false);
      }
    };
    fetchProposal();
  }, [canEdit, resolvedParams.id, setValue]);

  const onSubmit = async (data: EditFormValues) => {
    try {
      setSubmitting(true);
      await sippmService.updateProposal(Number(resolvedParams.id), data);
      toast.success('Proposal berhasil diperbarui');
      router.push(`/sippm/proposal/${resolvedParams.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memperbarui proposal');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader
          title="Edit Proposal Usulan"
          description="Perbarui rincian usulan proposal riset atau pengabdian masyarakat"
          action={
            <Button variant="outline" size="sm" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>
              Kembali
            </Button>
          }
        />
        <div className="card p-6 text-center">
          <ShieldAlert size={56} className="mx-auto mb-4 opacity-40 text-rose-500" />
          <h2 className="text-xl font-bold mb-2">Akses Ditolak / Dibatasi</h2>
          <p className="max-w-[500px] mx-auto opacity-70">
            Peran Anda saat ini tidak memiliki permission untuk mengedit proposal SIPPM.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6 max-w-5xl mx-auto pb-12">
        <PageHeader
          title="Edit Proposal Usulan"
          description="Memuat data proposal..."
          action={
            <Button variant="outline" size="sm" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>
              Kembali
            </Button>
          }
        />
        <div className="card p-12 text-center text-slate-400">
          Memuat data proposal...
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Edit Proposal Usulan"
        description="Perbarui rincian usulan proposal riset atau pengabdian masyarakat."
        action={
          <Button variant="outline" size="sm" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>
            Kembali
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card">
          <div className="card-header border-b px-6 py-4">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <FlaskConical size={18} className="text-primary-600" /> Form Perubahan Data Proposal
            </h2>
          </div>
          <div className="card-body p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Input
                  label="Judul Proposal"
                  required
                  placeholder="Judul proposal usulan..."
                  error={errors.judul?.message}
                  {...register('judul')}
                />
              </div>

              <Input
                label="Rumpun Ilmu"
                required
                placeholder="Rumpun ilmu..."
                error={errors.rumpun_ilmu?.message}
                {...register('rumpun_ilmu')}
              />

              <Input
                label="Dana Diusulkan (Rp)"
                type="number"
                required
                placeholder="Dana diusulkan..."
                error={errors.dana_diusulkan?.message}
                {...register('dana_diusulkan', { valueAsNumber: true })}
              />

              <div className="col-span-full">
                <Textarea
                  label="Abstrak Proposal"
                  required
                  rows={6}
                  placeholder="Tuliskan latar belakang masalah, urgensi riset/pengabdian, metode, serta target luaran..."
                  error={errors.abstrak?.message}
                  {...register('abstrak')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Batal
          </Button>
          <Button
            type="submit"
            isLoading={submitting}
            icon={<Save size={18} />}
          >
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </div>
  );
}
