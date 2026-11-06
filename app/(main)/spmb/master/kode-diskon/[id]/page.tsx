'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatRupiah } from '@/lib/utils';
import { spmbService } from '@/services/spmb.service';
import type { SpmbKodeDiskon } from '@/types/spmb.types';

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-2xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="text-xs font-semibold text-slate-800">{children}</div>
    </div>
  );
}

export default function DetailKodeDiskonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  const id = Number(rawId);
  const router = useRouter();
  const [kodeDiskon, setKodeDiskon] = useState<SpmbKodeDiskon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await spmbService.getKodeDiskon(id);
        setKodeDiskon(response.data);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Gagal memuat detail kode diskon.';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    if (Number.isFinite(id) && id > 0) load();
    else setLoading(false);
  }, [id]);

  const goBack = () => router.push('/spmb/master/kode-diskon');

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-1/3 rounded bg-slate-200" />
        <div className="card h-64 bg-slate-100" />
      </div>
    );
  }

  if (!kodeDiskon) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Detail Kode Diskon"
          description="Kode diskon tidak ditemukan."
          action={(
            <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={goBack} style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}>
              Kembali
            </Button>
          )}
        />
        <div className="card p-6 text-center text-sm text-slate-500">Data kode diskon tidak ditemukan atau telah dihapus.</div>
      </div>
    );
  }

  const usageCount = Number(kodeDiskon.penggunaan_count || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Detail Kode Diskon ${kodeDiskon.kode}`}
        description="Informasi nilai diskon, kuota klaim, dan masa berlaku."
        action={(
          <div className="flex gap-2">
            <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={goBack} style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}>
              Kembali
            </Button>
            <Button icon={<Edit size={16} />} onClick={() => router.push(`/spmb/master/kode-diskon/${kodeDiskon.id}/edit`)} style={{ backgroundColor: 'var(--module-primary)' }}>
              Edit Kode
            </Button>
          </div>
        )}
      />

      <div className="card p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <p className="font-mono text-xs font-bold text-slate-900">{kodeDiskon.kode}</p>
            <p className="mt-1 text-xs text-slate-600">{kodeDiskon.nama}</p>
          </div>
          <Badge variant={kodeDiskon.is_active ? 'green' : 'gray'} className="text-2xs">
            {kodeDiskon.is_active ? 'Aktif' : 'Nonaktif'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Jenis Diskon">
            {kodeDiskon.tipe_diskon === 'persen' ? 'Persentase' : 'Nominal'}
          </DetailItem>
          <DetailItem label="Nilai Diskon">
            {kodeDiskon.tipe_diskon === 'persen' ? `${Number(kodeDiskon.nilai)}%` : formatRupiah(Number(kodeDiskon.nilai))}
          </DetailItem>
          <DetailItem label="Batas Potongan">
            {kodeDiskon.maksimum_potongan === null ? 'Tanpa batas' : formatRupiah(Number(kodeDiskon.maksimum_potongan))}
          </DetailItem>
          <DetailItem label="Klaim">
            {kodeDiskon.batas_penggunaan === null ? `${usageCount} klaim tanpa batas kuota` : `${usageCount} dari ${kodeDiskon.batas_penggunaan} klaim`}
          </DetailItem>
          <DetailItem label="Berlaku Mulai">
            {kodeDiskon.berlaku_mulai?.slice(0, 10) || 'Tanpa tanggal mulai'}
          </DetailItem>
          <DetailItem label="Berlaku Sampai">
            {kodeDiskon.berlaku_sampai?.slice(0, 10) || 'Tanpa tanggal akhir'}
          </DetailItem>
          <DetailItem label="Dibuat">
            {kodeDiskon.created_at?.slice(0, 10) || '-'}
          </DetailItem>
          <DetailItem label="Terakhir Diperbarui">
            {kodeDiskon.updated_at?.slice(0, 10) || '-'}
          </DetailItem>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
          Diskon diterapkan pada komponen biaya SPMB yang ditandai sebagai beban pendaftaran. Kuota klaim dihitung saat kode diterapkan ke tagihan pendaftaran.
        </div>
      </div>
    </div>
  );
}
