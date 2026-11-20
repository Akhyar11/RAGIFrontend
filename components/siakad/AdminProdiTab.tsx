'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Shield, CheckCircle2, XCircle, Filter, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Input } from '@/components/ui/Input';
import { Drawer } from '@/components/ui/Drawer';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { siakadService } from '@/services/siakad.service';
import type { AdminProdiEligiblePersonnel, AdminProdiProgramOption } from '@/types/siakad.types';
import { adminService } from '@/services/admin.service';
import { useAuthStore } from '@/store/authStore';
import { useImpersonateStore } from '@/store/impersonateStore';
import { getCookieDomain, getAuthTokenKey } from '@/lib/domain';
import toast from 'react-hot-toast';

interface AdminProdiTabProps {
  prodis: any[];
  showFilterExternal?: boolean;
  onCloseFilterExternal?: () => void;
  showCreateModalExternal?: boolean;
  onCloseCreateModalExternal?: () => void;
}

export function AdminProdiTab({
  prodis,
  showFilterExternal,
  onCloseFilterExternal,
  showCreateModalExternal,
  onCloseCreateModalExternal,
}: AdminProdiTabProps) {
  const [adminList, setAdminList] = useState<any[]>([]);
  const [adminMeta, setAdminMeta] = useState<any>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [users, setUsers] = useState<AdminProdiEligiblePersonnel[]>([]);
  const [allActiveProdis, setAllActiveProdis] = useState<AdminProdiProgramOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter Drawer State
  const [showFilter, setShowFilter] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterProdiId, setFilterProdiId] = useState('');
  const [filterCanApproveRps, setFilterCanApproveRps] = useState('');
  const [filterIsActive, setFilterIsActive] = useState('');
  const [filterSortBy, setFilterSortBy] = useState('user');
  const [filterSortDir, setFilterSortDir] = useState<'asc' | 'desc'>('asc');
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    programStudiId: '',
    canApproveRps: '',
    isActive: '',
    sortBy: 'user',
    sortDir: 'asc' as 'asc' | 'desc',
  });

  // Auth & Impersonation Store
  const currentUser = useAuthStore((s) => s.user);
  const adminAccessToken = useAuthStore((s) => s.access_token);
  const adminRefreshToken = useAuthStore((s) => s.refresh_token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const startImpersonating = useImpersonateStore((s) => s.startImpersonating);

  // Impersonate State
  const [impersonatingItem, setImpersonatingItem] = useState<any | null>(null);
  const [isImpersonatingSubmitting, setIsImpersonatingSubmitting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (showFilterExternal !== undefined) {
      setShowFilter(showFilterExternal);
    }
  }, [showFilterExternal]);

  useEffect(() => {
    if (showCreateModalExternal) {
      handleOpenModal();
    }
  }, [showCreateModalExternal]);

  // Form State
  const [formProdiId, setFormProdiId] = useState('');
  const [formUserId, setFormUserId] = useState('');
  const [formJabatan, setFormJabatan] = useState('Admin OBE / Tim Kurikulum');
  const [formCanApproveRps, setFormCanApproveRps] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete State
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAdminList = async () => {
    try {
      setLoading(true);
      const res = await siakadService.getAdminProdi({
        program_studi_id: appliedFilters.programStudiId || undefined,
        search: appliedFilters.search || undefined,
        can_approve_rps: appliedFilters.canApproveRps !== '' ? appliedFilters.canApproveRps : undefined,
        is_active: appliedFilters.isActive !== '' ? appliedFilters.isActive : undefined,
        sort_by: appliedFilters.sortBy,
        sort_order: appliedFilters.sortDir,
        page,
        per_page: limit,
      });
      if (res.data) {
        setAdminList(res.data);
        if (res.meta) {
          setAdminMeta(res.meta);
        } else {
          setAdminMeta({
            current_page: 1,
            per_page: res.data.length,
            total: res.data.length,
            last_page: 1,
            from: 1,
            to: res.data.length,
          });
        }
      }
    } catch (err: any) {
      console.error('Error fetching admin prodi:', err);
      toast.error(err?.response?.data?.message || 'Gagal memuat daftar Admin OBE Program Studi');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const firstPage = await siakadService.getAdminProdiEligiblePersonnel({ per_page: 100, page: 1 });
      const firstRows = Array.isArray(firstPage.data) ? firstPage.data : [];
      const totalPages = Math.max(1, Number(firstPage.meta?.last_page || 1));
      const remainingPages = await Promise.all(
        Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
          siakadService.getAdminProdiEligiblePersonnel({ per_page: 100, page: index + 2 })
        )
      );
      setUsers([...firstRows, ...remainingPages.flatMap((response) => Array.isArray(response.data) ? response.data : [])]);
    } catch {
      setUsers([]);
      toast.error('Gagal memuat opsi personel Admin OBE');
    }
  };

  const fetchAllActiveProdis = async () => {
    try {
      const firstPage = await siakadService.getProdi({ per_page: 100, page: 1, include_inactive: false, sort_by: 'nama', sort_order: 'asc' });
      const firstRows = Array.isArray(firstPage.data) ? firstPage.data : [];
      const totalPages = Math.max(1, Number(firstPage.meta?.last_page || 1));
      const remainingPages = await Promise.all(
        Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
          siakadService.getProdi({ per_page: 100, page: index + 2, include_inactive: false, sort_by: 'nama', sort_order: 'asc' })
        )
      );
      setAllActiveProdis([...firstRows, ...remainingPages.flatMap((response) => Array.isArray(response.data) ? response.data : [])]);
    } catch {
      setAllActiveProdis([]);
      toast.error('Gagal memuat seluruh Program Studi aktif');
    }
  };

  useEffect(() => {
    fetchAdminList();
    fetchUsers();
    fetchAllActiveProdis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, page, limit]);

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormProdiId(String(item.program_studi_id));
      setFormUserId(String(item.user_id));
      setFormJabatan(item.jabatan || 'Admin OBE / Tim Kurikulum');
      setFormCanApproveRps(item.can_approve_rps ?? true);
      setFormIsActive(item.is_active ?? true);
    } else {
      setEditingItem(null);
      setFormProdiId(allActiveProdis[0] ? String(allActiveProdis[0].id) : '');
      setFormUserId(users[0] ? String(users[0].id) : '');
      setFormJabatan('Admin OBE / Tim Kurikulum');
      setFormCanApproveRps(true);
      setFormIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProdiId || !formUserId) {
      toast.error('Pilih Program Studi dan Pengguna (User).');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        program_studi_id: Number(formProdiId),
        user_id: Number(formUserId),
        jabatan: formJabatan,
        can_approve_rps: formCanApproveRps,
        is_active: formIsActive,
      };

      if (editingItem) {
        await siakadService.updateAdminProdi(editingItem.id, payload);
        toast.success('Penugasan Admin OBE berhasil diperbarui');
      } else {
        await siakadService.createAdminProdi(payload);
        toast.success('Admin OBE berhasil ditugaskan ke Program Studi');
      }

      setIsModalOpen(false);
      fetchAdminList();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan penugasan Admin OBE');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      setDeleting(true);
      await siakadService.deleteAdminProdi(deletingItem.id);
      toast.success('Penugasan Admin OBE berhasil dihapus');
      setDeletingItem(null);
      fetchAdminList();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menghapus penugasan');
    } finally {
      setDeleting(false);
    }
  };

  const handleApplyFilter = () => {
    setAppliedFilters({
      search: filterSearch,
      programStudiId: filterProdiId,
      canApproveRps: filterCanApproveRps,
      isActive: filterIsActive,
      sortBy: filterSortBy,
      sortDir: filterSortDir,
    });
    setPage(1);
    setShowFilter(false);
  };

  const handleResetFilter = () => {
    setFilterSearch('');
    setFilterProdiId('');
    setFilterCanApproveRps('');
    setFilterIsActive('');
    setFilterSortBy('user');
    setFilterSortDir('asc');
    setAppliedFilters({
      search: '',
      programStudiId: '',
      canApproveRps: '',
      isActive: '',
      sortBy: 'user',
      sortDir: 'asc',
    });
    setPage(1);
    setShowFilter(false);
  };

  const handleOpenImpersonate = (item: any) => {
    if (!item.user) {
      toast.error('Akun pengguna tidak ditemukan.');
      return;
    }
    if (!item.is_active) {
      toast.error('Akun ini sedang nonaktif dan tidak dapat dirasuki.');
      return;
    }
    setImpersonatingItem(item);
  };

  const handleConfirmImpersonate = async () => {
    if (!impersonatingItem) return;
    setIsImpersonatingSubmitting(true);
    try {
      const res = await siakadService.impersonateAdminProdi(impersonatingItem.id);
      const resData = res?.data;
      const targetToken = resData?.token || resData?.access_token;
      const targetUser = resData?.user || impersonatingItem.user;

      if (!targetToken) {
        throw new Error('Gagal mendapatkan token autentikasi dari server.');
      }

      // 1. Simpan sesi admin aktif ke Zustand Impersonate Store
      const tokenKey = getAuthTokenKey();
      const currentAdminToken = adminAccessToken || '';
      const currentAdminRefreshToken = adminRefreshToken || currentAdminToken;

      if (currentUser) {
        startImpersonating(currentAdminToken, currentAdminRefreshToken, currentUser, '/siakad/master/fakultas');
      }

      // 2. Terapkan token dan cookie pengguna yang dirasuki
      const domainAttr = getCookieDomain();
      const roleKey = tokenKey === 'demo_sso_access_token' ? 'demo_sso_user_role' : 'sso_user_role';
      const targetRole = targetUser.roles?.[0]?.role?.slug || targetUser.roles?.[0]?.slug || 'dosen';

      document.cookie = `${tokenKey}=${targetToken}; ${domainAttr}path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `${roleKey}=${targetRole}; ${domainAttr}path=/; max-age=86400; SameSite=Lax`;

      setAuth(targetUser, targetToken, targetToken);

      const targetName = targetUser.name || targetUser.nama_lengkap || targetUser.username;
      toast.success(`Berhasil merasuki ${targetName} (${impersonatingItem.program_studi?.nama})!`);

      // 3. Tetap berada di domain SIAKAD (aman tidak keluar ke SSO/IAM)
      window.location.href = '/siakad/obe';
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal merasuki pengguna.');
      setIsImpersonatingSubmitting(false);
      setImpersonatingItem(null);
    }
  };

  const prodiSelectOptions = [
    { value: '', label: 'Semua Program Studi' },
    ...prodis.map((p) => ({
      value: String(p.id),
      label: `${p.kode_prodi} — ${p.nama}`,
    })),
  ];

  const userSelectOptions = users.map((u) => ({
    value: String(u.id),
    label: `${u.name} — ${[u.personnel_type, u.personnel_identifier, u.homebase].filter(Boolean).join(' · ') || u.username || u.email}`,
  }));

  const columns: ColumnDef<any>[] = [
    {
      key: 'id',
      label: 'NO',
      align: 'center',
      render: (_row, index) => (
        <span className="font-bold text-slate-400 text-xs">
          {adminMeta?.from ? adminMeta.from + index : index + 1}
        </span>
      ),
    },
    {
      key: 'user',
      label: 'NAMA PERSONEL / USER',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">
            {row.user?.name || row.user?.username}
          </span>
          <span className="text-2xs text-slate-500">{row.user?.email || '-'}</span>
        </div>
      ),
    },
    {
      key: 'program_studi',
      label: 'HOMEBASE PROGRAM STUDI',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">
            {row.program_studi?.nama}
          </span>
          <span className="text-2xs text-slate-500 font-mono">
            Kode: {row.program_studi?.kode_prodi} • {row.program_studi?.fakultas?.nama || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'jabatan',
      label: 'PERAN / JABATAN',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-700">
          {row.jabatan || 'Admin OBE'}
        </span>
      ),
    },
    {
      key: 'can_approve_rps',
      label: 'VERIFIKASI RPS',
      align: 'center',
      render: (row) =>
        row.can_approve_rps ? (
          <Badge variant="green" className="flex items-center gap-1 justify-center">
            <CheckCircle2 size={12} /> Boleh
          </Badge>
        ) : (
          <Badge variant="gray" className="flex items-center gap-1 justify-center">
            <XCircle size={12} /> Tidak
          </Badge>
        ),
    },
    {
      key: 'status',
      label: 'STATUS',
      align: 'center',
      render: (row) =>
        row.is_active ? <Badge variant="green">Aktif</Badge> : <Badge variant="red">Nonaktif</Badge>,
    },
    {
      key: 'aksi',
      label: 'AKSI',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end">
          <DropdownMenu
            items={[
              {
                label: 'Rasuki Admin OBE',
                icon: <Sparkles size={14} className="text-amber-500" />,
                onClick: () => handleOpenImpersonate(row),
              },
              {
                label: 'Edit Penugasan',
                icon: <Edit2 size={14} />,
                onClick: () => handleOpenModal(row),
              },
              {
                label: 'Hapus Penugasan',
                icon: <Trash2 size={14} />,
                variant: 'danger',
                onClick: () => setDeletingItem(row),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Hidden Action Buttons for PageHeader triggers */}
      <div className="hidden">
        <button id="admin-prodi-filter-btn" type="button" onClick={() => setShowFilter(true)}>
          Filter
        </button>
        <button id="admin-prodi-create-btn" type="button" onClick={() => handleOpenModal()}>
          Tugaskan
        </button>
      </div>

      {/* Table List */}
      <DataTable
        columns={columns}
        data={adminList}
        isLoading={loading}
        meta={adminMeta}
        onPageChange={(p) => setPage(p)}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        emptyMessage="Belum ada Admin OBE Homebase yang ditugaskan di Program Studi ini."
      />

      {/* Filter Drawer */}
      <Drawer
        isOpen={showFilter}
        onClose={() => {
          setShowFilter(false);
          if (onCloseFilterExternal) onCloseFilterExternal();
        }}
        title="Filter Admin OBE Prodi"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" onClick={handleResetFilter}>
              Reset
            </Button>
            <Button variant="primary" onClick={handleApplyFilter}>
              Terapkan
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-4">
          <Input
            label="Pencarian Nama / User"
            placeholder="Cari nama, email, jabatan..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />

          <Select
            label="Program Studi"
            options={prodiSelectOptions}
            value={filterProdiId}
            onChange={(val) => setFilterProdiId(val)}
          />

          <Select
            label="Hak Verifikasi RPS"
            options={[
              { value: '', label: 'Semua Status Verifikasi' },
              { value: 'true', label: 'Boleh Verifikasi RPS' },
              { value: 'false', label: 'Tidak Boleh Verifikasi' },
            ]}
            value={filterCanApproveRps}
            onChange={(val) => setFilterCanApproveRps(val)}
          />

          <Select
            label="Status Penugasan"
            options={[
              { value: '', label: 'Semua Status' },
              { value: 'true', label: 'Aktif' },
              { value: 'false', label: 'Nonaktif' },
            ]}
            value={filterIsActive}
            onChange={(val) => setFilterIsActive(val)}
          />

          <hr className="border-t border-slate-200 my-1" />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              value={filterSortBy}
              onChange={(val) => setFilterSortBy(val || 'user')}
              options={[
                { value: 'user', label: 'Nama Personel' },
                { value: 'program_studi', label: 'Homebase Prodi' },
                { value: 'jabatan', label: 'Jabatan / Peran' },
                { value: 'created_at', label: 'Tanggal Ditugaskan' },
              ]}
            />
            <Select
              label="Arah"
              value={filterSortDir}
              onChange={(val) => setFilterSortDir((val as 'asc' | 'desc') || 'asc')}
              options={[
                { value: 'asc', label: 'A - Z (Naik)' },
                { value: 'desc', label: 'Z - A (Turun)' },
              ]}
            />
          </div>
        </div>
      </Drawer>

      {/* Modal Form Penugasan */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          if (onCloseCreateModalExternal) onCloseCreateModalExternal();
        }}
        title={editingItem ? 'Edit Penugasan Admin OBE Prodi' : 'Tugaskan Admin OBE Prodi Baru'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Select
              label="Program Studi Homebase *"
              options={allActiveProdis.map((p) => ({ value: String(p.id), label: `${p.kode_prodi} — ${p.nama}` }))}
              value={formProdiId}
              onChange={(val) => setFormProdiId(val)}
              disabled={!!editingItem}
            />

            <AsyncSelect
              label="Pilih Pengguna / Personel *"
              placeholder="Cari nama, username, NIDN/NIP, atau email..."
              loadOptions={async (keyword) => {
                const response = await siakadService.getAdminProdiEligiblePersonnel({ search: keyword, per_page: 100, page: 1 });
                const eligibleUsers = Array.isArray(response.data) ? response.data : [];
                return eligibleUsers.map((person) => ({
                  value: person.id,
                  label: `${person.name} — ${[person.personnel_type, person.personnel_identifier, person.homebase].filter(Boolean).join(' · ') || person.username || person.email}`,
                }));
              }}
              defaultOptions={userSelectOptions}
              value={formUserId}
              onChange={(option: { value: string | number; label: string } | null) => setFormUserId(option?.value ? String(option.value) : '')}
              isClearable
              isDisabled={!!editingItem}
            />

            <Input
              label="Peran / Jabatan di Prodi"
              value={formJabatan}
              onChange={(e) => setFormJabatan(e.target.value)}
              placeholder="Contoh: Admin OBE, Tim Kurikulum, Sekprodi"
              required
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={formCanApproveRps}
                onChange={(e) => setFormCanApproveRps(e.target.checked)}
                className="checkbox"
              />
              <span>Berhak Menyetujui & Memverifikasi Dokumen RPS Dosen</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="checkbox"
              />
              <span>Status Penugasan Aktif</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingItem ? 'Simpan Perubahan' : 'Tugaskan Sekarang'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog Delete */}
      <ConfirmDialog
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDelete}
        title="Hapus Penugasan Admin OBE"
        message={`Apakah Anda yakin ingin menghapus hak akses Admin OBE untuk ${deletingItem?.user?.name || deletingItem?.user?.username} di ${deletingItem?.program_studi?.nama}?`}
        confirmText="Hapus Penugasan"
        variant="danger"
        isLoading={deleting}
      />

      {/* Modal Rasuki Admin OBE */}
      <Modal
        open={!!impersonatingItem}
        onClose={() => setImpersonatingItem(null)}
        title="Rasuki Akun Admin OBE Prodi"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setImpersonatingItem(null)}
              disabled={isImpersonatingSubmitting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              icon={<Sparkles size={16} />}
              onClick={handleConfirmImpersonate}
              loading={isImpersonatingSubmitting}
              disabled={isImpersonatingSubmitting}
            >
              {isImpersonatingSubmitting ? 'Memproses Sesi...' : 'Ya, Rasuki Sekarang'}
            </Button>
          </>
        }
      >
        {impersonatingItem && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-sm">
                {(impersonatingItem.user?.name || impersonatingItem.user?.username || 'AO').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs">
                  {impersonatingItem.user?.name || impersonatingItem.user?.username}
                </div>
                <div className="text-2xs text-slate-500 font-mono">
                  {impersonatingItem.program_studi?.nama} • {impersonatingItem.jabatan || 'Admin OBE'}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan beralih dan masuk ke modul <strong>SIAKAD & OBE</strong> sebagai <strong>{impersonatingItem.user?.name || impersonatingItem.user?.username}</strong> untuk mengelola kurikulum, CPMK/CPL, dan RPS Program Studi <strong>{impersonatingItem.program_studi?.nama}</strong>.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-2xs text-slate-600 flex items-center gap-2">
              <Sparkles size={14} className="text-amber-500 shrink-0" />
              <span>Sesi terisolasi di domain SIAKAD. Anda dapat kembali ke akun admin kapan saja melalui tombol di bilah atas.</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
