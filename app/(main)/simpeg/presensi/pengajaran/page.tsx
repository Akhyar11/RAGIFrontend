'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarClock, Filter, Plus, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/hooks/useAuth';
import { getApiErrorMessage } from '@/lib/utils';
import { simpegService } from '@/services/simpeg.service';
import type {
  PresensiPengajaranCutoff,
  PresensiPengajaranException,
  PresensiPengajaranRow,
} from '@/types/simpeg.types';
import type { PaginationMeta } from '@/types/api.types';

const cutoffSchema = z.object({
  cutoff_at: z.string().min(1, 'Tanggal dan waktu cut-off wajib diisi'),
});
type CutoffValues = z.infer<typeof cutoffSchema>;

const exceptionSchema = z.object({
  dosen_id: z.number().int().min(1, 'Dosen wajib dipilih'),
  valid_until: z.string().min(1, 'Masa berlaku wajib diisi'),
  reason: z.string().min(10, 'Alasan minimal 10 karakter').max(2000, 'Alasan maksimal 2000 karakter'),
});
type ExceptionValues = z.infer<typeof exceptionSchema>;

const revokeSchema = z.object({
  reason: z.string().min(10, 'Alasan pencabutan minimal 10 karakter').max(2000, 'Alasan maksimal 2000 karakter'),
});
type RevokeValues = z.infer<typeof revokeSchema>;

const emptyMeta: PaginationMeta = { current_page: 1, last_page: 1, per_page: 15, total: 0 };

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function toLocalDateTimeInput(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function PresensiPengajaranPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('simpeg.presensi.pengajaran.read');
  const canManage = hasPermission('simpeg.presensi.pengajaran.manage');

  const [period, setPeriod] = useState(currentPeriod);
  const [periodDraft, setPeriodDraft] = useState(currentPeriod);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [rows, setRows] = useState<PresensiPengajaranRow[]>([]);
  const [exceptions, setExceptions] = useState<PresensiPengajaranException[]>([]);
  const [cutoff, setCutoff] = useState<PresensiPengajaranCutoff | null>(null);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCutoff, setIsSavingCutoff] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedException, setSelectedException] = useState<PresensiPengajaranException | null>(null);

  const cutoffForm = useForm<CutoffValues>({
    resolver: zodResolver(cutoffSchema),
    defaultValues: { cutoff_at: '' },
  });
  const resetCutoffForm = cutoffForm.reset;
  const exceptionForm = useForm<ExceptionValues>({
    resolver: zodResolver(exceptionSchema),
    defaultValues: { dosen_id: 0, valid_until: '', reason: '' },
  });
  const revokeForm = useForm<RevokeValues>({
    resolver: zodResolver(revokeSchema),
    defaultValues: { reason: '' },
  });

  const loadData = useCallback(async () => {
    if (!canRead) {
      return;
    }

    try {
      const [reportResponse, cutoffResponse, exceptionResponse] = await Promise.all([
        simpegService.getPresensiPengajaran({
          periode: period,
          page: meta.current_page,
          per_page: meta.per_page,
          search: search || undefined,
          sort_by: 'nama_lengkap',
          sort_order: 'asc',
        }),
        simpegService.getPresensiPengajaranCutoff(period),
        simpegService.getPresensiPengajaranExceptions({
          periode: period,
          page: 1,
          per_page: 100,
          search: search || undefined,
        }),
      ]);

      setRows(reportResponse.data || []);
      if (reportResponse.meta) setMeta(reportResponse.meta);
      setCutoff(cutoffResponse.data || null);
      setExceptions(exceptionResponse.data || []);
      resetCutoffForm({ cutoff_at: toLocalDateTimeInput(cutoffResponse.data?.cutoff_at) });
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Gagal memuat monitoring presensi pengajaran.'));
      setRows([]);
      setExceptions([]);
      setCutoff(null);
    } finally {
      setIsLoading(false);
    }
  }, [canRead, meta.current_page, meta.per_page, period, resetCutoffForm, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const applyFilter = () => {
    setIsLoading(true);
    setPeriod(periodDraft);
    setSearch(searchDraft.trim());
    setMeta((current) => ({ ...current, current_page: 1 }));
    setShowFilter(false);
  };

  const resetFilter = () => {
    const nextPeriod = currentPeriod();
    setIsLoading(true);
    setPeriodDraft(nextPeriod);
    setPeriod(nextPeriod);
    setSearchDraft('');
    setSearch('');
    setMeta((current) => ({ ...current, current_page: 1 }));
    setShowFilter(false);
  };

  const saveCutoff = async (values: CutoffValues) => {
    setIsSavingCutoff(true);
    try {
      const response = await simpegService.updatePresensiPengajaranCutoff({
        periode: period,
        cutoff_at: values.cutoff_at,
      });
      setCutoff(response.data || null);
      toast.success('Cut-off periode berhasil disimpan.');
      setIsLoading(true);
      await loadData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Gagal menyimpan cut-off.'));
    } finally {
      setIsSavingCutoff(false);
    }
  };

  const grantException = async (values: ExceptionValues) => {
    setIsGranting(true);
    try {
      await simpegService.grantPresensiPengajaranException({
        ...values,
        periode: period,
      });
      toast.success('Izin khusus berhasil diberikan dan tercatat.');
      setShowGrantModal(false);
      exceptionForm.reset({ dosen_id: 0, valid_until: '', reason: '' });
      setIsLoading(true);
      await loadData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Gagal memberikan izin khusus.'));
    } finally {
      setIsGranting(false);
    }
  };

  const revokeException = async (values: RevokeValues) => {
    if (!selectedException) return;
    setIsRevoking(true);
    try {
      await simpegService.revokePresensiPengajaranException(selectedException.id, values.reason);
      toast.success('Izin khusus berhasil dicabut.');
      setSelectedException(null);
      revokeForm.reset({ reason: '' });
      setIsLoading(true);
      await loadData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Gagal mencabut izin khusus.'));
    } finally {
      setIsRevoking(false);
    }
  };

  const reportColumns: ColumnDef<PresensiPengajaranRow>[] = useMemo(
    () => [
      {
        key: 'nama_dosen',
        label: 'DOSEN',
        render: (row) => (
          <div>
            <div className="font-semibold">{row.nama_dosen}</div>
            <div className="text-xs text-slate-500">{row.nidn || 'NIDN tidak tersedia'}</div>
          </div>
        ),
      },
      {
        key: 'kelas',
        label: 'KELAS / MATA KULIAH',
        render: (row) => (
          <div className="space-y-1">
            {row.kelas.map((kelas) => (
              <div key={kelas.kelas_id} className="text-xs">
                <span className="font-medium">{kelas.kode_kelas}</span>
                <span className="text-slate-500"> — {kelas.mata_kuliah || kelas.nama_kelas}</span>
                <span className="ml-1 text-2xs text-slate-500">({kelas.pertemuans.length} pertemuan)</span>
              </div>
            ))}
          </div>
        ),
      },
      { key: 'pertemuan_terlaksana', label: 'TERLAKSANA', render: (row) => row.pertemuan_terlaksana },
      { key: 'presensi_terisi', label: 'PRESENSI TERISI', render: (row) => row.presensi_terisi },
      { key: 'presensi_belum_diisi', label: 'BELUM DIISI', render: (row) => row.presensi_belum_diisi },
      {
        key: 'status_pemenuhan',
        label: 'INDIKATOR',
        render: (row) => (
          <Badge variant={row.status_pemenuhan === 'lengkap' ? 'green' : 'amber'}>
            {row.status_pemenuhan === 'lengkap' ? 'Lengkap' : 'Perlu dilengkapi'}
          </Badge>
        ),
      },
    ],
    []
  );

  const exceptionColumns: ColumnDef<PresensiPengajaranException>[] = useMemo(
    () => [
      {
        key: 'dosen',
        label: 'DOSEN',
        render: (row) => row.dosen?.nama_lengkap || `Dosen #${row.dosen_id}`,
      },
      { key: 'valid_until', label: 'BERLAKU HINGGA', render: (row) => formatDateTime(row.valid_until) },
      { key: 'reason', label: 'ALASAN', render: (row) => row.reason },
      {
        key: 'is_active',
        label: 'STATUS',
        render: (row) => (
          <Badge variant={row.is_active ? 'green' : 'gray'}>
            {row.revoked_at ? 'Dicabut' : row.is_active ? 'Aktif' : 'Kedaluwarsa'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        label: 'AKSI',
        align: 'right',
        render: (row) => row.is_active && canManage
          ? (
            <DropdownMenu items={[{
              label: 'Cabut izin',
              icon: <Trash2 size={14} />,
              variant: 'danger',
              onClick: () => {
                setSelectedException(row);
                revokeForm.reset({ reason: '' });
              },
            }]} />
          )
          : <span className="text-xs text-slate-400">-</span>,
      },
    ],
    [canManage, revokeForm]
  );

  const lecturerOptions = useMemo(
    () => rows
      .filter((row) => row.user_id !== null)
      .map((row) => ({ value: String(row.dosen_id), label: `${row.nama_dosen}${row.nidn ? ` (${row.nidn})` : ''}` })),
    [rows]
  );

  if (!canRead) {
    return (
      <div className="space-y-4">
        <PageHeader title="Monitoring Presensi Pengajaran" breadcrumbs={[{ label: 'SIMPEG', href: '/simpeg' }, { label: 'Monitoring Pengajaran' }]} />
        <div className="card card-body">Anda tidak memiliki izin untuk melihat monitoring ini.</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Monitoring Presensi Pengajaran"
        description="Rekap pertemuan dan kelengkapan presensi berdasarkan penugasan dosen-kelas dari SIAKAD. Laporan ini hanya indikator dan tidak mengubah payroll."
        breadcrumbs={[
          { label: 'SIMPEG', href: '/simpeg' },
          { label: 'Presensi', href: '/simpeg/presensi' },
          { label: 'Monitoring Pengajaran' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" icon={<Filter size={16} />} onClick={() => setShowFilter(true)}>Filter</Button>
            {canManage && (
              <Button icon={<Plus size={16} />} onClick={() => setShowGrantModal(true)}>Izin Khusus</Button>
            )}
          </div>
        }
      />

      <section className="card">
        <div className="card-header flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Cut-off Pengisian Presensi</h2>
            <p className="text-sm text-slate-500">Periode {period}; setelah batas ini semua perubahan dikunci kecuali dosen yang mendapat izin aktif.</p>
          </div>
          <Badge variant={cutoff?.is_closed ? 'red' : cutoff?.cutoff_at ? 'green' : 'gray'}>
            {cutoff?.is_closed ? 'Terkunci' : cutoff?.cutoff_at ? 'Terjadwal' : 'Belum diatur'}
          </Badge>
        </div>
        <div className="card-body">
          <form onSubmit={cutoffForm.handleSubmit(saveCutoff)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Controller
              control={cutoffForm.control}
              name="cutoff_at"
              render={({ field }) => (
                <Input
                  type="datetime-local"
                  label="Tanggal dan waktu cut-off"
                  value={field.value}
                  onChange={field.onChange}
                  error={cutoffForm.formState.errors.cutoff_at?.message}
                  disabled={!canManage}
                />
              )}
            />
            {canManage && (
              <Button type="submit" icon={<CalendarClock size={16} />} loading={isSavingCutoff}>
                Simpan Cut-off
              </Button>
            )}
          </form>
        </div>
      </section>

      <DataTable
        columns={reportColumns}
        data={rows}
        isLoading={isLoading}
        meta={meta}
        onPageChange={(nextPage) => {
          setIsLoading(true);
          setMeta((current) => ({ ...current, current_page: nextPage }));
        }}
        emptyMessage="Belum ada data pertemuan SIAKAD pada periode yang dipilih."
      />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-600" />
          <h2 className="font-semibold">Izin Khusus Periode {period}</h2>
        </div>
        <DataTable
          columns={exceptionColumns}
          data={exceptions}
          isLoading={isLoading}
          emptyMessage="Belum ada izin khusus untuk periode ini."
        />
      </section>

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <ShieldAlert size={18} className="mt-0.5 shrink-0" />
        <p>Data ini membantu Admin SIMPEG meninjau tanggung jawab pengajaran. Data LMS/SIAKAD tidak digunakan untuk menghitung nominal gaji atau menjalankan payroll.</p>
      </div>

      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Monitoring Pengajaran"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetFilter}>Reset</Button>
            <Button onClick={applyFilter}>Terapkan</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            type="month"
            label="Periode"
            value={periodDraft}
            onChange={(event) => setPeriodDraft(event.target.value)}
          />
          <Input
            label="Pencarian"
            placeholder="Nama dosen, NIDN, kelas, atau mata kuliah"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
        </div>
      </Drawer>

      <Modal
        open={showGrantModal}
        onClose={() => setShowGrantModal(false)}
        title="Berikan Izin Khusus"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowGrantModal(false)}>Batal</Button>
            <Button loading={isGranting} onClick={exceptionForm.handleSubmit(grantException)}>Setujui Izin</Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={exceptionForm.handleSubmit(grantException)}>
          <p className="text-sm text-slate-600">
            Izin berlaku untuk semua pertemuan dosen terpilih pada periode {period}, sampai waktu kedaluwarsa. Pemberian izin dan alasannya tercatat di audit log.
          </p>
          <Controller
            control={exceptionForm.control}
            name="dosen_id"
            render={({ field }) => (
              <Select
                label="Dosen"
                value={field.value ? String(field.value) : ''}
                onChange={(value) => field.onChange(Number(value))}
                options={[{ value: '', label: 'Pilih dosen' }, ...lecturerOptions]}
                error={exceptionForm.formState.errors.dosen_id?.message}
              />
            )}
          />
          <Controller
            control={exceptionForm.control}
            name="valid_until"
            render={({ field }) => (
              <Input
                type="datetime-local"
                label="Izin berlaku sampai"
                value={field.value}
                onChange={field.onChange}
                error={exceptionForm.formState.errors.valid_until?.message}
              />
            )}
          />
          <Textarea
            id="exception-reason"
            label="Alasan pemberian izin"
            placeholder="Tulis alasan pemberian izin khusus..."
            error={exceptionForm.formState.errors.reason?.message}
            {...exceptionForm.register('reason')}
          />
        </form>
      </Modal>

      <Modal
        open={selectedException !== null}
        onClose={() => setSelectedException(null)}
        title="Cabut Izin Khusus"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedException(null)}>Batal</Button>
            <Button variant="danger" loading={isRevoking} onClick={revokeForm.handleSubmit(revokeException)}>Cabut Izin</Button>
          </div>
        }
      >
        <form onSubmit={revokeForm.handleSubmit(revokeException)}>
          <Controller
            control={revokeForm.control}
            name="reason"
            render={({ field }) => (
              <Input
                label="Alasan pencabutan"
                {...field}
                error={revokeForm.formState.errors.reason?.message}
              />
            )}
          />
        </form>
      </Modal>
    </div>
  );
}
