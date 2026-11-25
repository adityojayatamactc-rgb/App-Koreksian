import React, { useState } from 'react';
import { Check, ClipboardPaste, RotateCcw } from 'lucide-react';
import { McOption, StudentSubmission, SubjectConfig } from '../types/assessment';
import { BackupRestorePanel } from './BackupRestorePanel';

interface SubjectManagerProps {
  subjects: SubjectConfig[];
  selectedSubjectId: string;
  onSelectSubject: (id: string) => void;
  onUpdateSubject: (updated: SubjectConfig) => void;
  onResetDefaults: () => void;
  submissions: StudentSubmission[];
  onExportBackup: () => string;
  onImportBackup: (
    file: File,
    mode: 'merge' | 'replace'
  ) => Promise<{ subjectsCount: number; submissionsCount: number }>;
}

const PG_OPTIONS: McOption[] = ['A', 'B', 'C', 'D', 'E'];

export const SubjectManager: React.FC<SubjectManagerProps> = ({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  onUpdateSubject,
  onResetDefaults,
  submissions,
  onExportBackup,
  onImportBackup,
}) => {
  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const [bulkKeyInput, setBulkKeyInput] = useState('');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const flashSaved = (msg: string) => {
    setSaveFeedback(msg);
    window.setTimeout(() => setSaveFeedback(null), 2200);
  };

  const handleFieldChange = <K extends keyof SubjectConfig>(
    key: K,
    value: SubjectConfig[K]
  ) => {
    onUpdateSubject({
      ...activeSubject,
      [key]: value,
    });
  };

  const handlePgCountChange = (newCount: 40 | 45) => {
    const nextKeys = [...activeSubject.answerKey];
    while (nextKeys.length < newCount) {
      nextKeys.push('A');
    }
    onUpdateSubject({
      ...activeSubject,
      pgCount: newCount,
      answerKey: nextKeys.slice(0, newCount),
    });
    flashSaved(`Format soal diubah ke ${newCount} PG + 5 Esai`);
  };

  const handleWeightChange = (pgWeight: number) => {
    const clampedPg = Math.max(0, Math.min(100, pgWeight));
    onUpdateSubject({
      ...activeSubject,
      pgWeight: clampedPg,
      essayWeight: 100 - clampedPg,
    });
  };

  const handleSetAnswerKey = (index: number, option: McOption) => {
    const nextKeys = [...activeSubject.answerKey];
    nextKeys[index] = option;
    onUpdateSubject({
      ...activeSubject,
      answerKey: nextKeys,
    });
  };

  const handleApplyBulkKeys = () => {
    const letters = bulkKeyInput
      .toUpperCase()
      .replace(/[^A-E]/g, '')
      .split('') as McOption[];
    if (letters.length === 0) return;

    const nextKeys = [...activeSubject.answerKey];
    for (let i = 0; i < activeSubject.pgCount; i++) {
      if (letters[i]) {
        nextKeys[i] = letters[i];
      }
    }
    onUpdateSubject({
      ...activeSubject,
      answerKey: nextKeys,
    });
    setBulkKeyInput('');
    flashSaved(
      `${Math.min(letters.length, activeSubject.pgCount)} kunci PG berhasil diterapkan`
    );
  };

  const handleRubricChange = (
    idx: number,
    field: 'prompt' | 'criteria' | 'maxScore',
    value: string | number
  ) => {
    const nextRubrics = activeSubject.essayRubrics.map((r, rIdx) =>
      rIdx === idx ? { ...r, [field]: value } : r
    );
    onUpdateSubject({
      ...activeSubject,
      essayRubrics: nextRubrics,
    });
  };

  const totalEssayMax = activeSubject.essayRubrics.reduce(
    (sum, r) => sum + (Number(r.maxScore) || 0),
    0
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
            Konfigurasi 8 Mapel, Kunci PG &amp; Rubrik Esai
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            7 mapel standar (40 PG · 5 Esai) dan 1 mapel kejuruan (45 PG · 5 Esai). Setiap
            perubahan tersimpan otomatis.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {saveFeedback && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              {saveFeedback}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              onResetDefaults();
              flashSaved('Konfigurasi mapel dikembalikan ke bawaan');
            }}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset Bawaan</span>
          </button>
        </div>
      </div>

      <div className="mt-6">
        <BackupRestorePanel
          subjects={subjects}
          submissions={submissions}
          onExportBackup={onExportBackup}
          onImportBackup={onImportBackup}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Subject List Sidebar */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70">
            <h2 className="text-sm font-semibold text-slate-900">
              Daftar Mata Pelajaran ({subjects.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {subjects.map((subj, idx) => {
              const isSelected = subj.id === activeSubject.id;
              return (
                <button
                  key={subj.id}
                  type="button"
                  onClick={() => onSelectSubject(subj.id)}
                  className={`w-full text-left px-4 py-3 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-50/80 text-indigo-950'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <span className="text-sm font-semibold truncate">{subj.name}</span>
                    </div>
                    <div className="mt-0.5 pl-6 text-xs text-slate-500 tabular-nums">
                      {subj.code} · {subj.pgCount} PG · {subj.essayCount} Esai · KKM {subj.kkm}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-xs font-semibold text-indigo-700 whitespace-nowrap shrink-0">
                      Aktif
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Subject Editor */}
        <div className="lg:col-span-8 space-y-6">
          {/* General Metadata & Weights */}
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-base font-semibold text-slate-900">
              Identitas &amp; Bobot Penilaian Mapel
            </h2>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nama Mata Pelajaran
                </label>
                <input
                  type="text"
                  value={activeSubject.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Kode Mapel
                </label>
                <input
                  type="text"
                  value={activeSubject.code}
                  onChange={(e) => handleFieldChange('code', e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  KKM / Batas Tuntas
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={activeSubject.kkm}
                  onChange={(e) => handleFieldChange('kkm', Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Tingkat &amp; Kompetensi Keahlian
                </label>
                <input
                  type="text"
                  value={activeSubject.gradeLevel}
                  onChange={(e) => handleFieldChange('gradeLevel', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Format Jumlah PG
                </label>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => handlePgCountChange(40)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      activeSubject.pgCount === 40
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    40 PG + 5 Esai
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePgCountChange(45)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      activeSubject.pgCount === 45
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    45 PG + 5 Esai
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Bobot PG : Esai (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={activeSubject.pgWeight}
                    onChange={(e) => handleWeightChange(Number(e.target.value))}
                    className="w-20 px-2.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    : {activeSubject.essayWeight}%
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Answer Key Grid */}
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Kunci Jawaban Pilihan Ganda ({activeSubject.pgCount} Nomor)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Klik huruf per nomor atau tempel deretan kunci sekaligus (mis.{' '}
                  <span className="font-mono">ABCDE...</span>).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={bulkKeyInput}
                  onChange={(e) => setBulkKeyInput(e.target.value)}
                  placeholder={`Tempel ${activeSubject.pgCount} huruf A-E`}
                  className="w-48 px-3 py-1.5 text-xs font-mono uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <button
                  type="button"
                  onClick={handleApplyBulkKeys}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Terapkan</span>
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {activeSubject.answerKey.map((currentKey, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50"
                >
                  <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums w-7">
                    {String(idx + 1).padStart(2, '0')}.
                  </span>
                  <div className="flex items-center gap-1">
                    {PG_OPTIONS.map((opt) => {
                      const active = currentKey === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSetAnswerKey(idx, opt)}
                          className={`w-7 h-7 text-xs font-mono font-semibold rounded transition-colors cursor-pointer ${
                            active
                              ? 'bg-indigo-700 text-white'
                              : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Essay Rubrics */}
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Rubrik Penilaian 5 Soal Esai
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Acuan AI untuk memberi saran skor awal sebelum diverifikasi guru.
                </p>
              </div>
              <div className="text-xs font-mono text-slate-600 tabular-nums">
                Total Skor Maks Esai: <strong className="text-slate-900">{totalEssayMax}</strong>
              </div>
            </div>

            <div className="mt-4 divide-y divide-slate-200">
              {activeSubject.essayRubrics.map((rubric, idx) => (
                <div key={rubric.number} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">
                      Esai Nomor {rubric.number}
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-600">Skor Maksimal:</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={rubric.maxScore}
                        onChange={(e) =>
                          handleRubricChange(idx, 'maxScore', Number(e.target.value) || 1)
                        }
                        className="w-20 px-2.5 py-1 text-xs font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Indikator / Topik Soal
                      </label>
                      <input
                        type="text"
                        value={rubric.prompt}
                        onChange={(e) => handleRubricChange(idx, 'prompt', e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Kriteria Kunci &amp; Pembobotan
                      </label>
                      <input
                        type="text"
                        value={rubric.criteria}
                        onChange={(e) => handleRubricChange(idx, 'criteria', e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
