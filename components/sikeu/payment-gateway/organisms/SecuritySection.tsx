'use client';

import React from 'react';
import { SectionTitle } from '../atoms/SectionTitle';
import { ToggleSwitch } from '../atoms/ToggleSwitch';
import { Checkbox } from '@/components/ui/Checkbox';
import { GatewayConfigData } from './GatewayConfigFormPanel';

interface SecuritySectionProps {
  gatewayName: string;
  config: GatewayConfigData;
  onChange: (field: keyof GatewayConfigData, val: any) => void;
}

export const SecuritySection: React.FC<SecuritySectionProps> = ({
  gatewayName,
  config,
  onChange,
}) => {
  const isActive = !!config.is_active;

  return (
    <div className="p-4 sm:p-5 bg-white border border-slate-200/90 rounded-xl space-y-4 shadow-2xs">
      <SectionTitle
        number="4"
        title="GATEWAY STATUS & PRIORITAS"
        description="Atur status aktif & prioritas gateway dalam sistem penerbitan tagihan VA."
      />

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-900">Aktifkan Kanal ({gatewayName.toUpperCase()})</p>
          <p className="text-2xs text-slate-500 font-medium">
            Beberapa kanal dapat aktif bersamaan dan dipilih pada komponen biaya SPMB.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className={`text-2xs font-extrabold font-mono uppercase ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
            {isActive ? 'Aktif' : 'Non-Aktif'}
          </span>
          <ToggleSwitch
            checked={isActive}
            onChange={(val) => onChange('is_active', val)}
          />
        </div>
      </div>
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <Checkbox
          id={`default-gateway-${gatewayName}`}
          label="Gunakan sebagai kanal default"
          hint="Dipakai oleh tagihan baru yang belum menentukan kanal pembayaran."
          checked={!!config.is_default}
          onChange={(e) => onChange('is_default', e.target.checked)}
        />
      </div>
    </div>
  );
};
