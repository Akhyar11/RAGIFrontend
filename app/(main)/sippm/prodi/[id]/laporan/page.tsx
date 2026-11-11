'use client';

import { useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  School,
  FileText,
  BookOpen,
  Award,
  Globe,
  Printer,
  Search,
  ExternalLink,
  CheckCircle2,
  Calendar,
  User,
  DollarSign,
  Layers,
  Building2,
  TrendingUp,
  FlaskConical,
  FileCheck,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Drawer } from '@/components/ui/Drawer';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Hero } from '@/components/ui/Hero';
import type { PaginationMeta } from '@/types/api.types';

interface ProdiDetail {
  id: string;
  nama_prodi: string;
  fakultas: string;
  kaprodi: string;
  dosen_pengusul: number;
  scopus: number;
  sinta: number;
  dikti: number;
  internal: number;
  hki_paten: number;
  total_dana: number;
  target_iku: number;
  capaian_iku: number;
}

const mockProdiMap: Record<string, ProdiDetail> = {
  IF: {
    id: 'IF',
    nama_prodi: 'S1 Teknik Informatika',
    fakultas: 'Fakultas Ilmu Komputer',
    kaprodi: 'Prof. Dr. Ir. H. Ahmad Dahlan, M.Kom',
    dosen_pengusul: 5,
    scopus: 3,
    sinta: 2,
    dikti: 3,
    internal: 2,
    hki_paten: 5,
    total_dana: 145000000,
    target_iku: 80,
    capaian_iku: 118,
  },
  SI: {
    id: 'SI',
    nama_prodi: 'S1 Sistem Informasi',
    fakultas: 'Fakultas Ilmu Komputer',
    kaprodi: 'Dr. Rina Wijaya, S.Kom., M.T.',
    dosen_pengusul: 5,
    scopus: 3,
    sinta: 2,
    dikti: 3,
    internal: 2,
    hki_paten: 5,
    total_dana: 110000000,
    target_iku: 75,
    capaian_iku: 105,
  },
  DKV: {
    id: 'DKV',
    nama_prodi: 'S1 Desain Komunikasi Visual',
    fakultas: 'Fakultas Desain & Seni',
    kaprodi: 'Bambang Sudarsono, M.Sn.',
    dosen_pengusul: 5,
    scopus: 2,
    sinta: 3,
    dikti: 2,
    internal: 3,
    hki_paten: 5,
    total_dana: 65000000,
    target_iku: 70,
    capaian_iku: 92,
  },
  TE: {
    id: 'TE',
    nama_prodi: 'S1 Teknik Elektro',
    fakultas: 'Fakultas Teknik',
    kaprodi: 'Ir. Hendra Gunawan, M.T., Ph.D.',
    dosen_pengusul: 5,
    scopus: 3,
    sinta: 2,
    dikti: 3,
    internal: 2,
    hki_paten: 5,
    total_dana: 80000000,
    target_iku: 75,
    capaian_iku: 88,
  },
  MI: {
    id: 'MI',
    nama_prodi: 'S1 Manajemen Informatika',
    fakultas: 'Fakultas Ilmu Komputer',
    kaprodi: 'Nurhasanah, S.Kom., M.Kom.',
    dosen_pengusul: 5,
    scopus: 2,
    sinta: 3,
    dikti: 2,
    internal: 3,
    hki_paten: 5,
    total_dana: 40000000,
    target_iku: 70,
    capaian_iku: 68,
  },
  D3SI: {
    id: 'D3SI',
    nama_prodi: 'D3 Sistem Informasi',
    fakultas: 'Fakultas Ilmu Komputer',
    kaprodi: 'Fajar Nugraha, M.Kom.',
    dosen_pengusul: 5,
    scopus: 2,
    sinta: 3,
    dikti: 2,
    internal: 3,
    hki_paten: 5,
    total_dana: 30000000,
    target_iku: 65,
    capaian_iku: 72,
  },
};

export default function LaporanProdiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const prodiId = resolvedParams.id || 'IF';
  const prodi = mockProdiMap[prodiId] || mockProdiMap['IF'];

  const [activeTab, setActiveTab] = useState<'publikasi' | 'hibah' | 'hki'>('publikasi');

  // Pagination Meta State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Filter & Search State
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filterOrderBy, setFilterOrderBy] = useState('id');
  const [filterOrderDir, setFilterOrderDir] = useState('asc');

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  // Mock Publikasi Data
  const publikasiList = [
    {
      id: 1,
      dosen: 'Prof. Dr. Ir. H. Ahmad Dahlan, M.Kom',
      nidn: '0412058201',
      judul: 'Deep Learning Architecture for Automated Medical Image Segmentation in Oncology',
      jurnal: 'IEEE Access (Scopus Q1, Impact Factor: 3.9)',
      tanggal: '15 Jan 2026',
      kategori: 'Scopus Q1',
      link: 'https://doi.org/10.1109/ACCESS.2026.3129841',
    },
    {
      id: 2,
      dosen: 'Dr. Siti Nurhaliza, S.T., M.T.',
      nidn: '0418098502',
      judul: 'IoT-based Precision Agriculture Monitoring System with Solar-Powered Sensor Node in Tropical Climate',
      jurnal: 'Journal of King Saud University - Computer and Information Sciences (Scopus Q2)',
      tanggal: '02 Feb 2026',
      kategori: 'Scopus Q2',
      link: 'https://doi.org/10.1016/j.jksuci.2026.02.011',
    },
    {
      id: 3,
      dosen: 'Budi Santoso, M.Kom',
      nidn: '0422119003',
      judul: 'Optimasi Algoritma Genetic Algorithm pada Penjadwalan Perkuliahan dan Ruang Laboratorium Komputer',
      jurnal: 'Jurnal Teknologi Informasi dan Ilmu Komputer (JTIK - SINTA 2)',
      tanggal: '10 Des 2025',
      kategori: 'SINTA 2',
      link: 'https://sinta.kemdikbud.go.id/journals/profile/2049',
    },
    {
      id: 4,
      dosen: 'Eka Putri, M.T.',
      nidn: '0405078804',
      judul: 'Analisis Sentimen Opini Publik terhadap Kebijakan Transportasi Listrik Menggunakan BERT Framework',
      jurnal: 'Jurnal Riset Akuntansi & Informatika (JRAI - SINTA 3)',
      tanggal: '18 Nov 2025',
      kategori: 'SINTA 3',
      link: 'https://sinta.kemdikbud.go.id/journals/profile/3120',
    },
    {
      id: 5,
      dosen: 'Dr. Eng. Rahmat Hidayat, M.Sc.',
      nidn: '0409128305',
      judul: 'Performance Benchmark of Lightweight Cryptography for Embedded Microcontrollers',
      jurnal: 'International Journal of Advanced Computer Science (Scopus Q3)',
      tanggal: '24 Okt 2025',
      kategori: 'Scopus Q3',
      link: 'https://scopus.com/record/display.uri?eid=2-s2.0-85129031',
    },
  ];

  // Mock Hibah Riset Data
  const hibahList = [
    {
      id: 1,
      ketua: 'Prof. Dr. Ir. H. Ahmad Dahlan, M.Kom',
      judul: 'Pengembangan Model Generative AI Berbasis Micro-Services untuk Deteksi Dini Penyakit Tanaman Padi',
      skema: 'DIKTI - Fundamental Reguler',
      sumber: 'DIKTI DRTPM',
      dana: 65000000,
      status: 'Selesai LPJ',
    },
    {
      id: 2,
      ketua: 'Dr. Siti Nurhaliza, S.T., M.T.',
      judul: 'Rancang Bangun Microgrid Energi Terbarukan Berbasis IoT untuk Desa Mandiri Energi',
      skema: 'DIKTI - Terapan Unggulan PT',
      sumber: 'DIKTI DRTPM',
      dana: 45000000,
      status: 'Termin 2 Disbursed',
    },
    {
      id: 3,
      ketua: 'Budi Santoso, M.Kom',
      judul: 'Audit Keamanan Informasi SSO Subdomain Kampus Berbasis Standar ISO/IEC 27001',
      skema: 'Internal - Penelitian Pemula (HPP)',
      sumber: 'Dana Internal LPPM',
      dana: 20000000,
      status: 'Penelitian Berjalan',
    },
    {
      id: 4,
      ketua: 'Eka Putri, M.T.',
      judul: 'Penerapan UI/UX Modern pada Sistem Manajemen Informasi Pegawai (SIMPEG) Kampus',
      skema: 'Internal - Pengabdian Vokasi (PPM)',
      sumber: 'Dana Internal LPPM',
      dana: 15000000,
      status: 'Pengabdian Berjalan',
    },
  ];

  // Mock HKI Data
  const hkiList = [
    {
      id: 1,
      inventor: 'Prof. Dr. Ir. H. Ahmad Dahlan, M.Kom & Tim',
      judul: 'Source Code Framework Algoritma MedSeg-DeepV1 untuk Segmentasi Citra Medis',
      jenis: 'Hak Cipta Program Komputer',
      no_cipta: 'EC00202619882',
      tanggal: '12 Jan 2026',
    },
    {
      id: 2,
      inventor: 'Dr. Siti Nurhaliza, S.T., M.T.',
      judul: 'Desain Industri Enclosure Sensor Node Microgrid Portable Tahan Cuaca',
      jenis: 'Paten Sederhana',
      no_cipta: 'IDS000004921',
      tanggal: '28 Des 2025',
    },
    {
      id: 3,
      inventor: 'Budi Santoso, M.Kom',
      judul: 'Buku Ajar Praktikum Keamanan Jaringan dan Kriptografi Kuantum',
      jenis: 'Hak Cipta Buku Ajar',
      no_cipta: 'EC00202598112',
      tanggal: '15 Nov 2025',
    },
    {
      id: 4,
      inventor: 'Eka Putri, M.T.',
      judul: 'Modul Sistem Informasi Manajemen Rekognisi Dosen dan Capaian IKU',
      jenis: 'Hak Cipta Karya Tulis',
      no_cipta: 'EC00202587654',
      tanggal: '05 Okt 2025',
    },
  ];

  // Filtered Items
  const filteredPublikasi = publikasiList.filter(
    (p) =>
      p.dosen.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      p.judul.toLowerCase().includes(appliedSearch.toLowerCase())
  );

  const filteredHibah = hibahList.filter(
    (h) =>
      h.ketua.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      h.judul.toLowerCase().includes(appliedSearch.toLowerCase())
  );

  const filteredHki = hkiList.filter(
    (hk) =>
      hk.inventor.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      hk.judul.toLowerCase().includes(appliedSearch.toLowerCase())
  );

  // Column Definitions
  const publikasiColumns: ColumnDef<(typeof publikasiList)[0]>[] = [
    {
      key: 'dosen',
      label: 'Nama Dosen & NIDN',
      render: (pub) => (
        <div className="space-y-0.5">
          <div className="font-extrabold text-slate-900 text-xs">{pub.dosen}</div>
          <div className="text-[11px] text-slate-400 font-mono">NIDN: {pub.nidn}</div>
        </div>
      ),
    },
    {
      key: 'judul',
      label: 'Judul Artikel & Nama Jurnal',
      render: (pub) => (
        <div className="space-y-0.5">
          <div className="font-bold text-slate-900 text-xs line-clamp-1">{pub.judul}</div>
          <div className="text-[11px] text-primary-700 font-medium">{pub.jurnal}</div>
        </div>
      ),
    },
    {
      key: 'kategori',
      label: 'Kategori & Indexing',
      render: (pub) => (
        <Badge
          variant={pub.kategori.includes('Scopus') ? 'purple' : 'blue'}
          className="font-bold text-[10px] font-mono"
        >
          {pub.kategori}
        </Badge>
      ),
    },
    {
      key: 'tanggal',
      label: 'Tanggal Terbit',
      render: (pub) => <span className="text-xs text-slate-600 font-medium">{pub.tanggal}</span>,
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (pub) => (
        <div className="flex justify-end">
          <DropdownMenu
            items={[
              {
                label: 'Buka Link DOI / URL',
                icon: <ExternalLink size={14} className="text-purple-700" />,
                onClick: () => {
                  window.open(pub.link, '_blank');
                },
              },
            ]}
          />
        </div>
      ),
    },
  ];

  const hibahColumns: ColumnDef<(typeof hibahList)[0]>[] = [
    {
      key: 'ketua',
      label: 'Ketua Peneliti',
      render: (hib) => (
        <div className="space-y-0.5">
          <div className="font-extrabold text-slate-900 text-xs">{hib.ketua}</div>
          <div className="text-[11px] text-slate-500 font-medium">Ketua Pelaksana</div>
        </div>
      ),
    },
    {
      key: 'judul',
      label: 'Judul Proposal Riset',
      render: (hib) => <div className="font-bold text-slate-900 text-xs line-clamp-1">{hib.judul}</div>,
    },
    {
      key: 'skema',
      label: 'Skema & Sumber Hibah',
      render: (hib) => (
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-slate-800">{hib.skema}</div>
          <div className="text-[11px] text-primary-700 font-medium">{hib.sumber}</div>
        </div>
      ),
    },
    {
      key: 'dana',
      label: 'Dana Disetujui',
      render: (hib) => <span className="font-mono font-extrabold text-primary-900 text-xs">{formatRupiah(hib.dana)}</span>,
    },
    {
      key: 'status',
      label: 'Status Hibah',
      render: (hib) => (
        <Badge variant="green" className="font-bold text-[10px]">
          {hib.status}
        </Badge>
      ),
    },
  ];

  const hkiColumns: ColumnDef<(typeof hkiList)[0]>[] = [
    {
      key: 'inventor',
      label: 'Inventor / Pemegang Hak',
      render: (hki) => <div className="font-extrabold text-slate-900 text-xs">{hki.inventor}</div>,
    },
    {
      key: 'judul',
      label: 'Judul Ciptaan / Paten',
      render: (hki) => <div className="font-bold text-slate-900 text-xs line-clamp-1">{hki.judul}</div>,
    },
    {
      key: 'jenis',
      label: 'Jenis HKI',
      render: (hki) => (
        <Badge variant="purple" className="font-bold text-[10px]">
          {hki.jenis}
        </Badge>
      ),
    },
    {
      key: 'no_cipta',
      label: 'No. Permohonan / Cipta',
      render: (hki) => <span className="font-mono font-bold text-slate-700 text-xs">{hki.no_cipta}</span>,
    },
    {
      key: 'tanggal',
      label: 'Tanggal Terbit',
      render: (hki) => <span className="text-xs text-slate-600 font-medium">{hki.tanggal}</span>,
    },
  ];

  const metaData: PaginationMeta = {
    current_page: 1,
    per_page: 10,
    total:
      activeTab === 'publikasi'
        ? filteredPublikasi.length
        : activeTab === 'hibah'
        ? filteredHibah.length
        : filteredHki.length,
    last_page: 1,
    from: 1,
    to:
      activeTab === 'publikasi'
        ? filteredPublikasi.length
        : activeTab === 'hibah'
        ? filteredHibah.length
        : filteredHki.length,
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Page Header (Atomic Standard) */}
      <PageHeader
        title={`Laporan Kinerja Riset & Luaran: ${prodi.nama_prodi}`}
        description={`${prodi.fakultas} • Ketua Program Studi: ${prodi.kaprodi}`}
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIPPM', href: '/sippm' },
          { label: `Laporan ${prodi.id}` },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<ArrowLeft size={16} />}
              onClick={() => router.push('/sippm')}
              className="font-bold"
            >
              Kembali
            </Button>
            <Button
              variant="primary"
              icon={<Printer size={16} />}
              onClick={() => window.print()}
              className="font-bold"
            >
              Cetak Laporan PDF
            </Button>
          </div>
        }
      />

      {/* TOP EXECUTIVE STATS GRID (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-white border border-primary-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-primary-700 text-xs font-semibold">
            <span>DOSEN PENGUSUL</span>
            <User size={18} className="text-primary-600" />
          </div>
          <div className="text-3xl font-black font-mono text-slate-900">{prodi.dosen_pengusul} Dosen</div>
          <div className="text-[11px] text-primary-700 font-bold">Partisipasi Aktif LPPM</div>
        </div>

        <div className="card p-5 bg-white border border-purple-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-purple-700 text-xs font-semibold">
            <span>TOTAL PUBLIKASI</span>
            <Globe size={18} className="text-purple-600" />
          </div>
          <div className="text-3xl font-black font-mono text-slate-900">
            {prodi.scopus + prodi.sinta} <span className="text-sm font-normal text-slate-500">Artikel</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="text-purple-700 font-mono">{prodi.scopus} Scopus</span>
            <span className="text-slate-300">•</span>
            <span className="text-blue-700 font-mono">{prodi.sinta} SINTA</span>
          </div>
        </div>

        <div className="card p-5 bg-white border border-emerald-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>HIBAH TERDANAI</span>
            <Award size={18} className="text-emerald-600" />
          </div>
          <div className="text-3xl font-black font-mono text-slate-900">
            {prodi.dikti + prodi.internal} <span className="text-sm font-normal text-slate-500">Proposal</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="text-emerald-700 font-mono">{prodi.dikti} DIKTI</span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-700 font-mono">{prodi.internal} Internal</span>
          </div>
        </div>

        <div className="card p-5 bg-white border border-amber-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>ALOKASI PAGU DANA</span>
            <TrendingUp size={18} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">{formatRupiah(prodi.total_dana)}</div>
          <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 size={13} /> Capaian IKU 5: {prodi.capaian_iku}%
          </div>
        </div>
      </div>

      {/* NAVIGATION TAB CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'publikasi' ? 'primary' : 'outline'}
            icon={<Globe size={15} />}
            onClick={() => setActiveTab('publikasi')}
            className="font-bold text-xs"
          >
            Publikasi Jurnal ({publikasiList.length})
          </Button>

          <Button
            variant={activeTab === 'hibah' ? 'primary' : 'outline'}
            icon={<Award size={15} />}
            onClick={() => setActiveTab('hibah')}
            className="font-bold text-xs"
          >
            Hibah Riset ({hibahList.length})
          </Button>

          <Button
            variant={activeTab === 'hki' ? 'primary' : 'outline'}
            icon={<FileCheck size={15} />}
            onClick={() => setActiveTab('hki')}
            className="font-bold text-xs"
          >
            HKI &amp; Paten ({hkiList.length})
          </Button>
        </div>

        <Button
          variant="outline"
          icon={<Filter size={16} />}
          onClick={() => setShowFilter(true)}
          className="font-bold"
        >
          Filter &amp; Urutkan
        </Button>
      </div>

      {/* DATA TABLE DISPLAY */}
      {activeTab === 'publikasi' && (
        <DataTable columns={publikasiColumns} data={filteredPublikasi} meta={metaData} />
      )}
      {activeTab === 'hibah' && (
        <DataTable columns={hibahColumns} data={filteredHibah} meta={metaData} />
      )}
      {activeTab === 'hki' && (
        <DataTable columns={hkiColumns} data={filteredHki} meta={metaData} />
      )}

      {/* FILTER DRAWER SLIDE RIGHT-TO-LEFT */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Laporan Kinerja Riset Prodi"
      >
        <div className="space-y-4">
          <Input
            label="Cari Judul / Nama Dosen"
            placeholder="Ketik judul riset atau nama dosen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              icon={<RotateCcw size={14} />}
              onClick={() => {
                setSearch('');
                setAppliedSearch('');
                setShowFilter(false);
              }}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              icon={<Filter size={14} />}
              onClick={() => {
                setAppliedSearch(search);
                setShowFilter(false);
              }}
            >
              Terapkan Filter
            </Button>
          </div>
        </div>
      </Drawer>

      {/* FOOTER NOTE / CATATAN EVALUASI UPM */}
      <Hero
        badge={
          <span className="flex items-center gap-2 text-primary-200 font-extrabold text-sm tracking-wide">
            <CheckCircle2 size={20} /> REKOMENDASI PENJAMINAN MUTU UPM
          </span>
        }
        title=""
        description={
          <span className="text-xs md:text-sm text-primary-50 leading-relaxed font-semibold max-w-4xl opacity-95 block">
            Capaian IKU 5 Program Studi <strong>{prodi.nama_prodi}</strong> telah diverifikasi oleh Badan Penjaminan Mutu (UPM) Kampus. Seluruh luaran publikasi Scopus, Sinta, dan HKI telah memenuhi kriteria SPMI Kemendikbudristek.
          </span>
        }
        actions={
          <div className="text-left md:text-right shrink-0 bg-primary-950/80 p-3.5 rounded-xl border border-primary-700/60">
            <div className="text-[10px] text-primary-300 uppercase font-black tracking-wider">STATUS AKREDITASI PRODI</div>
            <div className="text-xl font-black text-emerald-300 font-mono">UNGGUL (A)</div>
          </div>
        }
      />
    </div>
  );
}
