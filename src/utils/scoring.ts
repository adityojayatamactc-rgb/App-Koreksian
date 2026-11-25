import { ComputedGrade, StudentSubmission, SubjectConfig } from '../types/assessment';

export function computeSubmissionGrade(
  submission: StudentSubmission,
  subject: SubjectConfig
): ComputedGrade {
  const pgTotal = subject.pgCount;
  let pgCorrect = 0;
  let lowConfidenceCount = 0;
  let overriddenCount = 0;

  for (let i = 0; i < pgTotal; i++) {
    const item = submission.mcAnswers[i];
    const key = subject.answerKey[i];
    if (item) {
      if (item.editedAnswer && key && item.editedAnswer === key) {
        pgCorrect += 1;
      }
      if (item.confidence === 'low' && !item.overriddenByTeacher) {
        lowConfidenceCount += 1;
      }
      if (item.overriddenByTeacher) {
        overriddenCount += 1;
      }
    }
  }

  let essayRawScore = 0;
  let essayMaxScore = 0;

  for (let i = 0; i < subject.essayCount; i++) {
    const rubric = subject.essayRubrics[i];
    const maxS = rubric ? rubric.maxScore : 20;
    essayMaxScore += maxS;

    const essayItem = submission.essayAnswers[i];
    if (essayItem) {
      const clamped = Math.max(0, Math.min(maxS, Number(essayItem.teacherScore) || 0));
      essayRawScore += clamped;
      if (essayItem.confidence === 'low' && !essayItem.overriddenByTeacher) {
        lowConfidenceCount += 1;
      }
      if (essayItem.overriddenByTeacher) {
        overriddenCount += 1;
      }
    }
  }

  const pgScore100 = pgTotal > 0 ? (pgCorrect / pgTotal) * 100 : 0;
  const essayScore100 = essayMaxScore > 0 ? (essayRawScore / essayMaxScore) * 100 : 0;

  const totalWeight = subject.pgWeight + subject.essayWeight || 100;
  const finalScore =
    (pgScore100 * subject.pgWeight + essayScore100 * subject.essayWeight) / totalWeight;

  return {
    pgCorrect,
    pgTotal,
    pgScore100: Number(pgScore100.toFixed(1)),
    essayRawScore: Number(essayRawScore.toFixed(1)),
    essayMaxScore,
    essayScore100: Number(essayScore100.toFixed(1)),
    finalScore: Number(finalScore.toFixed(1)),
    passedKkm: finalScore >= subject.kkm,
    lowConfidenceCount,
    overriddenCount,
  };
}

export function exportSubjectGradesToCsv(
  subject: SubjectConfig,
  submissions: StudentSubmission[]
): void {
  const headers = [
    'No',
    'NIS',
    'Nama Siswa',
    'Kelas',
    'Mata Pelajaran',
    `PG Benar (/${subject.pgCount})`,
    'Nilai PG (0-100)',
    'Skor Esai Mentah',
    'Nilai Esai (0-100)',
    'Nilai Akhir',
    'KKM',
    'Keterangan',
    'Status Verifikasi Guru',
    'Jumlah Edit Guru',
  ];

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = submissions.map((sub, idx) => {
    const g = computeSubmissionGrade(sub, subject);
    return [
      idx + 1,
      sub.studentId || '-',
      sub.studentName || 'Tanpa Nama',
      sub.studentClass || '-',
      subject.name,
      `${g.pgCorrect}/${g.pgTotal}`,
      g.pgScore100.toFixed(1),
      `${g.essayRawScore}/${g.essayMaxScore}`,
      g.essayScore100.toFixed(1),
      g.finalScore.toFixed(1),
      subject.kkm,
      g.passedKkm ? 'Tuntas' : 'Remedial',
      sub.status === 'verified' ? 'Terverifikasi' : 'Perlu Review',
      g.overriddenCount,
    ]
      .map(escapeCsv)
      .join(',');
  });

  const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  link.href = url;
  link.setAttribute('download', `rekap-nilai-${safeName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
