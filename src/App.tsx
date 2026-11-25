/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { AppView, HeaderNav } from './components/HeaderNav';
import { CloudSyncBanner } from './components/CloudSyncBanner';
import { GradingWorkspace } from './components/GradingWorkspace';
import { SubjectManager } from './components/SubjectManager';
import { ScoreRecapView } from './components/ScoreRecapView';
import { ArchitectureAdviceView } from './components/ArchitectureAdviceView';
import { buildSeedSubmissions, INITIAL_SUBJECTS } from './data/defaultSubjects';
import { auth, googleProvider } from './firebase';
import {
  deleteSubmissionFromCloud,
  ensureTeacherProfile,
  resetSubjectsInCloud,
  saveSubjectToCloud,
  saveSubmissionToCloud,
  seedSubjectsIfEmpty,
  seedSubmissionsIfEmpty,
  subscribeToSubmissions,
  subscribeToSubjects,
} from './services/firestoreSync';
import { StudentSubmission, SubjectConfig } from './types/assessment';
import {
  exportBackupJson,
  mergeBackupData,
  parseAndValidateBackupJson,
} from './utils/backup';

const STORAGE_SUBJECTS_KEY = 'asesmen_smk_subjects_v1';
const STORAGE_SUBMISSIONS_KEY = 'asesmen_smk_submissions_v1';

function loadInitialSubjects(): SubjectConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_SUBJECTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 8) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return INITIAL_SUBJECTS;
}

function loadInitialSubmissions(subjects: SubjectConfig[]): StudentSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_SUBMISSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return buildSeedSubmissions(subjects);
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('grading');
  const [subjects, setSubjects] = useState<SubjectConfig[]>(loadInitialSubjects);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(() =>
    loadInitialSubmissions(subjects)
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    () => subjects[0]?.id || 'mapel-matematika'
  );
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(
    () => submissions[0]?.id || null
  );

  // Firebase Auth & Cloud Sync state
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [authError, setAuthError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const subjectTimersRef = useRef<Record<string, number>>({});
  const submissionTimersRef = useRef<Record<string, number>>({});
  const localFileCacheRef = useRef<Record<string, string>>({});
  const latestLocalSubjectsRef = useRef(subjects);
  const latestLocalSubmissionsRef = useRef(submissions);

  latestLocalSubjectsRef.current = subjects;
  latestLocalSubmissionsRef.current = submissions;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SUBJECTS_KEY, JSON.stringify(subjects));
    } catch {
      // ignore quota limits
    }
  }, [subjects]);

  useEffect(() => {
    try {
      const serializable = submissions.map((s) =>
        s.fileDataUrl.length > 1_200_000 ? { ...s, fileDataUrl: '' } : s
      );
      localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(serializable));
    } catch {
      // ignore quota limits
    }
  }, [submissions]);

  // Listen for Firebase Auth state and attach Firestore real-time sync listeners
  useEffect(() => {
    let unsubSubjects: (() => void) | null = null;
    let unsubSubmissions: (() => void) | null = null;
    let cancelled = false;

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubSubjects) {
        unsubSubjects();
        unsubSubjects = null;
      }
      if (unsubSubmissions) {
        unsubSubmissions();
        unsubSubmissions = null;
      }

      setUser(currentUser);
      setAuthReady(true);

      if (!currentUser) {
        setSyncState('idle');
        return;
      }

      setSyncState('syncing');
      try {
        await ensureTeacherProfile(currentUser);
        if (cancelled) return;

        await seedSubjectsIfEmpty(currentUser.uid, latestLocalSubjectsRef.current);
        if (cancelled) return;

        await seedSubmissionsIfEmpty(currentUser.uid, latestLocalSubmissionsRef.current);
        if (cancelled) return;

        unsubSubjects = subscribeToSubjects(currentUser.uid, (cloudSubjects) => {
          setSubjects((prev) => {
            // Keep canonical order of INITIAL_SUBJECTS when IDs match
            const orderMap = new Map(INITIAL_SUBJECTS.map((s, idx) => [s.id, idx]));
            const sorted = [...cloudSubjects].sort((a, b) => {
              const ia = orderMap.get(a.id) ?? 999;
              const ib = orderMap.get(b.id) ?? 999;
              return ia - ib || a.name.localeCompare(b.name);
            });
            return sorted.length > 0 ? sorted : prev;
          });
          setSyncState('synced');
        });

        unsubSubmissions = subscribeToSubmissions(currentUser.uid, (cloudSubs) => {
          setSubmissions(
            cloudSubs.map((s) => ({
              ...s,
              fileDataUrl: localFileCacheRef.current[s.id] || s.fileDataUrl,
            }))
          );
          setSyncState('synced');
        });
      } catch (err) {
        console.error('Gagal sinkronisasi awal Firebase:', err);
        setSyncState('error');
        setAuthError(
          err instanceof Error
            ? 'Gagal menyinkronkan data cloud. Periksa koneksi atau muat ulang halaman.'
            : 'Gagal menyinkronkan data cloud.'
        );
      }
    });

    return () => {
      cancelled = true;
      unsubAuth();
      if (unsubSubjects) unsubSubjects();
      if (unsubSubmissions) unsubSubmissions();
    };
  }, []);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk dengan akun Google.';
      if (msg.includes('popup-closed-by-user')) {
        setAuthError('Jendela login Google ditutup sebelum selesai.');
      } else if (msg.includes('popup-blocked')) {
        setAuthError(
          'Popup login diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.'
        );
      } else {
        setAuthError(`Login Google gagal: ${msg}`);
      }
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Gagal keluar akun.');
    }
  };

  const handleUpdateSubject = (updated: SubjectConfig) => {
    setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    if (user) {
      setSyncState('syncing');
      window.clearTimeout(subjectTimersRef.current[updated.id]);
      subjectTimersRef.current[updated.id] = window.setTimeout(async () => {
        try {
          await saveSubjectToCloud(user.uid, updated);
          setSyncState('synced');
        } catch {
          setSyncState('error');
        }
      }, 450);
    }
  };

  const handleResetDefaults = () => {
    setSubjects(INITIAL_SUBJECTS);
    setSelectedSubjectId(INITIAL_SUBJECTS[0].id);
    if (user) {
      setSyncState('syncing');
      void resetSubjectsInCloud(user.uid, INITIAL_SUBJECTS)
        .then(() => setSyncState('synced'))
        .catch(() => setSyncState('error'));
    }
  };

  const handleAddSubmission = (newSub: StudentSubmission) => {
    if (newSub.fileDataUrl) {
      localFileCacheRef.current[newSub.id] = newSub.fileDataUrl;
    }
    setSubmissions((prev) => [newSub, ...prev]);
    setSelectedSubmissionId(newSub.id);

    if (user) {
      setSyncState('syncing');
      void saveSubmissionToCloud(user.uid, newSub)
        .then(() => setSyncState('synced'))
        .catch(() => setSyncState('error'));
    }
  };

  const handleUpdateSubmission = (updated: StudentSubmission) => {
    if (updated.fileDataUrl) {
      localFileCacheRef.current[updated.id] = updated.fileDataUrl;
    }
    const previous = submissions.find((s) => s.id === updated.id);
    const statusChanged = previous?.status !== updated.status;

    setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

    if (user) {
      setSyncState('syncing');
      window.clearTimeout(submissionTimersRef.current[updated.id]);
      if (statusChanged) {
        void saveSubmissionToCloud(user.uid, updated)
          .then(() => setSyncState('synced'))
          .catch(() => setSyncState('error'));
      } else {
        submissionTimersRef.current[updated.id] = window.setTimeout(async () => {
          try {
            await saveSubmissionToCloud(user.uid, updated);
            setSyncState('synced');
          } catch {
            setSyncState('error');
          }
        }, 450);
      }
    }
  };

  const handleDeleteSubmission = (submissionId: string) => {
    delete localFileCacheRef.current[submissionId];
    setSubmissions((prev) => {
      const next = prev.filter((s) => s.id !== submissionId);
      if (selectedSubmissionId === submissionId) {
        setSelectedSubmissionId(next[0]?.id || null);
      }
      return next;
    });

    if (user) {
      setSyncState('syncing');
      void deleteSubmissionFromCloud(user.uid, submissionId)
        .then(() => setSyncState('synced'))
        .catch(() => setSyncState('error'));
    }
  };

  const handleTriggerUpload = () => {
    setActiveView('grading');
    window.setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleOpenSubmissionInEditor = (subjectId: string, submissionId: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedSubmissionId(submissionId);
    setActiveView('grading');
  };

  const handleExportBackup = (): string => {
    return exportBackupJson(subjects, submissions);
  };

  const handleImportBackup = async (
    file: File,
    mode: 'merge' | 'replace'
  ): Promise<{ subjectsCount: number; submissionsCount: number }> => {
    const rawText = await file.text();
    const backup = parseAndValidateBackupJson(rawText);

    let nextSubjects: SubjectConfig[];
    let nextSubmissions: StudentSubmission[];

    if (mode === 'replace') {
      nextSubjects = backup.subjects;
      nextSubmissions = backup.submissions;
      setSubjects(nextSubjects);
      setSubmissions(nextSubmissions);
      setSelectedSubjectId(nextSubjects[0]?.id || INITIAL_SUBJECTS[0].id);
      setSelectedSubmissionId(nextSubmissions[0]?.id || null);
    } else {
      const merged = mergeBackupData(subjects, submissions, backup);
      nextSubjects = merged.subjects;
      nextSubmissions = merged.submissions;
      setSubjects(nextSubjects);
      setSubmissions(nextSubmissions);
    }

    if (user) {
      setSyncState('syncing');
      try {
        for (const subj of nextSubjects) {
          await saveSubjectToCloud(user.uid, subj);
        }
        for (const sub of nextSubmissions) {
          await saveSubmissionToCloud(user.uid, sub);
        }
        setSyncState('synced');
      } catch {
        setSyncState('error');
      }
    }

    return {
      subjectsCount: backup.subjects.length,
      submissionsCount: backup.submissions.length,
    };
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <HeaderNav
        activeView={activeView}
        onChangeView={setActiveView}
        onTriggerUpload={handleTriggerUpload}
      />

      <CloudSyncBanner
        user={user}
        authReady={authReady}
        syncState={syncState}
        authError={authError}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onClearAuthError={() => setAuthError(null)}
      />

      <main className="flex-1">
        {activeView === 'grading' && (
          <GradingWorkspace
            subjects={subjects}
            selectedSubjectId={selectedSubjectId}
            onSelectSubject={(id) => {
              setSelectedSubjectId(id);
              const firstForSubj = submissions.find((s) => s.subjectId === id);
              setSelectedSubmissionId(firstForSubj?.id || null);
            }}
            submissions={submissions}
            selectedSubmissionId={selectedSubmissionId}
            onSelectSubmission={setSelectedSubmissionId}
            onAddSubmission={handleAddSubmission}
            onUpdateSubmission={handleUpdateSubmission}
            fileInputRef={fileInputRef}
          />
        )}

        {activeView === 'subjects' && (
          <SubjectManager
            subjects={subjects}
            selectedSubjectId={selectedSubjectId}
            onSelectSubject={setSelectedSubjectId}
            onUpdateSubject={handleUpdateSubject}
            onResetDefaults={handleResetDefaults}
            submissions={submissions}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
          />
        )}

        {activeView === 'recap' && (
          <ScoreRecapView
            subjects={subjects}
            selectedSubjectId={selectedSubjectId}
            onSelectSubject={setSelectedSubjectId}
            submissions={submissions}
            onOpenSubmissionInEditor={handleOpenSubmissionInEditor}
            onDeleteSubmission={handleDeleteSubmission}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
          />
        )}

        {activeView === 'advice' && <ArchitectureAdviceView />}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 px-6 no-print">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>AsesmenSMK — Administrasi Koreksi Lembar Jawaban Guru SMK</span>
          <span>7 Mapel (40 PG · 5 Esai) &amp; 1 Mapel (45 PG · 5 Esai)</span>
        </div>
      </footer>
    </div>
  );
}
