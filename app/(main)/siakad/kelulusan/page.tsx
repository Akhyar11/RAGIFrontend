'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Filter, GraduationCap, Search, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Drawer } from '@/components/ui/Drawer';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { PeriodeSelector } from '@/components/siakad/PeriodeSelector';
import { siakadService } from '@/services/siakad.service';
import toast from 'react-hot-toast';

export default function KelulusanPage() {
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(undefined);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSortBy, setFilterSortBy] = useState('created_at');
  const [filterSortDir, setFilterSortDir] = useState('desc');
  const [applied, setApplied] = useState<{ search: string; tahun_akademik_id: number | null; sort_by: string; sort_order: string }>({ search: '', tahun_akademik_id: null, sort_by: 'created_at', sort_order: 'desc' });
  const [draftTaId, setDraftTaId] = useState<number | null>(null);

  const [sensing, setSensing] = useState<any | null>(null);

  const [cekMhsId, setCekMhsId] = useState<number | null>(null);
  const [cekHasil, setCekHasil] = useState<any | null>(null);
  const [checking, setChecking] = useState(false);



  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await siakadService.getKelulusanList({ search: applied.search || undefined, tahun_akademik_id: applied.tahun_akademik_id || undefined, sort_by: applied.sort_by || undefined, sort_order: applied.sort_order || undefined, page, per_page: 15 });
      setData(res.data || []);
      setMeta((res as any).meta);
    } catch {
      toast.error('Gagal memuat data kelulusan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    siakadService.getKelulusanSensing().then((res) => setSensing(res.data || null)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, applied]);

  const loadMahasiswaOptions = async (keyword: string) => {
    try {
      const res = await siakadService.getMahasiswas({ per_page: 30, search: keyword || undefined });
      const list: any[] = res.data || [];
      return list.map((m: any) => ({
        value: m.id,
        label: `${m.nama_lengkap} — ${m.nim} (IPK ${Number(m.ipk || 0).toFixed(2)})`,
        sublabel: m.program_studi?.nama || '',
        raw: m,
      }));
    } catch {
      return [];
    }
  };

  const handleCek = async () => {
    if (!cekMhsId) {
      toast.error('Pilih mahasiswa terlebih dahulu');
      return;
    }
    try {
      setChecking(true);
      setCekHasil(null);
      const res = await siakadService.cekSyaratKelulusan(cekMhsId);
      setCekHasil(res.data || null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengecek syarat');
    } finally {
      setChecking(false);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'mhs',
      label: 'NIM & NAMA',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{row.mahasiswa?.nama_lengkap || '-'}</span>
          <span className="font-mono text-2xs text-slate-500">{row.mahasiswa?.nim || '-'}</span>
        </div>
      ),
    },
    {
      key: 'ipk',
      label: 'IPK AKHIR',
      align: 'center',
      render: (row) => <span className="font-mono font-bold text-xs">{Number(row.ipk_akhir || 0).toFixed(2)}</span>,
    },
    {
      key: 'sks',
      label: 'SKS',
      align: 'center',
      render: (row) => <span className="font-mono font-bold text-xs">{row.total_sks}</span>,
    },
    {
      key: 'ijazah',
      label: 'IJAZAH',
      render: (row) => <span className="font-mono text-2xs text-slate-600">{row.nomor_ijazah || '-'}</span>,
    },
    {
      key: 'status',
      label: 'STATUS',
      align: 'center',
      render: () => <Badge variant="green" className="text-2xs font-bold">Lulus</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelulusan & Yudisium"
        description="Pemantauan status akademik, cek syarat kelulusan (min. IPK 2.00 & 144 SKS), dan penetapan yudisium."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Kelulusan' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" icon={<Filter size={15} />} className="font-bold text-xs min-h-[38px]" style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }} onClick={() => { setDraftTaId(applied.tahun_akademik_id); setShowFilter(true); }}>
              Filter
            </Button>
            <Link href="/siakad/kelulusan/tambah">
              <Button variant="primary" icon={<GraduationCap size={15} />} className="font-bold text-xs min-h-[38px]">
                Tetapkan Yudisium
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Non-Aktif" value={sensing?.non_aktif ?? '-'} />
        <StatCard label="Cuti" value={sensing?.cuti ?? '-'} />
        <StatCard label="Aktif Tanpa KRS" value={sensing?.aktif_tanpa_krs_TA_aktif ?? '-'} />
      </div>

      <div className="bg-white border rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Cek Syarat Kelulusan</h3>
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <AsyncSelect
              label="Mahasiswa"
              placeholder="Cari NIM / nama..."
              loadOptions={loadMahasiswaOptions}
              value={cekMhsId}
              onChange={(opt: any) => setCekMhsId(opt?.value ? Number(opt.value) : null)}
            />
          </div>
          <Button variant="outline" icon={<Search size={15} />} className="font-bold text-xs min-h-[38px]" onClick={handleCek} loading={checking} disabled={!cekMhsId}>
            Cek Syarat
          </Button>
        </div>
        {cekHasil && (
          <div className={`border rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cekHasil.memenuhi ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
            <p className="text-xs flex items-center gap-2">
              {cekHasil.memenuhi
                ? <CheckCircle2 size={16} className="text-emerald-600" />
                : <XCircle size={16} className="text-amber-600" />}
              <span>
                IPK <strong className="font-mono">{Number(cekHasil.ipk || 0).toFixed(2)}</strong> (min 2.00)
                {' • '}SKS <strong className="font-mono">{cekHasil.total_sks}</strong> (min {cekHasil.syarat_sks})
                {' — '}<strong>{cekHasil.memenuhi ? 'Memenuhi syarat' : 'Belum memenuhi'}</strong>
              </span>
            </p>
            {cekHasil.memenuhi && (
              <Link href={`/siakad/kelulusan/tambah?mhs=${cekHasil.mahasiswa?.id || cekMhsId || ''}`}>
                <Button variant="primary" className="font-bold text-xs">
                  Lanjut Yudisium
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

      <DataTable columns={columns} data={data} meta={meta} isLoading={loading} emptyMessage="Belum ada data kelulusan." />

      <Drawer open={showFilter} onClose={() => setShowFilter(false)} title="Filter Kelulusan">
        <div className="flex flex-col gap-5">
          <PeriodeSelector value={draftTaId} onChange={(id) => setDraftTaId(id)} />
          <Input label="Pencarian" placeholder="Cari NIM / nama..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urutkan"
              options={[
                { value: 'mahasiswa', label: 'Nama Mahasiswa' },
                { value: 'created_at', label: 'Tanggal' },
                { value: 'updated_at', label: 'Diperbarui' },
                { value: 'id', label: 'ID' },
              ]}
              value={filterSortBy || 'created_at'}
              onChange={(v: any) => setFilterSortBy(String(v || 'created_at'))}
            />
            <Select
              label="Arah"
              options={[
                { value: 'desc', label: 'Terbaru' },
                { value: 'asc', label: 'Terlama' },
              ]}
              value={filterSortDir || 'desc'}
              onChange={(v: any) => setFilterSortDir(String(v || 'desc'))}
            />
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setApplied({ search, tahun_akademik_id: draftTaId, sort_by: filterSortBy, sort_order: filterSortDir });
              setPage(1);
              setShowFilter(false);
            }}
          >
            Terapkan
          </Button>
        </div>
      </Drawer>

    </div>
  );
}
