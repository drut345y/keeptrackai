import React, { useState } from 'react';
import { Plus, Users, BookOpen, Key, Copy, Check, ArrowRight, Shield, Layers, LogOut, Sparkles } from 'lucide-react';
import { ClassItem } from '../types';

interface TeacherClassHubProps {
  teacherId: string;
  teacherName: string;
  classes: ClassItem[];
  onAddClass: (classItem: ClassItem) => void;
  onSelectClass: (classItem: ClassItem) => void;
  onLogout: () => void;
}

export const TeacherClassHub: React.FC<TeacherClassHubProps> = ({ 
  teacherId,
  teacherName, 
  classes, 
  onAddClass, 
  onSelectClass, 
  onLogout 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [newClassName, setNewClassName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newClassLevel, setNewClassLevel] = useState('Class 1-2');
  const [customLevel, setCustomLevel] = useState('');

  const generateJoinCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'LOCK-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    const finalLevel = newClassLevel === 'Custom' ? (customLevel || 'Class 1-2') : newClassLevel;
    const created: ClassItem = {
      id: `c_${Date.now()}`,
      name: newClassName,
      subject: newSubject,
      classLevel: finalLevel,
      joinCode: generateJoinCode(),
      teacherId,
      teacherName,
      studentCount: 0,
      activeWorksheets: 0,
    };
    onAddClass(created);
    setIsModalOpen(false);
    setNewClassName('');
    setNewSubject('');
    setCustomLevel('');
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-8 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            Teacher Class Hub
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Welcome, {teacherName}</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your classes, assign AI or custom worksheets, and proctor student sessions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Class
          </button>
          <button
            onClick={onLogout}
            title="Log out"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Class Grid */}
      <div className="max-w-7xl mx-auto mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Your Active Classes ({classes.length})
          </h2>
          <span className="text-xs text-slate-500">
            Levels formatted by class tiers (e.g. Class 1-2, Class 9-10)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-xl"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/80">
                    {cls.classLevel}
                  </span>
                  
                  {/* Join Code Capsule */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(cls.joinCode);
                    }}
                    title="Click to copy student join code"
                    className="flex items-center gap-1.5 text-xs font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 px-2.5 py-1 rounded-lg hover:bg-indigo-900 transition-all cursor-pointer"
                  >
                    <Key className="w-3 h-3 text-indigo-400" />
                    <span>{cls.joinCode}</span>
                    {copiedCode === cls.joinCode ? (
                      <Check className="w-3 h-3 text-emerald-400 ml-1" />
                    ) : (
                      <Copy className="w-3 h-3 text-indigo-400 ml-1 opacity-70 group-hover:opacity-100" />
                    )}
                  </button>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {cls.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{cls.subject}</p>

                <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span><strong>{cls.studentCount}</strong> Students</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <BookOpen className="w-4 h-4 text-slate-500" />
                    <span><strong>{cls.activeWorksheets}</strong> Worksheets</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-500">Live proctoring & practicals ready</span>
                <button
                  onClick={() => onSelectClass(cls)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  Enter Workspace
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add New Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Add New Class</h3>
            <p className="text-xs text-slate-400 mb-5">
              Set up your class name, subject, and class level (e.g. Class 1-2). An enrollment join code will be generated.
            </p>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Class Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Period 1 - Coding Practicals"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science, Science Lab, Math"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Class Level</label>
                <select
                  value={newClassLevel}
                  onChange={(e) => setNewClassLevel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Class 1-2">Class 1-2 (Primary)</option>
                  <option value="Class 3-4">Class 3-4 (Junior)</option>
                  <option value="Class 5-6">Class 5-6 (Middle)</option>
                  <option value="Class 7-8">Class 7-8 (Upper Middle)</option>
                  <option value="Class 9-10">Class 9-10 (Secondary)</option>
                  <option value="Class 11-12">Class 11-12 (Senior / College Prep)</option>
                  <option value="Custom">Custom Class Level...</option>
                </select>
              </div>

              {newClassLevel === 'Custom' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Custom Class Level Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Class 1, Class 2, Honors Practical"
                    value={customLevel}
                    onChange={(e) => setCustomLevel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  Generate & Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
