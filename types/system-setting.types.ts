export const SPMB_ADMIN_RECIPIENT_SETTING_KEY = 'spmb_admin_notification_user_ids';

export interface SpmbAdminUser {
  id: number;
  name: string;
  username: string;
  email: string | null;
  is_active: boolean;
}

export interface SpmbAdminMappingPayload {
  user_ids: number[];
}

export interface SpmbAdminMapping extends SpmbAdminMappingPayload {
  users: SpmbAdminUser[];
}

export interface SystemSettingRecord {
  id: number | null;
  key: string;
  value: string;
  description: string | null;
  users?: SpmbAdminUser[];
}

export interface SpmbAdminOptionsQuery {
  search?: string;
  page?: number;
  per_page?: number;
  sort_by?: 'name' | 'username' | 'email' | 'id';
  sort_order?: 'asc' | 'desc';
}
