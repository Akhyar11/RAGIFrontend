'use client';

import { use } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import QuizEngine from '@/components/lms/QuizEngine';

interface PageProps {
  params: Promise<{ kelasId: string; quizId: string }>;
}

export default function KerjakanQuizPage({ params }: PageProps) {
  const { kelasId, quizId } = use(params);
  const numericKelasId = Number(kelasId);
  const backUrl = numericKelasId > 0 ? `/lms/${numericKelasId}` : '/lms/tryout';

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Kerjakan Quiz / Tryout"
        description="Jawaban tersimpan otomatis tiap 30 detik"
        backUrl={backUrl}
      />
      <QuizEngine quizId={Number(quizId)} />
    </div>
  );
}
