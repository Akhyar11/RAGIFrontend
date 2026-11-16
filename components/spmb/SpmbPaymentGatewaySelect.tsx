'use client';

import { useState } from 'react';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { getApiErrorMessage } from '@/lib/utils';
import { spmbPaymentService } from '@/services/spmb-payment.service';
import type { SpmbPaymentGateway } from '@/types/spmb-payment.types';

interface GatewayChoice {
  value: number | string;
  configId: number | null;
  gatewayName: string;
  label: string;
  isDisabled?: boolean;
}

function choice(gateway: SpmbPaymentGateway): GatewayChoice {
  const name = gateway.gateway_name.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const configured = gateway.is_configured ?? gateway.id !== null;
  const status = !configured
    ? 'belum diatur'
    : gateway.is_active
      ? gateway.environment || 'aktif'
      : 'nonaktif';
  const support = gateway.is_spmb_supported === false ? ' — belum didukung SPMB' : '';
  return {
    value: gateway.id ?? `unconfigured:${gateway.gateway_name}`,
    configId: gateway.id,
    gatewayName: gateway.gateway_name,
    label: `${name} (${status})${support}`,
    isDisabled: configured && !gateway.is_active,
  };
}

interface Props {
  value: number | null | undefined;
  fallbackName?: string | null;
  onChange: (configId: number | null, gatewayName: string | null) => void;
  error?: string;
  disabled?: boolean;
}

export function SpmbPaymentGatewaySelect({ value, fallbackName, onChange, error, disabled }: Props) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadOptions = async (search: string): Promise<GatewayChoice[]> => {
    try {
      const response = await spmbPaymentService.gatewayOptions(search);
      setLoadError(null);
      return (response.data ?? []).map(choice);
    } catch (cause: unknown) {
      setLoadError(getApiErrorMessage(cause, 'Gagal memuat kanal pembayaran.'));
      return [];
    }
  };
  const selectedValue = value ?? (fallbackName ? `unconfigured:${fallbackName}` : null);
  const defaultOptions = fallbackName && value == null
    ? [{ value: selectedValue, configId: null, gatewayName: fallbackName, label: `${fallbackName} (belum diatur)` }]
    : true;
  return <AsyncSelect id="spmb-payment-gateway" label="Kanal Pembayaran" value={selectedValue} isClearable isDisabled={disabled}
    defaultOptions={defaultOptions} loadOptions={loadOptions}
    onChange={(option: GatewayChoice | null) => onChange(option?.configId ?? null, option?.gatewayName ?? null)}
    error={error || loadError || undefined} placeholder="Gunakan default SIKEU"
    hint="Pilihan tersimpan meski gateway belum diatur. Pembayaran baru aktif setelah konfigurasi SIKEU tersedia dan kanal didukung SPMB." />;
}
