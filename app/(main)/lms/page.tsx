'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { lmsService } from '@/services/lms.service';
import { siakadService } from '@/services/siakad.service';
import PeriodeAkademikSelect from '@/components/lms/PeriodeAkademikSelect';
import { toTahunAkademikId } from '@/lib/kelas';
import {
  LmsKelasItem,
  KELAS_SORT_BY_OPTIONS,
  LMS_SETTING_DEFAULT,
} from '@/types/lms.types';
import { SORT_ORDER_OPTIONS } from '@/lib/constants';
import { PaginationMeta } from '@/types/api.types';
import {
  Filter,
  BookOpen,
  Users,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  Clock,
  MapPin,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

function extractOptionValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'object' && val !== null && 'value' in (val as Record<string, unknown>)) {
    const v = (val as { value: unknown }).value;
    return v === null || v === undefined ? '' : String(v);
  }
  return String(val);
}

export default function LmsKelasListPage() {
  const router = useRouter();
  const { hasRole, hasPermission, isDosen: isAuthDosen, is_loading: isAuthLoading } = useAuth();
  const isMahasiswa = hasRole('mahasiswa');
  const isDosen = isAuthDosen || hasRole('dosen_pengajar');
  const canMonitorPresensi = hasPermission('lms.presensi.read');
  const isPengelola = !isMahasiswa && !isDosen && canMonitorPresensi;

  const [kelasList, setKelasList] = useState<LmsKelasItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [perPage] = useState<number>(9);
  const [meta, setMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 9,
    total: 0,
  });

  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterProdi, setFilterProdi] = useState<string>('');
  const [filterTahunAkademik, setFilterTahunAkademik] = useState<string>('');
  const [filterKapasitas, setFilterKapasitas] = useState<string>('');
  const [filterOrderBy, setFilterOrderBy] = useState<string>('nama_kelas');
  const [filterOrderDir, setFilterOrderDir] = useState<string>('asc');
  const [periodeReady, setPeriodeReady] = useState<boolean>(false);
  const [activePeriodeId, setActivePeriodeId] = useState<string>('');

  const loadProdiOptions = useCallback(async (inputValue: string) => {
    try {
      const res = await siakadService.getProdi({ search: inputValue || undefined, per_page: 20 });
      const rows: any[] = Array.isArray(res?.data) ? res.data : [];
      return rows.map((r: any) => ({
        value: String(r.id),
        label: r.nama,
      }));
    } catch {
      return [];
    }
  }, []);

  // Default ke periode aktif saat pertama kali dibuka.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await siakadService.getTahunAkademiks();
        const rows: any[] = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
        const aktif = rows.find((t: any) => t.is_aktif || t.is_active);
        if (!cancelled && aktif) {
          const idStr = String(aktif.id);
          setActivePeriodeId(idStr);
          setFilterTahunAkademik((prev) => prev || idStr);
        }
      } catch {
        // abaikan — user bisa pilih manual via PeriodeSwitcher
      } finally {
        if (!cancelled) setPeriodeReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchKelas = useCallback(
    async (targetPage = 1) => {
      setIsLoading(true);
      try {
        const res = await lmsService.getMyKelas({
          page: targetPage,
          per_page: perPage,
          search: filterSearch || undefined,
          sort_by: filterOrderBy || 'nama_kelas',
          sort_order: (filterOrderDir as 'asc' | 'desc') || 'asc',
          tahun_akademik_id: toTahunAkademikId(filterTahunAkademik),
          program_studi_id: filterProdi ? Number(filterProdi) : undefined,
          min_kapasitas: filterKapasitas ? Number(filterKapasitas) : undefined,
        });

        if (res.status === 'success' && res.data) {
          setKelasList(res.data);
          if (res.meta) setMeta(res.meta);
          setPage(targetPage);
        } else {
          setKelasList([]);
        }
      } catch (err: any) {
        toast.error(err.message || 'Gagal memuat daftar kelas LMS');
        setKelasList([]);
      } finally {
        setIsLoading(false);
      }
    },
    [filterSearch, filterProdi, filterKapasitas, filterOrderBy, filterOrderDir, filterTahunAkademik, perPage]
  );

  useEffect(() => {
    if (!periodeReady || isAuthLoading) return;
    fetchKelas(1);
  }, [fetchKelas, isAuthLoading, periodeReady]);

  const handleApplyFilter = () => {
    setShowFilter(false);
    fetchKelas(1);
  };

  const handleResetFilter = () => {
    setFilterSearch('');
    setFilterProdi('');
    setFilterTahunAkademik(activePeriodeId);
    setFilterKapasitas('');
    setFilterOrderBy('nama_kelas');
    setFilterOrderDir('asc');
    setShowFilter(false);
  };

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Kelas"
        description="Daftar kelas dan aktivitas pembelajaran sesuai akses Anda."
        breadcrumbs={[{ label: 'LMS', href: '/lms' }, { label: isPengelola ? 'Daftar Kelas Perkuliahan' : 'Kelas Saya' }]}
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
          </div>
        }
      />

      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-500">
              {isMahasiswa
                ? 'Total Kelas Diikuti'
                : isPengelola
                ? 'Total Kelas Terdaftar'
                : 'Total Kelas Diampu'}
            </div>
            <div className="text-lg font-bold text-slate-800">{meta.total} Kelas Aktif</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-500">Standar Pertemuan</div>
            <div className="text-lg font-bold text-slate-800">
              {LMS_SETTING_DEFAULT.total_pertemuan} Pertemuan / Kelas
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-500">Metode Presensi</div>
            <div className="text-lg font-bold text-slate-800">Token QR & Manual Dosen</div>
          </div>
        </div>
      </div>

      {/* PeriodeSwitcher prominent */}
      <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--module-primary-subtle)', color: 'var(--module-primary)' }}
          >
            <CalendarDays size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Periode Akademik</div>
            <div className="text-2xs text-slate-500">
              Default menampilkan periode aktif. Ubah pilihan di samping untuk membuka periode lama.
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <PeriodeAkademikSelect
            label=""
            placeholder="Pilih periode akademik SIAKAD (default periode aktif)..."
            value={filterTahunAkademik}
            onChange={(val) => setFilterTahunAkademik(val)}
          />
        </div>
      </div>

      {/* Grid card kelas */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 bg-white rounded-xl border border-slate-200 animate-pulse space-y-2">
              <div className="h-3 bg-slate-100 rounded w-1/3" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : kelasList.length === 0 ? (
        <div className="p-4 bg-white rounded-xl border border-slate-200/80">
          <EmptyState
            title="Belum ada kelas"
            description="Belum ada kelas perkuliahan pada periode ini."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kelasList.map((row) => {
            const mk = row.mata_kuliah;
            const dosenNames =
              row.dosen_pengampu && row.dosen_pengampu.length > 0
                ? row.dosen_pengampu
                    .map((d) => d.dosen?.nama_lengkap || d.peran)
                    .filter(Boolean)
                    .join(', ')
                : '-';
            const info = row as unknown as Record<string, any>;
            const jadwal = info.jadwal || info.jadwal_kuliah || '-';
            const ruang = info.ruang || info.ruang_kelas || '-';
            const progress = info.progress_persen ?? info.progres ?? null;
            const kehadiran = info.kehadiran_persen ?? info.persentase_hadir ?? null;
            const tugas = info.tugas_info ?? info.ringkasan_tugas ?? null;
            return (
              <div
                key={row.id}
                className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-2 hover:border-slate-300 hover:shadow-xs transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xs font-mono font-bold text-slate-500">
                    {mk?.kode_mk || row.kode_kelas}
                  </span>
                  <Badge variant={row.tahun_akademik?.is_aktif ? 'green' : 'gray'}>
                    {row.tahun_akademik?.nama || '-'}
                  </Badge>
                </div>
                <h4 className="text-xs font-bold text-slate-900 line-clamp-2">
                  {mk?.nama || row.nama_kelas}
                </h4>
                <div className="text-2xs text-slate-500">
                  {row.nama_kelas} • {mk?.total_sks ?? 0} SKS
                </div>
                <div className="space-y-2 text-2xs text-slate-600 border-t border-slate-100 pt-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={14} className="shrink-0 text-slate-400" />
                    <span className="truncate">{dosenNames}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="shrink-0 text-slate-400" />
                    <span className="truncate">{jadwal}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="shrink-0 text-slate-400" />
                    <span className="truncate">{ruang}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={14} className="shrink-0 text-slate-400" />
                    <span>
                      {row.program_studi?.nama || '-'} • Kapasitas {row.kapasitas}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-2xs">
                  <span className="text-slate-500">
                    Progres: <strong className="text-slate-800">{progress ?? '-'}</strong>
                  </span>
                  <span className="text-slate-500">
                    Hadir/Tugas:{' '}
                    <strong className="text-slate-800">
                      {kehadiran ?? tugas ?? '-'}
                    </strong>
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  icon={<ArrowRight size={16} />}
                  style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
                  onClick={() => router.push(`/lms/${row.id}`)}
                >
                  Buka Kelas
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination sederhana */}
      <div className="p-4 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-4">
        <span className="text-2xs text-slate-500">
          Hal {meta.current_page} dari {meta.last_page} • Total {meta.total} kelas
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<ChevronLeft size={16} />}
            disabled={meta.current_page <= 1 || isLoading}
            onClick={() => fetchKelas(meta.current_page - 1)}
          >
            Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={<ChevronRight size={16} />}
            disabled={meta.current_page >= meta.last_page || isLoading}
            onClick={() => fetchKelas(meta.current_page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Kelas LMS"
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
            label="Pencarian Kelas / Mata Kuliah"
            placeholder="Cari kode kelas, nama kelas, atau nama MK..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />

          <AsyncSelect
            label="Program Studi"
            placeholder="Cari atau pilih Program Studi..."
            value={filterProdi}
            onChange={(val) => setFilterProdi(extractOptionValue(val))}
            loadOptions={loadProdiOptions}
            isClearable
          />

          <PeriodeAkademikSelect
            label="Tahun Akademik"
            placeholder="Periode aktif (default)..."
            value={filterTahunAkademik}
            onChange={(val) => setFilterTahunAkademik(val)}
            hint="Kosongkan untuk semua periode."
          />

          <Input
            type="number"
            label="Minimal Kapasitas Kelas"
            placeholder="Contoh: 30"
            value={filterKapasitas}
            onChange={(e) => setFilterKapasitas(e.target.value)}
          />

          <hr className="border-t border-slate-200 my-4" />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              value={filterOrderBy}
              onChange={(val) => setFilterOrderBy(val)}
              options={KELAS_SORT_BY_OPTIONS}
            />
            <Select
              label="Arah"
              value={filterOrderDir}
              onChange={(val) => setFilterOrderDir(val)}
              options={SORT_ORDER_OPTIONS}
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
