'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { PeriodeSelector } from '@/components/siakad/PeriodeSelector';
import { siakadService } from '@/services/siakad.service';
import toast from 'react-hot-toast';

export default function EksekutifPage() {
  const [selectedTaId, setSelectedTaId] = useState<number | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [sensing, setSensing] = useState<any | null>(null);
  const [krsMon, setKrsMon] = useState<any | null>(null);
  const [kartu, setKartu] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = async (taId?: number) => {
    try {
      setLoading(true);
      const [sumRes, senRes, krsRes, kartuRes] = await Promise.all([
        siakadService.getDashboardSummary(),
        siakadService.getKelulusanSensing(),
        siakadService.getKrsMonitoring({ tahun_akademik_id: taId || undefined }),
        siakadService.getKartuUjianMonitoring({ per_page: 100 }),
      ]);
      setSummary(sumRes.data || null);
      setSensing(senRes.data || null);
      setKrsMon(krsRes.data || null);
      setKartu(kartuRes.data || []);
    } catch {
      toast.error('Gagal memuat monitoring eksekutif');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(selectedTaId || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaId]);

  const prodiRows: any[] = krsMon?.prodi || [];
  const kartuUts = kartu.filter((k: any) => k.tipe_ujian === 'UTS' && k.is_active).length;
  const kartuUas = kartu.filter((k: any) => k.tipe_ujian === 'UAS' && k.is_active).length;

  const prodiColumns: ColumnDef<any>[] = [
    {
      key: 'prodi',
      label: 'PROGRAM STUDI',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{row.nama_prodi}</span>
          <span className="text-2xs text-slate-500">{row.fakultas} • {row.total_mahasiswa_aktif} mhs aktif</span>
        </div>
      ),
    },
    {
      key: 'krs',
      label: 'KRS',
      align: 'center',
      render: (row) => <span className="font-mono font-bold text-xs">{row.persentase_krs}%</span>,
    },
    {
      key: 'setuju',
      label: 'DISETUJUI',
      align: 'center',
      render: (row) => <span className="font-mono font-bold text-xs">{row.persentase_disetujui}%</span>,
    },
    {
      key: 'belum',
      label: 'BELUM KRS',
      align: 'center',
      render: (row) => (
        <Badge variant={row.belum_krs > 0 ? 'amber' : 'green'} className="text-2xs font-bold">
          {row.belum_krs}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring Eksekutif"
        description="Potret KRS, status bermasalah, dan kartu ujian lintas prodi dalam satu layar pimpinan."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Eksekutif' },
        ]}
      />

      <div className="bg-white border rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <PeriodeSelector value={selectedTaId} onChange={(id) => setSelectedTaId(id)} />
        </div>
        <p className="text-2xs text-slate-500">Periode: <strong>{krsMon?.tahun_akademik?.nama || summary?.tahun_akademik_aktif?.nama || '-'}</strong></p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Mhs Aktif" value={summary?.total_mahasiswa_aktif ?? krsMon?.summary?.total_mahasiswa_aktif ?? '-'} />
        <StatCard label="Sudah KRS" value={krsMon?.summary ? `${krsMon.summary.persentase_krs}%` : '-'} footer={krsMon?.summary ? `${krsMon.summary.total_sudah_krs} dari ${krsMon.summary.total_mahasiswa_aktif}` : undefined} />
        <StatCard label="KRS Disetujui" value={krsMon?.summary ? `${krsMon.summary.persentase_disetujui}%` : '-'} />
        <StatCard label="Terkunci Keuangan" value={krsMon?.summary?.total_terkunci_keuangan ?? '-'} />
        <StatCard label="Non-Aktif" value={sensing?.non_aktif ?? '-'} />
        <StatCard label="Cuti" value={sensing?.cuti ?? '-'} />
        <StatCard label="Aktif Tanpa KRS" value={sensing?.aktif_tanpa_krs_TA_aktif ?? krsMon?.summary?.total_belum_krs ?? '-'} />
        <StatCard label="Kartu UTS Terbit" value={kartuUts} />
        <StatCard label="Kartu UAS Terbit" value={kartuUas} />
      </div>

      <div className="bg-white border rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Serapan KRS per Program Studi</h3>
        <DataTable columns={prodiColumns} data={prodiRows} isLoading={loading} emptyMessage="Belum ada data monitoring periode ini." />
      </div>
    </div>
  );
}
