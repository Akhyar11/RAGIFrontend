'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { siakadService } from '@/services/siakad.service';
import { formatTahunAkademikLabel } from '@/lib/obe-settings';
import { KRS_STATUS_BADGE } from '../_components/KrsAdminList';

// Mata kuliah satu baris KRS: historis (hasil sync PDDIKTI) memakai mata_kuliah
// langsung; KRS lama memakai kelas jadwal.
const mataKuliahOf = (d: any) => d?.mata_kuliah || d?.kelas?.mata_kuliah || null;

export default function KrsDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [krs, setKrs] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await siakadService.getKrs({ id: params.id, per_page: 1 });
      const item = Array.isArray(res?.data) ? res.data[0] : null;
      if (!item) toast.error('KRS tidak ditemukan');
      setKrs(item || null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memuat detail KRS');
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const details: any[] = krs?.krs_details || [];
  const statusMeta = KRS_STATUS_BADGE[krs?.status] || { label: krs?.status || '-', variant: 'gray' as const };

  const columns: ColumnDef<any>[] = [
    {
      key: 'no',
      label: 'NO',
      align: 'center',
      render: (_row, index) => <span className="font-bold text-slate-400 text-xs">{index + 1}</span>,
    },
    {
      key: 'mata_kuliah',
      label: 'MATA KULIAH',
      render: (row) => {
        const mk = mataKuliahOf(row);
        return (
          <div>
            <span className="font-bold text-slate-900 block text-xs">{mk?.nama || '-'}</span>
            <span className="font-mono text-2xs text-slate-500">{mk?.kode_mk || '-'}</span>
          </div>
        );
      },
    },
    {
      key: 'rombel',
      label: 'KELAS / ROMBEL',
      render: (row) => (
        <span className="text-xs text-slate-700">
          {row.master_kelas?.nama_kelas || row.kelas?.nama_kelas || '-'}
        </span>
      ),
    },
    {
      key: 'sks',
      label: 'SKS',
      align: 'center',
      render: (row) => {
        const mk = mataKuliahOf(row);
        return <span className="font-mono font-bold text-xs">{mk?.total_sks ?? mk?.sks ?? '-'}</span>;
      },
    },
    {
      key: 'status',
      label: 'STATUS',
      align: 'center',
      render: (row) => {
        const s = KRS_STATUS_BADGE[row.status] || KRS_STATUS_BADGE[krs?.status] || { label: row.status || '-', variant: 'gray' as const };
        return (
          <Badge variant={s.variant} className="text-2xs font-semibold">
            {s.label}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detail KRS Mahasiswa"
        description="Rincian mata kuliah pada kartu rencana studi mahasiswa untuk satu periode."
        breadcrumbs={[
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'KRS', href: '/siakad/krs' },
          { label: 'Detail' },
        ]}
        action={
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft size={16} />}
            onClick={() => router.push('/siakad/krs')}
            className="text-xs font-bold border-[var(--module-primary)] text-[var(--module-primary)] hover:bg-[var(--module-primary-subtle)]"
          >
            Kembali
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Mahasiswa</p>
            <p className="text-xs font-bold text-slate-900 mt-1">{krs?.mahasiswa?.nama_lengkap || '-'}</p>
            <span className="font-mono text-2xs text-slate-500">{krs?.mahasiswa?.nim || '-'}</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Program Studi</p>
            <p className="text-xs font-bold text-slate-900 mt-1">{krs?.mahasiswa?.program_studi?.nama || '-'}</p>
            <span className="text-2xs text-slate-500">Angkatan {krs?.mahasiswa?.angkatan || '-'}</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Periode</p>
            <p className="text-xs font-bold text-slate-900 mt-1">{formatTahunAkademikLabel(krs?.tahun_akademik) || '-'}</p>
            <span className="font-mono text-2xs text-slate-500">{krs?.tahun_akademik?.kode || ''}</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">SKS & Status</p>
            <p className="text-xs font-black text-slate-900 mt-1 font-mono">
              {krs?.total_sks_diambil ?? 0} <span className="text-2xs font-normal text-slate-500">SKS</span>
            </p>
            <Badge variant={statusMeta.variant} className="text-2xs font-semibold">
              {statusMeta.label}
            </Badge>
          </CardBody>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={details}
        isLoading={isLoading}
        emptyMessage="KRS ini belum memiliki mata kuliah."
      />
    </div>
  );
}
