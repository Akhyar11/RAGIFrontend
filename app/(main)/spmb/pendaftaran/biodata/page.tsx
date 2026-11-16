'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, FileCheck, FileText, GraduationCap, Pencil, User, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { spmbService, PendaftaranBerkas, PendaftaranCalonMhs } from '@/services/spmb.service';
import { SpmbPaymentBadge, SpmbStatusBadge } from '@/components/spmb/SpmbStatusBadge';
import toast from 'react-hot-toast';

const JENIS_KELAMIN_LABEL: Record<'L' | 'P', string> = {
  L: 'Laki-laki',
  P: 'Perempuan',
};

function MetadataItem({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col py-2">
      <span className="text-2xs font-extrabold uppercase text-slate-500">{label}</span>
      <span className="break-words text-sm font-bold text-slate-800">{value || <span className="text-xs font-normal italic text-slate-400">-</span>}</span>
    </div>
  );
}

function DetailSection({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <Icon size={16} style={{ color: 'var(--module-primary)' }} />
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      </header>
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export default function ApplicantBiodataPage() {
  const router = useRouter();
  const [pendaftaran, setPendaftaran] = useState<PendaftaranCalonMhs | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    spmbService.getMyPendaftaran()
      .then((response) => {
        if (active) setPendaftaran(response?.data?.pendaftaran || response?.data?.data?.pendaftaran || null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(true);
        const requestError = error as { response?: { data?: { message?: string } }; message?: string };
        toast.error(requestError.response?.data?.message || requestError.message || 'Gagal memuat biodata pendaftaran.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Biodata Pendaftaran"
        description="Biodata dan status pendaftaran calon mahasiswa Anda."
        backUrl="/spmb/dashboard"
        action={pendaftaran ? (
          <Button icon={<Pencil size={16} />} onClick={() => router.push('/spmb/registrasi')} style={{ backgroundColor: 'var(--module-primary)' }}>
            Perbarui Biodata
          </Button>
        ) : undefined}
      />

      {loading ? (
        <div className="card animate-pulse space-y-4 p-6">
          <div className="h-5 w-1/3 rounded bg-slate-200" />
          <div className="h-4 w-2/3 rounded bg-slate-100" />
          <div className="h-24 rounded bg-slate-100" />
        </div>
      ) : loadError ? (
        <EmptyState icon={<AlertCircle size={36} className="text-red-500" />} title="Biodata tidak dapat dimuat" description="Silakan coba lagi nanti atau hubungi panitia SPMB." />
      ) : !pendaftaran ? (
        <EmptyState
          icon={<FileText size={36} className="text-slate-400" />}
          title="Belum ada biodata pendaftaran"
          description="Mulai pendaftaran untuk mengisi biodata calon mahasiswa Anda."
          action={<Button style={{ backgroundColor: 'var(--module-primary)' }} onClick={() => router.push('/spmb/registrasi')}>Mulai Pendaftaran</Button>}
        />
      ) : (
        <>
          <section className="card flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <span className="text-2xs font-bold uppercase text-slate-500">Calon Mahasiswa</span>
              <h2 className="text-xl font-bold text-slate-900">{pendaftaran.nama_lengkap || '-'}</h2>
              <span className="font-mono text-xs text-slate-600">{pendaftaran.no_pendaftaran}</span>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <SpmbStatusBadge status={pendaftaran.status} />
              <SpmbPaymentBadge status={pendaftaran.status_pembayaran} />
            </div>
          </section>

          <DetailSection title="Identitas & Biodata" icon={User}>
            <MetadataItem label="NIK" value={pendaftaran.nik} />
            <MetadataItem label="Nomor Paspor" value={pendaftaran.nomor_paspor} />
            <MetadataItem label="Kewarganegaraan" value={pendaftaran.negara_kewarganegaraan || pendaftaran.kewarganegaraan} />
            <MetadataItem label="Tempat, Tanggal Lahir" value={`${pendaftaran.tempat_lahir || '-'}, ${pendaftaran.tanggal_lahir ? new Date(pendaftaran.tanggal_lahir).toLocaleDateString('id-ID') : '-'}`} />
            <MetadataItem label="Jenis Kelamin" value={JENIS_KELAMIN_LABEL[pendaftaran.jenis_kelamin] || '-'} />
            <MetadataItem label="Agama" value={pendaftaran.agama} />
            <MetadataItem label="Status Sipil" value={pendaftaran.status_sipil} />
            <MetadataItem label="No. Handphone" value={pendaftaran.no_hp || pendaftaran.user?.phone} />
            <MetadataItem label="Email" value={pendaftaran.user?.email || pendaftaran.user?.username} />
            <MetadataItem label="Negara Domisili" value={pendaftaran.negara_domisili} />
            <MetadataItem label="Provinsi" value={pendaftaran.provinsi} />
            <MetadataItem label="Kota/Kabupaten" value={pendaftaran.kota_kabupaten} />
            <MetadataItem label="Kecamatan" value={pendaftaran.kecamatan} />
            <MetadataItem label="Kode Pos" value={pendaftaran.kode_pos} />
            <MetadataItem label="Alamat" value={pendaftaran.alamat} />
          </DetailSection>

          <DetailSection title="Informasi Akademik" icon={GraduationCap}>
            <MetadataItem label="Program Studi Pilihan 1" value={pendaftaran.program_studi?.nama} />
            <MetadataItem label="Program Studi Pilihan 2" value={pendaftaran.program_studi_pilihan2?.nama} />
            <MetadataItem label="Gelombang" value={pendaftaran.gelombang_penerimaan?.nama} />
            <MetadataItem label="Asal Sekolah" value={pendaftaran.asal_sekolah} />
            <MetadataItem label="Alamat Sekolah" value={pendaftaran.alamat_sekolah} />
            <MetadataItem label="Jurusan Sekolah" value={pendaftaran.jurusan_sekolah} />
            <MetadataItem label="Tahun Lulus" value={pendaftaran.tahun_lulus} />
            <MetadataItem label="NPSN Sekolah" value={pendaftaran.npsn_sekolah} />
            <MetadataItem label="Nilai Rata-rata Rapor" value={pendaftaran.nilai_rata_rapor} />
          </DetailSection>

          <DetailSection title="Data Orang Tua & Wali" icon={Users}>
            <MetadataItem label="Nama Ayah" value={pendaftaran.nama_ayah} />
            <MetadataItem label="Pekerjaan Ayah" value={pendaftaran.pekerjaan_ayah} />
            <MetadataItem label="Nama Ibu" value={pendaftaran.nama_ibu} />
            <MetadataItem label="Pekerjaan Ibu" value={pendaftaran.pekerjaan_ibu} />
            <MetadataItem label="Penghasilan Orang Tua" value={pendaftaran.penghasilan_ortu} />
            <MetadataItem label="Nama Wali" value={pendaftaran.nama_wali} />
            <MetadataItem label="Telepon Wali" value={pendaftaran.telepon_wali} />
            <MetadataItem label="Alamat Orang Tua" value={pendaftaran.alamat_ortu} />
            <MetadataItem label="Telepon Orang Tua" value={pendaftaran.telp_ortu} />
          </DetailSection>

          <DetailSection title="Status Verifikasi & Berkas" icon={FileCheck}>
            <MetadataItem label="Catatan Panitia" value={pendaftaran.catatan_verifikasi} />
          </DetailSection>
          <DataTable<PendaftaranBerkas>
            data={pendaftaran.dokumen_pendaftaran || []}
            emptyMessage="Belum ada berkas yang diunggah."
            columns={[
              {
                key: 'document',
                label: 'DOKUMEN',
                render: (document) => (
                  <span className="text-xs font-semibold text-slate-800">
                    {(document.jenis_dokumen || document.jenis_berkas || 'Dokumen').replace(/_/g, ' ')}
                  </span>
                ),
              },
              {
                key: 'status',
                label: 'STATUS',
                render: (document) => (
                  <Badge variant={document.is_verified ? 'green' : 'yellow'} className="text-2xs">
                    {document.is_verified ? 'Terverifikasi' : 'Menunggu verifikasi'}
                  </Badge>
                ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}