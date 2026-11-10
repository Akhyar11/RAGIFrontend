'use client';

import React from 'react';
import { SectionTitle } from '../atoms/SectionTitle';
import { CredentialField } from '../molecules/CredentialField';
import { Lock } from 'lucide-react';
import { GatewayConfigData } from './GatewayConfigFormPanel';

interface CredentialSectionProps {
  gatewayName: string;
  config: GatewayConfigData;
  onChange: (field: keyof GatewayConfigData, val: any) => void;
}

export const CredentialSection: React.FC<CredentialSectionProps> = ({
  gatewayName,
  config,
  onChange,
}) => {
  const gName = gatewayName.toLowerCase();
  const isXendit = gName === 'xendit';
  const isMidtrans = gName === 'midtrans';

  return (
    <div className="p-4 sm:p-5 bg-white border border-slate-200/90 rounded-xl space-y-4 shadow-2xs">
      <SectionTitle
        number="2"
        title="API CREDENTIALS & WEBHOOK TOKEN"
        description="Masukan kunci otentikasi API yang diberikan oleh penyedia Payment Gateway."
      />

      <div className="space-y-3.5">
        <CredentialField
          label={
            isMidtrans
              ? 'Server Key Midtrans (Secret) *'
              : isXendit
              ? 'API / Secret Key (Secret) *'
              : 'API Key (Secret) *'
          }
          value={config.api_key || ''}
          onChange={(val) => onChange('api_key', val)}
          placeholder={
            isMidtrans
              ? 'SB-Mid-server-XXXXX (Sandbox) atau Mid-server-XXXXX (Production)'
              : isXendit
              ? 'xnd_development_...'
              : 'Ketik Secret Key...'
          }
          helperText={
            isMidtrans
              ? 'Server Key rahasia dari Midtrans Dashboard > Access Keys. Digunakan untuk signing & verifikasi SHA512.'
              : 'Gunakan API Secret Key dengan hak akses write/read untuk transaksi.'
          }
          isSecret={true}
        />

        <CredentialField
          label={
            isMidtrans
              ? 'Client Key Midtrans (Public) *'
              : isXendit
              ? 'Public Key (Opsional)'
              : 'Merchant Code / Client ID *'
          }
          value={config.public_key || ''}
          onChange={(val) => onChange('public_key', val)}
          placeholder={
            isMidtrans
              ? 'SB-Mid-client-XXXXX (Sandbox) atau Mid-client-XXXXX (Production)'
              : isXendit
              ? 'xnd_public_...'
              : 'Ketik Merchant Code...'
          }
          helperText={
            isMidtrans
              ? 'Client Key publik untuk inisialisasi Midtrans Snap di antarmuka frontend.'
              : 'Public Key atau Merchant ID yang digunakan untuk validasi frontend.'
          }
          isSecret={false}
        />

        <CredentialField
          label={isMidtrans ? 'Merchant ID Midtrans' : 'Webhook Verification Token *'}
          value={config.webhook_token || ''}
          onChange={(val) => onChange('webhook_token', val)}
          placeholder={isMidtrans ? 'Contoh: G123456789' : 'xnd_wh_verification_token_...'}
          helperText={
            isMidtrans
              ? 'ID Merchant resmi dari Midtrans Dashboard.'
              : 'Token ini digunakan backend untuk memverifikasi callback pelunasan dari bank.'
          }
          isSecret={!isMidtrans}
        />
      </div>

      {isMidtrans && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-2xs text-blue-900 space-y-1">
          <span className="font-extrabold block">URL Notifikasi Webhook Midtrans:</span>
          <span className="font-mono text-blue-800 bg-white/80 px-2 py-0.5 rounded border border-blue-200 block">
            {typeof window !== 'undefined' ? `${window.location.origin}/api/v1/sikeu/callback/midtrans` : '/api/v1/sikeu/callback/midtrans'}
          </span>
          <span className="text-2xs text-blue-700 block">
            Pasang URL di atas pada menu Settings &gt; Configuration &gt; Payment Notification URL di Midtrans Dashboard.
          </span>
        </div>
      )}

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-2xs text-slate-600 font-medium">
        <Lock size={14} className="text-emerald-600 shrink-0" />
        <span>
          Kredensial disimpan secara aman dengan enkripsi AES-256 dan hanya digunakan oleh server backend.
        </span>
      </div>
    </div>
  );
};
