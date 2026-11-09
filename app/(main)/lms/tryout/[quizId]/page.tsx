'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { lmsService } from '@/services/lms.service';
import type { LmsQuizItem, LmsTryoutPeserta } from '@/types/lms.types';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import {
  ListChecks,
  Users,
  CalendarDays,
  BarChart3,
  Award,
  Eye,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import TryoutSoalTab from '@/components/lms/tryout/TryoutSoalTab';
import TryoutPesertaTab from '@/components/lms/tryout/TryoutPesertaTab';
import TryoutJadwalTab from '@/components/lms/tryout/TryoutJadwalTab';
import TryoutHasilTab from '@/components/lms/tryout/TryoutHasilTab';
import TryoutNilaiTab from '@/components/lms/tryout/TryoutNilaiTab';
import TryoutPreviewTab from '@/components/lms/tryout/TryoutPreviewTab';
import ExportLaporanModal from '@/components/lms/ExportLaporanModal';
import { formatJadwal } from '@/components/lms/tryout/tryoutHelpers';

type KelolaTab = 'soal' | 'peserta' | 'jadwal' | 'hasil' | 'nilai' | 'preview';

const TAB_ORDER: KelolaTab[] = ['soal', 'peserta', 'jadwal', 'hasil', 'nilai', 'preview'];

const TAB_LABEL: Record<KelolaTab, string> = {
  soal: 'Soal',
  peserta: 'Peserta',
  jadwal: 'Jadwal & Publikasi',
  hasil: 'Hasil & Grading',
  nilai: 'Nilai ke MK',
  preview: 'Preview',
};

function isValidTab(v: string | null): v is KelolaTab {
  return (TAB_ORDER as string[]).includes(v || '');
}

interface PageProps {
  params: Promise<{ quizId: string }>;
}

export default function KelolaTryoutPage({ params }: PageProps) {
  const { quizId } = use(params);
  const id = Number(quizId);
  const searchParams = useSearchParams();
  const { hasPermission, hasRole, isDosen } = useAuth();
  const canManage = isDosen || hasRole('dosen_pengajar') || hasPermission('siakad.kelas.manage');

  const initialTab: KelolaTab = isValidTab(searchParams.get('tab')) ? (searchParams.get('tab') as KelolaTab) : 'soal';
  const [activeTab, setActiveTab] = useState<KelolaTab>(initialTab);
  const [quiz, setQuiz] = useState<LmsQuizItem | null>(null);
  const [soal, setSoal] = useState<any[]>([]);
  const [peserta, setPeserta] = useState<LmsTryoutPeserta[]>([]);
  const [totalSoal, setTotalSoal] = useState(0);
  const [totalPoin, setTotalPoin] = useState(0);
  const [totalAttempt, setTotalAttempt] = useState(0);
  const [krsCount, setKrsCount] = useState<number | null>(null);
  const [komponenObe, setKomponenObe] = useState<Array<{ id: number; nama_komponen: string; bobot: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [hasilRefreshKey, setHasilRefreshKey] = useState(0);
  const [showExport, setShowExport] = useState(false);
  const canExportHasil = hasPermission('siakad.nilai.manage');

  const fetchManage = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    setLoading(true);
    try {
      const res = await lmsService.getQuizManage(id);
      if (res.status === 'success' && res.data) {
        const raw: any = res.data;
        const q: LmsQuizItem = raw.quiz || raw;
        setQuiz(q);
        setSoal(raw.quiz?.soal || raw.soal || []);
        setPeserta(raw.quiz?.tryout_peserta || raw.tryout_peserta || []);
        setTotalSoal(raw.total_soal ?? raw.quiz?.soal?.length ?? 0);
        setTotalPoin(Number(raw.total_poin || 0));
        setTotalAttempt(raw.total_attempt ?? 0);
        // OBE kelas untuk tab Nilai ke MK
        const kelasId = q.kelas_id || raw.quiz?.kelas_id;
        if (kelasId) {
          try {
            const ov = await lmsService.getKelasOverview(Number(kelasId));
            if (ov.status === 'success' && ov.data) {
              setKomponenObe(ov.data.komponen_obe || []);
              setKrsCount(ov.data.statistik?.total_mahasiswa_krs ?? null);
            }
          } catch {
            // overview opsional — abaikan bila gagal
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat tryout');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchManage();
  }, [fetchManage]);

  const refreshAll = useCallback(() => {
    fetchManage();
    setHasilRefreshKey((k) => k + 1);
  }, [fetchManage]);

  if (!canManage) {
    return (
      <div className="w-full space-y-4">
        <PageHeader
          title="Kelola Tryout"
          description="Pengelolaan tryout khusus dosen pengampu."
          breadcrumbs={[{ label: 'LMS', href: '/lms' }, { label: 'Tryout', href: '/lms/tryout' }, { label: 'Kelola' }]}
          backUrl="/lms/tryout"
        />
        <EmptyState title="Akses ditolak" description="Anda tidak memiliki izin mengelola tryout." />
      </div>
    );
  }

  const tabBtn = (key: KelolaTab, label: string, icon: React.ReactNode) => (
    <Button
      key={key}
      type="button"
      variant="tab"
      onClick={() => setActiveTab(key)}
      className={`flex items-center gap-2 p-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
        activeTab === key
          ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)]'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Button>
  );

  // ── Status kesiapan tryout untuk callout terbit ──
  const soalOk = totalSoal > 0;
  const pesertaOk = (krsCount || 0) > 0 || peserta.length > 0;
  const jadwalOk = Boolean(quiz?.dibuka_at && quiz?.ditutup_at && quiz?.durasi_menit);
  const siapTerbit = soalOk && pesertaOk && jadwalOk;
  const activeIdx = TAB_ORDER.indexOf(activeTab);

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title={quiz ? `Kelola Tryout — ${quiz.judul}` : 'Kelola Tryout'}
        description={
          quiz
            ? `${
                quiz.kelas
                  ? `${quiz.kelas.nama_kelas || ''}${quiz.kelas.mata_kuliah?.nama ? ` • ${quiz.kelas.mata_kuliah.nama}` : ''}`
                  : 'Ujian Khusus (Di Luar Mata Kuliah)'
              } • ${totalSoal} soal${
                quiz.kolaborators?.length ? ` • ${quiz.kolaborators.length} Dosen` : ''
              } • Buka: ${formatJadwal(quiz.dibuka_at)} • Tutup: ${formatJadwal(quiz.ditutup_at)}`
            : 'Memuat detail tryout...'
        }
        breadcrumbs={[{ label: 'LMS', href: '/lms' }, { label: 'Tryout', href: '/lms/tryout' }, { label: 'Kelola' }]}
        backUrl="/lms/tryout"
        action={
          quiz ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={quiz.is_archived ? 'gray' : quiz.is_published ? 'green' : 'amber'}>
                {quiz.is_archived ? 'Diarsipkan' : quiz.is_published ? 'Terbit' : 'Draft'}
              </Badge>
              {canExportHasil && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Download size={16} />}
                  onClick={() => setShowExport(true)}
                >
                  Export Hasil
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {loading || !quiz ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          {/* Info kesiapan terbit */}
          <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            {!quiz.is_published && siapTerbit && (
              <p className="mt-2 text-2xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                Siap diterbitkan — buka tab Jadwal & Publikasi lalu tekan Terbitkan agar mahasiswa bisa mengerjakan.
              </p>
            )}
            {!quiz.is_published && !siapTerbit && (
              <p className="mt-2 text-2xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>
                  Belum siap terbit:
                  {!soalOk ? ' tambah soal dulu' : ''}
                  {!soalOk && (!pesertaOk || !jadwalOk) ? ' •' : ''}{!pesertaOk ? ' tentukan peserta' : ''}
                  {(!soalOk || !pesertaOk) && !jadwalOk ? ' •' : ''}{!jadwalOk ? ' atur jadwal' : ''}
                </span>
              </p>
            )}
          </div>

          <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
            {tabBtn('soal', 'Soal', <ListChecks size={16} />)}
            {tabBtn('peserta', 'Peserta', <Users size={16} />)}
            {tabBtn('jadwal', 'Jadwal & Publikasi', <CalendarDays size={16} />)}
            {tabBtn('hasil', 'Hasil & Grading', <BarChart3 size={16} />)}
            {tabBtn('nilai', 'Nilai ke MK', <Award size={16} />)}
            {tabBtn('preview', 'Preview', <Eye size={16} />)}
          </div>

          {activeTab === 'soal' && (
            <TryoutSoalTab
              quizId={id}
              soal={soal}
              totalSoal={totalSoal}
              totalPoin={totalPoin}
              totalAttempt={totalAttempt}
              kolaborators={quiz.kolaborators || []}
              onChanged={refreshAll}
            />
          )}
          {activeTab === 'peserta' && (
            <TryoutPesertaTab
              quizId={id}
              kelasId={quiz.kelas_id}
              peserta={peserta}
              krsCount={krsCount}
              kodeAkses={(quiz as any).kode_akses}
              onChanged={refreshAll}
            />
          )}
          {activeTab === 'jadwal' && <TryoutJadwalTab quiz={quiz} onChanged={refreshAll} />}
          {activeTab === 'hasil' && <TryoutHasilTab quizId={id} refreshKey={hasilRefreshKey} />}
          {activeTab === 'nilai' && <TryoutNilaiTab quiz={quiz} komponenObe={komponenObe} onChanged={refreshAll} />}
          {activeTab === 'preview' && <TryoutPreviewTab quizId={id} />}

          {/* Navigasi langkah sebelum/sesudah */}
          <div className="flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="outline"
              icon={<ChevronLeft size={16} />}
              disabled={activeIdx <= 0}
              onClick={() => setActiveTab(TAB_ORDER[activeIdx - 1])}
            >
              {activeIdx > 0 ? TAB_LABEL[TAB_ORDER[activeIdx - 1]] : 'Awal'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={<ChevronRight size={16} />}
              disabled={activeIdx >= TAB_ORDER.length - 1}
              onClick={() => setActiveTab(TAB_ORDER[activeIdx + 1])}
              style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
            >
              {activeIdx < TAB_ORDER.length - 1 ? `Lanjut: ${TAB_LABEL[TAB_ORDER[activeIdx + 1]]}` : 'Akhir'}
            </Button>
          </div>
        </>
      )}

      {/* Modal Export Hasil Tryout (dosen) */}
      <ExportLaporanModal
        open={showExport}
        onClose={() => setShowExport(false)}
        scope={{ quizId: id }}
        jenis={['tryout']}
      />
    </div>
  );
}
