import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RotateCw,
  Sparkles,
  Upload,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  McOption,
  StudentSubmission,
  SubjectConfig,
} from '../types/assessment';
import { computeSubmissionGrade } from '../utils/scoring';
import { generateSampleSheetJpg } from '../utils/sampleSheetGenerator';

interface GradingWorkspaceProps {
  subjects: SubjectConfig[];
  selectedSubjectId: string;
  onSelectSubject: (id: string) => void;
  submissions: StudentSubmission[];
  selectedSubmissionId: string | null;
  onSelectSubmission: (id: string) => void;
  onAddSubmission: (sub: StudentSubmission) => void;
  onUpdateSubmission: (sub: StudentSubmission) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const MC_CHOICES: McOption[] = ['A', 'B', 'C', 'D', 'E', ''];

export const GradingWorkspace: React.FC<GradingWorkspaceProps> = ({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  submissions,
  selectedSubmissionId,
  onSelectSubmission,
  onAddSubmission,
  onUpdateSubmission,
  fileInputRef,
}) => {
  const activeSubject =
    subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  const subjectSubmissions = useMemo(
    () => submissions.filter((s) => s.subjectId === activeSubject.id),
    [submissions, activeSubject.id]
  );

  const activeSubmission =
    subjectSubmissions.find((s) => s.id === selectedSubmissionId) ||
    subjectSubmissions[0] ||
    null;

  const [rightTab, setRightTab] = useState<'pg' | 'essay'>('pg');
  const [pgFilter, setPgFilter] = useState<'all' | 'attention'>('all');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sampleCounterRef = useRef(0);

  const activeGrade = useMemo(() => {
    if (!activeSubmission) return null;
    return computeSubmissionGrade(activeSubmission, activeSubject);
  }, [activeSubmission, activeSubject]);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error(`Gagal membaca berkas ${file.name}`));
      reader.readAsDataURL(file);
    });

  const processSheetToApi = async (
    fileName: string,
    mimeType: string,
    dataUrl: string
  ) => {
    const response = await fetch('/api/grade-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileDataBase64: dataUrl,
        mimeType,
        subjectName: activeSubject.name,
        pgCount: activeSubject.pgCount,
        essayCount: activeSubject.essayCount,
        answerKey: activeSubject.answerKey,
        essayRubrics: activeSubject.essayRubrics,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Gagal memproses lembar jawaban.');
    }

    const r = payload.result;
    const rawMc = Array.isArray(r.mcAnswers) ? r.mcAnswers : [];
    const rawEssay = Array.isArray(r.essayAnswers) ? r.essayAnswers : [];

    const validOpts = new Set<McOption>(['A', 'B', 'C', 'D', 'E', 'GANDA', '']);

    const mcAnswers = Array.from({ length: activeSubject.pgCount }, (_, idx) => {
      const num = idx + 1;
      const found = rawMc.find((m: { number: number }) => Number(m.number) === num);
      const rawAns = String(found?.answer || '').toUpperCase().trim() as McOption;
      const cleanAns: McOption = validOpts.has(rawAns) ? rawAns : '';
      const conf =
        found?.confidence === 'low' || found?.confidence === 'medium'
          ? found.confidence
          : 'high';
      return {
        number: num,
        aiAnswer: cleanAns,
        editedAnswer: cleanAns,
        confidence: cleanAns === 'GANDA' || cleanAns === '' ? ('low' as const) : conf,
        note: String(found?.note || ''),
        overriddenByTeacher: false,
      };
    });

    const essayAnswers = Array.from({ length: activeSubject.essayCount }, (_, idx) => {
      const num = idx + 1;
      const rubric = activeSubject.essayRubrics[idx];
      const maxScore = rubric ? rubric.maxScore : 20;
      const found = rawEssay.find((e: { number: number }) => Number(e.number) === num);
      const suggested = Math.max(
        0,
        Math.min(maxScore, Number(found?.suggestedScore) || 0)
      );
      const conf =
        found?.confidence === 'low' || found?.confidence === 'medium'
          ? found.confidence
          : 'high';
      return {
        number: num,
        transcribedAnswer: String(found?.transcribedAnswer || ''),
        aiSuggestedScore: suggested,
        teacherScore: suggested,
        maxScore,
        rationale: String(found?.rationale || ''),
        teacherNote: '',
        confidence: conf,
        overriddenByTeacher: false,
      };
    });

    const newSub: StudentSubmission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      subjectId: activeSubject.id,
      fileName,
      mimeType,
      fileDataUrl: dataUrl,
      uploadedAt: new Date().toISOString(),
      studentName: String(r.studentName || '').trim() || 'Siswa Belum Teridentifikasi',
      studentId: String(r.studentId || '').trim(),
      studentClass: String(r.studentClass || '').trim(),
      sheetConditionNote: String(r.sheetConditionNote || '').trim(),
      status: 'needs_review',
      mcAnswers,
      essayAnswers,
    };

    onAddSubmission(newSub);
    onSelectSubmission(newSub.id);
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const list = Array.from(files);
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        setProcessingLabel(
          `Membaca lembar ${i + 1} dari ${list.length}: ${file.name}...`
        );
        const dataUrl = await readFileAsDataUrl(file);
        await processSheetToApi(
          file.name,
          file.type || 'image/jpeg',
          dataUrl
        );
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Terjadi kesalahan membaca berkas.'
      );
    } finally {
      setIsProcessing(false);
      setProcessingLabel('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleTestSampleSheet = async () => {
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const idx = sampleCounterRef.current++;
      const { dataUrl, fileName } = generateSampleSheetJpg(activeSubject, idx);
      setProcessingLabel(
        `Mengirim lembar sampel (${activeSubject.pgCount} PG + 5 Esai) ke pembaca AI...`
      );
      await processSheetToApi(fileName, 'image/jpeg', dataUrl);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal memproses lembar sampel.'
      );
    } finally {
      setIsProcessing(false);
      setProcessingLabel('');
    }
  };

  const handleDownloadSampleTemplate = () => {
    const { dataUrl, fileName } = generateSampleSheetJpg(activeSubject, 0);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOverrideMc = (number: number, newChoice: McOption) => {
    if (!activeSubmission) return;
    const updatedMc = activeSubmission.mcAnswers.map((item) => {
      if (item.number !== number) return item;
      return {
        ...item,
        editedAnswer: newChoice,
        overriddenByTeacher: newChoice !== item.aiAnswer,
      };
    });
    onUpdateSubmission({
      ...activeSubmission,
      mcAnswers: updatedMc,
    });
  };

  const handleUpdateEssay = (
    number: number,
    patch: {
      teacherScore?: number;
      teacherNote?: string;
      transcribedAnswer?: string;
    }
  ) => {
    if (!activeSubmission) return;
    const updatedEssay = activeSubmission.essayAnswers.map((item) => {
      if (item.number !== number) return item;
      const nextScore =
        patch.teacherScore !== undefined
          ? Math.max(0, Math.min(item.maxScore, patch.teacherScore))
          : item.teacherScore;
      return {
        ...item,
        ...patch,
        teacherScore: nextScore,
        overriddenByTeacher:
          nextScore !== item.aiSuggestedScore || Boolean(patch.teacherNote),
      };
    });
    onUpdateSubmission({
      ...activeSubmission,
      essayAnswers: updatedEssay,
    });
  };

  const handleVerifySubmission = () => {
    if (!activeSubmission) return;
    onUpdateSubmission({
      ...activeSubmission,
      status: activeSubmission.status === 'verified' ? 'needs_review' : 'verified',
      verifiedAt:
        activeSubmission.status === 'verified' ? undefined : new Date().toISOString(),
      verifiedBy: activeSubmission.status === 'verified' ? undefined : 'Guru Pembuat Soal',
    });
  };

  const handleAttachDemoPreview = () => {
    if (!activeSubmission) return;
    const { dataUrl } = generateSampleSheetJpg(activeSubject, 0);
    onUpdateSubmission({
      ...activeSubmission,
      fileDataUrl: dataUrl,
    });
  };

  const filteredMcAnswers = useMemo(() => {
    if (!activeSubmission) return [];
    if (pgFilter === 'all') return activeSubmission.mcAnswers;
    return activeSubmission.mcAnswers.filter((item, idx) => {
      const key = activeSubject.answerKey[idx];
      const isWrong = item.editedAnswer !== key;
      const isLow = item.confidence === 'low' || item.editedAnswer === 'GANDA';
      return isWrong || isLow;
    });
  }, [activeSubmission, pgFilter, activeSubject.answerKey]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5">
      {/* Hidden shared file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        multiple
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
      />

      {/* Workspace Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
          <div className="min-w-0">
            <label
              htmlFor="subject-select"
              className="block text-xs font-medium text-slate-500 mb-1"
            >
              Mata Pelajaran Asesmen (8 Mapel SMK)
            </label>
            <select
              id="subject-select"
              value={activeSubject.id}
              onChange={(e) => onSelectSubject(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              {subjects.map((subj) => (
                <option key={subj.id} value={subj.id}>
                  {subj.code} — {subj.name} ({subj.pgCount} PG + {subj.essayCount} Esai)
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-slate-500 tabular-nums sm:pt-5">
            {activeSubject.pgCount} PG ({activeSubject.pgWeight}%) · {activeSubject.essayCount}{' '}
            Esai ({activeSubject.essayWeight}%) · KKM {activeSubject.kkm}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleDownloadSampleTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Unduh Template JPG</span>
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleTestSampleSheet}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Uji Baca AI (Sampel JPG)</span>
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-700 rounded-lg hover:bg-indigo-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Unggah JPG / PDF</span>
          </button>
        </div>
      </div>

      {/* Processing / Error Banner */}
      {isProcessing && (
        <div className="mt-4 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3 text-sm text-indigo-900">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-700 shrink-0" />
          <span>{processingLabel || 'Memproses lembar jawaban siswa dengan AI...'}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-3 text-sm text-red-900"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold text-red-700 hover:underline cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Queue + Document Viewer */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* Student Queue Selector Strip */}
          <div className="bg-white border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-xs font-semibold text-slate-700">
                Antrean Lembar Mapel Ini ({subjectSubmissions.length})
              </h2>
              <span className="text-xs text-slate-500">Klik siswa untuk koreksi / edit</span>
            </div>

            {subjectSubmissions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">
                Belum ada lembar jawaban untuk mapel ini. Unggah JPG/PDF atau klik{' '}
                <strong>Uji Baca AI (Sampel JPG)</strong>.
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {subjectSubmissions.map((sub) => {
                  const grade = computeSubmissionGrade(sub, activeSubject);
                  const isActive = activeSubmission?.id === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => onSelectSubmission(sub.id)}
                      className={`text-left px-3 py-2 rounded-lg border transition-colors shrink-0 min-w-[190px] cursor-pointer ${
                        isActive
                          ? 'bg-indigo-50 border-indigo-600 text-slate-900'
                          : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-semibold truncate max-w-[180px]">
                        {sub.studentName}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] tabular-nums">
                        <span className="font-mono text-slate-600">
                          Nilai: {grade.finalScore.toFixed(1)}
                        </span>
                        <span
                          className={
                            sub.status === 'verified'
                              ? 'text-emerald-700 font-medium'
                              : 'text-amber-700 font-medium'
                          }
                        >
                          {sub.status === 'verified' ? 'Terverifikasi' : 'Perlu Review'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Document Preview Canvas */}
          <div className="flex-1 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden min-h-[540px]">
            <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {activeSubmission
                    ? activeSubmission.fileName
                    : 'Pratinjau Lembar Jawaban (JPG / PDF)'}
                </div>
                {activeSubmission?.sheetConditionNote && (
                  <div className="text-[11px] text-slate-500 truncate">
                    {activeSubmission.sheetConditionNote}
                  </div>
                )}
              </div>

              {activeSubmission && activeSubmission.mimeType !== 'application/pdf' && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label="Perkecil gambar"
                    onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded cursor-pointer"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono tabular-nums text-slate-600 w-11 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    aria-label="Perbesar gambar"
                    onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded cursor-pointer"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Putar 90 derajat"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded cursor-pointer"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 bg-slate-100/80 overflow-auto flex items-center justify-center p-4">
              {!activeSubmission ? (
                <div className="max-w-sm text-center space-y-3">
                  <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-semibold text-slate-800">
                    Belum Ada Lembar Dipilih
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Unggah file scan JPG atau PDF lembar jawaban siswa untuk mapel{' '}
                    <strong>{activeSubject.name}</strong>, atau gunakan tombol Uji Baca AI
                    untuk mencoba langsung dengan lembar sampel.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-indigo-700 rounded-lg hover:bg-indigo-800 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih Berkas JPG / PDF</span>
                  </button>
                </div>
              ) : !activeSubmission.fileDataUrl ? (
                <div className="max-w-sm text-center space-y-3 p-6 bg-white border border-slate-200 rounded-xl">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="text-sm font-semibold text-slate-900">
                    Data Sampel Tersimpan
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ini adalah data sampel awal. Anda dapat langsung mengedit hasil koreksi di
                    panel kanan atau tampilkan ilustrasi lembar jawaban untuk referensi visual.
                  </p>
                  <button
                    type="button"
                    onClick={handleAttachDemoPreview}
                    className="px-3.5 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 cursor-pointer"
                  >
                    Tampilkan Ilustrasi Lembar
                  </button>
                </div>
              ) : activeSubmission.mimeType === 'application/pdf' ? (
                <object
                  data={activeSubmission.fileDataUrl}
                  type="application/pdf"
                  className="w-full h-[640px] rounded border border-slate-300 bg-white"
                >
                  <div className="p-6 text-center text-xs text-slate-600">
                    Browser tidak menampilkan pratinjau PDF inline.{' '}
                    <a
                      href={activeSubmission.fileDataUrl}
                      download={activeSubmission.fileName}
                      className="text-indigo-700 font-semibold underline"
                    >
                      Unduh berkas PDF
                    </a>
                  </div>
                </object>
              ) : (
                <div className="overflow-auto max-h-[680px] w-full flex justify-center">
                  <img
                    src={activeSubmission.fileDataUrl}
                    alt={`Lembar jawaban ${activeSubmission.studentName}`}
                    referrerPolicy="no-referrer"
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transformOrigin: 'top center',
                    }}
                    className="max-w-full rounded border border-slate-300 shadow-xs transition-transform duration-150"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Correction & Teacher Override Panel */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
          {!activeSubmission || !activeGrade ? (
            <div className="p-8 text-center text-sm text-slate-500 my-auto">
              Pilih atau unggah lembar jawaban siswa untuk memulai koreksi dan verifikasi guru.
            </div>
          ) : (
            <>
              {/* Editable Student Identity */}
              <div className="p-4 border-b border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    Identitas Siswa (Dapat Diedit Guru)
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      activeSubmission.status === 'verified'
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {activeSubmission.status === 'verified' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Terverifikasi Guru</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Menunggu Review Guru</span>
                      </>
                    )}
                  </span>
                </div>

                {activeSubmission.status === 'verified' && (
                  <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-3 text-xs text-emerald-900">
                    <span>
                      Lembar ini sudah Terverifikasi. Buka kunci jika ingin mengedit nilai kembali.
                    </span>
                    <button
                      type="button"
                      onClick={handleVerifySubmission}
                      className="font-semibold text-emerald-800 hover:underline shrink-0 cursor-pointer"
                    >
                      Buka Edit
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Nama Siswa
                    </label>
                    <input
                      type="text"
                      disabled={activeSubmission.status === 'verified'}
                      value={activeSubmission.studentName}
                      onChange={(e) =>
                        onUpdateSubmission({
                          ...activeSubmission,
                          studentName: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      NIS / No. Peserta
                    </label>
                    <input
                      type="text"
                      disabled={activeSubmission.status === 'verified'}
                      value={activeSubmission.studentId}
                      onChange={(e) =>
                        onUpdateSubmission({
                          ...activeSubmission,
                          studentId: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Kelas / Jurusan
                    </label>
                    <input
                      type="text"
                      disabled={activeSubmission.status === 'verified'}
                      value={activeSubmission.studentClass}
                      onChange={(e) =>
                        onUpdateSubmission({
                          ...activeSubmission,
                          studentClass: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                {/* Live Computed Score Strip */}
                <div className="grid grid-cols-4 divide-x divide-slate-200 border border-slate-200 rounded-lg bg-slate-50/70">
                  <div className="px-3 py-2">
                    <div className="text-[11px] text-slate-500">PG Benar</div>
                    <div className="text-sm font-mono font-semibold text-slate-900 tabular-nums">
                      {activeGrade.pgCorrect}/{activeGrade.pgTotal}
                    </div>
                  </div>
                  <div className="px-3 py-2">
                    <div className="text-[11px] text-slate-500">Nilai PG</div>
                    <div className="text-sm font-mono font-semibold text-slate-900 tabular-nums">
                      {activeGrade.pgScore100.toFixed(1)}
                    </div>
                  </div>
                  <div className="px-3 py-2">
                    <div className="text-[11px] text-slate-500">Skor Esai</div>
                    <div className="text-sm font-mono font-semibold text-slate-900 tabular-nums">
                      {activeGrade.essayRawScore}/{activeGrade.essayMaxScore}
                    </div>
                  </div>
                  <div className="px-3 py-2">
                    <div className="text-[11px] text-slate-500">Nilai Akhir</div>
                    <div
                      className={`text-sm font-mono font-bold tabular-nums ${
                        activeGrade.passedKkm ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {activeGrade.finalScore.toFixed(1)}{' '}
                      <span className="text-[11px] font-sans font-medium">
                        ({activeGrade.passedKkm ? 'Tuntas' : 'Remedial'})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-tabs: Pilihan Ganda vs Esai */}
              <div className="px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setRightTab('pg')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      rightTab === 'pg'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pilihan Ganda ({activeSubject.pgCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightTab('essay')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      rightTab === 'essay'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Esai ({activeSubject.essayCount})
                  </button>
                </div>

                {rightTab === 'pg' && (
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPgFilter('all')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        pgFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setPgFilter('attention')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        pgFilter === 'attention'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Ragu / Salah
                    </button>
                  </div>
                )}
              </div>

              {/* Scrollable Editor Content */}
              <div className="flex-1 overflow-y-auto max-h-[520px] p-4">
                {rightTab === 'pg' ? (
                  <div className="divide-y divide-slate-100">
                    {filteredMcAnswers.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        Tidak ada nomor PG yang ragu atau salah pada filter ini.
                      </div>
                    ) : (
                      filteredMcAnswers.map((item) => {
                        const key = activeSubject.answerKey[item.number - 1];
                        const isCorrect = item.editedAnswer === key;
                        const isLow = item.confidence === 'low' && !item.overriddenByTeacher;

                        return (
                          <div
                            key={item.number}
                            className={`py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                              isLow ? 'bg-amber-50/60 px-2 rounded-lg' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums w-6">
                                {String(item.number).padStart(2, '0')}
                              </span>

                              <div className="flex items-center gap-1.5 text-xs">
                                {isLow ? (
                                  <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                                    <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                                    Perlu Cek
                                  </span>
                                ) : isCorrect ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    Benar
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                                    <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                    Salah
                                  </span>
                                )}
                                <span className="text-slate-400">·</span>
                                <span className="font-mono text-slate-600">
                                  Kunci: <strong className="text-slate-900">{key}</strong>
                                </span>
                                {item.overriddenByTeacher && (
                                  <>
                                    <span className="text-slate-400">·</span>
                                    <span className="text-indigo-700 font-medium">
                                      Diedit (AI: {item.aiAnswer || '-'})
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {MC_CHOICES.map((choice) => {
                                const selected = item.editedAnswer === choice;
                                return (
                                  <button
                                    key={choice || 'blank'}
                                    type="button"
                                    disabled={activeSubmission.status === 'verified'}
                                    title={choice ? `Pilih ${choice}` : 'Kosongkan jawaban'}
                                    onClick={() => handleOverrideMc(item.number, choice)}
                                    className={`w-7 h-7 text-xs font-mono font-semibold rounded transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed ${
                                      selected
                                        ? choice === key
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-indigo-700 text-white'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
                                    }`}
                                  >
                                    {choice || '-'}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {activeSubmission.essayAnswers.map((essay, idx) => {
                      const rubric = activeSubject.essayRubrics[idx];
                      return (
                        <div key={essay.number} className="py-4 first:pt-0 last:pb-0 space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                Esai #{essay.number}: {rubric?.prompt || 'Uraian'}
                              </div>
                              {rubric?.criteria && (
                                <div className="text-xs text-slate-500 mt-0.5">
                                  Rubrik: {rubric.criteria}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={activeSubmission.status === 'verified'}
                                aria-label="Kurangi skor"
                                onClick={() =>
                                  handleUpdateEssay(essay.number, {
                                    teacherScore: essay.teacherScore - 1,
                                  })
                                }
                                className="w-7 h-7 text-xs font-semibold border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                              >
                                -1
                              </button>
                              <input
                                type="number"
                                disabled={activeSubmission.status === 'verified'}
                                min={0}
                                max={essay.maxScore}
                                step={0.5}
                                value={essay.teacherScore}
                                onChange={(e) =>
                                  handleUpdateEssay(essay.number, {
                                    teacherScore: Number(e.target.value),
                                  })
                                }
                                className="w-16 px-2 py-1 text-center text-sm font-mono font-bold tabular-nums border border-slate-300 rounded disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                              />
                              <span className="text-xs font-mono text-slate-500 tabular-nums">
                                / {essay.maxScore}
                              </span>
                              <button
                                type="button"
                                disabled={activeSubmission.status === 'verified'}
                                aria-label="Tambah skor"
                                onClick={() =>
                                  handleUpdateEssay(essay.number, {
                                    teacherScore: essay.teacherScore + 1,
                                  })
                                }
                                className="w-7 h-7 text-xs font-semibold border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                              >
                                +1
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-500 mb-1">
                              Hasil Transkripsi Jawaban Siswa (Dapat dikoreksi)
                            </label>
                            <textarea
                              rows={2}
                              disabled={activeSubmission.status === 'verified'}
                              value={essay.transcribedAnswer}
                              onChange={(e) =>
                                handleUpdateEssay(essay.number, {
                                  transcribedAnswer: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-75 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                          </div>

                          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                            <span>
                              Saran AI:{' '}
                              <strong className="font-mono text-slate-900">
                                {essay.aiSuggestedScore}/{essay.maxScore}
                              </strong>
                            </span>
                            {essay.rationale && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span>{essay.rationale}</span>
                              </>
                            )}
                          </div>

                          <div>
                            <input
                              type="text"
                              disabled={activeSubmission.status === 'verified'}
                              value={essay.teacherNote}
                              onChange={(e) =>
                                handleUpdateEssay(essay.number, {
                                  teacherNote: e.target.value,
                                })
                              }
                              placeholder="Catatan evaluasi guru untuk siswa (opsional)..."
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Verification Action Footer */}
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-600 tabular-nums">
                  {activeGrade.lowConfidenceCount > 0 ? (
                    <span className="text-amber-700 font-medium">
                      {activeGrade.lowConfidenceCount} butir ditandai ragu untuk dicek
                    </span>
                  ) : (
                    <span>Semua butir sudah ditinjau</span>
                  )}
                  {activeGrade.overriddenCount > 0 && (
                    <span> · {activeGrade.overriddenCount} penyesuaian guru</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleVerifySubmission}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeSubmission.status === 'verified'
                      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                      : 'bg-indigo-700 text-white hover:bg-indigo-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {activeSubmission.status === 'verified'
                      ? 'Terverifikasi (Klik untuk Buka Edit)'
                      : 'Simpan & Tandai Terverifikasi'}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
