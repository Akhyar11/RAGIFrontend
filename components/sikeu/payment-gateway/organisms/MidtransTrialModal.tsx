'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, ArrowRight, Loader2, Building2, QrCode, Wallet, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { sikeuService } from '@/services/sikeu.service';
import toast from 'react-hot-toast';

const trialSchema = z.object({
  payment_type: z.string().min(1, 'Metode pembayaran wajib dipilih'),
  nominal: z
    .number({ message: 'Nominal harus berupa angka valid' })
    .min(1000, 'Nominal simulasi minimal Rp 1.000'),
});

type TrialFormData = z.infer<typeof trialSchema>;

interface MidtransTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MidtransTrialModal({ isOpen, onClose, onSuccess }: MidtransTrialModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [trialResult, setTrialResult] = useState<any>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TrialFormData>({
    resolver: zodResolver(trialSchema),
    defaultValues: {
      payment_type: 'qris',
      nominal: 150000,
    },
  });

  const selectedPaymentType = watch('payment_type');

  const onSubmit = async (data: TrialFormData) => {
    setIsProcessing(true);
    setTrialResult(null);

    try {
      const res = await sikeuService.trialMidtransPayment({
        nominal: data.nominal,
        payment_type: data.payment_type,
      });

      if (res.status === 'success' && res.data) {
        setTrialResult(res.data);
        toast.success('Simulasi Pembayaran Midtrans Berhasil Diproses!');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(res.message || 'Simulasi gagal.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal menjalankan trial pembayaran.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Trial & Simulasi Pembayaran Midtrans"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!trialResult ? (
          <>
            {/* Info Sandbox */}
            <div className="p-3.5 bg-blue-50 border border-blue-200/80 rounded-xl text-blue-900 text-xs flex items-start gap-2.5">
              <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Mode Sandbox Test Environment</p>
                <p className="text-2xs text-blue-800 leading-relaxed">
                  Simulasi ini menguji validasi signature SHA512, pemutakhiran invoice tagihan mahasiswa, mutasi Unit Kas Midtrans, dan penerbitan jurnal akuntansi umum secara otomatis.
                </p>
              </div>
            </div>

            {/* Form Input */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Metode Pembayaran Midtrans *</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'qris', label: 'QRIS', icon: QrCode },
                    { id: 'gopay', label: 'GoPay', icon: Wallet },
                    { id: 'shopeepay', label: 'ShopeePay', icon: Wallet },
                    { id: 'bca_va', label: 'BCA VA', icon: Building2 },
                    { id: 'bni_va', label: 'BNI VA', icon: Building2 },
                    { id: 'bri_va', label: 'BRI VA', icon: Building2 },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = selectedPaymentType === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setValue('payment_type', m.id, { shouldValidate: true })}
                        className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? 'font-extrabold shadow-2xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                        style={
                          isSelected
                            ? {
                                borderColor: 'var(--module-primary, #2563eb)',
                                backgroundColor: 'var(--module-primary-subtle, #eff6ff)',
                                color: 'var(--module-primary, #2563eb)',
                              }
                            : undefined
                        }
                      >
                        <Icon
                          size={18}
                          style={isSelected ? { color: 'var(--module-primary, #2563eb)' } : undefined}
                          className={!isSelected ? 'text-slate-400' : ''}
                        />
                        <span className="text-2xs uppercase tracking-wide">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.payment_type && (
                  <p className="text-2xs text-red-600 mt-1 font-semibold">{errors.payment_type.message}</p>
                )}
              </div>

              <div>
                <Input
                  label="Nominal Simulasi (Rp) *"
                  type="number"
                  min={1000}
                  {...register('nominal', { valueAsNumber: true })}
                  placeholder="150000"
                  hint="Nominal yang akan disimulasikan lunas ke tagihan mahasiswa."
                  className="font-mono font-bold text-slate-800"
                />
                {errors.nominal && (
                  <p className="text-2xs text-red-600 mt-1 font-semibold">{errors.nominal.message}</p>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Result Box */
          <div className="space-y-3.5 animate-fade-in">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 space-y-3">
              <div className="flex items-center gap-2 font-extrabold text-sm text-emerald-800">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span>Transaksi Berhasil Diverifikasi &amp; Terproses!</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-emerald-200/80">
                <div>
                  <span className="text-2xs text-emerald-700 block font-semibold">Order ID</span>
                  <span className="font-mono font-bold text-slate-800">{trialResult.simulated_order_id}</span>
                </div>
                <div>
                  <span className="text-2xs text-emerald-700 block font-semibold">Kode Transaksi (ID)</span>
                  <span className="font-mono font-bold text-slate-800">{trialResult.transaction_id}</span>
                </div>
                <div>
                  <span className="text-2xs text-emerald-700 block font-semibold">Kanal Pembayaran</span>
                  <span className="font-bold text-slate-800 uppercase">{trialResult.channel_bayar}</span>
                </div>
                <div>
                  <span className="text-2xs text-emerald-700 block font-semibold">Status Tagihan Akhir</span>
                  <Badge variant="success" className="font-bold uppercase text-2xs mt-0.5">
                    {trialResult.status_tagihan_akhir}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Mutasi Kas */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>Mutasi Saldo Unit Kas Midtrans</span>
                <span className="text-emerald-600 font-mono font-extrabold">{trialResult.saldo_kas_midtrans?.mutasi}</span>
              </div>
              <div className="flex items-center justify-between text-2xs text-slate-500">
                <span>Saldo Sebelum: Rp {new Intl.NumberFormat('id-ID').format(trialResult.saldo_kas_midtrans?.sebelum || 0)}</span>
                <span>Saldo Sesudah: Rp {new Intl.NumberFormat('id-ID').format(trialResult.saldo_kas_midtrans?.sesudah || 0)}</span>
              </div>
            </div>

            {/* Jurnal Info */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-2xs text-amber-900">
              <span className="font-extrabold block mb-0.5">Jurnal Akuntansi Otomatis Terbit:</span>
              <span className="font-mono text-2xs block text-amber-800">
                Dr [Unit Kas Midtrans] / Cr [Piutang Mahasiswa] — Balanced Rp {new Intl.NumberFormat('id-ID').format(trialResult.nominal_bayar || 0)}
              </span>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          {!trialResult ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isProcessing}
                icon={isProcessing ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                className="font-bold h-10 px-5"
              >
                {isProcessing ? 'Memproses Simulasi...' : 'Jalankan Simulasi'}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTrialResult(null)}
              >
                Ulangi Uji Coba
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onClose}
              >
                Selesai
              </Button>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}
