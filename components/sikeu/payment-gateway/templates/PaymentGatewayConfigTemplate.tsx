'use client';

import React, { FormEvent } from 'react';

// Organisms
import { PageHeader } from '../organisms/PageHeader';
import { GatewayTabs } from '../organisms/GatewayTabs';
import { FinancialSummary } from '../organisms/FinancialSummary';
import { EnvironmentSection } from '../organisms/EnvironmentSection';
import { CredentialSection } from '../organisms/CredentialSection';
import { H2hConnectionSection } from '../organisms/H2hConnectionSection';
import { H2hStatusSection, H2hStatusData } from '../organisms/H2hStatusSection';
import { RekeningManualSection } from '../organisms/RekeningManualSection';
import { AutomationSection } from '../organisms/AutomationSection';
import { SecuritySection } from '../organisms/SecuritySection';
import { SaveConfigurationBar } from '../organisms/SaveConfigurationBar';
import { GatewayConfigData } from '../organisms/GatewayConfigFormPanel';
import { MidtransTrialModal } from '../organisms/MidtransTrialModal';
import { Sparkles, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PaymentGatewayConfigTemplateProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  gateways: string[];
  configs: Record<string, GatewayConfigData>;
  currentConfig: GatewayConfigData;
  balanceData: any;
  loadingBalance: boolean;
  onSyncBalance: () => void;
  onFormChange: (field: keyof GatewayConfigData, value: any) => void;
  onSaveConfig: (e: FormEvent) => void;
  savingConfig: boolean;
  feedback: { type: 'success' | 'error'; message: string } | null;
  h2hStatus?: H2hStatusData | null;
  loadingH2hStatus?: boolean;
  onRefreshH2hStatus?: () => void;
}

export function PaymentGatewayConfigTemplate({
  activeTab,
  onTabChange,
  gateways,
  configs,
  currentConfig,
  balanceData,
  loadingBalance,
  onSyncBalance,
  onFormChange,
  onSaveConfig,
  savingConfig,
  h2hStatus,
  loadingH2hStatus,
  onRefreshH2hStatus,
}: PaymentGatewayConfigTemplateProps) {
  const isH2h = activeTab === 'bsn_h2h';
  const isRekening = activeTab === 'rekening_manual';
  const isMidtrans = activeTab === 'midtrans';
  const [isTrialOpen, setIsTrialOpen] = React.useState(false);

  if (isRekening) {
    return (
      <div className="space-y-5 max-w-6xl mx-auto pb-24 sm:pb-12 px-1 sm:px-4 py-2 animate-fade-in">
        {/* 1. Page Header (tanpa aksi saldo) */}
        <PageHeader onSyncBalance={() => {}} loadingBalance={false} />

        {/* 2. Gateway Tabs */}
        <GatewayTabs
          gateways={gateways}
          activeTab={activeTab}
          onTabChange={onTabChange}
          configs={configs}
        />

        {/* 3. Kelola rekening manual BNI/BSN */}
        <RekeningManualSection />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-24 sm:pb-12 px-1 sm:px-4 py-2 animate-fade-in">
      {/* 1. Page Header */}
      <PageHeader onSyncBalance={onSyncBalance} loadingBalance={loadingBalance} />

      {/* 2. Gateway Tabs */}
      <GatewayTabs
        gateways={gateways}
        activeTab={activeTab}
        onTabChange={onTabChange}
        configs={configs}
      />

      {/* 3. Financial Summary (non-H2H) / Status Bridge (H2H) */}
      {isH2h ? (
        <H2hStatusSection
          status={h2hStatus ?? null}
          loading={!!loadingH2hStatus}
          onRefresh={onRefreshH2hStatus ?? (() => {})}
        />
      ) : (
        <FinancialSummary
          gatewayName={activeTab}
          balanceData={balanceData}
          loading={loadingBalance}
        />
      )}

      {/* 4. Main Configuration Sections (Form Workspace) */}
      <form onSubmit={onSaveConfig} className="space-y-4">
        {/* Section 1: Environment & Limit */}
        <EnvironmentSection config={currentConfig} onChange={onFormChange} />

        {/* Section 2: Credentials & Webhook / Koneksi Bridge H2H */}
        {isH2h ? (
          <H2hConnectionSection config={currentConfig} onChange={onFormChange} />
        ) : (
          <CredentialSection gatewayName={activeTab} config={currentConfig} onChange={onFormChange} />
        )}

        {/* Section 3: Automation (tidak berlaku untuk kanal H2H inbound) */}
        {!isH2h && <AutomationSection config={currentConfig} onChange={onFormChange} />}

        {/* Section 4: Gateway Priority Status */}
        <SecuritySection gatewayName={activeTab} config={currentConfig} onChange={onFormChange} />

        {/* Section 5: Trial / Simulasi Pembayaran (Khusus Midtrans) */}
        {isMidtrans && (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="p-1.5 text-white rounded-lg"
                  style={{ backgroundColor: 'var(--module-primary, #2563eb)' }}
                >
                  <Sparkles size={16} />
                </span>
                <span className="font-extrabold text-sm text-slate-900">Uji Coba &amp; Simulasi Pembayaran Midtrans</span>
              </div>
              <p className="text-xs text-slate-600">
                Lakukan trial pembayaran sandbox tanpa uang riil untuk memastikan verifikasi SHA512, pelunasan tagihan, mutasi kas, dan jurnal akuntansi berjalan sempurna.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="md"
              icon={<FlaskConical size={16} />}
              onClick={() => setIsTrialOpen(true)}
              style={{
                borderColor: 'var(--module-primary, #2563eb)',
                color: 'var(--module-primary, #2563eb)',
              }}
              className="bg-white hover:opacity-90 font-bold shrink-0 shadow-2xs h-10 px-4"
            >
              Buka Simulator Trial
            </Button>
          </div>
        )}

        {/* Action Save Bar */}
        <SaveConfigurationBar activeTab={activeTab} saving={savingConfig} onSave={onSaveConfig} />
      </form>

      {/* Modal Trial Pembayaran Midtrans */}
      <MidtransTrialModal
        isOpen={isTrialOpen}
        onClose={() => setIsTrialOpen(false)}
        onSuccess={onSyncBalance}
      />
    </div>
  );
}
