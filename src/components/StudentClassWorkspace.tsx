import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, BookOpen, Clock, Award, ShieldCheck, Flame, 
  CheckCircle2, Play, Pause, RotateCcw, ShoppingBag, Sparkles, 
  AlertCircle, FileText, Eye, Download, Laptop, Camera 
} from 'lucide-react';
import { EnrolledClass, ClassResource, WorksheetItem } from '../types';
import { PDFViewerModal } from './PDFViewerModal';

interface StudentClassWorkspaceProps {
  classInfo: EnrolledClass;
  coins: number;
  streakDays: number;
  resources: ClassResource[];
  worksheets: WorksheetItem[];
  onBack: () => void;
  onStartExam: (worksheet: WorksheetItem) => void;
  onUpdateCoins: (newBalance: number) => void;
}

export const StudentClassWorkspace: React.FC<StudentClassWorkspaceProps> = ({
  classInfo,
  coins,
  streakDays,
  resources,
  worksheets,
  onBack,
  onStartExam,
  onUpdateCoins,
}) => {
  const [activeTab, setActiveTab] = useState<'assignments' | 'resources' | 'timer' | 'store'>('assignments');
  const [viewingResource, setViewingResource] = useState<ClassResource | null>(null);

  // Filter resources and worksheets for this class
  const classResources = resources.filter((r) => r.classId === classInfo.id);
  const classWorksheets = worksheets.filter((w) => w.classId === classInfo.id);

  // Pomodoro State
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'break'>('work');
  const [timerSeconds, setTimerSeconds] = useState<number>(25 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(3);

  // Store Items
  const [storeInventory, setStoreInventory] = useState([
    { id: 'item1', name: 'Freeze Streak Shield', cost: 120, desc: 'Prevents streak loss if you miss 1 study day', owned: true, icon: '🛡️' },
    { id: 'item2', name: 'Cyberpunk Focus Theme', cost: 200, desc: 'Unlock neon cyber theme for test canvas', owned: false, icon: '🎨' },
    { id: 'item3', name: 'Golden Proctor Badge', cost: 350, desc: 'Displayed on teacher leaderboard for 100% integrity', owned: false, icon: '🥇' },
    { id: 'item4', name: 'Lo-Fi Audio Soundpack', cost: 150, desc: 'Calming ambient sound loops for study timer', owned: false, icon: '🎧' },
  ]);

  // Pomodoro Countdown effect
  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (pomodoroMode === 'work') {
              setCompletedSessions((c) => c + 1);
              onUpdateCoins(coins + 15);
              setPomodoroMode('break');
              return 5 * 60;
            } else {
              setPomodoroMode('work');
              return 25 * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, pomodoroMode, coins, onUpdateCoins]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleBuyItem = (item: typeof storeInventory[0]) => {
    if (coins < item.cost) {
      alert("Not enough LockIn Coins! Complete proctored worksheets or study sessions to earn more.");
      return;
    }
    onUpdateCoins(coins - item.cost);
    setStoreInventory((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, owned: true } : i))
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10">
      {/* Top Bar */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-800 gap-4">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Class Hub
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{classInfo.name}</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
              {classInfo.classLevel}
            </span>
            <span className="text-xs text-slate-400">{classInfo.subject}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Instructor: {classInfo.teacher}</p>
        </div>

        {/* Tab Selector & Stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs font-bold font-mono">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>{coins} Coins</span>
          </div>

          <div className="flex flex-wrap bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'assignments' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Worksheets ({classWorksheets.length})
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'resources' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Course PDFs ({classResources.length})
            </button>
            <button
              onClick={() => setActiveTab('timer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'timer' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Study Timer
            </button>
            <button
              onClick={() => setActiveTab('store')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'store' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Rewards Store
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: Assigned Worksheets */}
      {activeTab === 'assignments' && (
        <div className="max-w-6xl mx-auto mt-8 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-200 mb-3">
              Pending Worksheets & Practical Assignments ({classWorksheets.length})
            </h2>

            {classWorksheets.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">All Caught Up!</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Your teacher has not assigned any pending worksheets for this class yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {classWorksheets.map((ws) => (
                  <div 
                    key={ws.id}
                    className="bg-slate-900 border-2 border-purple-600/60 rounded-2xl p-6 shadow-xl relative overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                            ws.format === 'practical_screenshot'
                              ? 'bg-purple-950 text-purple-300 border-purple-800'
                              : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                          }`}>
                            {ws.format === 'practical_screenshot' ? 'Practical: Upload End Result Screenshot' : 'Proctored Worksheet'}
                          </span>
                          <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800">
                            +{ws.totalPoints} Reward Coins
                          </span>
                          {ws.attachmentFileName && (
                            <span className="text-[10px] text-indigo-300 bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Teacher Attachment
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-white">{ws.title}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {ws.instructions}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 font-mono">
                          Time Limit: {ws.timeLimitMinutes} Mins • Total Tasks: {ws.questions.length} • Socratic AI Tutor Active
                        </p>
                      </div>

                      <button
                        onClick={() => onStartExam(ws)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 cursor-pointer transition-all hover:scale-105 shrink-0"
                      >
                        {ws.format === 'practical_screenshot' ? (
                          <>
                            <Camera className="w-4 h-4" />
                            Start Practical Lab
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            Launch LockIn Session
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-200 mb-3">Completed Worksheets</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-bold text-white text-sm">Newton's Laws & Friction Review</h4>
                  <span className="text-slate-400 text-[11px]">Submitted • Graded by Dr. Connor</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-emerald-400 font-bold text-xs bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800">
                    Grade: 96/100
                  </span>
                  <span className="font-mono text-indigo-400 font-bold text-xs bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-800">
                    Integrity: 100%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Course PDFs & Reference Materials */}
      {activeTab === 'resources' && (
        <div className="max-w-6xl mx-auto mt-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Teacher's Course Materials & Reference PDFs ({classInfo.classLevel})
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Read and review lecture notes and lab guides uploaded by your teacher. The AI references these documents when crafting worksheets.
            </p>
          </div>

          {classResources.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white">No PDFs Available</h3>
              <p className="text-xs text-slate-400 mt-1">Your teacher has not uploaded any course PDFs for this class yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classResources.map((res) => (
                <div
                  key={res.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-purple-600/50 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                        {res.fileSize}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white line-clamp-1">{res.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{res.fileName}</p>

                    <p className="text-xs text-slate-300 mt-3 line-clamp-2 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                      {res.aiSummary}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {res.topics.slice(0, 2).map((t, i) => (
                        <span key={i} className="text-[10px] bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded-md border border-purple-800/60">
                          {t}
                        </span>
                      ))}
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md">
                        {res.pageCount} Pages
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                    <button
                      onClick={() => setViewingResource(res)}
                      className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Read Document
                    </button>
                    {res.dataUrl && (
                      <a
                        href={res.dataUrl}
                        download={res.fileName}
                        className="text-slate-400 hover:text-white p-1 cursor-pointer"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Study Timer / Pomodoro */}
      {activeTab === 'timer' && (
        <div className="max-w-2xl mx-auto mt-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="flex justify-center gap-2">
            <button
              onClick={() => {
                setPomodoroMode('work');
                setTimerSeconds(25 * 60);
                setTimerRunning(false);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                pomodoroMode === 'work'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              Focus Session (25m)
            </button>
            <button
              onClick={() => {
                setPomodoroMode('break');
                setTimerSeconds(5 * 60);
                setTimerRunning(false);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                pomodoroMode === 'break'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              Short Break (5m)
            </button>
          </div>

          <div className="my-8">
            <div className="text-7xl font-extrabold font-mono tracking-tight text-white">
              {formatTimer(timerSeconds)}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {pomodoroMode === 'work' ? 'Stay locked in! Earn +15 coins upon completion.' : 'Rest your eyes before the next study sprint.'}
            </p>
          </div>

          <div className="flex justify-center items-center gap-4">
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-600/30 cursor-pointer"
            >
              {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {timerRunning ? 'Pause Focus' : 'Start Focus'}
            </button>
            <button
              onClick={() => {
                setTimerRunning(false);
                setTimerSeconds(pomodoroMode === 'work' ? 25 * 60 : 5 * 60);
              }}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-6 border-t border-slate-800 flex justify-around text-xs text-slate-400">
            <div>
              <span className="font-bold text-white text-base block">{completedSessions}</span>
              Completed Sprints
            </div>
            <div>
              <span className="font-bold text-amber-400 text-base block">+{completedSessions * 15} 🪙</span>
              Total Study Coins
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Rewards Store */}
      {activeTab === 'store' && (
        <div className="max-w-6xl mx-auto mt-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-200">LockIn Rewards Emporium</h2>
              <p className="text-xs text-slate-400">Redeem coins earned through honest exam completion and focused study intervals.</p>
            </div>
            <div className="text-xs text-amber-300 font-bold bg-amber-950/80 px-3 py-1.5 rounded-xl border border-amber-800">
              Balance: {coins} 🪙
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {storeInventory.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="text-sm font-bold text-white">{item.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-mono font-bold text-amber-400">{item.cost} 🪙</span>
                  {item.owned ? (
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Owned
                    </span>
                  ) : (
                    <button
                      onClick={() => handleBuyItem(item)}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Unlock
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        resource={viewingResource}
        onClose={() => setViewingResource(null)}
      />
    </div>
  );
};
