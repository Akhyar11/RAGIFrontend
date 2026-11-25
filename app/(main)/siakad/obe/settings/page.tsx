'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sliders,
  Save,
  CheckCircle2,
  ShieldAlert,
  Scale,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Checkbox } from '@/components/ui/Checkbox';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { SEMESTER_OPTIONS } from '@/components/siakad/DistribusiMengajarForm';
import { siakadService } from '@/services/siakad.service';
import { useObeSettings, formatTahunAkademikLabel } from '@/lib/obe-settings';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

const obeSettingsSchema = z.object({
  tahun_akademik_id: z.string().min(1, 'Tahun Akademik wajib dipilih'),
  semester: z.string().min(1, 'Semester wajib dipilih'),
  kurikulum_id: z.string().min(1, 'Kurikulum wajib dipilih'),
});

type ObeSettingsFormData = z.infer<typeof obeSettingsSchema>;

interface AturanSksItem {
  id?: number;
  program_studi_id?: number | null;
  ipk_min: number;
  ipk_max: number;
  max_sks: number;
  keterangan?: string | null;
  is_active?: boolean;
  program_studi?: {
    id: number;
    nama: string;
    kode_prodi: string;
  } | null;
}

const aturanSksFormSchema = z.object({
  ipk_min: z.number().min(0, 'IPK minimal 0.00').max(4.0, 'IPK maksimal 4.00'),
  ipk_max: z.number().min(0, 'IPK minimal 0.00').max(4.0, 'IPK maksimal 4.00'),
  max_sks: z.number().int().min(1, 'Minimal 1 SKS').max(30, 'Maksimal 30 SKS'),
  keterangan: z.string().max(255).optional(),
  is_active: z.boolean(),
}).refine((data) => data.ipk_max >= data.ipk_min, {
  message: 'IPK Maksimal tidak boleh lebih kecil dari IPK Minimal',
  path: ['ipk_max'],
});

type AturanSksFormData = z.infer<typeof aturanSksFormSchema>;

export default function ObeSettingsPage() {
  const { user, hasPermission, isSuperAdmin } = useAuth();
  const isAdminObe = Boolean(
    isSuperAdmin ||
    (((user as any)?.siakad_admin_prodis || (user as any)?.siakadAdminProdis || []).filter((p: any) => p.is_active !== false).length > 0)
  );
  const canRead = hasPermission('siakad.kurikulum.read') || isAdminObe;
  const canManage = canRead;

  // Mendapatkan prodi aktif user (jika ada)
  const userAdminProdis = (user as any)?.siakad_admin_prodis || (user as any)?.siakadAdminProdis || [];
  const primaryProdi = userAdminProdis[0]?.program_studi || userAdminProdis[0] || null;
  const activeProdiId = primaryProdi?.id || primaryProdi?.program_studi_id || null;

  const { settings, loading: settingsLoading, updateSettings } = useObeSettings();
  const [saving, setSaving] = useState(false);

  const [selectedTaLabel, setSelectedTaLabel] = useState<string>('-');
  const [selectedKurikulumLabel, setSelectedKurikulumLabel] = useState<string>('-');

  // State untuk Aturan SKS
  const [aturanList, setAturanList] = useState<AturanSksItem[]>([]);
  const [loadingAturan, setLoadingAturan] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [savingAturan, setSavingAturan] = useState(false);
  const [editingItem, setEditingItem] = useState<AturanSksItem | null>(null);

  // State Delete Dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ObeSettingsFormData>({
    resolver: zodResolver(obeSettingsSchema),
    defaultValues: {
      tahun_akademik_id: '',
      semester: 'Ganjil',
      kurikulum_id: '',
    },
  });

  const watchedSemester = watch('semester');

  // Form untuk modal Aturan SKS
  const {
    control: aturanControl,
    handleSubmit: handleAturanSubmit,
    reset: resetAturanForm,
    formState: { errors: aturanErrors },
  } = useForm<AturanSksFormData>({
    resolver: zodResolver(aturanSksFormSchema),
    defaultValues: {
      ipk_min: 3.0,
      ipk_max: 4.0,
      max_sks: 24,
      keterangan: '',
      is_active: true,
    },
  });

  const loadTahunAkademikOptions = useCallback(async (keyword: string) => {
    try {
      const res = await siakadService.getTahunAkademiks({ search: keyword || undefined, per_page: 50 });
      const raw = res?.data;
      const list: any[] = Array.isArray(raw) ? raw : (raw?.items || raw || []);
      return list.map((ta: any) => {
        const cleanLabel = formatTahunAkademikLabel(ta);
        return {
          value: String(ta.id),
          label: cleanLabel,
          cleanLabel,
          raw: ta,
        };
      });
    } catch {
      return [];
    }
  }, []);

  const loadKurikulumOptions = useCallback(async (keyword: string) => {
    try {
      const kurRes = await siakadService.getKurikulums({ search: keyword || undefined, per_page: 50 });
      const raw = kurRes?.data;
      const list: any[] = Array.isArray(raw) ? raw : (raw?.items || raw || []);
      return list.map((k: any) => {
        const kode = k.kode || `K-${k.id}`;
        const tahun = k.tahun_berlaku || '-';
        const sks = k.total_sks_lulus || '-';
        const nama = k.nama ? ` ${k.nama}` : '';
        const cleanLabel = `${kode} - ${tahun} - ${sks} -${nama}`;
        return {
          value: String(k.id),
          label: cleanLabel,
          cleanLabel,
          raw: k,
        };
      });
    } catch {
      return [];
    }
  }, []);

  // Fetch Aturan SKS
  const fetchAturanSks = useCallback(async () => {
    setLoadingAturan(true);
    try {
      const res = await siakadService.getAturanSks();
      const items: AturanSksItem[] = res?.data || [];
      setAturanList(items);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memuat aturan beban SKS');
    } finally {
      setLoadingAturan(false);
    }
  }, []);

  useEffect(() => {
    if (canRead) {
      fetchAturanSks();
    }
  }, [canRead, fetchAturanSks]);

  // Inisialisasi form dari settings OBE
  useEffect(() => {
    if (settings) {
      if (settings.tahun_akademik_id) {
        setValue('tahun_akademik_id', String(settings.tahun_akademik_id));
        if (settings.tahun_akademik_label) {
          setSelectedTaLabel(settings.tahun_akademik_label);
        }
      }
      if (settings.semester) {
        setValue('semester', settings.semester);
      }
      if (settings.kurikulum_id) {
        setValue('kurikulum_id', String(settings.kurikulum_id));
        if (settings.kurikulum_label) {
          setSelectedKurikulumLabel(settings.kurikulum_label);
        }
      }
    }
  }, [settings, setValue]);

  const onSubmit = async (data: ObeSettingsFormData) => {
    if (!canManage) {
      toast.error('Anda tidak memiliki wewenang untuk mengubah pengaturan OBE');
      return;
    }

    try {
      setSaving(true);
      await updateSettings({
        tahun_akademik_id: Number(data.tahun_akademik_id),
        semester: data.semester,
        kurikulum_id: Number(data.kurikulum_id),
      });
      toast.success('Pengaturan OBE berhasil disimpan');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan pengaturan OBE');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    resetAturanForm({
      ipk_min: 3.0,
      ipk_max: 4.0,
      max_sks: 24,
      keterangan: '',
      is_active: true,
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (item: AturanSksItem) => {
    setEditingItem(item);
    resetAturanForm({
      ipk_min: item.ipk_min,
      ipk_max: item.ipk_max,
      max_sks: item.max_sks,
      keterangan: item.keterangan || '',
      is_active: item.is_active ?? true,
    });
    setModalOpen(true);
  };

  const handleSaveAturan = async (data: AturanSksFormData) => {
    if (!canManage) {
      toast.error('Anda tidak memiliki wewenang');
      return;
    }

    setSavingAturan(true);
    try {
      if (editingItem?.id) {
        await siakadService.updateAturanSks(editingItem.id, {
          ipk_min: data.ipk_min,
          ipk_max: data.ipk_max,
          max_sks: data.max_sks,
          keterangan: data.keterangan || null,
          is_active: data.is_active,
        });
        toast.success('Aturan beban SKS berhasil diperbarui');
      } else {
        await siakadService.saveAturanSks({
          program_studi_id: activeProdiId || null,
          ipk_min: data.ipk_min,
          ipk_max: data.ipk_max,
          max_sks: data.max_sks,
          keterangan: data.keterangan || null,
          is_active: data.is_active,
        });
        toast.success('Aturan beban SKS berhasil ditambahkan');
      }
      setModalOpen(false);
      fetchAturanSks();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan aturan SKS');
    } finally {
      setSavingAturan(false);
    }
  };

  const handleDeleteAturan = async () => {
    if (!deletingId) return;
    setDeletingLoading(true);
    try {
      await siakadService.deleteAturanSks(deletingId);
      toast.success('Aturan beban SKS berhasil dihapus');
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      fetchAturanSks();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menghapus aturan SKS');
    } finally {
      setDeletingLoading(false);
    }
  };

  const handleResetDefault = () => {
    setResetConfirmOpen(true);
  };

  const executeResetDefault = async () => {
    setLoadingAturan(true);
    try {
      await siakadService.saveAturanSks({
        program_studi_id: activeProdiId || null,
        batch: [
          { ipk_min: 3.00, ipk_max: 4.00, max_sks: 24, keterangan: 'Sangat Baik (Beban Maksimal)', is_active: true },
          { ipk_min: 2.50, ipk_max: 2.99, max_sks: 22, keterangan: 'Baik', is_active: true },
          { ipk_min: 2.00, ipk_max: 2.49, max_sks: 20, keterangan: 'Cukup', is_active: true },
          { ipk_min: 0.00, ipk_max: 1.99, max_sks: 18, keterangan: 'Kurang (Beban Minimal)', is_active: true },
        ],
      });
      toast.success('Aturan beban SKS berhasil diatur ulang ke standar');
      setResetConfirmOpen(false);
      fetchAturanSks();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengatur ulang aturan SKS');
    } finally {
      setLoadingAturan(false);
    }
  };

  // Kolom Tabel Aturan SKS
  const columns: ColumnDef<AturanSksItem>[] = useMemo(() => [
    {
      key: 'cakupan',
      label: 'Cakupan',
      align: 'left',
      render: (row) => {
        if (!row.program_studi_id) {
          return (
            <Badge variant="gray" className="text-2xs">
              Global Institusi
            </Badge>
          );
        }
        return (
          <Badge variant="blue" className="text-2xs">
            {row.program_studi?.nama || `Prodi #${row.program_studi_id}`}
          </Badge>
        );
      },
    },
    {
      key: 'rentang_ipk',
      label: 'Rentang IPK',
      align: 'center',
      render: (row) => (
        <span className="font-mono font-semibold text-slate-800 text-xs">
          {Number(row.ipk_min).toFixed(2)} - {Number(row.ipk_max).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'max_sks',
      label: 'Maks. Beban SKS',
      align: 'center',
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {row.max_sks} SKS
        </span>
      ),
    },
    {
      key: 'keterangan',
      label: 'Keterangan Predikat',
      render: (row) => (
        <span className="text-xs text-slate-600">
          {row.keterangan || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (row) => (
        <Badge variant={row.is_active !== false ? 'success' : 'gray'} className="text-2xs">
          {row.is_active !== false ? 'Aktif' : 'Non-Aktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      render: (row) => (
        <DropdownMenu
          items={[
            {
              label: 'Edit Aturan',
              icon: <Pencil size={14} />,
              onClick: () => handleOpenEditModal(row),
              disabled: !canManage,
            },
            {
              label: 'Hapus Aturan',
              icon: <Trash2 size={14} />,
              variant: 'danger',
              onClick: () => {
                if (row.id) {
                  setDeletingId(row.id);
                  setDeleteConfirmOpen(true);
                }
              },
              disabled: !canManage,
            },
          ]}
        />
      ),
    },
  ], [canManage]);

  if (!canRead) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-amber-50 text-amber-600">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-base font-bold text-slate-800">Akses Terbatas</h2>
        <p className="text-xs text-slate-500">
          Anda tidak memiliki wewenang untuk melihat atau mengubah Pengaturan Konteks OBE.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Pengaturan OBE"
        description="Konfigurasi tahun akademik, semester, kurikulum aktif, dan aturan batas beban SKS berbasis IPK."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'OBE', href: '/siakad/obe' },
          { label: 'Pengaturan OBE' },
        ]}
      />

      {/* SECTION 1: Konteks Tahun & Kurikulum OBE */}
      <Card>
        <CardBody className="p-6">
          <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
              style={{ background: 'var(--module-primary-subtle)', color: 'var(--module-primary)' }}
            >
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Konteks Tahun & Kurikulum OBE</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengaturan ini akan otomatis menjadi filter aktif pada Distribusi Mata Kuliah dan Kelola RPS.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Field 1: Tahun Akademik */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Tahun Akademik <span className="text-rose-500">*</span>
              </label>
              <Controller
                name="tahun_akademik_id"
                control={control}
                render={({ field }) => (
                  <AsyncSelect
                    placeholder="Pilih Tahun Akademik..."
                    loadOptions={loadTahunAkademikOptions}
                    value={field.value ? Number(field.value) : null}
                    onChange={(opt: any) => {
                      const val = opt?.value ? String(opt.value) : '';
                      field.onChange(val);
                      if (opt?.cleanLabel || opt?.label) {
                        setSelectedTaLabel(opt.cleanLabel || opt.label);
                      }
                    }}
                    isDisabled={settingsLoading || saving || !canManage}
                    isClearable={false}
                  />
                )}
              />
              {errors.tahun_akademik_id && (
                <p className="text-2xs text-rose-500 mt-1">{errors.tahun_akademik_id.message}</p>
              )}
            </div>

            {/* Field 2: Semester */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Semester <span className="text-rose-500">*</span>
              </label>
              <Controller
                name="semester"
                control={control}
                render={({ field }) => (
                  <Select
                    options={SEMESTER_OPTIONS}
                    value={field.value}
                    onChange={(v) => field.onChange(v || 'Ganjil')}
                    placeholder="Pilih Semester..."
                    disabled={settingsLoading || saving || !canManage}
                  />
                )}
              />
              {errors.semester && (
                <p className="text-2xs text-rose-500 mt-1">{errors.semester.message}</p>
              )}
            </div>

            {/* Field 3: Kurikulum */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Kurikulum <span className="text-rose-500">*</span>
              </label>
              <Controller
                name="kurikulum_id"
                control={control}
                render={({ field }) => (
                  <AsyncSelect
                    placeholder="Pilih Kurikulum..."
                    loadOptions={loadKurikulumOptions}
                    value={field.value ? Number(field.value) : null}
                    onChange={(opt: any) => {
                      const val = opt?.value ? String(opt.value) : '';
                      field.onChange(val);
                      if (opt?.cleanLabel || opt?.label) {
                        setSelectedKurikulumLabel(opt.cleanLabel || opt.label);
                      }
                    }}
                    isDisabled={settingsLoading || saving || !canManage}
                    isClearable={false}
                  />
                )}
              />
              {errors.kurikulum_id && (
                <p className="text-2xs text-rose-500 mt-1">{errors.kurikulum_id.message}</p>
              )}
            </div>

            {/* Info Box Ringkasan Pengaturan Aktif */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <CheckCircle2 size={18} className="text-[var(--module-primary)] mt-0.5 shrink-0" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-slate-800">Ringkasan Konteks Aktif:</p>
                <p className="text-slate-600">
                  Tahun Akademik: <span className="font-bold text-slate-900">{selectedTaLabel}</span> • Semester:{' '}
                  <span className="font-bold text-slate-900">{watchedSemester || '-'}</span> • Kurikulum:{' '}
                  <span className="font-bold text-slate-900">{selectedKurikulumLabel}</span>
                </p>
                <p className="text-2xs text-slate-400">
                  Perubahan akan diterapkan secara otomatis saat membuka modul Distribusi Mata Kuliah dan Kelola RPS.
                </p>
              </div>
            </div>

            {/* Tombol Simpan */}
            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                type="submit"
                disabled={saving || settingsLoading || !canManage}
                isLoading={saving}
                icon={<Save size={16} />}
              >
                Simpan Konteks OBE
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* SECTION 2: Aturan Beban SKS Berdasarkan IPK */}
      <Card>
        <CardBody className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                style={{ background: 'var(--module-primary-subtle)', color: 'var(--module-primary)' }}
              >
                <Scale size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Aturan Beban SKS Berdasarkan IPK</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dinamisasi batas pengambilan SKS pada pengisian KRS mahasiswa berdasarkan rentang IPK.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDefault}
                disabled={loadingAturan || !canManage}
                icon={<RotateCcw size={14} />}
                title="Pulihkan standar baku 24, 22, 20, 18 SKS"
              >
                Standar Baku
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenCreateModal}
                disabled={loadingAturan || !canManage}
                icon={<Plus size={14} />}
              >
                Tambah Rentang
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-900 flex items-start gap-2.5">
              <Sparkles size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">
                Prioritas aturan: sistem KRS akan memprioritaskan konfigurasi khusus program studi mahasiswa. Apabila program studi tidak mengatur rentang khusus, batas beban SKS akan otomatis menggunakan aturan standar institusi (Global).
              </p>
            </div>

            <DataTable
              columns={columns}
              data={aturanList}
              isLoading={loadingAturan}
              emptyMessage="Belum ada konfigurasi aturan beban SKS."
            />
          </div>
        </CardBody>
      </Card>

      {/* Modal Tambah / Edit Aturan SKS */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Rentang Aturan SKS' : 'Tambah Rentang Aturan SKS'}
        size="md"
      >
        <form onSubmit={handleAturanSubmit(handleSaveAturan)} className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="ipk_min"
              control={aturanControl}
              render={({ field }) => (
                <Input
                  label="IPK Minimal"
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  placeholder="Contoh: 3.00"
                  value={field.value}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  error={aturanErrors.ipk_min?.message}
                />
              )}
            />

            <Controller
              name="ipk_max"
              control={aturanControl}
              render={({ field }) => (
                <Input
                  label="IPK Maksimal"
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  placeholder="Contoh: 4.00"
                  value={field.value}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  error={aturanErrors.ipk_max?.message}
                />
              )}
            />
          </div>

          <Controller
            name="max_sks"
            control={aturanControl}
            render={({ field }) => (
              <Input
                label="Beban Maksimal SKS"
                required
                type="number"
                min="1"
                max="30"
                placeholder="Contoh: 24"
                value={field.value}
                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                error={aturanErrors.max_sks?.message}
              />
            )}
          />

          <Controller
            name="keterangan"
            control={aturanControl}
            render={({ field }) => (
              <Input
                label="Keterangan / Kategori"
                type="text"
                placeholder="Contoh: Sangat Baik, Memuaskan, Khusus Akselerasi"
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value)}
                error={aturanErrors.keterangan?.message}
              />
            )}
          />

          <div className="pt-2">
            <Controller
              name="is_active"
              control={aturanControl}
              render={({ field }) => (
                <Checkbox
                  label="Status Aturan Aktif"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              )}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={savingAturan}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={savingAturan}
              disabled={savingAturan}
            >
              Simpan Aturan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteAturan}
        title="Hapus Aturan SKS"
        message="Apakah Anda yakin ingin menghapus rentang aturan beban SKS ini? Mahasiswa yang berada pada rentang ini akan otomatis menggunakan aturan standar institusi."
        confirmText="Ya, Hapus"
        isLoading={deletingLoading}
        variant="danger"
      />

      {/* Dialog Konfirmasi Reset Standar */}
      <ConfirmDialog
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={executeResetDefault}
        title="Pulihkan Aturan Standar"
        message="Apakah Anda yakin ingin memulihkan aturan beban SKS prodi ke standar baku institusi?"
        confirmText="Ya, Pulihkan"
        isLoading={loadingAturan}
      />
    </div>
  );
}
