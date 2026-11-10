'use client';

import React from 'react';
import { GatewayConfigData } from './GatewayConfigFormPanel';

interface GatewayTabsProps {
  gateways: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  configs: Record<string, GatewayConfigData>;
}

const GATEWAY_LABELS: Record<string, string> = {
  bsn_h2h: 'H2H BSN',
  midtrans: 'MIDTRANS',
  xendit: 'XENDIT',
  duitku: 'DUITKU',
  rekening_manual: 'REKENING MANUAL',
};

// Tab manajemen (bukan gateway on/off) — pill status disembunyikan.
const HIDE_STATUS: string[] = ['rekening_manual'];

export const GatewayTabs: React.FC<GatewayTabsProps> = ({
  gateways,
  activeTab,
  onTabChange,
  configs,
}) => {
  return (
    <div className="border-b border-slate-200 overflow-x-auto scrollbar-none flex items-center gap-4">
      {gateways.map((g) => {
        const isTabActive = activeTab === g;
        const isGatewayEnabled = !!configs[g]?.is_active;

        return (
          <button
            key={g}
            type="button"
            onClick={() => onTabChange(g)}
            className={`pb-3 px-1 border-b-2 font-bold text-xs flex items-center gap-2 transition-colors whitespace-nowrap ${
              isTabActive
                ? 'border-primary-600 text-primary-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="uppercase">{GATEWAY_LABELS[g] || `${g} GATEWAY`}</span>
            {!HIDE_STATUS.includes(g) &&
              (isGatewayEnabled ? (
                <span className="badge badge-green text-2xs font-extrabold uppercase py-0.5 px-1.5">
                  • Active
                </span>
              ) : (
                <span className="badge badge-gray text-2xs font-semibold uppercase py-0.5 px-1.5">
                  Inactive
                </span>
              ))}
          </button>
        );
      })}
    </div>
  );
};
