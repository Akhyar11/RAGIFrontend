'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { siakadService } from '@/services/siakad.service';
import { isMahasiswaAktif, mahasiswaStatusLabel } from '@/types/siakad.types';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import {
  User,
  MapPin,
  Users,
  GraduationCap,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

import { formatDate } from '@/lib/utils';

export default function MahasiswaProfilPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'biodata' | 'alamat' | 'ortu' | 'riwayat'>('biodata');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingFeeder, setSyncingFeeder] = useState(false);
  const [mahasiswa, setMahasiswa] = useState<any>(null);
  // Form State
  const [formData, setFormData] = useState({
    // Biodata Pribadi
    nik: '',
    nisn: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    jenis_kelamin: 'L',
    agama: 'Islam',
    telepon: '',
    email: '',
    // Alamat & Domisili
    alamat: '',
    rt: '',
    rw: '',
    dusun: '',
    kelurahan: '',
    kecamatan: '',
    kota: '',
    provinsi: '',
    kode_pos: '',
    jenis_tinggal: 'Bersama Orang Tua',
    alat_transportasi: 'Sepeda Motor',
    // Data Orang Tua / Wali
    nama_ibu_kandung: '',
    nik_ibu: '',
    nama_ayah: '',
    nik_ayah: '',
    nama_wali: '',
  });

  const fetchProfil = async () => {
    try {
      setLoading(true);
      const res = await siakadService.getMahasiswaProfil();
      if (res.data) {
        const detail = res.data;
        setMahasiswa(detail);
        setFormData({
          nik: detail.nik || '',
          nisn: detail.nisn || '',
          tempat_lahir: detail.tempat_lahir || '',
          tanggal_lahir: detail.tanggal_lahir ? detail.tanggal_lahir.slice(0, 10) : '',
          jenis_kelamin: detail.jenis_kelamin || 'L',
          agama: detail.agama || 'Islam',
          telepon: detail.telepon || '',
          email: detail.email || detail.user?.email || '',
          alamat: detail.alamat || '',
          rt: detail.rt || '',
          rw: detail.rw || '',
          dusun: detail.dusun || '',
          kelurahan: detail.kelurahan || '',
          kecamatan: detail.kecamatan || '',
          kota: detail.kota || '',
          provinsi: detail.provinsi || '',
          kode_pos: detail.kode_pos || '',
          jenis_tinggal: detail.jenis_tinggal || 'Bersama Orang Tua',
          alat_transportasi: detail.alat_transportasi || 'Sepeda Motor',
          nama_ibu_kandung: detail.nama_ibu_kandung || '',
          nik_ibu: detail.nik_ibu || '',
          nama_ayah: detail.nama_ayah || '',
          nik_ayah: detail.nik_ayah || '',
          nama_wali: detail.nama_wali || '',
        });

      }
    } catch (err: any) {
      toast.error('Gagal memuat profil mahasiswa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfil();
  }, []);



  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await siakadService.updateMahasiswaProfil(formData);
      toast.success(res.message || 'Biodata berhasil diperbarui');
      if (res.data) {
        setMahasiswa(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncFeeder = async () => {
    try {
      setSyncingFeeder(true);
      const res = await siakadService.syncMahasiswaProfilToFeeder();
      toast.success(res.message || 'Biodata berhasil disinkronkan ke Neo Feeder PDDikti');
      await fetchProfil();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal sinkronisasi ke Neo Feeder');
    } finally {
      setSyncingFeeder(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in py-12 text-center text-slate-400">
        <RefreshCw className="animate-spin mx-auto mb-3 text-primary-600" size={28} />
        <p className="text-xs font-semibold">Memuat profil dan data Neo Feeder mahasiswa...</p>
      </div>
    );
  }

  const isTransfer = mahasiswa?.jenis_pendaftaran === 'Peserta Didik Pindahan' || Boolean(mahasiswa?.konversi_transfer || mahasiswa?.konversi_id);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Profil & Biodata Mahasiswa"
        description="Kelola informasi biodata mandiri, alamat domisili, data orang tua, dan status sinkronisasi PDDikti Neo Feeder."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Biodata Mahasiswa' },
        ]}
        action={
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              icon={<RefreshCw size={14} className={syncingFeeder ? 'animate-spin' : ''} />}
              className="font-bold text-xs"
              onClick={handleSyncFeeder}
              disabled={syncingFeeder}
            >
              {syncingFeeder ? 'Sinkronisasi Feeder...' : 'Sinkronkan ke Neo Feeder'}
            </Button>
            <Button
              variant="primary"
              icon={<Save size={15} />}
              className="font-bold text-xs shadow-xs"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Menyimpan...' : 'Simpan Biodata'}
            </Button>
          </div>
        }
      />

      {/* Profil Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={isMahasiswaAktif(mahasiswa?.status) ? 'green' : mahasiswa?.status === 'C' ? 'amber' : 'gray'}>
                {mahasiswaStatusLabel(mahasiswa?.status)}
              </Badge>
              <Badge variant="blue">
                Program Studi: {mahasiswa?.program_studi?.nama || '-'} ({mahasiswa?.program_studi?.jenjang || 'S1'})
              </Badge>
              {isTransfer && (
                <Badge variant="amber">
                  Mahasiswa Transfer / Pindahan
                </Badge>
              )}
              <Badge variant="purple">
                Angkatan {mahasiswa?.angkatan || 2026}
              </Badge>
            </div>

            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white mt-1">
              {mahasiswa?.nama_lengkap || user?.username}
            </h2>
            <p className="text-xs text-slate-300 font-mono">
              NIM: <strong>{mahasiswa?.nim || user?.username}</strong> • NIK: <strong>{mahasiswa?.nik || 'Belum diisi'}</strong> • NISN: <strong>{mahasiswa?.nisn || '-'}</strong>
            </p>
            <p className="text-xs text-slate-300 flex items-center gap-1.5 font-medium pt-1">
              <Users size={14} className="text-primary-400" />
              Dosen Pembimbing Akademik: <strong className="text-white">{mahasiswa?.dosen_wali?.nama_lengkap || 'Dr. Budi Utomo, M.Kom'}</strong>
            </p>
          </div>

          {/* Feeder Status Box */}
          <div className="flex flex-col gap-2 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 shrink-0 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Database size={13} className="text-amber-400" /> ID Feeder Biodata:
              </span>
              <span className="font-mono font-bold text-amber-300">
                {mahasiswa?.id_feeder_biodata || mahasiswa?.id_feeder || 'Belum Disinkronkan'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-2">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <GraduationCap size={13} className="text-emerald-400" /> ID Feeder Riwayat:
              </span>
              <span className="font-mono font-bold text-emerald-300">
                {mahasiswa?.id_feeder_riwayat || 'Belum Disinkronkan'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-2">
              <span className="text-slate-300 font-semibold">Status PDDikti:</span>
              <Badge variant={mahasiswa?.id_feeder_biodata ? 'green' : 'amber'} className="text-3xs font-bold uppercase">
                {mahasiswa?.id_feeder_biodata ? 'Tersinkronisasi' : 'Belum Sinkron'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('biodata')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition -mb-px cursor-pointer whitespace-nowrap ${
            activeTab === 'biodata'
              ? 'border-primary-600 text-primary-600 bg-primary-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <User size={15} />
          1. Biodata Pribadi
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('alamat')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition -mb-px cursor-pointer whitespace-nowrap ${
            activeTab === 'alamat'
              ? 'border-primary-600 text-primary-600 bg-primary-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <MapPin size={15} />
          2. Alamat & Domisili
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ortu')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition -mb-px cursor-pointer whitespace-nowrap ${
            activeTab === 'ortu'
              ? 'border-primary-600 text-primary-600 bg-primary-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users size={15} />
          3. Data Orang Tua / Wali
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('riwayat')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition -mb-px cursor-pointer whitespace-nowrap ${
            activeTab === 'riwayat'
              ? 'border-primary-600 text-primary-600 bg-primary-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <GraduationCap size={15} />
          4. Riwayat Pendidikan & PDDikti
        </button>
      </div>

      {/* Tab Contents Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: BIODATA PRIBADI */}
        {activeTab === 'biodata' && (
          <div className="card p-6 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Identitas Diri Mahasiswa</h3>
                <p className="text-xs text-slate-500">
                  Data identitas resmi sesuai KTP dan Ijazah Sekolah untuk sinkronisasi PDDikti.
                </p>
              </div>
              <span className="badge badge-blue text-2xs font-mono font-bold">Standard PDDIKTI WS</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label font-bold text-slate-700">Nomor Induk Mahasiswa (NIM)</label>
                <input
                  type="text"
                  value={mahasiswa?.nim || ''}
                  disabled
                  className="input w-full bg-slate-100 font-mono font-bold text-slate-500 cursor-not-allowed"
                />
                <p className="text-2xs text-slate-400 mt-1">NIM terdaftar resmi dan dikunci oleh bagian Akademik.</p>
              </div>

              <div>
                <label className="label font-bold text-slate-700">Nama Lengkap Sesuai KTP / Ijazah</label>
                <input
                  type="text"
                  value={mahasiswa?.nama_lengkap || ''}
                  disabled
                  className="input w-full bg-slate-100 font-bold text-slate-700 cursor-not-allowed"
                />
                <p className="text-2xs text-slate-400 mt-1">Perubahan nama resmi wajib melalui Biro Administrasi Akademik (BAAK).</p>
              </div>

              <div>
                <label className="label font-bold text-slate-700">Nomor Induk Kependudukan (NIK)</label>
                <input
                  type="text"
                  maxLength={16}
                  placeholder="16 digit NIK sesuai KTP/KK..."
                  value={formData.nik}
                  onChange={(e) => handleChange('nik', e.target.value)}
                  className="input w-full font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="label font-bold text-slate-700">Nomor Induk Siswa Nasional (NISN)</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="10 digit NISN..."
                  value={formData.nisn}
                  onChange={(e) => handleChange('nisn', e.target.value)}
                  className="input w-full font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="label font-bold text-slate-700">Tempat Lahir</label>
                <input
                  type="text"
                  placeholder="e.g. Jakarta, Surabaya..."
                  value={formData.tempat_lahir}
                  onChange={(e) => handleChange('tempat_lahir', e.target.value)}
                  className="input w-full text-xs font-bold"
                />
              </div>

              <div>
                <label className="label font-bold text-slate-700">Tanggal Lahir</label>
                <input
                  type="date"
                  value={formData.tanggal_lahir}
                  onChange={(e) => handleChange('tanggal_lahir', e.target.value)}
                  className="input w-full text-xs font-bold"
                />
              </div>

              <div>
                <label className="label font-bold text-slate-700">Jenis Kelamin</label>
                <select
                  value={formData.jenis_kelamin}
                  onChange={(e) => handleChange('jenis_kelamin', e.target.value)}
                  className="select w-full text-xs font-bold"
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="label font-bold text-slate-700">Agama</label>
                <select
                  value={formData.agama}
                  onChange={(e) => handleChange('agama', e.target.value)}
                  className="select w-full text-xs font-bold"
                >
                  <option value="Islam">Islam</option>
                  <option value="Kristen">Kristen Protestan</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddha">Buddha</option>
                  <option value="Konghucu">Konghucu</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="label font-bold text-slate-700">Nomor Telepon / WhatsApp</label>
                <input
                  type="text"
                  placeholder="081234567890"
                  value={formData.telepon}
                  onChange={(e) => handleChange('telepon', e.target.value)}
                  className="input w-full font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="label font-bold text-slate-700">Alamat Email Mahasiswa</label>
                <input
                  type="email"
                  placeholder="nama@email.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="input w-full text-xs font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ALAMAT & DOMISILI */}
        {activeTab === 'alamat' && (
          <div className="card p-6 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Alamat & Tempat Tinggal</h3>
                <p className="text-xs text-slate-500">
                  Rincian alamat domisili lengkap untuk keperluan surat menyurat dan sensus PDDikti.
                </p>
              </div>
              <span className="badge badge-purple text-2xs font-bold">Domisili</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="label font-bold text-slate-700">Alamat Jalan / Kompleks / No. Rumah</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Jl. Anggrek No. 12 RT 01 RW 04..."
                  value={formData.alamat}
                  onChange={(e) => handleChange('alamat', e.target.value)}
                  className="textarea w-full text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label font-bold text-slate-700">RT</label>
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="001"
                    value={formData.rt}
                    onChange={(e) => handleChange('rt', e.target.value)}
                    className="input w-full font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="label font-bold text-slate-700">RW</label>
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="002"
                    value={formData.rw}
                    onChange={(e) => handleChange('rw', e.target.value)}
                    className="input w-full font-mono text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="label font-bold text-slate-700">Dusun / Kampung</label>
                <input
                  type="text"
                  placeholder="Dusun Krajan..."
                  value={formData.dusun}
                  onChange={(e) => handleChange('dusun', e.target.value)}
                  className="input w-full text-xs font-bold"
                />
              </div>

              <div>
                <label className="label font-bold text-slate-700">Kelurahan / Desa</label>
                <input
                  type="text"
                  placeholder="Kelurahan..."
                  value={formData.kelurahan}
                  onChange={(e) => handleChange('kelurahan', e.target.value)}
                  className="input w-full text-xs font-bold"
                />
              </div>

              <div>
                <label className="label font-bold text-slate-700">Kecamatan</label>
                <input
                  type="text"
                  placeholder="Kecamatan..."
                  value={formData.kecamatan}
                  onChange={(e) => handleChange('kecamatan', e.target.value)}
                  className="input w-full text-xs font-bold"
                />
              </div>

              <div>
                <label className="label font-bold text-slate-700">Kota / Kabupaten</label>
                <input
                  type="text"
                  placeholder="Kota / Kabupaten..."
                  value={formData.kota}
                  onChange={(e) => handleChange('kota', e.target.value)}
                  className="input w-full text-xs font-bold"
                />
              </div>

              <div>
                <label className="label font-bold text-slate-700">Provinsi</label>
                <input
                  type="text"
                  placeholder="Provinsi..."
                  value={formData.provinsi}
                  onChange={(e) => handleChange('provinsi', e.target.value)}
                  className="input w-full text-xs font-bold"
                />
              </div>

              <div>
                <label className="label font-bold text-slate-700">Kode Pos</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="12345"
                  value={formData.kode_pos}
                  onChange={(e) => handleChange('kode_pos', e.target.value)}
                  className="input w-full font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="label font-bold text-slate-700">Jenis Tempat Tinggal</label>
                <select
                  value={formData.jenis_tinggal}
                  onChange={(e) => handleChange('jenis_tinggal', e.target.value)}
                  className="select w-full text-xs font-bold"
                >
                  <option value="Bersama Orang Tua">Bersama Orang Tua</option>
                  <option value="Wali">Bersama Wali</option>
                  <option value="Kost">Kost</option>
                  <option value="Asrama">Asrama Mahasiswa</option>
                  <option value="Panti Asuhan">Panti Asuhan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="label font-bold text-slate-700">Alat Transportasi ke Kampus</label>
                <select
                  value={formData.alat_transportasi}
                  onChange={(e) => handleChange('alat_transportasi', e.target.value)}
                  className="select w-full text-xs font-bold"
                >
                  <option value="Sepeda Motor">Sepeda Motor</option>
                  <option value="Mobil Pribadi">Mobil Pribadi</option>
                  <option value="Angkutan Umum">Angkutan Umum / Bus</option>
                  <option value="Jalan Kaki">Jalan Kaki</option>
                  <option value="Sepeda">Sepeda</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DATA ORANG TUA / WALI */}
        {activeTab === 'ortu' && (
          <div className="card p-6 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Data Orang Tua / Wali</h3>
                <p className="text-xs text-slate-500">
                  Nama Ibu Kandung bersifat <strong>Wajib Valid</strong> sesuai ketentuan data pokok PDDIKTI.
                </p>
              </div>
              <span className="badge badge-amber text-2xs font-bold">Wajib PDDIKTI</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-primary-50/50 p-4 rounded-xl border border-primary-100 space-y-4 md:col-span-2">
                <span className="text-xs font-extrabold text-primary-900 uppercase flex items-center gap-1.5">
                  <Users size={14} className="text-primary-600" /> Data Ibu Kandung
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label font-bold text-slate-700">Nama Lengkap Ibu Kandung *</label>
                    <input
                      type="text"
                      placeholder="Nama Ibu Kandung sesuai Akta Lahir..."
                      value={formData.nama_ibu_kandung}
                      onChange={(e) => handleChange('nama_ibu_kandung', e.target.value)}
                      className="input w-full text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="label font-bold text-slate-700">NIK Ibu Kandung</label>
                    <input
                      type="text"
                      maxLength={16}
                      placeholder="16 digit NIK Ibu..."
                      value={formData.nik_ibu}
                      onChange={(e) => handleChange('nik_ibu', e.target.value)}
                      className="input w-full font-mono text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 md:col-span-2">
                <span className="text-xs font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
                  <Users size={14} className="text-slate-600" /> Data Ayah Kandung
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label font-bold text-slate-700">Nama Lengkap Ayah</label>
                    <input
                      type="text"
                      placeholder="Nama Ayah Kandung..."
                      value={formData.nama_ayah}
                      onChange={(e) => handleChange('nama_ayah', e.target.value)}
                      className="input w-full text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="label font-bold text-slate-700">NIK Ayah</label>
                    <input
                      type="text"
                      maxLength={16}
                      placeholder="16 digit NIK Ayah..."
                      value={formData.nik_ayah}
                      onChange={(e) => handleChange('nik_ayah', e.target.value)}
                      className="input w-full font-mono text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="label font-bold text-slate-700">Nama Lengkap Wali (Opsional)</label>
                <input
                  type="text"
                  placeholder="Diisi jika tinggal bersama wali..."
                  value={formData.nama_wali}
                  onChange={(e) => handleChange('nama_wali', e.target.value)}
                  className="input w-full text-xs font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RIWAYAT PENDIDIKAN & STATUS FEEDER */}
        {activeTab === 'riwayat' && (
          <div className="card p-6 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Riwayat Akademik & Status Neo Feeder</h3>
                <p className="text-xs text-slate-500">
                  Struktur rekaman registrasi mahasiswa yang dilaporkan ke database nasional PDDIKTI.
                </p>
              </div>
              <span className="badge badge-green text-2xs font-bold">Neo Feeder WS</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-slate-500 font-bold block">Program Studi Terdaftar</span>
                <strong className="text-sm text-slate-900 block font-bold">
                  {mahasiswa?.program_studi?.nama} ({mahasiswa?.program_studi?.jenjang})
                </strong>
                <span className="font-mono text-2xs text-slate-500 block">
                  Kode Dikti: {mahasiswa?.program_studi?.kode_prodi_dikti || '55201'} • Fakultas {mahasiswa?.program_studi?.fakultas?.nama || 'Teknologi Informasi'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-slate-500 font-bold block">Jalur Masuk & Status Pendaftaran</span>
                <strong className="text-sm text-slate-900 block font-bold">
                  {mahasiswa?.jalur_masuk || (isTransfer ? 'Jalur Transfer / Pindahan' : 'Seleksi Mandiri')}
                </strong>
                <span className="text-2xs text-emerald-600 font-bold block">
                  Tipe: {isTransfer ? 'Peserta Didik Pindahan (Transfer SKS)' : 'Peserta Didik Baru'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-slate-500 font-bold block">Periode Masuk & Tahun Angkatan</span>
                <strong className="text-sm font-mono text-slate-900 block font-bold">
                  {mahasiswa?.angkatan}1 ({mahasiswa?.angkatan}/{Number(mahasiswa?.angkatan || 2026) + 1} Ganjil)
                </strong>
                <span className="text-2xs text-slate-500 block">
                  Terdaftar sejak: {formatDate(mahasiswa?.tanggal_masuk || '2026-08-01')}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-slate-500 font-bold block">Dosen Pembimbing Akademik</span>
                <strong className="text-sm text-slate-900 block font-bold">
                  {mahasiswa?.dosen_wali?.nama_lengkap || 'Dr. Budi Utomo, M.Kom'}
                </strong>
                <span className="font-mono text-2xs text-slate-500 block">
                  NIDN: {mahasiswa?.dosen_wali?.nidn || '0012058501'}
                </span>
              </div>
            </div>


          </div>
        )}

        {/* Bottom Save Action Button */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            icon={<Save size={15} />}
            className="font-bold min-w-[160px] shadow-xs"
            disabled={saving}
          >
            {saving ? 'Menyimpan...' : 'Simpan Biodata'}
          </Button>
        </div>
      </form>
    </div>
  );
}
