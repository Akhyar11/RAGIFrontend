'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { lmsService } from '@/services/lms.service';
import { siakadService } from '@/services/siakad.service';
import { getApiErrorMessage } from '@/lib/utils';
import type { LmsQuizKolaborator } from '@/types/lms.types';
import { Plus, Trash2, Lock, Users } from 'lucide-react';
import { extractOptionValue } from './tryoutHelpers';

interface TryoutSoalTabProps {
  quizId: number;
  soal: any[];
  totalSoal: number;
  totalPoin: number;
  totalAttempt: number;
  kolaborators?: LmsQuizKolaborator[];
  onChanged: () => void;
}

export default function TryoutSoalTab({
  quizId,
  soal,
  totalSoal,
  totalPoin,
  totalAttempt,
  kolaborators = [],
  onChanged,
}: TryoutSoalTabProps) {
  const [filterDosenId, setFilterDosenId] = useState<string>('');
  const [onlyTimDosen, setOnlyTimDosen] = useState<boolean>(false);
  const [selectedBankSoal, setSelectedBankSoal] = useState<string>('');
  const [poinSoal, setPoinSoal] = useState<number>(10);
  const [attaching, setAttaching] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const locked = totalAttempt > 0;

  const handleAttach = async () => {
    if (!selectedBankSoal) return;
    setAttaching(true);
    try {
      await lmsService.attachQuizSoal(quizId, { bank_soal_id: Number(selectedBankSoal), poin: poinSoal });
      toast.success('Soal berhasil dilampirkan');
      setSelectedBankSoal('');
      onChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.errors?.bank_soal_id?.[0] || err.response?.data?.message || 'Gagal melampirkan soal');
    } finally {
      setAttaching(false);
    }
  };

  const handleDetach = async () => {
    if (!deleteTarget.id) return;
    setDeleting(true);
    try {
      await lmsService.detachQuizSoal(deleteTarget.id);
      toast.success('Soal dilepas dari tryout');
      setDeleteTarget({ isOpen: false, id: null });
      onChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.errors?.quiz?.[0] || 'Gagal melepas soal (tryout terkunci attempt?)');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDetach = async () => {
    const ids = selectedKeys.map((k) => Number(k)).filter((id) => !Number.isNaN(id));
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      const res = await lmsService.bulkDeleteQuizSoal(quizId, ids);
      toast.success(`${res.data?.deleted ?? ids.length} soal dilepas dari tryout`);
      setSelectedKeys([]);
      setShowBulkDelete(false);
      onChanged();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Gagal melepas soal'));
    } finally {
      setBulkDeleting(false);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'urutan',
      label: 'NO',
      align: 'center',
      render: (s) => <span className="text-xs font-bold text-slate-700">{s.urutan ?? '-'}</span>,
    },
    {
      key: 'soal',
      label: 'SOAL',
      render: (s) => {
        const dosenNama =
          s.bank_soal?.rps?.dosen_pengembang?.nama_lengkap ||
          s.bank_soal?.pembuat?.username ||
          null;
        return (
          <div>
            <span className="text-xs text-slate-800 block line-clamp-2">{s.bank_soal?.pertanyaan || '-'}</span>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              {dosenNama ? (
                <span className="text-2xs text-slate-500">Pembuat: {dosenNama}</span>
              ) : null}
              {s.bank_soal?.gambar_path ? <span className="text-2xs text-slate-400">+ gambar</span> : null}
            </div>
          </div>
        );
      },
    },
    {
      key: 'tipe',
      label: 'TIPE',
      align: 'center',
      render: (s) => <Badge variant="gray">{s.bank_soal?.tipe_soal || '-'}</Badge>,
    },
    {
      key: 'poin',
      label: 'POIN',
      align: 'center',
      render: (s) => <span className="text-xs font-bold text-slate-800">{s.poin}</span>,
    },
    {
      key: 'aksi',
      label: 'AKSI',
      align: 'right',
      render: (s) => (
        <div className="flex justify-end">
          <DropdownMenu
            items={[
              {
                label: 'Lepas',
                icon: <Trash2 size={16} />,
                onClick: () => setDeleteTarget({ isOpen: true, id: s.id }),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Daftar Soal ({totalSoal} soal, {Number(totalPoin || 0)} poin)
          </h5>
          {locked && (
            <Badge variant="yellow">
              <Lock size={12} /> Terkunci — {totalAttempt} attempt sudah masuk
            </Badge>
          )}
        </div>
        {locked && (
          <p className="text-2xs text-slate-500">
            Tryout sudah memiliki attempt mahasiswa — perubahan soal dapat ditolak backend.
          </p>
        )}
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Lampirkan dari Bank Soal Dosen</h5>
            <p className="text-2xs text-slate-500">
              Ambil pertanyaan dari bank soal yang telah diinput oleh dosen pengampu maupun tim dosen kolaborator.
            </p>
          </div>
          {kolaborators.length > 0 ? (
            <Button
              size="sm"
              type="button"
              variant={onlyTimDosen ? 'primary' : 'outline'}
              icon={<Users size={14} />}
              onClick={() => {
                setOnlyTimDosen((prev) => !prev);
                setFilterDosenId('');
                setSelectedBankSoal('');
              }}
            >
              {onlyTimDosen ? 'Filter: Tim Dosen Tryout Aktif' : `Hanya Bank Soal Tim Dosen (${kolaborators.length})`}
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <AsyncSelect
              label="Filter Dosen Pembuat Soal (Opsional)"
              placeholder="Semua dosen..."
              value={filterDosenId}
              isClearable
              loadOptions={async (inputValue: string) => {
                try {
                  const res: any = await siakadService.getDosens({ search: inputValue || undefined, per_page: 20 });
                  const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
                  return items.map((d: any) => ({
                    value: String(d.id),
                    label: `${d.nidn || d.nip || ''} — ${d.nama_lengkap || d.nama}`.trim(),
                  }));
                } catch {
                  return [];
                }
              }}
              onChange={(val: unknown) => {
                setFilterDosenId(extractOptionValue(val));
                setOnlyTimDosen(false);
                setSelectedBankSoal('');
              }}
            />
          </div>
          <div className="md:col-span-2">
            <AsyncSelect
              key={`bank-soal-${filterDosenId}-${onlyTimDosen ? 'tim' : 'all'}`}
              label="Pilih Pertanyaan dari Bank Soal"
              placeholder="Ketik kata kunci pertanyaan..."
              value={selectedBankSoal}
              onChange={(val: unknown) => setSelectedBankSoal(extractOptionValue(val))}
              loadOptions={async (input) => {
                try {
                  const timDosenIds = kolaborators.map((k) => k.dosen_id).filter(Boolean).join(',');
                  const dosenParam = filterDosenId || (onlyTimDosen && timDosenIds ? timDosenIds : undefined);
                  const res: any = await siakadService.getSoalList({
                    search: input,
                    dosen_id: dosenParam,
                    per_page: 25,
                  } as any);
                  const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
                  return items.map((s: any) => {
                    const dosenNama = s.rps?.dosen_pengembang?.nama_lengkap || s.pembuat?.username || '';
                    const mkNama = s.rps?.mata_kuliah?.nama || s.kategori?.nama || '';
                    const metaInfo = [dosenNama, mkNama].filter(Boolean).join(' • ');
                    return {
                      value: String(s.id),
                      label: `[${s.tipe_soal}] ${(s.pertanyaan || '').slice(0, 75)}${metaInfo ? ` — (${metaInfo})` : ''}`,
                    };
                  });
                } catch {
                  return [];
                }
              }}
              isClearable
            />
            <a href="/lms/bank-soal/create" className="text-2xs mt-1 inline-block" style={{ color: 'var(--module-primary)' }}>Buat soal baru di Bank Soal →</a>
          </div>
        </div>
        <div className="flex justify-end gap-2 items-end pt-1">
          <div className="w-32">
            <Input type="number" label="Poin Soal" min={1} value={poinSoal} onChange={(e) => setPoinSoal(Number(e.target.value))} />
          </div>
          <Button size="sm" icon={<Plus size={16} />} onClick={handleAttach} loading={attaching} disabled={!selectedBankSoal || attaching}>
            Lampirkan ke Tryout
          </Button>
        </div>
      </Card>

      {selectedKeys.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50">
          <span className="text-xs text-slate-700">
            <strong>{selectedKeys.length}</strong> soal terpilih
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelectedKeys([])} disabled={bulkDeleting}>
              Batal Pilih
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 size={16} />}
              onClick={() => setShowBulkDelete(true)}
              disabled={bulkDeleting || locked}
            >
              Lepas Terpilih
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={soal}
        selectable={!locked}
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        meta={{ current_page: 1, last_page: 1, per_page: soal.length || 50, total: totalSoal }}
        onPageChange={() => {}}
        emptyMessage="Belum ada soal. Lampirkan dari bank soal di atas."
      />

      <ConfirmDialog
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={handleBulkDetach}
        isLoading={bulkDeleting}
        title="Lepas Soal Terpilih"
        message={<span>Yakin melepas <strong>{selectedKeys.length}</strong> soal dari tryout ini?</span>}
        confirmText="Lepas"
        cancelText="Batal"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={deleteTarget.isOpen}
        onClose={() => setDeleteTarget({ isOpen: false, id: null })}
        onConfirm={handleDetach}
        isLoading={deleting}
        title="Lepas Soal"
        message={<span>Yakin melepas soal ini dari tryout?</span>}
        confirmText="Lepas"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
}
