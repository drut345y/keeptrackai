export type QuestionType = 'mcq' | 'short_answer' | 'open_ended' | 'practical_screenshot';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  rubric: string;
  hint?: string;
  sourcePdf?: string;
  // For practical / coding / lab screenshot assignments
  practicalInstructions?: string;
  expectedOutputCriteria?: string;
}

export interface WorksheetItem {
  id: string;
  classId: string;
  title: string;
  type: 'ai_generated' | 'teacher_uploaded' | 'practical_assignment';
  topic: string;
  difficulty: string;
  format: 'mcq' | 'short_answer' | 'mixed' | 'practical_screenshot';
  timeLimitMinutes: number;
  totalPoints: number;
  instructions: string;
  questions: Question[];
  attachmentFileName?: string;
  attachmentDataUrl?: string;
  blockTabSwitching?: boolean;
  createdAt: string;
  status: 'active' | 'draft';
}

export interface ActiveStudentSession {
  studentName: string;
  worksheetTitle: string;
  integrity: number;
  currentAction: string;
  violations: number;
  isActive: boolean;
  camStatus: 'Active' | 'Inactive' | 'Denied';
  lastUpdate: number;
  cameraSnapshotUrl?: string;
  isPhoneFlagged?: boolean;
  isFaceMissing?: boolean;
}

export interface StudentSubmission {
  id: string;
  worksheetId: string;
  classId: string;
  studentName: string;
  submittedAt: string;
  timeSpentMinutes: number;
  answers: Record<number, any>; // maps question index to answer string OR { screenshotUrl, notes, verified }
  finalScore: number;
  integrityScore: number;
  needsReview: boolean;
  status: 'submitted' | 'graded';
}

export interface ClassResource {
  id: string;
  classId: string;
  title: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  dataUrl?: string;
  pageCount: number;
  topics: string[];
  aiSummary: string;
}

export interface ClassItem {
  id: string;
  name: string;
  subject: string;
  classLevel: string; // "Class 1-2", "Class 3-4", "Class 9-10", "Class 11-12", etc.
  joinCode: string;
  teacherId?: string;
  teacherName?: string;
  studentCount: number;
  activeWorksheets: number;
}

export interface EnrolledClass {
  id: string;
  name: string;
  teacher: string;
  subject: string;
  classLevel: string;
  pendingCount: number;
}
