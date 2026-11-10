'use client';

import { useCallback, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import KelasSelect from '@/components/lms/KelasSelect';
import { lmsService } from '@/services/lms.service';
import { siakadService } from '@/services/siakad.service';
import { getApiErrorMessage } from '@/lib/utils';
import type { LmsTryoutPeserta } from '@/types/lms.types';
import { Copy, Check, Trash2, KeyRound, Users } from 'lucide-react';
import TryoutKolaboratorCard, { TambahPesertaForm } from './TryoutKolaboratorCard';
import { extractOptionValue } from './tryoutHelpers';

const pesertaKelasSchema = z
  .object({
    kelas: z.string().optional().default(''),
    program_studi_id: z.string().optional().default(''),
    angkatan: z.string().optional().default(''),
    kelas_perkuliahan_id: z.string().optional().default(''),
  })
  .superRefine((val, ctx) => {
    const hasKelas = Boolean(val.kelas && val.kelas.trim() !== '');
    const hasProdi = Boolean(val.program_studi_id && val.program_studi_id.trim() !== '');
    const hasAngkatan = Boolean(val.angkatan && val.angkatan.trim() !== '');
    const hasKelasKuliah = Boolean(val.kelas_perkuliahan_id && val.kelas_perkuliahan_id.trim() !== '');

    if (!hasKelas && !hasProdi && !hasAngkatan && !hasKelasKuliah) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['kelas'],
        message: 'Isi minimal satu filter batch (Kelas Mahasiswa, Program Studi, Tahun Angkatan, atau Kelas Perkuliahan).',
      });
    }
    if (hasKelas && !/^[0-9]{2}[A-Za-z0-9\-]{1,10}$/.test(val.kelas.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['kelas'],
        message: 'Format kelas mahasiswa tidak valid. Gunakan 2 digit angkatan + huruf, cth: 25A',
      });
    }
  });

type PesertaKelasFormValues = z.infer<typeof pesertaKelasSchema>;

const currentYear = new Date().getFullYear();
const ANGKATAN_OPTIONS = [
  { value: '', label: 'Semua Tahun Angkatan' },
  ...Array.from({ length: 8 }, (_, idx) => {
    const yr = String(currentYear + 1 - idx);
    return { value: yr, label: `Angkatan ${yr}` };
  }),
];

const salinPesertaSchema = z.object({
  source_quiz_id: z.string().min(1, 'Tryout sumber wajib dipilih.'),
});

type SalinPesertaFormValues = z.infer<typeof salinPesertaSchema>;

function SalinPesertaForm({
  quizId,
  kelasId,
  onCopied,
}: {
  quizId: number;
  kelasId?: number | null;
  onCopied: () => void;
}) {
  const form = useForm<SalinPesertaFormValues>({
    resolver: zodResolver(salinPesertaSchema) as any,
    defaultValues: { source_quiz_id: '' },
  });

  const loadTryoutOptions = useCallback(async () => {
    try {
      if (kelasId) {
        const res = await lmsService.listTryout(kelasId);
        return (res.data || [])
          .filter((q) => q.id !== quizId)
          .map((q) => ({ value: String(q.id), label: q.judul }));
      }
      const res = await lmsService.listTryoutSaya({ per_page: 100 });
      return (res.data || [])
        .filter((q) => q.id !== quizId)
        .map((q) => ({
          value: String(q.id),
          label: `${q.judul}${q.kelas?.nama_kelas ? ` (${q.kelas.nama_kelas})` : ' (Ujian Khusus)'}`,
        }));
    } catch {
      return [];
    }
  }, [kelasId, quizId]);

  const onSubmit = async (values: SalinPesertaFormValues) => {
    try {
      const res = await lmsService.copyTryoutPeserta(quizId, Number(values.source_quiz_id));
      const data = res.data ?? { added: 0, skipped: 0, source_quiz_id: 0 };
      toast.success(
        `Berhasil menyalin ${data.added} peserta${data.skipped ? ` (${data.skipped} dilewati karena sudah terdaftar)` : ''}`
      );
      form.reset({ source_quiz_id: '' });
      onCopied();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Gagal menyalin peserta'));
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
      <Controller
        name="source_quiz_id"
        control={form.control}
        render={({ field }) => (
          <AsyncSelect
            label="Tryout Sumber"
            placeholder={kelasId ? 'Pilih tryout pada kelas ini...' : 'Pilih tryout sumber...'}
            value={field.value}
            onChange={(val) => field.onChange(extractOptionValue(val))}
            loadOptions={loadTryoutOptions}
            isClearable
            error={form.formState.errors.source_quiz_id?.message}
          />
        )}
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          type="submit"
          variant="outline"
          icon={<Copy size={16} />}
          loading={form.formState.isSubmitting}
          disabled={form.formState.isSubmitting}
        >
          Salin Peserta
        </Button>
      </div>
    </form>
  );
}

function TambahPesertaKelasForm({ quizId, onAdded }: { quizId: number; onAdded: () => void }) {
  const form = useForm<PesertaKelasFormValues>({
    resolver: zodResolver(pesertaKelasSchema) as any,
    defaultValues: { kelas: '', program_studi_id: '', angkatan: '', kelas_perkuliahan_id: '' },
  });

  const loadProdiOptions = useCallback(async (inputValue: string) => {
    try {
      const res: any = await siakadService.getProdi({ search: inputValue || undefined, per_page: 20 });
      const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
      return items.map((p: any) => ({
        value: String(p.id),
        label: `${p.nama || p.nama_prodi || `Prodi #${p.id}`}${p.jenjang ? ` (${p.jenjang})` : ''}`,
      }));
    } catch {
      return [];
    }
  }, []);

  const onSubmit = async (values: PesertaKelasFormValues) => {
    try {
      const kelas = (values.kelas || '').trim().toUpperCase();
      const prodiVal = (values.program_studi_id || '').trim();
      const angkatanVal = (values.angkatan || '').trim();
      const kelasKuliahVal = (values.kelas_perkuliahan_id || '').trim();
      const payload: {
        kelas?: string;
        program_studi_id?: number;
        angkatan?: number;
        kelas_perkuliahan_id?: number;
      } = {};
      if (kelas) payload.kelas = kelas;
      if (prodiVal) payload.program_studi_id = Number(prodiVal);
      if (angkatanVal) payload.angkatan = Number(angkatanVal);
      if (kelasKuliahVal) payload.kelas_perkuliahan_id = Number(kelasKuliahVal);

      const res: any = await lmsService.addTryoutPesertaByKelas(quizId, payload);
      const added = Number(res?.data?.added ?? res?.data?.added_count ?? res?.data?.created_count ?? 0);
      const skipped = Number(res?.data?.skipped_count ?? res?.data?.skipped ?? 0);
      toast.success(res?.message || `${added} peserta batch ditambahkan (${skipped} dilewati/sudah terdaftar)`);
      form.reset({ kelas: '', program_studi_id: '', angkatan: '', kelas_perkuliahan_id: '' });
      onAdded();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal menambah peserta per batch');
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Controller
        name="kelas"
        control={form.control}
        render={({ field }) => (
          <Input
            label="Kelas Mahasiswa (opsional)"
            placeholder="cth: 25A, 24B"
            maxLength={10}
            value={field.value}
            onChange={(e) => field.onChange(e.target.value.toUpperCase().slice(0, 10))}
            onBlur={field.onBlur}
            hint="Format: 2 digit angkatan + huruf kelas (cth: 25A)"
            error={form.formState.errors.kelas?.message}
          />
        )}
      />
      <Controller
        name="angkatan"
        control={form.control}
        render={({ field }) => (
          <Select
            label="Tahun Angkatan (opsional)"
            value={field.value || ''}
            onChange={(val) => field.onChange(extractOptionValue(val))}
            options={ANGKATAN_OPTIONS}
          />
        )}
      />
      <Controller
        name="program_studi_id"
        control={form.control}
        render={({ field }) => (
          <AsyncSelect
            label="Program Studi (opsional)"
            placeholder="Semua prodi..."
            value={field.value}
            onChange={(val) => field.onChange(extractOptionValue(val))}
            loadOptions={loadProdiOptions}
            isClearable
            error={form.formState.errors.program_studi_id?.message}
          />
        )}
      />
      <Controller
        name="kelas_perkuliahan_id"
        control={form.control}
        render={({ field }) => (
          <KelasSelect
            label="Dari KRS Kelas Perkuliahan (opsional)"
            placeholder="Semua kelas perkuliahan..."
            value={field.value || ''}
            onChange={(val) => field.onChange(extractOptionValue(val))}
          />
        )}
      />
      <div className="md:col-span-2 flex justify-end">
        <Button
          size="sm"
          type="submit"
          icon={<Users size={16} />}
          loading={form.formState.isSubmitting}
          disabled={form.formState.isSubmitting}
        >
          Tambahkan Batch Peserta
        </Button>
      </div>
    </form>
  );
}

interface TryoutPesertaTabProps {
  quizId: number;
  kelasId?: number | null;
  peserta: LmsTryoutPeserta[];
  krsCount: number | null;
  kodeAkses?: string | null;
  onChanged: () => void;
}

export default function TryoutPesertaTab({ quizId, kelasId, peserta, krsCount, kodeAkses, onChanged }: TryoutPesertaTabProps) {
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ isOpen: boolean; id: number | null; name: string }>({
    isOpen: false,
    id: null,
    name: '',
  });
  const [deleting, setDeleting] = useState(false);

  const handleCopyKode = async () => {
    if (!kodeAkses) return;
    try {
      await navigator.clipboard.writeText(kodeAkses);
      setCopied(true);
      toast.success('Kode akses disalin');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin kode akses');
    }
  };

  const handleRemove = async () => {
    if (!deleteTarget.id) return;
    setDeleting(true);
    try {
      await lmsService.removeTryoutPeserta(deleteTarget.id);
      toast.success('Peserta dihapus');
      setDeleteTarget({ isOpen: false, id: null, name: '' });
      onChanged();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus peserta');
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<LmsTryoutPeserta>[] = [
    {
      key: 'mahasiswa',
      label: 'MAHASISWA',
      render: (p) => (
        <div>
          <span className="font-bold text-slate-800 text-xs block">{p.mahasiswa?.nama_lengkap || `ID #${p.mahasiswa_id}`}</span>
          <span className="text-2xs text-slate-500 font-mono block">{p.mahasiswa?.nim || '-'}</span>
        </div>
      ),
    },
    {
      key: 'kelas_angkatan',
      label: 'KELAS & ANGKATAN',
      render: (p) => (
        <span className="text-xs text-slate-600">
          {[p.mahasiswa?.kelas, p.mahasiswa?.angkatan ? `Angkatan ${p.mahasiswa.angkatan}` : null]
            .filter(Boolean)
            .join(' • ') || '-'}
        </span>
      ),
    },
    {
      key: 'prodi',
      label: 'PROGRAM STUDI',
      render: (p) => (
        <span className="text-xs text-slate-600">{p.mahasiswa?.program_studi?.nama || '-'}</span>
      ),
    },
    {
      key: 'aksi',
      label: 'AKSI',
      align: 'right',
      render: (p) => (
        <div className="flex justify-end">
          <DropdownMenu
            items={[
              {
                label: 'Hapus',
                icon: <Trash2 size={16} />,
                onClick: () =>
                  setDeleteTarget({
                    isOpen: true,
                    id: p.id,
                    name: p.mahasiswa?.nama_lengkap || `#${p.mahasiswa_id}`,
                  }),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-500">
              {kelasId ? 'Peserta otomatis (KRS kelas)' : 'Mode Peserta Tryout'}
            </div>
            <div className="text-xs font-bold text-slate-800">
              {kelasId
                ? krsCount === null || krsCount === undefined
                  ? '-'
                  : `${krsCount} mahasiswa`
                : `Ujian Khusus (${peserta.length} peserta batch)`}
            </div>
            <div className="text-2xs text-slate-400">
              {kelasId
                ? 'Seluruh mahasiswa KRS aktif dapat mengerjakan.'
                : 'Peserta diambil dari batch Kelas, Program Studi, atau Tahun Angkatan.'}
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--module-primary-subtle)', color: 'var(--module-primary)' }}
          >
            <KeyRound size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500">Kode Akses</div>
            {kodeAkses ? (
              <div className="flex items-center gap-2">
                <code className="text-xs font-bold font-mono text-slate-800">{kodeAkses}</code>
                <Button size="sm" variant="outline" icon={copied ? <Check size={16} /> : <Copy size={16} />} onClick={handleCopyKode}>
                  {copied ? 'Disalin' : 'Salin'}
                </Button>
              </div>
            ) : (
              <Badge variant="gray">Terbuka (tanpa kode)</Badge>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-4 space-y-4">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Peserta Eksplisit ({peserta.length})
        </h5>
        <TambahPesertaForm quizId={quizId} onAdded={onChanged} />
        <hr className="border-t border-slate-100" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: 'var(--module-primary)' }} />
            <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Tambah Batch Peserta (Kelas, Prodi & Tahun Angkatan)
            </h6>
          </div>
          <TambahPesertaKelasForm quizId={quizId} onAdded={onChanged} />
        </div>
        <hr className="border-t border-slate-100" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Copy size={16} style={{ color: 'var(--module-primary)' }} />
            <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700">Salin dari Tryout Lain</h6>
          </div>
          <SalinPesertaForm quizId={quizId} kelasId={kelasId} onCopied={onChanged} />
        </div>
        <DataTable
          columns={columns}
          data={peserta}
          meta={{ current_page: 1, last_page: 1, per_page: peserta.length || 10, total: peserta.length }}
          onPageChange={() => {}}
          emptyMessage="Belum ada peserta eksplisit. Mahasiswa KRS tetap dapat mengerjakan otomatis."
        />
      </Card>

      <TryoutKolaboratorCard quizId={quizId} />

      <ConfirmDialog
        isOpen={deleteTarget.isOpen}
        onClose={() => setDeleteTarget({ isOpen: false, id: null, name: '' })}
        onConfirm={handleRemove}
        isLoading={deleting}
        title="Hapus Peserta"
        message={<span>Yakin hapus <strong>{deleteTarget.name}</strong> dari peserta tryout?</span>}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
}
