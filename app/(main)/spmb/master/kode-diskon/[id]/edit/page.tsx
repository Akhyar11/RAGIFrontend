'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { KodeDiskonForm } from '@/components/spmb/KodeDiskonForm';
import { spmbService } from '@/services/spmb.service';
import type { SpmbKodeDiskon } from '@/types/spmb.types';

export default function EditKodeDiskonPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [initial, setInitial] = useState<SpmbKodeDiskon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setLoading(false);
      return;
    }
    spmbService.getKodeDiskon(id)
      .then((response) => setInitial(response.data || null))
      .catch(() => toast.error('Gagal memuat detail kode diskon.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-6 text-center text-sm text-slate-500">Memuat data...</div>;
  if (!initial) return <div className="py-6 text-center text-sm text-slate-500">Kode diskon tidak ditemukan.</div>;
  return <KodeDiskonForm mode="edit" initial={initial} />;
}
