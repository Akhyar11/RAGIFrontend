'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Edit2,
  Building2,
  GraduationCap,
  Phone,
  CreditCard,
  Award,
  ShieldAlert,
  BookOpen,
  FileCheck,
  ExternalLink,
  Briefcase,
  Layers,
  HeartHandshake,
  TrendingUp,
  FileText,
  CheckCircle2,
  Clock,
  RotateCcw,
  MapPin,
  PackageCheck,
  BookmarkCheck,
  Medal,
  ScanFace,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { simpegService } from '@/services/simpeg.service';
import { simpegKompetensiService } from '@/services/simpeg.kompetensi.service';
import { simpegDossierService } from '@/services/simpeg.dossier.service';
import type { Pegawai } from '@/types/simpeg.types';
import type { SertifikasiDosen, RiwayatTes, RiwayatPelatihan } from '@/types/simpeg.kompetensi.types';
import type {
  TridharmaDossierData,
  TridharmaKelasAjar,
  TridharmaProposal,
  TridharmaPublikasi,
} from '@/types/simpeg.dossier.types';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface PegawaiDetailViewProps {
  pegawaiId?: number;
  initialPegawai?: Pegawai | null;
  isSelfView?: boolean;
  backUrl?: string;
}

export function PegawaiDetailView({
  pegawaiId,
  initialPegawai,
  isSelfView = false,
  backUrl,
}: PegawaiDetailViewProps) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('simpeg.pegawai.manage') || hasPermission('simpeg.presensi.manage');

  const [pegawai, setPegawai] = useState<Pegawai | null>(initialPegawai || null);
  const [sertifikasiList, setSertifikasiList] = useState<SertifikasiDosen[]>([]);
  const [tesList, setTesList] = useState<RiwayatTes[]>([]);
  const [pelatihanList, setPelatihanList] = useState<RiwayatPelatihan[]>([]);
  const [dossier, setDossier] = useState<TridharmaDossierData | null>(null);
  const [clearance, setClearance] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'profil' | 'pengajaran' | 'penelitian' | 'pengabdian' | 'penunjang'>('profil');
  const [loading, setLoading] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      let targetPegawaiId = pegawaiId;
      let loadedPegawai = initialPegawai || null;

      if (isSelfView || !targetPegawaiId) {
        const resMe = await simpegService.getPegawaiMe();
        if (resMe.data) {
          loadedPegawai = resMe.data;
          targetPegawaiId = resMe.data.id;
        }
      }

      if (targetPegawaiId) {
        const [resPeg, resSer, resTes, resPel, resDos, resClearance] = await Promise.all([
          simpegService.getPegawaiDetail(targetPegawaiId).catch(() => ({ data: loadedPegawai })),
          simpegKompetensiService.getSertifikasiList({ pegawai_id: targetPegawaiId, per_page: 50 }).catch(() => ({ data: [] })),
          simpegKompetensiService.getTesList({ pegawai_id: targetPegawaiId, per_page: 50 }).catch(() => ({ data: [] })),
          simpegKompetensiService.getPelatihanList({ pegawai_id: targetPegawaiId, per_page: 50 }).catch(() => ({ data: [] })),
          simpegDossierService.getTridharmaDossier(targetPegawaiId).catch(() => ({ data: null })),
          simpegService.getClearanceStatus(targetPegawaiId).catch(() => ({ data: null })),
        ]);

        if (resPeg.data) {
          setPegawai(resPeg.data);
        } else if (loadedPegawai) {
          setPegawai(loadedPegawai);
        }

        setSertifikasiList(resSer.data || []);
        setTesList(resTes.data || []);
        setPelatihanList(resPel.data || []);
        if (resDos?.data) {
          setDossier(resDos.data);
        }
        if (resClearance?.data) {
          setClearance(resClearance.data);
        }
      } else if (loadedPegawai) {
        setPegawai(loadedPegawai);
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      toast.error(errorObj?.response?.data?.message || 'Gagal memuat rincian data pegawai.');
    } finally {
      setLoading(false);
    }
  }, [pegawaiId, initialPegawai, isSelfView]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleResetBiometric = async () => {
    if (!pegawai?.id) return;
    setIsResetting(true);
    try {
      const res = await simpegService.resetFaceBiometric(pegawai.id);
      toast.success(res.message || 'Data biometrik wajah pegawai berhasil direset.');
      setPegawai((prev) => (prev ? { ...prev, is_face_enrolled: false, face_enrolled_at: null } : null));
      setShowResetConfirm(false);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      toast.error(errorObj?.response?.data?.message || 'Gagal mereset biometrik pegawai.');
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <PageHeader
          title={isSelfView ? 'Profil Data Pegawai' : 'Detail Pegawai'}
          description="Memuat informasi profil pegawai..."
          backUrl={isSelfView ? undefined : (backUrl || '/simpeg/pegawai')}
        />
        <div className="card p-6 text-center text-slate-400">
          Memuat data profil, riwayat pendidikan, dan portofolio Tridharma...
        </div>
      </div>
    );
  }

  if (!pegawai) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <PageHeader
          title="Pegawai Tidak Ditemukan"
          description="Data pegawai yang Anda cari tidak tersedia di sistem."
          backUrl={isSelfView ? undefined : (backUrl || '/simpeg/pegawai')}
        />
        <div className="card p-6 text-center">
          <ShieldAlert size={48} className="mx-auto mb-3 text-rose-500" />
          <p className="text-slate-600 font-medium">Data pegawai tidak ditemukan di sistem SIMPEG.</p>
        </div>
      </div>
    );
  }

  const displayName = pegawai.nama_gelar || pegawai.nama_lengkap;
  const nidn = pegawai.nidn || pegawai.dosen?.nidn;
  const nip = pegawai.nip;
  const homebaseProdi = pegawai.dosen?.program_studi?.nama;
  const metrics = dossier?.metrics;

  // Table Columns for Tridharma Sections
  const pengajaranColumns: ColumnDef<TridharmaKelasAjar>[] = [
    {
      key: 'mata_kuliah',
      label: 'Mata Kuliah & Kode',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900">{row.nama_mk}</div>
          <div className="text-xs text-slate-500">Kode: {row.kode_mk} • {row.sks} SKS</div>
        </div>
      ),
    },
    {
      key: 'kelas',
      label: 'Kelas Perkuliahan',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800">{row.nama_kelas}</span>
          <span className="text-xs text-slate-500 block">Kode: {row.kode_kelas}</span>
        </div>
      ),
    },
    {
      key: 'semester',
      label: 'Tahun Akademik',
      render: (row) => (
        <span className="font-medium text-slate-700">{row.tahun_akademik}</span>
      ),
    },
    {
      key: 'peran',
      label: 'Peran Pengampu',
      render: (row) => (
        <Badge variant={row.peran === 'pengampu_utama' ? 'success' : 'gray'} className="capitalize">
          {row.peran.replace('_', ' ')}
        </Badge>
      ),
    },
  ];

  const proposalColumns: ColumnDef<TridharmaProposal>[] = [
    {
      key: 'judul',
      label: 'Judul & Skema Hibah',
      render: (row) => (
        <div className="space-y-1 max-w-sm">
          <Badge variant="simpeg" className="text-2xs">
            {row.skema?.nama || 'Hibah Riset'}
          </Badge>
          <div className="font-bold text-xs text-slate-900 leading-snug">{row.judul}</div>
          <div className="text-xs text-slate-500">Kode: {row.kode_proposal}</div>
        </div>
      ),
    },
    {
      key: 'periode',
      label: 'Tahun / Periode',
      render: (row) => row.periode?.nama_gelombang || row.periode?.tahun_anggaran || '-',
    },
    {
      key: 'anggaran',
      label: 'Dana Disetujui',
      render: (row) => (
        <div className="text-xs">
          <span className="font-mono font-bold text-emerald-600 block">
            Rp {Number(row.anggaran_disetujui).toLocaleString()}
          </span>
          <span className="text-slate-400 text-2xs">
            Diusulkan: Rp {Number(row.anggaran_diajukan).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status Hibah',
      render: (row) => (
        <Badge variant={row.status === 'didanai' || row.status === 'selesai' ? 'success' : 'amber'} className="capitalize">
          {row.status}
        </Badge>
      ),
    },
  ];

  const publikasiColumns: ColumnDef<TridharmaPublikasi>[] = [
    {
      key: 'judul',
      label: 'Judul Publikasi & Jurnal',
      render: (row) => (
        <div className="space-y-1 max-w-md">
          <div className="font-bold text-xs text-slate-900 leading-snug">{row.judul_artikel}</div>
          <div className="text-xs text-slate-600 font-medium">{row.nama_jurnal_prosiding}</div>
          <div className="text-xs text-slate-500">{row.volume_issue_tahun}</div>
        </div>
      ),
    },
    {
      key: 'indexing',
      label: 'Indexing / Reputasi',
      render: (row) => (
        <Badge variant={row.indexing?.includes('scopus') ? 'success' : 'simpeg'} className="uppercase">
          {row.indexing || 'Lainnya'}
        </Badge>
      ),
    },
    {
      key: 'doi',
      label: 'DOI / Tautan',
      render: (row) => (
        <div>
          {row.doi ? (
            <a
              href={`https://doi.org/${row.doi}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline font-semibold"
            >
              <ExternalLink size={12} /> DOI
            </a>
          ) : row.url_artikel ? (
            <a
              href={row.url_artikel}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline font-semibold"
            >
              <ExternalLink size={12} /> Artikel
            </a>
          ) : (
            <span className="text-xs text-slate-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'verifikasi',
      label: 'Verifikasi LPPM',
      render: (row) => (
        <Badge variant={row.is_verified_lppm ? 'green' : 'gray'}>
          {row.is_verified_lppm ? 'Terverifikasi' : 'Pending'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-6">
      <PageHeader
        title={displayName}
        description="Rincian profil lengkap, identitas kepegawaian, homebase prodi, serta portofolio Tridharma terpadu."
        backUrl={isSelfView ? undefined : (backUrl || '/simpeg/pegawai')}
        action={
          <Button
            icon={<Edit2 size={16} />}
            onClick={() => router.push(`/simpeg/pegawai/${pegawai.id}/edit`)}
          >
            {isSelfView ? 'Edit Kontak & Biodata' : 'Edit Data Pegawai'}
          </Button>
        }
      />

      {/* Hero Banner Card */}
      <div className="card bg-simpeg-hero p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-white shadow-sm backdrop-blur-sm">
              {pegawai.nama_lengkap?.charAt(0) || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {pegawai.roles && pegawai.roles.length > 0 ? (
                  pegawai.roles.map((r) => (
                    <Badge key={r.id} variant="purple" className="text-xs uppercase font-bold">
                      {r.name}
                    </Badge>
                  ))
                ) : (
                  <Badge variant={pegawai.jenis_pegawai === 'dosen' ? 'purple' : 'blue'} className="text-xs uppercase font-bold">
                    {pegawai.jenis_pegawai?.toUpperCase()}
                  </Badge>
                )}
                <Badge variant={pegawai.status === 'aktif' ? 'green' : 'gray'} className="text-xs uppercase">
                  {pegawai.status}
                </Badge>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">{displayName}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap text-xs sm:text-sm text-white/90">
                {nip && <span>NIP: <strong className="text-white">{nip}</strong></span>}
                {nidn && <span>• NIDN: <strong className="text-white">{nidn}</strong></span>}
                {homebaseProdi && <span>• Homebase: <strong className="text-white">{homebaseProdi}</strong></span>}
              </div>
            </div>
          </div>
        </div>

        {/* Academic Identifiers (SINTA, Scopus, Google Scholar, ORCID) */}
        {(pegawai.sinta_id || pegawai.scopus_id || pegawai.google_scholar_id || pegawai.orcid_id) && (
          <div className="mt-4 pt-3 border-t border-white/20 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/80 font-medium mr-1">ID Akademik:</span>
            {pegawai.sinta_id && (
              <span className="text-2xs bg-white/20 text-white px-2 py-0.5 rounded font-mono font-semibold">
                SINTA: {pegawai.sinta_id}
              </span>
            )}
            {pegawai.scopus_id && (
              <span className="text-2xs bg-white/20 text-white px-2 py-0.5 rounded font-mono font-semibold">
                Scopus: {pegawai.scopus_id}
              </span>
            )}
            {pegawai.google_scholar_id && (
              <span className="text-2xs bg-white/20 text-white px-2 py-0.5 rounded font-mono font-semibold">
                Scholar: {pegawai.google_scholar_id}
              </span>
            )}
            {pegawai.orcid_id && (
              <span className="text-2xs bg-white/20 text-white px-2 py-0.5 rounded font-mono font-semibold">
                ORCID: {pegawai.orcid_id}
              </span>
            )}
          </div>
        )}
      </div>

      {/* TRIDHARMA SUMMARY METRICS (If Available) */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="card p-3 bg-white border border-slate-100 shadow-sm text-center">
            <div className="text-2xs text-slate-500 font-semibold uppercase tracking-wider">Total SKS Ajar</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{metrics.total_sks_ajar} SKS</div>
            <div className="text-2xs text-slate-400">{metrics.total_kelas_ajar} Kelas Kuliah</div>
          </div>

          <div className="card p-3 bg-white border border-slate-100 shadow-sm text-center">
            <div className="text-2xs text-slate-500 font-semibold uppercase tracking-wider">Bimbingan Wali</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{metrics.total_mhs_wali}</div>
            <div className="text-2xs text-slate-400">Mahasiswa Aktif</div>
          </div>

          <div className="card p-3 bg-white border border-slate-100 shadow-sm text-center">
            <div className="text-2xs text-slate-500 font-semibold uppercase tracking-wider">Hibah Riset</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{metrics.total_penelitian} Judul</div>
            <div className="text-2xs text-slate-400">Rp {Math.round(metrics.total_dana_penelitian / 1000000)} Jt</div>
          </div>

          <div className="card p-3 bg-white border border-slate-100 shadow-sm text-center">
            <div className="text-2xs text-slate-500 font-semibold uppercase tracking-wider">Publikasi Ilmiah</div>
            <div className="text-xl font-bold text-emerald-600 mt-0.5">{metrics.total_publikasi} Artikel</div>
            <div className="text-2xs text-slate-400">{metrics.total_publikasi_scopus} Scopus • {metrics.total_publikasi_sinta} Sinta</div>
          </div>

          <div className="card p-3 bg-white border border-slate-100 shadow-sm text-center">
            <div className="text-2xs text-slate-500 font-semibold uppercase tracking-wider">Pengabdian (PkM)</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{metrics.total_pengabdian} Kegiatan</div>
            <div className="text-2xs text-slate-400">Rp {Math.round(metrics.total_dana_pengabdian / 1000000)} Jt</div>
          </div>

          <div className="card p-3 bg-white border border-slate-100 shadow-sm text-center">
            <div className="text-2xs text-slate-500 font-semibold uppercase tracking-wider">Rerata SKP & BKD</div>
            <div className="text-xl font-bold text-primary-600 mt-0.5">{metrics.rerata_nilai_skp || '-'}</div>
            <div className="text-2xs text-slate-400">BKD: {metrics.rerata_nilai_bkd ? `${metrics.rerata_nilai_bkd} SKS` : '-'}</div>
          </div>
        </div>
      )}

      {/* TAB NAVIGATION BAR */}
      <div className="border-b border-slate-200">
        <div className="flex gap-2 overflow-x-auto pb-px">
          <button
            type="button"
            onClick={() => setActiveTab('profil')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-lg transition flex items-center gap-2 whitespace-nowrap border-b-2 ${
              activeTab === 'profil'
                ? 'border-primary-600 text-primary-600 bg-primary-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Users size={16} />
            Biodata & Kepegawaian
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pengajaran')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-lg transition flex items-center gap-2 whitespace-nowrap border-b-2 ${
              activeTab === 'pengajaran'
                ? 'border-primary-600 text-primary-600 bg-primary-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <GraduationCap size={16} />
            Pengajaran (SIAKAD)
            {dossier?.pengajaran?.kelas && (
              <span className="ml-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-2xs font-bold">
                {dossier.pengajaran.kelas.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('penelitian')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-lg transition flex items-center gap-2 whitespace-nowrap border-b-2 ${
              activeTab === 'penelitian'
                ? 'border-primary-600 text-primary-600 bg-primary-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <BookOpen size={16} />
            Penelitian & Publikasi (SIPPM)
            {dossier?.penelitian?.publikasi && (
              <span className="ml-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-2xs font-bold">
                {dossier.penelitian.publikasi.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pengabdian')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-lg transition flex items-center gap-2 whitespace-nowrap border-b-2 ${
              activeTab === 'pengabdian'
                ? 'border-primary-600 text-primary-600 bg-primary-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <HeartHandshake size={16} />
            Pengabdian Masyarakat (PkM)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('penunjang')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-lg transition flex items-center gap-2 whitespace-nowrap border-b-2 ${
              activeTab === 'penunjang'
                ? 'border-primary-600 text-primary-600 bg-primary-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Layers size={16} />
            Penunjang, SK &amp; Kinerja
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: PROFIL & KEPEGAWAIAN */}
      {activeTab === 'profil' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Kolom 1: Informasi Kepegawaian */}
            <div className="card p-6 bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 text-primary-600">
                  <Building2 size={20} />
                  <h3 className="font-bold text-base text-slate-900">Kepegawaian</h3>
                </div>
                <div className="flex flex-col gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Unit Kerja</span>
                    <span className="font-semibold text-slate-800">{pegawai.unit_kerja?.nama || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Status Kepegawaian</span>
                    <span className="font-semibold text-slate-800 uppercase">{pegawai.status_kepegawaian}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Jenis Pegawai</span>
                    <span className="font-semibold text-slate-800 capitalize">{pegawai.jenis_pegawai || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Jabatan Terakhir</span>
                    <span className="font-semibold text-slate-800">{pegawai.jabatan_terakhir || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Jabatan Akademik Dosen (JAD)</span>
                    <span className="font-semibold text-slate-800">
                      {pegawai.jabatan_fungsional?.nama ? (
                        <Badge
                          style={{
                            backgroundColor: 'var(--module-primary-subtle)',
                            color: 'var(--module-primary)',
                            borderColor: 'var(--module-primary)',
                          }}
                          className="font-semibold"
                        >
                          {pegawai.jabatan_fungsional.nama}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 italic">Belum diatur</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Kolom 2: Kontak & Identitas */}
            <div className="card p-6 bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 text-primary-600">
                  <Phone size={20} />
                  <h3 className="font-bold text-base text-slate-900">Kontak &amp; Alamat</h3>
                </div>
                <div className="flex flex-col gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Telepon / WhatsApp</span>
                    <span className="font-semibold text-slate-800">{pegawai.telepon || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Email Akun SSO</span>
                    <span className="font-semibold text-slate-800">{pegawai.user?.email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Alamat Domisili</span>
                    <span className="font-semibold text-slate-800">{pegawai.alamat || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Kolom 3: Finansial & Payroll */}
            <div className="card p-6 bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 text-primary-600">
                  <CreditCard size={20} />
                  <h3 className="font-bold text-base text-slate-900">Rekening Penggajian</h3>
                </div>
                <div className="flex flex-col gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Nama Bank</span>
                    <span className="font-semibold text-slate-800">{pegawai.nama_bank || pegawai.bank_nama || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Nomor Rekening</span>
                    <span className="font-semibold font-mono text-slate-800">{pegawai.nomor_rekening || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Atas Nama Rekening</span>
                    <span className="font-semibold text-slate-800">{pegawai.nama_rekening || pegawai.nama_lengkap || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Terdaftar Tanggal Masuk</span>
                    <span className="font-semibold text-slate-800">{formatDate(pegawai.tanggal_masuk)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Card: Riwayat Pendidikan & Kompetensi */}
          <div className="card p-6 bg-white border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Award size={20} className="text-primary-600" />
              <h3 className="font-bold text-base text-slate-900">Sertifikasi &amp; Pelatihan Pegawai</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="text-xs text-slate-500 font-semibold mb-1">Sertifikasi Dosen &amp; Profesi</div>
                <div className="text-2xl font-bold text-slate-900">{sertifikasiList.length}</div>
                <div className="text-2xs text-slate-400 mt-1">Sertifikat terdaftar</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="text-xs text-slate-500 font-semibold mb-1">Tes Kemampuan (TKDA/TOEFL)</div>
                <div className="text-2xl font-bold text-slate-900">{tesList.length}</div>
                <div className="text-2xs text-slate-400 mt-1">Hasil tes tercatat</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="text-xs text-slate-500 font-semibold mb-1">Pelatihan &amp; Workshop</div>
                <div className="text-2xl font-bold text-slate-900">{pelatihanList.length}</div>
                <div className="text-2xs text-slate-400 mt-1">Kegiatan pengembangan</div>
              </div>
            </div>
          </div>

          {/* Card: Presensi Mobile & Biometrik Wajah */}
          <div className="card p-6 bg-white border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 flex-wrap">
              <div className="flex items-center gap-3">
                <ScanFace size={22} className="text-primary-600" />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 m-0">
                    Presensi Mobile &amp; Biometrik Wajah
                  </h3>
                  <p className="text-xs text-slate-400 m-0">
                    Informasi status biometrik wajah, sinkronisasi jadwal kerja, dan titik geofence presensi mobile
                  </p>
                </div>
              </div>
              {pegawai.is_face_enrolled ? (
                <Badge variant="green" className="text-xs">
                  <CheckCircle2 size={12} className="mr-1 inline" /> Wajah Terdaftar
                </Badge>
              ) : (
                <Badge variant="gray" className="text-xs">
                  Belum Terdaftar
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {/* Status Biometrik Wajah */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase font-semibold mb-1">
                    <ScanFace size={14} className="text-slate-500" />
                    Status Biometrik Wajah
                  </div>
                  <div className="font-bold text-slate-800 mt-1">
                    {pegawai.is_face_enrolled ? 'Wajah Aktif Terverifikasi' : 'Belum Melakukan Enrollment'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {pegawai.face_enrolled_at ? (
                      <>Didaftarkan: {new Date(pegawai.face_enrolled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>
                    ) : (
                      'Pendaftaran dilakukan mandiri via aplikasi presensi mobile.'
                    )}
                  </div>
                  {pegawai.consent_pdp_at && (
                    <div className="text-2xs text-emerald-600 mt-1 font-medium">
                      ✓ Persetujuan PDP disetujui ({new Date(pegawai.consent_pdp_at).toLocaleDateString('id-ID')})
                    </div>
                  )}
                </div>

                {canManage && !isSelfView && pegawai.is_face_enrolled && (
                  <div className="pt-3 mt-3 border-t border-slate-200/80">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-400 text-xs font-semibold"
                      icon={<RotateCcw size={13} />}
                      onClick={() => setShowResetConfirm(true)}
                      disabled={isResetting}
                    >
                      Reset Biometrik Wajah
                    </Button>
                  </div>
                )}
              </div>

              {/* Shift Kerja */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase font-semibold mb-1">
                    <Clock size={14} className="text-slate-500" />
                    Shift Kerja Presensi
                  </div>
                  <div className="font-bold text-slate-800 mt-1">
                    {pegawai.shift_template?.name || 'Default Kampus'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {pegawai.shift_template?.start_time && pegawai.shift_template?.end_time
                      ? `${pegawai.shift_template.start_time} - ${pegawai.shift_template.end_time}`
                      : 'Mengikuti jadwal jam kerja umum instansi'}
                  </div>
                </div>
                <div className="text-2xs text-slate-400 pt-3 mt-3 border-t border-slate-200/80">
                  Konfigurasi shift dapat diubah melalui menu Edit Pegawai
                </div>
              </div>

              {/* Lokasi Kantor Geofence */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase font-semibold mb-1">
                    <MapPin size={14} className="text-slate-500" />
                    Lokasi Presensi Geofence
                  </div>
                  <div className="font-bold text-slate-800 mt-1">
                    Multi-Lokasi Kampus (Otomatis)
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {pegawai.office_location?.name
                      ? `Basis: ${pegawai.office_location.name} (dapat absen di seluruh lokasi kampus terdaftar)`
                      : 'Pegawai dapat presensi di seluruh lokasi kantor/kampus aktif terdekat'}
                  </div>
                </div>
                <div className="text-2xs text-slate-400 pt-3 mt-3 border-t border-slate-200/80">
                  Validasi radius GPS otomatis ke titik kampus/kantor terdekat
                </div>
              </div>
            </div>
          </div>

          {/* Card: Aset Dinas & Clearance Inventaris (SINAPRA) */}
          <div className="card p-6 bg-white border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 flex-wrap">
              <div className="flex items-center gap-3">
                <PackageCheck size={22} className="text-primary-600" />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">
                    Aset Dinas &amp; Clearance Inventaris (SINAPRA)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pencatatan aset dinas resmi yang dipegang pegawai dan status clearance inventaris kampus
                  </p>
                </div>
              </div>
              {clearance?.is_cleared ? (
                <Badge variant="green" className="text-xs">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={12} /> Bebas Tanggungan (Clear)
                  </span>
                </Badge>
              ) : (
                <Badge variant="warning" className="text-xs">
                  <span className="flex items-center gap-2">
                    <ShieldAlert size={12} /> Ada Tanggungan Aset
                  </span>
                </Badge>
              )}
            </div>

            {clearance && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <div className="text-xs text-slate-500 font-semibold">Aset Dinas Dipegang (PIC)</div>
                    <div className="text-2xl font-bold text-slate-900">{clearance.aset_dipegang_count || 0}</div>
                    <div className="text-2xs text-slate-400">Laptop, kendaraan dinas, atau inventaris portabel</div>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <div className="text-xs text-slate-500 font-semibold">Peminjaman Fasilitas Aktif</div>
                    <div className="text-2xl font-bold text-slate-900">{clearance.peminjaman_aktif_count || 0}</div>
                    <div className="text-2xs text-slate-400">Peminjaman alat/ruangan belum selesai</div>
                  </div>
                </div>

                {clearance.aset_dipegang && clearance.aset_dipegang.length > 0 && (
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-slate-700 uppercase">Daftar Barang Inventaris Terdaftar:</div>
                    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden bg-white">
                      {clearance.aset_dipegang.map((a: any) => (
                        <div key={a.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                          <div>
                            <span className="font-mono font-bold text-primary-600 block">{a.kode_aset}</span>
                            <span className="font-semibold text-slate-800">{a.nama_aset || a.nama}</span>
                            {a.nomor_seri && <span className="text-slate-400 block text-2xs">SN: {a.nomor_seri}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={a.status === 'tersedia' ? 'success' : 'info'} className="text-2xs">
                              {a.status}
                            </Badge>
                            {canManage && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-2xs h-7 px-2"
                                onClick={() => router.push(`/sinapra/aset/${a.id}`)}
                              >
                                Detail Aset
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: PENGAJARAN (SIAKAD) */}
      {activeTab === 'pengajaran' && (
        <div className="space-y-6 animate-fade-in">
          <div className="card p-6 bg-white border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap size={20} className="text-primary-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">Riwayat Pengajaran Kelas Perkuliahan (SIAKAD)</h3>
                  <p className="text-xs text-slate-500">Mata kuliah yang diampu per semester beserta beban SKS</p>
                </div>
              </div>
            </div>

            <DataTable
              columns={pengajaranColumns}
              data={dossier?.pengajaran?.kelas || []}
              isLoading={false}
              emptyMessage={
                <div className="py-8 text-center text-slate-400">
                  Belum ada data riwayat kelas pengajaran tercatat di SIAKAD.
                </div>
              }
            />
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: PENELITIAN & PUBLIKASI (SIPPM) */}
      {activeTab === 'penelitian' && (
        <div className="space-y-6 animate-fade-in">
          {/* Hibah Penelitian */}
          <div className="card p-6 bg-white border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-primary-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">Hibah Penelitian Dosen (SIPPM)</h3>
                  <p className="text-xs text-slate-500">Proposal riset internal maupun eksternal yang didanai</p>
                </div>
              </div>
            </div>

            <DataTable
              columns={proposalColumns}
              data={dossier?.penelitian?.hibah_ketua || []}
              isLoading={false}
              emptyMessage={
                <div className="py-8 text-center text-slate-400">
                  Belum ada proposal hibah penelitian yang tercatat di SIPPM.
                </div>
              }
            />
          </div>

          {/* Publikasi Ilmiah */}
          <div className="card p-6 bg-white border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-emerald-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">Publikasi Artikel Jurnal &amp; Prosiding</h3>
                  <p className="text-xs text-slate-500">Artikel ilmiah terindeks Scopus, Sinta 1-6, dan WoS</p>
                </div>
              </div>
            </div>

            <DataTable
              columns={publikasiColumns}
              data={dossier?.penelitian?.publikasi || []}
              isLoading={false}
              emptyMessage={
                <div className="py-8 text-center text-slate-400">
                  Belum ada artikel publikasi ilmiah yang tercatat di SIPPM.
                </div>
              }
            />
          </div>

          {/* HKI & Buku */}
          <div className="card p-6 bg-white border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers size={20} className="text-primary-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">Hak Cipta, Paten &amp; Buku Ajar (HKI)</h3>
                  <p className="text-xs text-slate-500">Kekayaan intelektual resmi ber-ISBN dan tercatat di Kemenkumham</p>
                </div>
              </div>
            </div>

            {dossier?.penelitian?.hki_buku && dossier.penelitian.hki_buku.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dossier.penelitian.hki_buku.map((hki: any) => (
                  <div key={hki.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                    <Badge variant="simpeg" className="text-2xs capitalize mb-1">{hki.jenis}</Badge>
                    <div className="font-bold text-xs text-slate-900">{hki.judul}</div>
                    <div className="text-xs text-slate-500">
                      No. Sertifikat: <span className="font-mono font-semibold">{hki.nomor_sertifikat || '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada data HKI, paten, atau buku ajar tercatat.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: PENGABDIAN MASYARAKAT (SIPPM) */}
      {activeTab === 'pengabdian' && (
        <div className="space-y-6 animate-fade-in">
          <div className="card p-6 bg-white border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HeartHandshake size={20} className="text-primary-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">Kegiatan Pengabdian Kepada Masyarakat (PkM)</h3>
                  <p className="text-xs text-slate-500">Pemberdayaan masyarakat, pelatihan UMKM, dan kemitraan industri</p>
                </div>
              </div>
            </div>

            <DataTable
              columns={proposalColumns}
              data={dossier?.pengabdian?.hibah_ketua || []}
              isLoading={false}
              emptyMessage={
                <div className="py-8 text-center text-slate-400">
                  Belum ada kegiatan pengabdian kepada masyarakat yang tercatat di SIPPM.
                </div>
              }
            />
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: PENUNJANG & KINERJA (SIMPEG) */}
      {activeTab === 'penunjang' && (
        <div className="space-y-4 animate-fade-in">
          {/* 1. Jabatan Akademik Dosen (JAD) & Angka Kredit */}
          <div className="card p-4 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <Medal size={18} style={{ color: 'var(--module-primary)' }} />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 tracking-tight">Jabatan Akademik Dosen (JAD) &amp; Angka Kredit</h3>
                  <p className="text-2xs text-slate-500">Jenjang jabatan fungsional akademik, penetapan KUM, dan riwayat promosi</p>
                </div>
              </div>
              {dossier?.penunjang?.jabatan_fungsional_aktif && (
                <Badge
                  style={{
                    backgroundColor: 'var(--module-primary-subtle)',
                    color: 'var(--module-primary)',
                    borderColor: 'var(--module-primary)',
                  }}
                  className="font-bold text-2xs"
                >
                  JAD Aktif: {dossier.penunjang.jabatan_fungsional_aktif.nama} ({dossier.penunjang.jabatan_fungsional_aktif.angka_kredit_min} - {dossier.penunjang.jabatan_fungsional_aktif.angka_kredit_max} KUM)
                </Badge>
              )}
            </div>

            {dossier?.penunjang?.riwayat_jad && dossier.penunjang.riwayat_jad.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {dossier.penunjang.riwayat_jad.map((jad) => (
                  <div
                    key={jad.id}
                    className={`p-3.5 rounded-xl border ${
                      jad.is_active ? 'shadow-xs' : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors'
                    } space-y-2`}
                    style={
                      jad.is_active
                        ? {
                            borderColor: 'var(--module-primary)',
                            backgroundColor: 'var(--module-primary-subtle)',
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          {jad.jabatan_fungsional?.nama || 'Jabatan Akademik'}
                        </span>
                        {jad.is_active && (
                          <Badge variant="green" className="text-2xs">Aktif</Badge>
                        )}
                      </div>
                      <span className="text-2xs font-semibold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded">
                        Golongan {jad.jabatan_fungsional?.golongan || '-'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                      <div>
                        <span className="text-2xs text-slate-400 block font-medium">Beban KUM</span>
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {jad.jabatan_fungsional?.angka_kredit_min || 0} - {jad.jabatan_fungsional?.angka_kredit_max || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-2xs text-slate-400 block font-medium">TMT Mulai</span>
                        <span className="text-xs font-semibold text-slate-800">{formatDate(jad.mulai_jabatan)}</span>
                      </div>
                    </div>

                    <div className="text-xs font-mono bg-white p-2.5 rounded-lg border border-slate-200/70 flex items-center justify-between">
                      <div>
                        <span className="text-2xs text-slate-400 block font-sans">Nomor SK:</span>
                        <span className="font-semibold text-slate-700">{jad.sk_nomor || '-'}</span>
                      </div>
                      {jad.sk_tanggal && (
                        <div className="text-right">
                          <span className="text-2xs text-slate-400 block font-sans">Tanggal SK:</span>
                          <span className="text-slate-600 font-sans">{formatDate(jad.sk_tanggal)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada data riwayat Jabatan Akademik Dosen (JAD) yang tercatat.
              </div>
            )}
          </div>

          {/* 2. Sertifikat Pendidik Dosen (Serdos) */}
          <div className="card p-4 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <GraduationCap size={18} style={{ color: 'var(--module-primary)' }} />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 tracking-tight">Sertifikat Pendidik Dosen (Serdos)</h3>
                  <p className="text-2xs text-slate-500">Sertifikasi dosen profesional resmi Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi</p>
                </div>
              </div>
              {dossier?.penunjang?.sertifikasi_pendidik && dossier.penunjang.sertifikasi_pendidik.length > 0 && (
                <Badge variant="green" className="text-2xs font-semibold">
                  <CheckCircle2 size={12} className="mr-1 inline" /> Tersertifikasi Pendidik
                </Badge>
              )}
            </div>

            {dossier?.penunjang?.sertifikasi_pendidik && dossier.penunjang.sertifikasi_pendidik.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {dossier.penunjang.sertifikasi_pendidik.map((serdos) => (
                  <div key={serdos.id} className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/20 space-y-2 hover:bg-emerald-50/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{serdos.nama_sertifikat}</span>
                      <Badge variant="simpeg" className="text-2xs">Tahun {serdos.tahun_sertifikasi}</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-emerald-100/70">
                      <div>
                        <span className="text-2xs text-slate-400 block font-medium">Bidang Studi</span>
                        <span className="text-xs font-semibold text-slate-800">{serdos.bidang_studi}</span>
                      </div>
                      <div>
                        <span className="text-2xs text-slate-400 block font-medium">Penyelenggara / PTP</span>
                        <span className="text-xs font-semibold text-slate-800">{serdos.penyelenggara}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-emerald-100/80 space-y-1">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-2xs text-slate-400 font-sans">No. Registrasi:</span>
                        <span className="font-bold text-slate-800">{serdos.nomor_registrasi || '-'}</span>
                      </div>
                      {serdos.nomor_sk && (
                        <div className="flex items-center justify-between border-t border-slate-100 pt-1 font-mono">
                          <span className="text-2xs text-slate-400 font-sans">No. SK Kelulusan:</span>
                          <span className="text-slate-700">{serdos.nomor_sk}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada Sertifikat Pendidik Dosen (Serdos) yang tercatat.
              </div>
            )}
          </div>

          {/* 3. Sertifikat Kompetensi & Lisensi Profesi */}
          <div className="card p-4 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <BookmarkCheck size={18} style={{ color: 'var(--module-primary)' }} />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 tracking-tight">Sertifikat Kompetensi &amp; Lisensi Profesi</h3>
                  <p className="text-2xs text-slate-500">Sertifikasi BNSP, sertifikasi vendor industri, dan asosiasi profesi</p>
                </div>
              </div>
              {dossier?.penunjang?.sertifikasi_kompetensi && dossier.penunjang.sertifikasi_kompetensi.length > 0 && (
                <span className="text-2xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  {dossier.penunjang.sertifikasi_kompetensi.length} Sertifikat
                </span>
              )}
            </div>

            {dossier?.penunjang?.sertifikasi_kompetensi && dossier.penunjang.sertifikasi_kompetensi.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {dossier.penunjang.sertifikasi_kompetensi.map((sert) => (
                  <div key={sert.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2 flex flex-col justify-between hover:bg-slate-50 transition-colors">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="simpeg" className="text-2xs">
                          {sert.jenis_sertifikasi?.nama || 'Kompetensi'}
                        </Badge>
                        <span className="text-2xs text-slate-400 font-semibold">{sert.tahun_sertifikasi}</span>
                      </div>
                      <div className="font-bold text-xs text-slate-900 leading-snug">{sert.nama_sertifikat}</div>
                      <div className="text-2xs text-slate-500">Bidang: <span className="font-medium text-slate-700">{sert.bidang_studi}</span></div>
                      <div className="text-2xs text-slate-500">Penerbit: <span className="font-medium text-slate-700">{sert.penyelenggara}</span></div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/70 text-2xs text-slate-600 font-mono flex items-center justify-between">
                      <span className="text-slate-400 font-sans">No:</span>
                      <span className="font-semibold text-slate-700">{sert.nomor_registrasi || sert.nomor_sk || '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada sertifikat kompetensi atau lisensi profesi yang tercatat.
              </div>
            )}
          </div>

          {/* 4. Sertifikat Pelatihan, Diklat & Workshop */}
          <div className="card p-4 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <FileCheck size={18} style={{ color: 'var(--module-primary)' }} />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 tracking-tight">Sertifikat Pelatihan, Diklat &amp; Workshop</h3>
                  <p className="text-2xs text-slate-500">Kegiatan peningkatan kompetensi, pelatihan pekerti/applied approach, dan workshop keahlian</p>
                </div>
              </div>
              {dossier?.penunjang?.pelatihan && dossier.penunjang.pelatihan.length > 0 && (
                <span className="text-2xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  {dossier.penunjang.pelatihan.length} Kegiatan
                </span>
              )}
            </div>

            {dossier?.penunjang?.pelatihan && dossier.penunjang.pelatihan.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {dossier.penunjang.pelatihan.map((pel) => (
                  <div key={pel.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <Badge variant="simpeg" className="text-2xs">
                        {pel.jenis_pelatihan?.nama || 'Pelatihan'}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        {pel.peran?.nama && (
                          <span className="text-2xs font-semibold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded">
                            {pel.peran.nama}
                          </span>
                        )}
                        {pel.tingkat?.nama && (
                          <span className="text-2xs font-semibold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded">
                            {pel.tingkat.nama}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="font-bold text-xs text-slate-900">{pel.nama_kegiatan}</div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                      <div>
                        <span className="text-2xs text-slate-400 block font-medium">Penyelenggara</span>
                        <span className="text-xs font-semibold text-slate-800">{pel.penyelenggara}</span>
                      </div>
                      <div>
                        <span className="text-2xs text-slate-400 block font-medium">Waktu / Durasi</span>
                        <span className="text-xs font-semibold text-slate-800">
                          {formatDate(pel.tanggal_mulai)} {pel.jumlah_jam ? `(${pel.jumlah_jam} JP)` : ''}
                        </span>
                      </div>
                    </div>

                    {pel.nomor_sertifikat && (
                      <div className="text-xs font-mono bg-white p-2.5 rounded-lg border border-slate-200/70 flex items-center justify-between">
                        <span className="text-2xs text-slate-400 font-sans">No. Sertifikat:</span>
                        <span className="font-semibold text-slate-700">{pel.nomor_sertifikat}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada data pelatihan atau workshop yang tercatat.
              </div>
            )}
          </div>

          {/* 5. Surat Tugas & Kedinasan Luar Kampus */}
          <div className="card p-4 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <Briefcase size={18} style={{ color: 'var(--module-primary)' }} />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 tracking-tight">Surat Tugas &amp; Kedinasan Luar Kampus</h3>
                  <p className="text-2xs text-slate-500">Penugasan resmi mewakili kampus serta laporan pertanggungjawaban (LPJ)</p>
                </div>
              </div>
            </div>

            {dossier?.penunjang?.surat_tugas && dossier.penunjang.surat_tugas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {dossier.penunjang.surat_tugas.map((st) => (
                  <div key={st.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <Badge variant="simpeg" className="text-2xs capitalize">{st.kategori_kegiatan?.nama || 'Tugas Dinas'}</Badge>
                      <Badge variant={st.status === 'disetujui' ? 'green' : 'gray'} className="text-2xs capitalize">{st.status}</Badge>
                    </div>
                    <div className="font-bold text-xs text-slate-900">{st.nama_kegiatan}</div>
                    <div className="text-2xs text-slate-500">Tujuan: <span className="font-medium text-slate-700">{st.lokasi_tujuan}</span> • {formatDate(st.tanggal_mulai)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada surat tugas dinas luar yang tercatat.
              </div>
            )}
          </div>

          {/* 6. Surat Keputusan (SK) Mandiri & Penugasan Dosen */}
          <div className="card p-4 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <FileText size={18} style={{ color: 'var(--module-primary)' }} />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 tracking-tight">Surat Keputusan (SK) Mandiri &amp; Penugasan Dosen</h3>
                  <p className="text-2xs text-slate-500">SK Mengajar, Pembimbingan, dan Jabatan Fungsional Pegawai</p>
                </div>
              </div>
            </div>

            {dossier?.penunjang?.sk_pegawai && dossier.penunjang.sk_pegawai.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {dossier.penunjang.sk_pegawai.map((sk: any) => (
                  <div key={sk.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <Badge variant="simpeg" className="text-2xs">{sk.kategori_sk?.nama || sk.kategori?.nama || 'SK Penugasan'}</Badge>
                      <span className="text-2xs text-slate-400 font-medium">{formatDate(sk.tanggal_sk)}</span>
                    </div>
                    <div className="font-bold text-xs text-slate-900">{sk.judul_sk}</div>
                    <div className="text-2xs text-slate-500 font-mono">No: {sk.nomor_sk}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada SK penugasan yang tercatat.
              </div>
            )}
          </div>

          {/* 7. Riwayat Sasaran Kinerja Pegawai (SKP & BKD) */}
          <div className="card p-4 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <TrendingUp size={18} style={{ color: 'var(--module-primary)' }} />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 tracking-tight">Riwayat Sasaran Kinerja Pegawai (SKP &amp; BKD)</h3>
                  <p className="text-2xs text-slate-500">Evaluasi capaian tahunan, predikat kinerja, dan pemenuhan beban kerja dosen (BKD)</p>
                </div>
              </div>
            </div>

            {dossier?.penunjang?.kinerja_skp && dossier.penunjang.kinerja_skp.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {dossier.penunjang.kinerja_skp.map((k) => (
                  <div key={k.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">Tahun {k.tahun} ({k.semester.toUpperCase()})</span>
                      <Badge variant="success" className="uppercase text-2xs">{k.predikat}</Badge>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-slate-900">{k.nilai_skp}</span>
                      <span className="text-2xs text-slate-400">/ 100</span>
                      {k.nilai_bkd && (
                        <span className="text-2xs font-semibold text-slate-600 ml-auto bg-slate-200/60 px-2 py-0.5 rounded">
                          BKD: {k.nilai_bkd} SKS
                        </span>
                      )}
                    </div>
                    {k.catatan_evaluator && (
                      <div className="text-2xs text-slate-500 italic bg-white p-2 rounded-md border border-slate-100">
                        &quot;{k.catatan_evaluator}&quot;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada evaluasi kinerja SKP yang tercatat.
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetBiometric}
        title="Reset Biometrik Wajah"
        message={
          <div>
            Apakah Anda yakin ingin mereset data biometrik wajah pegawai <strong>{displayName}</strong>?
            <p className="mt-2 text-xs text-rose-600 font-semibold">
              Data vektor biometrik akan dihapus dan pegawai harus mendaftarkan ulang wajahnya melalui aplikasi mobile presensi.
            </p>
          </div>
        }
        confirmText="Ya, Reset Biometrik"
        cancelText="Batal"
        variant="danger"
        isLoading={isResetting}
      />
    </div>
  );
}
