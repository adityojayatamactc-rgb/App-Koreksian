import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Upload } from 'lucide-react';
import { StudentSubmission, SubjectConfig } from '../types/assessment';

interface BackupRestorePanelProps {
  subjects: SubjectConfig[];
  submissions: StudentSubmission[];
  onExportBackup: () => string;
  onImportBackup: (
    file: File,
    mode: 'merge' | 'replace'
  ) => Promise<{ subjectsCount: number; submissionsCount: number }>;
}

export const BackupRestorePanel: React.FC<BackupRestorePanelProps> = ({
  subjects,
  submissions,
  onExportBackup,
  onImportBackup,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = () => {
    setErrorMessage(null);
    const fileName = onExportBackup();
    setStatusMessage(
      `Cadangan ${fileName} diunduh (${subjects.length} mapel, ${submissions.length} lembar siswa).`
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setStatusMessage(null);
    setIsImporting(true);

    try {
      const res = await onImportBackup(file, importMode);
      setStatusMessage(
        `Berhasil memulihkan ${res.subjectsCount} mapel dan ${res.submissionsCount} lembar siswa (${
          importMode === 'merge' ? 'digabungkan' : 'mengganti data lama'
        }).`
      );
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal membaca berkas cadangan JSON.'
      );
    } finally {
      setIsImporting(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-900">
            Cadangkan &amp; Pulihkan Data Lintas Perangkat (.json)
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
            Unduh 1 berkas cadangan berisi seluruh konfigurasi 8 mapel, kunci PG, rubrik esai,
            serta hasil koreksi siswa untuk dipindahkan atau dibuka di laptop/tablet lain.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setImportMode('merge')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                importMode === 'merge'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gabungkan
            </button>
            <button
              type="button"
              onClick={() => setImportMode('replace')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                importMode === 'replace'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ganti Semua
            </button>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Unduh Backup (.json)</span>
          </button>

          <button
            type="button"
            disabled={isImporting}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-700 rounded-lg hover:bg-indigo-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isImporting ? 'Memulihkan...' : 'Impor Backup (.json)'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="mt-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800"
        >
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}
    </section>
  );
};
