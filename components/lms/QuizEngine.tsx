'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { lmsService } from '@/services/lms.service';
import type { LmsQuizBatch, LmsQuizBatchSoal } from '@/types/lms.types';
import { ChevronLeft, ChevronRight, Clock, Play, Send, MessageSquareText, Hourglass } from 'lucide-react';

const kodeSchema = z.object({
  kode_akses: z.string().optional().default(''),
});

type KodeFormValues = z.infer<typeof kodeSchema>;

interface JawabanState {
  bank_opsi_id?: number | null;
  jawaban_teks?: string | null;
}

interface QuizEngineProps {
  quizId: number;
}

export default function QuizEngine({ quizId }: QuizEngineProps) {
  const [meta, setMeta] = useState<any | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [batch, setBatch] = useState<LmsQuizBatch | null>(null);
  const [answers, setAnswers] = useState<Record<number, JawabanState>>({});
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const kodeForm = useForm<KodeFormValues>({
    resolver: zodResolver(kodeSchema) as any,
    defaultValues: { kode_akses: '' },
  });

  const loadBatch = useCallback(async (page: number) => {
    const res = await lmsService.getQuizBatch(quizId, page);
    if (res.status === 'success' && res.data) {
      setBatch(res.data);
      setAttemptId(res.data.attempt_id);
    }
  }, [quizId]);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await lmsService.getQuizMahasiswa(quizId);
      if (res.status === 'success' && res.data) {
        setMeta(res.data);
        const active = res.data.active_attempt;
        if (active) {
          await loadBatch(1);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat quiz');
    } finally {
      setLoading(false);
    }
  }, [quizId, loadBatch]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const doAutosave = useCallback(async () => {
    if (!attemptId || !dirtyRef.current) return;
    setSaving(true);
    try {
      const payload = Object.entries(answers).map(([quizSoalId, j]) => ({
        quiz_soal_id: Number(quizSoalId),
        bank_opsi_id: j.bank_opsi_id ?? null,
        jawaban_teks: j.jawaban_teks ?? null,
      }));
      if (payload.length === 0) return;
      const res = await lmsService.autosaveAttempt(attemptId, payload);
      if (res.data?.auto_submitted) {
        toast.success('Waktu habis — jawaban dinilai otomatis');
        const sub = await lmsService.submitAttempt(attemptId).catch(() => null);
        if (sub?.data) setResult(sub.data);
        setAttemptId(null);
        setBatch(null);
        fetchDetail();
      }
      setDirty(false);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan jawaban');
    } finally {
      setSaving(false);
    }
  }, [attemptId, answers, fetchDetail]);

  // Autosave tiap 30 detik
  useEffect(() => {
    if (!attemptId) return;
    const t = setInterval(() => {
      if (dirtyRef.current) doAutosave();
    }, 30_000);
    return () => clearInterval(t);
  }, [attemptId, doAutosave]);

  const handleStart = async (values: KodeFormValues) => {
    setStarting(true);
    try {
      const res = await lmsService.startAttempt(quizId, values.kode_akses || undefined);
      if (res.status === 'success' && res.data) {
        setAttemptId(res.data.id);
        await loadBatch(1);
        toast.success('Pengerjaan dimulai. Semangat!');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Gagal memulai pengerjaan';
      toast.error(msg);
    } finally {
      setStarting(false);
    }
  };

  const handlePage = async (page: number) => {
    await doAutosave();
    setLoading(true);
    try {
      await loadBatch(page);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat batch soal');
    } finally {
      setLoading(false);
    }
  };

  const setJawaban = (quizSoalId: number, patch: Partial<JawabanState>) => {
    setAnswers((prev) => ({ ...prev, [quizSoalId]: { ...prev[quizSoalId], ...patch } }));
    setDirty(true);
  };

  const handleSubmit = async () => {
    if (!attemptId) return;
    await doAutosave();
    setSubmitting(true);
    try {
      const res = await lmsService.submitAttempt(attemptId);
      if (res.status === 'success' && res.data) {
        setResult(res.data);
        setAttemptId(null);
        setBatch(null);
        toast.success('Quiz berhasil disubmit');
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal submit quiz');
    } finally {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  if (loading && !meta) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!meta) {
    return <EmptyState title="Quiz tidak ditemukan" description="Quiz tidak tersedia atau belum dipublikasikan." />;
  }

  // Hasil submit
  if (result) {
    return (
      <Card className="p-6 text-center space-y-4">
        <div className="text-xs text-slate-500">Nilai Anda</div>
        <div className="text-5xl font-bold text-[var(--module-primary)]">{Number(result.nilai_akhir).toFixed(2)}</div>
        {result.butuh_penilaian_manual && (
          <Badge variant="warning">Sebagian soal uraian menunggu penilaian dosen</Badge>
        )}
        <div>
          <Button size="sm" variant="outline" onClick={() => setResult(null)}>Kembali</Button>
        </div>
      </Card>
    );
  }

  // Belum mulai — kartu start
  if (!attemptId || !batch) {
    const sisa = meta.sisa_attempt ?? 0;
    return (
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-xs font-bold">{meta.quiz?.judul}</h3>
          <p className="text-xs text-slate-500">{meta.quiz?.deskripsi}</p>
        </div>
        <div className="flex gap-2 flex-wrap text-2xs">
          <Badge>{meta.total_soal} soal</Badge>
          {meta.quiz?.durasi_menit && <Badge><Clock size={12} /> {meta.quiz.durasi_menit} menit</Badge>}
          <Badge>Sisa attempt: {sisa}</Badge>
        </div>
        {(meta.quiz?.dibuka_at || meta.quiz?.ditutup_at) && (
          <div className="text-2xs text-slate-500">
            {meta.quiz?.dibuka_at && <span className="block">Dibuka: {new Date(String(meta.quiz.dibuka_at).includes(' ') && !String(meta.quiz.dibuka_at).includes('T') ? String(meta.quiz.dibuka_at).replace(' ', 'T') : meta.quiz.dibuka_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
            {meta.quiz?.ditutup_at && <span className="block">Ditutup: {new Date(String(meta.quiz.ditutup_at).includes(' ') && !String(meta.quiz.ditutup_at).includes('T') ? String(meta.quiz.ditutup_at).replace(' ', 'T') : meta.quiz.ditutup_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
        )}
        {meta.my_attempts?.length > 0 && (
          <div className="text-xs text-slate-600 space-y-2">
            {meta.my_attempts.map((a: any) => {
              const feedbackList: Array<{ label: string; teks: string }> = [];
              if (a?.feedback_dosen && String(a.feedback_dosen).trim() !== '') {
                feedbackList.push({ label: 'Respon dosen', teks: String(a.feedback_dosen) });
              }
              const jawabanArr: any[] = Array.isArray(a?.jawaban) ? a.jawaban : [];
              jawabanArr.forEach((j: any, idx: number) => {
                if (j?.feedback_dosen && String(j.feedback_dosen).trim() !== '') {
                  const no = j?.quiz_soal?.urutan ?? j?.urutan ?? idx + 1;
                  feedbackList.push({ label: `Respon soal ${no}`, teks: String(j.feedback_dosen) });
                }
              });
              return (
                <div key={a.id} className="rounded-lg border border-slate-200 p-2 space-y-1">
                  <div>
                    Percobaan {a.attempt_ke}: {a.status === 'selesai' ? `nilai ${Number(a.nilai_akhir ?? 0).toFixed(2)}` : 'berlangsung'}
                  </div>
                  {a.status === 'selesai' && a.butuh_penilaian_manual && (
                    <Badge variant="warning">
                      <Hourglass size={12} /> Menunggu koreksi dosen
                    </Badge>
                  )}
                  {feedbackList.map((f, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-slate-50 p-2 border-l-2 text-2xs text-slate-700 whitespace-pre-wrap"
                      style={{ borderColor: 'var(--module-primary)' }}
                    >
                      <span className="flex items-center gap-1 font-bold" style={{ color: 'var(--module-primary)' }}>
                        <MessageSquareText size={12} /> {f.label}
                      </span>
                      {f.teks}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        {sisa <= 0 && !meta.active_attempt ? (
          <EmptyState title="Batas percobaan habis" description="Anda sudah memakai seluruh kesempatan pengerjaan." />
        ) : (
          <form onSubmit={kodeForm.handleSubmit(handleStart)} className="space-y-4">
            {meta.quiz?.tipe === 'tryout' && (
              <Input label="Kode Akses Tryout (bila ada)" placeholder="Masukkan kode dari dosen" {...kodeForm.register('kode_akses')} />
            )}
            <Button type="submit" loading={starting} disabled={starting} icon={<Play size={16} />}>
              {meta.active_attempt ? 'Lanjutkan Pengerjaan' : 'Mulai Kerjakan'}
            </Button>
          </form>
        )}
      </Card>
    );
  }

  // Mode kerjakan
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-slate-500">
          Batch {batch.page}/{batch.total_pages} — {batch.total_soal} soal
          {saving && <span className="ml-2">Menyimpan...</span>}
        </div>
        <Button size="sm" variant="outline" icon={<Send size={16} />} onClick={() => setShowSubmitConfirm(true)}>
          Submit Jawaban
        </Button>
      </div>

      {batch.data.map((soal: LmsQuizBatchSoal) => (
        <Card key={soal.quiz_soal_id} className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold whitespace-pre-wrap">{soal.urutan}. {soal.pertanyaan}</p>
            <Badge>{soal.poin} poin</Badge>
          </div>
          {soal.gambar_path && (
            <div className="my-2 max-w-md rounded-lg overflow-hidden border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={soal.gambar_path}
                alt={`Gambar soal ${soal.urutan}`}
                className="max-h-72 w-auto object-contain bg-slate-50"
              />
            </div>
          )}
          {soal.tipe_soal === 'pilihan_ganda' ? (
            <div className="space-y-2">
              {soal.opsi.map((o) => (
                <label key={o.id} className="flex items-start gap-2 text-xs cursor-pointer rounded-lg border p-2 hover:bg-slate-50">
                  <input
                    type="radio"
                    name={`soal-${soal.quiz_soal_id}`}
                    checked={answers[soal.quiz_soal_id]?.bank_opsi_id === o.id}
                    onChange={() => setJawaban(soal.quiz_soal_id, { bank_opsi_id: o.id })}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <span>{o.teks}</span>
                    {o.gambar_path && (
                      <div className="mt-1 max-w-xs rounded overflow-hidden border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={o.gambar_path}
                          alt="Gambar opsi"
                          className="max-h-40 w-auto object-contain bg-slate-50"
                        />
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          ) : soal.tipe_soal === 'isian_singkat' ? (
            <Input
              placeholder="Tulis jawaban singkat"
              value={answers[soal.quiz_soal_id]?.jawaban_teks || ''}
              onChange={(e) => setJawaban(soal.quiz_soal_id, { jawaban_teks: e.target.value })}
            />
          ) : (
            <Textarea
              placeholder="Tulis uraian jawaban"
              value={answers[soal.quiz_soal_id]?.jawaban_teks || ''}
              onChange={(e) => setJawaban(soal.quiz_soal_id, { jawaban_teks: e.target.value })}
            />
          )}
        </Card>
      ))}

      <div className="flex items-center justify-between">
        <Button
          size="sm"
          variant="outline"
          icon={<ChevronLeft size={16} />}
          disabled={batch.page <= 1}
          onClick={() => handlePage(batch.page - 1)}
        >
          Sebelumnya
        </Button>
        <span className="text-2xs text-slate-500">Halaman {batch.page} dari {batch.total_pages}</span>
        <Button
          size="sm"
          variant="outline"
          icon={<ChevronRight size={16} />}
          disabled={batch.page >= batch.total_pages}
          onClick={() => handlePage(batch.page + 1)}
        >
          Berikutnya
        </Button>
      </div>

      <ConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={handleSubmit}
        isLoading={submitting}
        title="Submit Quiz"
        message={<span>Yakin submit? Jawaban yang sudah dikumpulkan tidak dapat diubah.</span>}
        confirmText="Submit"
        cancelText="Batal"
        variant="primary"
      />
    </div>
  );
}
