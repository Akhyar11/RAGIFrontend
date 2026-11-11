import apiClient from '@/lib/axios';
import { spmbAdminMappingSchema } from '@/lib/validations/spmb-admin-mapping';
import type { ApiResponse } from '@/types/api.types';
import {
  SPMB_ADMIN_RECIPIENT_SETTING_KEY,
  type SpmbAdminMapping,
  type SpmbAdminMappingPayload,
  type SpmbAdminOptionsQuery,
  type SpmbAdminUser,
  type SystemSettingRecord,
} from '@/types/system-setting.types';

export const systemSettingService = {
  getSpmbAdminMapping: async (): Promise<SpmbAdminMapping> => {
    const { data } = await apiClient.get<ApiResponse<Record<string, SystemSettingRecord>>>('/admin/system-settings');
    const setting = data.data?.[SPMB_ADMIN_RECIPIENT_SETTING_KEY];
    const values = spmbAdminMappingSchema.parse({ user_ids: JSON.parse(setting?.value ?? '[]') });
    return { ...values, users: setting?.users ?? [] };
  },

  saveSpmbAdminMapping: async (payload: SpmbAdminMappingPayload): Promise<SpmbAdminMapping> => {
    await apiClient.post<ApiResponse<null>>('/admin/system-settings', {
      settings: [{ key: SPMB_ADMIN_RECIPIENT_SETTING_KEY, value: JSON.stringify(payload.user_ids) }],
    });
    return systemSettingService.getSpmbAdminMapping();
  },

  getSpmbAdminOptions: async (params?: SpmbAdminOptionsQuery): Promise<ApiResponse<SpmbAdminUser[]>> => {
    const { data } = await apiClient.get<ApiResponse<SpmbAdminUser[]>>('/admin/system-settings/spmb-admin-options', { params });
    return data;
  },
};
