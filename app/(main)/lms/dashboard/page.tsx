'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import PeriodeAkademikSelect, { useActivePeriodeAkademik } from '@/components/lms/PeriodeAkademikSelect';
import { toTahunAkademikId } from '@/lib/kelas';
import { lmsService } from '@/services/lms.service';
import { getApiErrorMessage } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { LmsDashboardOverview } from '@/types/lms.types';
import {
  BookOpen,
  Calendar,
  CalendarClock,
  ClipboardList,
  Filter,
  Users,
  Bell,
  CheckCircle2,
  FileClock,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TREN_LEGEND = [
  { key: 'pengumpulan' as const, label: 'Pengumpulan Tugas', className: 'bg-[var(--module-primary)]' },
  { key: 'attempt' as const, label: 'Pengerjaan Tryout', className: 'bg-slate-300' },
];

export default function LmsDashboardPage() {
  const { hasPermission } = useAuth();
  const canMonitorPresensi = hasPermission('lms.presensi.read');
  const [data, setData] = useState<LmsDashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [filterTahunAkademik, setFilterTahunAkademik] = useState<string>('');
  const { activePeriodeId, periodeReady } = useActivePeriodeAkademik();

  useEffect(() => {
    if (activePeriodeId && !filterTahunAkademik) {
      setFilterTahunAkademik(activePeriodeId);
    }
  }, [activePeriodeId, filterTahunAkademik]);

  useEffect(() => {
    if (!periodeReady) return;
    let active = true;
    setIsLoading(true);

    const fetchOverview = async () => {
      try {
        const res = await lmsService.getDashboardOverview({
          tahun_akademik_id: toTahunAkademikId(filterTahunAkademik),
        });
        if (active) setData(res.data ?? null);
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Gagal memuat ringkasan LMS'));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchOverview();

    return () => {
      active = false;
    };
  }, [periodeReady, filterTahunAkademik]);

  const isMahasiswa = data?.role === 'mahasiswa';
  const isPengelola = data?.role === 'pengelola';
  const maxTren = Math.max(1, ...(data?.tren ?? []).map((t) => Math.max(t.pengumpulan, t.attempt)));

  return (
    <>
      <PageHeader
        title="Ringkasan LMS"
        description="Statistik kelas, tugas, tryout, dan aktivitas terbaru sesuai peran Anda."
        action={
          <Button
            variant="outline"
            icon={<Filter size={16} />}
            onClick={() => setShowFilter(true)}
          >
            Filter
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !data ? (
        <EmptyState
          title="Ringkasan belum tersedia"
          description="Data dashboard tidak dapat dimuat saat ini."
          icon={<BookOpen size={24} />}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="Kelas"
              value={data.ringkasan.kelas}
              icon={<BookOpen size={20} />}
              iconVariant="blue"
              footer="Kelas yang dapat Anda akses"
            />
            <StatCard
              label="Tugas Aktif"
              value={data.ringkasan.tugas_aktif}
              icon={<ClipboardList size={20} />}
              iconVariant="amber"
              footer="Deadline belum lewat"
            />
            <StatCard
              label="Tryout Aktif"
              value={data.ringkasan.tryout_aktif}
              icon={<CalendarClock size={20} />}
              iconVariant="green"
              footer="Terbit & tidak diarsipkan"
            />
            <StatCard
              label="Topik Forum"
              value={data.ringkasan.forum_topik}
              icon={<Users size={20} />}
              iconVariant="purple"
              footer="Seluruh kelas Anda"
            />
            <StatCard
              label="Notifikasi"
              value={data.ringkasan.notifikasi_belum_dibaca}
              icon={<Bell size={20} />}
              iconVariant="rose"
              footer="Belum dibaca"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Aktivitas 7 Hari Terakhir</h5>
                <div className="flex items-center gap-3">
                  {TREN_LEGEND.map((item) => (
                    <span key={item.key} className="inline-flex items-center gap-1.5 text-2xs text-slate-500">
                      <span className={`w-2.5 h-2.5 rounded-sm ${item.className}`} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-end justify-between gap-2 h-44">
                {data.tren.map((item) => (
                  <div key={item.tanggal} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="flex items-end justify-center gap-1 h-36 w-full">
                      <div
                        className="w-2.5 rounded-t bg-[var(--module-primary)] transition-all"
                        style={{ height: `${Math.max(2, (item.pengumpulan / maxTren) * 100)}%` }}
                        title={`${item.pengumpulan} pengumpulan`}
                      />
                      <div
                        className="w-2.5 rounded-t bg-slate-300 transition-all"
                        style={{ height: `${Math.max(2, (item.attempt / maxTren) * 100)}%` }}
                        title={`${item.attempt} pengerjaan tryout`}
                      />
                    </div>
                    <span className="text-2xs text-slate-500">
                      {new Date(`${item.tanggal}T00:00:00`).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {isMahasiswa
                    ? 'Tugas Anda'
                    : isPengelola
                    ? 'Status Operasional & Evaluasi Kelas'
                    : 'Menunggu Penilaian'}
                </h5>
                {isMahasiswa ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-2xs text-amber-700 font-medium block">Belum Dikumpul</span>
                      <span className="text-lg font-bold text-amber-800">{data.tambahan.tugas_belum_dikumpul ?? 0}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-2xs text-emerald-700 font-medium block">Tryout Selesai</span>
                      <span className="text-lg font-bold text-emerald-800">{data.tambahan.tryout_selesai ?? 0}</span>
                    </div>
                  </div>
                ) : isPengelola ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-2xs text-slate-600 font-medium block">Belum Dikonfigurasi</span>
                      <span className="text-lg font-bold text-slate-800">
                        {data.tambahan.kelas_belum_dikonfigurasi ?? 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-2xs text-amber-700 font-medium block">Tugas Belum Dinilai</span>
                      <span className="text-lg font-bold text-amber-800">
                        {data.tambahan.pengumpulan_belum_dinilai ?? 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                      <span className="text-2xs text-blue-700 font-medium block">Attempt Belum Dinilai</span>
                      <span className="text-lg font-bold text-blue-800">
                        {data.tambahan.attempt_belum_dinilai ?? 0}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-2xs text-amber-700 font-medium flex items-center gap-1">
                        <FileClock size={12} /> Pengumpulan
                      </span>
                      <span className="text-lg font-bold text-amber-800">
                        {data.tambahan.pengumpulan_belum_dinilai ?? 0}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                      <span className="text-2xs text-blue-700 font-medium flex items-center gap-1">
                        <CheckCircle2 size={12} /> Attempt
                      </span>
                      <span className="text-lg font-bold text-blue-800">
                        {data.tambahan.attempt_belum_dinilai ?? 0}
                      </span>
                    </div>
                  </div>
                )}
                <p className="text-2xs text-slate-500">
                  {isMahasiswa
                    ? 'Segera kumpulkan tugas sebelum deadline agar tidak terlambat.'
                    : isPengelola
                    ? 'Ringkasan pengawasan operasional kelas dan progres penilaian dosen pengampu.'
                    : 'Buka tab Hasil pada kelas/tryout untuk memberi nilai.'}
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Akses Cepat</h5>
                {(isPengelola
                  ? [
                      ...(canMonitorPresensi
                        ? [{ href: '/lms/presensi?tab=keaktifan', label: 'Monitoring Keaktifan Mengajar' }]
                        : []),
                      { href: '/lms', label: 'Daftar Kelas Perkuliahan' },
                      { href: '/lms/pengaturan', label: 'Pengaturan Kelas LMS' },
                      { href: '/lms/pengaturan/modul', label: 'Pengaturan Modul LMS' },
                    ]
                  : [
                      { href: '/lms', label: 'Daftar Kelas' },
                      { href: '/lms/tryout', label: 'Tryout' },
                      { href: '/lms/forum', label: 'Forum Diskusi' },
                      { href: '/lms/notifikasi', label: 'Notifikasi' },
                    ]
                ).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {link.label}
                    <ArrowRight size={14} style={{ color: 'var(--module-primary)' }} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter"
        footer={
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => {
                setFilterTahunAkademik(activePeriodeId);
                setShowFilter(false);
              }}
            >
              Reset
            </Button>
            <Button onClick={() => setShowFilter(false)}>
              Terapkan
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <PeriodeAkademikSelect
            label="Tahun Akademik"
            placeholder="Pilih periode akademik..."
            value={filterTahunAkademik}
            onChange={(val) => setFilterTahunAkademik(val || '')}
            isClearable={false}
          />
        </div>
      </Drawer>
    </>
  );
}
