'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { ProdiForm, type ProdiFormValues } from '@/components/siakad/ProdiForm';
import { siakadService } from '@/services/siakad.service';
import toast from 'react-hot-toast';

export default function EditProdiPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const [fakultas, setFakultas] = useState<any[]>([]);
  const [initial, setInitial] = useState<(Partial<ProdiFormValues> & { kaprodiOption?: { value: number; label: string } | null }) | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [fRes, pRes] = await Promise.all([
          siakadService.getFakultas(),
          siakadService.getProdiById(id),
        ]);
        if (fRes.data) setFakultas(fRes.data);
        const item = pRes.data;
        if (!item) {
          toast.error('Program studi tidak ditemukan');
          router.push('/siakad/master/fakultas');
          return;
        }
        setInitial({
          fakultas_id: item.fakultas_id ?? null,
          kaprodi_id: item.kaprodi_id || null,
          kode_prodi: item.kode_prodi,
          kode_prodi_dikti: item.kode_prodi_dikti || '',
          nama: item.nama,
          jenjang: item.jenjang || '',
          akreditasi: item.akreditasi || '',
          kaprodiOption: item.kaprodi
            ? { value: item.kaprodi.id, label: `${item.kaprodi.nama_lengkap} — NIDN ${item.kaprodi.nidn || '-'}` }
            : null,
        });
      } catch {
        toast.error('Gagal memuat data program studi');
      }
    };
    load();
  }, [id, router]);

  const handleSubmit = async (values: ProdiFormValues) => {
    try {
      await siakadService.updateProdi(id, values);
      toast.success('Program studi berhasil diperbarui');
      router.push('/siakad/master/fakultas');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan program studi');
      throw err;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Edit Program Studi"
        description="Perbarui identitas, kepemimpinan, dan status akreditasi program studi."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Fakultas & Prodi', href: '/siakad/master/fakultas' },
          { label: 'Edit Prodi' },
        ]}
        action={
          <Button
            variant="outline"
            icon={<ArrowLeft size={16} />}
            onClick={() => router.push('/siakad/master/fakultas')}
            style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
          >
            Kembali
          </Button>
        }
      />

      <Card>
        <CardBody>
          <div className="flex items-start gap-3 pb-4 border-b border-slate-100 mb-4">
            <span
              className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
              style={{ background: 'var(--module-primary-subtle)', color: 'var(--module-primary)' }}
            >
              <GraduationCap size={16} />
            </span>
            <div>
              <p className="text-xs font-extrabold text-slate-900">Identitas, Kepemimpinan & Akreditasi</p>
              <p className="text-xs text-slate-500 mt-0.5">Kode tidak dapat diubah. Fakultas induk boleh dibiarkan kosong jika belum dipetakan.</p>
            </div>
          </div>
          {initial ? (
            <ProdiForm
              key={id}
              isEditing
              fakultasOptions={fakultas.map((f) => ({ value: f.id, label: `${f.kode} — ${f.nama}` }))}
              defaultValues={initial}
              onSubmit={handleSubmit}
              onCancel={() => router.push('/siakad/master/fakultas')}
              submitLabel="Simpan Perubahan"
            />
          ) : (
            <div className="h-40 rounded-xl bg-slate-100 animate-pulse" />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
