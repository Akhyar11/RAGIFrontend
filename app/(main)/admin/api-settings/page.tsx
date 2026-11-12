'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { adminService } from '@/services/admin.service';
import { moduleService } from '@/services/module.service';
import type {
  IamApiIntegration,
  UpdateApiIntegrationPayload,
  TestApiIntegrationResult,
  ApiIntegrationSyncResult,
} from '@/types/api-integration.types';
import type { PaginationMeta } from '@/types/api.types';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { isAxiosError } from 'axios';
import {
  Filter,
  Edit2,
  Activity,
  Code2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Globe,
  Lock,
  Layers,
  Clock,
  Copy,
  RefreshCw,
  Check,
} from 'lucide-react';

const updateSchema = z.object({
  url_api: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || /^https?:\/\/.+/i.test(val), {
      message: 'Format URL harus diawali dengan http:// atau https://',
    }),
  token: z.string().nullable().optional(),
  auth_type: z.enum(['bearer', 'header_key'], {
    message: 'Pilih jenis autentikasi yang valid',
  }),
  is_active: z.boolean(),
});

type UpdateFormValues = z.infer<typeof updateSchema>;

const AUTH_TYPE_OPTIONS = [
  { value: 'bearer', label: 'Bearer Token (Header Authorization: Bearer <token>)' },
  { value: 'header_key', label: 'API Key (Header X-API-KEY: <token>)' },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
];

const ACTIVE_STATUS_FORM_OPTIONS = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
];

const SORT_BY_OPTIONS = [
  { value: 'module', label: 'Modul Sistem' },
  { value: 'name', label: 'Nama Integrasi' },
  { value: 'key', label: 'Kunci / Slug' },
  { value: 'http_method', label: 'Method HTTP' },
  { value: 'is_active', label: 'Status Aktif' },
  { value: 'last_synced_at', label: 'Waktu Uji Terakhir' },
  { value: 'created_at', label: 'Tanggal Didaftarkan' },
];

const SORT_DIR_OPTIONS = [
  { value: 'asc', label: 'A - Z (Naik)' },
  { value: 'desc', label: 'Z - A (Turun)' },
];

export default function ApiSettingsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('iam.api_integration.manage');

  const [items, setItems] = useState<IamApiIntegration[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(15);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter drawer
  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedModuleOption, setSelectedModuleOption] = useState<{ value: string; label: string } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [filterOrderBy, setFilterOrderBy] = useState<string>('created_at');
  const [filterOrderDir, setFilterOrderDir] = useState<string>('desc');

  // Edit modal
  const [editItem, setEditItem] = useState<IamApiIntegration | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Schema modal
  const [schemaItem, setSchemaItem] = useState<IamApiIntegration | null>(null);

  // Test connection modal
  const [testItem, setTestItem] = useState<IamApiIntegration | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<TestApiIntegrationResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [syncItem, setSyncItem] = useState<IamApiIntegration | null>(null);
  const [syncResult, setSyncResult] = useState<ApiIntegrationSyncResult | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      url_api: '',
      token: '',
      auth_type: 'bearer',
      is_active: true,
    },
  });

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await adminService.getApiIntegrations({
        page,
        per_page: limit,
        search: searchKeyword || undefined,
        module_id: selectedModuleOption?.value ? Number(selectedModuleOption.value) : undefined,
        is_active: selectedStatus !== '' ? selectedStatus : undefined,
        sort_by: filterOrderBy,
        sort_order: filterOrderDir as 'asc' | 'desc',
      });

      if (res.status === 'success') {
        const rawData = res.data;
        if (Array.isArray(rawData)) {
          setItems(rawData);
        } else if (rawData && Array.isArray((rawData as any).items)) {
          setItems((rawData as any).items);
        } else {
          setItems([]);
        }
        setMeta(res.meta);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat daftar integrasi API');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, searchKeyword, selectedModuleOption, selectedStatus, filterOrderBy, filterOrderDir]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadModuleOptions = useCallback(async (searchQuery: string) => {
    try {
      const allModules = await moduleService.getAllModules();
      const filtered = allModules.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return filtered.map((m) => ({
        value: String(m.id),
        label: `${m.name} (${m.code})`,
      }));
    } catch {
      return [];
    }
  }, []);

  const handleOpenEdit = (item: IamApiIntegration) => {
    setEditItem(item);
    reset({
      url_api: item.url_api || '',
      token: '',
      auth_type: item.auth_type || 'bearer',
      is_active: item.is_active,
    });
  };

  const onSubmitEdit = async (data: UpdateFormValues) => {
    if (!editItem) return;
    try {
      setIsSubmitting(true);
      const payload: UpdateApiIntegrationPayload = {
        url_api: data.url_api ? data.url_api.trim() : null,
        auth_type: data.auth_type,
        is_active: data.is_active,
      };
      const newToken = data.token?.trim();
      if (newToken) payload.token = newToken;

      const res = await adminService.updateApiIntegration(editItem.id, payload);
      if (res.status === 'success') {
        toast.success('Konfigurasi API berhasil disimpan');
        setEditItem(null);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui integrasi API');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenTest = async (item: IamApiIntegration) => {
    setTestItem(item);
    setTestResult(null);
    setTestError(null);
  };

  const handleRunTest = async () => {
    if (!testItem) return;
    try {
      setIsTesting(true);
      setTestResult(null);
      setTestError(null);
      const res = await adminService.testApiIntegration(testItem.id);
      if (res.status === 'success' && res.data) {
        setTestResult(res.data);
        toast.success(res.message || 'Koneksi berhasil terhubung');
        fetchData();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Koneksi gagal terhubung';
      setTestError(errMsg);
      if (err.response?.data?.data) {
        setTestResult(err.response.data.data);
      }
      toast.error(errMsg);
      fetchData();
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyMigrationPrompt = async (item: IamApiIntegration) => {
    const prompt = `Saya sedang menyiapkan integrasi migrasi Program Studi dari sistem sumber ke SIAKAD.

Bantu siapkan endpoint API sumber yang read-only dengan method GET untuk mengambil daftar Program Studi. Ikuti kontrak data berikut:
${JSON.stringify(item.expected_schema, null, 2)}

Contoh satu data:
{
  "source_id": 123,
  "kode_prodi": "TI-D3",
  "kode_prodi_dikti": null,
  "nama": "Teknik Informatika",
  "jenjang": "D3",
  "akreditasi": null,
  "is_active": true,
  "fakultas": null
}

Ketentuan:
- Pertahankan source_id yang stabil untuk keperluan rekonsiliasi; jangan gunakan source_id sebagai ID database tujuan.
- kode_prodi harus konsisten dan unik. kode_prodi_dikti dan akreditasi boleh null jika tidak tersedia.
- jenjang dan akreditasi harus dapat dipetakan ke master referensi SIAKAD; laporkan nilai yang belum cocok, jangan mengarang kode.
- Sistem sumber saat ini tidak memiliki data fakultas. Isi fakultas dengan null dan jangan menebak atau membuat pemetaan fakultas.
- Kembalikan JSON berupa array data atau objek dengan properti data berisi array. Sertakan pagination bila datanya banyak.
- Jelaskan URL endpoint, format autentikasi, parameter pagination/filter yang tersedia, serta contoh respons sukses dan error.
- Jangan melakukan perubahan atau impor data ke database tujuan; berikan rancangan dan hasil validasi terlebih dahulu.`;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard tidak didukung oleh browser ini.');
      }
      await navigator.clipboard.writeText(prompt);
      toast.success('Prompt migrasi Program Studi berhasil disalin');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyalin prompt');
    }
  };

  const handleRunSync = async () => {
    if (!syncItem) return;

    try {
      setIsSyncing(true);
      setSyncResult(null);
      const response = await adminService.syncApiIntegration(syncItem.id);
      if (response.status === 'success' && response.data) {
        setSyncResult(response.data);
        toast.success(response.message || 'Sinkronisasi selesai');
        fetchData();
      }
    } catch (error: unknown) {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : error instanceof Error
          ? error.message
          : undefined;
      toast.error(message || 'Sinkronisasi gagal dijalankan');
    } finally {
      setIsSyncing(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'INTEGRASI & KUNCI SISTEM',
      render: (row: IamApiIntegration) => (
        <div className="flex items-center gap-3 py-1.5">
          <div
            className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'var(--module-primary-subtle, #f0fdf4)',
              color: 'var(--module-primary, #0f766e)',
              borderColor: 'var(--module-primary-subtle, #ccfbf1)',
            }}
          >
            <Globe size={18} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-xs">{row.name}</span>
              <span className="px-2 py-0.5 text-2xs font-mono font-bold uppercase rounded bg-gray-100 text-gray-800 border border-gray-300">
                {row.module}
              </span>
            </div>
            <span className="text-2xs text-gray-600 font-mono mt-0.5 font-medium">{row.key}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'endpoint',
      label: 'METHOD & URL ENDPOINT',
      render: (row: IamApiIntegration) => (
        <div className="flex flex-col max-w-md py-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 text-2xs font-bold rounded font-mono ${
                row.http_method === 'GET'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-slate-100 text-slate-800 border border-slate-300'
              }`}
            >
              {row.http_method}
            </span>
            <code
              className={`text-xs truncate font-mono px-2 py-0.5 rounded border ${
                row.url_api
                  ? 'bg-gray-100 text-gray-900 font-semibold border-gray-300'
                  : 'bg-gray-50 text-gray-500 italic border-gray-200'
              }`}
            >
              {row.url_api || 'Belum dikonfigurasi'}
            </code>
          </div>
          <span className="text-2xs text-gray-600 mt-1 flex items-center gap-1 font-medium">
            <Lock size={11} className="text-gray-500" />
            Auth: {row.auth_type === 'bearer' ? 'Bearer Token' : 'X-API-KEY'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS & KESEHATAN',
      render: (row: IamApiIntegration) => (
        <div className="flex flex-col py-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 text-2xs font-bold rounded-full border ${
                row.is_active
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-gray-200 text-gray-800 border-gray-300'
              }`}
            >
              {row.is_active ? '● Aktif' : '○ Nonaktif'}
            </span>
            {row.last_status === 'success' && (
              <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                <CheckCircle2 size={12} className="text-emerald-700" /> Terhubung
              </span>
            )}
            {row.last_status === 'failed' && (
              <span className="inline-flex items-center gap-1 text-2xs font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-300">
                <XCircle size={12} className="text-rose-700" /> Gagal
              </span>
            )}
            {!row.last_status && (
              <span className="inline-flex items-center gap-1 text-2xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 font-medium">
                <HelpCircle size={12} className="text-gray-500" /> Belum diuji
              </span>
            )}
          </div>
          <span className="text-2xs text-gray-600 mt-1 flex items-center gap-1 font-medium">
            <Clock size={11} className="text-gray-500" />
            {row.last_synced_at
              ? new Date(row.last_synced_at).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Belum pernah di-ping'}
          </span>
        </div>
      ),
    },
    {
      key: 'aksi',
      label: 'AKSI',
      align: 'right' as const,
      render: (row: IamApiIntegration) => {
        const actionItems = [];

        if (canManage) {
          actionItems.push({
            label: 'Konfigurasi URL & Token',
            icon: <Edit2 size={14} />,
            onClick: () => handleOpenEdit(row),
          });
          actionItems.push({
            label: 'Uji Koneksi (Health Check)',
            icon: <Activity size={14} />,
            onClick: () => handleOpenTest(row),
          });
        }

        actionItems.push({
          label: 'Lihat Kontrak Schema JSON',
          icon: <Code2 size={14} />,
          onClick: () => setSchemaItem(row),
        });

        if (canManage) {
          actionItems.push({
            label: 'Jalankan Sync',
            icon: <RefreshCw size={14} />,
            disabled: !row.is_active || !row.url_api,
            onClick: () => {
              setSyncItem(row);
              setSyncResult(null);
            },
          });
        }

        if (row.key === 'siakad_program_studi') {
          actionItems.push({
            label: 'Salin Prompt Migrasi Prodi',
            icon: <Copy size={14} />,
            onClick: () => handleCopyMigrationPrompt(row),
          });
        }

        return (
          <div className="flex justify-end">
            <DropdownMenu items={actionItems} />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pengaturan Integrasi API"
        description="Kelola URL endpoint dan kredensial token integrasi sistem lama (SPMB & sistem eksternal) sesuai kontrak schema yang terdaftar."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => setShowFilter(true)}
            >
              Filter
            </Button>
          </div>
        }
      />

      <div className="bg-white border border-gray-200 rounded-xl p-4 text-xs text-gray-800 flex items-start gap-4 shadow-xs">
        <div
          className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0"
          style={{
            backgroundColor: 'var(--module-primary-subtle, #f0fdf4)',
            color: 'var(--module-primary, #0f766e)',
            borderColor: 'var(--module-primary-subtle, #ccfbf1)',
          }}
        >
          <Lock size={18} />
        </div>
        <div>
          <span className="font-bold text-gray-900 block mb-0.5 text-xs">
            Integrasi Terproteksi Sistem
          </span>
          <p className="text-gray-600 leading-relaxed">
            Daftar integrasi API di bawah ini dikunci oleh sistem. Konfigurasikan <span className="font-semibold text-gray-900">URL API</span> dan <span className="font-semibold text-gray-900">Token</span>, jalankan <span className="font-semibold text-gray-900">Uji Koneksi</span>, lalu gunakan aksi <span className="font-semibold text-gray-900">Jalankan Sync</span> untuk mengambil dan mengisi data tujuan.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
      />

      {/* FILTER DRAWER */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Integrasi API"
      >
        <div className="space-y-4">
          <Input
            label="Kata Kunci"
            placeholder="Cari nama, slug, url, modul..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />

          <AsyncSelect
            label="Filter Modul"
            placeholder="Pilih atau cari modul..."
            value={selectedModuleOption}
            onChange={(opt) => setSelectedModuleOption(opt ? { value: String(opt.value), label: String(opt.label) } : null)}
            loadOptions={loadModuleOptions}
            isClearable
          />

          <Select
            label="Status Integrasi"
            value={selectedStatus}
            onChange={(val) => setSelectedStatus(val)}
            options={STATUS_FILTER_OPTIONS}
          />

          <hr className="border-t border-slate-200 dark:border-slate-800 my-2" />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              value={filterOrderBy}
              onChange={(val) => setFilterOrderBy(val)}
              options={SORT_BY_OPTIONS}
            />
            <Select
              label="Arah"
              value={filterOrderDir}
              onChange={(val) => setFilterOrderDir(val)}
              options={SORT_DIR_OPTIONS}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSearchKeyword('');
                setSelectedModuleOption(null);
                setSelectedStatus('');
                setFilterOrderBy('created_at');
                setFilterOrderDir('desc');
              }}
            >
              Reset Filter
            </Button>
            <Button
              className="w-full"
              onClick={() => {
                setShowFilter(false);
                setPage(1);
                fetchData();
              }}
            >
              Terapkan
            </Button>
          </div>
        </div>
      </Drawer>

      {/* MODAL EDIT KONFIGURASI */}
      <Modal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title={`Konfigurasi ${editItem?.name || 'Integrasi API'}`}
        size="lg"
        className="flex max-h-[90vh] flex-col !overflow-hidden"
        bodyClassName="min-h-0 flex-1 overflow-y-auto"
        footerClassName="shrink-0"
        footer={editItem ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setEditItem(null)}>
              Batal
            </Button>
            <Button type="submit" form="api-integration-config-form" isLoading={isSubmitting}>
              Simpan Konfigurasi
            </Button>
          </div>
        ) : undefined}
      >
        {editItem && (
          <form id="api-integration-config-form" onSubmit={handleSubmit(onSubmitEdit)} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="col-span-full rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border"
                    style={{
                      borderColor: 'var(--module-primary-subtle, var(--border-light))',
                      backgroundColor: 'var(--module-primary-subtle, var(--gray-100))',
                      color: 'var(--module-primary, var(--text-primary))',
                    }}
                  >
                    <Globe size={18} />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-2xs font-semibold text-slate-500">Integrasi sistem</span>
                    <code className="block break-all font-mono text-xs font-bold text-slate-800">{editItem.key}</code>
                  </div>
                </div>
                <Badge variant="success">{editItem.http_method}</Badge>
              </div>
              {editItem.description && (
                <p className="mb-0 mt-3 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-600">
                  {editItem.description}
                </p>
              )}
            </div>

            <div className="col-span-full">
              <Controller
                control={control}
                name="url_api"
                render={({ field }) => (
                  <Input
                    label="URL Endpoint API *"
                    placeholder="https://sistem-lama.kampus.ac.id/api/..."
                    value={field.value || ''}
                    onChange={field.onChange}
                    error={errors.url_api?.message}
                  />
                )}
              />
            </div>

            <div>
              <Controller
                control={control}
                name="auth_type"
                render={({ field }) => (
                  <Select
                    label="Metode Autentikasi *"
                    value={field.value}
                    onChange={field.onChange}
                    options={AUTH_TYPE_OPTIONS}
                    error={errors.auth_type?.message}
                  />
                )}
              />
            </div>

            <div>
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <Select
                    label="Status Aktif *"
                    value={field.value ? 'true' : 'false'}
                    onChange={(val) => field.onChange(val === 'true')}
                    options={ACTIVE_STATUS_FORM_OPTIONS}
                    error={errors.is_active?.message}
                  />
                )}
              />
            </div>

            <div className="col-span-full">
              <Controller
                control={control}
                name="token"
                render={({ field }) => (
                  <Input
                    label="Token / Kredensial API"
                    type="password"
                    placeholder={editItem.token_configured ? 'Token tersimpan. Isi hanya untuk menggantinya.' : 'Masukkan token atau API Key...'}
                    value={field.value || ''}
                    onChange={field.onChange}
                    hint={editItem.token_configured
                      ? 'Token sudah tersimpan dan tidak ditampilkan demi keamanan. Biarkan kosong untuk mempertahankannya.'
                      : 'Belum ada token tersimpan. Masukkan token API untuk konfigurasi ini.'}
                    error={errors.token?.message}
                  />
                )}
              />
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL LIHAT SCHEMA JSON */}
      <Modal
        open={!!schemaItem}
        onClose={() => setSchemaItem(null)}
        title={`Kontrak Schema: ${schemaItem?.name}`}
      >
        {schemaItem && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Format data JSON yang diharapkan oleh modul internal saat mengambil data dari endpoint ini:
            </p>
            <div className="bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-2xs overflow-x-auto max-h-96">
              <pre>{JSON.stringify(schemaItem.expected_schema, null, 2)}</pre>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSchemaItem(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL UJI KONEKSI */}
      <Modal
        open={!!testItem}
        onClose={() => setTestItem(null)}
        title={`Uji Koneksi: ${testItem?.name}`}
      >
        {testItem && (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-slate-500" />
                <span className="font-bold text-slate-700 dark:text-slate-300">Target URL:</span>
                <span className="font-mono truncate">{testItem.url_api || '(Belum diset)'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-slate-500" />
                <span className="font-bold text-slate-700">Method:</span>
                <span className="px-2 py-0.5 text-2xs font-bold rounded font-mono bg-slate-100 text-slate-800 border border-slate-300">
                  {testItem.http_method}
                </span>
              </div>
            </div>

            {testError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg p-3 text-xs text-rose-800 dark:text-rose-200">
                <span className="font-bold block mb-1">Gagal Terhubung:</span>
                <p className="font-mono text-2xs">{testError}</p>
              </div>
            )}

            {testResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">HTTP Status:</span>
                    <Badge variant={testResult.is_success ? 'success' : 'danger'}>
                      {testResult.http_status}
                    </Badge>
                  </div>
                  <div className="text-slate-500">
                    Durasi: <span className="font-mono font-bold">{testResult.duration_ms}ms</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Contoh Respons Server:
                  </span>
                  <div className="bg-slate-900 text-emerald-400 rounded-lg p-3 font-mono text-2xs overflow-x-auto max-h-60">
                    <pre>
                      {typeof testResult.response_sample === 'object'
                        ? JSON.stringify(testResult.response_sample, null, 2)
                        : testResult.response_sample}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setTestItem(null)}>
                Tutup
              </Button>
              <Button
                icon={<Activity size={16} />}
                onClick={handleRunTest}
                isLoading={isTesting}
                disabled={!testItem.url_api}
              >
                Jalankan Tes Ping
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!syncItem}
        onClose={() => {
          if (!isSyncing) setSyncItem(null);
        }}
        title={`Sinkronisasi: ${syncItem?.name}`}
        closeOnOverlay={!isSyncing}
      >
        {syncItem && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
              Data akan diambil dari endpoint sumber dan diterapkan pada master tujuan. Data yang tidak lolos validasi akan dilewati dan dirinci setelah proses.
            </div>

            {syncResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Data Sumber', value: syncResult.source_total },
                    { label: 'Dibuat', value: syncResult.created },
                    { label: 'Diperbarui', value: syncResult.updated },
                    { label: 'Dilewati', value: syncResult.skipped },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                      <div className="text-lg font-bold text-slate-900">{item.value}</div>
                      <div className="text-2xs text-slate-600">{item.label}</div>
                    </div>
                  ))}
                </div>

                {syncResult.skipped_items.length > 0 && (
                  <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                    <h3 className="text-xs font-bold text-slate-800">Data yang dilewati</h3>
                    {syncResult.skipped_items.map((item, index) => (
                      <div key={`${item.source_id ?? item.row}-${index}`} className="border-b border-slate-100 pb-2 text-2xs last:border-0">
                        <div className="font-semibold text-slate-800">
                          {item.kode_prodi || 'Kode tidak tersedia'} · Baris {item.row}
                        </div>
                        <div className="text-slate-600">{item.reason}</div>
                      </div>
                    ))}
                    {syncResult.skipped > syncResult.skipped_items.length && (
                      <p className="text-2xs text-slate-500">
                        {syncResult.skipped - syncResult.skipped_items.length} data dilewati lainnya tidak ditampilkan.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSyncItem(null)} disabled={isSyncing}>
                {syncResult ? 'Tutup' : 'Batal'}
              </Button>
              {!syncResult && (
                <Button
                  icon={isSyncing ? undefined : <Check size={16} />}
                  onClick={handleRunSync}
                  isLoading={isSyncing}
                  disabled={!syncItem.url_api || !syncItem.is_active}
                >
                  Mulai Sinkronisasi
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
