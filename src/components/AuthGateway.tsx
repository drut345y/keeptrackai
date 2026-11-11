import React, { useState } from 'react';
import { GraduationCap, BookOpen, ShieldCheck, ArrowRight, Lock, Mail, Key } from 'lucide-react';

interface AuthGatewayProps {
  onLoginSuccess: (user: { id: string; role: 'teacher' | 'student'; name: string }) => void;
}

// Pre-configured accounts for testing
const PRECONFIGURED_ACCOUNTS: Record<string, { role: 'teacher' | 'student'; id: string; name: string; password: string }> = {
  // Primary KeepTrackAI accounts
  'teacher@keeptrack.ai': {
    role: 'teacher',
    id: 't_connor',
    name: 'Dr. Sarah Connor',
    password: 'password123',
  },
  'teacher2@keeptrack.ai': {
    role: 'teacher',
    id: 't_walter',
    name: 'Prof. Walter White',
    password: 'password123',
  },
  'student@keeptrack.ai': {
    role: 'student',
    id: 's_demo',
    name: 'Alex Rivera',
    password: 'password123',
  },
  // Legacy Aliases
  'teacher@lockin.ai': {
    role: 'teacher',
    id: 't_connor',
    name: 'Dr. Sarah Connor',
    password: 'password123',
  },
  'teacher2@lockin.ai': {
    role: 'teacher',
    id: 't_walter',
    name: 'Prof. Walter White',
    password: 'password123',
  },
  'student@lockin.ai': {
    role: 'student',
    id: 's_demo',
    name: 'Alex Rivera',
    password: 'password123',
  },
};

export const AuthGateway: React.FC<AuthGatewayProps> = ({ onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student'>('teacher');
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const normalizedEmail = email.trim().toLowerCase();

    // Sign in verification for preconfigured accounts
    if (!isSignUp) {
      const knownUser = PRECONFIGURED_ACCOUNTS[normalizedEmail];
      if (knownUser) {
        if (password !== knownUser.password) {
          setAuthError('Incorrect password. (Hint: use password123)');
          return;
        }
        if (knownUser.role !== selectedRole) {
          setAuthError(`This account is registered as a ${knownUser.role}. Please select the ${knownUser.role === 'teacher' ? 'Teacher' : 'Student'} tab above.`);
          return;
        }
        onLoginSuccess({
          id: knownUser.id,
          role: knownUser.role,
          name: knownUser.name,
        });
        return;
      }
    }

    // Custom login / sign-up fallback for any new user
    const safeKey = (normalizedEmail || fullName || 'user').replace(/[^a-z0-9]/g, '_');
    onLoginSuccess({
      id: `${selectedRole === 'teacher' ? 't_' : 's_'}${safeKey}`,
      role: selectedRole,
      name: fullName || (normalizedEmail ? normalizedEmail.split('@')[0] : (selectedRole === 'teacher' ? 'Instructor' : 'Student')),
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden py-10">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 blur-3xl pointer-events-none rounded-full" />

      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-6 z-10">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            KeepTrackAI
          </h1>
          <p className="text-xs text-slate-400">Proctored Mastery & Intelligent Class Hub</p>
        </div>
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl z-10">
        {/* Role Toggle Selector */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('teacher');
              setAuthError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              selectedRole === 'teacher'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Teacher Portal
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRole('student');
              setAuthError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              selectedRole === 'student'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Student Portal
          </button>
        </div>

        {/* Portal Description Badge */}
        <div className="mb-5 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-start gap-3">
          <div className={`p-1.5 rounded-lg mt-0.5 ${selectedRole === 'teacher' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-purple-500/20 text-purple-400'}`}>
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-300">
            {selectedRole === 'teacher' ? (
              <span>Teacher login provides exclusive access to manage your own classes, create worksheets, and monitor live test feeds.</span>
            ) : (
              <span>Student login allows enrolled access to complete worksheets, submit practical lab screenshots, and earn points.</span>
            )}
          </div>
        </div>

        {/* Auth Error Notification */}
        {authError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs">
            {authError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={selectedRole === 'teacher' ? 'Dr. Elizabeth Warren' : 'Jordan Smith'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={selectedRole === 'teacher' ? 'teacher@keeptrack.ai' : 'student@keeptrack.ai'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm text-white transition-all shadow-lg mt-2 cursor-pointer ${
              selectedRole === 'teacher'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-600/30'
                : 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 shadow-purple-600/30'
            }`}
          >
            <span>{isSignUp ? 'Create Account & Enter Hub' : 'Sign In to Hub'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle sign in / sign up */}
        <div className="mt-4 text-center text-xs text-slate-400">
          {isSignUp ? 'Already registered?' : "Don't have an account yet?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setAuthError(null);
            }}
            className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4 ml-1 cursor-pointer"
          >
            {isSignUp ? 'Sign In' : 'Create Account'}
          </button>
        </div>
      </div>

      {/* Credentials Cheat-Sheet Card for User */}
      <div className="w-full max-w-md mt-6 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 z-10 space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            Test Accounts Credentials
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Password: password123</span>
        </div>

        <div className="space-y-2">
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/60 flex justify-between items-center">
            <div>
              <div className="font-semibold text-indigo-300">Teacher 1 (Dr. Connor)</div>
              <div className="font-mono text-slate-400 text-[11px]">teacher@keeptrack.ai</div>
              <div className="text-[10px] text-slate-500">Classes: AP Physics C, Intro to Python</div>
            </div>
            <button
              onClick={() => {
                setSelectedRole('teacher');
                setEmail('teacher@keeptrack.ai');
                setPassword('password123');
              }}
              className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 cursor-pointer"
            >
              Fill
            </button>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/60 flex justify-between items-center">
            <div>
              <div className="font-semibold text-indigo-300">Teacher 2 (Prof. White)</div>
              <div className="font-mono text-slate-400 text-[11px]">teacher2@keeptrack.ai</div>
              <div className="text-[10px] text-slate-500">Classes: Honors Chemistry</div>
            </div>
            <button
              onClick={() => {
                setSelectedRole('teacher');
                setEmail('teacher2@keeptrack.ai');
                setPassword('password123');
              }}
              className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 cursor-pointer"
            >
              Fill
            </button>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/60 flex justify-between items-center">
            <div>
              <div className="font-semibold text-purple-300">Student (Alex Rivera)</div>
              <div className="font-mono text-slate-400 text-[11px]">student@keeptrack.ai</div>
              <div className="text-[10px] text-slate-500">Enrolled in: Python Lab & Physics</div>
            </div>
            <button
              onClick={() => {
                setSelectedRole('student');
                setEmail('student@keeptrack.ai');
                setPassword('password123');
              }}
              className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 cursor-pointer"
            >
              Fill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
