'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Input } from '@/components/ui/Input';
import { siakadService } from '@/services/siakad.service';
import { BankSoalOpsi } from '@/types/bank-soal.types';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const opsiSchema = z.object({
  teks: z.string().min(1, 'Teks opsi wajib diisi.'),
  gambar_path: z.string().optional().default(''),
  is_benar: z.boolean().default(false),
});

type OpsiValues = z.infer<typeof opsiSchema>;

function opsiLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

export default function OpsiManager({ soalId, tipeSoal }: { soalId: number; tipeSoal: string }) {
  const [opsiList, setOpsiList] = useState<BankSoalOpsi[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<BankSoalOpsi | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const form = useForm<OpsiValues>({
    resolver: zodResolver(opsiSchema) as any,
    defaultValues: { teks: '', gambar_path: '', is_benar: false },
  });

  const sortedOpsi = useMemo(
    () => [...opsiList].sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0) || a.id - b.id),
    [opsiList]
  );

  const fetchOpsi = async () => {
    setLoading(true);
    try {
      const res: any = await siakadService.getSoalDetail(soalId);
      const row = res.data;
      const list = Array.isArray(row?.opsi) ? row.opsi : Array.isArray(row?.options) ? row.options : [];
      setOpsiList(list);
    } catch {
      setOpsiList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpsi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soalId]);

  const resetForm = () => {
    setEditingId(null);
    form.reset({ teks: '', gambar_path: '', is_benar: false });
  };

  const startEdit = (row: BankSoalOpsi) => {
    setEditingId(row.id);
    form.reset({
      teks: row.teks || '',
      gambar_path: row.gambar_path || '',
      is_benar: !!row.is_benar,
    });
  };

  const onSubmit = async (values: OpsiValues) => {
    const payload = {
      teks: values.teks.trim(),
      gambar_path: values.gambar_path?.trim() || null,
      is_benar: values.is_benar,
    };

    try {
      if (editingId) {
        const current = sortedOpsi.find((o) => o.id === editingId);
        await siakadService.updateOpsi(soalId, editingId, {
          ...payload,
          urutan: current?.urutan ?? sortedOpsi.length + 1,
        });
        toast.success('Opsi berhasil diperbarui.');
      } else {
        await siakadService.saveOpsi(soalId, {
          ...payload,
          urutan: sortedOpsi.length + 1,
        });
        toast.success('Opsi berhasil ditambahkan.');
      }
      resetForm();
      await fetchOpsi();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan opsi.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await siakadService.deleteOpsi(soalId, deleteTarget.id);
      toast.success('Opsi berhasil dihapus.');
      if (editingId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      await fetchOpsi();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menghapus opsi.');
    } finally {
      setDeleting(false);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sortedOpsi.length) return;
    const current = sortedOpsi[index];
    const target = sortedOpsi[targetIndex];
    setReordering(true);
    try {
      await Promise.all([
        siakadService.updateOpsi(soalId, current.id, {
          teks: current.teks,
          gambar_path: current.gambar_path ?? null,
          is_benar: !!current.is_benar,
          urutan: target.urutan ?? targetIndex + 1,
        }),
        siakadService.updateOpsi(soalId, target.id, {
          teks: target.teks,
          gambar_path: target.gambar_path ?? null,
          is_benar: !!target.is_benar,
          urutan: current.urutan ?? index + 1,
        }),
      ]);
      await fetchOpsi();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengubah urutan opsi.');
    } finally {
      setReordering(false);
    }
  };

  if (tipeSoal !== 'pilihan_ganda') return null;

  const correctCount = sortedOpsi.filter((o) => o.is_benar).length;
  const hasMinimumOptions = sortedOpsi.length >= 2;
  const hasSingleCorrect = correctCount === 1;

  const columns: ColumnDef<BankSoalOpsi>[] = [
    {
      key: 'label',
      label: 'LABEL',
      align: 'center',
      render: (_row, idx) => (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-xs font-semibold text-slate-700">
          {opsiLabel(idx)}
        </span>
      ),
    },
    {
      key: 'teks',
      label: 'OPSI',
      render: (row) => (
        <div className="space-y-1">
          <span className="text-xs text-slate-800 block whitespace-pre-wrap">{row.teks}</span>
          {row.gambar_path && (
            <div className="max-w-xs rounded overflow-hidden border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={row.gambar_path} alt="Gambar opsi" className="max-h-24 w-auto object-contain bg-slate-50" />
            </div>
          )}
          <span className="text-2xs text-slate-500 block">Urutan {row.urutan}</span>
        </div>
      ),
    },
    {
      key: 'benar',
      label: 'STATUS',
      align: 'center',
      render: (row) => <Badge variant={row.is_benar ? 'green' : 'gray'}>{row.is_benar ? 'Benar' : 'Salah'}</Badge>,
    },
    {
      key: 'aksi',
      label: 'AKSI',
      align: 'right',
      render: (row) => {
        const index = sortedOpsi.findIndex((o) => o.id === row.id);
        return (
          <div className="flex justify-end">
            <DropdownMenu
              items={[
                {
                  label: 'Edit',
                  icon: <Pencil size={14} />,
                  onClick: () => startEdit(row),
                  disabled: reordering,
                },
                {
                  label: 'Naik',
                  icon: <ArrowUp size={14} />,
                  onClick: () => handleMove(index, -1),
                  disabled: reordering || index <= 0,
                },
                {
                  label: 'Turun',
                  icon: <ArrowDown size={14} />,
                  onClick: () => handleMove(index, 1),
                  disabled: reordering || index >= sortedOpsi.length - 1,
                },
                {
                  label: 'Hapus',
                  icon: <Trash2 size={14} />,
                  onClick: () => setDeleteTarget(row),
                  variant: 'danger',
                  disabled: reordering,
                },
              ]}
            />
          </div>
        );
      },
    },
  ];

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Kelola Opsi Pilihan Ganda</h5>
        <span className="text-2xs text-slate-500">{sortedOpsi.length} opsi • {correctCount} jawaban benar</span>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-2xs text-slate-600 space-y-1">
        <p>Minimal 2 opsi dan tepat 1 jawaban benar untuk soal pilihan ganda.</p>
        {!hasMinimumOptions && <p className="text-amber-700">Tambahkan minimal {2 - sortedOpsi.length} opsi lagi.</p>}
        {sortedOpsi.length > 0 && !hasSingleCorrect && (
          <p className="text-amber-700">
            {correctCount === 0 ? 'Pilih satu opsi sebagai jawaban benar.' : 'Hanya satu opsi yang boleh ditandai benar.'}
          </p>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Teks Opsi"
            placeholder="Tulis teks opsi jawaban..."
            error={form.formState.errors.teks?.message}
            disabled={reordering}
            {...form.register('teks')}
          />
          <Input
            label="URL / Path Gambar Opsi (Opsional)"
            placeholder="Contoh: https://domain.ac.id/opsi-a.png"
            error={form.formState.errors.gambar_path?.message}
            disabled={reordering}
            {...form.register('gambar_path')}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Checkbox label="Tandai sebagai jawaban benar" disabled={reordering} {...form.register('is_benar')} />
          <div className="flex gap-2">
            {editingId && (
              <Button type="button" variant="secondary" size="sm" icon={<X size={16} />} onClick={resetForm} disabled={form.formState.isSubmitting}>
                Batal
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              icon={editingId ? <Pencil size={16} /> : <Plus size={16} />}
              loading={form.formState.isSubmitting}
              disabled={form.formState.isSubmitting || reordering}
            >
              {editingId ? 'Simpan Opsi' : 'Tambah Opsi'}
            </Button>
          </div>
        </div>
      </form>

      <DataTable
        columns={columns}
        data={sortedOpsi}
        isLoading={loading}
        emptyMessage="Belum ada opsi. Tambahkan opsi di atas."
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="Hapus Opsi"
        message={`Yakin menghapus opsi "${deleteTarget?.teks?.slice(0, 60) || ''}"?`}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
      />
    </Card>
  );
}
