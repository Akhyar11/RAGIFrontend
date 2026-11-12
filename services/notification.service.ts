import apiClient from '@/lib/axios';
import { lmsService } from '@/services/lms.service';
import { LMS_NOTIFIKASI_JENIS_LABEL } from '@/types/lms.types';
import type { ApiResponse, PaginationMeta } from '@/types/api.types';
import {
  NOTIFICATION_CHANGED_EVENT,
  type NotificationFilters,
  type NotificationPreviewItem,
  type NotificationSource,
  type SystemNotification,
  type UnifiedNotificationFilters,
  type UnifiedNotificationItem,
  type UnifiedNotificationResult,
} from '@/types/notification.types';

function notifyChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NOTIFICATION_CHANGED_EVENT));
}

const SOURCES: NotificationSource[] = ['system', 'lms'];

const DEFAULT_META: PaginationMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
};

export const notificationService = {
  getList: async (params?: NotificationFilters): Promise<ApiResponse<SystemNotification[]>> => {
    const { data } = await apiClient.get<ApiResponse<SystemNotification[]>>('/notifications', { params });
    return data;
  },

  getUnreadCount: async (): Promise<ApiResponse<{ unread_count: number }>> => {
    const { data } = await apiClient.get<ApiResponse<{ unread_count: number }>>('/notifications/unread-count');
    return data;
  },

  markRead: async (id: number): Promise<ApiResponse<SystemNotification>> => {
    const { data } = await apiClient.post<ApiResponse<SystemNotification>>(`/notifications/${id}/read`);
    notifyChanged();
    return data;
  },

  markAllRead: async (): Promise<ApiResponse<{ updated: number }>> => {
    const { data } = await apiClient.post<ApiResponse<{ updated: number }>>('/notifications/read-all');
    notifyChanged();
    return data;
  },

  getPreview: async (limit: number): Promise<{ items: NotificationPreviewItem[]; failedSources: NotificationSource[] }> => {
    const results = await Promise.allSettled([
      notificationService.getList({ per_page: limit, sort_order: 'desc' }),
      lmsService.getNotifikasi({ per_page: limit, sort_order: 'desc' }),
    ]);
    const items: NotificationPreviewItem[] = [];
    const failedSources: NotificationSource[] = [];
    const [system, lms] = results;
    if (system.status === 'fulfilled') {
      items.push(...(system.value.data ?? []).map((item) => ({
        id: item.id, source: 'system' as const, title: item.title, message: item.message,
        url: item.url, label: item.module?.name ?? 'Sistem', is_read: item.is_read, created_at: item.created_at,
      })));
    } else failedSources.push('system');
    if (lms.status === 'fulfilled') {
      items.push(...(lms.value.data ?? []).map((item) => ({
        id: item.id, source: 'lms' as const, title: item.judul, message: item.pesan,
        url: item.rute, label: `LMS · ${LMS_NOTIFIKASI_JENIS_LABEL[item.jenis] ?? item.jenis}`,
        is_read: item.is_read, created_at: item.created_at,
      })));
    } else failedSources.push('lms');
    items.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id || a.source.localeCompare(b.source));
    return { items: items.slice(0, limit), failedSources };
  },

  getUnreadCounts: async (): Promise<Partial<Record<NotificationSource, number>>> => {
    const results = await Promise.allSettled([
      notificationService.getUnreadCount(), lmsService.getNotifikasiUnreadCount(),
    ]);
    const counts: Partial<Record<NotificationSource, number>> = {};
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') counts[SOURCES[index]] = result.value.data?.unread_count ?? 0;
    });
    return counts;
  },

  markPreviewRead: async (item: NotificationPreviewItem): Promise<void> => {
    if (item.source === 'system') await notificationService.markRead(item.id);
    else {
      await lmsService.markNotifikasiRead(item.id);
      notifyChanged();
    }
  },

  markUnifiedRead: async (source: NotificationSource, id: number): Promise<void> => {
    if (source === 'system') {
      await notificationService.markRead(id);
    } else {
      await lmsService.markNotifikasiRead(id);
      notifyChanged();
    }
  },

  markAllSourcesRead: async (): Promise<void> => {
    const results = await Promise.allSettled([
      notificationService.markAllRead(), lmsService.markAllNotifikasiRead(),
    ]);
    notifyChanged();
    if (results.some((result) => result.status === 'rejected')) {
      throw new Error('Sebagian notifikasi gagal ditandai dibaca. Silakan coba lagi.');
    }
  },

  getUnifiedList: async (params: UnifiedNotificationFilters = {}): Promise<UnifiedNotificationResult> => {
    const page = params.page ?? 1;
    const perPage = params.per_page ?? 15;
    const source = params.source ?? 'all';

    if (source === 'system') {
      const res = await notificationService.getList({
        page,
        per_page: perPage,
        search: params.search,
        is_read: params.is_read,
        sort_by: params.sort_by,
        sort_order: params.sort_order,
      });
      const data: UnifiedNotificationItem[] = (res.data ?? []).map((item) => ({
        id: item.id,
        source: 'system',
        uniqueKey: `system-${item.id}`,
        title: item.title,
        message: item.message,
        url: item.url,
        priority: item.priority,
        is_read: item.is_read,
        read_at: item.read_at,
        created_at: item.created_at,
        module: item.module,
        activityLabel: undefined,
      }));
      return {
        data,
        meta: res.meta ?? { ...DEFAULT_META, current_page: page, per_page: perPage, total: data.length },
        failedSources: [],
      };
    }

    if (source === 'lms') {
      const res = await lmsService.getNotifikasi({
        page,
        per_page: perPage,
        search: params.search,
        is_read: params.is_read,
        sort_by: params.sort_by,
        sort_order: params.sort_order,
      });
      const data: UnifiedNotificationItem[] = (res.data ?? []).map((item) => ({
        id: item.id,
        source: 'lms',
        uniqueKey: `lms-${item.id}`,
        title: item.judul,
        message: item.pesan,
        url: item.rute,
        priority: item.prioritas,
        is_read: item.is_read,
        read_at: item.read_at,
        created_at: item.created_at,
        module: { name: 'LMS', code: 'lms', primary_color: null },
        activityLabel: LMS_NOTIFIKASI_JENIS_LABEL[item.jenis] ?? item.jenis,
      }));
      return {
        data,
        meta: res.meta ?? { ...DEFAULT_META, current_page: page, per_page: perPage, total: data.length },
        failedSources: [],
      };
    }

    // Source === 'all': fetch from both sources concurrently
    const fetchLimit = Math.max(page * perPage, 50);
    const results = await Promise.allSettled([
      notificationService.getList({
        page: 1,
        per_page: fetchLimit,
        search: params.search,
        is_read: params.is_read,
        sort_by: params.sort_by,
        sort_order: params.sort_order,
      }),
      lmsService.getNotifikasi({
        page: 1,
        per_page: fetchLimit,
        search: params.search,
        is_read: params.is_read,
        sort_by: params.sort_by,
        sort_order: params.sort_order,
      }),
    ]);

    const items: UnifiedNotificationItem[] = [];
    const failedSources: NotificationSource[] = [];
    let totalCount = 0;

    const [systemResult, lmsResult] = results;

    if (systemResult.status === 'fulfilled') {
      const sysData = systemResult.value.data ?? [];
      totalCount += systemResult.value.meta?.total ?? sysData.length;
      items.push(
        ...sysData.map((item) => ({
          id: item.id,
          source: 'system' as const,
          uniqueKey: `system-${item.id}`,
          title: item.title,
          message: item.message,
          url: item.url,
          priority: item.priority,
          is_read: item.is_read,
          read_at: item.read_at,
          created_at: item.created_at,
          module: item.module,
          activityLabel: undefined,
        }))
      );
    } else {
      failedSources.push('system');
    }

    if (lmsResult.status === 'fulfilled') {
      const lmsData = lmsResult.value.data ?? [];
      totalCount += lmsResult.value.meta?.total ?? lmsData.length;
      items.push(
        ...lmsData.map((item) => ({
          id: item.id,
          source: 'lms' as const,
          uniqueKey: `lms-${item.id}`,
          title: item.judul,
          message: item.pesan,
          url: item.rute,
          priority: item.prioritas,
          is_read: item.is_read,
          read_at: item.read_at,
          created_at: item.created_at,
          module: { name: 'LMS', code: 'lms', primary_color: null },
          activityLabel: LMS_NOTIFIKASI_JENIS_LABEL[item.jenis] ?? item.jenis,
        }))
      );
    } else {
      failedSources.push('lms');
    }

    const sortOrder = params.sort_order === 'asc' ? 1 : -1;
    const sortBy = params.sort_by || 'created_at';

    items.sort((a, b) => {
      if (sortBy === 'read_at') {
        const timeA = a.read_at ? Date.parse(a.read_at) : 0;
        const timeB = b.read_at ? Date.parse(b.read_at) : 0;
        if (timeA !== timeB) return (timeA - timeB) * sortOrder;
      } else if (sortBy === 'priority') {
        const priorityWeight: Record<string, number> = {
          tinggi: 3, high: 3, normal: 2, sedang: 2, rendah: 1, low: 1,
        };
        const weightA = priorityWeight[a.priority?.toLowerCase() ?? ''] ?? 0;
        const weightB = priorityWeight[b.priority?.toLowerCase() ?? ''] ?? 0;
        if (weightA !== weightB) return (weightA - weightB) * sortOrder;
      }
      const timeA = Date.parse(a.created_at) || 0;
      const timeB = Date.parse(b.created_at) || 0;
      if (timeA !== timeB) return (timeA - timeB) * sortOrder;
      return (b.id - a.id) * sortOrder || a.source.localeCompare(b.source);
    });

    const startIndex = (page - 1) * perPage;
    const pagedData = items.slice(startIndex, startIndex + perPage);
    const resolvedTotal = Math.max(totalCount, items.length);

    return {
      data: pagedData,
      meta: {
        current_page: page,
        per_page: perPage,
        total: resolvedTotal,
        last_page: Math.max(1, Math.ceil(resolvedTotal / perPage)),
      },
      failedSources,
    };
  },
};
