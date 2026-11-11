import apiClient from '@/lib/axios';
import { lmsService } from '@/services/lms.service';
import { LMS_NOTIFIKASI_JENIS_LABEL } from '@/types/lms.types';
import type { ApiResponse } from '@/types/api.types';
import {
  NOTIFICATION_CHANGED_EVENT,
  type NotificationFilters,
  type NotificationPreviewItem,
  type NotificationSource,
  type SystemNotification,
} from '@/types/notification.types';

function notifyChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NOTIFICATION_CHANGED_EVENT));
}

const SOURCES: NotificationSource[] = ['system', 'lms'];

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

  markAllSourcesRead: async (): Promise<void> => {
    const results = await Promise.allSettled([
      notificationService.markAllRead(), lmsService.markAllNotifikasiRead(),
    ]);
    notifyChanged();
    if (results.some((result) => result.status === 'rejected')) {
      throw new Error('Sebagian notifikasi gagal ditandai dibaca. Silakan coba lagi.');
    }
  },
};
