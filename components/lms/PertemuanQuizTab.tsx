'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { EmptyState } from '@/components/ui/EmptyState';
import QuizManagePanel from '@/components/lms/QuizManagePanel';
import { lmsService } from '@/services/lms.service';
import type { LmsQuizItem } from '@/types/lms.types';
import { PUBLISH_STATUS_OPTIONS } from '@/types/lms.types';
import { Plus, X, Save, Trash2, Play, Link as LinkIcon, ListChecks } from 'lucide-react';

const quizSchema = z.object({
  judul: z.string().min(1, 'Judul quiz wajib diisi'),
  durasi_menit: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().min(1, 'Durasi minimal 1 menit').max(1440).optional()
  ),
  max_attempt: z.coerce.number().min(1).max(10).default(1),
  // Boleh kosong (null = tanpa link OBE). Preprocess menormalkan ''/null/
  // undefined dari Select-clearable menjadi null agar tidak gagal validasi.
  komponen_penilaian_id: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? null : Number(v)),
    z.number().nullable().optional()
  ),
  is_published: z.coerce.boolean().default(false),
});

type QuizFormValues = z.infer<typeof quizSchema>;

interface PertemuanQuizTabProps {
  pertemuanId: number;
  kelasId: number;
  quizList: LmsQuizItem[];
  komponenObeList: Array<{ id: number; nama_komponen: string; bobot: number }>;
  isMahasiswa: boolean;
  canTeach?: boolean;
  onRefresh: () => void;
}

export default function PertemuanQuizTab({
  pertemuanId,
  kelasId,
  quizList,
  komponenObeList,
  isMahasiswa,
  canTeach = !isMahasiswa,
  onRefresh,
}: PertemuanQuizTabProps) {
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<LmsQuizItem | null>(null);
  const [manageQuizId, setManageQuizId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null; name: string }>({
    isOpen: false,
    id: null,
    name: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const quizForm = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema) as any,
    defaultValues: { judul: '', max_attempt: 1, komponen_penilaian_id: null, is_published: false },
  });

  const openCreate = () => {
    setEditingQuiz(null);
    quizForm.reset({ judul: '', max_attempt: 1, komponen_penilaian_id: null, is_published: false });
    setShowQuizModal(true);
  };

  const openEdit = (q: LmsQuizItem) => {
    setEditingQuiz(q);
    quizForm.reset({
      judul: q.judul,
      durasi_menit: q.durasi_menit as any,
      max_attempt: q.max_attempt,
      komponen_penilaian_id: (q.komponen_penilaian_id as any) ?? null,
      is_published: q.is_published,
    });
    setShowQuizModal(true);
  };

  const onSubmitQuiz = async (values: QuizFormValues) => {
    try {
      const payload: any = {
        judul: values.judul,
        durasi_menit: values.durasi_menit || null,
        max_attempt: values.max_attempt,
        komponen_penilaian_id: values.komponen_penilaian_id ?? null,
        is_published: Boolean(values.is_published),
      };
      if (editingQuiz) {
        await lmsService.updateQuiz(editingQuiz.id, payload);
        toast.success('Quiz berhasil diperbarui');
      } else {
        await lmsService.createQuiz(pertemuanId, payload);
        toast.success('Quiz berhasil dibuat. Lampirkan soal dari bank soal.');
      }
      setShowQuizModal(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan quiz');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.id) return;
    setIsDeleting(true);
    try {
      await lmsService.deleteQuiz(deleteConfirm.id);
      toast.success('Quiz berhasil dihapus');
      setDeleteConfirm({ isOpen: false, id: null, name: '' });
      if (manageQuizId === deleteConfirm.id) setManageQuizId(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus quiz');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Tampilan mahasiswa ──
  if (isMahasiswa) {
    if (quizList.length === 0) {
      return <EmptyState title="Belum ada quiz" description="Dosen belum mempublikasikan quiz pada pertemuan ini." />;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quizList.map((q) => (
          <Card key={q.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h5 className="text-xs font-bold">{q.judul}</h5>
              {q.durasi_menit ? <Badge>{q.durasi_menit} mnt</Badge> : <Badge variant="gray">Tanpa batas</Badge>}
            </div>
            <Link href={`/lms/${kelasId}/quiz/${q.id}`}>
              <Button size="sm" icon={<Play size={16} />}>Kerjakan Quiz</Button>
            </Link>
          </Card>
        ))}
      </div>
    );
  }

  // ── Tampilan dosen / pengelola ──
  return (
    <div className="space-y-4">
      {canTeach && (
        <div className="flex justify-end">
          <Button size="sm" icon={<Plus size={16} />} onClick={openCreate}>
            Buat Quiz
          </Button>
        </div>
      )}

      {quizList.length === 0 ? (
        <EmptyState title="Belum ada quiz" description="Belum ada quiz pada pertemuan ini." />
      ) : (
        <DataTable
          columns={[
            { key: 'judul', label: 'JUDUL', render: (q: LmsQuizItem) => <span className="text-xs font-semibold">{q.judul}</span> },
            { key: 'obe', label: 'OBE', render: (q: LmsQuizItem) =>
                q.komponen_penilaian_id ? (
                  <Badge variant="green"><LinkIcon size={16} /> Terhubung</Badge>
                ) : (
                  <Badge variant="gray">Tanpa link</Badge>
                ),
            },
            { key: 'status', label: 'STATUS', render: (q: LmsQuizItem) =>
                q.is_published ? <Badge variant="green">Published</Badge> : <Badge variant="yellow">Draft</Badge>,
            },
            ...(canTeach
              ? [
                  {
                    key: 'aksi',
                    label: 'AKSI',
                    align: 'right' as const,
                    render: (q: LmsQuizItem) => (
                      <DropdownMenu
                        items={[
                          {
                            label: manageQuizId === q.id ? 'Tutup Kelola' : 'Kelola Soal & Nilai',
                            icon: <ListChecks size={16} />,
                            onClick: () => setManageQuizId(manageQuizId === q.id ? null : q.id),
                          },
                          { label: 'Edit', icon: <Save size={16} />, onClick: () => openEdit(q) },
                          {
                            label: 'Hapus',
                            icon: <Trash2 size={16} />,
                            onClick: () => setDeleteConfirm({ isOpen: true, id: q.id, name: q.judul }),
                          },
                        ]}
                      />
                    ),
                  },
                ]
              : []),
          ] as ColumnDef<LmsQuizItem>[]}
          data={quizList}
          meta={{ current_page: 1, last_page: 1, per_page: quizList.length || 10, total: quizList.length }}
          onPageChange={() => {}}
        />
      )}

      {manageQuizId && <QuizManagePanel quizId={manageQuizId} onChanged={onRefresh} />}

      <Modal
        open={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        title={editingQuiz ? 'Edit Quiz' : 'Buat Quiz Baru'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" icon={<X size={16} />} onClick={() => setShowQuizModal(false)}>
              Batal
            </Button>
            <Button type="submit" form="form-quiz" loading={quizForm.formState.isSubmitting} disabled={quizForm.formState.isSubmitting} icon={<Save size={16} />}>
              Simpan Quiz
            </Button>
          </div>
        }
      >
        <form id="form-quiz" onSubmit={quizForm.handleSubmit(onSubmitQuiz)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input label="Judul Quiz" placeholder="cth: Kuis Pertemuan 3" error={quizForm.formState.errors.judul?.message} {...quizForm.register('judul')} />
          </div>
          <Input type="number" label="Durasi (menit, opsional)" error={quizForm.formState.errors.durasi_menit?.message} {...quizForm.register('durasi_menit')} />
          <Input type="number" label="Maks Attempt" error={quizForm.formState.errors.max_attempt?.message} {...quizForm.register('max_attempt')} />
          <Controller
            name="komponen_penilaian_id"
            control={quizForm.control}
            render={({ field }) => (
              <Select
                label="Link Komponen OBE (Auto-Sync)"
                value={field.value ?? ''}
                onChange={(val) => field.onChange(val ?? '')}
                placeholder="Tanpa link OBE"
                options={komponenObeList.map((k) => ({ value: String(k.id), label: `${k.nama_komponen} (${k.bobot}%)` }))}
                isClearable
                error={quizForm.formState.errors.komponen_penilaian_id?.message}
              />
            )}
          />
          <Controller
            name="is_published"
            control={quizForm.control}
            render={({ field }) => (
              <Select
                label="Publikasikan?"
                value={field.value ? '1' : '0'}
                onChange={(val) => field.onChange(val === '1')}
                options={PUBLISH_STATUS_OPTIONS}
              />
            )}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Hapus Quiz"
        message={<span>Yakin hapus <strong>{deleteConfirm.name}</strong>? Seluruh attempt ikut terhapus.</span>}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
}
