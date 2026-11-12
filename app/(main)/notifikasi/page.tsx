'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BellRing, Check, CheckCheck, Filter, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { notificationService } from '@/services/notification.service';
import { formatDateTime, getApiErrorMessage } from '@/lib/utils';
import { getNotificationTarget } from '@/lib/notification-navigation';
import { useTenantConfig } from '@/components/tenant-config-provider';
import { SORT_ORDER_OPTIONS } from '@/lib/constants';
import type { PaginationMeta } from '@/types/api.types';
import {
  NOTIFICATION_CHANGED_EVENT,
  NOTIFICATION_READ_OPTIONS,
  NOTIFICATION_SORT_OPTIONS,
  type NotificationSource,
  type UnifiedNotificationItem,
} from '@/types/notification.types';

const filterSchema = z.object({
  search: z.string().max(200, 'Pencarian maksimal 200 karakter.'),
  is_read: z.enum(['', 'true', 'false']),
  sort_by: z.enum(['created_at', 'read_at', 'priority']),
  sort_order: z.enum(['asc', 'desc']),
});

type InboxFilter = z.infer<typeof filterSchema>;

const DEFAULT_FILTER: InboxFilter = {
  search: '',
  is_read: '',
  sort_by: 'created_at',
  sort_order: 'desc',
};

const EMPTY_META: PaginationMeta = { current_page: 1, last_page: 1, per_page: 15, total: 0 };

function UnifiedInboxContent() {
  const router = useRouter();
  const tenantConfig = useTenantConfig();

  const [rows, setRows] = useState<UnifiedNotificationItem[]>([]);
  const [failedSources, setFailedSources] = useState<NotificationSource[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [filter, setFilter] = useState<InboxFilter>(DEFAULT_FILTER);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<{ system: number; lms: number }>({ system: 0, lms: 0 });
  const [markingAll, setMarkingAll] = useState(false);
  const [markingKey, setMarkingKey] = useState<string | null>(null);
  const requestId = useRef(0);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<InboxFilter>({
    resolver: zodResolver(filterSchema),
    defaultValues: DEFAULT_FILTER,
  });

  const load = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    try {
      const response = await notificationService.getUnifiedList({
        page,
        per_page: perPage,
        search: filter.search || undefined,
        is_read: filter.is_read === '' ? undefined : filter.is_read === 'true',
        sort_by: filter.sort_by,
        sort_order: filter.sort_order,
      });
      if (current !== requestId.current) return;
      setRows(response.data ?? []);
      setMeta(response.meta ?? EMPTY_META);
      setFailedSources(response.failedSources);
    } catch (error: unknown) {
      if (current !== requestId.current) return;
      toast.error(getApiErrorMessage(error, 'Gagal memuat notifikasi terpadu.'));
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [page, perPage, filter]);

  const loadCount = useCallback(async () => {
    try {
      const counts = await notificationService.getUnreadCounts();
      setUnreadCounts({
        system: counts.system ?? 0,
        lms: counts.lms ?? 0,
      });
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Gagal memuat jumlah notifikasi.'));
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  useEffect(() => {
    void Promise.resolve().then(loadCount);
    const refresh = () => {
      void loadCount();
      void load();
    };
    window.addEventListener(NOTIFICATION_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(NOTIFICATION_CHANGED_EVENT, refresh);
  }, [load, loadCount]);

  const unreadTotal = unreadCounts.system + unreadCounts.lms;

  const markRead = async (row: UnifiedNotificationItem, open = false) => {
    setMarkingKey(row.uniqueKey);
    try {
      if (!row.is_read) {
        await notificationService.markUnifiedRead(row.source, row.id);
        setRows((prev) =>
          prev.map((r) => (r.uniqueKey === row.uniqueKey ? { ...r, is_read: true } : r))
        );
        void loadCount();
      }
      const target = getNotificationTarget(row.url, tenantConfig);
      if (open && target) {
        router.push(target);
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Gagal menandai notifikasi.'));
    } finally {
      setMarkingKey(null);
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllSourcesRead();
      toast.success('Seluruh notifikasi ditandai sudah dibaca.');
      void loadCount();
      void load();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Gagal menandai seluruh notifikasi.'));
    } finally {
      setMarkingAll(false);
    }
  };

  const handleApplyFilter = (values: InboxFilter) => {
    setFilter(values);
    setPage(1);
    setShowFilter(false);
  };

  const handleResetFilter = () => {
    reset(DEFAULT_FILTER);
    setFilter(DEFAULT_FILTER);
    setPage(1);
    setShowFilter(false);
  };

  const columns: ColumnDef<UnifiedNotificationItem>[] = [
    {
      key: 'title',
      label: 'NOTIFIKASI',
      render: (row) => (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-800">{row.title}</span>
            <Badge
              variant="gray"
              className="text-2xs"
              style={
                row.module?.primary_color
                  ? {
                      borderColor: row.module.primary_color,
                      color: row.module.primary_color,
                      backgroundColor: `${row.module.primary_color}18`,
                    }
                  : {
                      borderColor: 'var(--module-primary)',
                      color: 'var(--module-primary)',
                      backgroundColor: 'var(--module-primary-subtle)',
                    }
              }
            >
              {row.source === 'lms' && row.activityLabel
                ? `LMS · ${row.activityLabel}`
                : row.module?.name ?? 'Sistem'}
            </Badge>
          </div>
          {row.message ? (
            <span className="text-2xs text-slate-500 block line-clamp-2">{row.message}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'WAKTU',
      render: (row) => <span className="text-xs text-slate-600">{formatDateTime(row.created_at)}</span>,
    },
    {
      key: 'is_read',
      label: 'STATUS',
      render: (row) => (
        <Badge variant={row.is_read ? 'gray' : 'red'}>
          {row.is_read ? 'Dibaca' : 'Belum Dibaca'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'AKSI',
      align: 'right',
      render: (row) => (
        <DropdownMenu
          items={[
            {
              label: 'Buka Tujuan',
              icon: <BellRing size={16} />,
              disabled: !row.url || markingKey === row.uniqueKey,
              onClick: () => void markRead(row, true),
            },
            {
              label: 'Tandai Sudah Dibaca',
              icon: <Check size={16} />,
              disabled: row.is_read || markingKey === row.uniqueKey,
              onClick: () => void markRead(row, false),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="w-full flex flex-col gap-4">
      <PageHeader
        title="Notifikasi"
        description={`Inbox terpadu · ${unreadTotal} belum dibaca`}
        breadcrumbs={[{ label: 'Notifikasi' }]}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => {
                reset(filter);
                setShowFilter(true);
              }}
            >
              Filter
            </Button>
            <Button
              icon={<CheckCheck size={16} />}
              loading={markingAll}
              disabled={markingAll || unreadTotal === 0}
              onClick={() => void markAll()}
            >
              Tandai Semua Dibaca
            </Button>
          </div>
        }
      />
      {failedSources.length > 0 && (
        <p role="status" className="alert alert-warning text-xs">
          Sebagian notifikasi belum dapat dimuat ({failedSources.join(', ')}).
        </p>
      )}
      <DataTable
        columns={columns}
        data={rows}
        keyExtractor={(row) => row.uniqueKey}
        isLoading={loading}
        meta={meta}
        onPageChange={setPage}
        onLimitChange={(limit) => {
          setPage(1);
          setPerPage(limit);
        }}
        emptyMessage="Belum ada notifikasi."
      />
      <Drawer open={showFilter} onClose={() => setShowFilter(false)} title="Filter Notifikasi">
        <form className="space-y-4" noValidate onSubmit={handleSubmit(handleApplyFilter)}>
          <Input label="Pencarian" {...register('search')} error={errors.search?.message} />
          <Controller
            name="is_read"
            control={control}
            render={({ field }) => (
              <Select
                label="Status Baca"
                options={NOTIFICATION_READ_OPTIONS}
                value={field.value}
                isClearable
                onChange={(value) => field.onChange(value ? String(value) : '')}
              />
            )}
          />
          <hr className="border-t border-slate-200" />
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="sort_by"
              control={control}
              render={({ field }) => (
                <Select
                  label="Urut Berdasarkan"
                  options={NOTIFICATION_SORT_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name="sort_order"
              control={control}
              render={({ field }) => (
                <Select
                  label="Arah"
                  options={SORT_ORDER_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              icon={<RotateCcw size={16} />}
              onClick={handleResetFilter}
            >
              Reset
            </Button>
            <Button type="submit" icon={<Check size={16} />}>
              Terapkan
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

export default function UnifiedInboxPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-slate-500">Memuat notifikasi...</div>}>
      <UnifiedInboxContent />
    </Suspense>
  );
}
