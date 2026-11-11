export interface SpmbPaymentGateway {
  id: number;
  gateway_name: string;
  environment: string;
  is_active: boolean;
}

export interface SpmbPaymentBill {
  id: number;
  nomor_tagihan: string;
  status: string;
  tipe_referensi: string | null;
  payment_gateway_config_id: number | null;
  gateway_name: string | null;
  environment: string | null;
  total_tagihan: number;
  total_potongan: number;
  total_denda: number;
  total_bayar: number;
  sisa_tagihan: number;
  jatuh_tempo: string | null;
  details: { id: number; keterangan: string; nominal: number }[];
  virtual_account: { va_number: string; bank_nama: string } | null;
}

export interface SpmbCheckout {
  method: 'redirect' | 'h2h' | 'virtual_account';
  gateway_name: string | null;
  amount: number;
  redirect_url?: string;
  order_id?: string;
  environment?: string;
  expires_at?: string | null;
  custid?: string;
  bank_name?: string;
  va_number?: string;
  va_fee?: number;
  total_bridge?: number;
}

export interface SpmbPaymentQuery {
  tahap?: 'pendaftaran' | 'daftar_ulang';
  search?: string;
  page?: number;
  per_page?: number;
  sort_by?: 'id' | 'nomor_tagihan' | 'created_at';
  sort_order?: 'asc' | 'desc';
}
