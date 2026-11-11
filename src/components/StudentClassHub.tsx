import React, { useState } from 'react';
import { Key, Plus, BookOpen, Flame, Award, ArrowRight, ShieldCheck, LogOut, Layers } from 'lucide-react';
import { EnrolledClass, ClassItem } from '../types';

export const StudentClassHub: React.FC<{
  studentName: string;
  enrolledClasses: EnrolledClass[];
  availableClasses: ClassItem[];
  onEnrollClass: (newEnrolled: EnrolledClass) => void;
  onEnterClass: (cls: EnrolledClass) => void;
  onStartExamDirect: (title: string) => void;
  onLogout: () => void;
}> = ({ 
  studentName, 
  enrolledClasses, 
  availableClasses, 
  onEnrollClass, 
  onEnterClass, 
  onStartExamDirect, 
  onLogout 
}) => {
  const [coins] = useState<number>(340);
  const [streakDays] = useState<number>(7);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = inputCode.trim().toUpperCase();
    
    // Look for matching class code in availableClasses
    const matchedClass = availableClasses.find((c) => c.joinCode === formatted);
    
    if (matchedClass) {
      const newClass: EnrolledClass = {
        id: matchedClass.id,
        name: matchedClass.name,
        teacher: matchedClass.teacherName || 'Dr. Connor',
        subject: matchedClass.subject,
        classLevel: matchedClass.classLevel,
        pendingCount: 1,
      };
      onEnrollClass(newClass);
      setInputCode('');
      setJoinError('');
      setIsJoinModalOpen(false);
      return;
    }

    if (!formatted.startsWith('LOCK-') || formatted.length < 8) {
      setJoinError('Invalid code. Codes follow the pattern LOCK-XXXX (e.g. LOCK-892F).');
      return;
    }

    // Fallback if custom generated code
    const fallbackClass: EnrolledClass = {
      id: `enr_${Date.now()}`,
      name: 'Class ' + formatted,
      teacher: 'Instructor',
      subject: 'Assigned Course',
      classLevel: 'Class 1-2',
      pendingCount: 1,
    };

    onEnrollClass(fallbackClass);
    setInputCode('');
    setJoinError('');
    setIsJoinModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10">
      {/* Header Bar with Gamification Stats */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center pb-8 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            Student Class Hub
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Welcome, {studentName}</h1>
          <p className="text-sm text-slate-400 mt-1">Access your enrolled class levels, practical worksheets, and rewards.</p>
        </div>

        {/* Gamification Pills */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs font-bold">
            <Award className="w-4 h-4 text-amber-400" />
            <span>{coins} LockIn Coins</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-950/60 border border-orange-800/80 text-orange-300 text-xs font-bold">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>{streakDays} Day Streak</span>
          </div>
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-xs text-white shadow-lg shadow-purple-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Join Class Code
          </button>
          <button
            onClick={onLogout}
            title="Log out"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pending Assignment Banner */}
      <div className="max-w-6xl mx-auto mt-6 p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-purple-800">
            Pending Practical / Theory Worksheets
          </span>
          <h3 className="text-lg font-bold text-white mt-1.5">Interactive Assignments Available</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Theory tests & Coding Practical assignments (upload end result screenshot to complete).
          </p>
        </div>
        <button
          onClick={() => onStartExamDirect('Practical Lab: Python Fibonacci & Terminal Output')}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          Try Practical Coding Lab
        </button>
      </div>

      {/* Enrolled Classes Grid */}
      <div className="max-w-6xl mx-auto mt-8">
        <h2 className="text-base font-semibold text-slate-300 mb-4">Your Enrolled Classes ({enrolledClasses.length})</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrolledClasses.map((cls) => (
            <div
              key={cls.id}
              onClick={() => onEnterClass(cls)}
              className="bg-slate-900 border border-slate-800 hover:border-purple-600/60 rounded-2xl p-6 transition-all cursor-pointer group shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/80">
                    {cls.classLevel || 'Class 1-2'}
                  </span>
                  <span className="text-xs text-slate-400">{cls.subject}</span>
                </div>
                
                <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors mt-3">
                  {cls.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Instructor: {cls.teacher}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                <span className={`text-xs font-semibold ${cls.pendingCount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {cls.pendingCount > 0 ? `${cls.pendingCount} Pending Assignment` : 'All caught up'}
                </span>
                <div className="flex items-center gap-1 text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
                  Enter Class
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Join Class Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Key className="w-4 h-4" />
              Enrollment
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Join with Class Code</h3>
            <p className="text-xs text-slate-400 mb-5">
              Ask your teacher for the 8-character join code (e.g. LOCK-892F, LOCK-419K, LOCK-773X).
            </p>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Join Code</label>
                <input
                  type="text"
                  required
                  placeholder="LOCK-XXXX"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  className="w-full uppercase font-mono tracking-wider bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
                {joinError && <p className="text-xs text-rose-400 mt-1.5">{joinError}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  Enroll Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
