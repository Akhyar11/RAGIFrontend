'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { InboxTabs } from '@/components/notifications/InboxTabs';
import { NOTIFICATION_CHANGED_EVENT } from '@/types/notification.types';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { StatCard } from '@/components/ui/StatCard';
import { lmsService } from '@/services/lms.service';
import { formatDateTime, formatRelativeTime, getApiErrorMessage } from '@/lib/utils';
import { SORT_ORDER_OPTIONS } from '@/lib/constants';
import {
  LMS_NOTIFIKASI_JENIS_LABEL,
  LMS_NOTIFIKASI_JENIS_OPTIONS,
  LMS_NOTIFIKASI_READ_OPTIONS,
  LMS_NOTIFIKASI_SORT_BY_OPTIONS,
  LmsNotifikasiItem,
  LmsNotifikasiJenis,
  LmsNotifikasiPrioritas,
} from '@/types/lms.types';
import type { PaginationMeta } from '@/types/api.types';
import { Bell, BellRing, Check, CheckCheck, Filter, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_META: PaginationMeta = {
  current_page: 1,
  per_page: 15,
  total: 0,
  last_page: 1,
};

const DEFAULT_PER_PAGE = 15;

/**
 * Nilai filter yang benar-benar dikirim ke API.
 * Dipisah dari nilai draft di Drawer agar mengetik pencarian
 * tidak memicu request pada setiap ketikan.
 */
interface NotifikasiFilter {
  search: string;
  jenis: string;
  is_read: string;
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

const DEFAULT_FILTER: NotifikasiFilter = {
  search: '',
  jenis: '',
  is_read: '',
  sort_by: 'created_at',
  sort_order: 'desc',
};

/**
 * Varian badge untuk tiap jenis notifikasi (closed-set domain).
 */
const JENIS_BADGE_VARIANT: Record<
  LmsNotifikasiJenis,
  'blue' | 'amber' | 'green' | 'purple' | 'cyan' | 'gray'
> = {
  deadline_tugas: 'amber',
  deadline_quiz: 'amber',
  tugas_baru: 'blue',
  quiz_baru: 'blue',
  forum: 'purple',
  info: 'gray',
};

/**
 * Varian badge prioritas notifikasi (closed-set domain).
 */
const PRIORITAS_BADGE_VARIANT: Record<LmsNotifikasiPrioritas, 'red' | 'blue' | 'gray'> = {
  rendah: 'gray',
  normal: 'blue',
  tinggi: 'red',
};

const PRIORITAS_LABEL: Record<LmsNotifikasiPrioritas, string> = {
  rendah: 'Rendah',
  normal: 'Normal',
  tinggi: 'Tinggi',
};

/**
 * Inbox notifikasi in-app LMS (LMS-04 / Fase 3A).
 *
 * Notifikasi bersifat personal — setiap pengguna hanya melihat miliknya
 * sendiri. Halaman ini tidak memakai permission modul; cukup token sesi.
 */
export default function LmsNotifikasiPage() {
  const [rows, setRows] = useState<LmsNotifikasiItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  // Filter terapan (dipakai untuk request)
  const [appliedFilter, setAppliedFilter] = useState<NotifikasiFilter>(DEFAULT_FILTER);

  // Filter draft (di dalam Drawer)
  const [showFilter, setShowFilter] = useState(false);
  const [draftFilter, setDraftFilter] = useState<NotifikasiFilter>(DEFAULT_FILTER);

  // Aksi
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);

  const fetchUnreadCount = useCallback(async (): Promise<void> => {
    try {
      const res = await lmsService.getNotifikasiUnreadCount();
      if (res.status === 'success' && res.data) {
        setUnreadCount(res.data.unread_count ?? 0);
      }
    } catch {
      // Badge bersifat tambahan — kegagalan tidak memblokir daftar.
    }
  }, []);

  const fetchRows = useCallback(
    async (page: number, limit: number): Promise<void> => {
      setIsLoading(true);
      try {
        const res = await lmsService.getNotifikasi({
          page,
          per_page: limit,
          search: appliedFilter.search || undefined,
          jenis: appliedFilter.jenis || undefined,
          is_read: appliedFilter.is_read === '' ? undefined : appliedFilter.is_read === 'true',
          sort_by: appliedFilter.sort_by,
          sort_order: appliedFilter.sort_order,
        });

        if (res.status === 'success') {
          setRows(res.data || []);
          if (res.meta) setMeta(res.meta);
        } else {
          setRows([]);
        }
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Gagal memuat notifikasi.'));
        setRows([]);
      } finally {
        setIsLoading(false);
      }
    },
    [appliedFilter]
  );

  useEffect(() => {
    void Promise.resolve().then(() => fetchRows(1, perPage));
  }, [fetchRows, perPage]);

  useEffect(() => {
    void Promise.resolve().then(fetchUnreadCount);
    const refresh = () => {
      void fetchUnreadCount();
      void fetchRows(meta.current_page, perPage);
    };
    window.addEventListener(NOTIFICATION_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(NOTIFICATION_CHANGED_EVENT, refresh);
  }, [fetchUnreadCount, fetchRows, meta.current_page, perPage]);

  const handleApplyFilter = (): void => {
    setShowFilter(false);
    setAppliedFilter(draftFilter);
  };

  const handleResetFilter = (): void => {
    setDraftFilter(DEFAULT_FILTER);
    setAppliedFilter(DEFAULT_FILTER);
    setShowFilter(false);
  };

  const handleMarkRead = async (row: LmsNotifikasiItem): Promise<void> => {
    if (row.is_read) return;

    setMarkingId(row.id);
    try {
      await lmsService.markNotifikasiRead(row.id);
      window.dispatchEvent(new Event(NOTIFICATION_CHANGED_EVENT));
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, is_read: true } : item)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success('Notifikasi ditandai sudah dibaca.');

      // Jika sedang memfilter status, muat ulang agar baris keluar dari daftar.
      if (appliedFilter.is_read !== '') {
        fetchRows(meta.current_page, perPage);
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Gagal menandai notifikasi.'));
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async (): Promise<void> => {
    setIsMarkingAll(true);
    try {
      const res = await lmsService.markAllNotifikasiRead();
      window.dispatchEvent(new Event(NOTIFICATION_CHANGED_EVENT));
      const updated = res.data?.updated ?? 0;
      setRows((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
      toast.success(
        updated > 0
          ? `${updated} notifikasi ditandai sudah dibaca.`
          : 'Tidak ada notifikasi yang belum dibaca.'
      );
      fetchRows(meta.current_page, perPage);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Gagal menandai seluruh notifikasi.'));
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleOpen = (row: LmsNotifikasiItem): void => {
    if (row.rute) {
      window.location.href = row.rute;
    }
  };

  /* ---------------------------------------------------------------------
   | Kolom tabel
   | --------------------------------------------------------------------- */

  const columns: ColumnDef<LmsNotifikasiItem>[] = useMemo(
    () => [
      {
        key: 'judul',
        label: 'NOTIFIKASI',
        render: (row) => (
          <div className="max-w-[360px]">
            <span className="font-bold text-slate-800 text-xs block">{row.judul}</span>
            <span className="text-2xs text-slate-500 block truncate">{row.pesan || '-'}</span>
          </div>
        ),
      },
      {
        key: 'jenis',
        label: 'JENIS',
        render: (row) => (
          <Badge variant={JENIS_BADGE_VARIANT[row.jenis] ?? 'gray'}>
            {LMS_NOTIFIKASI_JENIS_LABEL[row.jenis] ?? row.jenis}
          </Badge>
        ),
      },
      {
        key: 'prioritas',
        label: 'PRIORITAS',
        align: 'center',
        render: (row) => (
          <Badge variant={PRIORITAS_BADGE_VARIANT[row.prioritas] ?? 'gray'}>
            {PRIORITAS_LABEL[row.prioritas] ?? row.prioritas}
          </Badge>
        ),
      },
      {
        key: 'kelas',
        label: 'KELAS',
        render: (row) => (
          <div>
            <span className="text-xs text-slate-700 block">{row.kelas?.kode_kelas || '-'}</span>
            <span className="text-2xs text-slate-500 block">{row.kelas?.nama_kelas || '-'}</span>
          </div>
        ),
      },
      {
        key: 'waktu',
        label: 'WAKTU',
        render: (row) => (
          <div>
            <span className="text-xs text-slate-700 block">{formatDateTime(row.created_at)}</span>
            <span className="text-2xs text-slate-500 block">
              {formatRelativeTime(row.created_at)}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        label: 'STATUS',
        align: 'center',
        render: (row) =>
          row.is_read ? (
            <Badge variant="gray">Dibaca</Badge>
          ) : (
            <Badge variant="red">Belum Dibaca</Badge>
          ),
      },
      {
        key: 'aksi',
        label: 'AKSI',
        align: 'right',
        render: (row) => (
          <div className="flex justify-end">
            <DropdownMenu
              items={[
                {
                  label: 'Buka Tujuan',
                  icon: <BellRing size={16} />,
                  disabled: !row.rute,
                  onClick: () => handleOpen(row),
                },
                {
                  label: 'Tandai Sudah Dibaca',
                  icon: <Check size={16} />,
                  disabled: row.is_read || markingId === row.id,
                  onClick: () => handleMarkRead(row),
                },
              ]}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markingId, appliedFilter.is_read, meta.current_page, perPage]
  );

  /* ---------------------------------------------------------------------
   | Render
   | --------------------------------------------------------------------- */

  return (
    <div className="w-full flex flex-col space-y-4">
      <PageHeader
        title="Notifikasi"
        description="Inbox notifikasi pribadi: pengingat deadline tugas/kuis serta informasi aktivitas LMS."
        breadcrumbs={[{ label: 'LMS', href: '/lms' }, { label: 'Notifikasi' }]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
              onClick={() => {
                setDraftFilter(appliedFilter);
                setShowFilter(true);
              }}
            >
              Filter
            </Button>
            <Button
              variant="primary"
              icon={<CheckCheck size={16} />}
              loading={isMarkingAll}
              disabled={isMarkingAll || unreadCount === 0}
              onClick={handleMarkAllRead}
            >
              Tandai Semua Dibaca
            </Button>
          </div>
        }
      />

      <InboxTabs active="lms" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total Notifikasi"
          value={meta.total}
          icon={<Bell size={18} />}
          iconVariant="blue"
          footer={<span className="text-2xs">Sesuai filter yang aktif</span>}
        />
        <StatCard
          label="Belum Dibaca"
          value={unreadCount}
          icon={<BellRing size={18} />}
          iconVariant={unreadCount > 0 ? 'red' : 'gray'}
          footer={
            <span className="text-2xs">
              {unreadCount > 0
                ? 'Klik lonceng atau tandai langsung di tabel'
                : 'Semua notifikasi sudah dibaca'}
            </span>
          }
        />
      </div>

      <div className="card">
        <div className="card-body">
          <DataTable
            columns={columns}
            data={rows}
            isLoading={isLoading}
            meta={meta}
            onPageChange={(page) => fetchRows(page, perPage)}
            onLimitChange={(limit) => setPerPage(limit)}
            emptyMessage="Belum ada notifikasi."
          />
        </div>
      </div>

      {/* Filter Drawer */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Notifikasi"
        footer={
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" icon={<RotateCcw size={16} />} onClick={handleResetFilter}>
              Reset
            </Button>
            <Button icon={<Check size={16} />} onClick={handleApplyFilter}>
              Terapkan
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Pencarian"
            placeholder="Cari judul atau pesan notifikasi..."
            value={draftFilter.search}
            onChange={(e) => setDraftFilter((prev) => ({ ...prev, search: e.target.value }))}
          />

          <Select
            label="Jenis"
            placeholder="Semua jenis..."
            value={draftFilter.jenis}
            onChange={(val) => setDraftFilter((prev) => ({ ...prev, jenis: val ? String(val) : '' }))}
            options={LMS_NOTIFIKASI_JENIS_OPTIONS}
            isClearable
          />

          <Select
            label="Status Baca"
            placeholder="Semua status..."
            value={draftFilter.is_read}
            onChange={(val) =>
              setDraftFilter((prev) => ({ ...prev, is_read: val ? String(val) : '' }))
            }
            options={LMS_NOTIFIKASI_READ_OPTIONS}
            isClearable
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              value={draftFilter.sort_by}
              onChange={(val) => setDraftFilter((prev) => ({ ...prev, sort_by: String(val) }))}
              options={LMS_NOTIFIKASI_SORT_BY_OPTIONS}
            />
            <Select
              label="Arah"
              value={draftFilter.sort_order}
              onChange={(val) =>
                setDraftFilter((prev) => ({
                  ...prev,
                  sort_order: val === 'asc' ? 'asc' : 'desc',
                }))
              }
              options={SORT_ORDER_OPTIONS}
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
