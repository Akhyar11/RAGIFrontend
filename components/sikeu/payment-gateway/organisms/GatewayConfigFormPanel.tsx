import { FormEvent, useState } from 'react';
import { Sliders, Shield, Key, SlidersHorizontal, AlertTriangle, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { SecureInput } from '@/components/ui/SecureInput';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { SectionHeader } from '../molecules/SectionHeader';
import { StatusBadge } from '../atoms/StatusBadge';

export interface GatewayConfigData {
  environment: 'sandbox' | 'production' | string;
  api_key: string;
  public_key: string;
  webhook_token: string;
  auto_disbursement_enabled: boolean;
  account_validation_enabled: boolean;
  max_disbursement_limit: number;
  is_active: boolean;
  is_default?: boolean;
  callback_url?: string | null;
  va_fee?: number;
  vat_percent?: number;
  charge_fee_to_payer?: boolean;
  // Koneksi bridge H2H BTN Syariah (hanya dipakai tab bsn_h2h)
  base_url?: string;
  server_location?: string;
  db_host?: string;
  db_port?: number | string;
  db_name?: string;
  db_username?: string;
  db_password?: string;
}

interface GatewayConfigFormPanelProps {
  gatewayName: string;
  config: GatewayConfigData;
  onChange: (field: keyof GatewayConfigData, value: any) => void;
  onSave: (e: FormEvent) => void;
  saving?: boolean;
}

export function GatewayConfigFormPanel({
  gatewayName,
  config,
  onChange,
  onSave,
  saving = false,
}: GatewayConfigFormPanelProps) {
  const isProduction = config.environment === 'production';

  return (
    <div className="card p-5 sm:p-7 space-y-6 bg-white shadow-sm border border-slate-200/80 rounded-2xl">
      {/* Top Header & Active Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-50 text-primary-600 rounded-xl">
            <Sliders size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                Konfigurasi {gatewayName.toUpperCase()}
              </h2>
              <StatusBadge status={config.is_active ? 'active' : 'inactive'} />
            </div>
            <p className="text-xs text-slate-500">
              Kelola kredensial API, lingkungan transaksi, dan fitur otomatisasi.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/90 px-3.5 py-2 rounded-xl self-start sm:self-auto shadow-2xs">
          <ToggleSwitch
            id={`activate-gateway-${gatewayName}`}
            checked={config.is_active}
            onChange={(val) => onChange('is_active', val)}
            label="Jadikan Gateway Utama"
            description="Aktifkan sebagai gateway pembayaran aktif"
          />
        </div>
      </div>

      <form onSubmit={onSave} className="space-y-6">
        {/* SECTION A: ENVIRONMENT & TRANSACTION LIMITS */}
        <div className="space-y-3">
          <SectionHeader
            icon={<Shield size={16} />}
            title="Environment Mode &amp; Limit Transaksi"
            subtitle="Pilih mode lingkungan transaksi server dan batas maksimum nominal."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Select
                label="Environment Mode *"
                options={[
                  { value: 'sandbox', label: 'Development (Sandbox Mode - Dummy Money)' },
                  { value: 'production', label: 'Production (Live Mode - Real Money)' },
                ]}
                value={config.environment}
                onChange={(val) => onChange('environment', val)}
                placeholder="-- Pilih Mode --"
                hint="Mode sandbox digunakan untuk pengujian tanpa uang riil."
              />
            </div>

            <div>
              <Input
                label="Max Limit Auto-Disbursement (Rp) *"
                type="number"
                required
                value={config.max_disbursement_limit}
                onChange={(e) => onChange('max_disbursement_limit', Number(e.target.value))}
                placeholder="50000000"
                hint={`Batas maksimum: Rp ${new Intl.NumberFormat('id-ID').format(config.max_disbursement_limit || 0)}`}
                className="font-mono font-bold text-slate-800 text-xs"
              />
            </div>
          </div>

          {/* Environment Status Banner (Full-Width & Perfectly Aligned) */}
          {isProduction ? (
            <div className="p-3.5 bg-amber-50 border border-amber-300/80 rounded-xl text-amber-900 text-xs font-semibold flex items-center gap-3 shadow-2xs">
              <AlertTriangle size={18} className="text-amber-600 shrink-0" />
              <div>
                <span className="font-extrabold block">Peringatan Mode Live (Production)</span>
                <span className="text-[11px] text-amber-800 leading-normal">
                  Mode Production aktif! Seluruh transaksi akan memotong saldo &amp; menerbitkan tagihan asli.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-emerald-900 text-xs font-medium flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Mode Sandbox (Development) aktif. Transaksi menggunakan data pengujian aman tanpa uang riil.</span>
            </div>
          )}
        </div>

        {/* SECTION B: API CREDENTIALS */}
        <div className="space-y-3 pt-2">
          <SectionHeader
            icon={<Key size={16} />}
            title="Kredensial API &amp; Webhook Token"
            subtitle="Kredensial tersimpan secara aman dengan enkripsi AES-256."
          />

          <div className="space-y-4">
            <SecureInput
              label="API / Secret Key *"
              required
              value={config.api_key}
              onChange={(e) => onChange('api_key', e.target.value)}
              placeholder="Contoh: xnd_development_... atau xnd_production_..."
              hint="Secret key utama dari Xendit/Duitku Dashboard. Rahasiakan kunci ini."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Public Key / Merchant Code"
                value={config.public_key}
                onChange={(e) => onChange('public_key', e.target.value)}
                placeholder="Contoh: xnd_public_... / M12345"
                hint="Public key atau kode merchant resmi gateway."
                className="font-mono text-xs"
              />

              <SecureInput
                label="Webhook Verification Token / Callback Key"
                value={config.webhook_token}
                onChange={(e) => onChange('webhook_token', e.target.value)}
                placeholder="Token verifikasi callback webhook"
                hint="Digunakan untuk memvalidasi keaslian signature HTTP POST."
              />
            </div>
          </div>
        </div>

        {/* SECTION C: BIAYA GATEWAY (VA) */}
        <div className="space-y-3 pt-2">
          <SectionHeader
            title="Biaya Gateway (Virtual Account)"
            subtitle="Biaya tetap per transaksi VA + PPN. Dipakai untuk pencatatan jurnal & opsi pembebanan ke pendaftar."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Biaya VA per Transaksi (Rp)"
              type="number"
              min={0}
              value={config.va_fee ?? 0}
              onChange={(e) => onChange('va_fee', Number(e.target.value))}
              placeholder="9000"
              hint={`Biaya total (fee + PPN) = Rp ${new Intl.NumberFormat('id-ID').format(
                Math.round((config.va_fee || 0) + (config.va_fee || 0) * ((config.vat_percent ?? 11) / 100))
              )}`}
              className="font-mono font-bold text-slate-800 text-xs"
            />

            <Input
              label="PPN atas Biaya (%)"
              type="number"
              min={0}
              max={100}
              value={config.vat_percent ?? 11}
              onChange={(e) => onChange('vat_percent', Number(e.target.value))}
              placeholder="11"
              hint="Persentase PPN yang dikenakan atas biaya gateway."
              className="font-mono font-bold text-slate-800 text-xs"
            />
          </div>

          <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl">
            <ToggleSwitch
              id={`charge-fee-to-payer-${gatewayName}`}
              checked={!!config.charge_fee_to_payer}
              onChange={(val) => onChange('charge_fee_to_payer', val)}
              label="Bebankan Biaya Gateway ke Pendaftar"
              description="Jika aktif, biaya VA (fee + PPN) ditambahkan sebagai komponen tagihan sehingga ditanggung pendaftar. Jika nonaktif, biaya ditanggung kampus (tercatat sebagai beban)."
            />
          </div>
        </div>

        {/* SECTION D: AUTOMATION & VALIDATION */}
        <div className="space-y-3 pt-2">
          <SectionHeader
            title="Otomatisasi &amp; Validasi System"
            subtitle="Atur persetujuan otomatis dan pemeriksaan nama rekening."
          />

          <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-4">
            <ToggleSwitch
              id={`auto-disbursement-${gatewayName}`}
              checked={config.auto_disbursement_enabled}
              onChange={(val) => onChange('auto_disbursement_enabled', val)}
              label="Auto-Disbursement saat Kabag ACC"
              description="Menjalankan proses pencairan dana secara otomatis seketika disetujui oleh Kabag Keuangan."
            />

            <div className="border-t border-slate-200/60 pt-3">
              <ToggleSwitch
                id={`account-validation-${gatewayName}`}
                checked={config.account_validation_enabled}
                onChange={(val) => onChange('account_validation_enabled', val)}
                label="Validasi Nama Rekening Bank Otomatis"
                description="Memeriksa kesesuaian nama pemilik rekening tujuan transaksi via API Gateway secara otomatis."
              />
            </div>
          </div>
        </div>

        {/* FORM ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={saving}
            icon={<Save size={16} />}
            className="w-full sm:w-auto font-bold min-h-[44px] px-6 shadow-sm"
          >
            Simpan Konfigurasi {gatewayName.toUpperCase()}
          </Button>
        </div>
      </form>
    </div>
  );
}
