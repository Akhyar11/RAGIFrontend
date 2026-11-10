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
  CalendarClock,
  ClipboardList,
  Filter,
  Users,
  Bell,
  CheckCircle2,
  FileClock,
  ArrowRight,
  BookOpenText,
  Clock3,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TREN_LEGEND = [
  { key: 'pengumpulan' as const, label: 'Pengumpulan Tugas', className: 'bg-[var(--module-primary)]' },
  { key: 'attempt' as const, label: 'Pengerjaan Tryout', className: 'bg-slate-300' },
];

function formatDashboardDate(value: string | null, includeTime = false): string {
  if (!value) return 'Tanpa tenggat';

  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

type DashboardDeadlineActivity = {
  id: string;
  href: string;
  jenis: 'tugas' | 'kuis' | 'tryout';
  judul: string;
  deadline_at: string | null;
  dibuka_at: string | null;
  kelas_id: number;
  pertemuan_id: number | null;
  kode_kelas: string;
  nama_kelas: string;
  mata_kuliah: { id: number; kode: string; nama: string } | null;
  belum_dinilai: number | null;
};

export default function LmsDashboardPage() {
  const { hasPermission } = useAuth();
  const canMonitorPresensi = hasPermission('lms.presensi.read');
  const [data, setData] = useState<LmsDashboardOverview | null>(null);
  const [loadedPeriode, setLoadedPeriode] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [activeClassTab, setActiveClassTab] = useState<'hari_ini' | 'semua'>('hari_ini');
  const [filterTahunAkademik, setFilterTahunAkademik] = useState<string>('');
  const { activePeriodeId, periodeReady } = useActivePeriodeAkademik();
  const effectivePeriode = filterTahunAkademik || activePeriodeId;
  const periodeKey = effectivePeriode || '';
  const isLoading = !periodeReady || loadedPeriode !== periodeKey;

  useEffect(() => {
    if (!periodeReady) return;
    let active = true;

    const fetchOverview = async () => {
      try {
        const res = await lmsService.getDashboardOverview({
          tahun_akademik_id: toTahunAkademikId(effectivePeriode),
        });
        if (active) setData(res.data ?? null);
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Gagal memuat ringkasan LMS'));
      } finally {
        if (active) setLoadedPeriode(periodeKey);
      }
    };

    fetchOverview();

    return () => {
      active = false;
    };
  }, [periodeReady, effectivePeriode, periodeKey]);

  const isMahasiswa = data?.role === 'mahasiswa';
  const isPengelola = data?.role === 'pengelola';
  const maxTren = Math.max(1, ...(data?.tren ?? []).map((t) => Math.max(t.pengumpulan, t.attempt)));
  const deadlineActivities: DashboardDeadlineActivity[] = data
    ? [
        ...data.preview.tugas.map((tugas) => ({
          id: `tugas-${tugas.id}`,
          href: `/lms/${tugas.kelas_id}/pertemuan/${tugas.pertemuan_id}`,
          jenis: 'tugas' as const,
          judul: tugas.judul,
          deadline_at: tugas.deadline_at,
          dibuka_at: null,
          kelas_id: tugas.kelas_id,
          pertemuan_id: tugas.pertemuan_id,
          kode_kelas: tugas.kode_kelas,
          nama_kelas: tugas.nama_kelas,
          mata_kuliah: tugas.mata_kuliah,
          belum_dinilai: tugas.belum_dinilai,
        })),
        ...data.preview.kuis.map((kuis) => ({
          id: `${kuis.tipe}-${kuis.id}`,
          href: isMahasiswa
            ? `/lms/${kuis.kelas_id}/quiz/${kuis.id}`
            : kuis.pertemuan_id
            ? `/lms/${kuis.kelas_id}/pertemuan/${kuis.pertemuan_id}`
            : `/lms/${kuis.kelas_id}`,
          jenis: kuis.tipe,
          judul: kuis.judul,
          deadline_at: kuis.deadline_at,
          dibuka_at: kuis.dibuka_at,
          kelas_id: kuis.kelas_id,
          pertemuan_id: kuis.pertemuan_id,
          kode_kelas: kuis.kode_kelas,
          nama_kelas: kuis.nama_kelas,
          mata_kuliah: kuis.mata_kuliah,
          belum_dinilai: null,
        })),
      ].sort((a, b) => {
        if (!a.deadline_at) return b.deadline_at ? 1 : 0;
        if (!b.deadline_at) return -1;
        return new Date(a.deadline_at).getTime() - new Date(b.deadline_at).getTime();
      })
    : [];
  const selectedClasses = data?.jadwal.kelas[activeClassTab] ?? [];
  const hariIniLabel = data?.jadwal.hari_ini
    ? `${data.jadwal.hari_ini.charAt(0).toUpperCase()}${data.jadwal.hari_ini.slice(1)}`
    : '';

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

          {!isPengelola && (
            <section className="card">
              <div className="card-header flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold flex items-center gap-2">
                    <CalendarClock size={18} />
                    {isMahasiswa ? 'Mata Kuliah & Jadwal' : 'Jadwal Mengajar'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {activeClassTab === 'hari_ini'
                      ? `${hariIniLabel} · ${formatDashboardDate(data.jadwal.tanggal)}`
                      : 'Jadwal dan kelas pada periode akademik terpilih'}
                  </p>
                </div>
                <div className="flex border-b border-slate-200 gap-1" role="tablist" aria-label="Daftar kelas">
                  {([
                    ['hari_ini', 'Hari Ini'],
                    ['semua', 'Semua Mata Kuliah'],
                  ] as const).map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={activeClassTab === tab}
                      aria-controls="lms-dashboard-classes"
                      onClick={() => setActiveClassTab(tab)}
                      className={`px-3 py-2 text-xs font-semibold whitespace-nowrap ${
                        activeClassTab === tab
                          ? 'rounded-t-lg border-b-2 border-[var(--module-primary)] bg-[var(--module-primary-subtle)] text-[var(--module-primary)]'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {label}
                      <span className="ml-1.5 text-2xs">
                        ({data.jadwal.kelas[tab].length})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="card-body" id="lms-dashboard-classes" role="tabpanel">
                {selectedClasses.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {selectedClasses.map((kelas) => (
                      <li key={kelas.id} className="py-3 first:pt-0 last:pb-0">
                        <Link
                          href={`/lms/${kelas.id}`}
                          className="group flex flex-wrap items-center justify-between gap-3"
                        >
                          <span className="min-w-0">
                            <span className="block font-medium text-slate-900 group-hover:text-[var(--module-primary)]">
                              {kelas.mata_kuliah?.nama || kelas.nama_kelas}
                            </span>
                            <span className="mt-1 block text-sm text-slate-500">
                              {kelas.mata_kuliah?.kode ? `${kelas.mata_kuliah.kode} · ` : ''}
                              {kelas.kode_kelas} · {kelas.nama_kelas}
                            </span>
                          </span>
                          <span className="flex items-center gap-2 text-xs text-slate-600">
                            {kelas.hari && kelas.jam_mulai && kelas.jam_selesai ? (
                              <>
                                <Clock3 size={14} />
                                <span>
                                  {kelas.hari.charAt(0).toUpperCase() + kelas.hari.slice(1)}, {kelas.jam_mulai.slice(0, 5)}–{kelas.jam_selesai.slice(0, 5)}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-400">Jadwal belum diatur di SIAKAD</span>
                            )}
                            <ArrowRight size={16} className="text-slate-400 group-hover:text-[var(--module-primary)]" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={<BookOpen size={22} />}
                    title={
                      activeClassTab === 'hari_ini'
                        ? 'Tidak ada jadwal kelas hari ini'
                        : 'Belum ada mata kuliah pada periode ini'
                    }
                    description={
                      activeClassTab === 'hari_ini'
                        ? 'Kelas pada hari ini dari jadwal akademik SIAKAD akan muncul di sini.'
                        : isMahasiswa
                        ? 'Mata kuliah yang tercantum pada KRS aktif Anda akan muncul di sini.'
                        : 'Kelas yang ditugaskan kepada Anda di SIAKAD akan muncul di sini.'
                    }
                  />
                )}
              </div>
            </section>
          )}

          {!isPengelola && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <section className="card">
                <div className="card-header flex items-center justify-between gap-3">
                  <h2 className="font-semibold flex items-center gap-2">
                    <ClipboardList size={18} />
                    {isMahasiswa ? 'Tugas & Kuis yang perlu dikerjakan' : 'Tugas & Kuis kelas Anda'}
                  </h2>
                  <Link href="/lms/pertemuan" className="text-sm font-medium text-[var(--module-primary)] hover:underline">
                    Lihat semua
                  </Link>
                </div>
                <div className="card-body">
                  {deadlineActivities.length > 0 ? (
                    <ul className="divide-y divide-slate-100">
                      {deadlineActivities.map((activity) => (
                        <li key={activity.id} className="py-3 first:pt-0 last:pb-0">
                          <Link
                            href={activity.href}
                            className="group flex items-start justify-between gap-3"
                          >
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="block font-medium text-slate-900 group-hover:text-[var(--module-primary)]">
                                  {activity.judul}
                                </span>
                                <span className={activity.jenis === 'tugas' ? 'badge badge-blue' : 'badge badge-purple'}>
                                  {activity.jenis === 'tugas' ? 'Tugas' : activity.jenis === 'tryout' ? 'Tryout' : 'Kuis'}
                                </span>
                              </span>
                              <span className="mt-1 block text-sm text-slate-500">
                                {activity.mata_kuliah?.nama || activity.nama_kelas} · {activity.kode_kelas}
                              </span>
                              <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                                <Clock3 size={13} />
                                {activity.jenis === 'tugas' ? 'Deadline' : 'Tutup'}: {formatDashboardDate(activity.deadline_at, true)}
                              </span>
                              {activity.jenis !== 'tugas' && activity.dibuka_at && (
                                <span className="mt-1 block text-xs text-slate-500">
                                  Dibuka: {formatDashboardDate(activity.dibuka_at, true)}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-right">
                              {isMahasiswa ? (
                                <span className="badge badge-amber">
                                  {activity.jenis === 'tugas' ? 'Belum dikumpulkan' : 'Kuis tersedia'}
                                </span>
                              ) : activity.jenis === 'tugas' ? (
                                <span className="text-xs text-slate-500">
                                  {activity.belum_dinilai ?? 0} perlu dinilai
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500">Kuis terbit</span>
                              )}
                              <ArrowRight size={16} className="ml-auto mt-2 text-slate-400 group-hover:text-[var(--module-primary)]" />
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState
                      icon={<ClipboardList size={22} />}
                      title={isMahasiswa ? 'Tidak ada tugas atau kuis mendatang' : 'Belum ada tugas atau kuis aktif'}
                      description={
                        isMahasiswa
                          ? 'Tugas dan kuis dari mata kuliah pada KRS Anda akan muncul di sini.'
                          : 'Tugas dan kuis yang dipublikasikan di kelas yang Anda ampu akan muncul di sini.'
                      }
                    />
                  )}
                </div>
              </section>

              <section className="card">
                <div className="card-header flex items-center justify-between gap-3">
                  <h2 className="font-semibold flex items-center gap-2">
                    <BookOpenText size={18} />
                    Materi terbaru
                  </h2>
                  <Link href="/lms/pertemuan" className="text-sm font-medium text-[var(--module-primary)] hover:underline">
                    Lihat semua
                  </Link>
                </div>
                <div className="card-body">
                  {data.preview.materi.length > 0 ? (
                    <ul className="divide-y divide-slate-100">
                      {data.preview.materi.map((materi) => (
                        <li key={materi.id} className="py-3 first:pt-0 last:pb-0">
                          <Link
                            href={`/lms/${materi.kelas_id}/pertemuan/${materi.pertemuan_id}`}
                            className="group flex items-start justify-between gap-3"
                          >
                            <span className="min-w-0">
                              <span className="block font-medium text-slate-900 group-hover:text-[var(--module-primary)]">
                                {materi.judul}
                              </span>
                              <span className="mt-1 block text-sm text-slate-500">
                                {materi.mata_kuliah?.nama || materi.nama_kelas} · {materi.kode_kelas}
                              </span>
                              <span className="mt-1 block text-xs text-slate-500">
                                Diperbarui {formatDashboardDate(materi.updated_at)}
                              </span>
                            </span>
                            <ArrowRight size={16} className="mt-1 shrink-0 text-slate-400 group-hover:text-[var(--module-primary)]" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState
                      icon={<BookOpenText size={22} />}
                      title="Belum ada materi terbaru"
                      description="Materi yang diterbitkan dari kelas Anda akan muncul di sini."
                    />
                  )}
                </div>
              </section>
            </div>
          )}

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
                      { href: '/lms', label: 'Kelas' },
                      { href: '/lms/pengaturan', label: 'Pengaturan Kelas LMS' },
                      { href: '/lms/pengaturan/modul', label: 'Pengaturan Modul LMS' },
                    ]
                  : [
                      { href: '/lms', label: 'Kelas' },
                      { href: '/lms/tryout', label: 'Tryout' },
                      { href: '/lms/forum', label: 'Diskusi' },
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
          value={effectivePeriode}
            onChange={(val) => setFilterTahunAkademik(val || '')}
            isClearable={false}
          />
        </div>
      </Drawer>
    </>
  );
}
