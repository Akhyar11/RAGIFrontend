'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BellRing, Check, CheckCheck, Filter, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { InboxTabs } from '@/components/notifications/InboxTabs';
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
import { SORT_ORDER_OPTIONS } from '@/lib/constants';
import type { PaginationMeta } from '@/types/api.types';
import {
  NOTIFICATION_CHANGED_EVENT, NOTIFICATION_READ_OPTIONS, NOTIFICATION_SORT_OPTIONS,
  type SystemNotification,
} from '@/types/notification.types';

const filterSchema = z.object({
  search: z.string().max(200, 'Pencarian maksimal 200 karakter.'),
  is_read: z.enum(['', 'true', 'false']),
  sort_by: z.enum(['created_at', 'read_at', 'priority']),
  sort_order: z.enum(['asc', 'desc']),
});
type InboxFilter = z.infer<typeof filterSchema>;
const DEFAULT_FILTER: InboxFilter = { search: '', is_read: '', sort_by: 'created_at', sort_order: 'desc' };
const EMPTY_META: PaginationMeta = { current_page: 1, last_page: 1, per_page: 15, total: 0 };

export default function SystemInboxPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SystemNotification[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [unread, setUnread] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const requestId = useRef(0);
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<InboxFilter>({
    resolver: zodResolver(filterSchema), defaultValues: DEFAULT_FILTER,
  });

  const load = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    try {
      const response = await notificationService.getList({
        page, per_page: perPage, search: filter.search || undefined,
        is_read: filter.is_read === '' ? undefined : filter.is_read === 'true',
        sort_by: filter.sort_by, sort_order: filter.sort_order,
      });
      if (current !== requestId.current) return;
      setRows(response.data ?? []);
      setMeta(response.meta ?? EMPTY_META);
    } catch (error: unknown) {
      if (current !== requestId.current) return;
      toast.error(getApiErrorMessage(error, 'Gagal memuat inbox sistem.'));
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [page, perPage, filter]);

  const loadCount = useCallback(async () => {
    try {
      const response = await notificationService.getUnreadCount();
      setUnread(response.data?.unread_count ?? 0);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Gagal memuat jumlah notifikasi.'));
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => {
    void Promise.resolve().then(loadCount);
    const refresh = () => { void loadCount(); void load(); };
    window.addEventListener(NOTIFICATION_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(NOTIFICATION_CHANGED_EVENT, refresh);
  }, [load, loadCount]);

  const markRead = async (row: SystemNotification, open = false) => {
    setMarkingId(row.id);
    try {
      if (!row.is_read) await notificationService.markRead(row.id);
      const target = getNotificationTarget(row.url);
      if (open && target) router.push(target);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Gagal menandai notifikasi.'));
    } finally { setMarkingId(null); }
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllRead();
      toast.success('Notifikasi sistem ditandai sudah dibaca.');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Gagal menandai seluruh notifikasi.'));
    } finally { setMarkingAll(false); }
  };

  const columns: ColumnDef<SystemNotification>[] = [
    { key: 'title', label: 'NOTIFIKASI', render: (row) => (
      <div className="space-y-2">
        <span className="text-xs font-bold block">{row.title}</span>
        <span className="text-2xs block">{row.message}</span>
        <span className="text-2xs" style={{ color: row.module?.primary_color ?? 'var(--text-secondary)' }}>{row.module?.name ?? 'Sistem'}</span>
      </div>
    ) },
    { key: 'created_at', label: 'WAKTU', render: (row) => <span className="text-xs">{formatDateTime(row.created_at)}</span> },
    { key: 'is_read', label: 'STATUS', render: (row) => <Badge variant={row.is_read ? 'gray' : 'red'}>{row.is_read ? 'Dibaca' : 'Belum Dibaca'}</Badge> },
    { key: 'actions', label: 'AKSI', align: 'right', render: (row) => <DropdownMenu items={[
      { label: 'Buka Tujuan', icon: <BellRing size={16} />, disabled: !row.url || markingId === row.id, onClick: () => void markRead(row, true) },
      { label: 'Tandai Sudah Dibaca', icon: <Check size={16} />, disabled: row.is_read || markingId === row.id, onClick: () => void markRead(row) },
    ]} /> },
  ];

  return (
    <div className="w-full flex flex-col gap-4">
      <PageHeader title="Notifikasi Sistem" description={`Inbox pribadi · ${unread} belum dibaca`}
        breadcrumbs={[{ label: 'Notifikasi' }]}
        action={<div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={<Filter size={16} />} onClick={() => { reset(filter); setShowFilter(true); }}>Filter</Button>
          <Button icon={<CheckCheck size={16} />} loading={markingAll} disabled={markingAll || unread === 0} onClick={() => void markAll()}>Tandai Semua Dibaca</Button>
        </div>} />
      <InboxTabs active="system" />
      <div className="card"><div className="card-body">
        <DataTable columns={columns} data={rows} isLoading={loading} meta={meta} onPageChange={setPage}
          onLimitChange={(limit) => { setPage(1); setPerPage(limit); }} emptyMessage="Belum ada notifikasi sistem." />
      </div></div>
      <Drawer open={showFilter} onClose={() => setShowFilter(false)} title="Filter Notifikasi">
        <form className="space-y-4" noValidate onSubmit={handleSubmit((values) => { setFilter(values); setPage(1); setShowFilter(false); })}>
          <Input label="Pencarian" {...register('search')} error={errors.search?.message} />
          <Controller name="is_read" control={control} render={({ field }) => <Select label="Status Baca" options={NOTIFICATION_READ_OPTIONS}
            value={field.value} isClearable onChange={(value) => field.onChange(value ? String(value) : '')} />} />
          <div className="grid grid-cols-2 gap-4">
            <Controller name="sort_by" control={control} render={({ field }) => <Select label="Urut Berdasarkan" options={NOTIFICATION_SORT_OPTIONS}
              value={field.value} onChange={field.onChange} />} />
            <Controller name="sort_order" control={control} render={({ field }) => <Select label="Arah" options={SORT_ORDER_OPTIONS}
              value={field.value} onChange={field.onChange} />} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" icon={<RotateCcw size={16} />} onClick={() => { reset(DEFAULT_FILTER); setFilter(DEFAULT_FILTER); setPage(1); setShowFilter(false); }}>Reset</Button>
            <Button type="submit" icon={<Check size={16} />}>Terapkan</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
