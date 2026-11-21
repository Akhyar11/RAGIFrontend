'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Award,
  BookOpen,
  Printer,
  QrCode,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { mahasiswaStatusLabel } from '@/types/siakad.types';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { siakadService } from '@/services/siakad.service';
import {
  SEMESTER_OPTIONS,
  TRANSKRIP_SORT_BY_OPTIONS,
  SORT_DIRECTION_OPTIONS,
} from '@/lib/constants/siakad.constant';
import toast from 'react-hot-toast';

export default function TranskripNilaiPage() {
  const [loading, setLoading] = useState(true);
  const [transkripData, setTranskripData] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [filterSemester, setFilterSemester] = useState('ALL');
  const [filterSortBy, setFilterSortBy] = useState('nama_mk');
  const [filterSortOrder, setFilterSortOrder] = useState('asc');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [meta, setMeta] = useState<any | null>(null);

  // Terbitkan Transkrip State
  const [issuing, setIssuing] = useState(false);
  const [issuedDoc, setIssuedDoc] = useState<any | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const loadTranskrip = async () => {
    try {
      setLoading(true);
      const res = await siakadService.getTranskrip();
      if (res?.data) {
        setTranskripData(res.data);
      }
    } catch {
      toast.error('Gagal memuat transkrip nilai');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTranskrip();
  }, []);

  const handleTerbitkanTranskrip = async () => {
    try {
      setIssuing(true);
      const res = await siakadService.terbitkanDokumen({
        jenis: 'TRANSKRIP',
      });
      if (res?.data) {
        setIssuedDoc(res.data);
        setQrModalOpen(true);
        toast.success(res?.message || 'Dokumen transkrip resmi berhasil diterbitkan');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menerbitkan dokumen transkrip resmi');
    } finally {
      setIssuing(false);
    }
  };

  // Cetak Transkrip State
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const handlePrint = () => {
    setPrintModalOpen(true);
  };

  const mhs = transkripData?.mahasiswa || {};
  const ringkasan = transkripData?.ringkasan || {};
  const rawItems: any[] = transkripData?.items || [];

  // Filter & sort transkrip items
  const filteredItems = useMemo(() => {
    let list = [...rawItems];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (it) =>
          it.nama_mk?.toLowerCase().includes(q) ||
          it.kode_mk?.toLowerCase().includes(q)
      );
    }
    if (filterSemester !== 'ALL') {
      list = list.filter((it) => String(it.semester) === filterSemester);
    }

    list.sort((a, b) => {
      if (filterSortBy === 'sks') {
        return filterSortOrder === 'asc' ? (a.sks || 0) - (b.sks || 0) : (b.sks || 0) - (a.sks || 0);
      }
      if (filterSortBy === 'bobot_mutu') {
        return filterSortOrder === 'asc' ? (a.bobot_mutu || 0) - (b.bobot_mutu || 0) : (b.bobot_mutu || 0) - (a.bobot_mutu || 0);
      }
      const nameA = String(a.nama_mk || '');
      const nameB = String(b.nama_mk || '');
      return filterSortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

    return list;
  }, [rawItems, search, filterSemester, filterSortBy, filterSortOrder]);

  const columns: ColumnDef<any>[] = [
    {
      key: 'no',
      label: 'NO',
      align: 'center',
      render: (_row, idx) => <span className="font-mono text-xs text-slate-500">{idx + 1}</span>,
    },
    {
      key: 'mk',
      label: 'KODE & MATA KULIAH',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{row.nama_mk || '-'}</span>
          <span className="font-mono text-2xs text-slate-500">
            {row.kode_mk || '-'} {row.is_transfer && <span className="text-amber-600 font-semibold">• Konversi Transfer</span>}
          </span>
        </div>
      ),
    },
    {
      key: 'semester',
      label: 'SEMESTER',
      align: 'center',
      render: (row) => <span className="text-xs text-slate-700">{row.semester ? `Sem ${row.semester}` : '-'}</span>,
    },
    {
      key: 'sks',
      label: 'SKS',
      align: 'center',
      render: (row) => <span className="font-mono font-bold text-xs">{row.sks || 0}</span>,
    },
    {
      key: 'nilai_huruf',
      label: 'NILAI',
      align: 'center',
      render: (row) => {
        const h = row.nilai_huruf || '-';
        const isPass = h === 'A' || h === 'A-' || h === 'B+' || h === 'B' || h === 'B-' || h === 'C+' || h === 'C';
        return (
          <Badge variant={isPass ? 'green' : h === '-' ? 'gray' : 'red'} className="text-2xs font-mono font-bold">
            {h}
          </Badge>
        );
      },
    },
    {
      key: 'bobot_mutu',
      label: 'BOBOT',
      align: 'center',
      render: (row) => (
        <span className="font-mono text-xs">{Number(row.bobot_mutu ?? 0).toFixed(2)}</span>
      ),
    },
    {
      key: 'mutu_total',
      label: 'MUTU (SKS × BOBOT)',
      align: 'right',
      render: (row) => {
        const mutu = (row.sks || 0) * (row.bobot_mutu ?? 0);
        return <span className="font-mono font-bold text-xs text-slate-900">{mutu.toFixed(2)}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Transkrip Nilai Akademik Kumulatif"
          description="Rekapitulasi pencapaian seluruh mata kuliah, Indeks Prestasi Kumulatif (IPK), dan penerbitan dokumen resmi ber-QR anti-tamper."
          breadcrumbs={[
            { label: 'Portal SSO', href: '/dashboard' },
            { label: 'SIAKAD', href: '/siakad' },
            { label: 'Transkrip Nilai' },
          ]}
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                icon={<Filter size={16} />}
                onClick={() => setShowFilterDrawer(true)}
                className="text-xs font-bold border-[var(--module-primary)] text-[var(--module-primary)] hover:bg-[var(--module-primary-subtle)]"
              >
                Filter
              </Button>
              <Button
                variant="primary"
                icon={<Printer size={14} />}
                onClick={handlePrint}
                disabled={loading}
                className="text-xs font-bold"
              >
                Cetak Transkrip
              </Button>
            </div>
          }
        />
      </div>

      {/* Profil Mahasiswa Print/View Header */}
      <Card>
        <CardBody className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100 text-slate-800">
                <GraduationCap size={24} />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 leading-tight">
                  {mhs.nama || mhs.nama_lengkap || 'Nama Mahasiswa'}
                </h2>
                <p className="text-2xs text-slate-500 font-mono mt-0.5">
                  NIM: {mhs.nim || '-'} • Program Studi: {mhs.program_studi || '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<QrCode size={14} />}
                onClick={handleTerbitkanTranskrip}
                disabled={loading || issuing}
                isLoading={issuing}
                className="text-xs font-bold"
              >
                Terbitkan Dokumen QR
              </Button>
              <Badge variant="blue" className="text-2xs font-semibold">
                Angkatan {mhs.angkatan || '-'}
              </Badge>
              <Badge variant="green" className="text-2xs font-semibold">
                Status: {mahasiswaStatusLabel(mhs.status)}
              </Badge>
            </div>
          </div>

          {/* Statistik Kumulatif */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Total SKS Diambil</p>
              <p className="text-lg font-black text-slate-900 mt-1 font-mono">
                {ringkasan.total_sks_diambil ?? 0}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Total SKS Lulus</p>
              <p className="text-lg font-black text-emerald-600 mt-1 font-mono">
                {ringkasan.total_sks_lulus ?? 0}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Total Bobot Mutu</p>
              <p className="text-lg font-black text-slate-900 mt-1 font-mono">
                {Number(ringkasan.total_bobot_mutu ?? 0).toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-[var(--module-primary-subtle)]">
              <p className="text-2xs font-semibold uppercase tracking-wider text-[var(--module-primary)]">
                IPK Kumulatif
              </p>
              <p className="text-xl font-black mt-1 font-mono text-[var(--module-primary)]">
                {Number(ringkasan.ipk ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabel Transkrip Nilai */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-200 print:hidden">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Rincian Nilai Seluruh Semester
            </h3>
            <p className="text-2xs text-slate-500">
              Menampilkan {filteredItems.length} mata kuliah kumulatif.
            </p>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable
            columns={columns}
            data={filteredItems}
            isLoading={loading}
            emptyMessage="Belum ada rekaman nilai mata kuliah pada transkrip akademik."
          />
        </CardBody>
      </Card>

      {/* Filter Drawer */}
      <Drawer
        open={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        title="Filter & Pencarian Transkrip Nilai"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Pencarian Mata Kuliah"
            placeholder="Cari kode/nama mata kuliah..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Select
            label="Semester"
            options={SEMESTER_OPTIONS}
            value={filterSemester}
            onChange={(v) => setFilterSemester(String(v || 'ALL'))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Urutkan"
              options={TRANSKRIP_SORT_BY_OPTIONS}
              value={filterSortBy}
              onChange={(v) => setFilterSortBy(String(v || 'nama_mk'))}
            />
            <Select
              label="Arah"
              options={SORT_DIRECTION_OPTIONS}
              value={filterSortOrder}
              onChange={(v) => setFilterSortOrder(String(v || 'asc'))}
            />
          </div>

          <Button
            variant="primary"
            onClick={() => setShowFilterDrawer(false)}
            className="mt-2"
          >
            Terapkan Filter
          </Button>
        </div>
      </Drawer>

      {/* Modal QR Code Dokumen Resmi */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="Penerbitan Transkrip Resmi"
        size="md"
      >
        {issuedDoc && (
          <div className="p-4 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 bg-emerald-50 border border-emerald-100">
              <ShieldCheck size={28} />
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Dokumen TRANSKRIP Resmi Terbit
              </h4>
              <p className="text-2xs text-slate-500 font-mono mt-0.5">
                Nomor: {issuedDoc.nomor_dokumen || '-'}
              </p>
            </div>

            {issuedDoc.qr_code_svg && (
              <div
                className="w-48 h-48 mx-auto p-2 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: issuedDoc.qr_code_svg }}
              />
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-2xs space-y-1 font-mono">
              <p className="text-slate-500 truncate">
                Token: <span className="text-slate-900 font-semibold">{issuedDoc.token}</span>
              </p>
              <p className="text-slate-500">
                Tanggal Terbit: <span className="text-slate-900 font-semibold">{issuedDoc.tanggal_terbit || '-'}</span>
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQrModalOpen(false)}
                className="text-xs"
              >
                Tutup
              </Button>
              {issuedDoc.token && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ExternalLink size={13} />}
                  onClick={() => window.open(`/validasi-dokumen/${encodeURIComponent(issuedDoc.token)}`, '_blank')}
                  className="text-xs font-bold"
                >
                  Buka Portal Verifikasi
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Konfirmasi & Pratinjau Cetak Transkrip */}
      <Modal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Pratinjau & Cetak Transkrip Akademik"
        size="md"
      >
        <div className="p-4 space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto text-blue-600 bg-blue-50 border border-blue-100">
            <Printer size={28} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Cetak Transkrip Nilai Akademik
            </h4>
            <p className="text-2xs text-slate-500 mt-1">
              Dokumen siap dicetak untuk {mhs.nama || 'Mahasiswa'} ({mhs.nim || '-'}). Total {filteredItems.length} mata kuliah kumulatif dengan IPK {Number(ringkasan.ipk ?? 0).toFixed(2)}.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-2xs space-y-1 font-mono">
            <p className="text-slate-600">Format: Lembar Rekap Transkrip Akademik Resmi</p>
            <p className="text-slate-600">Mode: Kompatibel Tata Letak A4 / Letter</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrintModalOpen(false)}
              className="text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Printer size={13} />}
              onClick={() => {
                setPrintModalOpen(false);
                setTimeout(() => {
                  window.print();
                }, 300);
              }}
              className="text-xs font-bold"
            >
              Cetak Dokumen Sekarang
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
