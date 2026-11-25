export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type McOption = 'A' | 'B' | 'C' | 'D' | 'E' | '' | 'GANDA';

export type VerificationStatus = 'needs_review' | 'verified';

export interface EssayRubric {
  number: number;
  prompt: string;
  criteria: string;
  maxScore: number;
}

export interface SubjectConfig {
  id: string;
  code: string;
  name: string;
  gradeLevel: string;
  pgCount: 40 | 45;
  essayCount: 5;
  pgWeight: number; // percentage, e.g. 70
  essayWeight: number; // percentage, e.g. 30
  kkm: number;
  answerKey: McOption[]; // length 40 or 45
  essayRubrics: EssayRubric[]; // length 5
}

export interface McAnswerItem {
  number: number;
  aiAnswer: McOption;
  editedAnswer: McOption;
  confidence: ConfidenceLevel;
  note: string;
  overriddenByTeacher: boolean;
}

export interface EssayAnswerItem {
  number: number;
  transcribedAnswer: string;
  aiSuggestedScore: number;
  teacherScore: number;
  maxScore: number;
  rationale: string;
  teacherNote: string;
  confidence: ConfidenceLevel;
  overriddenByTeacher: boolean;
}

export interface StudentSubmission {
  id: string;
  subjectId: string;
  fileName: string;
  mimeType: string;
  fileDataUrl: string;
  uploadedAt: string;
  studentName: string;
  studentId: string;
  studentClass: string;
  sheetConditionNote: string;
  status: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  mcAnswers: McAnswerItem[];
  essayAnswers: EssayAnswerItem[];
}

export interface ComputedGrade {
  pgCorrect: number;
  pgTotal: number;
  pgScore100: number;
  essayRawScore: number;
  essayMaxScore: number;
  essayScore100: number;
  finalScore: number;
  passedKkm: boolean;
  lowConfidenceCount: number;
  overriddenCount: number;
}
