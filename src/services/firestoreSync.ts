import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { StudentSubmission, SubjectConfig } from '../types/assessment';
import { buildCloudPreviewDataUrl } from '../utils/imageCompress';

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned || `id-${Date.now()}`;
}

function clampStr(val: string | undefined, max: number): string {
  return String(val ?? '').slice(0, max);
}

export async function ensureTeacherProfile(user: User): Promise<void> {
  const uid = sanitizeId(user.uid);
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid,
        displayName: clampStr(user.displayName || 'Guru SMK', 120),
        email: clampStr(user.email || '', 180),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName: clampStr(user.displayName || 'Guru SMK', 120),
        email: clampStr(user.email || '', 180),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function seedSubjectsIfEmpty(
  uid: string,
  subjectsToSeed: SubjectConfig[]
): Promise<void> {
  const colPath = `users/${uid}/subjects`;
  try {
    const q = query(collection(db, 'users', uid, 'subjects'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    if (!snap.empty) return;

    const batch = writeBatch(db);
    for (const subj of subjectsToSeed) {
      const id = sanitizeId(subj.id);
      const ref = doc(db, 'users', uid, 'subjects', id);
      batch.set(ref, {
        id,
        ownerId: uid,
        code: clampStr(subj.code || 'MAPEL', 32),
        name: clampStr(subj.name || 'Mata Pelajaran', 120),
        gradeLevel: clampStr(subj.gradeLevel || '', 120),
        pgCount: subj.pgCount === 45 ? 45 : 40,
        essayCount: 5,
        pgWeight: Math.max(0, Math.min(100, Number(subj.pgWeight) || 0)),
        essayWeight: Math.max(0, Math.min(100, Number(subj.essayWeight) || 0)),
        kkm: Math.max(0, Math.min(100, Number(subj.kkm) || 75)),
        answerKey: subj.answerKey.slice(0, subj.pgCount === 45 ? 45 : 40),
        essayRubrics: subj.essayRubrics.slice(0, 5),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, colPath);
  }
}

export async function seedSubmissionsIfEmpty(
  uid: string,
  localSubmissions: StudentSubmission[]
): Promise<void> {
  if (localSubmissions.length === 0) return;
  const colPath = `users/${uid}/submissions`;
  try {
    const q = query(collection(db, 'users', uid, 'submissions'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    if (!snap.empty) return;

    for (const sub of localSubmissions) {
      await saveSubmissionToCloud(uid, sub);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, colPath);
  }
}

export async function saveSubjectToCloud(
  uid: string,
  subject: SubjectConfig
): Promise<void> {
  const id = sanitizeId(subject.id);
  const path = `users/${uid}/subjects/${id}`;
  const ref = doc(db, 'users', uid, 'subjects', id);

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        id,
        ownerId: uid,
        code: clampStr(subject.code || 'MAPEL', 32),
        name: clampStr(subject.name || 'Mata Pelajaran', 120),
        gradeLevel: clampStr(subject.gradeLevel || '', 120),
        pgCount: subject.pgCount === 45 ? 45 : 40,
        essayCount: 5,
        pgWeight: Math.max(0, Math.min(100, Number(subject.pgWeight) || 0)),
        essayWeight: Math.max(0, Math.min(100, Number(subject.essayWeight) || 0)),
        kkm: Math.max(0, Math.min(100, Number(subject.kkm) || 75)),
        answerKey: subject.answerKey.slice(0, subject.pgCount === 45 ? 45 : 40),
        essayRubrics: subject.essayRubrics.slice(0, 5),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        code: clampStr(subject.code || 'MAPEL', 32),
        name: clampStr(subject.name || 'Mata Pelajaran', 120),
        gradeLevel: clampStr(subject.gradeLevel || '', 120),
        pgCount: subject.pgCount === 45 ? 45 : 40,
        essayCount: 5,
        pgWeight: Math.max(0, Math.min(100, Number(subject.pgWeight) || 0)),
        essayWeight: Math.max(0, Math.min(100, Number(subject.essayWeight) || 0)),
        kkm: Math.max(0, Math.min(100, Number(subject.kkm) || 75)),
        answerKey: subject.answerKey.slice(0, subject.pgCount === 45 ? 45 : 40),
        essayRubrics: subject.essayRubrics.slice(0, 5),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function resetSubjectsInCloud(
  uid: string,
  defaultSubjects: SubjectConfig[]
): Promise<void> {
  const colPath = `users/${uid}/subjects`;
  try {
    for (const subj of defaultSubjects) {
      await saveSubjectToCloud(uid, subj);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, colPath);
  }
}

export async function saveSubmissionToCloud(
  uid: string,
  submission: StudentSubmission
): Promise<void> {
  const id = sanitizeId(submission.id);
  const subjectId = sanitizeId(submission.subjectId);
  const path = `users/${uid}/submissions/${id}`;
  const ref = doc(db, 'users', uid, 'submissions', id);

  try {
    const compactPreview = await buildCloudPreviewDataUrl(
      submission.fileDataUrl,
      submission.mimeType
    );

    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        id,
        ownerId: uid,
        subjectId,
        fileName: clampStr(submission.fileName || 'lembar.jpg', 200),
        mimeType: clampStr(submission.mimeType || 'image/jpeg', 80),
        fileDataUrl: clampStr(compactPreview, 350_000),
        uploadedAt: clampStr(submission.uploadedAt || new Date().toISOString(), 64),
        studentName: clampStr(submission.studentName || 'Siswa', 150),
        studentId: clampStr(submission.studentId || '', 64),
        studentClass: clampStr(submission.studentClass || '', 64),
        sheetConditionNote: clampStr(submission.sheetConditionNote || '', 500),
        status: submission.status === 'verified' ? 'verified' : 'needs_review',
        verifiedBy: clampStr(submission.verifiedBy || '', 120),
        verifiedAt: clampStr(submission.verifiedAt || '', 64),
        mcAnswers: submission.mcAnswers.slice(0, 45),
        essayAnswers: submission.essayAnswers.slice(0, 5),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingData = existingSnap.data();
      if (existingData.status === 'verified' && submission.status === 'needs_review') {
        await updateDoc(ref, {
          status: 'needs_review',
          verifiedBy: '',
          verifiedAt: '',
          updatedAt: serverTimestamp(),
        });
        return;
      }

      if (existingData.status === 'verified' && submission.status === 'verified') {
        // Reopen briefly if caller forced an edit, or simply skip overwriting locked doc
        await updateDoc(ref, {
          status: 'needs_review',
          verifiedBy: '',
          verifiedAt: '',
          updatedAt: serverTimestamp(),
        });
      }

      await updateDoc(ref, {
        fileDataUrl: clampStr(compactPreview || existingData.fileDataUrl || '', 350_000),
        studentName: clampStr(submission.studentName || 'Siswa', 150),
        studentId: clampStr(submission.studentId || '', 64),
        studentClass: clampStr(submission.studentClass || '', 64),
        sheetConditionNote: clampStr(submission.sheetConditionNote || '', 500),
        status: submission.status === 'verified' ? 'verified' : 'needs_review',
        verifiedBy: clampStr(submission.verifiedBy || '', 120),
        verifiedAt: clampStr(submission.verifiedAt || '', 64),
        mcAnswers: submission.mcAnswers.slice(0, 45),
        essayAnswers: submission.essayAnswers.slice(0, 5),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSubmissionFromCloud(
  uid: string,
  submissionId: string
): Promise<void> {
  const id = sanitizeId(submissionId);
  const path = `users/${uid}/submissions/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'submissions', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToSubjects(
  uid: string,
  onSubjects: (subjects: SubjectConfig[]) => void
): Unsubscribe {
  const path = `users/${uid}/subjects`;
  const q = query(collection(db, 'users', uid, 'subjects'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: SubjectConfig[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id),
          code: String(data.code),
          name: String(data.name),
          gradeLevel: String(data.gradeLevel || ''),
          pgCount: data.pgCount === 45 ? 45 : 40,
          essayCount: 5,
          pgWeight: Number(data.pgWeight ?? 70),
          essayWeight: Number(data.essayWeight ?? 30),
          kkm: Number(data.kkm ?? 75),
          answerKey: Array.isArray(data.answerKey) ? data.answerKey : [],
          essayRubrics: Array.isArray(data.essayRubrics) ? data.essayRubrics : [],
        };
      });
      if (list.length > 0) {
        onSubjects(list);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToSubmissions(
  uid: string,
  onSubmissions: (submissions: StudentSubmission[]) => void
): Unsubscribe {
  const path = `users/${uid}/submissions`;
  const q = query(collection(db, 'users', uid, 'submissions'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: StudentSubmission[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            id: String(data.id),
            subjectId: String(data.subjectId),
            fileName: String(data.fileName || ''),
            mimeType: String(data.mimeType || 'image/jpeg'),
            fileDataUrl: String(data.fileDataUrl || ''),
            uploadedAt: String(data.uploadedAt || ''),
            studentName: String(data.studentName || ''),
            studentId: String(data.studentId || ''),
            studentClass: String(data.studentClass || ''),
            sheetConditionNote: String(data.sheetConditionNote || ''),
            status:
              data.status === 'verified'
                ? ('verified' as const)
                : ('needs_review' as const),
            verifiedBy: data.verifiedBy ? String(data.verifiedBy) : undefined,
            verifiedAt: data.verifiedAt ? String(data.verifiedAt) : undefined,
            mcAnswers: Array.isArray(data.mcAnswers) ? data.mcAnswers : [],
            essayAnswers: Array.isArray(data.essayAnswers) ? data.essayAnswers : [],
          };
        })
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
      onSubmissions(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
