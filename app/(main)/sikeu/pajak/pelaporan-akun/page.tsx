'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileSignature, Save, Search } from 'lucide-react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { sikeuService } from '@/services/sikeu.service';
import type { PaginationMeta } from '@/types/api.types';
import type { PajakAkunAlias, PajakPelaporanMode } from '@/types/sikeu.types';

function getApiErrorMessage(error: unknown): string | undefined {
  if (!isAxiosError(error)) return undefined;
  const responseData: unknown = error.response?.data;
  if (
    typeof responseData === 'object' &&
    responseData !== null &&
    'message' in responseData &&
    typeof responseData.message === 'string'
  ) {
    return responseData.message;
  }
  return undefined;
}

export default function PajakPelaporanAkunPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('sikeu.pajak_akun.manage');
  const [accounts, setAccounts] = useState<PajakAkunAlias[]>([]);
  const [aliasDrafts, setAliasDrafts] = useState<Record<number, string>>({});
  const [mode, setMode] = useState<PajakPelaporanMode>('dev');
  const [meta, setMeta] = useState<PaginationMeta>();
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savingMode, setSavingMode] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await sikeuService.getPajakAkunAliases({
        search: search || undefined,
        page,
        per_page: 15,
      });
      const rows = response.data ?? [];
      setAccounts(rows);
      setAliasDrafts(Object.fromEntries(rows.map((account) => [account.id, account.nama_akun_pajak ?? ''])));
      setMode(response.mode ?? 'dev');
      setMeta(response.meta);
    } catch (error) {
      console.error('Gagal memuat alias akun pelaporan pajak', error);
      toast.error('Gagal memuat daftar akun pelaporan pajak.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (!canManage) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return loadAccounts();
    });
    return () => {
      active = false;
    };
  }, [canManage, loadAccounts]);

  const saveAlias = useCallback(async (accountId: number) => {
    setSavingId(accountId);
    try {
      await sikeuService.updatePajakAkunAlias(accountId, aliasDrafts[accountId] ?? '');
      toast.success('Nama akun pelaporan pajak berhasil disimpan.');
      await loadAccounts();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error) || 'Gagal menyimpan nama akun pelaporan pajak.');
    } finally {
      setSavingId(null);
    }
  }, [aliasDrafts, loadAccounts]);

  const changeMode = async () => {
    const nextMode: PajakPelaporanMode = mode === 'publik' ? 'dev' : 'publik';
    setSavingMode(true);
    try {
      const response = await sikeuService.updatePajakPelaporanMode(nextMode);
      setMode(response.data?.mode ?? nextMode);
      toast.success(response.message);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error) || 'Gagal mengubah mode pelaporan pajak.');
    } finally {
      setSavingMode(false);
    }
  };

  const columns = useMemo<ColumnDef<PajakAkunAlias>[]>(() => [
    {
      key: 'kode_akun',
      label: 'KODE AKUN',
      render: (row) => <span className="font-mono font-bold">{row.kode_akun}</span>,
    },
    {
      key: 'nama_akun',
      label: 'NAMA AKUN SISTEM',
      render: (row) => <span className="font-medium">{row.nama_akun}</span>,
    },
    {
      key: 'nama_akun_pajak',
      label: 'NAMA AKUN PELAPORAN PAJAK',
      render: (row) => (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              aria-label={`Nama akun pajak ${row.kode_akun}`}
              value={aliasDrafts[row.id] ?? ''}
              placeholder="Gunakan nama akun sistem"
              onChange={(event) => setAliasDrafts((drafts) => ({
                ...drafts,
                [row.id]: event.target.value,
              }))}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Save size={14} />}
            loading={savingId === row.id}
            onClick={() => void saveAlias(row.id)}
          >
            Simpan
          </Button>
        </div>
      ),
    },
  ], [aliasDrafts, saveAlias, savingId]);

  if (!canManage) {
    return (
      <div className="space-y-4">
        <PageHeader title="Mode Pelaporan Pajak" description="Pengaturan nama akun khusus untuk penyajian pelaporan pajak." />
        <div className="card p-6 text-center">
          <p>Anda tidak memiliki izin untuk mengelola mode pelaporan pajak.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mode Pelaporan Pajak"
        description="Atur nama alternatif akun untuk kebutuhan pelaporan pajak tanpa mengubah COA atau jurnal sumber."
      />

      <section className="card">
        <div className="card-body flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <FileSignature size={18} />
              <h2 className="font-bold">Publikasi nama akun pajak</h2>
              <Badge variant={mode === 'publik' ? 'green' : 'gray'}>
                {mode === 'publik' ? 'Publik' : 'Dev / Draf'}
              </Badge>
            </div>
            <p className="text-sm text-slate-600">
              Mode publik mengganti nama akun pada tampilan jurnal, COA, dan buku besar. Mode dev menampilkan nama sistem.
            </p>
          </div>
          <Button
            type="button"
            variant={mode === 'publik' ? 'outline-danger' : 'primary'}
            loading={savingMode}
            onClick={() => void changeMode()}
          >
            {mode === 'publik' ? 'Matikan Mode Publik' : 'Publikasikan Nama Pajak'}
          </Button>
        </div>
      </section>

      <section className="card">
        <div className="card-header flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-bold">Pemetaan nama akun</h2>
            <p className="text-sm text-slate-600">Kosongkan alias untuk memakai nama akun sistem saat mode publik aktif.</p>
          </div>
          <div className="flex w-full items-end gap-2 md:w-auto">
            <div className="min-w-0 flex-1 md:w-72">
              <Input
                label="Cari akun"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setPage(1);
                    setSearch(searchDraft.trim());
                  }
                }}
                prefixIcon={<Search size={16} />}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(1);
                setSearch(searchDraft.trim());
              }}
            >
              Cari
            </Button>
          </div>
        </div>
        <div className="card-body">
          <DataTable
            columns={columns}
            data={accounts}
            isLoading={loading}
            meta={meta}
            onPageChange={setPage}
            emptyMessage="Belum ada akun COA."
          />
        </div>
      </section>
    </div>
  );
}
