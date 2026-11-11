'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Loader2, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { getApiErrorMessage } from '@/lib/utils';
import { spmbPaymentService } from '@/services/spmb-payment.service';
import type { SpmbCheckout, SpmbPaymentBill, SpmbPaymentQuery } from '@/types/spmb-payment.types';

const rupiah = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);

interface PaymentStatusConfig {
  label: string;
  variant: 'success' | 'warning' | 'danger';
}

const PAYMENT_STATUS_MAP: Record<string, PaymentStatusConfig> = {
  lunas: { label: 'Lunas', variant: 'success' },
  sebagian: { label: 'Sebagian', variant: 'warning' },
  belum_bayar: { label: 'Belum Lunas', variant: 'warning' },
  belum_lunas: { label: 'Belum Lunas', variant: 'warning' },
};

const DEFAULT_STATUS_CONFIG: PaymentStatusConfig = {
  label: 'Belum Lunas',
  variant: 'warning',
};

const getPaymentStatusConfig = (status: string): PaymentStatusConfig => {
  return PAYMENT_STATUS_MAP[status] ?? DEFAULT_STATUS_CONFIG;
};

export function SpmbPayments({ tahap }: Pick<SpmbPaymentQuery, 'tahap'>) {
  const [bills, setBills] = useState<SpmbPaymentBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [instructions, setInstructions] = useState<Record<number, SpmbCheckout>>({});
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const fetchBills = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    return spmbPaymentService
      .bills({ tahap, page, per_page: 15 })
      .then((response) => {
        setBills(response.data ?? []);
        setLastPage(response.meta?.last_page ?? 1);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!silent) {
          setError(getApiErrorMessage(cause, 'Gagal memuat tagihan SPMB.'));
        }
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [tahap, page]);

  // Initial fetch on mount & page/tahap change
  useEffect(() => {
    fetchBills(false);
  }, [fetchBills]);

  // Auto-polling terukur jika terdapat tagihan yang belum lunas
  useEffect(() => {
    const hasUnpaid = bills.some((bill) => bill.status !== 'lunas');
    if (!hasUnpaid) return;

    const timer = setInterval(() => {
      fetchBills(true);
    }, 8000);

    return () => clearInterval(timer);
  }, [bills, fetchBills]);

  // Sinkronisasi status otomatis saat window kembali fokus / aktif
  useEffect(() => {
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchBills(true);
      }
    };

    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    return () => {
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
    };
  }, [fetchBills]);

  const checkout = async (bill: SpmbPaymentBill) => {
    try {
      setBusy(bill.id);
      setError(null);
      const response = await spmbPaymentService.checkout(bill.id);
      if (!response.data) throw new Error('Instruksi pembayaran belum tersedia.');
      setInstructions((previous) => ({ ...previous, [bill.id]: response.data! }));
    } catch (cause: unknown) {
      setError(getApiErrorMessage(cause, 'Gagal menyiapkan pembayaran.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page-container space-y-4">
      <PageHeader
        title="Pembayaran SPMB"
        description="Selesaikan seluruh tagihan pada tahap ini. Setiap tagihan mengikuti kanal pembayaran yang ditetapkan panitia."
        backUrl={tahap === 'daftar_ulang' ? '/spmb/daftar-ulang' : '/spmb/registrasi'}
      />
      {error && (
        <Card role="alert" className="p-4 text-xs" style={{ color: 'var(--danger)' }}>
          {error}
        </Card>
      )}
      {loading ? (
        <Card className="p-4 flex items-center gap-2">
          <Loader2 size={18} className="animate-spin" />
          Memuat tagihan...
        </Card>
      ) : bills.length === 0 ? (
        <Card className="p-4 text-xs">Belum ada tagihan pada tahap ini.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bills.map((bill) => {
            const instruction = instructions[bill.id];
            const paid = bill.status === 'lunas';
            const statusConfig = getPaymentStatusConfig(bill.status);
            return (
              <Card key={bill.id} aria-label={`Tagihan ${bill.nomor_tagihan}`} className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xs font-bold">{bill.nomor_tagihan}</h2>
                    <p className="text-2xs">
                      {bill.gateway_name?.toUpperCase() || 'Virtual Account'}
                      {bill.environment ? ` · ${bill.environment}` : ''}
                    </p>
                  </div>
                  <Badge variant={statusConfig.variant}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <ul className="space-y-1 text-xs">
                  {bill.details.map((detail) => (
                    <li key={detail.id} className="flex justify-between gap-4">
                      <span>{detail.keterangan}</span>
                      <span>{rupiah(detail.nominal)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="space-y-1 text-xs">
                  <div className="flex justify-between gap-4">
                    <dt>Potongan</dt>
                    <dd>{rupiah(bill.total_potongan)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Sudah dibayar</dt>
                    <dd>{rupiah(bill.total_bayar)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 font-bold">
                    <dt>Sisa pembayaran</dt>
                    <dd>{rupiah(bill.sisa_tagihan)}</dd>
                  </div>
                  {bill.jatuh_tempo && (
                    <div className="flex justify-between gap-4">
                      <dt>Jatuh tempo</dt>
                      <dd>{bill.jatuh_tempo}</dd>
                    </div>
                  )}
                </dl>
                {paid ? (
                  <p className="flex items-center gap-2 text-xs">
                    <CheckCircle2 size={16} />
                    Pembayaran telah dikonfirmasi.
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    icon={<CreditCard size={16} />}
                    size="sm"
                    loading={busy === bill.id}
                    disabled={busy !== null}
                    onClick={() => checkout(bill)}
                    style={{ backgroundColor: 'var(--module-primary)' }}
                  >
                    Bayar Sekarang
                  </Button>
                )}
                {!paid && instruction?.method === 'redirect' && instruction.redirect_url && (
                  <Button
                    as="a"
                    href={instruction.redirect_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="primary"
                    size="sm"
                    style={{ backgroundColor: 'var(--module-primary)' }}
                  >
                    Lanjutkan ke {instruction.gateway_name?.toUpperCase()}
                  </Button>
                )}
                {!paid && instruction && instruction.method !== 'redirect' && (
                  <div className="space-y-2 text-xs" role="status">
                    <p>
                      Bank: <strong>{instruction.bank_name}</strong>
                    </p>
                    <p>
                      {instruction.method === 'h2h' ? 'Nomor pembayaran' : 'Nomor Virtual Account'}:{' '}
                      <strong>{instruction.custid || instruction.va_number}</strong>
                    </p>
                    <p>
                      Nominal: <strong>{rupiah(instruction.amount)}</strong>
                    </p>
                    {!!instruction.va_fee && (
                      <p>
                        Biaya layanan bank: {rupiah(instruction.va_fee)} · Total:{' '}
                        {rupiah(instruction.total_bridge ?? instruction.amount + instruction.va_fee)}
                      </p>
                    )}
                    <p>Status pembayaran diperbarui setelah konfirmasi bank diterima.</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <div className="flex justify-end pt-2">
        <Pagination
          currentPage={page}
          totalPages={lastPage}
          onPageChange={(next) => {
            setLoading(true);
            setPage(next);
          }}
          disabled={loading}
        />
      </div>
    </div>
  );
}
