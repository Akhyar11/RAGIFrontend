'use client';

import { useState } from 'react';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { getApiErrorMessage } from '@/lib/utils';
import { spmbPaymentService } from '@/services/spmb-payment.service';
import type { SpmbPaymentGateway } from '@/types/spmb-payment.types';

interface GatewayChoice { value: number; label: string; isDisabled?: boolean }

function choice(gateway: SpmbPaymentGateway): GatewayChoice {
  return { value: gateway.id, label: `${gateway.gateway_name.toUpperCase()} (${gateway.environment})${gateway.is_active ? '' : ' — nonaktif'}`, isDisabled: !gateway.is_active };
}

interface Props {
  value: number | null | undefined;
  initial?: SpmbPaymentGateway | null;
  onChange: (value: number | null) => void;
  error?: string;
  disabled?: boolean;
}

export function SpmbPaymentGatewaySelect({ value, initial, onChange, error, disabled }: Props) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const defaults = initial ? [choice(initial)] : [];
  if (value && !initial) defaults.push({ value, label: `Kanal tersimpan (${value})`, isDisabled: true });
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
  return <AsyncSelect id="spmb-payment-gateway" label="Kanal Pembayaran" value={value} isClearable isDisabled={disabled}
    defaultOptions={defaults} loadOptions={loadOptions}
    onChange={(option: GatewayChoice | null) => onChange(option?.value ?? null)}
    error={error || loadError || undefined} placeholder="Gunakan kanal default SIKEU"
    hint="Pilihan berlaku untuk tagihan baru. Kredensial dikelola di SIKEU. Komponen dengan kanal berbeda diterbitkan sebagai tagihan terpisah." />;
}
