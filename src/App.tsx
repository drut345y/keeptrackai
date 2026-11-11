import React, { useState, useEffect } from 'react';
import { AuthGateway } from './components/AuthGateway';
import { TeacherClassHub } from './components/TeacherClassHub';
import { TeacherClassDashboard } from './components/TeacherClassDashboard';
import { StudentClassHub } from './components/StudentClassHub';
import { StudentClassWorkspace } from './components/StudentClassWorkspace';
import { LockInTestSession } from './components/LockInTestSession';
import { ClassItem, EnrolledClass, ClassResource, WorksheetItem, StudentSubmission, ActiveStudentSession } from './types';

interface CurrentUser {
  id: string;
  role: 'teacher' | 'student';
  name: string;
}

const INITIAL_CLASSES: ClassItem[] = [
  {
    id: 'c1',
    name: 'Class 11-12 - AP Physics C',
    subject: 'Physics',
    classLevel: 'Class 11-12',
    joinCode: 'LOCK-892F',
    teacherId: 't_connor',
    teacherName: 'Dr. Sarah Connor',
    studentCount: 28,
    activeWorksheets: 2,
  },
  {
    id: 'c2',
    name: 'Class 9-10 - Honors Chemistry',
    subject: 'Chemistry',
    classLevel: 'Class 9-10',
    joinCode: 'LOCK-419K',
    teacherId: 't_walter',
    teacherName: 'Prof. Walter White',
    studentCount: 31,
    activeWorksheets: 1,
  },
  {
    id: 'c3',
    name: 'Class 1-2 - Scratch & Intro to Python',
    subject: 'Computer Science',
    classLevel: 'Class 1-2',
    joinCode: 'LOCK-773X',
    teacherId: 't_connor',
    teacherName: 'Dr. Sarah Connor',
    studentCount: 24,
    activeWorksheets: 2,
  },
];

const INITIAL_WORKSHEETS: WorksheetItem[] = [
  {
    id: 'ws_python_prac',
    classId: 'c3',
    title: 'Practical Coding Lab: Fibonacci Generator in Python',
    type: 'practical_assignment',
    topic: 'Functions & Terminal Execution',
    difficulty: 'Class 1-2',
    format: 'practical_screenshot',
    timeLimitMinutes: 30,
    totalPoints: 50,
    instructions: 'Write a Python program that computes the Fibonacci sequence. Run the script in your terminal and upload a screenshot of your terminal window showing clean execution and the printed output.',
    blockTabSwitching: true,
    attachmentFileName: 'Python_Lab_Fibonacci_Specification.pdf',
    questions: [
      {
        id: 'qp_1',
        type: 'practical_screenshot',
        text: 'Task: Implement fibonacci(n) function. Execute in your IDE/terminal. Upload a screenshot of the terminal window displaying exit code 0 and the first 10 Fibonacci numbers.',
        points: 50,
        rubric: 'Full marks for clear terminal screenshot demonstrating exit code 0 and accurate output.',
        hint: 'Use print statements to format the output clearly before taking your screenshot.',
        practicalInstructions: '1. Open terminal.\n2. Run python fibonacci.py.\n3. Take screenshot and upload below.',
        expectedOutputCriteria: 'Terminal output showing: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]',
      }
    ],
    createdAt: 'Yesterday',
    status: 'active',
  },
  {
    id: 'ws_physics_theory',
    classId: 'c1',
    title: 'Rotational Kinematics & Angular Momentum Mastery',
    type: 'ai_generated',
    topic: 'Rotational Kinematics',
    difficulty: 'Class 11-12',
    format: 'mixed',
    timeLimitMinutes: 25,
    totalPoints: 50,
    instructions: 'Complete the multiple choice and derivation questions under proctored test conditions.',
    blockTabSwitching: false,
    questions: [
      {
        id: 'q_rot_1',
        type: 'mcq',
        text: 'A solid cylinder and a thin spherical shell of equal mass and radius roll down an incline without slipping. Which reaches the bottom first?',
        options: ['The solid cylinder', 'The thin spherical shell', 'Both reach at the same time', 'Depends on the angle of the incline'],
        correctAnswer: 'The solid cylinder',
        points: 25,
        rubric: 'Full marks for lower moment of inertia.',
        hint: 'Recall that smaller rotational inertia allocates more energy to linear speed.',
      },
      {
        id: 'q_rot_2',
        type: 'short_answer',
        text: 'State the conservation of angular momentum and explain under what physical boundary condition it holds true.',
        options: [],
        correctAnswer: 'The total angular momentum of a system remains constant when the net external torque is zero.',
        points: 25,
        rubric: 'Must state zero net external torque and constancy of angular momentum.',
        hint: 'Consider the rotational analogue of Newton\'s second law.',
      }
    ],
    createdAt: '2 days ago',
    status: 'active',
  }
];

const INITIAL_SUBMISSIONS: StudentSubmission[] = [
  {
    id: 'sub_1',
    worksheetId: 'ws_python_prac',
    classId: 'c3',
    studentName: 'Emily Taylor',
    submittedAt: 'Today at 9:30 AM',
    timeSpentMinutes: 18,
    answers: {
      0: {
        screenshotUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="250" viewBox="0 0 500 250" fill="%230f172a"><rect width="500" height="250" fill="%23090d16" rx="10"/><rect width="500" height="30" fill="%231e293b" rx="10"/><circle cx="20" cy="15" r="5" fill="%23f43f5e"/><circle cx="35" cy="15" r="5" fill="%23fbbf24"/><circle cx="50" cy="15" r="5" fill="%2310b981"/><text x="20" y="65" font-family="monospace" font-size="12" fill="%2338bdf8">alex@macbook ~/dev/lockin-practical % python fibonacci.py</text><text x="20" y="95" font-family="monospace" font-size="12" fill="%234ade80">[PASS] Test 1: fib(0) == 0</text><text x="20" y="115" font-family="monospace" font-size="12" fill="%234ade80">[PASS] Test 2: fib(10) == [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]</text><text x="20" y="145" font-family="monospace" font-size="12" fill="%23e2e8f0">Process finished with exit code 0 (execution time 0.002s)</text></svg>',
        notes: 'Ran in macOS terminal, all assertions verified with exit code 0',
        aiVerified: true,
      }
    },
    finalScore: 50,
    integrityScore: 100,
    needsReview: false,
    status: 'graded',
  }
];

const INITIAL_RESOURCES: ClassResource[] = [
  {
    id: 'res_1',
    classId: 'c1',
    title: 'Chapter 8: Rotational Kinematics & Angular Momentum',
    fileName: 'Chapter_8_Rotational_Motion_and_Torque.pdf',
    fileSize: '3.4 MB',
    uploadedAt: 'Yesterday',
    pageCount: 28,
    topics: ['Torque', 'Moment of Inertia', 'Conservation of L', 'Rolling Motion'],
    aiSummary: 'Comprehensive curriculum chapter covering torque calculations (τ = r × F), rotational inertia of common geometries, angular momentum conservation, and rotational kinetic energy relations. Referenced for exam formulation.',
  },
  {
    id: 'res_2',
    classId: 'c1',
    title: 'AP Physics Official Formula Sheet & Constants (2026)',
    fileName: 'AP_Physics_Official_Formula_Sheet_2026.pdf',
    fileSize: '1.1 MB',
    uploadedAt: '3 days ago',
    pageCount: 4,
    topics: ['Constants', 'Mechanics Equations', 'Unit Conversions'],
    aiSummary: 'Official College Board reference tables including physical constants (g = 9.8 m/s², G = 6.67e-11) and mechanical kinematic expressions approved for proctored examination reference.',
  },
  {
    id: 'res_3',
    classId: 'c2',
    title: 'Thermodynamics & Reaction Kinetics Notes',
    fileName: 'Chemistry_Unit_4_Thermodynamics.pdf',
    fileSize: '2.8 MB',
    uploadedAt: 'Last week',
    pageCount: 19,
    topics: ['Enthalpy', 'Entropy', 'Gibbs Free Energy', 'Equilibrium'],
    aiSummary: 'Standard Class 9-10 chemistry reference guide for chemical equilibria, Hess’s law, and exothermic versus endothermic reaction profiles.',
  },
];

export function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  
  // Classes State with LocalStorage persistence
  const [classes, setClasses] = useState<ClassItem[]>(() => {
    try {
      const saved = localStorage.getItem('lockin_classes');
      if (saved) {
        const parsed: ClassItem[] = JSON.parse(saved);
        // Ensure legacy classes have teacher assignments
        return parsed.map((c) => {
          if (!c.teacherId) {
            return c.id === 'c2'
              ? { ...c, teacherId: 't_walter', teacherName: 'Prof. Walter White' }
              : { ...c, teacherId: 't_connor', teacherName: 'Dr. Sarah Connor' };
          }
          return c;
        });
      }
      return INITIAL_CLASSES;
    } catch {
      return INITIAL_CLASSES;
    }
  });

  // Enrolled Classes for student
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([
    {
      id: 'c3',
      name: 'Class 1-2 - Scratch & Intro to Python',
      teacher: 'Dr. Connor',
      subject: 'Computer Science',
      classLevel: 'Class 1-2',
      pendingCount: 1,
    },
    {
      id: 'c1',
      name: 'Class 11-12 - AP Physics C',
      teacher: 'Dr. Connor',
      subject: 'Physics',
      classLevel: 'Class 11-12',
      pendingCount: 1,
    },
  ]);

  // Worksheets State with LocalStorage persistence
  const [worksheets, setWorksheets] = useState<WorksheetItem[]>(() => {
    try {
      const saved = localStorage.getItem('lockin_worksheets');
      return saved ? JSON.parse(saved) : INITIAL_WORKSHEETS;
    } catch {
      return INITIAL_WORKSHEETS;
    }
  });

  // Submissions State with LocalStorage persistence
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(() => {
    try {
      const saved = localStorage.getItem('lockin_submissions');
      return saved ? JSON.parse(saved) : INITIAL_SUBMISSIONS;
    } catch {
      return INITIAL_SUBMISSIONS;
    }
  });

  // Class Resources (PDFs) with LocalStorage persistence
  const [resources, setResources] = useState<ClassResource[]>(() => {
    try {
      const saved = localStorage.getItem('lockin_class_resources');
      return saved ? JSON.parse(saved) : INITIAL_RESOURCES;
    } catch {
      return INITIAL_RESOURCES;
    }
  });

  // Shared Real-Time Active Student Session (Connects Student Demo & Teacher Demo)
  const [liveStudentSession, setLiveStudentSession] = useState<ActiveStudentSession | null>(() => {
    try {
      const saved = localStorage.getItem('lockin_live_student_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Navigation State
  const [selectedTeacherClass, setSelectedTeacherClass] = useState<ClassItem | null>(null);
  const [selectedStudentClass, setSelectedStudentClass] = useState<EnrolledClass | null>(null);
  const [activeWorksheetToTake, setActiveWorksheetToTake] = useState<WorksheetItem | null>(null);
  
  // Quick Class Creation Modal
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [quickClassName, setQuickClassName] = useState('');
  const [quickSubject, setQuickSubject] = useState('');
  const [quickLevel, setQuickLevel] = useState('Class 1-2');

  const [studentCoins, setStudentCoins] = useState<number>(340);
  const [studentStreak, setStudentStreak] = useState<number>(7);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lockin_classes', JSON.stringify(classes));
      localStorage.setItem('lockin_worksheets', JSON.stringify(worksheets));
      localStorage.setItem('lockin_submissions', JSON.stringify(submissions));
      localStorage.setItem('lockin_class_resources', JSON.stringify(resources));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }, [classes, worksheets, submissions, resources]);

  const handleAddClass = (newClass: ClassItem) => {
    setClasses((prev) => [newClass, ...prev]);
  };

  const handleAddWorksheet = (newWs: WorksheetItem) => {
    setWorksheets((prev) => [newWs, ...prev]);
    setClasses((prev) =>
      prev.map((c) => c.id === newWs.classId ? { ...c, activeWorksheets: c.activeWorksheets + 1 } : c)
    );
  };

  const handleDeleteWorksheet = (wsId: string) => {
    setWorksheets((prev) => prev.filter((w) => w.id !== wsId));
  };

  const handleAddResource = (newRes: ClassResource) => {
    setResources((prev) => [newRes, ...prev]);
  };

  const handleDeleteResource = (resId: string) => {
    setResources((prev) => prev.filter((r) => r.id !== resId));
  };

  const handleEnrollClass = (newEnrolled: EnrolledClass) => {
    if (!enrolledClasses.some((c) => c.id === newEnrolled.id)) {
      setEnrolledClasses((prev) => [...prev, newEnrolled]);
    }
  };

  const handleQuickCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'LOCK-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const created: ClassItem = {
      id: `c_${Date.now()}`,
      name: quickClassName,
      subject: quickSubject,
      classLevel: quickLevel,
      joinCode: code,
      teacherId: currentUser?.id,
      teacherName: currentUser?.name,
      studentCount: 0,
      activeWorksheets: 0,
    };
    handleAddClass(created);
    setIsAddClassModalOpen(false);
    setQuickClassName('');
    setQuickSubject('');
  };

  // Authentication Switch
  if (!currentUser) {
    return <AuthGateway onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  // Teacher Experience
  if (currentUser.role === 'teacher') {
    // Filter classes so teacher can ONLY see their own classes
    const teacherOwnedClasses = classes.filter(
      (c) => c.teacherId === currentUser.id || (!c.teacherId && currentUser.id === 't_connor')
    );

    if (selectedTeacherClass) {
      return (
        <>
          <TeacherClassDashboard
            classInfo={selectedTeacherClass}
            resources={resources}
            worksheets={worksheets}
            submissions={submissions}
            activeStudentSession={liveStudentSession}
            onAddResource={handleAddResource}
            onDeleteResource={handleDeleteResource}
            onAddWorksheet={handleAddWorksheet}
            onDeleteWorksheet={handleDeleteWorksheet}
            onOpenAddClassModal={() => setIsAddClassModalOpen(true)}
            onBack={() => setSelectedTeacherClass(null)}
          />

          {/* Add Class Modal accessible from anywhere */}
          {isAddClassModalOpen && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-1">Add New Class</h3>
                <p className="text-xs text-slate-400 mb-5">
                  Set class name, subject, and class level (e.g. Class 1-2). An enrollment code will be generated.
                </p>

                <form onSubmit={handleQuickCreateClass} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Class Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Period 4 - Practical Coding"
                      value={quickClassName}
                      onChange={(e) => setQuickClassName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Python Programming, Physics, Math"
                      value={quickSubject}
                      onChange={(e) => setQuickSubject(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Class Level</label>
                    <select
                      value={quickLevel}
                      onChange={(e) => setQuickLevel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Class 1-2">Class 1-2</option>
                      <option value="Class 3-4">Class 3-4</option>
                      <option value="Class 5-6">Class 5-6</option>
                      <option value="Class 7-8">Class 7-8</option>
                      <option value="Class 9-10">Class 9-10</option>
                      <option value="Class 11-12">Class 11-12</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddClassModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 cursor-pointer"
                    >
                      Create Class
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      );
    }

    return (
      <TeacherClassHub
        teacherId={currentUser.id}
        teacherName={currentUser.name}
        classes={teacherOwnedClasses}
        onAddClass={handleAddClass}
        onSelectClass={(cls) => setSelectedTeacherClass(cls)}
        onLogout={() => {
          setCurrentUser(null);
          setSelectedTeacherClass(null);
        }}
      />
    );
  }

  // Student Experience
  if (currentUser.role === 'student') {
    if (activeWorksheetToTake) {
      const activeClassId = activeWorksheetToTake.classId;
      const examResources = resources.filter((r) => r.classId === activeClassId);

      return (
        <LockInTestSession
          assignmentTitle={activeWorksheetToTake.title}
          worksheet={activeWorksheetToTake}
          resources={examResources}
          studentName={currentUser.name}
          onLiveUpdate={(session) => {
            setLiveStudentSession(session);
          }}
          onCancel={() => {
            setActiveWorksheetToTake(null);
            setLiveStudentSession((prev) => prev ? { ...prev, isActive: false, currentAction: 'Cancelled session' } : null);
          }}
          onFinishTest={(result) => {
            const earned = result.integrityScore >= 90 ? activeWorksheetToTake.totalPoints : Math.round(activeWorksheetToTake.totalPoints * 0.5);
            setStudentCoins((prev) => prev + earned);

            // Record submission
            const newSub: StudentSubmission = {
              id: `sub_${Date.now()}`,
              worksheetId: activeWorksheetToTake.id,
              classId: activeWorksheetToTake.classId,
              studentName: currentUser.name,
              submittedAt: 'Just now',
              timeSpentMinutes: Math.floor(Math.random() * 15) + 5,
              answers: result.answers,
              finalScore: result.finalScore,
              integrityScore: result.integrityScore,
              needsReview: result.integrityScore < 70,
              status: 'submitted',
            };
            setSubmissions((prev) => [newSub, ...prev]);
            setActiveWorksheetToTake(null);
            setLiveStudentSession((prev) => prev ? { ...prev, isActive: false, currentAction: 'Submitted worksheet' } : null);
          }}
        />
      );
    }

    if (selectedStudentClass) {
      return (
        <StudentClassWorkspace
          classInfo={selectedStudentClass}
          coins={studentCoins}
          streakDays={studentStreak}
          resources={resources}
          worksheets={worksheets}
          onBack={() => setSelectedStudentClass(null)}
          onStartExam={(ws) => setActiveWorksheetToTake(ws)}
          onUpdateCoins={(newBalance) => setStudentCoins(newBalance)}
        />
      );
    }

    return (
      <StudentClassHub
        studentName={currentUser.name}
        enrolledClasses={enrolledClasses}
        availableClasses={classes}
        onEnrollClass={handleEnrollClass}
        onEnterClass={(cls) => setSelectedStudentClass(cls)}
        onStartExamDirect={(title) => {
          const matched = worksheets.find((w) => w.title.includes('Practical') || w.format === 'practical_screenshot') || worksheets[0];
          setActiveWorksheetToTake(matched);
        }}
        onLogout={() => {
          setCurrentUser(null);
          setSelectedStudentClass(null);
        }}
      />
    );
  }

  return null;
}

export default App;
