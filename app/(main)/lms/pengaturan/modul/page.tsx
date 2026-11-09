'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { lmsService } from '@/services/lms.service';
import { getApiErrorMessage } from '@/lib/utils';
import type { LmsPengaturanDefinition } from '@/types/lms.types';
import { Info, Save, Settings } from 'lucide-react';

/**
 * Key pengaturan modul yang dikelola halaman ini.
 *
 * Key konfigurasi bersifat tetap (bukan entitas master), sehingga dideklarasikan
 * terpusat di sini dan label/batas nilai tetap diambil dari `definitions`
 * backend agar tidak ada duplikasi teks.
 */
type PengaturanKey =
  | 'lms_fitur_presensi'
  | 'lms_max_soal_import'
  | 'lms_upload_max_size_mb'
  | 'lms_video_max_size_mb';

const pengaturanSchema = z.object({
  lms_fitur_presensi: z.boolean(),
  lms_max_soal_import: z
    .string()
    .min(1, 'Wajib diisi.')
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 1000, 'Nilai harus 1–1000.'),
  lms_upload_max_size_mb: z
    .string()
    .min(1, 'Wajib diisi.')
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 200, 'Nilai harus 1–200.'),
  lms_video_max_size_mb: z
    .string()
    .min(1, 'Wajib diisi.')
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 2048, 'Nilai harus 1–2048.'),
});

type PengaturanFormValues = z.infer<typeof pengaturanSchema>;

export default function LmsPengaturanModulPage() {
  const [definitions, setDefinitions] = useState<LmsPengaturanDefinition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const form = useForm<PengaturanFormValues>({
    resolver: zodResolver(pengaturanSchema),
    defaultValues: {
      lms_fitur_presensi: true,
      lms_max_soal_import: '500',
      lms_upload_max_size_mb: '100',
      lms_video_max_size_mb: '500',
    },
  });

  const definitionMap = useMemo(() => {
    const map = new Map<string, LmsPengaturanDefinition>();
    definitions.forEach((definition) => map.set(definition.key, definition));
    return map;
  }, [definitions]);

  const applyValues = useCallback(
    (values: Record<string, boolean | number | string>) => {
      form.reset({
        lms_fitur_presensi: Boolean(values.lms_fitur_presensi ?? true),
        lms_max_soal_import: String(values.lms_max_soal_import ?? ''),
        lms_upload_max_size_mb: String(values.lms_upload_max_size_mb ?? ''),
        lms_video_max_size_mb: String(values.lms_video_max_size_mb ?? ''),
      });
    },
    [form]
  );

  useEffect(() => {
    let active = true;

    const fetchSettings = async () => {
      try {
        const res = await lmsService.getPengaturanModul();
        if (!active || !res.data) return;

        setDefinitions(res.data.definitions ?? []);
        applyValues(res.data.values ?? {});
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Gagal memuat pengaturan modul LMS'));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchSettings();

    return () => {
      active = false;
    };
  }, [applyValues]);

  const onSubmit = async (values: PengaturanFormValues) => {
    try {
      const res = await lmsService.updatePengaturanModul({
        lms_fitur_presensi: values.lms_fitur_presensi,
        lms_max_soal_import: Number(values.lms_max_soal_import),
        lms_upload_max_size_mb: Number(values.lms_upload_max_size_mb),
        lms_video_max_size_mb: Number(values.lms_video_max_size_mb),
      });

      if (res.data) applyValues(res.data);
      toast.success('Pengaturan modul LMS tersimpan');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Gagal menyimpan pengaturan modul LMS'));
    }
  };

  const renderDefinitionHint = (key: PengaturanKey, fallback: string) =>
    definitionMap.get(key)?.description ?? fallback;

  const renderDefinitionLabel = (key: PengaturanKey, fallback: string) =>
    definitionMap.get(key)?.label ?? fallback;

  return (
    <>
      <PageHeader
        title="Pengaturan Modul LMS"
        description="Konfigurasi global modul LMS — berlaku untuk seluruh kelas."
        backUrl="/lms"
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Settings size={16} style={{ color: 'var(--module-primary)' }} />
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Fitur</h5>
            </div>

            <Controller
              name="lms_fitur_presensi"
              control={form.control}
              render={({ field }) => (
                <ToggleSwitch
                  checked={field.value}
                  onChange={field.onChange}
                  label={renderDefinitionLabel('lms_fitur_presensi', 'Fitur Presensi')}
                  description={renderDefinitionHint(
                    'lms_fitur_presensi',
                    'Mengaktifkan fitur presensi lokal LMS untuk dosen/mahasiswa.'
                  )}
                />
              )}
            />
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Save size={16} style={{ color: 'var(--module-primary)' }} />
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Batas Data &amp; Berkas</h5>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Controller
                name="lms_max_soal_import"
                control={form.control}
                render={({ field }) => (
                  <Input
                    label={renderDefinitionLabel('lms_max_soal_import', 'Maksimal Soal per Import')}
                    type="number"
                    min={1}
                    max={1000}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    hint={renderDefinitionHint('lms_max_soal_import', 'Batas baris soal per import XLSX.')}
                    error={form.formState.errors.lms_max_soal_import?.message}
                  />
                )}
              />
              <Controller
                name="lms_upload_max_size_mb"
                control={form.control}
                render={({ field }) => (
                  <Input
                    label={renderDefinitionLabel('lms_upload_max_size_mb', 'Batas Ukuran Berkas Materi (MB)')}
                    type="number"
                    min={1}
                    max={200}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    hint={renderDefinitionHint('lms_upload_max_size_mb', 'Berlaku untuk materi/tugas non-video.')}
                    error={form.formState.errors.lms_upload_max_size_mb?.message}
                  />
                )}
              />
              <Controller
                name="lms_video_max_size_mb"
                control={form.control}
                render={({ field }) => (
                  <Input
                    label={renderDefinitionLabel('lms_video_max_size_mb', 'Batas Ukuran Video (MB)')}
                    type="number"
                    min={1}
                    max={2048}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    hint={renderDefinitionHint('lms_video_max_size_mb', 'Berlaku untuk materi bertipe video.')}
                    error={form.formState.errors.lms_video_max_size_mb?.message}
                  />
                )}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-2xs text-slate-600">
            <Info size={16} className="shrink-0 mt-0.5 text-slate-400" />
            <span>
              Perubahan langsung berlaku setelah disimpan. Menonaktifkan fitur presensi menyembunyikan presensi untuk
              dosen &amp; mahasiswa, namun admin tetap dapat membuka panel integrasi untuk keperluan dukungan.
            </span>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              loading={form.formState.isSubmitting}
              disabled={form.formState.isSubmitting}
              icon={<Save size={16} />}
            >
              Simpan Pengaturan
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
