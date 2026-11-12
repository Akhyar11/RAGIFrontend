import apiClient from '@/lib/axios';
import type {
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  AuditLog,
  UserSession,
} from '@/types/auth.types';
import type { ImpersonateStatusData, LeaveImpersonateData } from '@/types/impersonate.types';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '@/types/api.types';

export const adminService = {
  // ── USERS ──────────────────────────────────────────────────
  getUsers: async (params?: PaginationParams): Promise<PaginatedResponse<User>> => {
    const { data } = await apiClient.get<PaginatedResponse<User>>('/admin/users', { params });
    return data;
  },

  createUser: async (payload: Partial<User>): Promise<ApiResponse<User>> => {
    const { data } = await apiClient.post<ApiResponse<User>>('/admin/users', payload);
    return data;
  },

  updateUser: async (id: number, payload: Partial<User>): Promise<ApiResponse<User>> => {
    const { data } = await apiClient.put<ApiResponse<User>>(`/admin/users/${id}`, payload);
    return data;
  },

  deleteUser: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/users/${id}`);
    return data;
  },

  toggleUserActive: async (id: number, isActive: boolean): Promise<ApiResponse<User>> => {
    const { data } = await apiClient.patch<ApiResponse<User>>(`/admin/users/${id}/status`, { is_active: isActive });
    return data;
  },

  changeUserPassword: async (id: number, payload: { password: string; password_confirmation: string }): Promise<ApiResponse<User>> => {
    const { data } = await apiClient.put<ApiResponse<User>>(`/admin/users/${id}/password`, payload);
    return data;
  },

  impersonateUser: async (id: number): Promise<ApiResponse<{
    token: string;
    access_token: string;
    token_type: string;
    user: User;
    impersonated_by: { id: number; username: string; name: string };
  }>> => {
    const { data } = await apiClient.post(`/admin/users/${id}/impersonate`);
    return data;
  },

  leaveImpersonate: async (): Promise<ApiResponse<LeaveImpersonateData | null>> => {
    const { data } = await apiClient.post('/admin/users/leave-impersonate');
    return data;
  },

  getImpersonateStatus: async (): Promise<ApiResponse<ImpersonateStatusData>> => {
    const { data } = await apiClient.get('/admin/impersonate-status');
    return data;
  },

  // ── ROLES ──────────────────────────────────────────────────
  getRoles: async (params?: PaginationParams): Promise<PaginatedResponse<Role>> => {
    const { data } = await apiClient.get<PaginatedResponse<Role>>('/admin/roles', { params });
    return data;
  },

  createRole: async (payload: Partial<Role>): Promise<ApiResponse<Role>> => {
    const { data } = await apiClient.post<ApiResponse<Role>>('/admin/roles', payload);
    return data;
  },

  updateRole: async (id: number, payload: Partial<Role>): Promise<ApiResponse<Role>> => {
    const { data } = await apiClient.put<ApiResponse<Role>>(`/admin/roles/${id}`, payload);
    return data;
  },

  deleteRole: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/roles/${id}`);
    return data;
  },

  // ── PERMISSIONS ───────────────────────────────────────────
  getPermissions: async (params?: PaginationParams & { module?: string }): Promise<PaginatedResponse<Permission>> => {
    const { data } = await apiClient.get<PaginatedResponse<Permission>>('/admin/permissions', { params });
    return data;
  },

  createPermission: async (payload: Partial<Permission>): Promise<ApiResponse<Permission>> => {
    const { data } = await apiClient.post<ApiResponse<Permission>>('/admin/permissions', payload);
    return data;
  },

  updatePermission: async (id: number, payload: Partial<Permission>): Promise<ApiResponse<Permission>> => {
    const { data } = await apiClient.put<ApiResponse<Permission>>(`/admin/permissions/${id}`, payload);
    return data;
  },

  deletePermission: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/permissions/${id}`);
    return data;
  },

  // ── ROLE-PERMISSIONS MAPPING ──────────────────────────────
  getRolePermissions: async (params?: {
    search?: string;
    role_id?: number;
    per_page?: number;
    page?: number;
  }): Promise<ApiResponse<RolePermission[]>> => {
    const { data } = await apiClient.get<ApiResponse<RolePermission[]>>('/admin/role-permissions', { params });
    return data;
  },

  assignPermissionsToRole: async (roleId: number, permissionIds: number[]): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.post<ApiResponse<null>>(`/admin/roles/${roleId}/permissions`, { permissions: permissionIds });
    return data;
  },

  // ── ROLE-MENUS MAPPING ────────────────────────────────────
  getRoleMenus: async (roleId: number): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/admin/role-menus/${roleId}`);
    return data;
  },

  assignMenusToRole: async (roleId: number, menuIds: number[]): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.post<ApiResponse<null>>(`/admin/role-menus/${roleId}`, { menu_ids: menuIds });
    return data;
  },

  // ── USER-ROLES MAPPING ────────────────────────────────────
  getUserRoles: async (params?: Record<string, any>): Promise<ApiResponse<UserRole[]>> => {
    const { data } = await apiClient.get<ApiResponse<UserRole[]>>('/admin/user-roles', { params });
    return data;
  },

  assignRolesToUser: async (userId: number, roleIds: number[]): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.post<ApiResponse<null>>(`/admin/users/${userId}/roles`, { roles: roleIds });
    return data;
  },

  // ── SESSIONS ──────────────────────────────────────────────
  getAllSessions: async (params?: Record<string, any>): Promise<ApiResponse<UserSession[]>> => {
    const { data } = await apiClient.get<ApiResponse<UserSession[]>>('/admin/sessions', { params });
    return data;
  },

  forceLogoutSession: async (sessionId: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/sessions/${sessionId}`);
    return data;
  },

  // ── AUDIT LOGS ────────────────────────────────────────────
  getAuditLogs: async (params?: PaginationParams): Promise<PaginatedResponse<AuditLog>> => {
    const { data } = await apiClient.get<PaginatedResponse<AuditLog>>('/admin/audit-logs', { params });
    return data;
  },

  getAuditLogById: async (id: number | string): Promise<ApiResponse<AuditLog>> => {
    const { data } = await apiClient.get<ApiResponse<AuditLog>>(`/admin/audit-logs/${id}`);
    return data;
  },

  // ── API INTEGRATIONS (SSO / IAM) ──────────────────────────
  getApiIntegrations: async (params?: PaginationParams & { module_id?: number | string; is_active?: boolean | string; sort_order?: string }): Promise<PaginatedResponse<import('@/types/api-integration.types').IamApiIntegration>> => {
    const { data } = await apiClient.get<PaginatedResponse<import('@/types/api-integration.types').IamApiIntegration>>('/admin/api-integrations', { params });
    return data;
  },

  getApiIntegrationById: async (id: number | string): Promise<ApiResponse<import('@/types/api-integration.types').IamApiIntegration>> => {
    const { data } = await apiClient.get<ApiResponse<import('@/types/api-integration.types').IamApiIntegration>>(`/admin/api-integrations/${id}`);
    return data;
  },

  updateApiIntegration: async (
    id: number | string,
    payload: import('@/types/api-integration.types').UpdateApiIntegrationPayload
  ): Promise<ApiResponse<import('@/types/api-integration.types').IamApiIntegration>> => {
    const { data } = await apiClient.put<ApiResponse<import('@/types/api-integration.types').IamApiIntegration>>(`/admin/api-integrations/${id}`, payload);
    return data;
  },

  testApiIntegration: async (
    id: number | string,
    payload?: import('@/types/api-integration.types').TestApiIntegrationPayload
  ): Promise<ApiResponse<import('@/types/api-integration.types').TestApiIntegrationResult>> => {
    const { data } = await apiClient.post<ApiResponse<import('@/types/api-integration.types').TestApiIntegrationResult>>(`/admin/api-integrations/${id}/test`, payload ?? {});
    return data;
  },

  syncApiIntegration: async (
    id: number | string
  ): Promise<ApiResponse<import('@/types/api-integration.types').ApiIntegrationSyncResult>> => {
    const { data } = await apiClient.post<ApiResponse<import('@/types/api-integration.types').ApiIntegrationSyncResult>>(`/admin/api-integrations/${id}/sync`);
    return data;
  },
};
