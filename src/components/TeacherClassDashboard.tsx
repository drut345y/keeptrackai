import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Activity, AlertTriangle, Eye, ShieldCheck, CheckCircle2, 
  Send, Edit3, Trash2, ArrowLeft, Plus, FileText, Upload, Download, 
  ExternalLink, Check, BookOpen, Laptop, Camera, Image as ImageIcon, Layers,
  Lock, Smartphone
} from 'lucide-react';
import { ClassItem, ClassResource, WorksheetItem, Question, StudentSubmission, ActiveStudentSession } from '../types';
import { PDFViewerModal } from './PDFViewerModal';

interface TeacherClassDashboardProps {
  classInfo: ClassItem;
  resources: ClassResource[];
  worksheets: WorksheetItem[];
  submissions: StudentSubmission[];
  activeStudentSession?: ActiveStudentSession | null;
  onAddResource: (resource: ClassResource) => void;
  onDeleteResource: (id: string) => void;
  onAddWorksheet: (worksheet: WorksheetItem) => void;
  onDeleteWorksheet: (id: string) => void;
  onOpenAddClassModal: () => void;
  onBack: () => void;
}

export const TeacherClassDashboard: React.FC<TeacherClassDashboardProps> = ({
  classInfo,
  resources,
  worksheets,
  submissions,
  activeStudentSession: propActiveSession,
  onAddResource,
  onDeleteResource,
  onAddWorksheet,
  onDeleteWorksheet,
  onOpenAddClassModal,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'worksheets' | 'upload_own' | 'resources' | 'live_feed' | 'review'>('worksheets');

  // Filter resources and worksheets for this specific class
  const classResources = resources.filter((r) => r.classId === classInfo.id);
  const classWorksheets = worksheets.filter((w) => w.classId === classInfo.id);
  const classSubmissions = submissions.filter((s) => s.classId === classInfo.id);

  // Selected PDFs for AI Worksheet Grounding
  const [selectedPdfIds, setSelectedPdfIds] = useState<string[]>(
    classResources.map((r) => r.id)
  );

  // PDF Viewer Modal
  const [viewingResource, setViewingResource] = useState<ClassResource | null>(null);
  
  // Screenshot viewer modal for grading
  const [inspectingScreenshot, setInspectingScreenshot] = useState<string | null>(null);

  // Live Student Session synced from localStorage or props
  const [liveStudentSession, setLiveStudentSession] = useState<ActiveStudentSession | null>(propActiveSession || null);

  useEffect(() => {
    // Read live session on mount and listen to storage events
    const checkLiveSession = () => {
      try {
        const stored = localStorage.getItem('lockin_live_student_session');
        if (stored) {
          const parsed: ActiveStudentSession = JSON.parse(stored);
          setLiveStudentSession(parsed);
        }
      } catch (e) {
        // Ignore
      }
    };

    checkLiveSession();
    const interval = setInterval(checkLiveSession, 1500);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lockin_live_student_session' && e.newValue) {
        try {
          setLiveStudentSession(JSON.parse(e.newValue));
        } catch (err) {
          // Ignore
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Update if prop changes
  useEffect(() => {
    if (propActiveSession) {
      setLiveStudentSession(propActiveSession);
    }
  }, [propActiveSession]);

  // File Upload Refs
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const worksheetFileInputRef = useRef<HTMLInputElement | null>(null);

  // AI Worksheet Generator Form State
  const [topic, setTopic] = useState('Rotational Kinematics & Angular Momentum');
  const [difficulty, setDifficulty] = useState('Class 11-12 (AP / Advanced)');
  const [format, setFormat] = useState<'mcq' | 'short_answer' | 'mixed' | 'practical_screenshot'>('mixed');
  const [aiBlockTabSwitching, setAiBlockTabSwitching] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [assignedSuccess, setAssignedSuccess] = useState(false);

  // Upload Own Worksheet Form State
  const [uploadedTitle, setUploadedTitle] = useState('');
  const [uploadedTopic, setUploadedTopic] = useState('');
  const [uploadedFormat, setUploadedFormat] = useState<'mcq' | 'short_answer' | 'practical_screenshot'>('practical_screenshot');
  const [uploadedBlockTabSwitching, setUploadedBlockTabSwitching] = useState<boolean>(true);
  const [uploadedInstructions, setUploadedInstructions] = useState(
    'Write a Python program to solve the assigned lab. Execute the code in your local terminal/IDE and submit a clear screenshot of the final running output.'
  );
  const [practicalCriteria, setPracticalCriteria] = useState(
    'Screenshot must show: 1) Source code window, 2) Terminal output with exit code 0, 3) All 4 test assertions passed.'
  );
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileDataUrl, setUploadedFileDataUrl] = useState<string | null>(null);
  const [uploadedPoints, setUploadedPoints] = useState<number>(50);
  const [uploadedTimeLimit, setUploadedTimeLimit] = useState<number>(30);

  // Handle uploading PDF from user disk
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a valid PDF document.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);

      const newResource: ClassResource = {
        id: `pdf_${Date.now()}`,
        classId: classInfo.id,
        title: file.name.replace(/\.pdf$/i, '').replace(/_/g, ' '),
        fileName: file.name,
        fileSize: `${sizeMB} MB`,
        uploadedAt: 'Just now',
        dataUrl,
        pageCount: Math.max(1, Math.floor(file.size / 45000)),
        topics: [classInfo.subject, classInfo.classLevel, 'Lecture Material'],
        aiSummary: `Uploaded instructor curriculum for ${classInfo.name} (${classInfo.classLevel}). LockIn AI has indexed this document for automated question synthesis, student reference, and answer rubrics.`,
      };

      onAddResource(newResource);
      setSelectedPdfIds((prev) => [...prev, newResource.id]);
    };
    reader.readAsDataURL(file);
  };

  // Handle uploading existing teacher worksheet file
  const handleWorksheetFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    if (!uploadedTitle) {
      setUploadedTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedFileDataUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Assign uploaded worksheet
  const handlePublishUploadedWorksheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedTitle.trim()) {
      alert('Please enter a worksheet title.');
      return;
    }

    const newQuestion: Question = uploadedFormat === 'practical_screenshot' ? {
      id: `q_p_${Date.now()}`,
      type: 'practical_screenshot',
      text: uploadedInstructions,
      points: uploadedPoints,
      rubric: 'Full marks awarded for clear screenshot verifying expected output criteria, clean terminal execution, and student timestamp.',
      hint: 'Ensure your terminal or application window is fully visible in the screenshot before uploading.',
      practicalInstructions: uploadedInstructions,
      expectedOutputCriteria: practicalCriteria,
    } : {
      id: `q_u_${Date.now()}`,
      type: uploadedFormat,
      text: uploadedInstructions || 'Complete the tasks specified in the attached worksheet document.',
      points: uploadedPoints,
      rubric: 'Accurate and rigorous answers based on teacher-provided worksheet.',
      hint: 'Refer to the attached assignment PDF or document.',
    };

    const newWorksheet: WorksheetItem = {
      id: `ws_${Date.now()}`,
      classId: classInfo.id,
      title: uploadedTitle,
      type: uploadedFormat === 'practical_screenshot' ? 'practical_assignment' : 'teacher_uploaded',
      topic: uploadedTopic || classInfo.subject,
      difficulty: classInfo.classLevel,
      format: uploadedFormat,
      timeLimitMinutes: uploadedTimeLimit,
      totalPoints: uploadedPoints,
      instructions: uploadedInstructions,
      questions: [newQuestion],
      attachmentFileName: uploadedFileName || undefined,
      attachmentDataUrl: uploadedFileDataUrl || undefined,
      blockTabSwitching: uploadedBlockTabSwitching,
      createdAt: 'Just now',
      status: 'active',
    };

    onAddWorksheet(newWorksheet);
    setAssignedSuccess(true);
    setTimeout(() => setAssignedSuccess(false), 3000);
    setActiveTab('worksheets');
    setUploadedTitle('');
    setUploadedFileName(null);
    setUploadedFileDataUrl(null);
  };

  const togglePdfSelection = (id: string) => {
    setSelectedPdfIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // AI Worksheet Generator action
  const handleGenerateAIWorksheet = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      const referencedPdf = classResources.find((r) => selectedPdfIds.includes(r.id));
      const sourceLabel = referencedPdf
        ? `${referencedPdf.fileName} (Page ${Math.floor(Math.random() * 12) + 1})`
        : 'Course Syllabus';

      let genQuestions: Question[] = [];

      if (format === 'practical_screenshot') {
        genQuestions = [
          {
            id: `q_prac_${Date.now()}`,
            type: 'practical_screenshot',
            text: `Practical Assignment: Build and execute a working script for ${topic}. Verify edge cases and upload a full screenshot showing the terminal output and execution result.`,
            points: 50,
            rubric: '100% credit for clean execution output, no runtime exceptions, and verified output criteria matching prompt.',
            hint: 'Use print statements or test assertions to clearly show the final result.',
            sourcePdf: sourceLabel,
            practicalInstructions: `1. Open your code editor or lab simulator.\n2. Implement the solution according to the standard.\n3. Execute the code in your terminal.\n4. Take a screenshot of the window showing the result and upload below.`,
            expectedOutputCriteria: `Must display exit code 0 with passing assertions and clear output.`,
          }
        ];
      } else {
        genQuestions = [
          {
            id: `q1_${Date.now()}`,
            type: 'mcq',
            text: `Based on ${classInfo.classLevel} standards: In ${topic}, what occurs when the net external torque is zero?`,
            options: ['Total angular momentum is strictly conserved', 'Moment of inertia doubles', 'Linear velocity drops to zero', 'Rotational kinetic energy is destroyed'],
            correctAnswer: 'Total angular momentum is strictly conserved',
            points: 25,
            rubric: 'Full marks for conservation of angular momentum under zero net external torque.',
            hint: 'Recall the rotational analogue of Newton\'s first and second laws.',
            sourcePdf: sourceLabel,
          },
          {
            id: `q2_${Date.now()}`,
            type: 'short_answer',
            text: `State Newton's third law in rotational terms, explaining how action-reaction torque pairs interact between two connected bodies.`,
            options: [],
            correctAnswer: 'Torques exerted by two bodies on each other are equal in magnitude and opposite in direction.',
            points: 25,
            rubric: 'Must state equal magnitude and opposite rotational sense.',
            hint: 'Consider internal torque cancellation in closed systems.',
            sourcePdf: sourceLabel,
          }
        ];
      }

      const generatedWorksheet: WorksheetItem = {
        id: `ws_${Date.now()}`,
        classId: classInfo.id,
        title: `${topic} (${format === 'practical_screenshot' ? 'Practical Lab' : 'Mastery Test'})`,
        type: format === 'practical_screenshot' ? 'practical_assignment' : 'ai_generated',
        topic,
        difficulty,
        format,
        timeLimitMinutes: 30,
        totalPoints: 50,
        instructions: format === 'practical_screenshot' 
          ? 'Complete the practical task and upload a screenshot of your end result.'
          : 'Answer all questions under proctored test conditions.',
        questions: genQuestions,
        blockTabSwitching: aiBlockTabSwitching,
        createdAt: 'Just now',
        status: 'active',
      };

      onAddWorksheet(generatedWorksheet);
      setAssignedSuccess(true);
      setTimeout(() => setAssignedSuccess(false), 3000);
    }, 1100);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-8">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={pdfInputRef}
        onChange={handlePdfUpload}
        accept=".pdf"
        className="hidden"
      />
      <input
        type="file"
        ref={worksheetFileInputRef}
        onChange={handleWorksheetFileUpload}
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
        className="hidden"
      />

      {/* Top Banner */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-800 gap-4">
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
            <span className="text-xs font-mono text-indigo-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-md">
              Join Code: {classInfo.joinCode}
            </span>
          </div>
        </div>

        {/* Global Action: Button to Add New Class directly from workspace */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddClassModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 cursor-pointer transition-all"
            title="Create another class without leaving this view"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            Add Another Class
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto mt-6 flex flex-wrap bg-slate-900 border border-slate-800 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('worksheets')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'worksheets' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Class Worksheets ({classWorksheets.length})
        </button>
        <button
          onClick={() => setActiveTab('upload_own')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'upload_own' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Upload Made Worksheet / Practical
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'resources' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Course PDFs ({classResources.length})
        </button>
        <button
          onClick={() => setActiveTab('live_feed')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer relative ${
            activeTab === 'live_feed' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Live Proctor Feed
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
          {liveStudentSession?.isActive && (
            <span className="ml-1 text-[10px] bg-emerald-500/30 text-emerald-300 font-mono px-1.5 py-0.2 rounded-full border border-emerald-500/50">
              Student Active
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'review' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Grading & Practical Submissions ({classSubmissions.length})
        </button>
      </div>

      {/* Success alert */}
      {assignedSuccess && (
        <div className="max-w-7xl mx-auto mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Worksheet successfully assigned to all {classInfo.name} students!
        </div>
      )}

      {/* TAB 1: Assigned Worksheets & AI Generator */}
      {activeTab === 'worksheets' && (
        <div className="max-w-7xl mx-auto mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: AI Quick Generator */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit shadow-xl space-y-5">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4" />
                AI Worksheet Engine
              </div>
              <h2 className="text-lg font-bold text-white">Generate with AI</h2>
              <p className="text-xs text-slate-400 mt-1">
                Synthesize standard worksheets or coding practicals grounded on class materials.
              </p>
            </div>

            {/* GROUNDING SOURCE: Checkbox list of uploaded PDFs */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  Ground on Class PDFs:
                </label>
                <button
                  type="button"
                  onClick={() => pdfInputRef.current?.click()}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                >
                  + Upload PDF
                </button>
              </div>

              {classResources.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  No PDFs uploaded yet. Upload syllabus or lecture notes to ground AI questions.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {classResources.map((res) => (
                    <label
                      key={res.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPdfIds.includes(res.id)}
                        onChange={() => togglePdfSelection(res.id)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span className="truncate flex-1 text-slate-200">{res.fileName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{res.pageCount}p</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Topic / Lab Assignment</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Class Level</label>
                <input
                  type="text"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Worksheet Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="mixed">Mixed (Multiple Choice + Short Answer)</option>
                  <option value="mcq">Multiple Choice Only</option>
                  <option value="short_answer">Short Answer / Derivations Only</option>
                  <option value="practical_screenshot">Practical Lab (Screenshot of End Result)</option>
                </select>
              </div>

              {/* DISABLE TAB SWITCHING TOGGLE FOR AI WORKSHEET */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    Disable Tab Switching
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={aiBlockTabSwitching}
                      onChange={(e) => setAiBlockTabSwitching(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When enabled, student's exam is strictly locked the moment they leave or switch browser tabs.
                </p>
              </div>

              <button
                onClick={handleGenerateAIWorksheet}
                disabled={isGenerating}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-semibold text-xs text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
              >
                <Sparkles className="w-4 h-4" />
                {isGenerating ? 'Synthesizing Worksheet...' : 'Generate & Assign with AI'}
              </button>
            </div>
          </div>

          {/* Right Column: List of All Assigned Worksheets */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div>
                <h3 className="text-sm font-bold text-white">Active Class Worksheets ({classWorksheets.length})</h3>
                <p className="text-xs text-slate-400">
                  Assigned to enrolled students in {classInfo.name} ({classInfo.classLevel})
                </p>
              </div>
              <button
                onClick={() => setActiveTab('upload_own')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-lg text-white shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                + Upload Made Worksheet
              </button>
            </div>

            {classWorksheets.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">No Worksheets Assigned Yet</h4>
                <p className="text-xs text-slate-400 mt-1 mb-3">
                  Use the AI generator on the left, or upload a worksheet you already made.
                </p>
              </div>
            ) : (
              classWorksheets.map((ws) => (
                <div key={ws.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          ws.format === 'practical_screenshot'
                            ? 'bg-purple-950 text-purple-300 border-purple-800'
                            : ws.type === 'teacher_uploaded'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                        }`}>
                          {ws.format === 'practical_screenshot' ? 'Practical (Screenshot Upload)' : ws.type === 'teacher_uploaded' ? 'Teacher Uploaded' : 'AI Generated'}
                        </span>
                        {ws.blockTabSwitching && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 font-mono">
                            <Lock className="w-3 h-3 text-rose-400" /> Tab Lock ON
                          </span>
                        )}
                        <span className="text-xs text-slate-400">{ws.timeLimitMinutes} Mins • {ws.totalPoints} pts</span>
                      </div>
                      <h4 className="text-base font-bold text-white">{ws.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{ws.instructions}</p>
                    </div>

                    <button
                      onClick={() => onDeleteWorksheet(ws.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      title="Remove Worksheet"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Attachment indicator if teacher uploaded an attachment */}
                  {ws.attachmentFileName && (
                    <div className="flex items-center gap-2 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-indigo-300">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span>Attached Worksheet File: <strong>{ws.attachmentFileName}</strong> (Students view this sheet directly in exam)</span>
                    </div>
                  )}

                  {/* Questions breakdown */}
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs space-y-1">
                    <span className="font-semibold text-slate-300">Assignment Tasks ({ws.questions.length}):</span>
                    {ws.questions.map((q, idx) => (
                      <div key={idx} className="text-slate-400 flex items-start gap-2">
                        <span className="text-indigo-400 font-mono">Q{idx + 1}.</span>
                        <span className="flex-1 line-clamp-1">{q.text}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{q.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Upload Made Worksheet & Practical Lab Creator */}
      {activeTab === 'upload_own' && (
        <div className="max-w-4xl mx-auto mt-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Upload className="w-4 h-4" />
              Custom Worksheet & Practical Lab Uploader
            </div>
            <h2 className="text-xl font-bold text-white">Upload Worksheet Made by Teacher</h2>
            <p className="text-xs text-slate-400 mt-1">
              Assign materials you already prepared, or create practical assignments where students submit screenshots of their coding/lab end result.
            </p>
          </div>

          <form onSubmit={handlePublishUploadedWorksheet} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Worksheet Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Python Practical 1: Calculator App Output"
                  value={uploadedTitle}
                  onChange={(e) => setUploadedTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Topic / Subject Unit</label>
                <input
                  type="text"
                  placeholder="e.g. Python Functions, Organic Chem Lab"
                  value={uploadedTopic}
                  onChange={(e) => setUploadedTopic(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Question Format Selection */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <label className="block text-xs font-bold text-indigo-300">
                Assignment Format & Submission Mode
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setUploadedFormat('practical_screenshot')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    uploadedFormat === 'practical_screenshot'
                      ? 'bg-purple-950/60 border-purple-500 text-purple-200 ring-1 ring-purple-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-white mb-1">
                    <Laptop className="w-4 h-4 text-purple-400" />
                    Practical Assignment
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Students submit an image screenshot of their end result (e.g. terminal code output, lab graph).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadedFormat('short_answer')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    uploadedFormat === 'short_answer'
                      ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-white mb-1">
                    <Edit3 className="w-4 h-4 text-indigo-400" />
                    Written Response
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Students type explanations, equations, or short answers.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadedFormat('mcq')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    uploadedFormat === 'mcq'
                      ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-white mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Multiple Choice
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Students select options corresponding to questions in your attached document.
                  </p>
                </button>
              </div>
            </div>

            {/* Upload File Attachment Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Upload Worksheet File Attachment (PDF, Image, or Doc)
              </label>
              <p className="text-[11px] text-slate-400 mb-3">
                Students will see this exact document inside their test session via the <strong>"View Worksheet Sheet"</strong> button while doing practical assignments.
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => worksheetFileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-indigo-400" />
                  {uploadedFileName ? 'Replace File' : 'Choose File from Computer'}
                </button>
                {uploadedFileName && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                    <Check className="w-3.5 h-3.5" /> Attached: {uploadedFileName}
                  </span>
                )}
              </div>
            </div>

            {/* DISABLE TAB SWITCHING TOGGLE BUTTON */}
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/60 flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-xs font-bold text-rose-300 flex items-center gap-1.5 cursor-pointer">
                  <Lock className="w-4 h-4 text-rose-400" />
                  Disable Tab Switching (Anti-Cheat Lockdown)
                </label>
                <p className="text-[11px] text-slate-400 max-w-xl">
                  Turn ON to prevent students from switching browser tabs. The instant a student minimizes or leaves the test canvas, their exam session will be locked immediately and flagged in the teacher's Live Proctor Feed.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input 
                  type="checkbox" 
                  checked={uploadedBlockTabSwitching}
                  onChange={(e) => setUploadedBlockTabSwitching(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Student Instructions / Task Prompt
              </label>
              <textarea
                rows={3}
                required
                value={uploadedInstructions}
                onChange={(e) => setUploadedInstructions(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* If Practical format: Criteria for screenshot */}
            {uploadedFormat === 'practical_screenshot' && (
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/60 space-y-2">
                <label className="block text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-purple-400" />
                  Expected End-Result Screenshot Criteria
                </label>
                <input
                  type="text"
                  value={practicalCriteria}
                  onChange={(e) => setPracticalCriteria(e.target.value)}
                  placeholder="e.g. Screenshot must show running code in terminal with exit code 0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
                <p className="text-[11px] text-slate-400">
                  During the test, students will see a screenshot upload canvas and must attach their terminal or output image to complete the worksheet.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Time Limit (Minutes)</label>
                <input
                  type="number"
                  value={uploadedTimeLimit}
                  onChange={(e) => setUploadedTimeLimit(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Total Points</label>
                <input
                  type="number"
                  value={uploadedPoints}
                  onChange={(e) => setUploadedPoints(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('worksheets')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Publish & Assign to Class
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Class PDFs & Resources */}
      {activeTab === 'resources' && (
        <div className="max-w-7xl mx-auto mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Class PDF Library ({classInfo.classLevel})
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Upload textbook chapters, formula sheets, or syllabus documents. Students can view them in their workspace, and LockIn AI will reference them.
              </p>
            </div>

            <button
              onClick={() => pdfInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs text-white rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer transition-all"
            >
              <Upload className="w-4 h-4" />
              Upload New PDF
            </button>
          </div>

          {classResources.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white">No PDFs Uploaded Yet</h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">Upload course documents to power AI generation and share materials with students.</p>
              <button
                onClick={() => pdfInputRef.current?.click()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 rounded-xl border border-slate-700 cursor-pointer"
              >
                Choose PDF File
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classResources.map((res) => (
                <div
                  key={res.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
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
                        <span key={i} className="text-[10px] bg-indigo-950/80 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-800/60">
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
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Document
                    </button>
                    <button
                      onClick={() => onDeleteResource(res.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      title="Delete PDF"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Live Proctoring Feed - CONNECTED TO LIVE STUDENT DEMO */}
      {activeTab === 'live_feed' && (
        <div className="max-w-7xl mx-auto mt-6 space-y-6">
          {/* Top Live Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Active Students</span>
              <div className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
                {liveStudentSession?.isActive ? '5 Enrolled (1 Live)' : '4 Enrolled'}
                {liveStudentSession?.isActive && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Class Integrity Avg</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {liveStudentSession ? Math.round((91.5 * 4 + liveStudentSession.integrity) / 5) : 91.5}%
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Total Infractions Logged</span>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {2 + (liveStudentSession?.violations || 0)} Events
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Active Violations</span>
              <div className="text-2xl font-bold text-rose-400 mt-1">
                {liveStudentSession && liveStudentSession.integrity < 70 ? '1 Flagged' : '0 Critical'}
              </div>
            </div>
          </div>

          {/* Student Grid (Including Real-Time Connected Student Demo) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {/* LIVE CONNECTED STUDENT DEMO CARD */}
            {liveStudentSession && (
              <div className={`bg-slate-900 border-2 rounded-2xl p-5 shadow-2xl transition-all relative ${
                liveStudentSession.integrity < 70
                  ? 'border-rose-500 ring-2 ring-rose-500/20'
                  : liveStudentSession.violations > 0
                  ? 'border-amber-500 ring-2 ring-amber-500/20'
                  : 'border-emerald-500 ring-2 ring-emerald-500/20'
              }`}>
                <div className="absolute -top-3 right-4">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-lg ${
                    liveStudentSession.isActive 
                      ? 'bg-emerald-600 text-white border-emerald-400 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {liveStudentSession.isActive ? '● LIVE DEMO CONNECTED' : 'OFFLINE'}
                  </span>
                </div>

                <div className="flex justify-between items-start mb-3 pt-1">
                  <div>
                    <h4 className="text-sm font-bold text-white">{liveStudentSession.studentName}</h4>
                    <span className="text-[11px] text-slate-300 font-medium block mt-0.5">
                      {liveStudentSession.worksheetTitle}
                    </span>
                    <span className="text-[10px] text-indigo-400 font-mono">
                      {liveStudentSession.currentAction}
                    </span>
                  </div>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                    liveStudentSession.integrity >= 90
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : liveStudentSession.integrity >= 70
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-rose-950 text-rose-300 border-rose-800'
                  }`}>
                    {liveStudentSession.integrity}%
                  </span>
                </div>

                <div className="w-full h-32 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center relative overflow-hidden">
                  {liveStudentSession.cameraSnapshotUrl ? (
                    <img 
                      src={liveStudentSession.cameraSnapshotUrl} 
                      alt="Student Live Feed" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <Eye className={`w-8 h-8 ${liveStudentSession.integrity < 70 ? 'text-rose-500 animate-bounce' : 'text-emerald-500'}`} />
                  )}
                  <span className="absolute bottom-2 left-2 text-[10px] bg-slate-900/90 px-2 py-0.5 rounded text-emerald-400 border border-slate-700 font-mono">
                    Cam: {liveStudentSession.camStatus}
                  </span>
                  {(liveStudentSession.isPhoneFlagged || liveStudentSession.currentAction.includes('Phone')) && (
                    <span className="absolute top-2 right-2 text-[9px] bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.5 rounded font-bold animate-pulse flex items-center gap-1 shadow-lg">
                      <Smartphone className="w-2.5 h-2.5 text-rose-400" />
                      PHONE IN FRAME
                    </span>
                  )}
                  {liveStudentSession.isFaceMissing && !liveStudentSession.isPhoneFlagged && (
                    <span className="absolute top-2 right-2 text-[9px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded font-bold animate-pulse flex items-center gap-1 shadow-lg">
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                      FACE MISSING
                    </span>
                  )}
                  {liveStudentSession.currentAction.includes('LOCKED') && (
                    <span className="absolute inset-0 bg-rose-950/80 flex items-center justify-center text-xs font-bold text-white uppercase tracking-wider">
                      SESSION LOCKED
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                  <span className={`font-semibold ${liveStudentSession.violations > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {liveStudentSession.violations} Infraction(s)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Real-time Sync Active
                  </span>
                </div>
              </div>
            )}

            {/* Simulated Cohort Students */}
            {[
              { id: 's1', name: 'Marcus Vance', status: 'normal', integrity: 98, lastAction: 'Writing practical output', infractions: 0, cam: 'Active' },
              { id: 's2', name: 'Sophia Chen', status: 'normal', integrity: 100, lastAction: 'Capturing terminal screenshot', infractions: 0, cam: 'Active' },
              { id: 's3', name: 'Liam Davies', status: 'warning', integrity: 85, lastAction: 'Tab Switch (1x)', infractions: 1, cam: 'Active' },
              { id: 's4', name: 'Emily Taylor', status: 'normal', integrity: 100, lastAction: 'Submitted Practical Lab', infractions: 0, cam: 'Active' },
            ].map((st) => (
              <div
                key={st.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">{st.name}</h4>
                    <span className="text-[11px] text-slate-400">{st.lastAction}</span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {st.integrity}%
                  </span>
                </div>

                <div className="w-full h-32 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center relative overflow-hidden">
                  <Eye className="w-6 h-6 text-slate-600" />
                  <span className="absolute bottom-2 left-2 text-[10px] bg-slate-900/80 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
                    Cam: {st.cam}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">{st.infractions} Infraction(s)</span>
                  <span className="text-slate-500 text-[10px]">Cohort Enrolled</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Grading & Practical Submissions Review */}
      {activeTab === 'review' && (
        <div className="max-w-7xl mx-auto mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Student Submissions & Practical Results</h3>
              <p className="text-xs text-slate-400">
                Review submitted worksheets, inspect student screenshots of end results, and verify AI scoring.
              </p>
            </div>
            <span className="text-xs font-mono text-purple-400 bg-purple-950/80 px-2.5 py-1 rounded-lg border border-purple-800/80">
              {classSubmissions.length} Submissions Logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Worksheet / Practical</th>
                  <th className="p-3">End Result Submission</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Integrity</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {classSubmissions.map((sub) => {
                  const hasScreenshot = Object.values(sub.answers).find(
                    (ans: any) => ans && typeof ans === 'object' && ans.screenshotUrl
                  );

                  return (
                    <tr key={sub.id} className="hover:bg-slate-950/40">
                      <td className="p-3 font-semibold text-white">{sub.studentName}</td>
                      <td className="p-3 text-slate-300">
                        Practical Coding: Terminal Execution
                      </td>
                      <td className="p-3">
                        {hasScreenshot ? (
                          <button
                            onClick={() => setInspectingScreenshot((hasScreenshot as any).screenshotUrl)}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-950/70 hover:bg-purple-900 text-purple-300 border border-purple-800 rounded-lg font-mono text-[11px] cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            View Screenshot
                          </button>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Text response only</span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-white">{sub.finalScore} / 100</td>
                      <td className="p-3 font-mono text-emerald-400 font-bold">{sub.integrityScore}%</td>
                      <td className="p-3">
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Graded
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        resource={viewingResource}
        onClose={() => setViewingResource(null)}
      />

      {/* Screenshot Enlarge Modal for Grading */}
      {inspectingScreenshot && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Laptop className="w-4 h-4 text-purple-400" />
                Student Practical End Result Screenshot
              </h3>
              <button
                onClick={() => setInspectingScreenshot(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Close ✕
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 flex items-center justify-center max-h-[500px]">
              <img
                src={inspectingScreenshot}
                alt="Student Practical Screenshot"
                className="max-h-[460px] w-auto object-contain rounded-lg"
              />
            </div>
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 text-xs text-purple-200">
              ✓ AI Verification: Terminal output contains clean exit code 0 and all required test statements.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
