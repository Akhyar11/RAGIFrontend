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
  last_status: 'success' | 'failed' | 'processing' | null;
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
  preview?: boolean;
  read_only?: boolean;
  read_count?: number;
  source_total?: number;
  created?: number;
  updated?: number;
  synced?: number;
  skipped?: number;
  failed?: number;
  pages?: number;
  skipped_items?: Array<{
    source_id: string | number | null;
    kode_prodi?: string | null;
    item_ref?: string | null;
    row: number;
    reason: string;
  }>;
}

export interface ApiIntegrationProgress {
  progress_id: string;
  integration_id: number;
  status: 'queued' | 'running' | 'completed' | 'failed';
  phase: 'queued' | 'starting' | 'reading' | 'preparing' | 'biodata' | 'saving' | 'completed' | 'failed';
  progress: number;
  processed: number;
  total: number | null;
  work_processed?: number;
  work_total?: number | null;
  phase_processed?: number;
  phase_total?: number | null;
  message: string;
  started_at: string;
  finished_at?: string | null;
  result?: ApiIntegrationSyncResult;
}
