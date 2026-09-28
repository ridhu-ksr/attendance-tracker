import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  QrCode,
  RefreshCw,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';
import {
  QrAttendanceSession,
  StudentProfile,
} from '../types/attendance';
import { formatReadableDate } from '../engine/attendanceEngine';
import {
  GlassButton,
  GlassCard,
  GlassModal,
} from './glass/GlassComponents';

/**
 * Deterministic 21x21 QR Code SVG Matrix generator for `/attendance/session/<sessionId>`
 */
export const QrCodeSvg: React.FC<{ value: string; size?: number }> = ({
  value,
  size = 210,
}) => {
  const gridSize = 21;

  // Hash helper from value string
  const getBit = (row: number, col: number): boolean => {
    // Finder patterns (top-left, top-right, bottom-left 7x7)
    const inFinder = (r: number, c: number) => {
      if (r < 7 && c < 7) return { fr: r, fc: c };
      if (r < 7 && c >= gridSize - 7) return { fr: r, fc: c - (gridSize - 7) };
      if (r >= gridSize - 7 && c < 7) return { fr: r - (gridSize - 7), fc: c };
      return null;
    };

    const fp = inFinder(row, col);
    if (fp) {
      const { fr, fc } = fp;
      if (fr === 0 || fr === 6 || fc === 0 || fc === 6) return true;
      if (fr >= 2 && fr <= 4 && fc >= 2 && fc <= 4) return true;
      return false;
    }

    // Quiet separator around finders
    if (
      (row === 7 && (col <= 7 || col >= gridSize - 8)) ||
      (col === 7 && (row <= 7 || row >= gridSize - 8)) ||
      (row === gridSize - 8 && col <= 7) ||
      (col === gridSize - 8 && row <= 7)
    ) {
      return false;
    }

    // Timing patterns
    if (row === 6) return col % 2 === 0;
    if (col === 6) return row % 2 === 0;

    // Deterministic data modules from `value`
    const charIdx = (row * gridSize + col) % value.length;
    const code = value.charCodeAt(charIdx);
    const mix = (code * 31 + row * 17 + col * 13) & 0xff;
    return mix % 2 === 0;
  };

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (getBit(r, c)) {
        cells.push(
          <rect
            key={`${r}-${c}`}
            x={c}
            y={r}
            width={1}
            height={1}
            fill="#0D1B2A"
            rx={0.12}
          />
        );
      }
    }
  }

  return (
    <div
      className="p-4 rounded-3xl bg-white border-2 border-[#CDE1F2] shadow-md inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${gridSize} ${gridSize}`}
        className="w-full h-full"
        shapeRendering="crispEdges"
      >
        {cells}
      </svg>
    </div>
  );
};

interface StaffQrModalProps {
  session: QrAttendanceSession | null;
  isOpen: boolean;
  onClose: () => void;
  onRegenerateSession: () => void;
  onExpireSessionNow: () => void;
  onSimulateStudentScan: (session: QrAttendanceSession) => void;
}

export const StaffQrModal: React.FC<StaffQrModalProps> = ({
  session,
  isOpen,
  onClose,
  onRegenerateSession,
  onExpireSessionNow,
  onSimulateStudentScan,
}) => {
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!session) return null;

  const remainingSec = Math.max(0, Math.floor((session.expiresAt - nowMs) / 1000));
  const isExpired = remainingSec <= 0;
  const mins = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const secs = String(remainingSec % 60).padStart(2, '0');
  const sessionRoute = `/attendance/session/${session.sessionId}`;

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Attendance QR"
      subtitle="Temporary encrypted attendance session — no sensitive student PII is stored in the QR"
      maxWidthClass="max-w-xl"
    >
      <div className="flex flex-col items-center text-center space-y-5">
        {/* Session Route & Status */}
        <div className="w-full p-3.5 rounded-2xl bg-[#E8F1FA] border border-[#A8C5E0] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-left">
            <div className="font-bold text-[#0D1B2A]">
              {session.subjectName} ({session.subjectCode})
            </div>
            <div className="text-[#3D5A80] font-mono-num">
              {session.sectionName} · {formatReadableDate(session.date)} · Period {session.period}
            </div>
          </div>
          <div
            className={`px-3 py-1.5 rounded-xl font-mono-num font-bold ${
              isExpired
                ? 'bg-red-100 text-red-800 border border-red-300'
                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
            }`}
          >
            {isExpired ? 'EXPIRED' : `Expires in ${mins}:${secs}`}
          </div>
        </div>

        {/* Dynamic QR Code */}
        <div className="relative">
          <QrCodeSvg value={sessionRoute} size={220} />
          {isExpired && (
            <div className="absolute inset-0 rounded-3xl bg-[#0D1B2A]/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white">
              <AlertTriangle className="w-8 h-8 text-amber-300 mb-2" />
              <span className="text-xs font-bold">Attendance Session Expired</span>
            </div>
          )}
        </div>

        {/* Session Metadata Table */}
        <div className="w-full grid grid-cols-2 gap-2.5 text-left text-xs bg-white/75 p-4 rounded-2xl border border-[#CDE1F2]">
          <div>
            <span className="text-[#3D5A80]">Session ID:</span>{' '}
            <span className="font-mono-num font-bold text-[#0D1B2A]">
              {session.sessionId}
            </span>
          </div>
          <div>
            <span className="text-[#3D5A80]">Staff ID:</span>{' '}
            <span className="font-mono-num font-bold text-[#0D1B2A]">
              {session.staffId}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-[#3D5A80]">Session Route:</span>{' '}
            <code className="font-mono-num text-[11px] bg-[#E8F1FA] px-2 py-0.5 rounded text-[#1B3A6B]">
              {sessionRoute}
            </code>
          </div>
          <div className="col-span-2">
            <span className="text-[#3D5A80]">Students Verified via QR:</span>{' '}
            <span className="font-mono-num font-bold text-emerald-800">
              {session.submittedStudentIds.length} submission(s)
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#CDE1F2]">
          <div className="flex items-center gap-2">
            <GlassButton
              size="sm"
              variant="secondary"
              onClick={onRegenerateSession}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              New QR Session
            </GlassButton>
            {!isExpired && (
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={onExpireSessionNow}
              >
                <Clock className="w-3.5 h-3.5" />
                Expire Now
              </GlassButton>
            )}
          </div>

          <GlassButton
            size="md"
            variant="primary"
            onClick={() => onSimulateStudentScan(session)}
          >
            <Smartphone className="w-4 h-4" />
            Open Student QR Scan Page
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
};

interface QrStudentAttendanceViewProps {
  session: QrAttendanceSession | null;
  studentProfile: StudentProfile;
  alreadyMarkedInDb: boolean;
  onConfirmQrAttendance: (session: QrAttendanceSession, student: StudentProfile) => {
    ok: boolean;
    message: string;
  };
  onSwitchTestStudentSection: (targetSectionId: string) => void;
  onBackToStudentPortal: () => void;
  onBackToStaffPortal: () => void;
}

export const QrStudentAttendanceView: React.FC<QrStudentAttendanceViewProps> = ({
  session,
  studentProfile,
  alreadyMarkedInDb,
  onConfirmQrAttendance,
  onSwitchTestStudentSection,
  onBackToStudentPortal,
  onBackToStaffPortal,
}) => {
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <GlassCard variant="elevated" className="max-w-md w-full text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-red-700 mx-auto" />
          <h2 className="text-xl font-bold text-[#0D1B2A]">Invalid Attendance Session</h2>
          <p className="text-xs text-[#3D5A80]">
            The scanned QR session link is invalid or no longer exists.
          </p>
          <GlassButton variant="primary" onClick={onBackToStudentPortal}>
            Go to Student Portal
          </GlassButton>
        </GlassCard>
      </div>
    );
  }

  const isExpired = Date.now() > session.expiresAt;
  const isWrongSection = studentProfile.sectionId !== session.sectionId;
  const isAlreadySubmitted =
    session.submittedStudentIds.includes(studentProfile.studentId) ||
    alreadyMarkedInDb;

  const handleConfirm = () => {
    const result = onConfirmQrAttendance(session, studentProfile);
    setFeedback({
      type: result.ok ? 'success' : 'error',
      message: result.message,
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
      <div className="max-w-lg w-full space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToStaffPortal}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B3A6B] hover:text-[#0D1B2A] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Staff Register
          </button>
          <button
            onClick={onBackToStudentPortal}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B3A6B] hover:text-[#0D1B2A] cursor-pointer"
          >
            Open Student Dashboard →
          </button>
        </div>

        <GlassCard variant="elevated" className="p-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E8F1FA] border border-[#A8C5E0] text-xs font-bold text-[#1B3A6B]">
            <QrCode className="w-3.5 h-3.5" />
            <span>ATTENDANCE SESSION</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#0D1B2A]">
              {session.subjectName}
            </h1>
            <p className="text-base font-semibold text-[#1B3A6B]">
              {session.sectionName}
            </p>
            <p className="text-xs font-mono-num text-[#3D5A80] pt-1">
              {formatReadableDate(session.date)} · Period {session.period} ({session.startTime} – {session.endTime})
            </p>
            <p className="text-xs text-[#3D5A80]">
              Faculty: {session.staffName}
            </p>
          </div>

          {/* Authenticated Student Verification Box */}
          <div className="p-4 rounded-2xl bg-white/80 border border-[#CDE1F2] text-left text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[#3D5A80]">Authenticated Student:</span>
              <span className="font-bold text-[#0D1B2A]">{studentProfile.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#3D5A80]">Register Number:</span>
              <span className="font-mono-num font-semibold text-[#0D1B2A]">
                {studentProfile.registerNumber}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#3D5A80]">Registered Section:</span>
              <span
                className={`font-mono-num font-bold ${
                  isWrongSection ? 'text-red-700' : 'text-emerald-800'
                }`}
              >
                {studentProfile.sectionId}
              </span>
            </div>
          </div>

          {/* Validation Guards / Action Area */}
          {feedback ? (
            <div
              className={`p-4 rounded-2xl border text-sm font-semibold flex flex-col items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-red-50 border-red-300 text-red-950'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-700" />
              ) : (
                <ShieldAlert className="w-7 h-7 text-red-700" />
              )}
              <span>{feedback.message}</span>
            </div>
          ) : isExpired ? (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-red-900 text-sm font-bold">
              Attendance session expired.
            </div>
          ) : isWrongSection ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-red-900 text-sm font-bold">
                You are not registered for this attendance session.
              </div>
              <p className="text-xs text-[#3D5A80]">
                Your student profile is currently in <strong>{studentProfile.sectionId}</strong>, while this QR session is for <strong>{session.sectionId}</strong>.
              </p>
              <GlassButton
                size="sm"
                variant="secondary"
                onClick={() => onSwitchTestStudentSection(session.sectionId)}
              >
                Switch Demo Student to {session.sectionId} to Test
              </GlassButton>
            </div>
          ) : isAlreadySubmitted ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-sm font-bold">
              Attendance already recorded.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#0D1B2A]">
                Mark your attendance
              </p>
              <GlassButton
                variant="present"
                size="lg"
                className="w-full"
                onClick={handleConfirm}
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm Attendance
              </GlassButton>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
