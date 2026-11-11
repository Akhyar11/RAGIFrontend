'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Clock, AlertCircle, GraduationCap, Mail, CreditCard, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { spmbService } from '@/services/spmb.service';

export default function DaftarUlangPage() {
  const router = useRouter();
  const [pendaftaran, setPendaftaran] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingSk, setDownloadingSk] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await spmbService.getMyPendaftaran();
      const pData = res?.data?.pendaftaran || res?.data || null;
      setPendaftaran(pData);
    } catch {
      toast.error('Gagal memuat data pendaftaran');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleDownloadSk = async () => {
    if (!pendaftaran?.id) return;
    try {
      setDownloadingSk(true);
      await spmbService.downloadSkLulusPdf(pendaftaran.id, pendaftaran.no_pendaftaran);
      toast.success('SK Tanda Lulus berhasil diunduh.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || 'Gagal mengunduh SK Tanda Lulus.');
    } finally {
      setDownloadingSk(false);
    }
  };

  const handleGenerateTagihan = async () => {
    if (!pendaftaran?.id) return;
    try {
      setSubmitting(true);
      await spmbService.generateTagihanDaftarUlang(pendaftaran.id);
      toast.success('Tagihan Daftar Ulang berhasil dibuat');
      await fetchStatus();
      router.push('/spmb/pembayaran?tahap=daftar_ulang');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal membuat tagihan daftar ulang');
    } finally {
      setSubmitting(false);
    }
  };

  const hasilSeleksi = pendaftaran?.hasil_seleksi ?? pendaftaran?.konversi ?? null;
  const statusDaftarUlang = pendaftaran?.hasil_seleksi?.status_daftar_ulang ?? 'belum';
  const sudahLulus = pendaftaran?.hasil_seleksi?.status === 'lulus' || pendaftaran?.status === 'mahasiswa_baru' || pendaftaran?.status === 'lulus_administrasi';
  const sudahLunas = statusDaftarUlang === 'lunas' || pendaftaran?.status === 'mahasiswa_baru';
  const menungguPembayaran = statusDaftarUlang === 'menunggu_pembayaran';

  if (loading) {
    return (
      <div className="animate-fade-in flex flex-col gap-6">
        <PageHeader title="Daftar Ulang" description="Selesaikan daftar ulang untuk mendapatkan NIM dan email kampus" backUrl="/spmb/dashboard" />
        <div className="card p-6 space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!pendaftaran || !sudahLulus) {
    return (
      <div className="animate-fade-in flex flex-col gap-6">
        <PageHeader title="Daftar Ulang" description="Selesaikan daftar ulang untuk mendapatkan NIM dan email kampus" backUrl="/spmb/dashboard" />
        <div className="card p-8 text-center">
          <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Belum Memenuhi Syarat Daftar Ulang</h3>
          <p className="text-slate-500 text-sm">
            Daftar ulang hanya dapat dilakukan setelah Anda dinyatakan <strong>lulus seleksi administrasi</strong> dan telah membayar biaya pendaftaran awal.
          </p>
          <Button variant="secondary" className="mt-6" onClick={() => router.push('/spmb/dashboard')}>
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <PageHeader
        title="Daftar Ulang Mahasiswa Baru"
        description="Lakukan pembayaran biaya daftar ulang untuk mendapatkan NIM dan email kampus"
        backUrl="/spmb/dashboard"
      />

      {/* Status Card */}
      <div className="card p-6 space-y-6">

        {/* Status Daftar Ulang */}
        <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
          <div>
            {sudahLunas ? (
              <CheckCircle size={32} className="text-green-500 mt-0.5" />
            ) : menungguPembayaran ? (
              <Clock size={32} className="text-amber-500 mt-0.5" />
            ) : (
              <AlertCircle size={32} className="text-blue-500 mt-0.5" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-semibold text-slate-800">Status Daftar Ulang</span>
              {sudahLunas ? (
                <Badge variant="success">Lunas</Badge>
              ) : menungguPembayaran ? (
                <Badge variant="warning">Menunggu Pembayaran</Badge>
              ) : (
                <Badge variant="info">Belum Dibayar</Badge>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {sudahLunas
                ? 'Anda telah menyelesaikan daftar ulang. NIM dan email kampus telah dikirimkan.'
                : menungguPembayaran
                ? 'Tagihan sudah dibuat. Silakan lakukan pembayaran melalui Virtual Account yang telah diberikan.'
                : 'Buat tagihan daftar ulang untuk melanjutkan proses penerimaan mahasiswa baru.'}
            </p>
          </div>
        </div>

        {/* Info Mahasiswa setelah Lunas */}
        {sudahLunas && pendaftaran?.konversi && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-green-200 bg-green-50">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap size={20} className="text-green-600" />
                <span className="font-semibold text-green-800 text-sm">NIM Anda</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{pendaftaran.konversi?.nim_diterbitkan ?? pendaftaran.nim ?? '-'}</p>
            </div>
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <Mail size={20} className="text-blue-600" />
                <span className="font-semibold text-blue-800 text-sm">Email Kampus</span>
              </div>
              <p className="text-sm font-bold text-blue-700 break-all">{pendaftaran?.user?.email_kampus ?? 'Sedang diproses...'}</p>
            </div>
          </div>
        )}

        {/* Info Pendaftar */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-700">Informasi Pendaftar</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Nama Lengkap</span>
              <span className="font-medium">{pendaftaran?.nama_lengkap}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">No. Pendaftaran</span>
              <span className="font-medium">{pendaftaran?.no_pendaftaran}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Program Studi</span>
              <span className="font-medium">{pendaftaran?.program_studi?.nama ?? '-'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Gelombang</span>
              <span className="font-medium">{pendaftaran?.gelombang_penerimaan?.nama ?? '-'}</span>
            </div>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {sudahLulus && (
            <Button
              variant="outline"
              icon={<Download size={16} />}
              onClick={handleDownloadSk}
              isLoading={downloadingSk}
              style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
              className="w-full sm:w-auto font-bold"
            >
              {downloadingSk ? 'Mengunduh...' : 'Unduh SK Tanda Lulus (PDF)'}
            </Button>
          )}
          {!sudahLunas && (
            menungguPembayaran ? (
              <Button
                variant="primary"
                icon={<CreditCard size={16} />}
                onClick={() => {
                  router.push('/spmb/pembayaran?tahap=daftar_ulang');
                }}
                className="w-full sm:w-auto"
                style={{ backgroundColor: 'var(--module-primary)' }}
              >
                Lanjutkan Pembayaran
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={<CreditCard size={16} />}
                loading={submitting}
                onClick={handleGenerateTagihan}
                className="w-full sm:w-auto"
                style={{ backgroundColor: 'var(--module-primary)' }}
              >
                {submitting ? 'Membuat Tagihan...' : 'Buat Tagihan Daftar Ulang'}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
