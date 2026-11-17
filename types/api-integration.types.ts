export interface IamApiIntegration {
  id: number;
  key: string;
  name: string;
  module: string;
  http_method: string;
  description: string | null;
  expected_schema: Record<string, any> | null;
  source_type: 'pddikti' | 'custom_api';
  supported_sources: Array<'pddikti' | 'custom_api'>;
  source_schemas: Partial<Record<'pddikti' | 'custom_api', Record<string, unknown>>>;
  url_api: string | null;
  token_configured: boolean;
  auth_type: 'bearer' | 'header_key';
  is_active: boolean;
  last_synced_at: string | null;
  last_status: 'success' | 'failed' | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateApiIntegrationPayload {
  source_type: 'pddikti' | 'custom_api';
  url_api: string | null;
  token?: string | null;
  auth_type: 'bearer' | 'header_key';
  is_active: boolean;
}

export interface TestApiIntegrationPayload {
  source_type?: 'pddikti' | 'custom_api';
  url_api?: string | null;
  token?: string | null;
  auth_type?: 'bearer' | 'header_key';
}

export interface TestApiIntegrationResult {
  http_status: number;
  is_success: boolean;
  duration_ms: number;
  headers: Record<string, any>;
  response_sample: any;
  expected_schema: any;
}

export interface ApiIntegrationSyncResult {
  source_total: number;
  created: number;
  updated: number;
  skipped: number;
  skipped_items: Array<{
    source_id: string | number | null;
    kode_prodi?: string | null;
    item_ref?: string | null;
    row: number;
    reason: string;
  }>;
}
