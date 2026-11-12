import type { PaginationMeta } from './api.types';

export type NotificationSource = 'system' | 'lms';

export interface SystemNotification {
  id: number;
  module_id: number | null;
  module: { id: number; name: string; code: string; primary_color: string | null } | null;
  type: string;
  title: string;
  message: string | null;
  url: string | null;
  priority: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationFilters {
  page?: number;
  per_page?: number;
  search?: string;
  module_id?: number;
  is_read?: boolean;
  sort_by?: 'created_at' | 'read_at' | 'priority';
  sort_order?: 'asc' | 'desc';
}

export interface NotificationPreviewItem {
  id: number;
  source: NotificationSource;
  title: string;
  message: string | null;
  url: string | null;
  label: string;
  is_read: boolean;
  created_at: string;
}

export interface UnifiedNotificationItem {
  id: number;
  source: NotificationSource;
  uniqueKey: string;
  title: string;
  message: string | null;
  url: string | null;
  priority: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  module?: { id?: number; name: string; code?: string; primary_color?: string | null } | null;
  activityLabel?: string;
}

export interface UnifiedNotificationFilters {
  page?: number;
  per_page?: number;
  search?: string;
  is_read?: boolean;
  source?: 'all' | NotificationSource;
  sort_by?: 'created_at' | 'read_at' | 'priority';
  sort_order?: 'asc' | 'desc';
}

export interface UnifiedNotificationResult {
  data: UnifiedNotificationItem[];
  meta: PaginationMeta;
  failedSources: NotificationSource[];
}

export const NOTIFICATION_CHANGED_EVENT = 'notifications:changed';

export const NOTIFICATION_SORT_OPTIONS = [
  { value: 'created_at', label: 'Waktu' },
  { value: 'read_at', label: 'Waktu dibaca' },
  { value: 'priority', label: 'Prioritas' },
];

export const NOTIFICATION_READ_OPTIONS = [
  { value: 'false', label: 'Belum dibaca' },
  { value: 'true', label: 'Sudah dibaca' },
];
