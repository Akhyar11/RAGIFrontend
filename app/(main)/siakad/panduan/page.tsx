'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  HelpCircle,
  CalendarCheck,
  Building2,
  Users,
  ClipboardCheck,
  Award,
  ChevronRight,
  ExternalLink,
  KeyRound,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';

interface GuideSection {
  id: string;
  title: string;
  category: 'master' | 'perkuliahan' | 'krs' | 'nilai' | 'obe' | 'akun';
  categoryLabel: string;
  summary: string;
  targetUrl?: string;
  targetLabel?: string;
  rolesAllowed: string[];
  steps: string[];
  tips?: string[];
  warnings?: string[];
  faqs?: { q: string; a: string }[];
}

const GUIDES: GuideSection[] = [
  {
    id: 'buka-periode-aktif',
    title: 'Cara Membuka Periode & Mengaktifkan Semester Berjalan',
    category: 'master',
    categoryLabel: 'Master & Konfigurasi',
    summary:
      'Membuka periode tahun akademik baru, mengatur kalender KRS/perkuliahan/nilai, lalu menetapkannya sebagai periode aktif.',
    targetUrl: '/siakad/master/tahun-akademik',
    targetLabel: 'Buka Tahun Akademik',
    rolesAllowed: ['superadmin', 'admin'],
    steps: [
      'Buka menu "MASTER AKADEMIK" → "Tahun Akademik" (/siakad/master/tahun-akademik).',
      'Klik "Buka Periode Baru". Isi Kode Periode, Nama Periode, Tahun Mulai/Selesai, lalu rentang tanggal KRS, KPRS, Perkuliahan, dan Input Nilai.',
      'Pilih Mode Penilaian periode (Pure OBE / Hybrid / Konvensional) — berlaku untuk seluruh kelas pada periode tersebut.',
      'Klik "Simpan Periode". Periode baru berstatus arsip/non-aktif.',
      'Klik "Set Sebagai Aktif" pada periode tersebut. Penetapan ini otomatis mensinkronkan sesi KRS, jadwal, penawaran kelas, dan penagihan SIKEU.',
    ],
    tips: [
      'Ubah kalender/mode periode berjalan lewat tombol Edit (ikon titik tiga) tanpa mengganti periode aktif.',
    ],
    warnings: [
      'Hanya satu periode yang boleh aktif. Mengaktifkan periode baru menonaktifkan periode lama.',
    ],
    faqs: [
      {
        q: 'Di mana mengubah mode penilaian tanpa membuka periode baru?',
        a: 'Lewat halaman "Konfigurasi Penilaian & OBE" atau tombol Edit pada baris periode — perubahan langsung tersimpan ke periode tersebut.',
      },
    ],
  },
  {
    id: 'tambah-fakultas-prodi',
    title: 'Cara Menambah Fakultas & Program Studi',
    category: 'master',
    categoryLabel: 'Master & Konfigurasi',
    summary:
      'Mendaftarkan fakultas induk (maksimal 5 field via modal) lalu program studi lengkap dengan kaprodi dan akreditasi.',
    targetUrl: '/siakad/master/fakultas',
    targetLabel: 'Buka Fakultas & Prodi',
    rolesAllowed: ['superadmin', 'admin'],
    steps: [
      'Buka menu "MASTER AKADEMIK" → "Fakultas & Prodi". Tab pertama menampilkan kartu struktur fakultas.',
      'Klik "Tambah Fakultas", isi Kode, Nama Lengkap, Nama Singkat, Telepon, dan Email, lalu Simpan.',
      'Pindah ke tab "Daftar Program Studi", klik "Tambah Program Studi".',
      'Pilih Fakultas Induk (dari database), Jenjang, Kode Internal & Kode PDDIKTI, dan Nama Prodi.',
      'Cari Ketua Prodi (Kaprodi) via kolom pencarian Nama/NIDN, pilih Peringkat Akreditasi dari database, lalu Simpan.',
    ],
    tips: [
      'Kode dan fakultas induk dikunci setelah tersimpan — periksa dua kali sebelum menyimpan.',
      'Edit prodi lewat menu titik tiga → "Edit Program Studi".',
    ],
  },
  {
    id: 'tambah-mk-prasyarat',
    title: 'Cara Menambah Mata Kuliah & Prasyarat',
    category: 'master',
    categoryLabel: 'Master & Konfigurasi',
    summary:
      'Mendaftarkan MK ke kurikulum (SKS, semester anjuran, tipe) lalu mengatur mata kuliah prasyaratnya.',
    targetUrl: '/siakad/obe/matakuliah',
    targetLabel: 'Buka Mata Kuliah',
    rolesAllowed: ['superadmin', 'admin'],
    steps: [
      'Buka menu "OBE" → "Mata Kuliah", klik "Tambah Mata Kuliah".',
      'Isi Kode MK, Nama MK, Kurikulum Acuan (dari database), dan Tipe (Wajib / Wajib Prodi / Pilihan).',
      'Isi SKS Teori, SKS Praktik, dan Semester Anjuran (1–14), lalu Simpan.',
      'Kembali ke tabel, pilih "Kelola Prasyarat MK" pada MK tersebut.',
      'Cari mata kuliah prasyarat, tentukan kriteria (Wajib Lulus + nilai minimum, atau Pernah Diambil), lalu "Tambahkan Prasyarat".',
    ],
    tips: [
      'Gunakan Filter (Prodi, Kurikulum, Tipe) untuk mencari MK sebelum menambah yang baru.',
    ],
  },
  {
    id: 'skala-nilai',
    title: 'Cara Mengatur Skala Nilai Mutu',
    category: 'master',
    categoryLabel: 'Master & Konfigurasi',
    summary:
      'Standar konversi angka → huruf mutu (A–E) dan bobot indeks, umum universitas atau khusus per prodi.',
    targetUrl: '/siakad/master/skala-nilai',
    targetLabel: 'Buka Skala Nilai',
    rolesAllowed: ['superadmin', 'admin'],
    steps: [
      'Buka menu "MASTER AKADEMIK" → "Skala Nilai", klik "Tambah Skala Nilai".',
      'Kosongkan Program Studi untuk skala standar universitas, atau pilih prodi untuk skala khusus.',
      'Isi Huruf Mutu, Bobot Indeks (0–4.00), Keterangan, Batas Bawah dan Batas Atas (0–100).',
      'Centang "Dinyatakan Lulus Mata Kuliah" bila huruf tersebut berarti lulus, lalu Simpan.',
    ],
    warnings: [
      'Batas Atas harus lebih besar atau sama dengan Batas Bawah — form menolak rentang terbalik.',
      'Skala standar (A–E) sudah tersedia otomatis dari migrasi; jangan buat duplikat umum.',
    ],
    faqs: [
      {
        q: 'Nilai huruf apa yang membuat mahasiswa mengulang?',
        a: 'Huruf dengan status "Tidak Lulus (Mengulang)" — umumnya D dan E pada skala standar.',
      },
    ],
  },
  {
    id: 'buka-kelas',
    title: 'Cara Membuka Jadwal Perkuliahan Baru',
    category: 'perkuliahan',
    categoryLabel: 'Jadwal Perkuliahan',
    summary:
      'Alokasi MK, dosen pengampu + team teaching, ruangan SINAPRA, dan jadwal mingguan pada periode aktif.',
    targetUrl: '/siakad/perkuliahan/kelas/create',
    targetLabel: 'Buka Jadwal Baru',
    rolesAllowed: ['superadmin', 'admin'],
    steps: [
      'Buka menu "PERKULIAHAN" → "Jadwal Perkuliahan", klik "Buka Jadwal Baru".',
      'Bagian 0: pastikan Periode Akademik menunjuk semester berjalan (otomatis terpilih yang aktif).',
      'Bagian 1: pilih Program Studi lalu Mata Kuliah yang belum dibuka — Kode dan Nama Kelas terisi otomatis, bisa diubah.',
      'Bagian 2: cari Dosen Pengampu Utama via Nama/NIDN, lalu tambah Dosen Team Teaching bila ada.',
      'Bagian 3: cari Ruangan (kapasitas mengikuti ruangan), tentukan Hari, Jam Mulai/Selesai, dan Kuota KRS, lalu "Buka Kelas Perkuliahan".',
    ],
    tips: [
      'Ganti periode tampil lewat Filter (Drawer) — badge periode aktif selalu terlihat di atas tab hari.',
      'RPS tiap kelas dikelola via tombol "Kelola RPS" (halaman 16 minggu), bukan popup.',
      'Ubah kelas via menu titik tiga → "Edit Kelas" (halaman form).',
    ],
  },
  {
    id: 'krs-mahasiswa',
    title: 'Cara Mengisi & Mengajukan KRS (Mahasiswa)',
    category: 'krs',
    categoryLabel: 'KRS & Studi',
    summary:
      'Mengambil kelas, mengajukan ke dosen wali, revisi bila perlu, dan mencetak KRS.',
    targetUrl: '/siakad/krs',
    targetLabel: 'Buka KRS Saya',
    rolesAllowed: ['mahasiswa'],
    steps: [
      'Buka menu KRS. Ganti periode tampil lewat tombol "Filter" bila ingin melihat semester lalu.',
      'Klik "Ambil Mata Kuliah", pilih kelas yang dibuka pada periode tersebut, lalu tambahkan.',
      'Periksa total SKS, lalu klik "Ajukan ke Dosen Wali".',
      'Mahasiswa pindahan: buka tab "Penyetaraan Konversi" di halaman yang sama untuk mengajukan pengakuan MK asal (lihat statusnya di tab tersebut).',
      'Pantau status persetujuan. Bila perlu ubah, klik "Revisi / Ubah Rencana Studi".',
      'Cetak KRS via tombol "Cetak KRS" setelah disetujui.',
    ],
    warnings: [
      'Pengisian terkunci bila tagihan SPP/UKT belum lunas (kunci keuangan).',
    ],
    faqs: [
      {
        q: 'Kelas yang saya mau tidak muncul di daftar ambil?',
        a: 'Kelas belum dibuka BAAK pada periode tersebut, kuota penuh, atau prasyarat MK-nya belum lulus.',
      },
    ],
  },
  {
    id: 'persetujuan-krs',
    title: 'Cara Menyetujui KRS Mahasiswa (Dosen Wali / Admin)',
    category: 'krs',
    categoryLabel: 'KRS & Studi',
    summary:
      'Memeriksa rencana studi mahasiswa bimbingan dan menyetujuinya per periode.',
    targetUrl: '/siakad/krs',
    targetLabel: 'Buka Persetujuan KRS',
    rolesAllowed: ['dosen', 'superadmin', 'admin'],
    steps: [
      'Buka menu KRS (tampilan daftar pengajuan untuk dosen/admin).',
      'Filter berdasarkan periode (Drawer Filter), program studi, atau status pengajuan.',
      'Buka detail KRS mahasiswa: periksa daftar kelas, total SKS, dan bentrok jadwal.',
      'Klik "Setujui" untuk mengesahkan, atau kembalikan ke draft untuk direvisi mahasiswa.',
    ],
  },
  {
    id: 'alur-obe-split',
    title: 'Alur OBE per Menu: Pemantauan, CPL, CPMK, RPS, Ketertiban',
    category: 'obe',
    categoryLabel: 'OBE & Feeder',
    summary:
      'Menu OBE dipecah per fungsi dengan batasan peran; ketertiban dosen punya menu sendiri.',
    targetUrl: '/siakad/obe',
    targetLabel: 'Buka Pemantauan OBE',
    rolesAllowed: ['superadmin', 'admin', 'kaprodi', 'dosen'],
    steps: [
      'Pemantauan OBE (/siakad/obe): ringkasan CPL, audit kesiapan MK, RPS — untuk Kaprodi & BAAK.',
      'CPL & Kurikulum (/siakad/obe/cpl): rumuskan CPL, matriks CPL↔MK, Profil Lulusan, Bahan Kajian.',
      'CPMK (/siakad/obe/cpmk): petakan CPMK per MK hingga total bobot 100% — untuk dosen & kaprodi.',
      'RPS (/siakad/obe/rps): dosen menyusun RPS 16 minggu, Kaprodi memverifikasi (Setujui/Minta Revisi).',
      'Ketertiban Dosen (/siakad/obe/kepatuhan): pantau dosen yang terlambat input nilai — untuk Kaprodi & BAAK.',
      'Alur wajib sebelum nilai dibuka: RPS terisi → bobot 100% → input nilai → publikasi Final.',
    ],
    warnings: [
      'Input nilai terkunci otomatis bila RPS kosong atau bobot belum 100% (cek badge di matriks kelas).',
    ],
  },
  {
    id: 'feeder-per-data',
    title: 'Sinkronisasi Feeder per Data (Dosen, Mahasiswa, Akademik, Perkuliahan)',
    category: 'obe',
    categoryLabel: 'OBE & Feeder',
    summary:
      'Setiap kelompok data punya tab sync sendiri + status mapping dan log terakhir.',
    targetUrl: '/siakad/feeder-sync',
    targetLabel: 'Buka Sync Feeder',
    rolesAllowed: ['superadmin', 'admin'],
    steps: [
      'Buka Sync Neo Feeder, pastikan status koneksi LIVE.',
      'Pilih tab data: Dosen (biodata, penugasan, ajar), Mahasiswa (biodata, riwayat), Akademik (tarik Prodi, push MK), atau Perkuliahan (ajar, kelas & nilai).',
      'Jalankan tombol sync per kartu sesuai urutan langkah (khusus Dosen: Langkah 1→3).',
      'Pantau mini-tabel Mapping & Log di bawah tiap tab; riwayat lengkap di tab Mapping/Log.',
    ],
    warnings: [
      'Sync Feeder tidak menghapus data lokal yang absen di feeder — hanya tambah/perbarui.',
    ],
  },
  {
    id: 'rps-kelas-page',
    title: 'Cara Menyusun RPS 16 Minggu per Kelas (Halaman Form)',
    category: 'perkuliahan',
    categoryLabel: 'Jadwal Perkuliahan',
    summary:
      'Editor RPS per kelas di halaman penuh: deskripsi, pustaka, dan 16 pertemuan dengan validasi total bobot 100%.',
    targetUrl: '/siakad/perkuliahan/kelas',
    targetLabel: 'Buka Jadwal Perkuliahan',
    rolesAllowed: ['dosen', 'superadmin', 'admin'],
    steps: [
      'Di tabel Jadwal Perkuliahan, menu titik tiga → "Kelola RPS 16 Minggu" (atau tombol Kelola RPS).',
      'Isi Deskripsi Singkat, Pustaka Utama, dan Pustaka Pendukung.',
      'Isi 16 baris pertemuan (Sub-CPMK, Bahan Kajian, Metode, Bobot %) — pantau badge Total Bobot hingga 100%.',
      'Klik "Simpan RPS & 16 Pertemuan". Tahun ajaran mengikuti periode kelas otomatis.',
      'Ajukan ke Kaprodi untuk verifikasi lewat menu RPS & Verifikasi.',
    ],
  },
  {
    id: 'cari-mahasiswa-dosen',
    title: 'Pencarian Mahasiswa & Dosen (Live SIMPEG)',
    category: 'krs',
    categoryLabel: 'KRS & Studi',
    summary:
      'Direktori tanpa perantara kelas: cari NIM/nama langsung; data dosen live dari SIMPEG.',
    targetUrl: '/siakad/civitas/biodata',
    targetLabel: 'Buka Biodata',
    rolesAllowed: ['superadmin', 'admin', 'dosen'],
    steps: [
      'Biodata/Hasil Studi: ketik NIM/nama di kolom pencarian (otomatis, tanpa pilih kelas dulu), lalu "Buka".',
      'Direktori Dosen: sumber live SIMPEG — tambah/nonaktif dosen hanya di SIMPEG; di SIAKAD cukup atur Homebase Prodi & Jabatan.',
      'Filter prodi/jabatan tersedia di samping kolom pencarian dan Drawer Filter.',
    ],
  },
  {
    id: 'buku-induk-status',
    title: 'Cara Mengunduh Buku Induk & Mengelola Status Mahasiswa',
    category: 'krs',
    categoryLabel: 'KRS & Studi',
    summary:
      'Rekapan CSV per angkatan/prodi dan pencatatan status sesuai kamus PDDIKTI.',
    targetUrl: '/siakad/civitas/mahasiswa',
    targetLabel: 'Buka Data Mahasiswa',
    rolesAllowed: ['superadmin', 'admin'],
    steps: [
      'Di toolbar Data Mahasiswa, grup "Buku Induk" → "Unduh Rekap (CSV)". Pilih Prodi, Angkatan, dan Status (kosongkan = semua).',
      'File berisi NIM, biodata, prodi, angkatan, jalur masuk, dosen wali, status, dan IPK — siap dibuka di Excel.',
      'Menu titik tiga → "Ubah Status Akademik" untuk memilih status mahasiswa sesuai kode PDDIKTI pada opsi yang tersedia.',
      'Kelulusan dan alasan perubahan tetap dicatat pada alur akademik terkait; kode status mahasiswa mengikuti kamus PDDIKTI.',
      'Riwayat perubahan status tersimpan di log status akademik.',
    ],
    warnings: [
      'Status non-aktif wajib disertai alasan.',
    ],
  },
  {
    id: 'absensi-dosen',
    title: 'Cara Mengisi Absensi Perkuliahan (Dosen)',
    category: 'perkuliahan',
    categoryLabel: 'Jadwal Perkuliahan',
    summary:
      'Membuat pertemuan 1–16 dan menyimpan status kehadiran mahasiswa per pertemuan.',
    targetUrl: '/siakad/perkuliahan/kelas',
    targetLabel: 'Buka Jadwal Mengajar',
    rolesAllowed: ['dosen'],
    steps: [
      'Buka jadwal mengajar, pilih menu titik tiga pada kelas → "Input Absensi Mahasiswa".',
      'Klik "Tambah", isi Pertemuan Ke, Tanggal, dan Materi Pembahasan, lalu Simpan.',
      'Pilih pertemuan, tandai status tiap mahasiswa (Hadir / Sakit / Izin / Alfa) dan isi catatan bila perlu.',
      'Klik simpan presensi. Ulangi untuk setiap pertemuan hingga 16 kali.',
    ],
  },
  {
    id: 'sinkron-feeder',
    title: 'Sinkronisasi Data ke Neo Feeder PDDIKTI',
    category: 'obe',
    categoryLabel: 'OBE & Feeder',
    summary:
      'Mengirim data dosen, mahasiswa, kelas, nilai, dan aktivitas ke Neo Feeder. Menu khusus feeder digabung ke panduan ini.',
    targetUrl: '/siakad/feeder-sync',
    targetLabel: 'Buka Sinkronisasi Feeder',
    rolesAllowed: ['superadmin', 'admin'],
    steps: [
      'Buka halaman "Sinkronisasi Feeder" lewat tombol di panduan ini (/siakad/feeder-sync).',
      'Periksa konfigurasi & token Neo Feeder terlebih dahulu.',
      'Jalankan trigger sinkronisasi per entitas, lalu pantau log dan mapping ID Feeder.',
      'Pastikan KHS terkunci dan RPS disetujui sebelum sinkron nilai/kelas.',
    ],
    warnings: [
      'Butuh permission siakad.feeder.manage.',
    ],
  },
  {
    id: 'akun-pengujian',
    title: 'Daftar Peran Penguji & Akses Modul SIAKAD',
    category: 'akun',
    categoryLabel: 'Akun & Hak Akses',
    summary:
      'Kredensial tidak disimpan di aplikasi. Akun penguji disediakan seeder database sesuai role; kelola lewat modul IAM.',
    rolesAllowed: ['superadmin', 'admin'],
    steps: [
      'Administrator BAAK: akun dengan role superadmin/admin (buat via seeder IAM).',
      'Dosen: akun dengan role dosen — mengakses jadwal mengajar, input nilai, dan absensi.',
      'Mahasiswa: akun dengan role mahasiswa — mengakses KRS, KHS, dan transkrip.',
      'Ganti password dan atur ulang hak akses lewat modul IAM (Master Role & Plotting).',
    ],
    tips: [
      'Gunakan mode Penyamaran (Incognito) atau browser berbeda saat menguji perpindahan peran.',
    ],
  },
];

const CATEGORIES = [
  { id: 'all', label: 'Semua Panduan', icon: BookOpen },
  { id: 'master', label: 'Master & Konfigurasi', icon: Building2 },
  { id: 'perkuliahan', label: 'Jadwal Perkuliahan', icon: CalendarCheck },
  { id: 'krs', label: 'KRS & Studi', icon: ClipboardCheck },
  { id: 'nilai', label: 'Nilai & Kelulusan', icon: Award },
  { id: 'obe', label: 'OBE & Feeder', icon: Sparkles },
  { id: 'akun', label: 'Akun & Hak Akses', icon: KeyRound },
];

export default function PanduanSiakadPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>('buka-periode-aktif');
  const { user } = useAuthStore();

  const roleSlugs = useMemo(
    () =>
      (user?.roles || []).map((r: any) =>
        String(typeof r === 'string' ? r : r.slug || r.name || '').toLowerCase()
      ),
    [user]
  );
  const FULL_ACCESS_ROLES = ['superadmin', 'admin', 'super-admin'];
  const hasFullAccess = roleSlugs.some((s) => FULL_ACCESS_ROLES.includes(s));

  const visibleGuides = useMemo(
    () =>
      hasFullAccess
        ? GUIDES
        : GUIDES.filter((g) =>
            g.rolesAllowed.map((r) => r.toLowerCase()).some((r) => roleSlugs.includes(r))
          ),
    [hasFullAccess, roleSlugs]
  );

  const visibleCategories = useMemo(
    () => CATEGORIES.filter((c) => c.id === 'all' || visibleGuides.some((g) => g.category === c.id)),
    [visibleGuides]
  );

  const filteredGuides = useMemo(() => {
    return visibleGuides.filter((guide) => {
      if (selectedCategory !== 'all' && guide.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = guide.title.toLowerCase().includes(q);
        const inSummary = guide.summary.toLowerCase().includes(q);
        const inSteps = guide.steps.some((s) => s.toLowerCase().includes(q));
        const inFaqs = guide.faqs?.some(
          (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
        );
        return inTitle || inSummary || inSteps || inFaqs;
      }
      return true;
    });
  }, [searchQuery, selectedCategory, visibleGuides]);

  const effectiveExpandedId = filteredGuides.some((g) => g.id === expandedId)
    ? expandedId
    : filteredGuides[0]?.id ?? null;

  return (
    <div className="w-full space-y-6 animate-fade-in pb-6">
      <PageHeader
        title="Pusat Panduan & Alur Sistem SIAKAD"
        description="Dokumentasi interaktif master akademik, buka kelas, KRS, penilaian OBE, dan absensi perkuliahan."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Panduan' },
        ]}
      />

      {/* Hero Search Box */}
      <div
        className="rounded-2xl p-6 md:p-8 text-white shadow-xl"
        style={{ background: 'linear-gradient(to right, var(--module-primary), #0f172a)' }}
      >
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-sm mb-3">
            <Sparkles size={14} className="text-yellow-300" /> Knowledge Base & Alur SIAKAD
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2 text-white">
            Butuh bantuan alur akademik?
          </h2>
          <p className="text-slate-200 text-sm mb-5 leading-relaxed">
            Ketik kata kunci pertanyaan Anda, seperti: <em className="text-white font-semibold">&ldquo;cara buka kelas&rdquo;</em>, <em className="text-white font-semibold">&ldquo;isi KRS&rdquo;</em>, <em className="text-white font-semibold">&ldquo;input nilai&rdquo;</em>, atau <em className="text-white font-semibold">&ldquo;mode penilaian&rdquo;</em>.
          </p>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari alur kerja, panduan, atau FAQ akademik..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-white/50 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 px-2 py-1 rounded-md font-semibold"
              >
                Hapus
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {visibleCategories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
              style={isActive ? { background: 'var(--module-primary)' } : undefined}
            >
              <Icon size={14} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Menampilkan <strong>{filteredGuides.length}</strong> topik panduan
          {selectedCategory !== 'all' ? ` pada kategori ${CATEGORIES.find((c) => c.id === selectedCategory)?.label}` : ''}
          {searchQuery ? ` untuk pencarian "${searchQuery}"` : ''}
        </span>
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="hover:underline font-semibold"
            style={{ color: 'var(--module-primary)' }}
          >
            Reset Pencarian
          </button>
        )}
      </div>

      {/* Guide Cards Accordion */}
      {filteredGuides.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <HelpCircle className="mx-auto text-slate-300 mb-3" size={48} />
          <h3 className="font-bold text-slate-800 text-base mb-1">Topik Panduan Tidak Ditemukan</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-4">
            Tidak ada panduan yang cocok dengan kata kunci &ldquo;{searchQuery}&rdquo;. Coba gunakan kata kunci umum seperti kelas, KRS, nilai, atau prodi.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 text-white rounded-lg text-xs font-bold"
            style={{ background: 'var(--module-primary)' }}
          >
            Tampilkan Semua Panduan
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGuides.map((guide) => {
            const isExpanded = effectiveExpandedId === guide.id;

            return (
              <div
                key={guide.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded ? 'shadow-md' : 'border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
                style={isExpanded ? { borderColor: 'var(--module-primary)' } : undefined}
              >
                {/* Header / Click to Expand */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : guide.id)}
                  className="p-5 flex items-start justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="blue" className="text-2xs font-bold uppercase tracking-wider">
                        {guide.categoryLabel}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {hasFullAccess &&
                          guide.rolesAllowed.map((r) => (
                            <span
                              key={r}
                              className="font-mono text-2xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold"
                            >
                              @{r}
                            </span>
                          ))}
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{guide.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{guide.summary}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {guide.targetUrl && (
                      <Link
                        href={guide.targetUrl}
                        onClick={(e) => e.stopPropagation()}
                        className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        style={{ color: 'var(--module-primary)', background: 'var(--module-primary-subtle)' }}
                      >
                        Buka Halaman <ExternalLink size={12} />
                      </Link>
                    )}
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-transform duration-200"
                      style={isExpanded ? { transform: 'rotate(90deg)', color: 'var(--module-primary)' } : undefined}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="px-5 pb-6 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-5 text-sm">
                    {/* Steps */}
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        Langkah-Langkah Pelaksanaan
                      </h4>
                      <ol className="space-y-2">
                        {guide.steps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-xs text-slate-700 leading-relaxed">
                            <span
                              className="w-5 h-5 rounded-full font-bold text-2xs flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ background: 'var(--module-primary-subtle)', color: 'var(--module-primary)' }}
                            >
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Tips & Warnings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {guide.tips && guide.tips.length > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3.5 space-y-1">
                          <span className="text-emerald-800 font-bold text-xs flex items-center gap-1.5">
                            <Sparkles size={14} /> Tips & Catatan Penting
                          </span>
                          <ul className="list-disc list-inside text-xs text-emerald-900 space-y-1">
                            {guide.tips.map((t, i) => (
                              <li key={i}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {guide.warnings && guide.warnings.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 space-y-1">
                          <span className="text-amber-800 font-bold text-xs flex items-center gap-1.5">
                            <Sliders size={14} /> Perhatian Khusus
                          </span>
                          <ul className="list-disc list-inside text-xs text-amber-900 space-y-1">
                            {guide.warnings.map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* FAQs */}
                    {guide.faqs && guide.faqs.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-200/60">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <HelpCircle size={14} style={{ color: 'var(--module-primary)' }} />
                          Pertanyaan yang Sering Diajukan (FAQ)
                        </h4>
                        <div className="space-y-2">
                          {guide.faqs.map((faq, i) => (
                            <div key={i} className="bg-white p-3 rounded-xl border border-slate-200/80">
                              <p className="font-bold text-slate-900 text-xs mb-1 flex items-center gap-1.5">
                                <span className="font-black" style={{ color: 'var(--module-primary)' }}>Q:</span> {faq.q}
                              </p>
                              <p className="text-slate-600 text-xs leading-relaxed pl-4">
                                <span className="text-emerald-600 font-bold">A:</span> {faq.a}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Link Button in footer */}
                    {guide.targetUrl && (
                      <div className="pt-2 flex justify-end">
                        <Link
                          href={guide.targetUrl}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-xs shadow-sm transition-all"
                          style={{ background: 'var(--module-primary)' }}
                        >
                          {guide.targetLabel || 'Buka Halaman Terkait'} <ArrowRight size={14} />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Role footer note */}
      <p className="text-center text-2xs text-slate-400">
        Menampilkan panduan untuk peran: <Users size={11} className="inline" /> {roleSlugs.join(', ') || 'tamu'}
      </p>
    </div>
  );
}
