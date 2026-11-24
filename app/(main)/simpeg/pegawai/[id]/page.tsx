'use client';

import { use } from 'react';
import { PegawaiDetailView } from '@/components/simpeg/PegawaiDetailView';

export default function DetailPegawaiPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const pegawaiId = Number(resolvedParams.id);

  return <PegawaiDetailView pegawaiId={pegawaiId} backUrl="/simpeg/pegawai" />;
}
