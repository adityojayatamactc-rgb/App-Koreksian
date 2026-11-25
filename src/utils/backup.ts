import { StudentSubmission, SubjectConfig } from '../types/assessment';

export interface AssessmentBackupPayload {
  format: 'asesmen-smk-backup';
  version: 1;
  exportedAt: string;
  subjects: SubjectConfig[];
  submissions: StudentSubmission[];
}

export function exportBackupJson(
  subjects: SubjectConfig[],
  submissions: StudentSubmission[]
): string {
  const payload: AssessmentBackupPayload = {
    format: 'asesmen-smk-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    subjects,
    submissions,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dateTag = new Date().toISOString().slice(0, 10);
  const fileName = `backup-asesmen-smk-${dateTag}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return fileName;
}

export function parseAndValidateBackupJson(rawText: string): AssessmentBackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Berkas bukan format JSON yang valid.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Struktur berkas cadangan tidak valid.');
  }

  const record = parsed as Record<string, unknown>;
  if (record.format !== 'asesmen-smk-backup') {
    throw new Error('Berkas ini bukan cadangan resmi AsesmenSMK.');
  }

  if (!Array.isArray(record.subjects) || record.subjects.length === 0) {
    throw new Error('Data mata pelajaran pada berkas cadangan kosong atau rusak.');
  }

  if (!Array.isArray(record.submissions)) {
    throw new Error('Data lembar siswa pada berkas cadangan tidak valid.');
  }

  for (const subj of record.subjects) {
    if (
      !subj ||
      typeof subj !== 'object' ||
      typeof (subj as SubjectConfig).id !== 'string' ||
      typeof (subj as SubjectConfig).name !== 'string' ||
      !Array.isArray((subj as SubjectConfig).answerKey) ||
      !Array.isArray((subj as SubjectConfig).essayRubrics)
    ) {
      throw new Error('Format salah satu mata pelajaran dalam cadangan tidak sesuai.');
    }
  }

  for (const sub of record.submissions) {
    if (
      !sub ||
      typeof sub !== 'object' ||
      typeof (sub as StudentSubmission).id !== 'string' ||
      typeof (sub as StudentSubmission).subjectId !== 'string' ||
      !Array.isArray((sub as StudentSubmission).mcAnswers) ||
      !Array.isArray((sub as StudentSubmission).essayAnswers)
    ) {
      throw new Error('Format salah satu lembar nilai siswa dalam cadangan tidak sesuai.');
    }
  }

  return {
    format: 'asesmen-smk-backup',
    version: 1,
    exportedAt:
      typeof record.exportedAt === 'string'
        ? record.exportedAt
        : new Date().toISOString(),
    subjects: record.subjects as SubjectConfig[],
    submissions: record.submissions as StudentSubmission[],
  };
}

export function mergeBackupData(
  currentSubjects: SubjectConfig[],
  currentSubmissions: StudentSubmission[],
  backup: AssessmentBackupPayload
): { subjects: SubjectConfig[]; submissions: StudentSubmission[] } {
  const subjectMap = new Map<string, SubjectConfig>();
  for (const s of currentSubjects) subjectMap.set(s.id, s);
  for (const s of backup.subjects) subjectMap.set(s.id, s);

  const submissionMap = new Map<string, StudentSubmission>();
  for (const sub of currentSubmissions) submissionMap.set(sub.id, sub);
  for (const sub of backup.submissions) submissionMap.set(sub.id, sub);

  return {
    subjects: Array.from(subjectMap.values()),
    submissions: Array.from(submissionMap.values()).sort((a, b) =>
      b.uploadedAt.localeCompare(a.uploadedAt)
    ),
  };
}
