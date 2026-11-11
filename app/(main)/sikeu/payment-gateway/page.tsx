'use client';

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { sikeuService } from '@/services/sikeu.service';
import { PaymentGatewayConfigTemplate } from '@/components/sikeu/payment-gateway/templates/PaymentGatewayConfigTemplate';
import { GatewayConfigData } from '@/components/sikeu/payment-gateway/organisms/GatewayConfigFormPanel';
import { H2hStatusData } from '@/components/sikeu/payment-gateway/organisms/H2hStatusSection';

const GATEWAYS = ['xendit', 'midtrans', 'duitku', 'bsn_h2h', 'rekening_manual'];

const defaultH2hConfig = (): GatewayConfigData => ({
  environment: 'sandbox',
  api_key: '',
  public_key: '',
  webhook_token: '',
  auto_disbursement_enabled: false,
  account_validation_enabled: false,
  max_disbursement_limit: 0,
  is_active: false,
  base_url: '',
  server_location: '',
  db_host: '',
  db_port: '3306',
  db_name: '',
  db_username: '',
  db_password: '',
});

export default function PaymentGatewayConfigPage() {
  const [activeTab, setActiveTab] = useState('xendit');
  const [configs, setConfigs] = useState<Record<string, GatewayConfigData>>({});
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  const [gatewayBalance, setGatewayBalance] = useState({
    available_balance: 0,
    pending_settlement: 0,
    total_balance: 0,
    currency: 'IDR',
    last_updated: '-',
  });
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [h2hStatus, setH2hStatus] = useState<H2hStatusData | null>(null);
  const [loadingH2hStatus, setLoadingH2hStatus] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (activeTab === 'bsn_h2h') {
      handleRefreshH2hStatus();
    } else {
      handleRefreshBalance();
    }
  }, [activeTab]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await sikeuService.getPaymentGateways();
      const configMap: Record<string, GatewayConfigData> = {};
      if (res.data) {
        res.data.forEach((c: any) => {
          configMap[c.gateway_name.toLowerCase()] = {
            environment: c.environment || 'sandbox',
            api_key: c.api_key_encrypted || '',
            public_key: c.public_key_encrypted || '',
            webhook_token: c.webhook_token_encrypted || '',
            auto_disbursement_enabled: !!c.auto_disbursement_enabled,
            account_validation_enabled: !!c.account_validation_enabled,
            max_disbursement_limit: Number(c.max_disbursement_limit || 0),
            va_fee: Number(c.va_fee || 0),
            vat_percent: Number(c.vat_percent ?? 11),
            charge_fee_to_payer: !!c.charge_fee_to_payer,
            is_active: !!c.is_active,
            is_default: !!c.is_default,
            callback_url: c.callback_url || null,
            base_url: c.base_url || '',
            server_location: c.server_location || '',
            db_host: c.db_host || '',
            db_port: c.db_port ?? '3306',
            db_name: c.db_name || '',
            db_username: c.db_username || '',
            db_password: '',
          };
        });
      }

      const defaultGateways = GATEWAYS;
      defaultGateways.forEach((g) => {
        if (!configMap[g]) {
          if (g === 'rekening_manual') {
            configMap[g] = {
              environment: 'production',
              api_key: '',
              public_key: '',
              webhook_token: '',
              auto_disbursement_enabled: false,
              account_validation_enabled: false,
              max_disbursement_limit: 0,
              is_active: true,
            };
            return;
          }
          configMap[g] =
            g === 'bsn_h2h'
              ? defaultH2hConfig()
              : {
                  environment: 'sandbox',
                  api_key: '',
                  public_key: '',
                  webhook_token: '',
                  auto_disbursement_enabled: false,
                  account_validation_enabled: false,
                  max_disbursement_limit: 50000000,
                  is_active: g === 'xendit',
                };
        }
      });

      setConfigs(configMap);
    } catch (error: any) {
      toast.error('Gagal mengambil konfigurasi: ' + (error.message || 'Error API'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshBalance = async () => {
    if (activeTab === 'bsn_h2h' || activeTab === 'rekening_manual') return;
    setLoadingBalance(true);
    try {
      const res = await sikeuService.getPaymentGatewayBalance(activeTab);
      if (res.data) {
        setGatewayBalance(res.data);
      }
    } catch {
      // Quiet fallback for balance sync
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleRefreshH2hStatus = async () => {
    setLoadingH2hStatus(true);
    try {
      const res = await sikeuService.getH2hStatus();
      if (res.data) {
        setH2hStatus(res.data as H2hStatusData);
      }
    } catch {
      // Quiet fallback untuk diagnostik bridge
    } finally {
      setLoadingH2hStatus(false);
    }
  };

  const handleSaveConfig = async (e: FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const payload: Record<string, any> = { ...configs[activeTab] };
      // Password DB bridge hanya dikirim bila diisi (kosong = tidak diubah).
      if (activeTab === 'bsn_h2h' && !payload.db_password) {
        delete payload.db_password;
      }
      await sikeuService.updatePaymentGateway(activeTab.toLowerCase(), payload);
      await fetchConfigs();
      toast.success(`Konfigurasi ${activeTab.toUpperCase()} berhasil disimpan!`);
      if (activeTab === 'bsn_h2h') {
        handleRefreshH2hStatus();
      }
    } catch (error: any) {
      toast.error('Gagal menyimpan konfigurasi: ' + (error.message || 'Error API'));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleFormChange = (field: keyof GatewayConfigData, value: any) => {
    setConfigs((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: value,
      },
    }));
  };

  const currentConfig: GatewayConfigData = configs[activeTab] || {
    environment: 'sandbox',
    api_key: '',
    public_key: '',
    webhook_token: '',
    auto_disbursement_enabled: false,
    account_validation_enabled: false,
    max_disbursement_limit: 50000000,
    is_active: false,
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Memuat konfigurasi Payment Gateway...
      </div>
    );
  }

  return (
    <PaymentGatewayConfigTemplate
      activeTab={activeTab}
      onTabChange={setActiveTab}
      gateways={GATEWAYS}
      configs={configs}
      currentConfig={currentConfig}
      balanceData={gatewayBalance}
      loadingBalance={loadingBalance}
      onSyncBalance={handleRefreshBalance}
      onFormChange={handleFormChange}
      onSaveConfig={handleSaveConfig}
      savingConfig={savingConfig}
      feedback={null}
      h2hStatus={h2hStatus}
      loadingH2hStatus={loadingH2hStatus}
      onRefreshH2hStatus={handleRefreshH2hStatus}
    />
  );
}
