import React, { useMemo, useState } from 'react';
import { Download, Search, Trash2 } from 'lucide-react';
import { StudentSubmission, SubjectConfig } from '../types/assessment';
import { computeSubmissionGrade, exportSubjectGradesToCsv } from '../utils/scoring';
import { BackupRestorePanel } from './BackupRestorePanel';

interface ScoreRecapViewProps {
  subjects: SubjectConfig[];
  selectedSubjectId: string;
  onSelectSubject: (id: string) => void;
  submissions: StudentSubmission[];
  onOpenSubmissionInEditor: (subjectId: string, submissionId: string) => void;
  onDeleteSubmission: (submissionId: string) => void;
  onExportBackup: () => string;
  onImportBackup: (
    file: File,
    mode: 'merge' | 'replace'
  ) => Promise<{ subjectsCount: number; submissionsCount: number }>;
}

export const ScoreRecapView: React.FC<ScoreRecapViewProps> = ({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  submissions,
  onOpenSubmissionInEditor,
  onDeleteSubmission,
  onExportBackup,
  onImportBackup,
}) => {
  const activeSubject =
    subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'needs_review'>(
    'all'
  );

  const subjectSubmissions = useMemo(
    () => submissions.filter((s) => s.subjectId === activeSubject.id),
    [submissions, activeSubject.id]
  );

  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return subjectSubmissions.filter((sub) => {
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
      if (!q) return true;
      return (
        sub.studentName.toLowerCase().includes(q) ||
        sub.studentId.toLowerCase().includes(q) ||
        sub.studentClass.toLowerCase().includes(q)
      );
    });
  }, [subjectSubmissions, searchQuery, statusFilter]);

  const metrics = useMemo(() => {
    if (subjectSubmissions.length === 0) {
      return {
        total: 0,
        avgScore: 0,
        passRate: 0,
        needsReview: 0,
      };
    }
    let sum = 0;
    let passed = 0;
    let needsReview = 0;
    for (const sub of subjectSubmissions) {
      const g = computeSubmissionGrade(sub, activeSubject);
      sum += g.finalScore;
      if (g.passedKkm) passed += 1;
      if (sub.status === 'needs_review') needsReview += 1;
    }
    return {
      total: subjectSubmissions.length,
      avgScore: Number((sum / subjectSubmissions.length).toFixed(1)),
      passRate: Math.round((passed / subjectSubmissions.length) * 100),
      needsReview,
    };
  }, [subjectSubmissions, activeSubject]);

  const itemAnalysis = useMemo(() => {
    const counts = Array.from({ length: activeSubject.pgCount }, (_, idx) => ({
      number: idx + 1,
      correctCount: 0,
    }));
    if (subjectSubmissions.length === 0) return counts;

    for (const sub of subjectSubmissions) {
      for (let i = 0; i < activeSubject.pgCount; i++) {
        const ans = sub.mcAnswers[i]?.editedAnswer;
        if (ans && ans === activeSubject.answerKey[i]) {
          counts[i].correctCount += 1;
        }
      }
    }
    return counts;
  }, [subjectSubmissions, activeSubject]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
            Rekap Nilai &amp; Analisis Butir Soal
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pantau hasil koreksi per mapel, ketuntasan KKM, dan ekspor leger nilai ke CSV Excel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <select
            value={activeSubject.id}
            onChange={(e) => onSelectSubject(e.target.value)}
            className="px-3 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            {subjects.map((subj) => (
              <option key={subj.id} value={subj.id}>
                {subj.name} ({subj.pgCount} PG + 5 Esai)
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={subjectSubmissions.length === 0}
            onClick={() => exportSubjectGradesToCsv(activeSubject, subjectSubmissions)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-700 rounded-lg hover:bg-indigo-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Unduh Rekap CSV</span>
          </button>
        </div>
      </div>

      {/* 4-column Summary Metrics Strip */}
      <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-4">
          <div className="text-xs text-slate-500">Lembar Terkoreksi</div>
          <div className="mt-1 text-2xl font-mono font-bold text-slate-900 tabular-nums">
            {metrics.total} Siswa
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">Rata-Rata Nilai Akhir</div>
          <div className="mt-1 text-2xl font-mono font-bold text-slate-900 tabular-nums">
            {metrics.avgScore.toFixed(1)}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">Ketuntasan (KKM {activeSubject.kkm})</div>
          <div className="mt-1 text-2xl font-mono font-bold text-emerald-700 tabular-nums">
            {metrics.passRate}%
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">Menunggu Verifikasi Guru</div>
          <div className="mt-1 text-2xl font-mono font-bold text-amber-700 tabular-nums">
            {metrics.needsReview} Lembar
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa, NIS, atau kelas..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('needs_review')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              statusFilter === 'needs_review'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Perlu Review
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('verified')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              statusFilter === 'verified'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Terverifikasi
          </button>
        </div>
      </div>

      {/* High-Density Grade Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4 text-right">PG Benar</th>
                <th className="py-3 px-4 text-right">Nilai PG</th>
                <th className="py-3 px-4 text-right">Skor Esai</th>
                <th className="py-3 px-4 text-right">Nilai Akhir</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-slate-500">
                    Belum ada data nilai siswa yang cocok untuk filter ini.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const g = computeSubmissionGrade(sub, activeSubject);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-600 tabular-nums">
                        {sub.studentId || '-'}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {sub.studentName}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-600">
                        {sub.studentClass || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs tabular-nums text-slate-700">
                        {g.pgCorrect}/{g.pgTotal}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs tabular-nums text-slate-700">
                        {g.pgScore100.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs tabular-nums text-slate-700">
                        {g.essayRawScore}/{g.essayMaxScore}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono font-bold tabular-nums ${
                          g.passedKkm ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {g.finalScore.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        <span
                          className={
                            sub.status === 'verified'
                              ? 'text-emerald-700 font-medium'
                              : 'text-amber-700 font-medium'
                          }
                        >
                          {sub.status === 'verified' ? 'Terverifikasi' : 'Perlu Review'}
                        </span>
                        <span className="text-slate-400"> · </span>
                        <span className="text-slate-600">
                          {g.passedKkm ? 'Tuntas' : 'Remedial'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenSubmissionInEditor(activeSubject.id, sub.id)
                            }
                            className="text-xs font-semibold text-indigo-700 hover:underline cursor-pointer"
                          >
                            Edit / Periksa
                          </button>
                          <button
                            type="button"
                            aria-label={`Hapus ${sub.studentName}`}
                            onClick={() => onDeleteSubmission(sub.id)}
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item Analysis Chart */}
      {subjectSubmissions.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Analisis Ketuntasan Per Butir PG (No. 1–{activeSubject.pgCount})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Persentase siswa menjawab benar per nomor soal untuk evaluasi daya serap materi.
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Basis: {subjectSubmissions.length} lembar siswa
            </div>
          </div>

          <div className="mt-4 grid grid-cols-5 sm:grid-cols-10 gap-2">
            {itemAnalysis.map((item) => {
              const pct = Math.round(
                (item.correctCount / subjectSubmissions.length) * 100
              );
              return (
                <div
                  key={item.number}
                  className="border border-slate-200 rounded-lg p-2 flex flex-col justify-between bg-slate-50/50"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 tabular-nums">
                    <span>#{String(item.number).padStart(2, '0')}</span>
                    <span className="font-semibold text-slate-900">{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        pct >= 70
                          ? 'bg-emerald-600'
                          : pct >= 45
                          ? 'bg-amber-500'
                          : 'bg-red-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <BackupRestorePanel
        subjects={subjects}
        submissions={submissions}
        onExportBackup={onExportBackup}
        onImportBackup={onImportBackup}
      />
    </div>
  );
};
