'use client';

import { formatRupiah, formatDate } from '@/lib/utils';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Upload, Plus, Trash2, Banknote, FileText, Wallet } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { pengajuanOperasionalService, type PengajuanOperasional } from '@/services/pengajuan-operasional.service';
import { sikeuService } from '@/services/sikeu.service';
import { simpegService } from '@/services/simpeg.service';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';

const TAHAP = [
  { key: 'pending_sarpras', label: 'Sarpras', role: 'sarpras' },
  { key: 'pending_keuangan', label: 'Keuangan', role: 'keuangan' },
  { key: 'pending_direktur', label: 'Direktur', role: 'direktur' },
  { key: 'disetujui', label: 'Disetujui' },
  { key: 'dicairkan', label: 'Dicairkan' },
  { key: 'lpj_pending', label: 'LPJ' },
  { key: 'selesai', label: 'Selesai' },
];

interface JurnalRef {
  id: number;
  nomor_jurnal: string;
  jenis_sumber: string;
  total_debet: number | string;
}

const STATUS_STYLE: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'secondary' }> = {  draft: { label: 'Draft', variant: 'secondary' },
  diajukan: { label: 'Diajukan', variant: 'info' },
  pending_sarpras: { label: 'Menunggu Sarpras', variant: 'warning' },
  pending_keuangan: { label: 'Menunggu Keuangan', variant: 'warning' },
  pending_direktur: { label: 'Menunggu Direktur', variant: 'warning' },
  disetujui: { label: 'Disetujui', variant: 'success' },
  ditolak: { label: 'Ditolak', variant: 'danger' },
  dicairkan: { label: 'Dicairkan', variant: 'success' },
  lpj_pending: { label: 'LPJ Diverifikasi', variant: 'warning' },
  selesai: { label: 'Selesai', variant: 'success' },
};

export default function DetailPengajuanPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [modal, setModal] = useState<{ aksi: 'approve' | 'reject'; konteks: 'tahap' | 'lpj'; lpjId?: number } | null>(null);
  const [catatan, setCatatan] = useState('');

  // Pencairan
  const [nominalCair, setNominalCair] = useState('');
  const [tglCair, setTglCair] = useState(new Date().toISOString().split('T')[0]);
  const [buktiCair, setBuktiCair] = useState<File | null>(null);
  const [referensiEksternal, setReferensiEksternal] = useState('');
  const [sumberKasList, setSumberKasList] = useState<any[]>([]);
  const [sumberKasId, setSumberKasId] = useState('');
  const [bankPenerima, setBankPenerima] = useState('');
  const [norekPenerima, setNorekPenerima] = useState('');
  const [namaRekPenerima, setNamaRekPenerima] = useState('');
  const [rekeningLoading, setRekeningLoading] = useState(false);

  const gunakanRekeningSaya = async () => {
    setRekeningLoading(true);
    try {
      const res = await simpegService.getMyPegawai();
      const p: any = res.data;
      const norek = p?.nomor_rekening || '';
      if (!norek) {
        toast.error('Nomor rekening SIMPEG Anda masih kosong. Lengkapi di data pegawai SIMPEG.');
        return;
      }
      setBankPenerima(p?.nama_bank || p?.bank_nama || '');
      setNorekPenerima(norek);
      setNamaRekPenerima(p?.nama_rekening || p?.nama_lengkap || '');
      toast.success(`Rekening ${p?.nama_lengkap || 'Anda'} terisi otomatis`);
    } catch {
      toast.error('Gagal mengambil rekening SIMPEG');
    } finally {
      setRekeningLoading(false);
    }
  };

  // LPJ
  const [tglLpj, setTglLpj] = useState(new Date().toISOString().split('T')[0]);
  const [realisasi, setRealisasi] = useState('');
  const [rincian, setRincian] = useState('');
  const [nota, setNota] = useState<File | null>(null);
  const [metodeSisa, setMetodeSisa] = useState('belum_ditentukan');
  const [buktiKembali, setBuktiKembali] = useState<File | null>(null);
  const [rekTujuan, setRekTujuan] = useState('');
  const [tambahan, setTambahan] = useState<{ keterangan: string; qty: number; satuan: string; harga_satuan: number }[]>([]);

  // Reimburse (kurang bayar LPJ) & ref jurnal akuntansi
  const [jurnal, setJurnal] = useState<JurnalRef[]>([]);
  const [modalReimburseOpen, setModalReimburseOpen] = useState(false);
  const [fileLampiranRmb, setFileLampiranRmb] = useState<File | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pengajuanOperasionalService.detail(id);
      setData(res.data);
      const dataWithJurnal = res.data as unknown as { jurnal?: JurnalRef[] } | undefined;
      setJurnal(Array.isArray(dataWithJurnal?.jurnal) ? dataWithJurnal.jurnal : []);
      setNominalCair(String(res.data?.nominal_disetujui || res.data?.nominal_diajukan || ''));
      if (res.data?.unit_kas_id) setSumberKasId(String(res.data.unit_kas_id));
      setBankPenerima(String(res.data?.nama_bank_penerima || ''));
      setNorekPenerima(String(res.data?.nomor_rekening_penerima || ''));
      setNamaRekPenerima(String(res.data?.nama_rekening_penerima || ''));
    } catch {
      toast.error('Gagal memuat detail pengajuan');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const fetchSumberKas = async () => {
      try {
        const res = await sikeuService.getUnitKasList();
        const list = Array.isArray(res.data) ? res.data.filter((u: any) => u.status !== false) : [];
        setSumberKasList(list);
      } catch {
        setSumberKasList([]);
      }
    };
    fetchSumberKas();
  }, []);

  const submitKeputusan = async () => {
    if (!modal) return;
    const isPlottingKeuangan = modal.konteks === 'tahap' && modal.aksi === 'approve' && data?.status === 'pending_keuangan';
    if (isPlottingKeuangan && !sumberKasId) {
      toast.error('Pilih sumber unit kas terlebih dahulu sebelum diteruskan ke Direktur');
      return;
    }
    setActing(true);
    try {
      if (modal.konteks === 'tahap') {
        await pengajuanOperasionalService.approve(
          id,
          modal.aksi,
          catatan,
          isPlottingKeuangan ? { unit_kas_id: Number(sumberKasId) } : undefined
        );
      } else if (modal.lpjId) {
        await pengajuanOperasionalService.verifikasiLpj(modal.lpjId, modal.aksi, catatan);
      }
      toast.success('Keputusan berhasil disimpan');
      setModal(null); setCatatan('');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal memproses');
    } finally {
      setActing(false);
    }
  };

  const submitPencairan = async () => {
    if (!sumberKasId) {
      toast.error('Tentukan unit kas sumber dana pencairan.');
      return;
    }
    setActing(true);
    try {
      const form = new FormData();
      if (nominalCair) form.append('nominal_cair', nominalCair);
      form.append('tanggal_pencairan', tglCair);
      if (sumberKasId) form.append('unit_kas_id', sumberKasId);
      if (referensiEksternal.trim()) form.append('referensi_eksternal', referensiEksternal.trim());
      if (bankPenerima.trim()) form.append('nama_bank_penerima', bankPenerima.trim());
      if (norekPenerima.trim()) form.append('nomor_rekening_penerima', norekPenerima.trim());
      if (namaRekPenerima.trim()) form.append('nama_rekening_penerima', namaRekPenerima.trim());
      if (buktiCair) form.append('bukti_pencairan', buktiCair);
      await pengajuanOperasionalService.pencairan(id, form);
      toast.success('Dana dicairkan + jurnal otomatis terbit');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal mencairkan');
    } finally {
      setActing(false);
    }
  };

  const tambahanTotal = tambahan.reduce((s, t) => s + (Number(t.qty) || 0) * (Number(t.harga_satuan) || 0), 0);
  const cair = Number(data?.nominal_disetujui || 0);
  const pakai = (Number(realisasi) || 0) + tambahanTotal;
  const sisa = Math.max(0, cair - pakai);
  const kurangRealtime = Math.max(0, pakai - cair);

  const submitLpj = async () => {
    setActing(true);
    try {
      const form = new FormData();
      form.append('tanggal_pelaksanaan', tglLpj);
      form.append('total_realisasi', realisasi || '0');
      form.append('rincian_keterangan', rincian);
      form.append('metode_sisa', sisa > 0 ? metodeSisa : 'belum_ditentukan');
      if (nota) form.append('file_nota_kuitansi', nota);
      if (buktiKembali) form.append('bukti_pengembalian', buktiKembali);
      if (rekTujuan) form.append('nomor_rekening_tujuan', rekTujuan);
      tambahan.forEach((t, i) => {
        form.append(`tambahan[${i}][keterangan]`, t.keterangan);
        form.append(`tambahan[${i}][qty]`, String(t.qty));
        form.append(`tambahan[${i}][satuan]`, t.satuan || 'pcs');
        form.append(`tambahan[${i}][harga_satuan]`, String(t.harga_satuan));
      });
      await pengajuanOperasionalService.simpanLpj(id, form);
      toast.success('LPJ tersimpan, menunggu verifikasi keuangan');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal menyimpan LPJ');
    } finally {
      setActing(false);
    }
  };

  // ── Reimburse: selisih kurang bayar LPJ (realisasi > pencairan) ──────────
  const kurangBayar = Math.max(0, (Number(data?.total_realisasi) || 0) - (Number(data?.nominal_disetujui) || 0));
  const reimbursements: PengajuanOperasional[] = Array.isArray(data?.reimbursements) ? data.reimbursements : [];
  const rmbAktif = reimbursements.filter((r) => r.status !== 'ditolak');
  const bisaAjukanReimburse = kurangBayar > 0 && rmbAktif.length === 0;

  type ReimburseFormValues = { nominal_diajukan: number; unit_kas_id: string; deskripsi?: string; nama_bank_penerima?: string; nomor_rekening_penerima?: string; nama_rekening_penerima?: string };
  const reimburseSchema = useMemo(
    () =>
      z.object({
        nominal_diajukan: z
          .coerce.number()
          .positive('Nominal reimbursement harus lebih dari 0')
          .max(kurangBayar || 0, `Maksimal selisih kurang ${formatRupiah(kurangBayar)}`),
        unit_kas_id: z.string().optional(),
        deskripsi: z.string().optional(),
        nama_bank_penerima: z.string().max(50).optional(),
        nomor_rekening_penerima: z.string().max(50).optional(),
        nama_rekening_penerima: z.string().max(100).optional(),
      }),
    [kurangBayar]
  );

  const formReimburse = useForm<ReimburseFormValues>({
    resolver: zodResolver(reimburseSchema) as any,
    defaultValues: { nominal_diajukan: 0, unit_kas_id: '', deskripsi: '', nama_bank_penerima: '', nomor_rekening_penerima: '', nama_rekening_penerima: '' },
  });

  const openReimburse = () => {
    formReimburse.reset({
      nominal_diajukan: kurangBayar,
      unit_kas_id: data?.unit_kas_id ? String(data.unit_kas_id) : '',
      deskripsi: '',
      nama_bank_penerima: data?.nama_bank_penerima || '',
      nomor_rekening_penerima: data?.nomor_rekening_penerima || '',
      nama_rekening_penerima: data?.nama_rekening_penerima || '',
    });
    setFileLampiranRmb(null);
    setModalReimburseOpen(true);
  };

  const gunakanRekeningSayaReimburse = async () => {
    setRekeningLoading(true);
    try {
      const res = await simpegService.getMyPegawai();
      const p: any = res.data;
      const norek = p?.nomor_rekening || '';
      if (!norek) {
        toast.error('Nomor rekening SIMPEG Anda masih kosong. Lengkapi di data pegawai SIMPEG.');
        return;
      }
      formReimburse.setValue('nama_bank_penerima', p?.nama_bank || p?.bank_nama || '');
      formReimburse.setValue('nomor_rekening_penerima', norek);
      formReimburse.setValue('nama_rekening_penerima', p?.nama_rekening || p?.nama_lengkap || '');
      toast.success(`Rekening ${p?.nama_lengkap || 'Anda'} terisi otomatis`);
    } catch {
      toast.error('Gagal mengambil rekening SIMPEG');
    } finally {
      setRekeningLoading(false);
    }
  };

  const onSubmitReimburse = async (values: ReimburseFormValues) => {
    setActing(true);
    try {
      const form = new FormData();
      form.append('nominal_diajukan', String(values.nominal_diajukan));
      if (values.unit_kas_id) form.append('unit_kas_id', values.unit_kas_id);
      if (values.deskripsi) form.append('deskripsi', values.deskripsi);
      if (values.nama_bank_penerima?.trim()) form.append('nama_bank_penerima', values.nama_bank_penerima.trim());
      if (values.nomor_rekening_penerima?.trim()) form.append('nomor_rekening_penerima', values.nomor_rekening_penerima.trim());
      if (values.nama_rekening_penerima?.trim()) form.append('nama_rekening_penerima', values.nama_rekening_penerima.trim());
      if (fileLampiranRmb) form.append('file_lampiran', fileLampiranRmb);
      await pengajuanOperasionalService.ajukanReimburse(id, form);
      toast.success('Pengajuan reimbursement dibuat, menunggu verifikasi keuangan');
      setModalReimburseOpen(false);
      setFileLampiranRmb(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal mengajukan reimbursement');
    } finally {
      setActing(false);
    }
  };

  if (loading) return <div className="p-8 text-sm">Memuat detail pengajuan...</div>;
  if (!data) return <div className="p-8 text-sm">Data tidak ditemukan. <Link href="/sikeu/pengajuan" className="underline">Kembali</Link></div>;

  const lpj = Array.isArray(data.lpj) ? data.lpj[0] : data.lpj;
  const bisaApproveTahap = ['pending_sarpras', 'pending_keuangan', 'pending_direktur'].includes(data.status);
  const isDitolak = data.status === 'ditolak';
  const statusStyle = STATUS_STYLE[data.status] || { label: data.status, variant: 'secondary' as const };

  const history: any[] = Array.isArray((data as any).history_approval) ? (data as any).history_approval : [];
  const tahapKeputusan = (role?: string) => {
    if (!role) return null;
    const recs = history.filter((h) => h.role_approver === role);
    if (recs.some((h) => h.status_action === 'rejected')) return 'rejected';
    if (recs.some((h) => h.status_action === 'approved')) return 'approved';
    return null;
  };
  const tahapPenolak = history.find((h) => h.status_action === 'rejected');

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      <PageHeader
        title={`${data.nomor_pengajuan} — ${data.judul_pengajuan}`}
        description={`${data.kategori_pengajuan === 'pengadaan_barang' ? 'Pengadaan Barang' : 'Non-Barang'} • ${formatRupiah(Number(data.nominal_diajukan))}`}
        action={
          <Link href="/sikeu/pengajuan">
            <Button variant="outline" icon={<ArrowLeft size={16} />} className="font-bold min-h-[38px] text-xs">Kembali</Button>
          </Link>
        }
      />

      <div className="p-4 bg-white border rounded-2xl space-y-2 text-sm">
        <p><b>Alasan/Alokasi:</b> {data.deskripsi}</p>
        <p><b>Fakultas:</b> {data.fakultas?.nama || '-'} • <b>Ruang:</b> {data.ruangan?.nama || '-'}</p>
        <p><b>Dokumen:</b> <Badge variant="info">Pengajuan</Badge></p>
        <p><b>Status:</b> <Badge variant={statusStyle.variant}>{statusStyle.label}</Badge> • <b>Dicairkan:</b> {formatRupiah(Number(data.nominal_disetujui || 0))} • <b>Realisasi:</b> {formatRupiah(Number(data.total_realisasi || 0))} • <b>Sisa:</b> {formatRupiah(Number(data.sisa_nominal || 0))}</p>
        <p><b>Rekening tujuan:</b> {data.nama_bank_penerima || '-'} • <span className="font-mono">{data.nomor_rekening_penerima || '-'}</span> • {data.nama_rekening_penerima || '-'}</p>
        {(data as any).kanal && (
          <p>
            <b>Kanal pencairan:</b>{' '}
            <span className="badge badge-cyan text-2xs font-bold uppercase">
              {String((data as any).kanal).replace('_', ' ')}
            </span>
            {(data as any).referensi_eksternal && (
              <span className="font-mono text-xs text-slate-600"> • Ref: {(data as any).referensi_eksternal}</span>
            )}
          </p>
        )}
        {data?.jenis_pengajuan === 'reimbursement' && data?.parent && (
          <p>
            <b>Reimbursement atas:</b>{' '}
            <Link href={`/sikeu/pengajuan/${data.parent.id}`} className="font-mono text-xs font-bold text-[var(--module-primary)] hover:underline">
              {data.parent.nomor_pengajuan}
            </Link>
            <span className="text-xs text-slate-500"> — {data.parent.judul_pengajuan}</span>
          </p>
        )}
        <div className="flex gap-2 pt-1 flex-wrap">
          {TAHAP.map((t) => {
            const keputusan = tahapKeputusan(t.role);
            const isCurrent = data.status === t.key;
            const cls =
              keputusan === 'approved'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                : keputusan === 'rejected' || (isDitolak && isCurrent)
                  ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                  : isCurrent
                    ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold'
                    : 'border text-slate-500';
            return (
              <span key={t.key} className={`text-2xs px-2 py-1 rounded-full border ${cls}`}>
                {t.label}
                {keputusan === 'approved' ? ' ✓' : keputusan === 'rejected' ? ' ✕' : isCurrent ? ' •' : ''}
              </span>
            );
          })}
        </div>
      </div>

      {isDitolak && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex gap-3 items-start">
          <XCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-extrabold text-rose-800">
              Pengajuan ditolak{tahapPenolak?.role_approver ? ` pada tahap ${tahapPenolak.role_approver}` : ''} — proses berhenti.
            </p>
            {(data as any).catatan_penolakan && (
              <p className="text-rose-700 mt-1">Alasan: {(data as any).catatan_penolakan}</p>
            )}
            {tahapPenolak?.catatan && <p className="text-rose-700 mt-1">Catatan penolak: {tahapPenolak.catatan}</p>}
          </div>
        </div>
      )}

      {Array.isArray(data.items) && data.items.length > 0 && (
        <div className="p-4 bg-white border rounded-2xl">
          <h3 className="text-sm font-extrabold mb-3">Rincian Barang (nama • qty • harga satuan • jumlah)</h3>
          <div className="space-y-2 text-sm">
            {data.items.map((it: any, i: number) => (
              <div key={i} className="flex justify-between border-b pb-2">
                <span>{i + 1}. {it.nama_barang} — {it.qty} {it.satuan} × {formatRupiah(Number(it.harga_satuan))}</span>
                <b>{formatRupiah(Number(it.subtotal))}</b>
              </div>
            ))}
            <div className="text-right font-extrabold">Total: {formatRupiah(Number(data.nominal_diajukan))}</div>
          </div>
        </div>
      )}

      {bisaApproveTahap && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 flex-wrap">
          <Button variant="primary" icon={<CheckCircle2 size={16} />} onClick={() => setModal({ aksi: 'approve', konteks: 'tahap' })} className="font-bold">Setujui Tahap Ini</Button>
          <Button variant="outline" icon={<XCircle size={16} />} onClick={() => setModal({ aksi: 'reject', konteks: 'tahap' })} className="font-bold text-rose-700 border-rose-300">Tolak</Button>
          <span className="text-xs text-amber-800 self-center">Tahap berjalan: {data.status} (sarpras → keuangan → direktur; non-barang mulai dari keuangan)</span>
        </div>
      )}

      {data.status === 'disetujui' && (
        <div className="p-4 bg-white border rounded-2xl space-y-3">
          <h3 className="text-sm font-extrabold">Pencairan Manual (Keuangan)</h3>
          <p className="text-xs text-slate-600">
            Sumber dana: <b>{data.unit_kas?.nama_kas || 'Belum ditentukan — wajib dipilih keuangan di bawah'}</b>
            {(data.unit_kas as any)?.kanal && (
              <span className="badge badge-cyan text-2xs font-bold uppercase ml-1">
                {String((data.unit_kas as any).kanal).replace('_', ' ')}
              </span>
            )}
            <span className="block text-2xs text-slate-400 mt-0.5">
              Jurnal kredit mengikuti akun COA kanal tersebut — cek di Jurnal Umum setelah mencairkan.
            </span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Nominal Cair" type="number" value={nominalCair} onChange={(e) => setNominalCair(e.target.value)} />
            <Input label="Tanggal Pencairan" type="date" value={tglCair} onChange={(e) => setTglCair(e.target.value)} />
            <Select
              label="Sumber Dana (Saldo) *"
              value={sumberKasId}
              onChange={(val: any) => setSumberKasId(String(val || ''))}
              options={sumberKasList.map((u: any) => ({
                value: String(u.id),
                label: `${u.nama_kas}${u.kanal ? ` [${String(u.kanal).replace('_', ' ')}]` : ''} — ${formatRupiah(Number(u.saldo_saat_ini) || 0)}`,
              }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="No. Referensi Transfer (opsional)" placeholder="No. bukti / batch / M-Banking ref" value={referensiEksternal} onChange={(e) => setReferensiEksternal(e.target.value)} />
            <div>
              <label className="text-xs font-bold">Bukti Pencairan</label>
              <input type="file" onChange={(e) => setBuktiCair(e.target.files?.[0] || null)} className="mt-1 block w-full text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Bank Penerima (opsional)" placeholder="BNI / Mandiri / BRI" value={bankPenerima} onChange={(e) => setBankPenerima(e.target.value)} />
            <Input label="No. Rekening Penerima (opsional)" placeholder="Nomor rekening tujuan" value={norekPenerima} onChange={(e) => setNorekPenerima(e.target.value)} />
            <Input label="Nama Pemilik Rekening (opsional)" placeholder="Pegawai / vendor" value={namaRekPenerima} onChange={(e) => setNamaRekPenerima(e.target.value)} />
          </div>
          <div>
            <Button type="button" variant="outline" size="sm" icon={rekeningLoading ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />} onClick={gunakanRekeningSaya} disabled={rekeningLoading || acting} className="text-xs">
              {rekeningLoading ? 'Mengambil...' : 'Gunakan rekening saya (SIMPEG)'}
            </Button>
          </div>
          <Button variant="primary" icon={<Upload size={16} />} onClick={submitPencairan} disabled={acting} className="font-bold">{acting ? 'Memproses...' : 'Cairkan Dana'}</Button>
        </div>
      )}

      {(data.status === 'dicairkan' || data.status === 'lpj_pending') && (
        <div className="p-4 bg-white border rounded-2xl space-y-4">
          <h3 className="text-sm font-extrabold">Laporan Keuangan (LPJ) — wajib upload nota</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Tanggal Pelaksanaan *" type="date" value={tglLpj} onChange={(e) => setTglLpj(e.target.value)} />
            <Input label="Total Realisasi (Rp) *" type="number" value={realisasi} onChange={(e) => setRealisasi(e.target.value)} />
          </div>
          <Textarea label="Rincian Penggunaan" value={rincian} onChange={(e) => setRincian(e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold">File Nota/Kuitansi *</label>
              <input type="file" onChange={(e) => setNota(e.target.files?.[0] || null)} className="mt-1 block w-full text-xs" />
            </div>
            <div>
              <label className="text-xs font-bold">Metode Sisa Dana (cair {formatRupiah(cair)} • pakai {formatRupiah(pakai)} • sisa {formatRupiah(sisa)})</label>
              <select value={metodeSisa} onChange={(e) => setMetodeSisa(e.target.value)} className="mt-1 w-full border rounded-lg text-sm p-2">
                <option value="belum_ditentukan">-- Pilih jika ada sisa --</option>
                <option value="kembali_transfer">Kembalikan via transfer (upload bukti)</option>
                <option value="pakai_lagi">Gunakan untuk pembelian lain (isi tambahan)</option>
              </select>
            </div>
          </div>
          {sisa > 0 && metodeSisa === 'kembali_transfer' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl">
              <div>
                <label className="text-xs font-bold">Bukti Transfer Kembali *</label>
                <input type="file" onChange={(e) => setBuktiKembali(e.target.files?.[0] || null)} className="mt-1 block w-full text-xs" />
              </div>
              <Input label="No. Rekening Tujuan Kampus" value={rekTujuan} onChange={(e) => setRekTujuan(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-extrabold">Pembelian Lain dari Sisa (keterangan • qty • harga satuan + bukti)</h4>
              <Button type="button" variant="outline" icon={<Plus size={14} />} onClick={() => setTambahan([...tambahan, { keterangan: '', qty: 1, satuan: 'pcs', harga_satuan: 0 }])} className="text-xs">Tambah</Button>
            </div>
            {tambahan.map((t, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-2 border rounded-xl text-xs">
                <Input label="Keterangan" value={t.keterangan} onChange={(e) => { const c = [...tambahan]; c[i].keterangan = e.target.value; setTambahan(c); }} />
                <Input label="Qty" type="number" value={String(t.qty)} onChange={(e) => { const c = [...tambahan]; c[i].qty = Number(e.target.value); setTambahan(c); }} />
                <Input label="Satuan" value={t.satuan} onChange={(e) => { const c = [...tambahan]; c[i].satuan = e.target.value; setTambahan(c); }} />
                <Input label="Harga Satuan" type="number" value={String(t.harga_satuan)} onChange={(e) => { const c = [...tambahan]; c[i].harga_satuan = Number(e.target.value); setTambahan(c); }} />
                <div className="flex items-end"><Button type="button" variant="outline" icon={<Trash2 size={14} />} onClick={() => setTambahan(tambahan.filter((_, x) => x !== i))} className="text-rose-600" /></div>
              </div>
            ))}
          </div>
          <Button variant="primary" icon={<Upload size={16} />} onClick={submitLpj} disabled={acting} className="font-bold">{acting ? 'Menyimpan...' : 'Kirim LPJ'}</Button>
          {kurangRealtime > 0 && (
            <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Realisasi melebihi pencairan (kurang bayar {formatRupiah(kurangRealtime)}). LPJ tetap bisa disimpan, lalu ajukan reimbursement dari kartu di bawah.
            </p>
          )}
        </div>
      )}

      {lpj && (
        <div className="p-4 bg-white border rounded-2xl text-sm space-y-2">
          <h3 className="font-extrabold">LPJ Terakhir: {lpj.nomor_bukti} — {lpj.status_verifikasi} ({lpj.tanggal_pelaksanaan ? formatDate(lpj.tanggal_pelaksanaan) : '-'})</h3>
          <p>Realisasi {formatRupiah(Number(lpj.total_realisasi))} • Sisa {formatRupiah(Number(lpj.sisa_nominal))} • Metode: {lpj.metode_sisa}</p>
          {lpj.status_verifikasi === 'pending' && (
            <div className="flex gap-2">
              <Button variant="primary" icon={<CheckCircle2 size={14} />} onClick={() => setModal({ aksi: 'approve', konteks: 'lpj', lpjId: lpj.id })} className="text-xs font-bold">Verifikasi & Jurnal Otomatis</Button>
              <Button variant="outline" icon={<XCircle size={14} />} onClick={() => setModal({ aksi: 'reject', konteks: 'lpj', lpjId: lpj.id })} className="text-xs font-bold text-rose-700">Tolak LPJ</Button>
            </div>
          )}
        </div>
      )}

      {(kurangBayar > 0 || reimbursements.length > 0) && data?.jenis_pengajuan !== 'reimbursement' && (
        <div className="p-4 bg-white border rounded-2xl text-sm space-y-3">
          <h3 className="font-extrabold">Reimbursement Kurang Bayar LPJ</h3>
          {kurangBayar > 0 ? (
            <p>
              Selisih kurang: <b className="text-rose-700">{formatRupiah(kurangBayar)}</b>
              <span className="text-xs text-slate-500"> (realisasi {formatRupiah(Number(data.total_realisasi))} − cair {formatRupiah(Number(data.nominal_disetujui))})</span>
            </p>
          ) : (
            <p className="text-xs text-slate-500">Tidak ada selisih kurang pada LPJ terakhir.</p>
          )}
          {reimbursements.length > 0 && (
            <div className="space-y-1">
              {reimbursements.map((r) => (
                <div key={r.id} className="flex justify-between items-center border-b pb-1 text-xs">
                  <Link href={`/sikeu/pengajuan/${r.id}`} className="font-mono font-bold text-[var(--module-primary)] hover:underline">
                    {r.nomor_pengajuan}
                  </Link>
                  <span>{formatRupiah(Number(r.nominal_diajukan))} • {r.status}</span>
                </div>
              ))}
            </div>
          )}
          {bisaAjukanReimburse && (
            <Button variant="primary" icon={<Banknote size={14} />} onClick={openReimburse} className="text-xs font-bold">
              Ajukan Reimburse {formatRupiah(kurangBayar)}
            </Button>
          )}
          {!bisaAjukanReimburse && kurangBayar > 0 && rmbAktif.length > 0 && (
            <p className="text-xs text-emerald-700 font-semibold">Sudah ada pengajuan reimbursement aktif di atas — pantau statusnya hingga dicairkan.</p>
          )}
        </div>
      )}

      {jurnal.length > 0 && (
        <div className="p-4 bg-white border rounded-2xl text-sm space-y-2">
          <h3 className="font-extrabold">Ref Jurnal Akuntansi</h3>
          <div className="space-y-1">
            {jurnal.map((j) => (
              <div key={j.id} className="flex justify-between items-center border-b pb-1 text-xs">
                <span className="font-mono font-bold">{j.nomor_jurnal}</span>
                <span className="text-slate-500">{j.jenis_sumber === 'reimbursement' ? 'Reimbursement' : j.jenis_sumber === 'pencairan_kas' ? 'Pencairan/Realisasi' : j.jenis_sumber}</span>
                <b className="tabular-nums">{formatRupiah(Number(j.total_debet))}</b>
              </div>
            ))}
          </div>
          <p className="text-2xs text-slate-400">Jurnal reimbursement (JRN-RMB) terpisah dari jurnal pencairan (JRN-EXP) — cek detail di menu Jurnal Umum.</p>
        </div>
      )}

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.aksi === 'approve' ? 'Konfirmasi Persetujuan' : 'Konfirmasi Penolakan'}>
        <div className="space-y-4">
          {modal?.konteks === 'tahap' && modal.aksi === 'approve' && data?.status === 'pending_keuangan' && (
            <Select
              label="Plotting Sumber Unit Kas (Saldo) *"
              value={sumberKasId}
              onChange={(val: any) => setSumberKasId(String(val || ''))}
              options={sumberKasList.map((u: any) => ({
                value: String(u.id),
                label: `${u.nama_kas}${u.kanal ? ` [${String(u.kanal).replace('_', ' ')}]` : ''} — ${formatRupiah(Number(u.saldo_saat_ini) || 0)}`,
              }))}
            />
          )}
          <Textarea label="Catatan (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Batal</Button>
            <Button variant="primary" onClick={submitKeputusan} disabled={acting} icon={acting ? <Loader2 size={14} className="animate-spin" /> : undefined}>
              {acting ? 'Memproses...' : 'Simpan Keputusan'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modalReimburseOpen} onClose={() => { if (!acting) setModalReimburseOpen(false); }} title="Ajukan Reimbursement Kurang Bayar">
        <form onSubmit={formReimburse.handleSubmit(onSubmitReimburse)} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
            <p className="font-semibold text-amber-900">Selisih kurang LPJ {data?.nomor_pengajuan}: {formatRupiah(kurangBayar)}</p>
            <p className="text-amber-800">Pengajuan anak (RMB-*) berjenis reimbursement, mulai dari tahap Keuangan.</p>
          </div>
          <Input
            label="Nominal Reimbursement (Rp)"
            type="number"
            min="1"
            required
            hint={`Maksimal ${formatRupiah(kurangBayar)} sesuai selisih kurang.`}
            error={formReimburse.formState.errors.nominal_diajukan?.message}
            {...formReimburse.register('nominal_diajukan')}
          />
          <Controller
            control={formReimburse.control}
            name="unit_kas_id"
            render={({ field }) => (
              <Select
                label="Unit Kas Pembayar (opsional — ditentukan keuangan)"
                value={field.value}
                onChange={(val: any) => field.onChange(String(val || ''))}
                error={formReimburse.formState.errors.unit_kas_id?.message}
                options={sumberKasList.map((u) => ({ value: String(u.id), label: u.nama_kas }))}
              />
            )}
          />
          <Textarea
            label="Keterangan (opsional)"
            placeholder="Keterangan klaim reimbursement..."
            error={formReimburse.formState.errors.deskripsi?.message}
            {...formReimburse.register('deskripsi')}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Bank Penerima (opsional)"
              placeholder="Default ikut pengajuan asal"
              error={formReimburse.formState.errors.nama_bank_penerima?.message}
              {...formReimburse.register('nama_bank_penerima')}
            />
            <Input
              label="No. Rekening (opsional)"
              placeholder="Default ikut pengajuan asal"
              error={formReimburse.formState.errors.nomor_rekening_penerima?.message}
              {...formReimburse.register('nomor_rekening_penerima')}
            />
            <Input
              label="Nama Rekening (opsional)"
              placeholder="Default ikut pengajuan asal"
              error={formReimburse.formState.errors.nama_rekening_penerima?.message}
              {...formReimburse.register('nama_rekening_penerima')}
            />
          </div>
          <div>
            <Button type="button" variant="outline" size="sm" icon={rekeningLoading ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />} onClick={gunakanRekeningSayaReimburse} disabled={rekeningLoading || acting} className="text-xs">
              {rekeningLoading ? 'Mengambil...' : 'Gunakan rekening saya (SIMPEG)'}
            </Button>
          </div>
          <Input
            type="file"
            label="Lampiran Nota (PDF / Gambar, opsional)"
            accept=".pdf,image/*"
            hint={fileLampiranRmb ? `Berkas terpilih: ${fileLampiranRmb.name}` : undefined}
            onChange={(e) => setFileLampiranRmb(e.target.files?.[0] || null)}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalReimburseOpen(false)} disabled={acting}>Batal</Button>
            <Button type="submit" variant="primary" size="sm" loading={acting} disabled={acting} icon={<FileText size={14} />}>
              <span>Buat Pengajuan RMB</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
