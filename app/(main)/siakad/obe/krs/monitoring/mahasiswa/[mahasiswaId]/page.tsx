'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { siakadService } from '@/services/siakad.service';
import { formatTahunAkademikLabel } from '@/lib/obe-settings';

const STATUS_KRS: Record<string, { label: string; variant: 'gray' | 'amber' | 'green' | 'blue' }> = {
  draft: { label: 'Draft', variant: 'gray' },
  diajukan: { label: 'Menunggu DPA', variant: 'amber' },
  disetujui: { label: 'Disetujui', variant: 'green' },
  dikunci: { label: 'Dikunci', variant: 'blue' },
};

function RincianKrsMahasiswa() {
  const params = useParams<{ mahasiswaId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const taId = search.get('ta');

  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await siakadService.getKrsMonitoringMahasiswaDetail(params.mahasiswaId, {
        tahun_akademik_id: taId || undefined,
      });
      setData(res?.data || null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memuat rincian KRS mahasiswa');
    } finally {
      setIsLoading(false);
    }
  }, [params.mahasiswaId, taId]);

  useEffect(() => {
    load();
  }, [load]);

  const mhs = data?.mahasiswa;
  const krs = data?.krs;
  const sudah: any[] = data?.sudah_diambil || [];
  const belum: any[] = data?.belum_diambil || [];
  const belumIni = belum.filter((m) => m.jenis === 'semester_ini');
  const tertinggal = belum.filter((m) => m.jenis === 'tertinggal');
  const statusMeta = krs ? STATUS_KRS[krs.status] || { label: krs.status, variant: 'gray' as const } : null;

  const mkColumns = (withJenis: boolean): ColumnDef<any>[] => [
    {
      key: 'mata_kuliah',
      label: 'MATA KULIAH',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{row.nama}</span>
          <span className="font-mono text-2xs text-slate-500">{row.kode_mk}</span>
        </div>
      ),
    },
    {
      key: 'semester',
      label: 'SEMESTER ANJURAN',
      align: 'center',
      render: (row) => <span className="font-mono text-xs">{row.semester_anjuran ?? '-'}</span>,
    },
    {
      key: 'kategori',
      label: 'KATEGORI',
      align: 'center',
      render: (row) => <span className="text-xs text-slate-700">{row.kategori || '-'}</span>,
    },
    {
      key: 'sks',
      label: 'SKS',
      align: 'center',
      render: (row) => <span className="font-mono font-bold text-xs">{row.total_sks}</span>,
    },
    ...(withJenis
      ? [
          {
            key: 'jenis',
            label: 'KETERANGAN',
            align: 'center' as const,
            render: (row: any) =>
              row.jenis === 'semester_ini' ? (
                <Badge variant="amber" className="text-2xs font-semibold">Semester ini</Badge>
              ) : (
                <Badge variant="red" className="text-2xs font-semibold">Tertinggal</Badge>
              ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rincian KRS Mahasiswa"
        description="Mata kuliah yang sudah diambil pada periode ini dan yang belum diambil menurut kurikulum."
        breadcrumbs={[
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Monitoring KRS', href: '/siakad/obe/krs/monitoring' },
          ...(data?.mahasiswa?.program_studi?.id
            ? [{
                label: 'Daftar Mahasiswa',
                href: `/siakad/obe/krs/monitoring/prodi/${data.mahasiswa.program_studi.id}${taId ? `?ta=${taId}` : ''}`,
              }]
            : []),
          { label: 'Rincian' },
        ]}
        action={
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft size={16} />}
            onClick={() => router.back()}
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
            <p className="text-xs font-bold text-slate-900 mt-1">{mhs?.nama_lengkap || '-'}</p>
            <span className="font-mono text-2xs text-slate-500">{mhs?.nim || '-'}</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Program Studi</p>
            <p className="text-xs font-bold text-slate-900 mt-1">{mhs?.program_studi?.nama || '-'}</p>
            <span className="text-2xs text-slate-500">
              Angkatan {mhs?.angkatan || '-'} • Semester {data?.semester_ke ?? '-'}
            </span>
            <span className="text-2xs text-slate-400 block">Dosen wali: {mhs?.dosen_wali || '-'}</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Periode & Status KRS</p>
            <p className="text-xs font-bold text-slate-900 mt-1">
              {formatTahunAkademikLabel(data?.tahun_akademik) || '-'}
            </p>
            {statusMeta ? (
              <Badge variant={statusMeta.variant} className="text-2xs font-semibold">
                {statusMeta.label} • {krs.total_sks_diambil} SKS
              </Badge>
            ) : (
              <Badge variant="red" className="text-2xs font-semibold">Belum mengisi KRS</Badge>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Ringkasan</p>
            <p className="text-2xs text-slate-700 mt-1.5">
              Diambil <strong className="font-mono">{sudah.length}</strong> mata kuliah
            </p>
            <p className="text-2xs text-slate-700">
              Belum diambil semester ini <strong className="font-mono text-amber-600">{belumIni.length}</strong>
            </p>
            <p className="text-2xs text-slate-700">
              Tertinggal <strong className="font-mono text-rose-600">{tertinggal.length}</strong>
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 border-b border-slate-200">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Sudah diambil pada periode ini</h2>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable
            columns={mkColumns(false)}
            data={sudah}
            isLoading={isLoading}
            emptyMessage="Belum ada mata kuliah yang diambil pada periode ini."
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="p-4 border-b border-slate-200">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Belum diambil</h2>
          <p className="text-2xs text-slate-500">
            Perkiraan dari kurikulum program studi: mata kuliah semester berjalan dan semester sebelumnya yang belum
            pernah muncul di KRS mahasiswa ini pada periode mana pun. Mata kuliah setara yang kodenya berbeda dapat
            tampil sebagai tertinggal.
          </p>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable
            columns={mkColumns(true)}
            data={belum}
            isLoading={isLoading}
            emptyMessage="Tidak ada mata kuliah kurikulum yang tertinggal."
          />
        </CardBody>
      </Card>
    </div>
  );
}

export default function RincianKrsMahasiswaPage() {
  return (
    <Suspense fallback={null}>
      <RincianKrsMahasiswa />
    </Suspense>
  );
}
