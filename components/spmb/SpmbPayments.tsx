'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Loader2, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Pagination } from '@/components/ui/Pagination';
import { getApiErrorMessage } from '@/lib/utils';
import { openMidtransSnap } from '@/lib/spmb/midtrans-snap';
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
      if (response.data.method === 'snap') {
        const opened = await openMidtransSnap(response.data, {
          onSuccess: () => {
            void fetchBills(true);
          },
          onPending: () => {
            void fetchBills(true);
          },
          onError: () => setError('Pembayaran Midtrans gagal atau ditolak. Silakan coba kembali.'),
          onClose: () => undefined,
        });
        if (!opened) throw new Error('Midtrans Snap gagal dimuat. Periksa konfigurasi Client Key dan coba lagi.');
        return;
      }
      setInstructions((previous) => ({ ...previous, [bill.id]: response.data! }));
    } catch (cause: unknown) {
      setError(getApiErrorMessage(cause, 'Gagal menyiapkan pembayaran.'));
    } finally {
      setBusy(null);
    }
  };

  const columns: ColumnDef<SpmbPaymentBill>[] = [
    {
      key: 'nomor_tagihan',
      label: 'Tagihan',
      render: (bill) => (
        <>
          <p className="text-xs font-bold text-slate-900">{bill.nomor_tagihan}</p>
          <p className="mt-1 text-2xs text-slate-500">
            {bill.gateway_name?.toUpperCase() || 'Virtual Account'}
            {bill.environment ? ` · ${bill.environment}` : ''}
          </p>
        </>
      ),
    },
    {
      key: 'details',
      label: 'Rincian',
      render: (bill) => (
        <ul className="space-y-1">
          {bill.details.map((detail) => (
            <li key={detail.id} className="flex justify-between gap-5 text-2xs">
              <span>{detail.keterangan}</span>
              <span className="whitespace-nowrap">{rupiah(detail.nominal)}</span>
            </li>
          ))}
        </ul>
      ),
    },
    { key: 'total_tagihan', label: 'Total', align: 'right', render: (bill) => <span className="whitespace-nowrap text-xs">{rupiah(bill.total_tagihan)}</span> },
    { key: 'total_potongan', label: 'Potongan', align: 'right', render: (bill) => <span className="whitespace-nowrap text-xs">{rupiah(bill.total_potongan)}</span> },
    { key: 'total_bayar', label: 'Sudah dibayar', align: 'right', render: (bill) => <span className="whitespace-nowrap text-xs">{rupiah(bill.total_bayar)}</span> },
    {
      key: 'sisa_tagihan',
      label: 'Sisa',
      align: 'right',
      render: (bill) => <span className="whitespace-nowrap text-xs font-bold">{rupiah(bill.sisa_tagihan)}</span>,
    },
    { key: 'jatuh_tempo', label: 'Jatuh tempo', render: (bill) => <span className="whitespace-nowrap text-2xs">{bill.jatuh_tempo || '–'}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (bill) => {
        const statusConfig = getPaymentStatusConfig(bill.status);
        return <Badge className="text-2xs" variant={statusConfig.variant}>{statusConfig.label}</Badge>;
      },
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (bill) => {
        const paid = bill.status === 'lunas';
        if (paid) {
          return (
            <span className="inline-flex items-center gap-1 text-2xs text-slate-600">
              <CheckCircle2 size={14} /> Lunas
            </span>
          );
        }

        const instruction = instructions[bill.id];
        const items = [
          {
            label: busy === bill.id ? 'Menyiapkan pembayaran...' : 'Bayar Sekarang',
            icon: <CreditCard size={16} />,
            disabled: busy !== null,
            onClick: () => checkout(bill),
          },
        ];
        if (instruction?.method === 'redirect' && instruction.redirect_url) {
          items.push({
            label: `Lanjutkan ke ${instruction.gateway_name?.toUpperCase() || 'Gateway'}`,
            icon: <CreditCard size={16} />,
            disabled: false,
            onClick: async () => {
              window.open(instruction.redirect_url!, '_blank', 'noopener,noreferrer');
            },
          });
        }
        return <DropdownMenu items={items} />;
      },
    },
  ];

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
        <DataTable
          columns={columns}
          data={bills}
          keyExtractor={(bill) => bill.id}
          renderExpandedRow={(bill) => {
            const instruction = instructions[bill.id];
            if (bill.status === 'lunas') {
              return <p className="text-2xs text-slate-600">Pembayaran telah dikonfirmasi.</p>;
            }
            if (!instruction) {
              return <p className="text-2xs text-slate-500">Pilih Bayar Sekarang pada menu aksi untuk memuat instruksi pembayaran.</p>;
            }
            if (instruction.method === 'redirect') {
              return <p className="text-2xs text-slate-600">Lanjutkan pembayaran melalui {instruction.gateway_name?.toUpperCase()} dari menu aksi.</p>;
            }
            if (instruction.method !== 'h2h' && instruction.method !== 'virtual_account') return null;
            return (
              <div className="space-y-1 text-2xs text-slate-600" role="status">
                <p>Bank: <strong>{instruction.bank_name}</strong></p>
                <p>
                  {instruction.method === 'h2h' ? 'Nomor pembayaran' : 'Nomor Virtual Account'}:{' '}
                  <strong>{instruction.custid || instruction.va_number}</strong>
                </p>
                <p>Nominal: <strong>{rupiah(instruction.amount)}</strong></p>
                {!!instruction.va_fee && (
                  <p>
                    Biaya layanan: {rupiah(instruction.va_fee)} · Total:{' '}
                    {rupiah(instruction.total_bridge ?? instruction.amount + instruction.va_fee)}
                  </p>
                )}
                <p>Status diperbarui setelah konfirmasi bank.</p>
              </div>
            );
          }}
        />
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
