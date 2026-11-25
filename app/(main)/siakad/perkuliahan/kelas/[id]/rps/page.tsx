'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, FileText, BookOpen, AlertCircle, Copy, Eye, Send, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { siakadService } from '@/services/siakad.service';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

const defaultBobot = (mingguKe: number) => (mingguKe === 8 ? 25 : mingguKe === 16 ? 30 : 3);

export default function KelasRpsPage() {
  const params = useParams();
  const router = useRouter();
  const kelasId = Number(params.id);
  const { user, hasRole, isMahasiswa } = useAuth();
  // Mahasiswa hanya boleh MELIHAT RPS, tidak mengedit
  const readOnly = isMahasiswa;

  const [kelas, setKelas] = useState<any | null>(null);
  const [rpsDetail, setRpsDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Verifikator RPS: 
  // 1. Kaprodi: dicek dari id kaprodi pada RPS
  // 2. Admin/Superadmin/Wakil Prodi (Global)
  // 3. Admin OBE: dicek dari relasi tabel siakad_admin_prodis
  const isKaprodiAssigned = rpsDetail?.kaprodi?.id === user?.id;
  const isGlobalVerifier = hasRole(['superadmin', 'admin', 'admin_siakad', 'wakil_prodi']);
  const isAdminObe = ((user as any)?.siakad_admin_prodis || (user as any)?.siakadAdminProdis || []).some(
    (ap: any) => ap.program_studi_id === rpsDetail?.mata_kuliah?.kurikulum?.program_studi_id || ap.program_studi_id === kelas?.program_studi_id
  );
  
  const isRpsVerifier = isGlobalVerifier || isKaprodiAssigned || isAdminObe;
  const [form, setForm] = useState({
    deskripsi_singkat: '',
    pustaka_utama: '',
    pustaka_pendukung: '',
    mingguan: [] as any[],
  });

  const rpsStatus = String(rpsDetail?.status || 'draft');
  // RPS yang sudah disetujui terkunci untuk semua peran
  const formLocked = readOnly || rpsStatus === 'disetujui';

  // Langkah alur: 0 Susun → 1 Diajukan → 2 Verifikasi → 3 Disetujui
  const workflowStep = rpsStatus === 'disetujui' ? 3 : rpsStatus === 'diajukan' ? 1 : 0;
  const workflowLabels = ['Susun RPS', 'Diajukan', 'Verifikasi', 'Disetujui'];

  // Modal catatan revisi Kaprodi
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [savingVerif, setSavingVerif] = useState(false);

  const refreshRpsDetail = async () => {
    if (!rpsDetail?.id) return;
    try {
      const dRes = await siakadService.showRps(rpsDetail.id);
      if (dRes.data) {
        setRpsDetail(dRes.data);
        setForm({
          deskripsi_singkat: dRes.data.deskripsi_singkat || '',
          pustaka_utama: dRes.data.pustaka_utama || '',
          pustaka_pendukung: dRes.data.pustaka_pendukung || '',
          mingguan: dRes.data.mingguan || [],
        });
      }
    } catch {}
  };

  const handleSubmitRps = async () => {
    if (!rpsDetail?.id) return;
    try {
      setSavingVerif(true);
      await siakadService.submitRps(rpsDetail.id);
      toast.success('RPS berhasil diajukan ke Kaprodi untuk verifikasi');
      refreshRpsDetail();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Gagal mengajukan RPS');
    } finally {
      setSavingVerif(false);
    }
  };

  const handleApproveRps = async (status: 'disetujui' | 'revisi') => {
    if (!rpsDetail?.id) return;
    if (status === 'revisi' && !revisionNotes.trim()) {
      toast.error('Isi catatan revisi untuk dosen terlebih dahulu');
      return;
    }
    try {
      setSavingVerif(true);
      await siakadService.approveRps(rpsDetail.id, {
        status,
        catatan_revisi: status === 'revisi' ? revisionNotes.trim() : undefined,
      });
      toast.success(status === 'disetujui' ? 'RPS disetujui dan dikunci' : 'Catatan revisi dikirim ke dosen');
      setIsRevisionModalOpen(false);
      setRevisionNotes('');
      refreshRpsDetail();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Gagal memverifikasi RPS');
    } finally {
      setSavingVerif(false);
    }
  };

  // Impor dari RPS MK sama periode lain
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [rpsSources, setRpsSources] = useState<any[]>([]);
  const [sourceRpsId, setSourceRpsId] = useState('');
  const [importing, setImporting] = useState(false);

  const fetchSoal = async (rpsId: number) => {
    try {
      const res = await siakadService.getSoalList({ rps_id: rpsId });
      if (res.data) setSoalList(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSoalList([]);
    }
  };

  useEffect(() => {
    if (!kelasId) return;
    const init = async () => {
      try {
        setLoading(true);
        const kRes = await siakadService.getKelasDetail(kelasId);
        const k = kRes.data;
        if (!k) {
          toast.error('Data kelas tidak ditemukan');
          return;
        }
        setKelas(k);
        const rRes = await siakadService.getRps({
          program_studi_id: k.program_studi_id || k.mata_kuliah?.kurikulum?.program_studi_id,
        });
        const match = (rRes.data || []).find((r: any) => r.mata_kuliah_id === k.mata_kuliah_id) || (rRes.data || [])[0];
        if (match) {
          const dRes = await siakadService.showRps(match.id);
          if (dRes.data) {
            setRpsDetail(dRes.data);
            setForm({
              deskripsi_singkat: dRes.data.deskripsi_singkat || '',
              pustaka_utama: dRes.data.pustaka_utama || '',
              pustaka_pendukung: dRes.data.pustaka_pendukung || '',
              mingguan: dRes.data.mingguan || [],
            });
            fetchSoal(dRes.data.id);
          }
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Gagal memuat dokumen RPS');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [kelasId]);

  // Bank soal per minggu/SubCPMK
  const [soalList, setSoalList] = useState<any[]>([]);
  const [openSoalMinggu, setOpenSoalMinggu] = useState<number | null>(null);
  const [soalForm, setSoalForm] = useState({ sub_cpmk_id: '', pertanyaan: '', bobot: 10, kunci_jawaban: '' });
  const [savingSoal, setSavingSoal] = useState(false);


  const handleSaveSoal = async (e: React.FormEvent, mingguKe: number, mingguanId?: number) => {
    e.preventDefault();
    if (!rpsDetail?.id || !soalForm.pertanyaan.trim()) return;
    try {
      setSavingSoal(true);
      await siakadService.saveSoal({
        rps_id: rpsDetail.id,
        rps_mingguan_id: mingguanId || undefined,
        sub_cpmk_id: soalForm.sub_cpmk_id ? Number(soalForm.sub_cpmk_id) : undefined,
        pertanyaan: soalForm.pertanyaan,
        bobot: Number(soalForm.bobot) || 0,
        kunci_jawaban: soalForm.kunci_jawaban || undefined,
      });
      toast.success('Soal tersimpan di bank soal minggu ' + mingguKe);
      setSoalForm({ sub_cpmk_id: '', pertanyaan: '', bobot: 10, kunci_jawaban: '' });
      fetchSoal(rpsDetail.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan soal');
    } finally {
      setSavingSoal(false);
    }
  };

  const handleDeleteSoal = async (id: number) => {
    try {
      await siakadService.deleteSoal(id);
      toast.success('Soal dihapus');
      if (rpsDetail?.id) fetchSoal(rpsDetail.id);
    } catch {
      toast.error('Gagal menghapus soal');
    }
  };
  const updateMinggu = (mingguKe: number, field: string, value: any) => {
    setForm((prev) => {
      const updated = [...(prev.mingguan || [])];
      const idx = updated.findIndex((m: any) => m.minggu_ke === mingguKe);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], [field]: value };
      } else {
        updated.push({ minggu_ke: mingguKe, [field]: value });
      }
      return { ...prev, mingguan: updated };
    });
  };

  const totalBobot = useMemo(() => {
    let total = 0;
    for (let m = 1; m <= 16; m++) {
      const ex = form.mingguan?.find((x: any) => x.minggu_ke === m);
      total += Number(ex?.bobot_penilaian ?? defaultBobot(m));
    }
    return total;
  }, [form.mingguan]);
  const isBobot100 = Math.abs(totalBobot - 100) < 0.01;

  const tahunAjaran = kelas?.tahun_akademik?.nama
    || (kelas?.tahun_akademik
      ? `${kelas.tahun_akademik.tahun_mulai}/${kelas.tahun_akademik.tahun_selesai || ''}`
      : '');

  const handleOpenImport = async () => {
    if (!kelas) return;
    try {
      const res = await siakadService.getRps({ mata_kuliah_id: kelas.mata_kuliah_id });
      const others = (res.data || []).filter((r: any) => r.id !== rpsDetail?.id);
      setRpsSources(others);
      setSourceRpsId(others[0]?.id ? String(others[0].id) : '');
      setIsImportOpen(true);
    } catch {
      toast.error('Gagal memuat daftar RPS periode lain');
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceRpsId) return;
    try {
      setImporting(true);
      const res = await siakadService.duplicateRps(Number(sourceRpsId), {
        tahun_ajaran: tahunAjaran,
        semester: kelas?.mata_kuliah?.semester_anjuran || kelas?.mata_kuliah?.semester_default || 1,
      });
      toast.success(res.message || 'RPS berhasil diimpor sebagai draft');
      setIsImportOpen(false);
      if (res.data) {
        setRpsDetail(res.data);
        setForm({
          deskripsi_singkat: res.data.deskripsi_singkat || '',
          pustaka_utama: res.data.pustaka_utama || '',
          pustaka_pendukung: res.data.pustaka_pendukung || '',
          mingguan: res.data.mingguan || [],
        });
        fetchSoal(res.data.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengimpor RPS');
    } finally {
      setImporting(false);
    }
  };

  const handleBack = () => {
    // Kembali ke asal (Jadwal atau workspace OBE); fallback ke Jadwal bila dibuka langsung
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/siakad/perkuliahan/kelas');
    }
  };

  const handleSave = async () => {
    if (formLocked) return;    if (!kelas) return;
    try {
      setSaving(true);
      await siakadService.storeRps({
        id: rpsDetail?.id,
        mata_kuliah_id: kelas.mata_kuliah_id,
        tahun_ajaran: tahunAjaran,
        semester: kelas.mata_kuliah?.semester_anjuran || kelas.mata_kuliah?.semester_default || 1,
        ...form,
      });
      toast.success('Dokumen RPS dan 16 rencana pertemuan berhasil disimpan!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan RPS');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-slate-400">
        <span className="text-xs font-bold animate-pulse">Memuat dokumen RPS...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title={`RPS: ${kelas?.mata_kuliah?.nama || ''}`}
        description={`${kelas?.mata_kuliah?.kode_mk || ''} • ${kelas?.mata_kuliah?.total_sks || 0} SKS • Kelas ${kelas?.nama_kelas || ''} • Periode ${kelas?.tahun_akademik?.nama || tahunAjaran}`}
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Jadwal Kelas', href: '/siakad/perkuliahan/kelas' },
          { label: 'RPS 16 Minggu' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<ArrowLeft size={16} />}
              onClick={handleBack}
              title="Kembali ke halaman sebelumnya"
              style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
            >
              Kembali
            </Button>
            {readOnly ? (
              <Badge variant="blue" className="inline-flex items-center gap-1.5 px-3 py-2">
                <Eye size={16} /> Mode Lihat Saja
              </Badge>
            ) : rpsStatus === 'disetujui' ? (
              <Badge variant="green" className="inline-flex items-center gap-1.5 px-3 py-2">
                <Check size={16} /> Terkunci — Disetujui Kaprodi
              </Badge>
            ) : (
              <>
                <Button variant="outline" icon={<Copy size={16} />} onClick={handleOpenImport} className="font-bold text-xs">
                  Impor Periode Lain
                </Button>
                <Button variant="primary" icon={<Save size={16} />} onClick={handleSave} loading={saving} disabled={saving || !isBobot100}>
                  {saving ? 'Menyimpan...' : 'Simpan RPS'}
                </Button>
                {!isRpsVerifier && rpsDetail?.id && (rpsStatus === 'draft' || rpsStatus === 'revisi') && (
                  <Button variant="primary" icon={<Send size={16} />} onClick={handleSubmitRps} loading={savingVerif} disabled={savingVerif || !isBobot100} className="font-bold text-xs">
                    {savingVerif ? 'Mengajukan...' : 'Ajukan ke Kaprodi'}
                  </Button>
                )}
                {isRpsVerifier && rpsStatus === 'diajukan' && (
                  <>
                    <Button variant="primary" icon={<Check size={16} />} onClick={() => handleApproveRps('disetujui')} loading={savingVerif} disabled={savingVerif} className="font-bold text-xs">
                      Setujui RPS
                    </Button>
                    <Button variant="outline" icon={<X size={16} className="text-rose-600" />} onClick={() => setIsRevisionModalOpen(true)} className="font-bold text-xs border-rose-200 text-rose-700 hover:bg-rose-50">
                      Minta Revisi
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        }
      />

      {/* Stepper alur RPS satu halaman: Susun → Diajukan → Verifikasi → Disetujui */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs flex items-center gap-1 overflow-x-auto">
        {workflowLabels.map((label, idx) => {
          const done = idx < workflowStep || rpsStatus === 'disetujui';
          const current = idx === workflowStep && rpsStatus !== 'disetujui';
          return (
            <div key={label} className="flex items-center gap-1 flex-1 min-w-[110px]">
              <span
                className="w-6 h-6 rounded-full font-bold text-2xs flex items-center justify-center flex-shrink-0"
                style={
                  done
                    ? { background: 'var(--module-primary)', color: '#fff' }
                    : current
                    ? { background: 'var(--module-primary-subtle)', color: 'var(--module-primary)' }
                    : undefined
                }
              >
                {done ? <Check size={16} /> : idx + 1}
              </span>
              <span className={`text-2xs font-bold whitespace-nowrap ${done || current ? 'text-slate-900' : 'text-slate-400'}`}>
                {label}
              </span>
              {idx < workflowLabels.length - 1 && <span className="flex-1 h-px bg-slate-200 mx-1" />}
            </div>
          );
        })}
      </div>

      {rpsStatus === 'revisi' && rpsDetail?.catatan_revisi && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-950">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <p><strong>Catatan Revisi Kaprodi:</strong> {rpsDetail.catatan_revisi}</p>
        </div>
      )}

      {/* Bilah total bobot mengambang: selalu terlihat saat mengisi 16 minggu */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border border-slate-200 rounded-xl p-3 md:p-4 shadow-xs flex items-center gap-2 flex-wrap">
        <span className="badge badge-purple text-2xs font-extrabold uppercase">RPS Standar OBE (SN-DIKTI)</span>
        <Badge variant={rpsDetail?.status === 'disetujui' ? 'green' : rpsDetail?.status === 'diajukan' ? 'amber' : 'gray'}>
          Status: {String(rpsDetail?.status || 'draft').toUpperCase()}
        </Badge>
        <div className="flex-1" />
        <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block" title={`Total bobot ${totalBobot}%`}>
          <div
            className={`h-full rounded-full transition-all ${isBobot100 ? 'bg-emerald-500' : totalBobot > 100 ? 'bg-rose-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.max(0, Math.min(100, totalBobot))}%` }}
          />
        </div>
        <Badge variant={isBobot100 ? 'green' : totalBobot > 100 ? 'red' : 'amber'} className="font-mono font-bold">
          Total Bobot: {totalBobot}%
        </Badge>
        {!isBobot100 && (
          <span className={`text-2xs font-bold ${totalBobot > 100 ? 'text-rose-700' : 'text-amber-700'}`}>
            {totalBobot > 100
              ? `Kelebihan ${Math.round((totalBobot - 100) * 100) / 100}% — kurangi bobot minggu`
              : `Kurang ${Math.round((100 - totalBobot) * 100) / 100}% lagi menuju 100%`}
          </span>
        )}
      </div>

      {!isBobot100 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <p><strong>Total bobot harus 100%</strong> (saat ini {totalBobot}%). Sesuaikan kolom Bobot % per minggu sebelum menyimpan.</p>
        </div>
      )}

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
        <span className="text-2xs font-bold text-slate-500 uppercase block">Tim Pengembang Kurikulum</span>
        <p className="text-slate-800">
          Dosen Pengembang: <strong>{rpsDetail?.dosen_pengembang?.nama_lengkap || kelas?.dosen_pengampu?.[0]?.dosen?.nama_lengkap || 'Dosen Pengampu'}</strong> • Kaprodi: <strong>{rpsDetail?.kaprodi?.nama_lengkap || '-'}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4 space-y-2">
          <span className="font-extrabold text-slate-900 text-xs block">Deskripsi Singkat Mata Kuliah</span>
          <textarea
            rows={4}
            placeholder="Tuliskan deskripsi ringkas mengenai mata kuliah ini..."
            value={form.deskripsi_singkat}
            disabled={formLocked}
            onChange={(e) => setForm({ ...form, deskripsi_singkat: e.target.value })}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-primary-500 font-medium"
          />
        </div>
        <div className="card p-4 space-y-2">
          <span className="font-extrabold text-slate-900 text-xs block flex items-center gap-1.5"><BookOpen size={14} className="text-primary-600" /> CPMK Mata Kuliah (read-only dari Master OBE)</span>
          <ul className="space-y-1.5 list-disc pl-4 text-slate-700 text-xs">
            {rpsDetail?.mata_kuliah?.cpmks?.length ? (
              rpsDetail.mata_kuliah.cpmks.map((c: any) => (
                <li key={c.id}><strong>{c.kode_cpmk} ({c.bobot_persentase}%):</strong> {c.deskripsi}</li>
              ))
            ) : (
              <li className="text-slate-400 list-none">Belum ada CPMK — petakan dulu di menu OBE/CPMK.</li>
            )}
          </ul>
        </div>
        <div className="card p-4 space-y-2">
          <span className="font-extrabold text-slate-900 text-xs block">Pustaka Utama</span>
          <textarea
            rows={3}
            value={form.pustaka_utama}
            disabled={formLocked}
            onChange={(e) => setForm({ ...form, pustaka_utama: e.target.value })}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-primary-500 font-medium"
          />
        </div>
        <div className="card p-4 space-y-2">
          <span className="font-extrabold text-slate-900 text-xs block">Pustaka Pendukung</span>
          <textarea
            rows={3}
            value={form.pustaka_pendukung}
            disabled={formLocked}
            onChange={(e) => setForm({ ...form, pustaka_pendukung: e.target.value })}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-primary-500 font-medium"
          />
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5"><FileText size={14} className="text-primary-600" /> Rencana 16 Pertemuan</span>
          <span className="text-2xs text-slate-500">Pekan 8 (UTS) & 16 (UAS/Proyek)</span>
        </div>
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
          {Array.from({ length: 16 }, (_, i) => i + 1).map((mingguKe) => {
            const existing = form.mingguan?.find((m: any) => m.minggu_ke === mingguKe) || {};
            const isMidOrFinal = mingguKe === 8 || mingguKe === 16;
            const soalMinggu = soalList.filter((s: any) => s.mingguan?.minggu_ke === mingguKe);
            const subOptions: { value: number; label: string }[] = [];
            (rpsDetail?.mata_kuliah?.cpmks || []).forEach((c: any) => {
              (c.subCpmks || c.sub_cpmks || []).forEach((sc: any) => {
                subOptions.push({ value: sc.id, label: `${c.kode_cpmk} / ${sc.kode_sub_cpmk || sc.kode || 'Sub'} — ${(sc.deskripsi || '').substring(0, 40)}` });
              });
            });
            return (
              <div key={mingguKe}>
              <div className={`p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center ${isMidOrFinal ? 'bg-primary-50/50' : ''}`}>
                <div className="md:col-span-1 text-center font-mono font-black text-xs text-primary-700">Mg {mingguKe}</div>
                <div className="md:col-span-4">
                  <Input label="Sub-CPMK" placeholder={`Sub-CPMK Minggu ${mingguKe}`} value={existing.kemampuan_akhir || ''} disabled={formLocked}
                  onChange={(e) => updateMinggu(mingguKe, 'kemampuan_akhir', e.target.value)} />
                </div>
                <div className="md:col-span-4">
                  <Input label="Bahan Kajian / Topik" placeholder={mingguKe === 8 ? 'Ujian Tengah Semester (UTS)' : mingguKe === 16 ? 'Evaluasi Akhir (UAS/Proyek)' : `Materi pekan ${mingguKe}`} value={existing.bahan_kajian || ''} disabled={formLocked}
                  onChange={(e) => updateMinggu(mingguKe, 'bahan_kajian', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Input label="Metode" placeholder="Kuliah & PBL" value={existing.bentuk_metode || ''} disabled={formLocked}
                  onChange={(e) => updateMinggu(mingguKe, 'bentuk_metode', e.target.value)} />
                </div>
                <div className="md:col-span-1">
                  <Input label="Bobot %" type="number" min={0} max={100} value={existing.bobot_penilaian ?? defaultBobot(mingguKe)} disabled={formLocked}
                  onChange={(e) => updateMinggu(mingguKe, 'bobot_penilaian', Number(e.target.value))} className="text-center font-mono font-bold" />
                </div>
                <div className="md:col-span-12 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-2xs p-2 h-auto font-bold"
                    onClick={() => setOpenSoalMinggu(openSoalMinggu === mingguKe ? null : mingguKe)}
                  >
                    Bank Soal ({soalMinggu.length}) {openSoalMinggu === mingguKe ? '▲' : '▼'}
                  </Button>
                </div>
              </div>
              {openSoalMinggu === mingguKe && (
                <div className="mx-4 mb-4 p-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl space-y-4">
                  {soalMinggu.length === 0 && <p className="text-2xs text-slate-400 italic">Belum ada soal minggu ini.</p>}
                  {soalMinggu.map((s: any) => (
                    <div key={s.id} className="flex items-start justify-between gap-4 text-xs bg-white border border-slate-200 rounded-lg p-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800">{s.pertanyaan}</p>
                        <p className="text-2xs text-slate-500">
                          {s.sub_cpmk_id ? `SubCPMK #${s.sub_cpmk_id} • ` : ''}Bobot {s.bobot}
                          {s.kunci_jawaban ? ` • Kunci: ${String(s.kunci_jawaban).substring(0, 60)}` : ''}
                        </p>
                      </div>
                      {!formLocked && (
                        <button type="button" onClick={() => handleDeleteSoal(s.id)} className="text-rose-600 text-2xs font-bold shrink-0 hover:underline">
                          Hapus
                        </button>
                      )}
                    </div>
                  ))}
                  {!formLocked && (
                    <form onSubmit={(e) => handleSaveSoal(e, mingguKe, existing.id)} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white border border-slate-200 rounded-xl p-4">
                      <div className="md:col-span-3">
                        <Select
                          label="SubCPMK (opsional)"
                          placeholder="Umum minggu ini"
                          options={subOptions}
                          value={soalForm.sub_cpmk_id || ''}
                          onChange={(v: any) => setSoalForm({ ...soalForm, sub_cpmk_id: String(v || '') })}
                          isClearable
                        />
                      </div>
                      <div className="md:col-span-5">
                        <Input label="Pertanyaan *" required placeholder="Tulis butir soal..." value={soalForm.pertanyaan} onChange={(e) => setSoalForm({ ...soalForm, pertanyaan: e.target.value })} />
                      </div>
                      <div className="md:col-span-2">
                        <Input label="Bobot" type="number" min={0} value={soalForm.bobot} onChange={(e) => setSoalForm({ ...soalForm, bobot: Number(e.target.value) })} className="text-center font-mono" />
                      </div>
                      <div className="md:col-span-2">
                        <Button type="submit" variant="primary" className="text-2xs font-bold w-full" disabled={savingSoal || !soalForm.pertanyaan.trim()}>
                          {savingSoal ? '...' : '+ Soal'}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          {formLocked ? (
            <p className="text-2xs text-slate-400 italic">
              {rpsStatus === 'disetujui'
                ? 'RPS disetujui Kaprodi dan dikunci. Hubungi Kaprodi untuk membuka revisi.'
                : 'Dokumen RPS ini hanya dapat dilihat. Perubahan dilakukan oleh dosen pengampu.'}
            </p>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={handleBack}>Batal</Button>
              <Button variant="primary" icon={<Save size={16} />} onClick={handleSave} loading={saving} disabled={saving || !isBobot100}>
                {saving ? 'Menyimpan...' : 'Simpan RPS & 16 Pertemuan'}
              </Button>
            </>
          )}
        </div>
      </div>

      <Modal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Impor RPS dari Periode Lain"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsImportOpen(false)}>Batal</Button>
            <Button variant="primary" onClick={handleImport} disabled={importing || !sourceRpsId} icon={<Copy size={16} />}>
              {importing ? 'Mengimpor...' : 'Impor sebagai Draft'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleImport} className="space-y-4">
          <p className="text-xs text-slate-600">
            Salin isi RPS <strong>{kelas?.mata_kuliah?.nama}</strong> dari periode lain ke periode <strong>{kelas?.tahun_akademik?.nama || tahunAjaran}</strong> sebagai draft — tinggal ubah yang berbeda saja.
          </p>
          {rpsSources.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Tidak ada RPS MK ini di periode lain.</p>
          ) : (
            <Select
              label="Sumber RPS"
              required
              options={rpsSources.map((r: any) => ({
                value: r.id,
                label: `${r.tahun_ajaran} • Smt ${r.semester} • ${r.status || 'draft'} (${(r.mingguan_count ?? '?')} pertemuan)`,
              }))}
              value={sourceRpsId || ''}
              onChange={(v: any) => setSourceRpsId(String(v || ''))}
            />
          )}
        </form>
      </Modal>

      {/* Modal catatan revisi Kaprodi */}
      <Modal
        open={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        title="Kembalikan RPS untuk Revisi"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRevisionModalOpen(false)}>Batal</Button>
            <Button variant="danger" onClick={() => handleApproveRps('revisi')} loading={savingVerif} disabled={savingVerif || !revisionNotes.trim()}>
              {savingVerif ? 'Mengirim...' : 'Kirim Revisi ke Dosen'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Tulis bagian yang harus diperbaiki dosen pengembang. Status RPS kembali ke revisi dan form terbuka lagi untuk dosen.
          </p>
          <div>
            <label className="label">Catatan Revisi *</label>
            <textarea
              rows={4}
              placeholder="cth. Bobot minggu 5–7 belum selaras dengan CPMK-2; lengkapi pustaka pendukung..."
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-primary-500 font-medium"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
