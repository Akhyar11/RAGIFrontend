import { SpmbPayments } from '@/components/spmb/SpmbPayments';

export default async function SpmbPaymentsPage({ searchParams }: { searchParams: Promise<{ tahap?: string }> }) {
  const { tahap } = await searchParams;
  return <SpmbPayments tahap={tahap === 'daftar_ulang' ? 'daftar_ulang' : 'pendaftaran'} />;
}
