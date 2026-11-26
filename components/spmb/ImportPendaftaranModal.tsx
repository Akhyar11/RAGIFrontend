'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Upload, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import {
  spmbService,
  type PendaftaranImportPreview,
  type PendaftaranImportResult,
  type PendaftaranImportRow,
} from '@/services/spmb.service';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

const MAX_FILE_MB = 10;

const importFormSchema = z.object({
  file: z
    .instanceof(File, { message: 'File Excel wajib dipilih.' })
    .refine((file) => file.size <= MAX_FILE_MB * 1024 * 1024, `Ukuran file maksimal ${MAX_FILE_MB} MB.`)
    .refine((file) => /\.(xlsx|xls)$/i.test(file.name), 'Format file harus .xlsx atau .xls.'),
});

type ImportFormValues = z.infer<typeof importFormSchema>;

type FailedRow = PendaftaranImportResult['failed'][number];

const PREVIEW_COLUMNS: ColumnDef<PendaftaranImportRow>[] = [
  { key: 'row', label: 'BARIS', render: (r) => <span className="text-xs text-slate-500">{r.row}</span> },
  { key: 'no_daftar', label: 'NO. DAFTAR', render: (r) => <span className="font-mono text-xs">{r.no_daftar}</span> },
  {
    key: 'nama',
    label: 'NAMA',
    render: (r) => (
      <div>
        <div className="text-xs font-semibold text-slate-800">{r.nama}</div>
        <div className="text-2xs text-slate-500">{r.email}</div>
      </div>
    ),
  },
  { key: 'program_studi', label: 'PROGRAM STUDI', render: (r) => <span className="text-xs">{r.program_studi}</span> },
  {
    key: 'status',
    label: 'STATUS',
    render: (r) => r.status === 'valid' ? (
      <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-700">
        <CheckCircle2 size={12} /> Valid
      </span>
    ) : (
      <div className="text-2xs text-red-700">
        <span className="inline-flex items-center gap-1 font-bold"><XCircle size={12} /> Error</span>
        <ul className="list-disc pl-4">
          {r.errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      </div>
    ),
  },
];

const FAILED_COLUMNS: ColumnDef<FailedRow>[] = [
  { key: 'row', label: 'BARIS', render: (r) => <span className="text-xs">{r.row}</span> },
  { key: 'no_daftar', label: 'NO. DAFTAR', render: (r) => <span className="font-mono text-xs">{r.no_daftar}</span> },
  { key: 'nama', label: 'NAMA', render: (r) => <span className="text-xs">{r.nama}</span> },
  { key: 'errors', label: 'ALASAN', render: (r) => <span className="text-xs text-red-700">{r.errors.join('; ')}</span> },
];


function errorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  const first = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
  return first || data?.message || fallback;
}

export function ImportPendaftaranModal({ open, onClose, onImported }: Props) {
  const [inputKey, setInputKey] = useState(0);
  const { setValue, trigger, reset: resetForm, formState: { errors } } = useForm<ImportFormValues>({
    resolver: zodResolver(importFormSchema),
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PendaftaranImportPreview | null>(null);
  const [result, setResult] = useState<PendaftaranImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const blob = await spmbService.downloadImportPendaftaranTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template-import-pendaftar.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Gagal mengunduh template.');
    } finally {
      setDownloading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setShowOnlyErrors(false);
    resetForm();
    setInputKey((k) => k + 1);
  };

  const handleClose = () => {
    if (busy) return;
    if (result && result.summary.imported > 0) onImported();
    reset();
    onClose();
  };

  const handleFile = async (selected: File | undefined) => {
    if (!selected) return;
    setValue('file', selected, { shouldValidate: false });
    if (!(await trigger('file'))) {
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(selected);
    setPreview(null);
    setResult(null);
    setBusy(true);
    try {
      setPreview(await spmbService.previewImportPendaftaran(selected));
    } catch (error) {
      setFile(null);
      setInputKey((k) => k + 1);
      toast.error(errorMessage(error, 'Gagal membaca file Excel.'));
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const data = await spmbService.importPendaftaran(file);
      setResult(data);
      setPreview(null);
      if (data.summary.imported > 0) {
        toast.success(`${data.summary.imported} pendaftar berhasil diimpor.`);
        onImported();
      }
    } catch (error) {
      toast.error(errorMessage(error, 'Gagal mengimpor data.'));
    } finally {
      setBusy(false);
    }
  };

  const visibleRows = preview
    ? (showOnlyErrors ? preview.rows.filter((r) => r.status === 'error') : preview.rows)
    : [];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Data Pendaftar dari Excel"
      size="xl"
      closeOnOverlay={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={busy}>
            {result ? 'Tutup' : 'Batal'}
          </Button>
          {preview && (
            <Button
              variant="primary"
              onClick={handleImport}
              loading={busy}
              disabled={busy || preview.summary.valid === 0}
              icon={<Upload size={16} />}
              style={{ backgroundColor: 'var(--module-primary)' }}
            >
              Import {preview.summary.valid} Baris Valid
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {!result && (
          <>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex gap-3">
              <AlertTriangle size={18} className="shrink-0" />
              <div className="space-y-2">
                <p className="font-bold">Perhatikan sebelum import</p>
                <ul className="list-disc pl-4">
                  <li>
                    <b>Gelombang</b> dan <b>Jalur Masuk</b> tidak diisi untuk data hasil import. Tetapkan secara manual setelahnya.
                  </li>
                  <li>
                    Akun login dibuat otomatis untuk tiap pendaftar dengan <b>password default</b>. Minta pendaftar segera menggantinya.
                  </li>
                  <li>Baris dengan No.Daftar atau email yang sudah terdaftar akan dilewati.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-600">
                Belum punya format file? Unduh template lalu isi mulai baris ke-4.
              </p>
              <Button
                variant="outline"
                size="sm"
                icon={<Download size={16} />}
                onClick={handleDownloadTemplate}
                loading={downloading}
                disabled={busy || downloading}
              >
                Download Template
              </Button>
            </div>

            <Input
              key={inputKey}
              type="file"
              label="File Excel (.xlsx / .xls)"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              disabled={busy}
              error={errors.file?.message}
              hint={busy && !preview
                ? 'Memvalidasi file...'
                : `Maksimal ${MAX_FILE_MB} MB. Data belum disimpan sampai Anda konfirmasi.`}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </>
        )}

        {preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <div className="text-xl font-extrabold text-slate-800">{preview.summary.total}</div>
                <div className="text-2xs uppercase font-bold text-slate-500">Total Baris</div>
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <div className="text-xl font-extrabold text-emerald-700">{preview.summary.valid}</div>
                <div className="text-2xs uppercase font-bold text-emerald-600">Valid</div>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <div className="text-xl font-extrabold text-red-700">{preview.summary.error}</div>
                <div className="text-2xs uppercase font-bold text-red-600">Bermasalah</div>
              </div>
            </div>

            {preview.summary.error > 0 && (
              <Checkbox
                label="Tampilkan hanya baris bermasalah"
                checked={showOnlyErrors}
                onChange={(e) => setShowOnlyErrors(e.target.checked)}
              />
            )}

            <DataTable
              columns={PREVIEW_COLUMNS}
              data={visibleRows}
              keyExtractor={(r) => r.row}
              emptyMessage="Tidak ada baris untuk ditampilkan."
            />
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <p className="font-extrabold text-base">
                {result.summary.imported} dari {result.summary.total} pendaftar berhasil diimpor.
              </p>
              {result.summary.failed > 0 && (
                <p className="text-sm">{result.summary.failed} baris dilewati karena bermasalah (daftar di bawah).</p>
              )}
              {result.default_password_used && (
                <p className="text-sm">
                  Akun pendaftar memakai <b>password default</b>. Informasikan kepada pendaftar agar segera menggantinya.
                </p>
              )}
            </div>
            {result.failed.length > 0 && (
              <DataTable
                columns={FAILED_COLUMNS}
                data={result.failed}
                keyExtractor={(r) => r.row}
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
