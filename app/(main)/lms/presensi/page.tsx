'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { lmsService } from '@/services/lms.service';
import { useAuth } from '@/hooks/useAuth';
import { downloadBlobFile } from '@/lib/download';
import { formatDateTime, getApiErrorMessage } from '@/lib/utils';
import { SORT_ORDER_OPTIONS } from '@/lib/constants';
import { useSearchParams } from 'next/navigation';
import {
  LMS_EXPORT_FORMAT_OPTIONS,
  LMS_PRESENSI_ABSEN_STATUS_LABEL,
  LMS_PRESENSI_ABSEN_STATUS_OPTIONS,
  LMS_PRESENSI_SORT_BY_OPTIONS,
  LmsExportFormat,
  LmsPresensiKelasItem,
  LmsPresensiRekapItem,
  LmsKeaktifanDosenItem,
} from '@/types/lms.types';
import type { PaginationMeta } from '@/types/api.types';
import {
  Building2,
  Check,
  ClipboardList,
  Download,
  Filter,
  RotateCcw,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

type TabKey = 'keaktifan' | 'kelas' | 'rekap';

const EMPTY_META: PaginationMeta = {
  current_page: 1,
  per_page: 15,
  total: 0,
  last_page: 1,
};

const TABS: { key: TabKey; label: string; icon: typeof Building2 }[] = [
  { key: 'keaktifan', label: 'Keaktifan Dosen', icon: UserCheck },
  { key: 'kelas', label: 'Kelas', icon: Building2 },
  { key: 'rekap', label: 'Rekap Kehadiran', icon: ClipboardList },
];

/**
 * Monitoring keaktifan mengajar dan rekap presensi lokal RAG/SIAKAD.
 */
export default function LmsPresensiPage() {
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('lms.presensi.manage');
  const initialTab = searchParams.get('tab') as TabKey;
  const [tab, setTab] = useState<TabKey>(
    initialTab && ['keaktifan', 'kelas', 'rekap'].includes(initialTab) ? initialTab : 'keaktifan'
  );

  const [keaktifanRows, setKeaktifanRows] = useState<LmsKeaktifanDosenItem[]>([]);
  const [kelasRows, setKelasRows] = useState<LmsPresensiKelasItem[]>([]);
  const [rekapRows, setRekapRows] = useState<LmsPresensiRekapItem[]>([]);

  const [metaKeaktifan, setMetaKeaktifan] = useState<PaginationMeta>(EMPTY_META);
  const [metaKelas, setMetaKelas] = useState<PaginationMeta>(EMPTY_META);
  const [metaRekap, setMetaRekap] = useState<PaginationMeta>(EMPTY_META);

  const [isLoadingKeaktifan, setIsLoadingKeaktifan] = useState(true);
  const [isLoadingKelas, setIsLoadingKelas] = useState(false);
  const [isLoadingRekap, setIsLoadingRekap] = useState(false);

  // Filter
  const [showFilter, setShowFilter] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterKelasId, setFilterKelasId] = useState('');
  const [filterPertemuanKe, setFilterPertemuanKe] = useState('');
  const [filterStatusAbsen, setFilterStatusAbsen] = useState('');
  const [filterOrderBy, setFilterOrderBy] = useState('kode_kelas');
  const [filterOrderDir, setFilterOrderDir] = useState<'asc' | 'desc'>('asc');

  // Opsi kelas untuk filter (diambil dari endpoint panel, bukan hardcode).
  const [kelasOptions, setKelasOptions] = useState<{ value: string; label: string }[]>([]);

  // Export
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState<LmsExportFormat>('xlsx');
  const [isExporting, setIsExporting] = useState(false);

  const fetchKeaktifan = useCallback(
    async (page: number, perPage: number) => {
      setIsLoadingKeaktifan(true);
      try {
        const res = await lmsService.getKeaktifanDosen({
          page,
          per_page: perPage,
          search: filterSearch || undefined,
        });

        if (res.status === 'success') {
          setKeaktifanRows(res.data || []);
          if (res.meta) setMetaKeaktifan(res.meta);
        } else {
          setKeaktifanRows([]);
        }
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Gagal memuat data keaktifan dosen.'));
        setKeaktifanRows([]);
      } finally {
        setIsLoadingKeaktifan(false);
      }
    },
    [filterSearch]
  );

  const fetchKelasOptions = useCallback(async () => {
    try {
      const res = await lmsService.indexKelasPresensi({ per_page: 100, sort_order: 'asc' });
      const options = (res.data || []).map((row) => ({
        value: String(row.id),
        label: `${row.kode_kelas} — ${row.mata_kuliah?.nama || row.nama_kelas}`,
      }));
      setKelasOptions(options);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Gagal memuat opsi kelas.'));
      setKelasOptions([]);
    }
  }, []);

  const fetchKelas = useCallback(
    async (page: number, perPage: number) => {
      setIsLoadingKelas(true);
      try {
        const res = await lmsService.indexKelasPresensi({
          page,
          per_page: perPage,
          search: filterSearch || undefined,
          sort_by: filterOrderBy,
          sort_order: filterOrderDir,
        });

        if (res.status === 'success') {
          setKelasRows(res.data || []);
          if (res.meta) setMetaKelas(res.meta);
        } else {
          setKelasRows([]);
        }
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Gagal memuat daftar kelas presensi.'));
        setKelasRows([]);
      } finally {
        setIsLoadingKelas(false);
      }
    },
    [filterSearch, filterOrderBy, filterOrderDir]
  );

  const fetchRekap = useCallback(
    async (page: number, perPage: number) => {
      setIsLoadingRekap(true);
      try {
        const res = await lmsService.indexRekapPresensi({
          page,
          per_page: perPage,
          search: filterSearch || undefined,
          kelas_id: filterKelasId ? Number(filterKelasId) : undefined,
          pertemuan_ke: filterPertemuanKe ? Number(filterPertemuanKe) : undefined,
          status: filterStatusAbsen || undefined,
        });

        if (res.status === 'success') {
          setRekapRows(res.data || []);
          if (res.meta) setMetaRekap(res.meta);
        } else {
          setRekapRows([]);
        }
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Gagal memuat rekap kehadiran.'));
        setRekapRows([]);
      } finally {
        setIsLoadingRekap(false);
      }
    },
    [filterSearch, filterKelasId, filterPertemuanKe, filterStatusAbsen]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchKelasOptions();
  }, [fetchKelasOptions]);

  useEffect(() => {
    if (tab === 'keaktifan') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchKeaktifan(metaKeaktifan.current_page, metaKeaktifan.per_page);
    }
    if (tab === 'kelas') {
      fetchKelas(metaKelas.current_page, metaKelas.per_page);
    }
    if (tab === 'rekap') {
      fetchRekap(1, metaRekap.per_page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, fetchKeaktifan, fetchKelas, fetchRekap]);

  const handleApplyFilter = () => {
    setShowFilter(false);
    if (tab === 'keaktifan') fetchKeaktifan(1, metaKeaktifan.per_page);
    if (tab === 'kelas') fetchKelas(1, metaKelas.per_page);
    if (tab === 'rekap') fetchRekap(1, metaRekap.per_page);
  };

  const handleResetFilter = () => {
    setFilterSearch('');
    setFilterKelasId('');
    setFilterPertemuanKe('');
    setFilterStatusAbsen('');
    setFilterOrderBy('kode_kelas');
    setFilterOrderDir('asc');
    setShowFilter(false);
  };

  const handleExport = async (): Promise<void> => {
    if (!canManage || !['keaktifan', 'rekap'].includes(tab)) return;
    setIsExporting(true);
    try {
      if (tab === 'keaktifan') {
        const file = await lmsService.exportKeaktifanDosen({
          format: exportFormat,
          search: filterSearch || undefined,
        });
        downloadBlobFile(file.blob, file.filename);
        toast.success('Laporan keaktifan mengajar dosen berhasil diunduh.');
      } else {
        const file = await lmsService.exportRekapPresensiAdmin({
          format: exportFormat,
          search: filterSearch || undefined,
          kelas_id: filterKelasId ? Number(filterKelasId) : undefined,
          pertemuan_ke: filterPertemuanKe ? Number(filterPertemuanKe) : undefined,
          status: filterStatusAbsen || undefined,
        });
        downloadBlobFile(file.blob, file.filename);
        toast.success('Rekap presensi berhasil diunduh.');
      }
      setShowExport(false);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Gagal mengunduh laporan / rekap presensi.'));
    } finally {
      setIsExporting(false);
    }
  };

  const lihatRekapKelas = (row: LmsPresensiKelasItem) => {
    setFilterKelasId(String(row.id));
    setTab('rekap');
    setShowFilter(false);
  };

  /* ---------------------------------------------------------------------
   | Kolom tabel
   | --------------------------------------------------------------------- */

  const keaktifanColumns: ColumnDef<LmsKeaktifanDosenItem>[] = useMemo(
    () => [
      {
        key: 'kelas',
        label: 'KELAS & MATA KULIAH',
        render: (row) => (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-xs">{row.kode_kelas}</span>
              <span className="text-2xs font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                {row.nama_kelas}
              </span>
            </div>
            <span className="text-xs text-slate-700 block font-medium mt-0.5">
              {row.mata_kuliah?.nama || '-'}
            </span>
            <span className="text-2xs text-slate-500 block">
              {row.prodi?.nama || '-'}
            </span>
          </div>
        ),
      },
      {
        key: 'dosen',
        label: 'DOSEN PENGAMPU',
        render: (row) => (
          <div>
            {row.dosen_pengampu && row.dosen_pengampu.length > 0 ? (
              row.dosen_pengampu.map((dp, idx) => (
                <div key={idx} className="mb-1 last:mb-0">
                  <span className="text-xs font-semibold text-slate-800 block">
                    {dp.nama}
                  </span>
                  <span className="text-2xs text-slate-500 block">
                    NIDN: {dp.nidn || '-'} {dp.is_koordinator ? '(Koordinator)' : ''}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">Belum diplot</span>
            )}
          </div>
        ),
      },
      {
        key: 'pertemuan',
        label: 'REALISASI PERTEMUAN',
        align: 'center',
        render: (row) => (
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              {row.total_pertemuan} / 16 Sesi
            </span>
            <span className="text-2xs text-slate-500 block">
              {row.pertemuan_selesai} pertemuan selesai
            </span>
          </div>
        ),
      },
      {
        key: 'presensi_terisi',
        label: 'PRESENSI TERISI',
        align: 'center',
        render: (row) => (
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              {row.pertemuan_terisi} / {row.total_pertemuan} Sesi
            </span>
            <span className="text-2xs text-slate-500 block">sesi memiliki data absensi</span>
          </div>
        ),
      },
      {
        key: 'keaktifan',
        label: '% KEAKTIFAN',
        align: 'center',
        render: (row) => {
          const persen = row.persentase_keaktifan ?? 0;
          const variant =
            persen >= 80 ? 'green' : persen >= 50 ? 'amber' : persen > 0 ? 'red' : 'gray';
          return (
            <div className="flex flex-col items-center">
              <span className="text-xs font-black text-slate-800">{persen}%</span>
              <Badge variant={variant} className="mt-0.5 text-2xs">
                {row.status_keaktifan}
              </Badge>
            </div>
          );
        },
      },
    ],
    []
  );

  const kelasColumns: ColumnDef<LmsPresensiKelasItem>[] = useMemo(
    () => [
      {
        key: 'kelas',
        label: 'KELAS',
        render: (row) => (
          <div>
            <span className="font-bold text-slate-800 text-xs block">{row.kode_kelas}</span>
            <span className="text-2xs text-slate-500 block">{row.nama_kelas}</span>
          </div>
        ),
      },
      {
        key: 'mata_kuliah',
        label: 'MATA KULIAH',
        render: (row) => (
          <div>
            <span className="text-xs text-slate-700 block">
              {row.mata_kuliah?.nama || '-'}
            </span>
            <span className="text-2xs text-slate-500 block">
              {row.program_studi?.nama || '-'}
            </span>
          </div>
        ),
      },
      {
        key: 'sesi',
        label: 'SESI',
        align: 'center',
        render: (row) => <span className="text-xs text-slate-700">{row.jumlah_sesi ?? 0}</span>,
      },
      {
        key: 'kehadiran',
        label: 'KEHADIRAN',
        align: 'center',
        render: (row) => (
          <div>
            <span className="text-xs text-slate-700 block">
              {row.jumlah_hadir ?? 0} / {row.jumlah_rekap ?? 0}
            </span>
            <span className="text-2xs text-slate-500 block">hadir / rekap</span>
          </div>
        ),
      },
      {
        key: 'aksi',
        label: 'AKSI',
        align: 'right',
        render: (row) => (
          <DropdownMenu items={[{
            label: 'Lihat Rekap',
            icon: <ClipboardList size={14} />,
            onClick: () => lihatRekapKelas(row),
          }]} />
        ),
      },
    ],
    []
  );

  const rekapColumns: ColumnDef<LmsPresensiRekapItem>[] = useMemo(
    () => [
      {
        key: 'mahasiswa',
        label: 'MAHASISWA',
        render: (row) => (
          <div>
            <span className="font-bold text-slate-800 text-xs block">{row.nim}</span>
            <span className="text-2xs text-slate-500 block">{row.nama_lengkap}</span>
          </div>
        ),
      },
      {
        key: 'kelas',
        label: 'KELAS',
        render: (row) => (
          <div>
            <span className="text-xs text-slate-700 block">{row.kode_kelas}</span>
            <span className="text-2xs text-slate-500 block">{row.nama_mk || row.nama_kelas}</span>
          </div>
        ),
      },
      {
        key: 'pertemuan',
        label: 'PERTEMUAN',
        render: (row) => (
          <div>
            <span className="text-xs text-slate-700 block">Pertemuan ke-{row.pertemuan_ke}</span>
            <span className="text-2xs text-slate-500 block">
              {row.tanggal ? formatDateTime(row.tanggal) : '-'}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        label: 'STATUS',
        align: 'center',
        render: (row) => {
          const label = LMS_PRESENSI_ABSEN_STATUS_LABEL[row.status] ?? row.status;
          const variant =
            row.status === 'hadir'
              ? 'green'
              : row.status === 'alfa'
                ? 'red'
                : row.status === 'izin'
                  ? 'blue'
                  : 'amber';
          return <Badge variant={variant}>{label}</Badge>;
        },
      },
    ],
    []
  );

  /* ---------------------------------------------------------------------
   | Render
   | --------------------------------------------------------------------- */

  return (
    <div className="w-full flex flex-col space-y-4">
      <PageHeader
        title="Monitoring Presensi"
        description="Pantau realisasi mengajar dan rekap presensi yang tersimpan di RAG."
        breadcrumbs={[
          { label: 'LMS', href: '/lms' },
          { label: 'Monitoring Presensi' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
              onClick={() => setShowFilter(true)}
            >
              Filter
            </Button>
            {canManage && ['keaktifan', 'rekap'].includes(tab) && (
              <Button
                variant="outline"
                icon={<Download size={16} />}
                onClick={() => setShowExport(true)}
              >
                Export
              </Button>
            )}
          </div>
        }
      />

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
        Data perkuliahan, dosen pengampu, KRS, dan presensi pada halaman ini bersumber dari modul
        SIAKAD di RAG. Perubahan tersimpan di RAG dan tidak dikirim ke sistem legacy.
      </div>

      <div className="card">
        <div className="card-header flex items-center gap-1 overflow-x-auto border-b border-slate-200">
          {TABS.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle,#f8fafc)] rounded-t-lg border-b-2'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="card-body">
          {tab === 'keaktifan' ? (
            <DataTable
              columns={keaktifanColumns}
              data={keaktifanRows}
              isLoading={isLoadingKeaktifan}
              meta={metaKeaktifan}
              onPageChange={(p) => fetchKeaktifan(p, metaKeaktifan.per_page)}
              onLimitChange={(lim) => fetchKeaktifan(1, lim)}
              emptyMessage="Belum ada data perkuliahan atau belum ada kelas aktif."
            />
          ) : null}

          {tab === 'kelas' ? (
            <DataTable
              columns={kelasColumns}
              data={kelasRows}
              isLoading={isLoadingKelas}
              meta={metaKelas}
              onPageChange={(p) => fetchKelas(p, metaKelas.per_page)}
              onLimitChange={(lim) => fetchKelas(1, lim)}
              emptyMessage="Belum ada kelas yang memiliki sesi presensi."
            />
          ) : null}

          {tab === 'rekap' ? (
            <DataTable
              columns={rekapColumns}
              data={rekapRows}
              isLoading={isLoadingRekap}
              meta={metaRekap}
              onPageChange={(p) => fetchRekap(p, metaRekap.per_page)}
              onLimitChange={(lim) => fetchRekap(1, lim)}
              emptyMessage="Belum ada data kehadiran pada kelas yang dipilih."
            />
          ) : null}

        </div>
      </div>

      {/* Filter Drawer — konteks mengikuti tab aktif */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title={`Filter ${TABS.find((item) => item.key === tab)?.label ?? ''}`}
        footer={
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" icon={<RotateCcw size={16} />} onClick={handleResetFilter}>
              Reset
            </Button>
            <Button icon={<Check size={16} />} onClick={handleApplyFilter}>
              Terapkan
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Pencarian"
            placeholder="Cari NIM, nama mahasiswa, materi, atau kode kelas..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />

          {tab !== 'kelas' && tab !== 'keaktifan' ? (
            <Select
              label="Kelas"
              placeholder="Semua kelas..."
              value={filterKelasId}
              onChange={(val) => setFilterKelasId(val ? String(val) : '')}
              options={kelasOptions}
              isClearable
            />
          ) : null}

          {tab === 'rekap' ? (
            <>
              <Input
                label="Pertemuan Ke"
                type="number"
                placeholder="Contoh: 1"
                value={filterPertemuanKe}
                onChange={(e) => setFilterPertemuanKe(e.target.value)}
              />
              <Select
                label="Status Kehadiran"
                placeholder="Semua status..."
                value={filterStatusAbsen}
                onChange={(val) => setFilterStatusAbsen(val ? String(val) : '')}
                options={LMS_PRESENSI_ABSEN_STATUS_OPTIONS}
                isClearable
              />
            </>
          ) : null}

          {tab === 'kelas' ? (
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Urut Berdasarkan"
                value={filterOrderBy}
                onChange={(val) => setFilterOrderBy(val)}
                options={LMS_PRESENSI_SORT_BY_OPTIONS}
              />
              <Select
                label="Arah"
                value={filterOrderDir}
                onChange={(val) => setFilterOrderDir(val)}
                options={SORT_ORDER_OPTIONS}
              />
            </div>
          ) : null}
        </div>
      </Drawer>

      {/* Modal export rekap / keaktifan */}
      {canManage && <Modal
        open={showExport}
        onClose={() => setShowExport(false)}
        title={tab === 'keaktifan' ? 'Export Laporan Keaktifan Dosen' : 'Export Rekap Kehadiran'}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowExport(false)} disabled={isExporting}>
              Batal
            </Button>
            <Button
              size="sm"
              icon={<Download size={16} />}
              loading={isExporting}
              disabled={isExporting}
              onClick={handleExport}
            >
              Unduh
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <Select
            label="Format Berkas"
            options={LMS_EXPORT_FORMAT_OPTIONS}
            value={exportFormat}
            onChange={(val: LmsExportFormat) => setExportFormat(val)}
            hint={
              tab === 'keaktifan'
                ? 'Laporan berisi seluruh kelas, dosen pengampu, realisasi pertemuan dari 16 sesi, dan persentase pengisian presensi.'
                : 'CSV memakai BOM UTF-8 agar karakter Indonesia tampil benar di Excel. Filter aktif pada tab Rekap Kehadiran ikut dipakai.'
            }
          />
        </div>
      </Modal>}
    </div>
  );
}
