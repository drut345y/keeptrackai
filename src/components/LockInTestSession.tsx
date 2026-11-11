import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Clock, AlertTriangle, Sparkles, Send, Video, 
  CheckCircle2, ArrowLeft, Maximize2, Minimize2, Eye, FileText, 
  BookOpen, Laptop, Camera, Upload, Check, Image as ImageIcon, X,
  Smartphone, Lock, AlertOctagon, Download, ExternalLink, HelpCircle
} from 'lucide-react';
import { useProctoringEngine } from '../hooks/useProctoringEngine';
import { ClassResource, Question, WorksheetItem } from '../types';
import { PDFViewerModal } from './PDFViewerModal';

export const LockInTestSession: React.FC<{
  assignmentTitle: string;
  worksheet?: WorksheetItem;
  resources?: ClassResource[];
  onFinishTest: (result: { finalScore: number; integrityScore: number; answers: Record<number, any> }) => void;
  onCancel: () => void;
  onLiveUpdate?: (update: {
    studentName: string;
    worksheetTitle: string;
    integrity: number;
    currentAction: string;
    violations: number;
    isActive: boolean;
    camStatus: 'Active' | 'Inactive' | 'Denied';
    lastUpdate: number;
  }) => void;
  studentName?: string;
}> = ({ 
  assignmentTitle, 
  worksheet, 
  resources = [], 
  onFinishTest, 
  onCancel,
  onLiveUpdate,
  studentName = 'Alex Mercer (Student Demo)'
}) => {
  const isTabSwitchBlocked = worksheet?.blockTabSwitching ?? false;

  const {
    integrityScore,
    violations,
    activeWarning,
    dismissWarning,
    isFaceDetected,
    isPhoneDetected,
    isSessionLocked,
    triggerWebcamInfraction,
    restoreFaceDetected,
    clearPhoneDetection,
    unlockSession,
  } = useProctoringEngine({
    sensitivity: 'standard',
    webcamRequired: true,
    allowedTabSwitches: isTabSwitchBlocked ? 0 : 1,
    inactivityThresholdSeconds: 45,
    blockTabSwitching: isTabSwitchBlocked,
  });

  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    worksheet ? worksheet.timeLimitMinutes * 60 : 1500
  );
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [viewingPdf, setViewingPdf] = useState<ClassResource | null>(null);
  
  // Sheet attachment viewer modal (for teacher's uploaded worksheet document)
  const [showAttachmentViewer, setShowAttachmentViewer] = useState(false);

  // Practical Screenshot Upload State
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Computer Vision Proctoring State & Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cocoModelRef = useRef<any>(null);
  const blazeModelRef = useRef<any>(null);
  const isDetectingRef = useRef<boolean>(false);

  const [visionStatus, setVisionStatus] = useState<string>('Initializing AI Vision...');
  const [detectedPhoneConfidence, setDetectedPhoneConfidence] = useState<number>(0);
  const [latestSnapshot, setLatestSnapshot] = useState<string | null>(null);

  // Fallback questions if no worksheet passed
  const questions: Question[] = worksheet?.questions && worksheet.questions.length > 0 
    ? worksheet.questions 
    : [
        {
          id: 'q_demo_1',
          type: 'practical_screenshot',
          text: 'Python Practical Lab: Implement a function that calculates the nth Fibonacci number. Run the script in your terminal and upload a screenshot of your terminal showing successful execution and passing assertions.',
          points: 50,
          rubric: 'Full credit for screenshot clearly verifying terminal execution exit code 0.',
          hint: 'Make sure your terminal output text is clear and readable.',
          practicalInstructions: '1. Open VS Code or any IDE.\n2. Write your code and execute in terminal.\n3. Capture a screenshot of the terminal window showing the output.\n4. Upload the screenshot below to complete the practical worksheet.',
          expectedOutputCriteria: 'Must show terminal command, exit code 0, and printed output result.',
        },
        {
          id: 'q_demo_2',
          type: 'mcq',
          text: 'Which data structure allows amortized O(1) lookups for memoizing recursive calculations?',
          options: ['Hash Map (Dictionary)', 'Linked List', 'Array without indices', 'Binary Search Tree'],
          correctAnswer: 'Hash Map (Dictionary)',
          points: 25,
          rubric: 'Full credit for identifying dictionary / hash map.',
          hint: 'Think about key-value mapping.',
        }
      ];

  // Play warning sound
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // AudioContext muted/unsupported
    }
  };

  useEffect(() => {
    if (activeWarning) {
      playAlertSound();
    }
  }, [activeWarning]);

  // Request actual camera stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: { width: 320, height: 240 } })
      .then((s) => {
        stream = s;
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => {
        setHasCameraPermission(false);
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Load AI Vision Models: BlazeFace (Face Detection) and COCO-SSD (Phone & Object Detection)
  useEffect(() => {
    let isMounted = true;

    const initModels = async () => {
      // 1. Load Google BlazeFace model
      try {
        if ((window as any).blazeface && !blazeModelRef.current) {
          const bModel = await (window as any).blazeface.load();
          if (isMounted) {
            blazeModelRef.current = bModel;
            console.log('[LockIn AI] BlazeFace model loaded.');
          }
        }
      } catch (err) {
        console.warn('[LockIn AI] BlazeFace load error:', err);
      }

      // 2. Load COCO-SSD model
      try {
        if ((window as any).cocoSsd && !cocoModelRef.current) {
          const cModel = await (window as any).cocoSsd.load();
          if (isMounted) {
            cocoModelRef.current = cModel;
            console.log('[LockIn AI] COCO-SSD model loaded.');
          }
        }
      } catch (err) {
        console.warn('[LockIn AI] COCO-SSD load error:', err);
      }

      if (isMounted) {
        if (blazeModelRef.current && cocoModelRef.current) {
          setVisionStatus('AI Vision: Full Neural Active');
        } else if (blazeModelRef.current) {
          setVisionStatus('BlazeFace Active');
        } else if (cocoModelRef.current) {
          setVisionStatus('COCO-SSD Active');
        } else {
          setVisionStatus('Initializing Vision...');
        }
      }
    };

    initModels();

    const retry = setTimeout(() => {
      if ((!blazeModelRef.current || !cocoModelRef.current) && isMounted) {
        initModels();
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearTimeout(retry);
    };
  }, []);

  // Automated Real-Time Vision Loop (Detects Face Offscreen & Phone in Camera Frame)
  useEffect(() => {
    if (!hasCameraPermission) return;

    let isRunning = true;
    let consecutiveFaceMissingFrames = 0;
    let consecutiveFacePresentFrames = 0;
    let consecutiveNoPhoneFrames = 0;
    let lastSnapshotTime = 0;

    if (!hiddenCanvasRef.current) {
      hiddenCanvasRef.current = document.createElement('canvas');
      hiddenCanvasRef.current.width = 160;
      hiddenCanvasRef.current.height = 120;
    }

    const runVisionCycle = async () => {
      if (!isRunning) return;

      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused || video.ended) {
        return;
      }

      if (isDetectingRef.current) return;
      isDetectingRef.current = true;

      try {
        let detectedPhone = false;
        let detectedFace = false;
        let phoneScore = 0;
        let phoneBox: [number, number, number, number] | null = null;
        let faceBox: [number, number, number, number] | null = null;

        // 1. DEDICATED FACE DETECTION (Google BlazeFace)
        if (blazeModelRef.current) {
          try {
            const predictions = await blazeModelRef.current.estimateFaces(video, false);
            if (predictions && predictions.length > 0) {
              const bestFace = predictions[0];
              const prob = bestFace.probability ? (Array.isArray(bestFace.probability) ? bestFace.probability[0] : bestFace.probability) : 0.95;
              if (prob >= 0.65) {
                detectedFace = true;
                const tl = bestFace.topLeft;
                const br = bestFace.bottomRight;
                if (tl && br) {
                  faceBox = [tl[0], tl[1], br[0] - tl[0], br[1] - tl[1]];
                }
              }
            }
          } catch (e) {
            // Ignore estimate error
          }
        }

        // 2. HARDWARE FACE DETECTOR API (Chromium native) if BlazeFace wasn't loaded
        if (!detectedFace && !blazeModelRef.current && 'FaceDetector' in window) {
          try {
            const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
            const faces = await detector.detect(video);
            if (faces && faces.length > 0) {
              detectedFace = true;
              const b = faces[0].boundingBox;
              faceBox = [b.x, b.y, b.width, b.height];
            }
          } catch (e) {
            // Ignore
          }
        }

        // 3. OBJECT & PHONE DETECTION (COCO-SSD)
        if (cocoModelRef.current) {
          try {
            const predictions = await cocoModelRef.current.detect(video);
            for (const p of predictions) {
              // Phone detection
              if ((p.class === 'cell phone' || p.class === 'remote') && p.score >= 0.35) {
                detectedPhone = true;
                if (p.score > phoneScore) {
                  phoneScore = p.score;
                  phoneBox = p.bbox;
                }
              }
              // Only fallback to COCO person if no face detector exists at all
              if (!detectedFace && !blazeModelRef.current && !('FaceDetector' in window)) {
                if (p.class === 'person' && p.score >= 0.65) {
                  const [, , w, h] = p.bbox;
                  const vArea = (video.videoWidth || 320) * (video.videoHeight || 240);
                  if ((w * h) / vArea >= 0.15) {
                    detectedFace = true;
                    faceBox = p.bbox;
                  }
                }
              }
            }
          } catch (e) {
            // Ignore detect error
          }
        }

        // --- EVALUATE PHONE DETECTION ---
        if (detectedPhone) {
          consecutiveNoPhoneFrames = 0;
          setDetectedPhoneConfidence(phoneScore);
          triggerWebcamInfraction('phone_detected');
        } else {
          consecutiveNoPhoneFrames++;
          if (consecutiveNoPhoneFrames >= 3) {
            setDetectedPhoneConfidence(0);
            clearPhoneDetection();
          }
        }

        // --- EVALUATE FACE OFFSCREEN DETECTION ---
        if (detectedFace) {
          consecutiveFacePresentFrames++;
          consecutiveFaceMissingFrames = 0;
          if (consecutiveFacePresentFrames >= 1) {
            restoreFaceDetected();
          }
        } else {
          consecutiveFaceMissingFrames++;
          consecutiveFacePresentFrames = 0;
          // Trigger infraction if face has been missing for 3 consecutive cycles (~1.2s)
          if (consecutiveFaceMissingFrames >= 3) {
            triggerWebcamInfraction('face_missing');
          }
        }

        // --- RENDER LIVE BOUNDING BOX OVERLAY ON CANVAS ---
        const overlayCanvas = canvasOverlayRef.current;
        if (overlayCanvas) {
          const ctx = overlayCanvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

            const scaleX = overlayCanvas.width / (video.videoWidth || 320);
            const scaleY = overlayCanvas.height / (video.videoHeight || 240);

            // Draw Face Reticle if face is detected and no phone
            if (detectedFace && faceBox && !detectedPhone) {
              const [fx, fy, fw, fh] = faceBox;
              ctx.strokeStyle = '#10b981';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(fx * scaleX, fy * scaleY, fw * scaleX, fh * scaleY);

              ctx.fillStyle = '#10b981';
              ctx.font = 'bold 9px monospace';
              ctx.fillText('● FACE VERIFIED', fx * scaleX, Math.max(10, fy * scaleY - 3));
            }

            // Draw Glowing Red Box if phone is detected
            if (detectedPhone && phoneBox) {
              const [x, y, w, h] = phoneBox;
              ctx.strokeStyle = '#f43f5e';
              ctx.lineWidth = 2.5;
              ctx.shadowColor = '#f43f5e';
              ctx.shadowBlur = 8;
              ctx.strokeRect(x * scaleX, y * scaleY, w * scaleX, h * scaleY);

              ctx.shadowBlur = 0;
              ctx.fillStyle = '#f43f5e';
              ctx.font = 'bold 10px monospace';
              ctx.fillText(`📱 PHONE ${Math.round(phoneScore * 100)}%`, x * scaleX, Math.max(12, y * scaleY - 4));
            }
          }
        }

        // --- CAPTURE PERIODIC LIVE SNAPSHOT FOR TEACHER PROCTOR FEED ---
        const now = Date.now();
        const hCanvas = hiddenCanvasRef.current;
        if (now - lastSnapshotTime > 1600 && hCanvas) {
          lastSnapshotTime = now;
          const hCtx = hCanvas.getContext('2d');
          if (hCtx) {
            hCtx.drawImage(video, 0, 0, 160, 120);
            try {
              const snapshotDataUrl = hCanvas.toDataURL('image/jpeg', 0.55);
              setLatestSnapshot(snapshotDataUrl);
            } catch (e) {
              // Ignore
            }
          }
        }
      } catch (e) {
        // Safe catch
      } finally {
        isDetectingRef.current = false;
      }
    };

    const interval = setInterval(runVisionCycle, 400);

    return () => {
      isRunning = false;
      clearInterval(interval);
    };
  }, [hasCameraPermission, triggerWebcamInfraction, restoreFaceDetected, clearPhoneDetection]);

  // Sync state to live proctor feed (localStorage + callback)
  useEffect(() => {
    const currentAction = isSessionLocked
      ? 'SESSION LOCKED (Tab switch)'
      : isPhoneDetected
      ? 'FLAGGED: Phone in camera frame!'
      : !isFaceDetected
      ? 'FLAGGED: Face missing from camera!'
      : violations.length > 0
      ? `Infraction: ${violations[0]?.type.replace(/_/g, ' ')}`
      : answers[currentQIndex]?.screenshotUrl
      ? 'Uploaded practical screenshot'
      : `Working on Task ${currentQIndex + 1}`;

    const sessionPayload: ActiveStudentSession = {
      studentName,
      worksheetTitle: assignmentTitle,
      integrity: integrityScore,
      currentAction,
      violations: violations.length,
      isActive: true,
      camStatus: (hasCameraPermission ? 'Active' : 'Inactive') as 'Active' | 'Inactive' | 'Denied',
      lastUpdate: Date.now(),
      cameraSnapshotUrl: latestSnapshot || undefined,
      isPhoneFlagged: isPhoneDetected,
      isFaceMissing: !isFaceDetected,
    };

    // Save to localStorage so teacher view in another tab or same window sees it
    try {
      localStorage.setItem('lockin_live_student_session', JSON.stringify(sessionPayload));
    } catch (e) {
      // Ignore
    }

    if (onLiveUpdate) {
      onLiveUpdate(sessionPayload);
    }
  }, [integrityScore, violations, isPhoneDetected, isFaceDetected, isSessionLocked, currentQIndex, answers, hasCameraPermission, studentName, assignmentTitle, latestSnapshot, onLiveUpdate]);

  // Clean up student live session on unmount
  useEffect(() => {
    return () => {
      try {
        const existing = localStorage.getItem('lockin_live_student_session');
        if (existing) {
          const parsed = JSON.parse(existing);
          localStorage.setItem('lockin_live_student_session', JSON.stringify({
            ...parsed,
            isActive: false,
            currentAction: 'Session ended / Left exam',
            lastUpdate: Date.now(),
          }));
        }
      } catch (e) {
        // Ignore
      }
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Practical screenshot upload
  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const existing = answers[currentQIndex] || {};

      setAnswers({
        ...answers,
        [currentQIndex]: {
          ...existing,
          screenshotUrl: dataUrl,
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          uploadedAt: new Date().toLocaleTimeString(),
          aiVerified: true,
        }
      });
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveScreenshot = () => {
    const existing = answers[currentQIndex] || {};
    setAnswers({
      ...answers,
      [currentQIndex]: {
        ...existing,
        screenshotUrl: undefined,
        fileName: undefined,
      }
    });
  };

  // AI Study Helper
  const [tutorMessages, setTutorMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    {
      sender: 'ai',
      text: 'Hello! I am your LockIn AI Study Helper. If this is a practical lab, let me know if you run into syntax errors or need conceptual debugging guidance. Remember to upload a clear screenshot of your final output!',
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  const handleSendTutorMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setTutorMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');

    setTimeout(() => {
      setTutorMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `For your practical assignment, make sure your terminal shows both the execution command and the return status. What specific function or error are you encountering in your script?`,
        },
      ]);
    }, 700);
  };

  const handleFinalSubmit = () => {
    setIsSubmitted(true);
  };

  const currentQ = questions[currentQIndex];
  const currentAnswer = answers[currentQIndex];

  // Has teacher uploaded a worksheet attachment?
  const hasWorksheetAttachment = Boolean(worksheet?.attachmentFileName || worksheet?.attachmentDataUrl);

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Worksheet Submitted!</h2>
            <p className="text-xs text-slate-400 mt-1">
              Your responses, practical screenshots, and session integrity report have been sent to your instructor.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-mono">Final Integrity</span>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">{integrityScore}%</div>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-mono">Coins Earned</span>
              <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                +{integrityScore >= 90 ? '50 🪙' : '20 🪙'}
              </div>
            </div>
          </div>

          <div className="text-left text-xs bg-slate-950 p-4 rounded-xl border border-slate-800/60 space-y-1">
            <span className="font-semibold text-slate-300">Submission Details:</span>
            <p className="text-slate-400">
              {questions.some((q) => q.type === 'practical_screenshot')
                ? '✓ Practical output screenshot attached and ready for teacher inspection.'
                : '✓ Written and multiple choice responses logged.'}
            </p>
            {violations.length > 0 && (
              <p className="text-rose-400 mt-1">
                ⚠️ {violations.length} proctoring infraction(s) logged on session report.
              </p>
            )}
          </div>

          <button
            onClick={() => onFinishTest({ finalScore: 95, integrityScore, answers })}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            Return to Class Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* Hidden File Input for Screenshot Upload */}
      <input
        type="file"
        ref={screenshotInputRef}
        onChange={handleScreenshotUpload}
        accept="image/*,.png,.jpg,.jpeg"
        className="hidden"
      />

      {/* HARD LOCKDOWN MODAL: When Tab Switching is Disabled and Student switches tabs */}
      {isSessionLocked && (
        <div className="fixed inset-0 bg-rose-950/95 backdrop-blur-lg flex items-center justify-center p-6 z-50 animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-rose-600 rounded-3xl p-8 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-500 border border-rose-500/40 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-rose-400 px-3 py-1 bg-rose-950/80 rounded-full border border-rose-800">
                STRICT LOCKDOWN ENFORCED
              </span>
              <h2 className="text-xl font-bold text-white mt-3">Exam Session Locked!</h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Your instructor configured this worksheet with <strong>"Disable Tab Switching"</strong>. Leaving the browser window or opening another tab has immediately locked your exam and reported a critical infraction to the Live Proctor Feed.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span>Violations Logged:</span>
                <span className="font-bold text-rose-400 font-mono">{violations.length} Infraction(s)</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Integrity Score:</span>
                <span className="font-bold text-rose-400 font-mono">{integrityScore}%</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={unlockSession}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Request Re-entry (Teacher Alerted)
              </button>
              <button
                onClick={handleFinalSubmit}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Submit Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Urgent Warning Modal Popup */}
      {activeWarning && !isSessionLocked && (
        <div className="fixed inset-0 bg-rose-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border-2 border-rose-600 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Proctoring Flag Detected</h3>
            <p className="text-sm text-slate-300 mt-2">{activeWarning}</p>
            <p className="text-xs text-rose-400 mt-1">Infraction logged and session integrity updated in real-time.</p>
            <button
              onClick={dismissWarning}
              className="mt-5 w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-semibold text-xs text-white shadow-lg shadow-rose-600/30 cursor-pointer"
            >
              Acknowledge & Return to Worksheet
            </button>
          </div>
        </div>
      )}

      {/* TEACHER'S UPLOADED WORKSHEET ATTACHMENT VIEWER MODAL */}
      {showAttachmentViewer && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {worksheet?.attachmentFileName || 'Teacher Uploaded Worksheet Document'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Official instructor handout & assignment specification
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAttachmentViewer(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 bg-slate-950 rounded-2xl border border-slate-800/80 p-4">
              {worksheet?.attachmentDataUrl ? (
                worksheet.attachmentDataUrl.startsWith('data:image/') ? (
                  <div className="flex items-center justify-center">
                    <img 
                      src={worksheet.attachmentDataUrl} 
                      alt="Worksheet Handout" 
                      className="max-h-[70vh] w-auto object-contain rounded-xl shadow-xl"
                    />
                  </div>
                ) : (
                  <iframe 
                    src={worksheet.attachmentDataUrl} 
                    title="Teacher Worksheet Document" 
                    className="w-full h-[65vh] rounded-xl border border-slate-800"
                  />
                )
              ) : (
                <div className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/50 flex items-center justify-center mx-auto">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">{worksheet?.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      {worksheet?.instructions}
                    </p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left text-xs max-w-xl mx-auto space-y-2">
                    <span className="font-bold text-slate-300">Assignment Tasks Breakdown:</span>
                    {questions.map((q, idx) => (
                      <div key={idx} className="text-slate-400 flex items-start gap-2">
                        <span className="font-mono text-indigo-400">Q{idx + 1}.</span>
                        <span className="flex-1">{q.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">
                You can keep this open and consult instructions while solving your practical assignment.
              </span>
              <button
                onClick={() => setShowAttachmentViewer(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold cursor-pointer"
              >
                Return to Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LockIn Test Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="text-slate-400 hover:text-white mr-1 cursor-pointer" title="Exit Test">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
            LOCK
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              {assignmentTitle}
              {isTabSwitchBlocked && (
                <span className="text-[10px] bg-rose-950/80 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                  <Lock className="w-3 h-3 text-rose-400" />
                  Tab Switching Disabled
                </span>
              )}
            </h2>
            <span className="text-[10px] text-slate-400">LockIn AI Session Active • Live Proctored</span>
          </div>
        </div>

        {/* Center: View Uploaded Worksheet, Timer, Integrity Badge */}
        <div className="flex items-center gap-3">
          {/* VIEW TEACHER'S UPLOADED WORKSHEET BUTTON */}
          <button
            onClick={() => setShowAttachmentViewer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/80 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-md shadow-indigo-950/50"
            title="Open teacher's uploaded assignment handout and instructions"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>View Worksheet Sheet {hasWorksheetAttachment ? '📄' : ''}</span>
          </button>

          {resources.length > 0 && (
            <button
              onClick={() => setViewingPdf(resources[0])}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/80 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              title="Open permitted reference materials"
            >
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>Notes ({resources.length})</span>
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs text-indigo-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold font-mono ${
              integrityScore >= 90
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : integrityScore >= 70
                ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Integrity: {integrityScore}%</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 cursor-pointer"
            title="Toggle Fullscreen Lockdown"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{isFullscreen ? 'Exit' : 'Lock'}</span>
          </button>
        </div>

        {/* Finish / Submit Button */}
        <button
          onClick={handleFinalSubmit}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 cursor-pointer"
        >
          Submit Worksheet
        </button>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center: Question Canvas */}
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto max-w-3xl mx-auto w-full">
          {/* TEACHER UPLOADED WORKSHEET BANNER IN CANVAS */}
          {hasWorksheetAttachment && (
            <div className="mb-5 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Teacher Assignment File Attached</h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {worksheet?.attachmentFileName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAttachmentViewer(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                Open Assignment Sheet
              </button>
            </div>
          )}

          <div className="flex justify-between items-center text-xs text-slate-400 mb-4">
            <span>Task {currentQIndex + 1} of {questions.length}</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Auto-saved to live teacher feed
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  currentQ.type === 'practical_screenshot'
                    ? 'bg-purple-950 text-purple-300 border-purple-800'
                    : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                }`}>
                  {currentQ.type === 'practical_screenshot' ? 'Practical Lab: Submit End Result Screenshot' : 'Standard Response'}
                </span>
                {currentQ.sourcePdf && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    Ref: {currentQ.sourcePdf}
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-semibold text-white leading-relaxed">
                {currentQ.text}
              </h3>
            </div>

            {/* FORMAT 1: Practical Assignment Screenshot Upload */}
            {currentQ.type === 'practical_screenshot' && (
              <div className="space-y-4">
                {currentQ.expectedOutputCriteria && (
                  <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/50 text-xs text-purple-200 space-y-1">
                    <span className="font-bold flex items-center gap-1.5 text-purple-300">
                      <Laptop className="w-3.5 h-3.5" />
                      Required Output Criteria:
                    </span>
                    <p className="text-slate-300">{currentQ.expectedOutputCriteria}</p>
                  </div>
                )}

                {/* Screenshot Upload Dropzone */}
                <div className="border-2 border-dashed border-slate-700 hover:border-purple-500/80 rounded-2xl p-6 bg-slate-950/60 transition-all text-center">
                  {currentAnswer?.screenshotUrl ? (
                    /* Display uploaded screenshot */
                    <div className="space-y-4">
                      <div className="relative inline-block max-w-full">
                        <img
                          src={currentAnswer.screenshotUrl}
                          alt="End Result Screenshot"
                          className="max-h-80 w-auto rounded-xl border border-slate-700 object-contain shadow-2xl mx-auto"
                        />
                        <button
                          onClick={handleRemoveScreenshot}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white shadow-lg cursor-pointer"
                          title="Remove Screenshot"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-slate-300">
                        <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Screenshot Attached: {currentAnswer.fileName}
                        </span>
                        <span className="text-slate-500">({currentAnswer.fileSize})</span>
                        <button
                          onClick={() => screenshotInputRef.current?.click()}
                          className="text-purple-400 hover:text-purple-300 underline font-semibold cursor-pointer"
                        >
                          Replace Screenshot
                        </button>
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />
                        End result verified: ready for teacher submission review.
                      </div>
                    </div>
                  ) : (
                    /* Upload Prompt */
                    <div className="space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto">
                        <Camera className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Upload Screenshot of End Result</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                          Capture your terminal, code output, or lab simulator window (PNG, JPG) and upload it here.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => screenshotInputRef.current?.click()}
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 cursor-pointer inline-flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Choose Screenshot File
                      </button>
                    </div>
                  )}
                </div>

                {/* Optional Output Remarks */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Execution Notes & Output Summary (Optional)
                  </label>
                  <input
                    type="text"
                    value={currentAnswer?.notes || ''}
                    onChange={(e) => {
                      const existing = answers[currentQIndex] || {};
                      setAnswers({
                        ...answers,
                        [currentQIndex]: { ...existing, notes: e.target.value }
                      });
                    }}
                    placeholder="e.g. Executed in Python 3.12, all test cases passed with exit code 0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {/* FORMAT 2: MCQ Options */}
            {currentQ.type === 'mcq' && currentQ.options && (
              <div className="space-y-3">
                {currentQ.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setAnswers({ ...answers, [currentQIndex]: opt })}
                    className={`w-full text-left p-4 rounded-xl border text-sm transition-all cursor-pointer ${
                      answers[currentQIndex] === opt
                        ? 'bg-indigo-950/60 border-indigo-500 text-indigo-100 ring-1 ring-indigo-500'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* FORMAT 3: Written Short Answer */}
            {currentQ.type === 'short_answer' && (
              <textarea
                rows={6}
                value={typeof answers[currentQIndex] === 'string' ? answers[currentQIndex] : ''}
                onChange={(e) => setAnswers({ ...answers, [currentQIndex]: e.target.value })}
                placeholder="Type your explanation or code solution here..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center mt-6">
            <button
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex((c) => c - 1)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              Previous Task
            </button>
            <div className="flex gap-2">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold cursor-pointer ${
                    currentQIndex === idx
                      ? 'bg-indigo-600 text-white'
                      : answers[idx]
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-slate-950 text-slate-500 border border-slate-800'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <button
              disabled={currentQIndex === questions.length - 1}
              onClick={() => setCurrentQIndex((c) => c + 1)}
              className="px-4 py-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-40 cursor-pointer"
            >
              Next Task
            </button>
          </div>
        </div>

        {/* Right Side-Panel: AI Study Helper & Live Webcam Stream + Proctor Test Tools */}
        <div className="w-80 border-l border-slate-800 bg-slate-900/60 flex flex-col justify-between">
          <div>
            {/* Camera Feed Thumbnail */}
            <div className="p-4 border-b border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-emerald-400" />
                  Live Proctor Cam
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {hasCameraPermission ? 'LIVE AI VISION' : 'ACTIVE'}
                </span>
              </div>

              <div className="w-full h-32 bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${hasCameraPermission ? 'block' : 'hidden'}`}
                />

                {/* Live Canvas Bounding Box / Detection Reticle Overlay */}
                <canvas
                  ref={canvasOverlayRef}
                  width={320}
                  height={240}
                  className={`absolute inset-0 w-full h-full pointer-events-none z-10 ${hasCameraPermission ? 'block' : 'hidden'}`}
                />

                {!hasCameraPermission && (
                  <div className="flex flex-col items-center justify-center text-slate-500 text-xs p-2 text-center">
                    <Video className="w-5 h-5 mb-1 text-slate-600" />
                    <span>Face Centered & Focused</span>
                  </div>
                )}

                {/* If phone detected, overlay glowing red visual flag banner on webcam */}
                {isPhoneDetected && (
                  <div className="absolute inset-0 bg-rose-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-2 z-20 animate-pulse border-2 border-rose-500">
                    <Smartphone className="w-7 h-7 text-rose-400 mb-1 animate-bounce" />
                    <span className="text-[11px] font-extrabold text-white uppercase tracking-wider">SMARTPHONE IN FRAME!</span>
                    <span className="text-[9px] text-rose-300 mb-1">-40 Integrity Deducted</span>
                    <button
                      onClick={clearPhoneDetection}
                      className="mt-1 text-[9px] bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-0.5 rounded-full font-bold cursor-pointer shadow-md"
                    >
                      Dismiss Flag
                    </button>
                  </div>
                )}

                {/* If face offscreen / missing, overlay amber visual flag banner on webcam */}
                {!isFaceDetected && !isPhoneDetected && (
                  <div className="absolute inset-0 bg-amber-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-2 z-20 animate-pulse border-2 border-amber-500">
                    <AlertTriangle className="w-7 h-7 text-amber-400 mb-1 animate-bounce" />
                    <span className="text-[11px] font-extrabold text-white uppercase tracking-wider">FACE NOT DETECTED!</span>
                    <span className="text-[9px] text-amber-300">Look directly at webcam to resume</span>
                    <button
                      onClick={restoreFaceDetected}
                      className="mt-1.5 text-[9px] bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-0.5 rounded-full font-bold cursor-pointer shadow-md"
                    >
                      I Am Present
                    </button>
                  </div>
                )}

                {/* Status Badge in corner */}
                <div className="absolute bottom-1.5 left-2 z-10 flex items-center gap-1 bg-slate-900/90 backdrop-blur px-1.5 py-0.5 rounded text-[9px] border border-slate-700">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isPhoneDetected ? 'bg-rose-500 animate-ping' :
                    !isFaceDetected ? 'bg-amber-500 animate-ping' : 'bg-emerald-400'
                  }`} />
                  <span className={isPhoneDetected ? 'text-rose-300 font-bold' : !isFaceDetected ? 'text-amber-300 font-bold' : 'text-emerald-300 font-mono'}>
                    {isPhoneDetected ? 'PHONE DETECTED' : !isFaceDetected ? 'FACE MISSING' : 'Tracking face & devices'}
                  </span>
                </div>
              </div>

              {/* Real-Time Vision Status & Interactive Test Controls */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-medium">Vision AI:</span>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">
                    {visionStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                  <div className={`p-1.5 rounded-lg border text-center ${
                    !isFaceDetected 
                      ? 'bg-rose-950/50 border-rose-800 text-rose-300 font-bold' 
                      : 'bg-slate-900/80 border-slate-800 text-emerald-400'
                  }`}>
                    Face: {isFaceDetected ? 'DETECTED ✓' : 'OFFSCREEN ✗'}
                  </div>
                  <div className={`p-1.5 rounded-lg border text-center ${
                    isPhoneDetected 
                      ? 'bg-rose-950/50 border-rose-800 text-rose-300 font-bold' 
                      : 'bg-slate-900/80 border-slate-800 text-emerald-400'
                  }`}>
                    Phone: {isPhoneDetected ? `DETECTED (${Math.round(detectedPhoneConfidence * 100)}%)` : 'NONE ✓'}
                  </div>
                </div>

              </div>
            </div>

            {/* AI Tutor Chat Header */}
            <div className="p-4 border-b border-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <div>
                <h4 className="text-xs font-bold text-white">AI Study Helper</h4>
                <p className="text-[10px] text-slate-400">Socratic guidance • No direct answers</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="p-4 space-y-3 h-52 overflow-y-auto text-xs">
              {tutorMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl leading-relaxed ${
                    msg.sender === 'ai'
                      ? 'bg-purple-950/40 border border-purple-800/40 text-purple-200'
                      : 'bg-slate-800 text-slate-200 ml-4'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendTutorMessage} className="p-4 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask for conceptual hints..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Permitted Reference PDF Modal */}
      <PDFViewerModal
        resource={viewingPdf}
        onClose={() => setViewingPdf(null)}
      />
    </div>
  );
};
