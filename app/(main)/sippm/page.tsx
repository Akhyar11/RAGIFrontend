'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  ClipboardCheck,
  FileCheck,
  CreditCard,
  BookOpen,
  Award,
  Plus,
  ArrowRight,
  TrendingUp,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { SippmHero } from '@/components/sippm/SippmHero';
import { sippmService } from '@/services/sippm.service';

export default function SippmDashboardPage() {
  const [upmMetrics, setUpmMetrics] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoadingMetrics(true);
        const res = await sippmService.getUpmMetrics();
        if (res.data) setUpmMetrics(res.data);
      } catch (err) {
        console.error('Failed to load UPM metrics', err);
      } finally {
        setLoadingMetrics(false);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner (Ringkasan Ketercapaian IKU 5) */}
      <SippmHero
        capaianIku={upmMetrics?.capaian_iku || 118}
        totalPublikasi={upmMetrics?.total_publikasi_verified || 18}
        totalDanaDisetujui={upmMetrics?.total_dana_approved || 350000000}
      />

      {/* Active SIPPM Hibah Announcement Banner */}
      <div className="bg-sippm-hero p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 bg-amber-400/20 text-amber-300 text-xs font-extrabold rounded-full border border-amber-400/30">
                PERIODE HIBAH INSTITUSI AKTIF
              </span>
              <span className="text-xs text-teal-200">T.A. 2026 • Politeknik Indonusa Surakarta</span>
            </div>
            <h3 className="text-lg font-extrabold mt-1" style={{ color: '#ffffff' }}>
              Penerimaan Proposal PPM Hibah Institusi Tahun 2026 Telah Dibuka!
            </h3>
            <p className="text-xs text-slate-300">
              Pengusulan proposal Penelitian & Pengabdian kepada Masyarakat (PPM) Hibah Institusi telah resmi dibuka. Dosen ber-NIDN maupun Dosen Tetap Yayasan dapat mengajukan proposal secara daring.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/sippm/pengumuman"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition backdrop-blur-md flex items-center gap-1.5"
            >
              <FileText size={14} /> Surat Pengumuman Hibah
            </Link>
            <Link
              href="/sippm/proposal/create"
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-emerald-500/25 transition flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} /> Buat & Pengajuan Proposal Sekarang →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Menu Grid / Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Proposal Usulan */}
        <Link href="/sippm/proposal" className="card p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary-600 group bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText size={24} />
            </div>
            <ArrowRight size={20} className="text-slate-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-black text-slate-900 group-hover:text-primary-700 transition-colors">Proposal Usulan Hibah</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">Pengajuan proposal riset & PkM, anggota tim, serta persetujuan LPPM.</p>
        </Link>

        {/* Card 2: Portal Reviewer */}
        <Link href="/sippm/reviewer" className="card p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-600 group bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ClipboardCheck size={24} />
            </div>
            <ArrowRight size={20} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-700 transition-colors">Portal Reviewer</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">Plotting Dual Reviewer LPPM & desk evaluation scoring rubrik.</p>
        </Link>

        {/* Card 3: Kontrak SPK */}
        <Link href="/sippm/kontrak" className="card p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-amber-600 group bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileCheck size={24} />
            </div>
            <ArrowRight size={20} className="text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-black text-slate-900 group-hover:text-amber-700 transition-colors">Kontrak Hibah SPK</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">Penerbitan surat perjanjian kerja legal dan alokasi nominal disetujui.</p>
        </Link>

        {/* Card 4: Pencairan Dana & LPJ */}
        <Link href="/sippm/pencairan" className="card p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-emerald-600 group bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CreditCard size={24} />
            </div>
            <ArrowRight size={20} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors">Pencairan Dana & LPJ</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">Disbursement Termin 1 (70%) & Termin 2 (30%) beserta LPJ keuangan.</p>
        </Link>

        {/* Card 5: Portofolio Publikasi & HKI */}
        <Link href="/sippm/luaran/publikasi" className="card p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-600 group bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen size={24} />
            </div>
            <ArrowRight size={20} className="text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-black text-slate-900 group-hover:text-purple-700 transition-colors">Publikasi & HKI Kampus</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">Registry luaran jurnal Scopus/SINTA serta sertifikat HKI/Paten.</p>
        </Link>

        {/* Card 6: Standar IKU 5 per Prodi */}
        <Link href="/sippm/iku5-standards" className="card p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-fuchsia-600 group bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 text-fuchsia-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sliders size={24} />
            </div>
            <ArrowRight size={20} className="text-slate-400 group-hover:text-fuchsia-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-black text-slate-900 group-hover:text-fuchsia-700 transition-colors">Standar IKU 5 per Prodi</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">Konfigurasi target luaran Scopus, Sinta, Hibah & HKI per Program Studi.</p>
        </Link>
      </div>
    </div>
  );
}
