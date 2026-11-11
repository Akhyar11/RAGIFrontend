import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type { SpmbCheckout, SpmbPaymentBill, SpmbPaymentGateway, SpmbPaymentQuery } from '@/types/spmb-payment.types';

export const spmbPaymentService = {
  gatewayOptions: async (search?: string): Promise<ApiResponse<SpmbPaymentGateway[]>> => {
    const { data } = await apiClient.get<ApiResponse<SpmbPaymentGateway[]>>('/spmb/master/payment-gateway-options', {
      params: { search: search || undefined, per_page: 25, sort_by: 'gateway_name', sort_order: 'asc' },
    });
    return data;
  },
  bills: async (params?: SpmbPaymentQuery): Promise<ApiResponse<SpmbPaymentBill[]>> => {
    const { data } = await apiClient.get<ApiResponse<SpmbPaymentBill[]>>('/spmb/pembayaran', { params });
    return data;
  },
  checkout: async (id: number): Promise<ApiResponse<SpmbCheckout>> => {
    const { data } = await apiClient.post<ApiResponse<SpmbCheckout>>(`/spmb/pembayaran/${id}/checkout`);
    return data;
  },
};
