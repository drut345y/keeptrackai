import { useState, useEffect, useRef, useCallback } from 'react';

export type ViolationType = 
  | 'tab_switch' 
  | 'window_blur' 
  | 'face_missing' 
  | 'multiple_faces' 
  | 'phone_detected' 
  | 'extended_offscreen_gaze' 
  | 'mouse_inactivity' 
  | 'fullscreen_exit';

export interface ViolationRecord {
  id: string;
  type: ViolationType;
  severity: 'minor' | 'moderate' | 'severe';
  penalty: number;
  timestamp: string;
  message: string;
}

export interface ProctoringConfig {
  sensitivity: 'low' | 'standard' | 'strict' | 'maximum';
  webcamRequired: boolean;
  allowedTabSwitches: number;
  inactivityThresholdSeconds: number;
  blockTabSwitching?: boolean;
  onViolation?: (violation: ViolationRecord) => void;
  onCriticalInfraction?: (score: number) => void;
  onTabSwitchBlocked?: () => void;
}

const PENALTY_WEIGHTS: Record<ViolationType, { minor: number; moderate: number; severe: number }> = {
  tab_switch: { minor: 5, moderate: 10, severe: 20 },
  window_blur: { minor: 3, moderate: 7, severe: 15 },
  face_missing: { minor: 5, moderate: 10, severe: 25 },
  multiple_faces: { minor: 10, moderate: 15, severe: 30 },
  phone_detected: { minor: 20, moderate: 30, severe: 40 },
  extended_offscreen_gaze: { minor: 2, moderate: 5, severe: 10 },
  mouse_inactivity: { minor: 2, moderate: 5, severe: 10 },
  fullscreen_exit: { minor: 5, moderate: 10, severe: 15 },
};

export function useProctoringEngine(config: ProctoringConfig) {
  const [integrityScore, setIntegrityScore] = useState<number>(100);
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(true);
  const [activeWarning, setActiveWarning] = useState<string | null>(null);
  const [isFaceDetected, setIsFaceDetected] = useState<boolean>(true);
  const [isPhoneDetected, setIsPhoneDetected] = useState<boolean>(false);
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);

  // Keep references to latest state & config to avoid stale closures in callbacks
  const configRef = useRef(config);
  configRef.current = config;

  const tabSwitchCountRef = useRef(0);
  tabSwitchCountRef.current = tabSwitchCount;

  const lastActivityTimeRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<any>(null);

  const recordViolation = useCallback((type: ViolationType, customMessage?: string) => {
    const currentConfig = configRef.current;
    const currentTabSwitches = tabSwitchCountRef.current;

    // Check if hard tab switch block is enabled
    if (type === 'tab_switch' && currentConfig.blockTabSwitching) {
      setIsSessionLocked(true);
      if (currentConfig.onTabSwitchBlocked) {
        currentConfig.onTabSwitchBlocked();
      }
    }

    const isGrace = type === 'tab_switch' && !currentConfig.blockTabSwitching && currentTabSwitches < currentConfig.allowedTabSwitches;
    
    let severity: 'minor' | 'moderate' | 'severe' = 'minor';
    if (type === 'phone_detected' || type === 'multiple_faces') {
      severity = 'severe';
    } else if (type === 'tab_switch' && (currentTabSwitches >= 2 || currentConfig.blockTabSwitching)) {
      severity = 'severe';
    } else if (type === 'tab_switch' && currentTabSwitches >= 1) {
      severity = 'moderate';
    }

    const penalty = isGrace ? 0 : PENALTY_WEIGHTS[type][severity];

    const message = customMessage || (
      isGrace 
        ? `Warning: Tab-switching detected. (${currentTabSwitches + 1}/${currentConfig.allowedTabSwitches} grace attempts used)`
        : currentConfig.blockTabSwitching && type === 'tab_switch'
        ? `CRITICAL INFRACTION: Tab switching is strictly prohibited! Session has been locked.`
        : `Infraction: ${type.replace(/_/g, ' ').toUpperCase()} (-${penalty} Integrity Points)`
    );

    const record: ViolationRecord = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      severity,
      penalty,
      timestamp: new Date().toLocaleTimeString(),
      message,
    };

    setViolations(prev => [record, ...prev]);
    setActiveWarning(message);

    if (!isGrace && penalty > 0) {
      setIntegrityScore(prev => {
        const nextScore = Math.max(0, Math.round((prev - penalty) * 10) / 10);
        if (nextScore < 60 && currentConfig.onCriticalInfraction) {
          currentConfig.onCriticalInfraction(nextScore);
        }
        return nextScore;
      });
    }

    if (currentConfig.onViolation) {
      currentConfig.onViolation(record);
    }
  }, []);

  // Tab & Window Focus Listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsWindowFocused(false);
        setTabSwitchCount(c => c + 1);
        tabSwitchCountRef.current += 1;
        
        if (configRef.current.blockTabSwitching) {
          recordViolation('tab_switch', 'LOCKDOWN VIOLATION: Tab switching is disabled for this test. Your exam session is locked.');
        } else {
          recordViolation('tab_switch', 'Warning: Focus lost! You switched tabs or minimized the test.');
        }
      } else {
        setIsWindowFocused(true);
      }
    };

    const handleWindowBlur = () => {
      setIsWindowFocused(false);
      if (configRef.current.blockTabSwitching) {
        recordViolation('tab_switch', 'LOCKDOWN VIOLATION: Window lost focus. Switching applications is strictly prohibited.');
      } else {
        recordViolation('window_blur', 'Warning: Window lost focus. Please remain on the test page.');
      }
    };

    const handleWindowFocus = () => {
      setIsWindowFocused(true);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to exit the exam session?';
      return e.returnValue;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [recordViolation]);

  // Activity Idle Monitor
  useEffect(() => {
    const resetActivity = () => {
      lastActivityTimeRef.current = Date.now();
    };

    window.addEventListener('mousemove', resetActivity);
    window.addEventListener('keydown', resetActivity);
    window.addEventListener('click', resetActivity);

    inactivityTimerRef.current = setInterval(() => {
      const elapsedSeconds = (Date.now() - lastActivityTimeRef.current) / 1000;
      if (elapsedSeconds > configRef.current.inactivityThresholdSeconds) {
        recordViolation('mouse_inactivity', `Notice: No mouse or keyboard input for over ${configRef.current.inactivityThresholdSeconds}s.`);
        lastActivityTimeRef.current = Date.now();
      }
    }, 5000);

    return () => {
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('click', resetActivity);
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
    };
  }, [recordViolation]);

  const dismissWarning = () => setActiveWarning(null);

  const lastInfractionTimesRef = useRef<Record<string, number>>({});

  const triggerWebcamInfraction = useCallback((type: 'face_missing' | 'phone_detected' | 'extended_offscreen_gaze', force = false) => {
    const now = Date.now();
    const lastTime = lastInfractionTimesRef.current[type] || 0;
    const cooldownMs = force ? 0 : 8000;

    if (type === 'face_missing') {
      setIsFaceDetected(false);
      if (force || now - lastTime > cooldownMs) {
        lastInfractionTimesRef.current[type] = now;
        recordViolation('face_missing', 'AI Vision Alert: Student face not detected in webcam frame! (-10 Integrity Points)');
      } else {
        setActiveWarning('AI Vision Alert: Student face not detected in webcam frame! Please look at the screen.');
      }
    } else if (type === 'phone_detected') {
      setIsPhoneDetected(true);
      if (force || now - lastTime > cooldownMs) {
        lastInfractionTimesRef.current[type] = now;
        recordViolation('phone_detected', 'AI Vision Alert: Unauthorized smartphone/device detected in webcam frame! (-40 Integrity Points)');
      } else {
        setActiveWarning('AI Vision Alert: Unauthorized smartphone/device detected in webcam frame!');
      }
    } else if (type === 'extended_offscreen_gaze') {
      if (force || now - lastTime > cooldownMs) {
        lastInfractionTimesRef.current[type] = now;
        recordViolation('extended_offscreen_gaze', 'AI Vision Alert: Extended off-screen gaze or head turning detected.');
      }
    }
  }, [recordViolation]);

  const restoreFaceDetected = useCallback(() => {
    setIsFaceDetected(true);
    setActiveWarning(prev => (prev?.toLowerCase().includes('face not detected') || prev?.toLowerCase().includes('face missing') ? null : prev));
  }, []);

  const clearPhoneDetection = useCallback(() => {
    setIsPhoneDetected(false);
    setActiveWarning(prev => (prev?.toLowerCase().includes('smartphone') || prev?.toLowerCase().includes('phone') ? null : prev));
  }, []);

  const unlockSession = () => {
    setIsSessionLocked(false);
  };

  return {
    integrityScore,
    violations,
    tabSwitchCount,
    isWindowFocused,
    activeWarning,
    dismissWarning,
    isFaceDetected,
    isPhoneDetected,
    isSessionLocked,
    triggerWebcamInfraction,
    restoreFaceDetected,
    clearPhoneDetection,
    unlockSession,
  };
}
