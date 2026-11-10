'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CreditCard,
  ShieldCheck,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { sikeuService } from '@/services/sikeu.service';
import toast from 'react-hot-toast';

const snapFormSchema = z.object({
  tagihan_id: z.number({ message: 'Tagihan wajib dipilih' }).min(1, 'Tagihan wajib dipilih'),
  first_name: z.string().optional(),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  phone: z.string().optional(),
});

type SnapFormData = z.infer<typeof snapFormSchema>;

interface MidtransSnapModalProps {
  isOpen: boolean;
  onClose: () => void;
  tagihanId?: number;
  initialNominal?: number;
  onPaymentSuccess?: (result: any) => void;
  onPaymentPending?: (result: any) => void;
  onPaymentError?: (error: any) => void;
}

export function MidtransSnapModal({
  isOpen,
  onClose,
  tagihanId,
  initialNominal,
  onPaymentSuccess,
  onPaymentPending,
  onPaymentError,
}: MidtransSnapModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [snapData, setSnapData] = useState<{
    token: string;
    redirect_url: string;
    order_id: string;
    client_key: string;
    gross_amount: number;
    environment: string;
  } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'popup_open' | 'success' | 'pending' | 'error'>('idle');
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SnapFormData>({
    resolver: zodResolver(snapFormSchema),
    defaultValues: {
      tagihan_id: tagihanId || 0,
      first_name: '',
      email: '',
      phone: '',
    },
  });

  const selectedTagihanId = watch('tagihan_id');

  useEffect(() => {
    if (tagihanId) {
      setValue('tagihan_id', tagihanId, { shouldValidate: true });
    }
  }, [tagihanId, setValue]);

  // Load Midtrans Snap JS Script dynamically
  const loadSnapScript = (clientKey: string, isProduction: boolean): Promise<boolean> => {
    return new Promise((resolve) => {
      const existingScript = document.getElementById('midtrans-snap-script');
      if (existingScript && (window as any).snap) {
        resolve(true);
        return;
      }

      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement('script');
      const snapUrl = isProduction
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js';

      script.id = 'midtrans-snap-script';
      script.src = snapUrl;
      script.setAttribute('data-client-key', clientKey);
      script.async = true;

      script.onload = () => resolve(true);
      script.onerror = () => {
        toast.error('Gagal memuat library Midtrans Snap.');
        resolve(false);
      };

      document.body.appendChild(script);
    });
  };

  const handleOpenSnapPopup = (token: string) => {
    const snap = (window as any).snap;
    if (!snap || typeof snap.pay !== 'function') {
      toast.error('Midtrans Snap JS belum siap. Silakan klik tautan checkout langsung.');
      return;
    }

    setPaymentStatus('popup_open');

    snap.pay(token, {
      onSuccess: (result: any) => {
        setPaymentStatus('success');
        setPaymentResult(result);
        toast.success('Pembayaran Midtrans Berhasil Diselesaikan!');
        if (onPaymentSuccess) {
          onPaymentSuccess(result);
        }
      },
      onPending: (result: any) => {
        setPaymentStatus('pending');
        setPaymentResult(result);
        toast('Menunggu penyelesaian pembayaran oleh mahasiswa.', { icon: '⏳' });
        if (onPaymentPending) {
          onPaymentPending(result);
        }
      },
      onError: (result: any) => {
        setPaymentStatus('error');
        setPaymentResult(result);
        toast.error('Pembayaran Midtrans gagal atau ditolak.');
        if (onPaymentError) {
          onPaymentError(result);
        }
      },
      onClose: () => {
        if (paymentStatus === 'popup_open') {
          setPaymentStatus('idle');
          toast('Jendela pembayaran Snap ditutup.');
        }
      },
    });
  };

  const loadTagihanOptions = async (inputValue: string) => {
    try {
      const res = await sikeuService.getTagihanList({
        search: inputValue || undefined,
        status: 'belum_bayar',
        per_page: 20,
      });

      if (res && res.data && Array.isArray(res.data)) {
        return res.data.map((item: any) => {
          const nama = item.mahasiswa?.nama || item.calon_mahasiswa?.nama_lengkap || 'Mahasiswa';
          const nominal = Number(item.total_tagihan || 0);
          return {
            value: item.id,
            label: `${item.nomor_tagihan} - ${nama} (Rp ${new Intl.NumberFormat('id-ID').format(nominal)})`,
          };
        });
      }
      return [];
    } catch (e) {
      return [];
    }
  };

  const onSubmit = async (formData: SnapFormData) => {
    setIsGenerating(true);
    setPaymentStatus('idle');
    setPaymentResult(null);

    try {
      const res = await sikeuService.createMidtransSnapToken({
        tagihan_id: formData.tagihan_id,
        first_name: formData.first_name || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
      });

      if (res.status === 'success' && res.data) {
        setSnapData(res.data);
        toast.success('Snap Token Berhasil Diterbitkan!');

        // Muat script dan langsung buka popup
        const isProd = res.data.environment === 'production';
        const loaded = await loadSnapScript(res.data.client_key, isProd);
        if (loaded) {
          handleOpenSnapPopup(res.data.token);
        }
      } else {
        toast.error(res.message || 'Gagal menerbitkan Snap Token.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal menerbitkan Midtrans Snap Token.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setSnapData(null);
    setPaymentStatus('idle');
    setPaymentResult(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pembayaran Tagihan via Midtrans Snap"
      size="lg"
    >
      <div className="space-y-4">
        {/* Banner Fitur Snap */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs flex items-start gap-3">
          <ShieldCheck
            size={18}
            style={{ color: 'var(--module-primary, #2563eb)' }}
            className="shrink-0 mt-0.5"
          />
          <div className="space-y-1">
            <p className="font-bold text-slate-900">Multi-Payment Popup Checkout (Midtrans Snap)</p>
            <p className="text-2xs text-slate-600 leading-relaxed">
              Mendukung pembayaran langsung tanpa ganti halaman: QRIS, GoPay, ShopeePay, Virtual Account (BCA, BNI, BRI, Mandiri, Permata), dan Kartu Debit/Kredit.
            </p>
          </div>
        </div>

        {!snapData ? (
          /* Form Request Snap Token */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <AsyncSelect
                label="Pilih Tagihan Mahasiswa *"
                placeholder="Cari nomor tagihan atau nama mahasiswa..."
                hint="Pilih tagihan mahasiswa yang belum lunas untuk checkout via Midtrans Snap."
                loadOptions={loadTagihanOptions}
                value={selectedTagihanId > 0 ? selectedTagihanId : undefined}
                onChange={(val) => {
                  const selectedId = val && typeof val === 'object' ? val.value : val;
                  setValue('tagihan_id', Number(selectedId || 0), { shouldValidate: true });
                }}
                error={errors.tagihan_id?.message}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Input
                  label="Nama Pembayar (Opsional)"
                  type="text"
                  {...register('first_name')}
                  placeholder="Nama Lengkap Mahasiswa"
                />
              </div>
              <div>
                <Input
                  label="Email (Opsional)"
                  type="email"
                  {...register('email')}
                  placeholder="mahasiswa@kampus.ac.id"
                />
                {errors.email && (
                  <p className="text-2xs text-red-600 mt-1 font-semibold">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Metode yang Tersedia di Popup:</span>
              <div className="flex items-center gap-2 text-2xs font-bold text-slate-700">
                <Badge variant="secondary">QRIS</Badge>
                <Badge variant="secondary">GoPay</Badge>
                <Badge variant="secondary">Multi-VA</Badge>
                <Badge variant="secondary">Card</Badge>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isGenerating}>
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isGenerating}
                icon={isGenerating ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                className="font-bold h-10 px-5"
              >
                {isGenerating ? 'Menerbitkan Token...' : 'Lanjutkan ke Midtrans Snap'}
              </Button>
            </div>
          </form>
        ) : (
          /* Snap Token Details & Action Area */
          <div className="space-y-4 animate-fade-in">
            {/* Info Token & Order */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Detail Token Transaksi</span>
                <Badge variant={snapData.environment === 'production' ? 'success' : 'warning'}>
                  {snapData.environment.toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200">
                <div>
                  <span className="text-2xs text-slate-500 block font-semibold">Order ID</span>
                  <span className="font-mono font-bold text-slate-900">{snapData.order_id}</span>
                </div>
                <div>
                  <span className="text-2xs text-slate-500 block font-semibold">Total Tagihan</span>
                  <span className="font-mono font-bold text-emerald-600">
                    Rp {new Intl.NumberFormat('id-ID').format(snapData.gross_amount)}
                  </span>
                </div>
              </div>

              <div className="pt-1 border-t border-slate-200">
                <span className="text-2xs text-slate-500 block font-semibold">Snap Token</span>
                <span className="font-mono text-2xs text-slate-700 break-all bg-white p-2 rounded border block">
                  {snapData.token}
                </span>
              </div>
            </div>

            {/* Hasil Pembayaran jika sudah terjadi */}
            {paymentStatus === 'success' && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-3">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Transaksi Berhasil Diselesaikan!</p>
                  <p className="text-2xs text-emerald-800">
                    Webhook callback otomatis memproses pelunasan invoice dan mencatat mutasi unit kas.
                  </p>
                </div>
              </div>
            )}

            {paymentStatus === 'pending' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Menunggu Pembayaran (Pending)</p>
                  <p className="text-2xs text-amber-800">
                    Selesaikan pembayaran melalui aplikasi e-wallet, ATM, atau mobile banking sesuai instruksi.
                  </p>
                </div>
              </div>
            )}

            {paymentStatus === 'error' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start gap-3">
                <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Pembayaran Ditolak atau Dibatalkan</p>
                  <p className="text-2xs text-red-800">
                    Silakan ulangi kembali atau gunakan metode pembayaran alternatif lainnya.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<RefreshCw size={14} />}
                onClick={handleReset}
              >
                Ganti Tagihan
              </Button>

              <div className="flex items-center gap-2">
                {snapData.redirect_url && (
                  <a
                    href={snapData.redirect_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
                  >
                    <ExternalLink size={14} />
                    Buka Tab Baru
                  </a>
                )}

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={<CreditCard size={16} />}
                  onClick={() => handleOpenSnapPopup(snapData.token)}
                  className="font-bold h-10 px-5"
                >
                  Buka Popup Snap
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
