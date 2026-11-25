'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  User,
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Printer,
  RotateCcw,
  Building2,
  Check,
  Loader2,
  FileText,
  BadgePercent,
  Receipt,
  GraduationCap,
  Filter,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Wallet,
  ArrowUpDown,
  Tag,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { sikeuService } from '@/services/sikeu.service';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import type { PaginationMeta } from '@/types/api.types';
import QRCode from 'qrcode';

interface StudentInfo {
  id: number;
  mahasiswa_id?: number;
  calon_mahasiswa_id?: number;
  tipe_referensi?: string;
  is_calon_mahasiswa?: boolean;
  nim?: string;
  no_pendaftaran?: string;
  nama_mahasiswa: string;
  prodi?: string;
  tahun_angkatan?: number;
  jalur_kelas?: string;
  total_unpaid_amount?: number;
  unpaid_bills_count?: number;
}

interface BillItem {
  id: number;
  nomor_tagihan: string;
  jenis: string;
  periode_label?: string;
  total_tagihan: number;
  total_potongan: number;
  total_denda?: number;
  total_bayar: number;
  sisa: number;
  kelebihan_bayar?: number;
  status: string;
  jatuh_tempo?: string;
  details?: Array<{
    id: number;
    master_biaya: string;
    nominal: number;
    potongan: number;
    nominal_bersih: number;
    terbayar?: number;
    sisa?: number;
  }>;
}

interface PembayaranHistoryItem {
  id: number;
  kode_transaksi: string;
  nim: string;
  no_pendaftaran?: string;
  is_calon_mahasiswa?: boolean;
  nama_mahasiswa: string;
  program_studi?: string;
  rincian_pembayaran?: string;
  tagihan_id?: number;
  tagihan?: {
    id?: number;
    nomor_tagihan?: string;
    mahasiswa_id?: number;
    calon_mahasiswa_id?: number;
    total_tagihan?: number;
    total_bayar?: number;
    status?: string;
    rincian?: string;
  };
  virtual_account?: {
    va_number: string;
    bank_nama: string;
  } | null;
  jumlah_bayar: number;
  waktu_bayar?: string;
  channel_bayar: string;
  status: string;
  catatan?: string;
}

// Helper angka ke terbilang bahasa Indonesia
function angkaTerbilang(nilai: number): string {
  const angka = Math.floor(Math.abs(nilai));
  const huruf = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  let hasil = '';
  if (angka < 12) {
    hasil = huruf[angka];
  } else if (angka < 20) {
    hasil = angkaTerbilang(angka - 10) + ' Belas';
  } else if (angka < 100) {
    hasil = angkaTerbilang(Math.floor(angka / 10)) + ' Puluh ' + huruf[angka % 10];
  } else if (angka < 200) {
    hasil = 'Seratus ' + angkaTerbilang(angka - 100);
  } else if (angka < 1000) {
    hasil = angkaTerbilang(Math.floor(angka / 100)) + ' Ratus ' + angkaTerbilang(angka % 100);
  } else if (angka < 2000) {
    hasil = 'Seribu ' + angkaTerbilang(angka - 1000);
  } else if (angka < 1000000) {
    hasil = angkaTerbilang(Math.floor(angka / 1000)) + ' Ribu ' + angkaTerbilang(angka % 1000);
  } else if (angka < 1000000000) {
    hasil = angkaTerbilang(Math.floor(angka / 1000000)) + ' Juta ' + angkaTerbilang(angka % 1000000);
  } else if (angka < 1000000000000) {
    hasil = angkaTerbilang(Math.floor(angka / 1000000000)) + ' Milyar ' + angkaTerbilang(angka % 1000000000);
  }
  return (hasil.replace(/\s+/g, ' ').trim() || 'Nol') + ' Rupiah';
}

function BayarKasirContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active Tab State (synchronized with URL query parameter ?tab=kasir | riwayat)
  const initialTab = searchParams.get('tab') === 'riwayat' ? 'riwayat' : 'kasir';
  const [activeTab, setActiveTab] = useState<'kasir' | 'riwayat'>(initialTab);

  const initialStudentId = searchParams.get('student_id');
  const initialIsCalon = searchParams.get('is_calon') === '1' || searchParams.get('is_calon') === 'true';
  const initialTagihanId = searchParams.get('tagihan_id');

  // ===================== TAB 1: KASIR LOKET STATES =====================
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<StudentInfo[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
  // Scope pencarian ala legacy: prodi + angkatan dulu agar tidak memuat seluruh data
  const [searchProdi, setSearchProdi] = useState('');
  const [searchAngkatan, setSearchAngkatan] = useState('');
  const [prodiOptions, setProdiOptions] = useState<{ value: string; label: string }[]>([]);
  const [angkatanOptions, setAngkatanOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [resProdi, resAngkatan] = await Promise.all([
          sikeuService.getProgramStudiList(),
          sikeuService.getAngkatanList().catch(() => ({ data: [] })),
        ]);
        if (Array.isArray((resProdi as any).data)) {
          setProdiOptions(
            (resProdi as any).data.map((p: any) => ({
              value: String(p.id),
              label: p.jenjang ? `${p.jenjang} - ${p.nama || p.nama_prodi}` : (p.nama || p.nama_prodi),
            }))
          );
        }
        if (Array.isArray((resAngkatan as any).data)) {
          setAngkatanOptions(
            (resAngkatan as any).data.map((a: number) => ({ value: String(a), label: `Angkatan ${a}` }))
          );
        }
      } catch {
        // Fallback: pencarian tetap jalan tanpa scope master
      }
    };
    loadMasters();
  }, []);

  const [bills, setBills] = useState<BillItem[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [selectedBillIds, setSelectedBillIds] = useState<number[]>([]);

  const [channelBayar, setChannelBayar] = useState<'LOKET_TUNAI' | 'LOKET_TRANSFER'>('LOKET_TUNAI');
  const [jumlahBayar, setJumlahBayar] = useState('');
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [modalQrUrl, setModalQrUrl] = useState<string>('');

  useEffect(() => {
    if (receiptData?.kode_transaksi) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const verifyUrl = `${origin}/validasi-pembayaran/${encodeURIComponent(receiptData.kode_transaksi)}`;
      QRCode.toDataURL(verifyUrl, { margin: 1, width: 90 })
        .then(setModalQrUrl)
        .catch(() => setModalQrUrl(''));
    } else {
      setModalQrUrl('');
    }
  }, [receiptData]);

  // ===================== TAB 2: RIWAYAT TRANSAKSI STATES =====================
  const [pembayaranList, setPembayaranList] = useState<PembayaranHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  // Filters for History Tab
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [filterTglMulai, setFilterTglMulai] = useState('');
  const [filterTglSelesai, setFilterTglSelesai] = useState('');
  const [filterSortBy, setFilterSortBy] = useState('waktu_bayar');
  const [filterSortDir, setFilterSortDir] = useState<'asc' | 'desc'>('desc');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Detail Modal for Single Transaction from History
  const [detailItem, setDetailItem] = useState<PembayaranHistoryItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Sync tab change to URL without full refresh
  const handleTabChange = (tabId: 'kasir' | 'riwayat') => {
    setActiveTab(tabId);
    const params = new URLSearchParams(window.location.search);
    if (tabId === 'riwayat') {
      params.set('tab', 'riwayat');
    } else {
      params.delete('tab');
    }
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState(null, '', newUrl);
  };

  // ===================== FETCH BILLS FOR KASIR =====================
  const fetchStudentBills = useCallback(async (studentId: number | string, isCalon: boolean) => {
    setLoadingBills(true);
    try {
      const res = await sikeuService.getStudentUnpaidBills(studentId, isCalon);
      const fetchedBills: BillItem[] = res?.data?.bills || (Array.isArray(res?.data) ? res.data : []);
      setBills(fetchedBills);

      if (res?.data?.mahasiswa && !selectedStudent) {
        setSelectedStudent({
          id: Number(studentId),
          mahasiswa_id: !isCalon ? Number(studentId) : undefined,
          calon_mahasiswa_id: isCalon ? Number(studentId) : undefined,
          is_calon_mahasiswa: isCalon,
          nim: res.data.mahasiswa.nim,
          no_pendaftaran: res.data.mahasiswa.no_pendaftaran,
          nama_mahasiswa: res.data.mahasiswa.nama || res.data.mahasiswa.nama_mahasiswa,
          prodi: res.data.mahasiswa.prodi,
          tahun_angkatan: res.data.mahasiswa.tahun_angkatan || res.data.mahasiswa.angkatan,
          jalur_kelas: res.data.mahasiswa.jalur_kelas || res.data.mahasiswa.jalur,
        });
      }

      if (initialTagihanId) {
        const found = fetchedBills.find((b) => String(b.id) === initialTagihanId);
        if (found) {
          setSelectedBillIds([found.id]);
          setJumlahBayar(String(found.sisa));
        }
      }
    } catch {
      setBills([]);
      toast.error('Gagal mengambil daftar tagihan mahasiswa');
    } finally {
      setLoadingBills(false);
    }
  }, [initialTagihanId, selectedStudent]);

  useEffect(() => {
    if (initialStudentId) {
      fetchStudentBills(initialStudentId, initialIsCalon);
    }
  }, [initialStudentId, initialIsCalon, fetchStudentBills]);

  // ===================== FETCH RIWAYAT TRANSAKSI =====================
  const fetchPaymentHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await sikeuService.getPembayaranList({
        page,
        per_page: perPage,
        search: filterSearch.trim() || undefined,
        status: filterStatus || undefined,
        channel: filterChannel || undefined,
        tgl_mulai: filterTglMulai || undefined,
        tgl_selesai: filterTglSelesai || undefined,
        sort_by: filterSortBy || 'waktu_bayar',
        sort_order: filterSortDir || 'desc',
      });

      if (res?.data) {
        setPembayaranList(Array.isArray(res.data) ? res.data : []);
      } else {
        setPembayaranList([]);
      }

      if (res?.meta) {
        setPaginationMeta(res.meta);
      }
    } catch {
      setPembayaranList([]);
      toast.error('Gagal memuat riwayat transaksi pembayaran');
    } finally {
      setLoadingHistory(false);
    }
  }, [page, perPage, filterSearch, filterStatus, filterChannel, filterTglMulai, filterTglSelesai, filterSortBy, filterSortDir]);

  // Load history when riwayat tab is active or pagination/filters change
  useEffect(() => {
    if (activeTab === 'riwayat') {
      fetchPaymentHistory();
    }
  }, [activeTab, fetchPaymentHistory]);

  // ===================== KASIR WORKFLOW HANDLERS =====================
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error('Masukkan kata kunci pencarian (Nama, NIM, atau No Pendaftaran)');
      return;
    }

    setSearching(true);
    try {
      const res = await sikeuService.searchMahasiswa(searchQuery.trim(), {
        program_studi_id: searchProdi || undefined,
        angkatan: searchAngkatan || undefined,
      });
      const list = res.data || [];
      setSearchResults(list);
      if (list.length === 0) {
        toast.error('Data mahasiswa atau calon mahasiswa tidak ditemukan');
      }
    } catch {
      setSearchResults([]);
      toast.error('Gagal melakukan pencarian mahasiswa');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectStudent = (student: StudentInfo) => {
    setSelectedStudent(student);
    setSearchResults([]);
    setSearchQuery('');
    setSelectedBillIds([]);
    setJumlahBayar('');
    fetchStudentBills(student.id || student.mahasiswa_id || student.calon_mahasiswa_id!, !!student.is_calon_mahasiswa);
  };

  const handleResetStudent = () => {
    setSelectedStudent(null);
    setBills([]);
    setSelectedBillIds([]);
    setJumlahBayar('');
    setCatatan('');
  };

  const handleToggleBill = (billId: number) => {
    setSelectedBillIds((prev) => {
      const updated = prev.includes(billId)
        ? prev.filter((id) => id !== billId)
        : [...prev, billId];

      const sumSisa = bills
        .filter((b) => updated.includes(b.id))
        .reduce((sum, b) => sum + (Number(b.sisa) || 0), 0);
      setJumlahBayar(sumSisa > 0 ? String(sumSisa) : '');

      return updated;
    });
  };

  const handleSelectAllBills = () => {
    if (selectedBillIds.length === bills.length) {
      setSelectedBillIds([]);
      setJumlahBayar('');
    } else {
      const allIds = bills.map((b) => b.id);
      setSelectedBillIds(allIds);
      const totalSisa = bills.reduce((sum, b) => sum + (Number(b.sisa) || 0), 0);
      setJumlahBayar(String(totalSisa));
    }
  };

  const totalSisaSelected = useMemo(() => {
    return bills
      .filter((b) => selectedBillIds.includes(b.id))
      .reduce((sum, b) => sum + (Number(b.sisa) || 0), 0);
  }, [bills, selectedBillIds]);

  const handleSetFullPayment = () => {
    if (totalSisaSelected > 0) {
      setJumlahBayar(String(totalSisaSelected));
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudent) {
      toast.error('Pilih mahasiswa terlebih dahulu.');
      return;
    }
    if (selectedBillIds.length === 0) {
      toast.error('Pilih minimal satu tagihan untuk dibayarkan.');
      return;
    }
    const nominal = Number(jumlahBayar);
    if (isNaN(nominal) || nominal <= 0) {
      toast.error('Masukkan nominal pembayaran yang valid.');
      return;
    }
    if (nominal > totalSisaSelected + 100) {
      toast.error(`Nominal pembayaran (Rp ${nominal.toLocaleString('id-ID')}) melebihi total sisa tagihan terpilih (${formatRupiah(totalSisaSelected)}).`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await sikeuService.processKasirPayment({
        tagihan_ids: selectedBillIds,
        jumlah_bayar: nominal,
        channel_bayar: channelBayar,
        catatan: catatan.trim() || undefined,
      });

      if (res.status === 'success') {
        toast.success(res.message || 'Pembayaran kasir loket berhasil diproses!');
        const kuitansi = res.data?.kuitansi || {
          kode_transaksi: 'TRX-' + Date.now(),
          tanggal: new Date().toISOString().replace('T', ' ').substring(0, 19),
          mahasiswa_id: selectedStudent.id,
          nomor_tagihan: bills.filter((b) => selectedBillIds.includes(b.id)).map((b) => b.nomor_tagihan).join(', '),
          jumlah_bayar: nominal,
          channel: channelBayar,
          sisa_setelah_bayar: Math.max(0, totalSisaSelected - nominal),
          status_tagihan: nominal >= totalSisaSelected ? 'lunas' : 'sebagian',
          kasir: 'Petugas Kasir Keuangan',
        };

        setReceiptData({
          ...kuitansi,
          student: selectedStudent,
          bills_detail: bills.filter((b) => selectedBillIds.includes(b.id)),
        });
        setShowReceiptModal(true);

        fetchStudentBills(selectedStudent.id, !!selectedStudent.is_calon_mahasiswa);
        setSelectedBillIds([]);
        setJumlahBayar('');
        setCatatan('');

        // Also invalidate history so tab 2 reflects new payment
        fetchPaymentHistory();
      } else {
        toast.error(res.message || 'Gagal memproses pembayaran');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Terjadi kesalahan saat memproses pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  // ===================== UNIVERSAL ISOLATED IFRAME PRINTER =====================
  const handlePrintReceipt = async (dataToPrint?: any) => {
    const raw = dataToPrint || receiptData;
    if (!raw) {
      toast.error('Data kuitansi tidak tersedia untuk dicetak');
      return;
    }

    // Normalizing item structure whether from direct kasir or riwayat row
    const kodeTrx = raw.kode_transaksi || `TRX-${raw.id || Date.now()}`;
    const tanggalBayar = raw.tanggal || raw.waktu_bayar || new Date().toISOString().replace('T', ' ').substring(0, 19);
    const nominalBayar = Number(raw.jumlah_bayar) || 0;
    const channel = raw.channel || raw.channel_bayar || 'LOKET_TUNAI';
    const statusText = (raw.status_tagihan || raw.status || 'BERHASIL').toUpperCase();

    // Generate QR Code data URL for public digital verification
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const verifyUrl = `${origin}/validasi-pembayaran/${encodeURIComponent(kodeTrx)}`;
    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 85 });
    } catch (e) {
      console.error('Failed to generate QR code', e);
    }

    const studentNama = raw.student?.nama_mahasiswa || raw.nama_mahasiswa || 'Mahasiswa';
    const nimOrReg = raw.student?.nim && raw.student?.nim !== '-'
      ? `NIM: ${raw.student?.nim}`
      : raw.nim && raw.nim !== '-'
        ? `NIM: ${raw.nim}`
        : `No. Reg: ${raw.student?.no_pendaftaran || raw.no_pendaftaran || '-'}`;
    const prodiName = raw.student?.prodi || raw.program_studi || '-';
    const angkatanText = raw.student?.tahun_angkatan ? ` (Angkatan ${raw.student.tahun_angkatan})` : '';

    const channelLabel = channel === 'LOKET_TUNAI'
      ? 'Tunai di Loket Kasir Kampus'
      : channel === 'LOKET_TRANSFER'
        ? 'Transfer Rekening Resmi Kampus'
        : 'Virtual Account Online (Xendit)';

    const tagihanNomor = raw.nomor_tagihan || raw.tagihan?.nomor_tagihan || (raw.tagihan_id ? `TAG-#${raw.tagihan_id}` : '-');
    const tagihanUraian = raw.rincian_pembayaran || raw.bills_detail?.[0]?.jenis || 'Biaya Pendidikan Mahasiswa';
    const totalTagihanNominal = raw.tagihan?.total_tagihan || raw.bills_detail?.[0]?.total_tagihan || nominalBayar;
    const sisaTagihan = raw.sisa_setelah_bayar !== undefined
      ? raw.sisa_setelah_bayar
      : Math.max(0, (raw.tagihan?.total_tagihan || 0) - (raw.tagihan?.total_bayar || 0));

    const kasirNama = raw.kasir || (channel.includes('LOKET') ? 'Petugas Kasir Keuangan' : 'Sistem Payment Gateway (Xendit)');
    const terbilangStr = angkaTerbilang(nominalBayar);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kuitansi Pembayaran - ${kodeTrx}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #0f172a;
              font-size: 10pt;
              line-height: 1.4;
              background: #fff;
            }
            .kuitansi-card {
              border: 2px solid #0f172a;
              border-radius: 8px;
              padding: 24px;
              position: relative;
              background: #fff;
            }
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-25deg);
              font-size: 52pt;
              font-weight: 900;
              color: rgba(16, 185, 129, 0.12);
              text-transform: uppercase;
              border: 6px solid rgba(16, 185, 129, 0.16);
              padding: 8px 36px;
              border-radius: 20px;
              pointer-events: none;
              letter-spacing: 8px;
            }
            .header-kop {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .kampus-title {
              font-size: 13pt;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #0f172a;
              margin: 0;
            }
            .doc-title {
              font-size: 11pt;
              font-weight: 700;
              text-transform: uppercase;
              color: #334155;
              margin: 3px 0 0 0;
            }
            .kampus-sub {
              font-size: 8.5pt;
              color: #64748b;
              margin: 2px 0 0 0;
            }
            .ref-box {
              text-align: right;
            }
            .ref-no {
              font-family: monospace;
              font-size: 10pt;
              font-weight: 700;
              color: #0f172a;
            }
            .ref-date {
              font-size: 8.5pt;
              color: #64748b;
              margin-top: 2px;
            }
            .status-badge {
              display: inline-block;
              font-size: 8pt;
              font-weight: 800;
              padding: 2px 8px;
              border-radius: 4px;
              background: #ecfdf5;
              color: #065f46;
              border: 1px solid #a7f3d0;
              margin-top: 4px;
              text-transform: uppercase;
            }
            .meta-table {
              width: 100%;
              margin-top: 14px;
              border-collapse: collapse;
            }
            .meta-table td {
              padding: 5px 0;
              vertical-align: top;
              font-size: 9.5pt;
            }
            .meta-table .label {
              width: 170px;
              color: #475569;
              font-weight: 600;
            }
            .meta-table .colon {
              width: 15px;
              color: #64748b;
            }
            .meta-table .value {
              font-weight: 700;
              color: #0f172a;
            }
            .terbilang-box {
              margin-top: 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 10px 14px;
              font-size: 9.5pt;
            }
            .terbilang-title {
              font-weight: 600;
              color: #64748b;
              font-size: 8pt;
              text-transform: uppercase;
            }
            .terbilang-text {
              font-style: italic;
              font-weight: 700;
              color: #0f172a;
              margin-top: 2px;
            }
            .item-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 14px;
            }
            .item-table th, .item-table td {
              border: 1px solid #cbd5e1;
              padding: 8px 12px;
              font-size: 9pt;
            }
            .item-table th {
              background: #f1f5f9;
              font-weight: 700;
              text-align: left;
            }
            .item-table .text-right {
              text-align: right;
            }
            .total-banner {
              margin-top: 14px;
              background: #0f172a;
              color: #ffffff;
              border-radius: 6px;
              padding: 12px 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .total-label {
              font-size: 9pt;
              font-weight: 700;
              color: #cbd5e1;
              text-transform: uppercase;
            }
            .total-amount {
              font-family: monospace;
              font-size: 14pt;
              font-weight: 900;
              color: #fcd34d;
            }
            .footer-sig {
              margin-top: 28px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              page-break-inside: avoid;
            }
            .sig-box {
              text-align: center;
              font-size: 8.5pt;
              width: 190px;
            }
            .sig-line {
              margin-top: 50px;
              border-top: 1px solid #0f172a;
              font-weight: 700;
              padding-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="kuitansi-card">
            <div class="watermark">${statusText}</div>
            
            <div class="header-kop">
              <div>
                <h1 class="kampus-title">UNIVERSITAS SSO CAMPUS</h1>
                <h2 class="doc-title">Tanda Bukti Pembayaran Resmi</h2>
                <p class="kampus-sub">Bagian Administrasi Keuangan • Sistem Terpadu Pembayaran Kuliah</p>
              </div>
              <div class="ref-box">
                <div class="ref-no">${kodeTrx}</div>
                <div class="ref-date">Waktu: ${tanggalBayar}</div>
                <span class="status-badge">${statusText}</span>
              </div>
            </div>

            <table class="meta-table">
              <tr>
                <td class="label">Telah Terima Dari</td>
                <td class="colon">:</td>
                <td class="value">${studentNama}</td>
              </tr>
              <tr>
                <td class="label">Identitas Mahasiswa</td>
                <td class="colon">:</td>
                <td class="value">${nimOrReg}</td>
              </tr>
              <tr>
                <td class="label">Program Studi</td>
                <td class="colon">:</td>
                <td class="value">${prodiName}${angkatanText}</td>
              </tr>
              <tr>
                <td class="label">Kanal Pembayaran</td>
                <td class="colon">:</td>
                <td class="value">${channelLabel}</td>
              </tr>
            </table>

            <div class="terbilang-box">
              <div class="terbilang-title">Uang Sejumlah:</div>
              <div class="terbilang-text">"${terbilangStr}"</div>
            </div>

            <table class="item-table">
              <thead>
                <tr>
                  <th>No. Tagihan / Invoice</th>
                  <th>Uraian / Komponen Biaya</th>
                  <th class="text-right">Total Tagihan</th>
                  <th class="text-right">Nominal Dibayarkan</th>
                </tr>
              </thead>
              <tbody>
                ${(raw.bills_detail && raw.bills_detail.length > 0
                  ? raw.bills_detail.map((b: any) => {
                    const alokasi = raw.rincian_komponen?.[b.nomor_tagihan];
                    const subRows = Array.isArray(alokasi) && alokasi.length > 0
                      ? `<tr><td></td><td colspan="3" style="padding: 4px 12px 6px 12px; font-size: 8pt; color: #475569;">${alokasi.map((k: any) => `&bull; ${k.komponen}: terbayar ${formatRupiah(k.terbayar)} &mdash; sisa ${formatRupiah(k.sisa)}`).join('<br/>')}</td></tr>`
                      : '';
                    return `
                    <tr>
                      <td style="font-family: monospace; font-weight: bold;">${b.nomor_tagihan}</td>
                      <td>${b.jenis || b.periode_label || 'Biaya Pendidikan Mahasiswa'}</td>
                      <td class="text-right" style="font-family: monospace;">${formatRupiah(b.total_tagihan)}</td>
                      <td class="text-right" style="font-family: monospace; font-weight: bold;">${formatRupiah(nominalBayar)}</td>
                    </tr>${subRows}`;
                  }).join('')
                  : `
                    <tr>
                      <td style="font-family: monospace; font-weight: bold;">${tagihanNomor}</td>
                      <td>${tagihanUraian}</td>
                      <td class="text-right" style="font-family: monospace;">${formatRupiah(totalTagihanNominal)}</td>
                      <td class="text-right" style="font-family: monospace; font-weight: bold;">${formatRupiah(nominalBayar)}</td>
                    </tr>
                  `
                )}
              </tbody>
            </table>

            <div class="total-banner">
              <span class="total-label">Total Pembayaran Diterima</span>
              <span class="total-amount">${formatRupiah(nominalBayar)}</span>
            </div>

            <table class="meta-table" style="margin-top: 10px;">
              <tr>
                <td class="label">Sisa Tagihan Setelah Bayar</td>
                <td class="colon">:</td>
                <td class="value" style="color: ${sisaTagihan > 0 ? '#b91c1c' : '#047857'}; font-family: monospace;">
                  ${formatRupiah(sisaTagihan)} ${sisaTagihan <= 0 ? '(LUNAS PENUH)' : ''}
                </td>
              </tr>
            </table>

            <div class="footer-sig">
              <div class="sig-box">
                <div>Mahasiswa / Penyetor,</div>
                <div class="sig-line" style="margin-top: 55px;">${studentNama}</div>
              </div>
              <div class="sig-box">
                <div style="font-size: 8pt; font-weight: 700; color: #334155; margin-bottom: 4px;">
                  Tanda Tangan Digital & Verifikasi:
                </div>
                ${qrCodeDataUrl ? `
                  <img src="${qrCodeDataUrl}" width="78" height="78" style="margin: 0 auto; display: block; border-radius: 4px;" alt="QR Code Verifikasi" />
                  <div style="font-size: 7pt; font-family: monospace; color: #64748b; margin-top: 2px;">
                    Scan QR verifikasi keaslian
                  </div>
                  <div class="sig-line" style="margin-top: 4px; padding-top: 2px;">
                    ${kasirNama}
                  </div>
                ` : `
                  <div class="sig-line" style="margin-top: 55px;">
                    ${kasirNama}
                  </div>
                `}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 2000);
    }, 250);
  };



  // ===================== DATA TABLE COLUMNS (TAB 2) =====================
  const columns: ColumnDef<PembayaranHistoryItem>[] = useMemo(
    () => [
      {
        key: 'kode_transaksi',
        label: 'Kode Trx & Waktu',
        render: (row) => (
          <div className="space-y-0.5">
            <span className="font-mono font-extrabold text-xs text-slate-900 block">
              {row.kode_transaksi}
            </span>
            <div className="flex items-center gap-1 text-2xs text-slate-500">
              <Clock size={11} className="text-slate-400" />
              <span>{formatDateTime(row.waktu_bayar)}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'mahasiswa',
        label: 'Identitas Mahasiswa',
        render: (row) => (
          <div className="space-y-0.5 max-w-[220px]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs text-slate-900 truncate">{row.nama_mahasiswa}</span>
              {row.is_calon_mahasiswa ? (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                  SPMB
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                  SIAKAD
                </span>
              )}
            </div>
            <div className="text-2xs text-slate-500 font-mono">
              {row.nim && row.nim !== '-' ? `NIM: ${row.nim}` : `No Reg: ${row.no_pendaftaran || '-'}`}
              {row.program_studi && row.program_studi !== '-' ? ` • ${row.program_studi}` : ''}
            </div>
          </div>
        ),
      },
      {
        key: 'tagihan',
        label: 'Tagihan & Uraian',
        render: (row) => (
          <div className="space-y-0.5 max-w-[200px]">
            <span className="font-mono text-xs font-semibold text-slate-800 block">
              {row.tagihan?.nomor_tagihan || (row.tagihan_id ? `TAG-#${row.tagihan_id}` : '-')}
            </span>
            <span className="text-2xs text-slate-500 line-clamp-1">
              {row.rincian_pembayaran || 'Biaya Pendidikan Mahasiswa'}
            </span>
          </div>
        ),
      },
      {
        key: 'channel_bayar',
        label: 'Kanal Pembayaran',
        render: (row) => {
          if (row.channel_bayar === 'LOKET_TUNAI') {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Wallet size={11} />
                Tunai Kasir
              </span>
            );
          }
          if (row.channel_bayar === 'LOKET_TRANSFER') {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                <Building2 size={11} />
                Transfer Loket
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
              <CreditCard size={11} />
              Virtual Account
            </span>
          );
        },
      },
      {
        key: 'jumlah_bayar',
        label: 'Nominal Bayar',
        align: 'right',
        render: (row) => (
          <div className="text-right">
            <span className="font-mono font-extrabold text-xs text-emerald-700 block">
              {formatRupiah(row.jumlah_bayar)}
            </span>
            {row.virtual_account?.va_number && (
              <span className="text-2xs font-mono text-slate-400 block">
                VA: {row.virtual_account.va_number}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => {
          if (row.status === 'success') {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 size={11} />
                Berhasil
              </span>
            );
          }
          if (row.status === 'pending') {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                <Clock size={11} />
                Menunggu
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
              <XCircle size={11} />
              {row.status || 'Dibatalkan'}
            </span>
          );
        },
      },
      {
        key: 'aksi',
        label: 'Aksi',
        align: 'right',
        render: (row) => (
          <div className="flex justify-end">
            <DropdownMenu
              items={[
                {
                  label: 'Cetak Kuitansi',
                  icon: <Printer size={14} />,
                  onClick: () => handlePrintReceipt(row),
                },
                {
                  label: 'Lihat Rincian',
                  icon: <Eye size={14} />,
                  onClick: () => {
                    setDetailItem(row);
                    setShowDetailModal(true);
                  },
                },
              ]}
            />
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* PAGE HEADER */}
      <PageHeader
        title="Pembayaran & Riwayat Transaksi Mahasiswa"
        description="Layanan kasir penerimaan pembayaran kuliah di loket kampus dan audit riwayat transaksi pembayaran mahasiswa terintegrasi."
        action={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tombol Navigasi Kembali ke Tagihan */}
            <Button
              variant="outline"
              icon={<ArrowLeft size={16} />}
              onClick={() => router.push('/sikeu/pembayaran-mahasiswa/tagihan')}
              className="font-bold min-h-[38px] text-xs"
            >
              Kembali ke Tagihan
            </Button>

            {/* Jika di Tab Riwayat: Tampilkan Tombol Filter di KIRI Tombol Kasir */}
            {activeTab === 'riwayat' && (
              <>
                <Button
                  variant="outline"
                  icon={<Filter size={16} />}
                  onClick={() => setShowFilterDrawer(true)}
                  className="font-bold min-h-[38px] text-xs"
                >
                  Filter
                </Button>
                <Button
                  variant="primary"
                  icon={<CreditCard size={16} />}
                  onClick={() => handleTabChange('kasir')}
                  className="font-bold min-h-[38px] text-xs px-3.5 shadow-sm"
                >
                  Bayar Kasir Baru
                </Button>
              </>
            )}


          </div>
        }
      />

      {/* STANDAR TAB NAVIGATION: DIVIDED BOTTOM BORDER (Rule 11) */}
      <div className="flex border-b border-slate-200 gap-1 sm:gap-2 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => handleTabChange('kasir')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'kasir'
              ? 'border-primary-600 text-primary-700 bg-primary-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
          }`}
        >
          <CreditCard size={15} className={activeTab === 'kasir' ? 'text-primary-600' : 'text-slate-400'} />
          <span>Bayar Kasir Loket</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('riwayat')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'riwayat'
              ? 'border-primary-600 text-primary-700 bg-primary-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
          }`}
        >
          <Receipt size={15} className={activeTab === 'riwayat' ? 'text-primary-600' : 'text-slate-400'} />
          <span>Riwayat Transaksi & Cetak Kuitansi</span>
          {paginationMeta?.total !== undefined && (
            <span
              className={`text-2xs px-1.5 py-0.5 rounded font-semibold ${
                activeTab === 'riwayat'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {paginationMeta.total} Data
            </span>
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* KONTEN TAB 1: FORM TRANSAKSI KASIR LOKET                  */}
      {/* ========================================================= */}
      {activeTab === 'kasir' && (
        <div className="space-y-6">
          {/* LANGKAH 1: PENCARIAN & IDENTITAS MAHASISWA */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Identitas Mahasiswa / Pembayar</h3>
                  <p className="text-2xs text-slate-500">Cari mahasiswa berdasarkan Nama, NIM, atau No. Pendaftaran SPMB.</p>
                </div>
              </div>
              {selectedStudent && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<RotateCcw size={13} />}
                  onClick={handleResetStudent}
                  className="text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Ganti Mahasiswa
                </Button>
              )}
            </div>

            {!selectedStudent ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Select
                    label="Program Studi (opsional — persempit pencarian)"
                    value={searchProdi}
                    onChange={(val) => setSearchProdi(val as string)}
                    options={[{ value: '', label: 'Semua Prodi' }, ...prodiOptions]}
                  />
                  <Select
                    label="Tahun Angkatan (opsional)"
                    value={searchAngkatan}
                    onChange={(val) => setSearchAngkatan(val as string)}
                    options={[{ value: '', label: 'Semua Angkatan' }, ...angkatanOptions]}
                  />
                </div>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Ketik Nama Mahasiswa, NIM, No Pendaftaran SPMB, atau NIK..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={searching}
                      prefixIcon={<Search size={16} className="text-slate-400" />}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={searching || !searchQuery.trim()}
                    className="font-bold text-xs px-5 shadow-xs"
                  >
                    {searching ? <Loader2 size={15} className="animate-spin mr-1.5" /> : null}
                    Cari Mahasiswa
                  </Button>
                </form>

                {/* Hasil Pencarian Mahasiswa */}
                {searchResults.length > 0 && (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden max-h-72 overflow-y-auto">
                    {searchResults.map((m) => {
                      const studentId = m.id || m.mahasiswa_id || m.calon_mahasiswa_id;
                      return (
                        <div
                          key={studentId}
                          className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                              {m.nama_mahasiswa?.charAt(0) || 'M'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">{m.nama_mahasiswa}</span>
                                {m.is_calon_mahasiswa ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                                    SPMB
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                                    SIAKAD
                                  </span>
                                )}
                              </div>
                              <span className="text-2xs text-slate-500 font-mono block">
                                {m.nim && m.nim !== '-' ? `NIM: ${m.nim}` : `No. Reg: ${m.no_pendaftaran || '-'}`} • {m.prodi || 'Program Studi'}
                                {m.tahun_angkatan ? ` • Angkatan ${m.tahun_angkatan}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {m.total_unpaid_amount !== undefined && (
                              <div className="text-right">
                                <span className="text-2xs text-slate-500 block">Sisa Tagihan</span>
                                <span className="text-xs font-mono font-bold text-rose-700">
                                  {formatRupiah(m.total_unpaid_amount)}
                                </span>
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectStudent(m)}
                              className="font-bold text-xs"
                            >
                              Pilih
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Mahasiswa Terpilih Info Card */
              <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                    {selectedStudent.nama_mahasiswa?.charAt(0) || 'M'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-sm text-slate-900">{selectedStudent.nama_mahasiswa}</h4>
                      {selectedStudent.is_calon_mahasiswa ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                          SPMB CALON MAHASISWA
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                          MAHASISWA AKTIF SIAKAD
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="font-mono font-semibold">
                        {selectedStudent.nim && selectedStudent.nim !== '-'
                          ? `NIM: ${selectedStudent.nim}`
                          : `No Reg: ${selectedStudent.no_pendaftaran || '-'}`}
                      </span>
                      <span>•</span>
                      <span>{selectedStudent.prodi || '-'}</span>
                      {selectedStudent.tahun_angkatan && (
                        <>
                          <span>•</span>
                          <span>Angkatan {selectedStudent.tahun_angkatan}</span>
                        </>
                      )}
                      {selectedStudent.jalur_kelas && (
                        <>
                          <span>•</span>
                          <span>Kelas {selectedStudent.jalur_kelas}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-right w-full sm:w-auto">
                  <span className="text-2xs text-slate-500 uppercase tracking-wider font-bold block">
                    Total Tagihan Aktif
                  </span>
                  <span className="text-sm font-extrabold font-mono text-primary-700">
                    {bills.length} Invoice Tagihan
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* INFORMASI DISPENSASI (KETIKA MAHASISWA MEMINTA CICILAN) */}
          {selectedStudent && (
            <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-950">
                    Mahasiswa Meminta Skema Cicilan atau Penundaan Pembayaran?
                  </h4>
                  <p className="text-2xs text-amber-900 mt-0.5 leading-relaxed">
                    Jika mahasiswa belum dapat melunasi tagihan secara penuh dan memerlukan skema cicilan bertahap atau perpanjangan jatuh tempo, silakan ajukan <strong>Dispensasi Pembayaran</strong> terlebih dahulu agar disetujui pimpinan keuangan.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(
                    `/sikeu/dispensasi/create?mahasiswa_id=${selectedStudent.id || selectedStudent.mahasiswa_id}`
                  )
                }
                className="text-xs font-bold border-amber-300 text-amber-900 bg-white hover:bg-amber-100 shrink-0 w-full sm:w-auto shadow-2xs"
              >
                Ajukan Dispensasi Cicilan
              </Button>
            </div>
          )}

          {/* LANGKAH 2: PILIH TAGIHAN YANG DIBAYAR */}
          {selectedStudent && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Daftar Tagihan Belum Lunas</h3>
                    <p className="text-2xs text-slate-500">Pilih satu atau beberapa tagihan yang akan dibayarkan oleh mahasiswa.</p>
                  </div>
                </div>

                {bills.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllBills}
                    className="text-xs font-bold"
                  >
                    {selectedBillIds.length === bills.length ? 'Batalkan Semua' : 'Pilih Semua Tagihan'}
                  </Button>
                )}
              </div>

              {loadingBills ? (
                <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-primary-600" /> Memuat daftar tagihan...
                </div>
              ) : bills.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-600 mb-2" />
                  <p className="font-bold text-slate-800">Tidak ada tagihan yang belum lunas</p>
                  <p className="mt-0.5 text-slate-500">Seluruh tagihan mahasiswa ini sudah terbayar lunas atau belum ada tagihan diterbitkan.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {bills.map((bill) => {
                    const isChecked = selectedBillIds.includes(bill.id);
                    return (
                      <div
                        key={bill.id}
                        onClick={() => handleToggleBill(bill.id)}
                        className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked ? 'bg-primary-50/50' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900">
                                {bill.nomor_tagihan}
                              </span>
                              <span className="text-2xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                {bill.jenis || bill.periode_label || 'Tagihan Kuliah'}
                              </span>
                              {bill.status === 'sebagian' && (
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                  Dibayar Sebagian
                                </span>
                              )}
                            </div>
                            <span className="text-2xs text-slate-500 font-mono block mt-0.5">
                              Jatuh Tempo: {bill.jatuh_tempo || '-'} • Total Tagihan: {formatRupiah(bill.total_tagihan)}
                              {Number(bill.total_bayar) > 0 ? ` • Sudah Bayar: ${formatRupiah(bill.total_bayar)}` : ''}
                            </span>
                            {bill.details && bill.details.length > 1 && (
                              <div className="mt-1.5 space-y-0.5">
                                {bill.details.map((d) => {
                                  const terbayar = Number(d.terbayar || 0);
                                  const sisaD = d.sisa !== undefined ? Number(d.sisa) : Number(d.nominal_bersih) - terbayar;
                                  return (
                                    <div key={d.id} className="flex items-center justify-between gap-3 text-[11px] font-mono">
                                      <span className="text-slate-500 truncate">{d.master_biaya}</span>
                                      <span className="shrink-0">
                                        <span className="text-emerald-700 font-semibold">{formatRupiah(terbayar)}</span>
                                        <span className="text-slate-300"> / </span>
                                        <span className={sisaD > 0 ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold'}>
                                          sisa {formatRupiah(sisaD)}
                                        </span>
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-2xs text-slate-500 block">Sisa Harus Dibayar</span>
                          <span className="text-sm font-mono font-extrabold text-rose-600">
                            {formatRupiah(bill.sisa)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedBillIds.length > 0 && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-slate-700">
                    {selectedBillIds.length} tagihan dipilih
                  </span>
                  <div className="text-right">
                    <span className="text-slate-500 text-2xs block">Total Sisa Tagihan Terpilih:</span>
                    <span className="font-extrabold text-primary-700 text-sm">
                      {formatRupiah(totalSisaSelected)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LANGKAH 3: FORM PROSES PEMBAYARAN KASIR */}
          {selectedStudent && selectedBillIds.length > 0 && (
            <form onSubmit={handleSubmitPayment} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Proses Transaksi Pembayaran</h3>
                  <p className="text-2xs text-slate-500">Pilih metode pembayaran loket dan tentukan nominal yang diterima kasir.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Metode / Channel Pembayaran"
                  options={[
                    { value: 'LOKET_TUNAI', label: 'Tunai di Loket Kasir Kampus' },
                    { value: 'LOKET_TRANSFER', label: 'Transfer Manual Rekening Resmi Kampus' },
                  ]}
                  value={channelBayar}
                  onChange={(val) => setChannelBayar(val as any)}
                />

                <div>
                  <Input
                    label="Nominal Pembayaran Diterima (Rp)"
                    type="number"
                    placeholder="Contoh: 2500000"
                    value={jumlahBayar}
                    onChange={(e) => setJumlahBayar(e.target.value)}
                    required
                  />
                  <div className="flex items-center justify-between mt-1 text-2xs">
                    <span className="text-slate-500">Maksimal sisa: {formatRupiah(totalSisaSelected)}</span>
                    <button
                      type="button"
                      onClick={handleSetFullPayment}
                      className="text-primary-700 font-bold hover:underline"
                    >
                      Bayar Penuh Sisa
                    </button>
                  </div>
                </div>
              </div>

              <Input
                label="Catatan / Nomor Referensi Bukti (Opsional)"
                placeholder="Contoh: Tunai via Ibu Siti / Bukti transfer BCA 12345"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="text-xs">
                  <span className="text-slate-500">Total Dibayarkan: </span>
                  <span className="font-mono font-extrabold text-emerald-700 text-sm">
                    {formatRupiah(Number(jumlahBayar) || 0)}
                  </span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting || Number(jumlahBayar) <= 0}
                  className="font-bold text-xs px-6 py-2.5 shadow-sm min-h-[40px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin mr-1.5" />
                      Memproses Transaksi...
                    </>
                  ) : (
                    <>
                      <CreditCard size={15} className="mr-1.5" />
                      Proses Pembayaran Kasir
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* KONTEN TAB 2: RIWAYAT TRANSAKSI & AUDIT PEMBAYARAN        */}
      {/* ========================================================= */}
      {activeTab === 'riwayat' && (
        <div className="space-y-4">
          {/* ACTIVE FILTER PILLS */}
          {(filterSearch || filterStatus || filterChannel || filterTglMulai || filterTglSelesai) && (
            <div className="flex items-center gap-2 flex-wrap text-2xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
              <span className="font-bold text-slate-500">Filter Aktif:</span>
              {filterSearch && (
                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-semibold text-slate-700">
                  Pencarian: &ldquo;{filterSearch}&rdquo;
                </span>
              )}
              {filterStatus && (
                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-semibold text-slate-700">
                  Status: {filterStatus}
                </span>
              )}
              {filterChannel && (
                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-semibold text-slate-700">
                  Kanal: {filterChannel}
                </span>
              )}
              {(filterTglMulai || filterTglSelesai) && (
                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-semibold text-slate-700">
                  Periode: {filterTglMulai || '...'} s/d {filterTglSelesai || '...'}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setFilterStatus('');
                  setFilterChannel('');
                  setFilterTglMulai('');
                  setFilterTglSelesai('');
                  setFilterSearch('');
                  setPage(1);
                }}
                className="text-rose-600 font-bold hover:underline ml-1"
              >
                Reset Semua
              </button>
            </div>
          )}

          {/* MANDATORY DATA TABLE (Rule 5) */}
          <DataTable
            columns={columns}
            data={pembayaranList}
            isLoading={loadingHistory}
            meta={paginationMeta}
            onPageChange={(newPage) => setPage(newPage)}
            emptyMessage={
              <div className="p-8 text-center text-slate-500 text-xs">
                <Receipt size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-700">Belum ada riwayat transaksi pembayaran</p>
                <p className="mt-0.5 text-slate-400">Transaksi pembayaran yang diproses di kasir atau secara online akan tercatat di sini.</p>
              </div>
            }
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* FILTER DRAWER SLIDE KANAN-KE-KIRI (Rule 6 & Rule 7)       */}
      {/* ========================================================= */}
      <Drawer
        open={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        title="Filter Riwayat Pembayaran"
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterSearch('');
                setFilterStatus('');
                setFilterChannel('');
                setFilterTglMulai('');
                setFilterTglSelesai('');
                setFilterSortBy('waktu_bayar');
                setFilterSortDir('desc');
                setPage(1);
                setShowFilterDrawer(false);
              }}
              className="text-xs font-bold"
            >
              Reset Filter
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setPage(1);
                setShowFilterDrawer(false);
                fetchPaymentHistory();
              }}
              className="text-xs font-bold px-4"
            >
              Terapkan
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-1">
          <Input
            label="Pencarian Transaksi / Mahasiswa"
            placeholder="Ketik Kode Trx, NIM, Nama, No. Tagihan, atau VA..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            prefixIcon={<Search size={16} className="text-slate-400" />}
          />

          <Select
            label="Status Transaksi"
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
            options={[
              { value: '', label: 'Semua Status Transaksi' },
              { value: 'success', label: 'Berhasil (Success)' },
              { value: 'pending', label: 'Menunggu (Pending)' },
              { value: 'reversed', label: 'Dibatalkan (Reversed)' },
            ]}
          />

          <Select
            label="Kanal Pembayaran"
            value={filterChannel}
            onChange={(val) => setFilterChannel(val)}
            options={[
              { value: '', label: 'Semua Kanal Pembayaran' },
              { value: 'LOKET_TUNAI', label: 'Tunai di Kasir Loket' },
              { value: 'LOKET_TRANSFER', label: 'Transfer Manual Rekening Loket' },
              { value: 'VIRTUAL_ACCOUNT', label: 'Virtual Account Online (Xendit)' },
            ]}
          />

          <div className="space-y-1.5">
            <span className="text-2xs font-bold text-slate-600 block uppercase tracking-wider">
              Rentang Waktu Transaksi
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Dari Tanggal"
                type="date"
                value={filterTglMulai}
                onChange={(e) => setFilterTglMulai(e.target.value)}
              />
              <Input
                label="Sampai Tanggal"
                type="date"
                value={filterTglSelesai}
                onChange={(e) => setFilterTglSelesai(e.target.value)}
              />
            </div>
          </div>

          <hr className="border-t border-slate-200 my-2" />

          {/* Opsi Pengurutan 2 Kolom (Rule 6) */}
          <div className="space-y-1.5">
            <span className="text-2xs font-bold text-slate-600 block uppercase tracking-wider">
              Pengurutan Data
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Select
                label="Urut Berdasarkan"
                value={filterSortBy}
                onChange={(val) => setFilterSortBy(val)}
                options={[
                  { value: 'waktu_bayar', label: 'Waktu Bayar' },
                  { value: 'jumlah_bayar', label: 'Nominal Bayar' },
                  { value: 'kode_transaksi', label: 'Kode Transaksi' },
                  { value: 'id', label: 'ID Transaksi' },
                ]}
              />
              <Select
                label="Arah"
                value={filterSortDir}
                onChange={(val) => setFilterSortDir(val as 'asc' | 'desc')}
                options={[
                  { value: 'desc', label: 'Terbaru / Z-A' },
                  { value: 'asc', label: 'Terlama / A-Z' },
                ]}
              />
            </div>
          </div>
        </div>
      </Drawer>

      {/* ========================================================= */}
      {/* MODAL LIHAT RINCIAN TRANSAKSI                             */}
      {/* ========================================================= */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setDetailItem(null);
        }}
        title="Rincian Transaksi Pembayaran"
        size="md"
      >
        {detailItem && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Kode Transaksi:</span>
                <span className="font-mono font-extrabold text-slate-900 text-sm">
                  {detailItem.kode_transaksi}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Waktu Bayar:</span>
                <span className="font-medium text-slate-900">{formatDateTime(detailItem.waktu_bayar)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mahasiswa:</span>
                <span className="font-bold text-slate-900">{detailItem.nama_mahasiswa}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">NIM / No. Reg:</span>
                <span className="font-mono text-slate-800">
                  {detailItem.nim !== '-' ? detailItem.nim : detailItem.no_pendaftaran}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Program Studi:</span>
                <span className="text-slate-800">{detailItem.program_studi || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nomor Tagihan:</span>
                <span className="font-mono font-bold text-slate-800">
                  {detailItem.tagihan?.nomor_tagihan || (detailItem.tagihan_id ? `TAG-#${detailItem.tagihan_id}` : '-')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Uraian Tagihan:</span>
                <span className="text-slate-800 font-medium">
                  {detailItem.rincian_pembayaran || 'Biaya Pendidikan Mahasiswa'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kanal Pembayaran:</span>
                <span className="font-bold text-slate-900">
                  {detailItem.channel_bayar === 'LOKET_TUNAI'
                    ? 'Tunai di Loket Kasir Kampus'
                    : detailItem.channel_bayar === 'LOKET_TRANSFER'
                      ? 'Transfer Manual Rekening Loket'
                      : detailItem.channel_bayar === 'TRANSFER_BANK' || detailItem.channel_bayar === 'MIGRASI'
                        ? 'Transfer Bank (Migrasi / Manual)'
                        : detailItem.channel_bayar && !String(detailItem.channel_bayar).toUpperCase().includes('XENDIT') && !String(detailItem.channel_bayar).toUpperCase().includes('VA')
                          ? detailItem.channel_bayar
                          : 'Virtual Account Online (Xendit)'}
                </span>
              </div>
              {detailItem.virtual_account?.va_number && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Nomor VA:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {detailItem.virtual_account.va_number} ({detailItem.virtual_account.bank_nama})
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-700 font-bold">Jumlah Dibayar:</span>
                <span className="font-mono font-black text-emerald-700 text-base">
                  {formatRupiah(detailItem.jumlah_bayar)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status Pembayaran:</span>
                <span className="font-extrabold uppercase text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {detailItem.status}
                </span>
              </div>
              {detailItem.catatan && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-500 block text-2xs mb-0.5">Catatan Kasir / Sistem:</span>
                  <p className="text-slate-700 italic">{detailItem.catatan}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<Printer size={14} />}
                  onClick={() => handlePrintReceipt(detailItem)}
                  className="text-xs font-bold"
                >
                  Cetak Kuitansi
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<ShieldCheck size={14} className="text-emerald-600" />}
                  onClick={() => {
                    window.open(`/validasi-pembayaran/${encodeURIComponent(detailItem.kode_transaksi)}`, '_blank');
                  }}
                  className="text-xs font-bold text-emerald-800 bg-emerald-50/50 border-emerald-200"
                >
                  Verifikasi Publik
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDetailModal(false);
                  setDetailItem(null);
                }}
                className="text-xs font-bold"
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* MODAL KUITANSI PEMBAYARAN KASIR LOKET BARU                */}
      {/* ========================================================= */}
      <Modal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        title="Kuitansi Bukti Pembayaran Loket"
        size="lg"
      >
        {receiptData && (
          <div className="space-y-4">
            <div className="printable-document print-document p-6 border-2 border-slate-900 rounded-2xl bg-white space-y-4 text-slate-900 relative overflow-hidden shadow-xs print:p-0 print:border-none print:shadow-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10 rotate-[-25deg] select-none">
                <span className="text-6xl font-black text-emerald-800 uppercase tracking-widest border-8 border-emerald-800 px-8 py-4 rounded-3xl">
                  {receiptData.status_tagihan || 'LUNAS'}
                </span>
              </div>

              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-sm uppercase text-slate-900 tracking-wide">
                    UNIVERSITAS SSO CAMPUS
                  </h3>
                  <h4 className="font-bold text-xs text-slate-700 uppercase">
                    Kuitansi Bukti Pembayaran Kasir Loket
                  </h4>
                  <p className="text-2xs text-slate-500">
                    Bagian Administrasi Keuangan • Sistem Terpadu Pembayaran Kuliah
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-900">
                    {receiptData.kode_transaksi}
                  </div>
                  <div className="text-2xs text-slate-500">Tgl: {receiptData.tanggal}</div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded uppercase mt-1 inline-block bg-emerald-100 text-emerald-800 border border-emerald-300">
                    STATUS: {receiptData.status_tagihan || 'LUNAS'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Telah Terima Dari:</span>
                  <span className="font-bold text-slate-900">{receiptData.student?.nama_mahasiswa}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NIM / No. Pendaftaran:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {receiptData.student?.nim !== '-' ? receiptData.student?.nim : receiptData.student?.no_pendaftaran}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Program Studi:</span>
                  <span className="text-slate-800 font-medium">
                    {receiptData.student?.prodi || '-'} {receiptData.student?.tahun_angkatan ? `(Angkatan ${receiptData.student?.tahun_angkatan})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kanal Pembayaran:</span>
                  <span className="font-bold text-slate-800">
                    {receiptData.channel === 'LOKET_TUNAI' ? 'Tunai di Loket Kasir Kampus' : 'Transfer Rekening Resmi Kampus'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">
                  Uang Sejumlah:
                </span>
                <p className="font-serif italic font-bold text-slate-800 text-xs mt-0.5">
                  &quot;{angkaTerbilang(receiptData.jumlah_bayar)}&quot;
                </p>
              </div>

              <div>
                <p className="text-2xs uppercase tracking-wider font-bold text-slate-600 mb-1.5">
                  Rincian Tagihan yang Dibayar:
                </p>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs overflow-hidden">
                  <div className="p-2.5 flex justify-between bg-white font-mono">
                    <span className="text-slate-700">{receiptData.nomor_tagihan}</span>
                    <span className="font-bold text-slate-900">{formatRupiah(receiptData.jumlah_bayar)}</span>
                  </div>
                  <div className="p-2.5 flex justify-between bg-slate-900 text-white font-bold">
                    <span>Jumlah Diterima:</span>
                    <span className="font-mono text-amber-300 text-sm">{formatRupiah(receiptData.jumlah_bayar)}</span>
                  </div>
                  <div className="p-2.5 flex justify-between bg-white text-2xs">
                    <span className="text-slate-500">Sisa Tagihan Setelah Bayar:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatRupiah(receiptData.sisa_setelah_bayar || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-end pt-6 text-xs text-center">
                <div className="w-44">
                  <p className="text-2xs text-slate-500">Mahasiswa / Penyetor,</p>
                  <div className="mt-14 border-t border-slate-800 font-bold text-slate-900 pt-1">
                    {receiptData.student?.nama_mahasiswa || 'Mahasiswa'}
                  </div>
                </div>
                <div className="w-48">
                  <p className="text-2xs font-bold text-slate-600 mb-1.5">Tanda Tangan Digital & Verifikasi:</p>
                  {modalQrUrl ? (
                    <div className="flex flex-col items-center">
                      <img src={modalQrUrl} alt="QR Code Verifikasi" className="w-20 h-20 rounded shadow-2xs border border-slate-200" />
                      <span className="text-[9px] font-mono text-slate-400 mt-1">Scan QR verifikasi keaslian</span>
                    </div>
                  ) : (
                    <div className="mt-12" />
                  )}
                  <div className="mt-2 border-t border-slate-800 font-bold text-slate-900 pt-1">
                    {receiptData.kasir || 'Admin Keuangan'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2 print:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Printer size={14} />}
                onClick={() => handlePrintReceipt(receiptData)}
                className="text-xs font-bold"
              >
                Cetak Kuitansi
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReceiptModal(false)}
                  className="text-xs font-bold"
                >
                  Tutup
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setShowReceiptModal(false);
                    handleTabChange('riwayat');
                  }}
                  className="text-xs font-bold"
                >
                  Lihat di Riwayat Transaksi
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function BayarKasirMahasiswaPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center">
          <Loader2 className="animate-spin mx-auto text-primary-600" size={24} />
          <p className="mt-2 text-xs text-slate-500 font-medium">Memuat halaman pembayaran...</p>
        </div>
      }
    >
      <BayarKasirContent />
    </Suspense>
  );
}
