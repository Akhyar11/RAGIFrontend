'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { siakadService } from '@/services/siakad.service';
import toast from 'react-hot-toast';

export default function CreateMahasiswaPage() {
  const router = useRouter();

  const [prodis, setProdis] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [form, setForm] = useState({
    nama_lengkap: '',
    nim: '',
    nik: '',
    program_studi_id: 1,
    angkatan: new Date().getFullYear(),
    jenis_kelamin: 'L',
    status: 'A',
    telepon: '',
    alamat: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoadingInitial(true);
        const pRes = await siakadService.getProdi();
        const pData = pRes.data || [];
        setProdis(pData);

        if (pData[0]) {
          setForm((prev) => ({ ...prev, program_studi_id: pData[0].id }));
        }
      } catch (err) {
        toast.error('Gagal memuat daftar program studi / dosen');
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nama_lengkap) {
      toast.error('Nama Lengkap Mahasiswa wajib diisi');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        nama_lengkap: form.nama_lengkap,
        nik: form.nik,
        program_studi_id: form.program_studi_id,
        angkatan: form.angkatan,
        jenis_kelamin: form.jenis_kelamin,
        telepon: form.telepon,
        alamat: form.alamat,
      };
      if (!form.nim) {
        await siakadService.generateNim(payload);
        toast.success('Mahasiswa & NIM baru berhasil di-generate!');
      } else {
        payload.nim = form.nim;
        await siakadService.createMahasiswa(payload);
        toast.success('Mahasiswa baru berhasil ditambahkan!');
      }
      router.push('/siakad/civitas/mahasiswa');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan data mahasiswa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Tambah Mahasiswa Baru"
        description="Pendaftaran data induk mahasiswa, pemilihan program studi, alokasi dosen pembimbing akademik, dan penomoran NIM otomatis."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Civitas Mahasiswa', href: '/siakad/civitas/mahasiswa' },
          { label: 'Tambah Mahasiswa' },
        ]}
        action={
          <Button
            variant="outline"
            icon={<ArrowLeft size={16} />}
            onClick={() => router.push('/siakad/civitas/mahasiswa')}
            style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
          >
            Kembali
          </Button>
        }
      />

      <div className="card p-6 bg-white border border-slate-200 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900">1. Identitas Pokok Mahasiswa</h3>
            <p className="text-2xs text-slate-500">Nama lengkap, identitas kependudukan, jenis kelamin, dan nomor kontak.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Nama Lengkap Mahasiswa *"
                required
                placeholder="Contoh: Budi Santoso"
                value={form.nama_lengkap}
                onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
              />
            </div>

            <Input
              label="Nomor Induk Kependudukan (NIK)"
              placeholder="16 digit NIK KTP/KK"
              maxLength={16}
              value={form.nik}
              onChange={(e) => setForm({ ...form, nik: e.target.value })}
            />

            <Input
              label="NIM (Kosongkan bila ingin auto-generate)"
              placeholder="Kosong = Auto-generate sistem"
              value={form.nim}
              onChange={(e) => setForm({ ...form, nim: e.target.value })}
            />

            <div>
              <label className="label">Jenis Kelamin *</label>
              <select
                value={form.jenis_kelamin}
                onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })}
                className="select w-full"
                required
              >
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>

            <Input
              label="Nomor Telepon / WhatsApp"
              type="tel"
              placeholder="081234567890"
              value={form.telepon}
              onChange={(e) => setForm({ ...form, telepon: e.target.value })}
            />
          </div>

          <div className="border-b border-slate-100 pb-3 pt-2">
            <h3 className="font-extrabold text-sm text-slate-900">2. Program Studi & Pembimbing Akademik</h3>
            <p className="text-2xs text-slate-500">Program studi penempatan, tahun angkatan masuk, dan Dosen Wali (PA).</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Program Studi *</label>
              <select
                value={form.program_studi_id}
                onChange={(e) => setForm({ ...form, program_studi_id: parseInt(e.target.value) })}
                className="select w-full"
                required
              >
                {prodis.map((p) => (
                  <option key={p.id} value={p.id}>{p.nama} ({p.jenjang || 'S1'})</option>
                ))}
              </select>
            </div>

            <Input
              label="Tahun Angkatan Masuk *"
              type="number"
              required
              min={2000}
              max={2100}
              value={form.angkatan}
              onChange={(e) => {
                const next = parseInt(e.target.value) || new Date().getFullYear();
                setForm((prev) => ({ ...prev, angkatan: next }));
              }}
            />

            <div className="lg:col-span-2 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1">
              <span className="text-xs font-bold text-slate-800">Penempatan Kelas & Dosen PA</span>
              <p className="text-2xs text-slate-500 leading-relaxed">
                Penetapan rombongan belajar (Kelas) dan penugasan Dosen Pembimbing Akademik (PA) dikelola terpusat melalui modul <strong>OBE &gt; Pemetaan Mahasiswa Kelas</strong> setelah mahasiswa resmi terdaftar.
              </p>
            </div>

            <div className="lg:col-span-3">
              <Input
                label="Alamat Domisili Tempat Tinggal"
                placeholder="Jl. Raya Kampus No. 12, Kelurahan, Kecamatan, Kota"
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/siakad/civitas/mahasiswa')}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Save size={16} />}
              loading={saving}
              disabled={saving || loadingInitial}
            >
              {saving ? 'Menyimpan...' : 'Simpan Data Mahasiswa'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
