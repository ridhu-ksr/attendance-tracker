import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Calendar,
  CalendarCheck,
  Check,
  Clock,
  Compass,
  Edit3,
  Home,
  MapPin,
  MessageSquare,
  Palmtree,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Sparkles,
  Trash2,
  User,
  Users,
  LogOut,
  X,
} from 'lucide-react';
import {
  AppPortalMode,
  AttendanceRecord,
  AttendanceSettings,
  AttendanceStatus,
  DayOfWeek,
  InitialSubjectAttendance,
  LeaveRecord,
  PeriodType,
  QrAttendanceSession,
  RegisterEntryStatus,
  StaffProfile,
  StudentProfile,
  TimetableSlot,
} from './types/attendance';
import {
  INITIAL_TIMETABLES,
  SECTIONS_LIST,
  getInitialSubjectAttendanceForSection,
} from './data/timetables';
import { STAFF_PROFILES } from './data/staffAndRoster';
import {
  addDaysToIso,
  buildCompleteAttendanceSummary,
  formatReadableDate,
  getClassesForDate,
  getDayOfWeekFromDateString,
  getTodayIsoDate,
} from './engine/attendanceEngine';
import {
  GlassButton,
  GlassCard,
  GlassInput,
  GlassModal,
  GlassProgress,
  GlassSelect,
} from './components/glass/GlassComponents';
import { AnalyticsView } from './components/AnalyticsView';
import { LeavePlannerView } from './components/LeavePlannerView';
import { WhatIfSimulatorView } from './components/WhatIfSimulatorView';
import { AttendanceAdvisorChat } from './components/AttendanceAdvisorChat';
import { RoleAndAuthScreen } from './components/RoleAndAuthScreen';
import { StaffPortalView } from './components/StaffPortalView';
import { QrStudentAttendanceView } from './components/QrSessionModalAndView';
import { CampusSpaceFinderView } from './components/campus/CampusSpaceFinderView';

type NavTab =
  | 'dashboard'
  | 'today'
  | 'attendance'
  | 'analytics'
  | 'planner'
  | 'leave'
  | 'whatif'
  | 'campus_space'
  | 'history'
  | 'advisor'
  | 'profile';

const STORAGE_KEY = 'attendiq_unified_state_v1';

export default function App() {
  const todayIso = getTodayIsoDate();

  // Portal Mode (First screen = Role Selection as required)
  const [portalMode, setPortalMode] = useState<AppPortalMode>('role_selection');

  // Active Staff Profile (for Staff Portal)
  const [activeStaff, setActiveStaff] = useState<StaffProfile>(STAFF_PROFILES[0]);

  // Staff Register 60-student overrides map: `${sectionId}|${subjectCode}|${date}|P${period}|${studentId}` -> status
  const [rosterOverrides, setRosterOverrides] = useState<
    Record<string, RegisterEntryStatus>
  >({});

  // Active QR Attendance Session
  const [activeQrSession, setActiveQrSession] =
    useState<QrAttendanceSession | null>(null);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Student Profile & Section state
  const [profile, setProfile] = useState<StudentProfile>({
    studentId: 'STU-2026-140',
    name: 'Aravind Krishnan',
    registerNumber: '710723106014',
    department: 'Electronics & Communication Engineering',
    year: 'IV Year',
    sectionId: 'IV-ECE-A',
    email: '25cs140@drngpit.ac.in',
  });

  // Editable Timetables map (10 real sections)
  const [allTimetables, setAllTimetables] =
    useState<Record<string, TimetableSlot[]>>(INITIAL_TIMETABLES);

  // Per-section initial attendance map
  const [sectionInitialAttendance, setSectionInitialAttendance] = useState<
    Record<string, InitialSubjectAttendance[]>
  >(() => {
    const map: Record<string, InitialSubjectAttendance[]> = {};
    for (const sec of SECTIONS_LIST) {
      map[sec.sectionId] = getInitialSubjectAttendanceForSection(sec.sectionId);
    }
    return map;
  });

  // Daily Attendance Records
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const yesterday = addDaysToIso(getTodayIsoDate(), -1);
    return [
      {
        id: 'rec-seed-1',
        studentId: 'STU-2026-140',
        section: 'IV-ECE-A',
        subjectCode: '22EC701',
        subjectName: 'High Frequency Communication & RF Systems',
        date: yesterday,
        period: 1,
        status: 'present',
        startTime: '08:45',
        endTime: '09:35',
      },
      {
        id: 'rec-seed-2',
        studentId: 'STU-2026-140',
        section: 'IV-ECE-A',
        subjectCode: '22EC702',
        subjectName: 'Optical & Microwave Engineering',
        date: yesterday,
        period: 2,
        status: 'present',
        startTime: '09:35',
        endTime: '10:25',
      },
      {
        id: 'rec-seed-3',
        studentId: 'STU-2026-140',
        section: 'IV-ECE-A',
        subjectCode: '22EC703',
        subjectName: 'Embedded & Real-Time Operating Systems',
        date: yesterday,
        period: 3,
        status: 'absent',
        startTime: '10:40',
        endTime: '11:30',
      },
    ];
  });

  // Saved Leave Records
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([
    {
      id: 'lv-seed-1',
      studentId: 'STU-2026-140',
      section: 'IV-ECE-A',
      leaveType: 'Medical Leave',
      startDate: addDaysToIso(todayIso, 6),
      endDate: addDaysToIso(todayIso, 7),
      reason: 'Dental procedure & recovery',
      totalClassesAffected: 18,
      projectedOverallAttendance: 83.2,
      riskLevel: 'LOW RISK',
      createdAt: new Date().toISOString(),
      affectedBySubject: [
        {
          subjectCode: '22EC701',
          subjectName: 'High Frequency Communication & RF Systems',
          classesCount: 3,
          beforePercentage: 89.7,
          afterPercentage: 83.3,
        },
        {
          subjectCode: '22EC703',
          subjectName: 'Embedded & Real-Time Operating Systems',
          classesCount: 3,
          beforePercentage: 75.0,
          afterPercentage: 69.2,
        },
      ],
    },
  ]);

  // Configurable Threshold & Policy Settings
  const [settings, setSettings] = useState<AttendanceSettings>({
    dangerThreshold: 75,
    targetThreshold: 90,
    novemberDeadline: '2026-11-01',
    odPolicy: 'policy_b',
    medicalPolicy: 'policy_c',
  });

  // Future Date Planner selected target date
  const [planningDate, setPlanningDate] = useState<string>('2026-10-31');

  // Today's Classes selected date (defaults to todayIso; if Sunday, user can also switch or mark any date)
  const [markingDate, setMarkingDate] = useState<string>(() => {
    const dayName = getDayOfWeekFromDateString(todayIso);
    if (dayName === 'Sunday' || dayName === 'Saturday') {
      return addDaysToIso(todayIso, 1);
    }
    return todayIso;
  });

  // Attendance History Filters
  const [historySubjectFilter, setHistorySubjectFilter] = useState<string>('ALL');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('ALL');
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('');

  // Modal for Quick Initial Attendance Entry
  const [isInitialModalOpen, setIsInitialModalOpen] = useState<boolean>(false);

  // Modal for editing a timetable slot
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);

  // Scroll to top when changing tabs or portal modes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab, portalMode]);

  // Load state from localStorage / backend on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.sectionInitialAttendance)
          setSectionInitialAttendance(parsed.sectionInitialAttendance);
        if (parsed.attendanceRecords) setAttendanceRecords(parsed.attendanceRecords);
        if (parsed.leaveRecords) setLeaveRecords(parsed.leaveRecords);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.allTimetables) setAllTimetables(parsed.allTimetables);
        if (parsed.activeStaff) setActiveStaff(parsed.activeStaff);
        if (parsed.rosterOverrides) setRosterOverrides(parsed.rosterOverrides);
        if (parsed.activeQrSession) setActiveQrSession(parsed.activeQrSession);
      }
    } catch (e) {
      console.error('Failed to load local state:', e);
    }
  }, []);

  // Save state to localStorage & backend whenever updated
  useEffect(() => {
    const payload = {
      profile,
      sectionInitialAttendance,
      attendanceRecords,
      leaveRecords,
      settings,
      allTimetables,
      activeStaff,
      rosterOverrides,
      activeQrSession,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {}
  }, [
    profile,
    sectionInitialAttendance,
    attendanceRecords,
    leaveRecords,
    settings,
    allTimetables,
    activeStaff,
    rosterOverrides,
    activeQrSession,
  ]);

  // Active section timetable & initial subjects
  const currentTimetable = useMemo(
    () => allTimetables[profile.sectionId] || INITIAL_TIMETABLES['IV-ECE-A'],
    [allTimetables, profile.sectionId]
  );

  const currentInitialSubjects = useMemo(
    () =>
      sectionInitialAttendance[profile.sectionId] ||
      getInitialSubjectAttendanceForSection(profile.sectionId),
    [sectionInitialAttendance, profile.sectionId]
  );

  const currentSectionRecords = useMemo(
    () => attendanceRecords.filter((r) => r.section === profile.sectionId),
    [attendanceRecords, profile.sectionId]
  );

  const currentSectionLeaves = useMemo(
    () => leaveRecords.filter((l) => l.section === profile.sectionId),
    [leaveRecords, profile.sectionId]
  );

  // Deterministic Calculation Engine Output (Main Deadline Summary)
  const summary = useMemo(
    () =>
      buildCompleteAttendanceSummary(
        currentTimetable,
        currentInitialSubjects,
        currentSectionRecords,
        settings,
        todayIso
      ),
    [currentTimetable, currentInitialSubjects, currentSectionRecords, settings, todayIso]
  );

  // Deterministic Calculation Engine Output for Future Date Planner (`planningDate`)
  const plannerSummary = useMemo(
    () =>
      buildCompleteAttendanceSummary(
        currentTimetable,
        currentInitialSubjects,
        currentSectionRecords,
        settings,
        todayIso,
        planningDate
      ),
    [
      currentTimetable,
      currentInitialSubjects,
      currentSectionRecords,
      settings,
      todayIso,
      planningDate,
    ]
  );

  // Handle section change
  const handleSectionChange = (newSectionId: string) => {
    const secMeta = SECTIONS_LIST.find((s) => s.sectionId === newSectionId);
    if (!secMeta) return;
    setProfile((prev) => ({
      ...prev,
      sectionId: secMeta.sectionId,
      department: secMeta.department,
      year: secMeta.year,
    }));
  };

  // Mark attendance for a specific period on `dateStr`
  const handleMarkPeriodAttendance = (
    dateStr: string,
    slot: TimetableSlot,
    status: AttendanceStatus
  ) => {
    setAttendanceRecords((prev) => {
      const filtered = prev.filter(
        (r) =>
          !(
            r.section === profile.sectionId &&
            r.date === dateStr &&
            r.period === slot.period
          )
      );
      const nextRecord: AttendanceRecord = {
        id: `rec-${dateStr}-p${slot.period}-${Date.now()}`,
        studentId: profile.studentId,
        section: profile.sectionId,
        subjectCode: slot.subjectCode,
        subjectName: slot.subjectName,
        date: dateStr,
        period: slot.period,
        status,
        startTime: slot.startTime,
        endTime: slot.endTime,
      };
      return [nextRecord, ...filtered];
    });
  };

  // Mark all classes on `markingDate`
  const handleMarkAllDay = (dateStr: string, status: AttendanceStatus) => {
    const { slots } = getClassesForDate(currentTimetable, dateStr);
    if (slots.length === 0) return;

    setAttendanceRecords((prev) => {
      const filtered = prev.filter(
        (r) => !(r.section === profile.sectionId && r.date === dateStr)
      );
      const additions: AttendanceRecord[] = slots.map((slot) => ({
        id: `rec-${dateStr}-p${slot.period}-${Date.now()}-${slot.period}`,
        studentId: profile.studentId,
        section: profile.sectionId,
        subjectCode: slot.subjectCode,
        subjectName: slot.subjectName,
        date: dateStr,
        period: slot.period,
        status,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }));
      return [...additions, ...filtered];
    });
  };

  // Update initial subject attendance
  const handleUpdateInitialSubject = (
    subjectCode: string,
    field: 'initialConducted' | 'initialAttended' | 'initialOd' | 'initialMedical',
    value: number
  ) => {
    setSectionInitialAttendance((prev) => {
      const list = prev[profile.sectionId] || getInitialSubjectAttendanceForSection(profile.sectionId);
      const updated = list.map((item) => {
        if (item.subjectCode !== subjectCode) return item;
        const nextVal = Math.max(0, value);
        if (field === 'initialConducted') {
          return {
            ...item,
            initialConducted: nextVal,
            initialAttended: Math.min(item.initialAttended, nextVal),
          };
        }
        if (field === 'initialAttended') {
          return {
            ...item,
            initialAttended: Math.min(item.initialConducted, nextVal),
          };
        }
        return { ...item, [field]: nextVal };
      });
      return { ...prev, [profile.sectionId]: updated };
    });
  };

  // Save or update a leave record
  const handleSaveLeave = (leave: LeaveRecord) => {
    setLeaveRecords((prev) => {
      const exists = prev.some((l) => l.id === leave.id);
      if (exists) {
        return prev.map((l) => (l.id === leave.id ? leave : l));
      }
      return [leave, ...prev];
    });
  };

  const handleDeleteLeave = (leaveId: string) => {
    setLeaveRecords((prev) => prev.filter((l) => l.id !== leaveId));
  };

  // Staff Register: Mark or edit a student's attendance (syncs with central attendanceRecords)
  const handleStaffMarkStudent = (
    sectionId: string,
    subjectCode: string,
    subjectName: string,
    date: string,
    period: number,
    startTime: string,
    endTime: string,
    studentId: string,
    isPrimaryStudent: boolean,
    status: RegisterEntryStatus
  ) => {
    const key = `${sectionId}|${subjectCode}|${date}|P${period}|${studentId}`;
    setRosterOverrides((prev) => ({
      ...prev,
      [key]: status,
    }));

    if (
      isPrimaryStudent &&
      (status === 'present' ||
        status === 'absent' ||
        status === 'od' ||
        status === 'medical')
    ) {
      setAttendanceRecords((prev) => {
        const filtered = prev.filter(
          (r) =>
            !(
              r.section === sectionId &&
              r.date === date &&
              r.period === period &&
              r.studentId === profile.studentId
            )
        );
        const nextRec: AttendanceRecord = {
          id: `rec-staff-${date}-p${period}-${Date.now()}`,
          studentId: profile.studentId,
          section: sectionId,
          subjectCode,
          subjectName,
          date,
          period,
          status,
          startTime,
          endTime,
        };
        return [nextRec, ...filtered];
      });
    }
  };

  // Staff Register: Bulk Mark All Present
  const handleStaffBulkMarkPresent = (
    sectionId: string,
    subjectCode: string,
    subjectName: string,
    date: string,
    period: number,
    startTime: string,
    endTime: string,
    studentIds: string[]
  ) => {
    setRosterOverrides((prev) => {
      const next = { ...prev };
      for (const sId of studentIds) {
        const key = `${sectionId}|${subjectCode}|${date}|P${period}|${sId}`;
        next[key] = 'present';
      }
      return next;
    });

    if (profile.sectionId === sectionId) {
      setAttendanceRecords((prev) => {
        const filtered = prev.filter(
          (r) =>
            !(
              r.section === sectionId &&
              r.date === date &&
              r.period === period &&
              r.studentId === profile.studentId
            )
        );
        const nextRec: AttendanceRecord = {
          id: `rec-staff-bulk-${date}-p${period}-${Date.now()}`,
          studentId: profile.studentId,
          section: sectionId,
          subjectCode,
          subjectName,
          date,
          period,
          status: 'present',
          startTime,
          endTime,
        };
        return [nextRec, ...filtered];
      });
    }
  };

  // QR Attendance Confirmation (Section 7 & 8)
  const handleConfirmQrAttendance = (
    session: QrAttendanceSession,
    student: StudentProfile
  ): { ok: boolean; message: string } => {
    if (!session) {
      return { ok: false, message: 'Invalid attendance session.' };
    }
    if (Date.now() > session.expiresAt) {
      return { ok: false, message: 'Attendance session expired.' };
    }
    if (student.sectionId !== session.sectionId) {
      return {
        ok: false,
        message: 'You are not registered for this attendance session.',
      };
    }
    const alreadyInSession = session.submittedStudentIds.includes(
      student.studentId
    );
    const alreadyInRecords = attendanceRecords.some(
      (r) =>
        r.section === session.sectionId &&
        r.date === session.date &&
        r.period === session.period &&
        r.studentId === student.studentId &&
        r.status === 'present'
    );
    if (alreadyInSession || alreadyInRecords) {
      return { ok: false, message: 'Attendance already recorded.' };
    }

    // Mark present in QR session, Staff Register, and Student Attendance Records
    setActiveQrSession((prev) =>
      prev && prev.sessionId === session.sessionId
        ? {
            ...prev,
            submittedStudentIds: [
              ...prev.submittedStudentIds,
              student.studentId,
            ],
          }
        : prev
    );

    handleStaffMarkStudent(
      session.sectionId,
      session.subjectCode,
      session.subjectName,
      session.date,
      session.period,
      session.startTime,
      session.endTime,
      student.studentId,
      true,
      'present'
    );

    return {
      ok: true,
      message: `Attendance Marked: Present for ${session.subjectName} (Period ${session.period}).`,
    };
  };

  // Dynamic Greeting & Real Date
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formattedTodayHeader = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const markingDayInfo = getClassesForDate(currentTimetable, markingDate);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" /> },
    { id: 'today', label: "Today's Classes", icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'attendance', label: 'My Attendance', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'planner', label: 'Attendance Planner', icon: <Compass className="w-4 h-4" /> },
    { id: 'leave', label: 'Leave Planner', icon: <Palmtree className="w-4 h-4" /> },
    { id: 'whatif', label: 'What If?', icon: <Sliders className="w-4 h-4" /> },
    { id: 'campus_space', label: 'Campus Space Finder', icon: <MapPin className="w-4 h-4" /> },
    { id: 'history', label: 'Attendance History', icon: <Clock className="w-4 h-4" /> },
    { id: 'advisor', label: 'Attendance Advisor', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  ];

  const filteredHistory = useMemo(() => {
    return currentSectionRecords.filter((r) => {
      if (historySubjectFilter !== 'ALL' && r.subjectCode !== historySubjectFilter) {
        return false;
      }
      if (historyStatusFilter !== 'ALL' && r.status !== historyStatusFilter) {
        return false;
      }
      if (historyDateFilter && r.date !== historyDateFilter) {
        return false;
      }
      return true;
    });
  }, [
    currentSectionRecords,
    historySubjectFilter,
    historyStatusFilter,
    historyDateFilter,
  ]);

  return (
    <div className="min-h-screen relative bg-[#F8F3EB] text-[#0D1B2A] flex flex-col md:flex-row">
      {/* Subtle Animated Calm Academic Blue / Warm Cream Background Blobs (Section 4) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="ambient-blob-1 absolute -top-28 -left-24 w-[520px] h-[520px] rounded-full opacity-55"
          style={{
            background:
              'radial-gradient(circle, rgba(168,197,224,0.65) 0%, rgba(205,225,242,0.25) 55%, transparent 75%)',
            filter: 'blur(45px)',
          }}
        />
        <div
          className="ambient-blob-2 absolute top-1/4 -right-32 w-[580px] h-[580px] rounded-full opacity-50"
          style={{
            background:
              'radial-gradient(circle, rgba(107,140,174,0.42) 0%, rgba(232,241,250,0.3) 60%, transparent 75%)',
            filter: 'blur(55px)',
          }}
        />
        <div
          className="ambient-blob-1 absolute -bottom-32 left-1/3 w-[500px] h-[500px] rounded-full opacity-45"
          style={{
            background:
              'radial-gradient(circle, rgba(205,225,242,0.7) 0%, rgba(248,243,235,0.2) 65%, transparent 80%)',
            filter: 'blur(50px)',
          }}
        />
      </div>

      {/* ROLE SELECTION / STUDENT LOGIN / STAFF LOGIN SCREENS */}
      {(portalMode === 'role_selection' ||
        portalMode === 'student_login' ||
        portalMode === 'staff_login') && (
        <div className="w-full">
          <RoleAndAuthScreen
            mode={portalMode}
            studentProfile={profile}
            onSelectMode={(next) => setPortalMode(next)}
            onStudentLoginSuccess={(updatedStudent) => {
              setProfile(updatedStudent);
              setPortalMode('student_portal');
            }}
            onStaffLoginSuccess={(staffMember) => {
              setActiveStaff(staffMember);
              setPortalMode('staff_portal');
            }}
          />
        </div>
      )}

      {/* STAFF PORTAL */}
      {portalMode === 'staff_portal' && (
        <div className="w-full">
          <StaffPortalView
            staff={activeStaff}
            allTimetables={allTimetables}
            activeStudent={profile}
            sectionInitialAttendance={sectionInitialAttendance}
            attendanceRecords={attendanceRecords}
            leaveRecords={leaveRecords}
            settings={settings}
            rosterOverrides={rosterOverrides}
            activeQrSession={activeQrSession}
            onUpdateStaffProfile={(nextStaff) => setActiveStaff(nextStaff)}
            onUpdateSettings={(nextSettings) => setSettings(nextSettings)}
            onStaffMarkStudent={handleStaffMarkStudent}
            onStaffBulkMarkPresent={handleStaffBulkMarkPresent}
            onCreateQrSession={(session) => setActiveQrSession(session)}
            onExpireQrSession={() =>
              setActiveQrSession((prev) =>
                prev ? { ...prev, expiresAt: Date.now() - 1000 } : null
              )
            }
            onSimulateStudentQrScan={(session) => {
              setActiveQrSession(session);
              setPortalMode('qr_session');
            }}
            onSwitchToRoleSelection={() => setPortalMode('role_selection')}
            onSwitchToStudentPortal={() => setPortalMode('student_portal')}
          />
        </div>
      )}

      {/* QR ATTENDANCE STUDENT SCAN SESSION PAGE (`/attendance/session/<sessionId>`) */}
      {portalMode === 'qr_session' && (
        <div className="w-full">
          <QrStudentAttendanceView
            session={activeQrSession}
            studentProfile={profile}
            alreadyMarkedInDb={
              activeQrSession
                ? attendanceRecords.some(
                    (r) =>
                      r.section === activeQrSession.sectionId &&
                      r.date === activeQrSession.date &&
                      r.period === activeQrSession.period &&
                      r.studentId === profile.studentId &&
                      r.status === 'present'
                  )
                : false
            }
            onConfirmQrAttendance={handleConfirmQrAttendance}
            onSwitchTestStudentSection={(targetSec) =>
              handleSectionChange(targetSec)
            }
            onBackToStudentPortal={() => setPortalMode('student_portal')}
            onBackToStaffPortal={() => setPortalMode('staff_portal')}
          />
        </div>
      )}

      {/* EXISTING STUDENT PORTAL */}
      {portalMode === 'student_portal' && (
        <>
          {/* Desktop Liquid Glass Sidebar (Section 24) */}
      <aside className="hidden md:flex md:w-[264px] md:flex-col md:fixed md:inset-y-0 z-30 p-3 lg:p-4">
        <div className="liquid-glass-elevated h-full rounded-[28px] p-4 lg:p-5 flex flex-col justify-between overflow-hidden">
          <div className="flex flex-col flex-1 min-h-0">
            {/* Brand Header */}
            <div className="pb-4 mb-3 border-b border-[#CDE1F2]/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#1B3A6B] text-white flex items-center justify-center font-bold text-base shadow-sm">
                  IQ
                </div>
                <div>
                  <div className="text-lg font-bold tracking-tight text-[#0D1B2A]">
                    AttendIQ
                  </div>
                  <div className="text-[11px] text-[#3D5A80]">
                    Track · Predict · Plan · Advise
                  </div>
                </div>
              </div>
            </div>

            {/* Section Selector in Sidebar */}
            <div className="mb-3 shrink-0">
              <label className="text-[11px] font-semibold text-[#3D5A80] block mb-1">
                Active Class Section
              </label>
              <select
                value={profile.sectionId}
                onChange={(e) => handleSectionChange(e.target.value)}
                className="w-full liquid-glass-input px-3 py-2 rounded-xl text-xs font-semibold text-[#0D1B2A] cursor-pointer"
              >
                {SECTIONS_LIST.map((sec) => (
                  <option key={sec.sectionId} value={sec.sectionId}>
                    {sec.sectionName} ({sec.year})
                  </option>
                ))}
              </select>
            </div>

            {/* Scrollable Navigation Items */}
            <nav className="space-y-1 flex-1 overflow-y-auto min-h-0 pr-1">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-[#1B3A6B] text-white shadow-[0_6px_18px_rgba(27,58,107,0.22)]'
                        : 'text-[#1B3A6B] hover:bg-white/65'
                    }`}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer Quick Summary */}
          <div className="pt-3 mt-2 border-t border-[#CDE1F2]/80 shrink-0">
            <div className="p-3 rounded-2xl bg-[#E8F1FA]/80 border border-white">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#3D5A80] font-medium">Overall</span>
                <span className="font-mono-num font-bold text-[#0D1B2A]">
                  {summary.percentage}%
                </span>
              </div>
              <div className="mt-1.5">
                <GlassProgress
                  value={summary.percentage}
                  threshold={settings.dangerThreshold}
                  target={settings.targetThreshold}
                  heightClass="h-2"
                />
              </div>
              <div className="text-[10px] text-[#3D5A80] mt-1.5 flex items-center justify-between">
                <span>Target: {settings.targetThreshold}%</span>
                <span>Min: {settings.dangerThreshold}%</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 w-full md:pl-[264px] z-10 pb-28 md:pb-14">
        <div className="max-w-[1360px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-5 space-y-5 sm:space-y-6">
          {/* Top Bar Header (Section 5) */}
          <header className="liquid-glass rounded-[24px] px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0D1B2A] tracking-tight">
                {getGreeting()}, {profile.name}
              </h1>
              <p className="text-xs text-[#3D5A80] mt-0.5">
                {formattedTodayHeader} · {profile.sectionId} ({profile.department})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Mobile section selector */}
              <select
                value={profile.sectionId}
                onChange={(e) => handleSectionChange(e.target.value)}
                className="md:hidden liquid-glass-input px-3 py-2 rounded-xl text-xs font-semibold text-[#0D1B2A]"
              >
                {SECTIONS_LIST.map((sec) => (
                  <option key={sec.sectionId} value={sec.sectionId}>
                    {sec.sectionName}
                  </option>
                ))}
              </select>

              <GlassButton
                size="sm"
                variant="secondary"
                onClick={() => setIsInitialModalOpen(true)}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Enter Initial Attendance
              </GlassButton>

              <GlassButton
                size="sm"
                variant="secondary"
                onClick={() => setActiveTab('campus_space')}
              >
                <MapPin className="w-3.5 h-3.5" />
                Campus Space Finder
              </GlassButton>

              <GlassButton
                size="sm"
                variant="primary"
                onClick={() => setActiveTab('leave')}
              >
                <Palmtree className="w-3.5 h-3.5" />
                Plan Leave
              </GlassButton>
            </div>
          </header>

          {/* Section 9: Prominent IRREVERSIBLE DETENTION Alert (triggers when mathematical recovery is impossible) */}
          {summary.irreversibleDetention.triggered && (
            <div className="liquid-glass-danger rounded-[24px] p-6 border-2 border-red-600/50 shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 text-red-800 font-bold text-base">
                    <ShieldAlert className="w-5 h-5 text-red-700" />
                    <span>🚨 IRREVERSIBLE DETENTION</span>
                  </div>
                  <p className="text-sm font-medium text-red-950">
                    Your attendance cannot mathematically recover to the required level before the November deadline ({settings.novemberDeadline}).
                  </p>
                  {summary.irreversibleDetention.detainedSubjects.length > 0 && (
                    <div className="text-xs text-red-900 pt-1">
                      Detained Course(s):{' '}
                      {summary.irreversibleDetention.detainedSubjects
                        .map(
                          (d) =>
                            `${d.subjectName} (Current: ${d.currentPercentage}%, Max Possible: ${d.maxPossiblePercentage}%, Shortfall: -${d.shortfall}%)`
                        )
                        .join(' · ')}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0 text-center">
                  <div className="p-3 rounded-xl bg-white/80 border border-red-200">
                    <div className="text-[10px] text-red-800">Current</div>
                    <div className="font-mono-num text-sm font-bold text-red-950">
                      {summary.irreversibleDetention.currentAttendance}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/80 border border-red-200">
                    <div className="text-[10px] text-red-800">Required</div>
                    <div className="font-mono-num text-sm font-bold text-red-950">
                      {summary.irreversibleDetention.requiredAttendance}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/80 border border-red-200">
                    <div className="text-[10px] text-red-800">Remaining</div>
                    <div className="font-mono-num text-sm font-bold text-red-950">
                      {summary.irreversibleDetention.remainingClasses}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/80 border border-red-200">
                    <div className="text-[10px] text-red-800">Max Possible</div>
                    <div className="font-mono-num text-sm font-bold text-red-950">
                      {summary.irreversibleDetention.maxPossibleAttendance}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/80 border border-red-200">
                    <div className="text-[10px] text-red-800">Shortfall</div>
                    <div className="font-mono-num text-sm font-bold text-red-700">
                      -{summary.irreversibleDetention.shortfallPercentage}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 1: DASHBOARD (Section 5 & Section 6)
             ======================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* 4 Liquid Glass Dashboard KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <GlassCard hover>
                  <div className="text-xs font-semibold text-[#3D5A80] tracking-wider">
                    OVERALL ATTENDANCE
                  </div>
                  <div className="font-mono-num text-3xl font-bold text-[#0D1B2A] mt-2">
                    {summary.percentage}%
                  </div>
                  <div className="mt-3">
                    <GlassProgress
                      value={summary.percentage}
                      threshold={settings.dangerThreshold}
                      target={settings.targetThreshold}
                      heightClass="h-2.5"
                    />
                  </div>
                  <div className="text-xs text-[#3D5A80] mt-2 font-mono-num">
                    {summary.effectiveAttended} / {summary.effectiveConducted} classes attended
                  </div>
                </GlassCard>

                <GlassCard hover>
                  <div className="text-xs font-semibold text-[#3D5A80] tracking-wider">
                    CLASSES REMAINING
                  </div>
                  <div className="font-mono-num text-3xl font-bold text-[#1B3A6B] mt-2">
                    {summary.remainingUntilDeadline}
                  </div>
                  <div className="text-xs text-[#3D5A80] mt-3">
                    Until {formatReadableDate(settings.novemberDeadline)}
                  </div>
                  <div className="text-xs font-medium text-[#0D1B2A] mt-1 font-mono-num">
                    Need {summary.requiredForTarget} for {settings.targetThreshold}% · Safe miss: {summary.canMissFor75}
                  </div>
                </GlassCard>

                <GlassCard hover>
                  <div className="text-xs font-semibold text-[#3D5A80] tracking-wider">
                    SUBJECTS AT RISK
                  </div>
                  <div
                    className={`font-mono-num text-3xl font-bold mt-2 ${
                      summary.subjectsAtRisk > 0 ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {summary.subjectsAtRisk}
                  </div>
                  <div className="text-xs text-[#3D5A80] mt-3">
                    Threshold: {settings.dangerThreshold}% minimum
                  </div>
                  <div className="text-xs text-[#0D1B2A] mt-1">
                    {summary.subjectsBelow90} subject(s) below {settings.targetThreshold}% target
                  </div>
                </GlassCard>

                <GlassCard hover>
                  <div className="text-xs font-semibold text-[#3D5A80] tracking-wider">
                    RECOVERY STATUS
                  </div>
                  <div
                    className={`text-2xl font-bold mt-2 ${
                      summary.irreversibleDetention.triggered
                        ? 'text-red-700'
                        : 'text-[#0D1B2A]'
                    }`}
                  >
                    {summary.recoveryStatus}
                  </div>
                  <div className="text-xs text-[#3D5A80] mt-3">
                    Max Achievable:{' '}
                    <span className="font-mono-num font-bold text-[#1B3A6B]">
                      {summary.maxPossiblePercentage}%
                    </span>
                  </div>
                  <div className="text-xs text-[#0D1B2A] mt-1">
                    {summary.irreversibleDetention.triggered
                      ? 'Shortfall detected before deadline'
                      : `Can recover toward ${settings.targetThreshold}%`}
                  </div>
                </GlassCard>
              </div>

              {/* Dashboard Main Split: Today's Classes + Subject-Wise Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Today's Classes Quick Marker (Section 6) */}
                <GlassCard variant="elevated" className="lg:col-span-5 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-[#CDE1F2]">
                      <div>
                        <div className="text-xs font-bold text-[#1B3A6B] tracking-wider">
                          TODAY&apos;S CLASSES ({markingDayInfo.dayName.toUpperCase()})
                        </div>
                        <p className="text-xs text-[#3D5A80] mt-0.5">
                          One-click attendance updates your metrics immediately
                        </p>
                      </div>
                      <input
                        type="date"
                        value={markingDate}
                        onChange={(e) => setMarkingDate(e.target.value)}
                        className="liquid-glass-input px-2.5 py-1.5 rounded-xl text-xs font-mono-num text-[#0D1B2A]"
                      />
                    </div>

                    {markingDayInfo.slots.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-white/60 text-center text-sm text-[#3D5A80]">
                        No classes scheduled on {formatReadableDate(markingDate)} ({markingDayInfo.dayName}).
                        Select a weekday above to mark classes.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[430px] overflow-y-auto pr-1">
                        {markingDayInfo.slots.map((slot) => {
                          const existing = currentSectionRecords.find(
                            (r) => r.date === markingDate && r.period === slot.period
                          );
                          return (
                            <div
                              key={slot.period}
                              className="p-3.5 rounded-2xl bg-white/75 border border-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="text-[11px] font-mono-num text-[#3D5A80]">
                                  P{slot.period} · {slot.startTime} – {slot.endTime} · {slot.subjectSlot}
                                </div>
                                <div className="text-sm font-bold text-[#0D1B2A] truncate mt-0.5">
                                  {slot.subjectName}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() =>
                                    handleMarkPeriodAttendance(markingDate, slot, 'present')
                                  }
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    existing?.status === 'present'
                                      ? 'bg-emerald-700 text-white shadow-sm'
                                      : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  ✓ Present
                                </button>
                                <button
                                  onClick={() =>
                                    handleMarkPeriodAttendance(markingDate, slot, 'absent')
                                  }
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    existing?.status === 'absent'
                                      ? 'bg-rose-700 text-white shadow-sm'
                                      : 'bg-white hover:bg-rose-50 text-rose-800 border border-rose-200'
                                  }`}
                                >
                                  ✕ Absent
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {markingDayInfo.slots.length > 0 && (
                    <div className="pt-4 mt-4 border-t border-[#CDE1F2] flex items-center justify-between gap-2">
                      <GlassButton
                        size="sm"
                        variant="secondary"
                        onClick={() => handleMarkAllDay(markingDate, 'present')}
                      >
                        Mark All Present
                      </GlassButton>
                      <GlassButton
                        size="sm"
                        variant="ghost"
                        onClick={() => setActiveTab('today')}
                      >
                        Full Timetable & OD Options →
                      </GlassButton>
                    </div>
                  )}
                </GlassCard>

                {/* Subject-wise Attendance Snapshot */}
                <GlassCard className="lg:col-span-7">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-[#CDE1F2]">
                    <div>
                      <h3 className="text-base font-bold text-[#0D1B2A]">
                        Subject-Wise Attendance & Recovery Targets
                      </h3>
                      <p className="text-xs text-[#3D5A80] mt-0.5">
                        Live calculation across all {summary.subjects.length} courses in {profile.sectionId}
                      </p>
                    </div>
                    <GlassButton
                      size="sm"
                      variant="secondary"
                      onClick={() => setActiveTab('planner')}
                    >
                      Open Planner
                    </GlassButton>
                  </div>

                  <div className="space-y-3.5 max-h-[470px] overflow-y-auto pr-1">
                    {summary.subjects.map((sub) => (
                      <div
                        key={sub.subjectCode}
                        className="p-4 rounded-2xl bg-white/70 border border-white space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-sm font-bold text-[#0D1B2A]">
                              {sub.subjectName}
                            </span>
                            <span className="text-xs text-[#3D5A80] ml-2 font-mono-num">
                              {sub.subjectCode} · {sub.subjectSlot}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono-num text-xs text-[#3D5A80]">
                              {sub.effectiveAttended}/{sub.effectiveConducted}
                            </span>
                            <span
                              className={`font-mono-num text-sm font-bold ${
                                sub.percentage < settings.dangerThreshold
                                  ? 'text-red-700'
                                  : sub.percentage < settings.dangerThreshold + 5
                                  ? 'text-amber-700'
                                  : 'text-[#0D1B2A]'
                              }`}
                            >
                              {sub.percentage}%
                            </span>
                          </div>
                        </div>

                        <GlassProgress
                          value={sub.percentage}
                          threshold={settings.dangerThreshold}
                          target={settings.targetThreshold}
                          heightClass="h-2.5"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#3D5A80] pt-0.5">
                          <span>
                            Remaining: <strong className="font-mono-num text-[#0D1B2A]">{sub.remainingUntilDeadline}</strong>
                          </span>
                          <span>
                            Need for {settings.targetThreshold}%:{' '}
                            <strong className="font-mono-num text-[#1B3A6B]">
                              {sub.irreversibleForTarget
                                ? `Max ${sub.maxPossiblePercentage}%`
                                : `${sub.requiredForTarget} classes`}
                            </strong>
                          </span>
                          <span>
                            Can miss ({settings.dangerThreshold}%):{' '}
                            <strong className="font-mono-num text-[#0D1B2A]">
                              {sub.canMissFor75}
                            </strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: TODAY'S CLASSES & WEEKLY SECTION TIMETABLE
             ======================================================== */}
          {activeTab === 'today' && (
            <div className="space-y-6">
              <GlassCard variant="elevated">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-5 border-b border-[#CDE1F2]">
                  <div>
                    <h2 className="text-lg font-bold text-[#0D1B2A]">
                      Daily Attendance Marker — {profile.sectionId}
                    </h2>
                    <p className="text-xs text-[#3D5A80] mt-0.5">
                      Mark Present, Absent, On-Duty (OD), or Medical Leave for each scheduled period
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <GlassInput
                      type="date"
                      value={markingDate}
                      onChange={(e) => setMarkingDate(e.target.value)}
                    />
                    <GlassButton
                      size="sm"
                      variant="present"
                      onClick={() => handleMarkAllDay(markingDate, 'present')}
                    >
                      ✓ Mark All Present
                    </GlassButton>
                    <GlassButton
                      size="sm"
                      variant="absent"
                      onClick={() => handleMarkAllDay(markingDate, 'absent')}
                    >
                      ✕ Mark All Absent
                    </GlassButton>
                  </div>
                </div>

                {markingDayInfo.slots.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-white/60 text-center text-sm text-[#3D5A80]">
                    No classes scheduled on {formatReadableDate(markingDate)} ({markingDayInfo.dayName}).
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {markingDayInfo.slots.map((slot) => {
                      const existing = currentSectionRecords.find(
                        (r) => r.date === markingDate && r.period === slot.period
                      );
                      return (
                        <div
                          key={slot.period}
                          className="p-4 rounded-2xl bg-white/80 border border-white flex flex-col justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs text-[#3D5A80] font-mono-num">
                              <span>Period {slot.period}</span>
                              <span>
                                {slot.startTime} – {slot.endTime}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-[#0D1B2A] mt-1.5">
                              {slot.subjectName}
                            </h4>
                            <div className="text-xs text-[#3D5A80] mt-0.5 font-mono-num">
                              {slot.subjectCode} · {slot.subjectSlot} · {slot.type}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() =>
                                handleMarkPeriodAttendance(markingDate, slot, 'present')
                              }
                              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                existing?.status === 'present'
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              ✓ Present
                            </button>
                            <button
                              onClick={() =>
                                handleMarkPeriodAttendance(markingDate, slot, 'absent')
                              }
                              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                existing?.status === 'absent'
                                  ? 'bg-rose-700 text-white'
                                  : 'bg-white hover:bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              ✕ Absent
                            </button>
                            <button
                              onClick={() =>
                                handleMarkPeriodAttendance(markingDate, slot, 'od')
                              }
                              className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                existing?.status === 'od'
                                  ? 'bg-[#1B3A6B] text-white'
                                  : 'bg-white/80 hover:bg-[#E8F1FA] text-[#1B3A6B] border border-[#CDE1F2]'
                              }`}
                            >
                              On-Duty (OD)
                            </button>
                            <button
                              onClick={() =>
                                handleMarkPeriodAttendance(markingDate, slot, 'medical')
                              }
                              className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                existing?.status === 'medical'
                                  ? 'bg-teal-700 text-white'
                                  : 'bg-white/80 hover:bg-teal-50 text-teal-800 border border-teal-200'
                              }`}
                            >
                              Medical
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>

              {/* Full Section Master Timetable (Periods 1-9, Monday-Friday) */}
              <GlassCard>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-[#0D1B2A]">
                      Master Section Timetable — {profile.sectionId} (Periods 1–9)
                    </h3>
                    <p className="text-xs text-[#3D5A80]">
                      Click any timetable cell to edit its subject or slot mapping
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[920px]">
                    <thead>
                      <tr className="border-b border-[#CDE1F2] text-[11px] font-semibold text-[#3D5A80]">
                        <th className="py-3 px-3">Day</th>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((p) => (
                          <th key={p} className="py-3 px-2.5 font-mono-num">
                            P{p}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#CDE1F2]/60 text-xs">
                      {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as DayOfWeek[]).map(
                        (day) => {
                          const daySlots = currentTimetable
                            .filter((s) => s.day === day)
                            .sort((a, b) => a.period - b.period);
                          return (
                            <tr key={day} className="hover:bg-white/40">
                              <td className="py-3 px-3 font-bold text-[#0D1B2A]">{day}</td>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((p) => {
                                const slot = daySlots.find((s) => s.period === p);
                                return (
                                  <td key={p} className="py-2 px-1.5">
                                    {slot ? (
                                      <button
                                        onClick={() => setEditingSlot(slot)}
                                        className="w-full text-left p-2 rounded-xl bg-white/70 hover:bg-white border border-white transition-all cursor-pointer"
                                      >
                                        <div className="font-mono-num font-bold text-[11px] text-[#1B3A6B]">
                                          {slot.subjectCode}
                                        </div>
                                        <div className="text-[10px] text-[#0D1B2A] truncate max-w-[95px]">
                                          {slot.subjectName}
                                        </div>
                                      </button>
                                    ) : (
                                      <span className="text-[11px] text-[#6B8CAE]">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          )}

          {/* ========================================================
              TAB 3: MY ATTENDANCE (Subject-Wise & Initial Attendance)
             ======================================================== */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <GlassCard variant="elevated">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5 border-b border-[#CDE1F2]">
                  <div>
                    <h2 className="text-lg font-bold text-[#0D1B2A]">
                      Subject-Wise Attendance & Baseline Editor
                    </h2>
                    <p className="text-xs text-[#3D5A80] mt-0.5">
                      Adjust your initial conducted/attended counts or inspect live recovery math per subject
                    </p>
                  </div>
                  <div className="font-mono-num text-sm font-bold text-[#1B3A6B]">
                    Overall: {summary.percentage}% ({summary.effectiveAttended}/{summary.effectiveConducted})
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[880px]">
                    <thead>
                      <tr className="border-b border-[#CDE1F2] text-xs font-semibold text-[#3D5A80]">
                        <th className="py-3 px-3">Subject</th>
                        <th className="py-3 px-3 text-right">Init Conducted</th>
                        <th className="py-3 px-3 text-right">Init Attended</th>
                        <th className="py-3 px-3 text-right">Total Att / Cond</th>
                        <th className="py-3 px-3 text-right">Current %</th>
                        <th className="py-3 px-3 text-right">Remaining</th>
                        <th className="py-3 px-3 text-right">Need for {settings.targetThreshold}%</th>
                        <th className="py-3 px-3 text-right">Can Miss ({settings.dangerThreshold}%)</th>
                        <th className="py-3 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#CDE1F2]/60 text-xs">
                      {summary.subjects.map((sub) => {
                        const initObj = currentInitialSubjects.find(
                          (i) => i.subjectCode === sub.subjectCode
                        );
                        return (
                          <tr key={sub.subjectCode} className="hover:bg-white/50">
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-[#0D1B2A]">{sub.subjectName}</div>
                              <div className="text-[11px] text-[#3D5A80] font-mono-num">
                                {sub.subjectCode} · {sub.subjectSlot} · {sub.type}
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <input
                                type="number"
                                min={0}
                                value={initObj?.initialConducted ?? 0}
                                onChange={(e) =>
                                  handleUpdateInitialSubject(
                                    sub.subjectCode,
                                    'initialConducted',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-20 text-right font-mono-num liquid-glass-input px-2.5 py-1.5 rounded-lg text-xs"
                              />
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <input
                                type="number"
                                min={0}
                                max={initObj?.initialConducted ?? 100}
                                value={initObj?.initialAttended ?? 0}
                                onChange={(e) =>
                                  handleUpdateInitialSubject(
                                    sub.subjectCode,
                                    'initialAttended',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-20 text-right font-mono-num liquid-glass-input px-2.5 py-1.5 rounded-lg text-xs"
                              />
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono-num font-semibold text-[#0D1B2A]">
                              {sub.effectiveAttended} / {sub.effectiveConducted}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono-num font-bold text-sm text-[#1B3A6B]">
                              {sub.percentage}%
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono-num text-[#3D5A80]">
                              {sub.remainingUntilDeadline}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono-num font-semibold text-[#0D1B2A]">
                              {sub.irreversibleForTarget
                                ? `Max ${sub.maxPossiblePercentage}%`
                                : `${sub.requiredForTarget} classes`}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono-num font-semibold text-emerald-800">
                              {sub.canMissFor75}
                            </td>
                            <td className="py-3.5 px-3 text-right font-bold text-[#0D1B2A]">
                              {sub.status}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          )}

          {/* ========================================================
              TAB 4: ANALYTICS (Section 19)
             ======================================================== */}
          {activeTab === 'analytics' && (
            <AnalyticsView
              summary={summary}
              settings={settings}
              records={currentSectionRecords}
            />
          )}

          {/* ========================================================
              TAB 5: FUTURE DATE ATTENDANCE PLANNER (Section 8 & 9)
             ======================================================== */}
          {activeTab === 'planner' && (
            <div className="space-y-6">
              <GlassCard variant="elevated">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-5 border-b border-[#CDE1F2]">
                  <div>
                    <h2 className="text-lg font-bold text-[#0D1B2A]">
                      Future Date Attendance Planner
                    </h2>
                    <p className="text-xs text-[#3D5A80] mt-0.5">
                      Calculates exact remaining classes using your {profile.sectionId} timetable (never raw calendar days)
                    </p>
                  </div>
                </div>

                {/* Controls Row: Today, Plan Until, Danger Threshold, Target %, November Deadline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                  <GlassInput
                    type="date"
                    label="Today's Reference Date"
                    value={todayIso}
                    disabled
                  />
                  <GlassInput
                    type="date"
                    label="Plan Until Date"
                    value={planningDate}
                    min={todayIso}
                    onChange={(e) => setPlanningDate(e.target.value)}
                  />
                  <GlassInput
                    type="number"
                    min={50}
                    max={95}
                    label="Danger Threshold (%)"
                    value={settings.dangerThreshold}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        dangerThreshold: Number(e.target.value),
                      }))
                    }
                  />
                  <GlassInput
                    type="number"
                    min={60}
                    max={100}
                    label="Target Attendance (%)"
                    value={settings.targetThreshold}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        targetThreshold: Number(e.target.value),
                      }))
                    }
                  />
                  <GlassInput
                    type="date"
                    label="November Deadline"
                    value={settings.novemberDeadline}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        novemberDeadline: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Planner KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6 text-center">
                  <div className="p-4 rounded-2xl bg-[#E8F1FA]/90 border border-white">
                    <div className="text-xs text-[#3D5A80]">Scheduled Classes</div>
                    <div className="font-mono-num text-2xl font-bold text-[#0D1B2A] mt-1">
                      {plannerSummary.remainingUntilDeadline}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#E8F1FA]/90 border border-white">
                    <div className="text-xs text-[#3D5A80]">
                      Required for {settings.dangerThreshold}%
                    </div>
                    <div className="font-mono-num text-2xl font-bold text-[#1B3A6B] mt-1">
                      {plannerSummary.requiredFor75}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#E8F1FA]/90 border border-white">
                    <div className="text-xs text-[#3D5A80]">
                      Required for {settings.targetThreshold}%
                    </div>
                    <div className="font-mono-num text-2xl font-bold text-[#1B3A6B] mt-1">
                      {plannerSummary.requiredForTarget}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#E8F1FA]/90 border border-white">
                    <div className="text-xs text-[#3D5A80]">
                      Safe Misses ({settings.dangerThreshold}%)
                    </div>
                    <div className="font-mono-num text-2xl font-bold text-emerald-700 mt-1">
                      {plannerSummary.canMissFor75}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#E8F1FA]/90 border border-white">
                    <div className="text-xs text-[#3D5A80]">Max Achievable</div>
                    <div className="font-mono-num text-2xl font-bold text-[#0D1B2A] mt-1">
                      {plannerSummary.maxPossiblePercentage}%
                    </div>
                  </div>
                </div>

                {/* Subject-wise Planner Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[820px]">
                    <thead>
                      <tr className="border-b border-[#CDE1F2] text-xs font-semibold text-[#3D5A80]">
                        <th className="py-3 px-3">Subject</th>
                        <th className="py-3 px-3 text-right">Current %</th>
                        <th className="py-3 px-3 text-right">Remaining Classes</th>
                        <th className="py-3 px-3 text-right">
                          Required for {settings.dangerThreshold}%
                        </th>
                        <th className="py-3 px-3 text-right">
                          Required for {settings.targetThreshold}%
                        </th>
                        <th className="py-3 px-3 text-right">Can Be Missed</th>
                        <th className="py-3 px-3 text-right">Max Achievable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#CDE1F2]/60 text-xs">
                      {plannerSummary.subjects.map((sub) => (
                        <tr key={sub.subjectCode} className="hover:bg-white/50">
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-[#0D1B2A]">{sub.subjectName}</div>
                            <div className="text-[11px] text-[#3D5A80] font-mono-num">
                              {sub.subjectCode}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono-num font-bold text-[#0D1B2A]">
                            {sub.percentage}%
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono-num font-semibold text-[#1B3A6B]">
                            {sub.remainingUntilDeadline}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono-num">
                            {sub.irreversibleFor75
                              ? 'Detention Risk'
                              : `${sub.requiredFor75} / ${sub.remainingUntilDeadline}`}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono-num">
                            {sub.irreversibleForTarget
                              ? `Capped at ${sub.maxPossiblePercentage}%`
                              : `${sub.requiredForTarget} / ${sub.remainingUntilDeadline}`}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono-num font-bold text-emerald-800">
                            {sub.canMissFor75}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono-num font-bold text-[#1B3A6B]">
                            {sub.maxPossiblePercentage}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          )}

          {/* ========================================================
              TAB 6: LEAVE PLANNER (Sections 10–17)
             ======================================================== */}
          {activeTab === 'leave' && (
            <LeavePlannerView
              timetable={currentTimetable}
              summary={summary}
              settings={settings}
              leaves={currentSectionLeaves}
              attendanceRecords={currentSectionRecords}
              studentId={profile.studentId}
              sectionId={profile.sectionId}
              onSaveLeave={handleSaveLeave}
              onDeleteLeave={handleDeleteLeave}
              onUpdateSettings={setSettings}
            />
          )}

          {/* ========================================================
              TAB 7: WHAT-IF SIMULATOR (Section 18)
             ======================================================== */}
          {activeTab === 'whatif' && (
            <WhatIfSimulatorView
              timetable={currentTimetable}
              summary={summary}
              settings={settings}
            />
          )}

          {/* ========================================================
              TAB 8: ATTENDANCE HISTORY (Section 20)
             ======================================================== */}
          {activeTab === 'history' && (
            <GlassCard variant="elevated">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-5 border-b border-[#CDE1F2]">
                <div>
                  <h2 className="text-lg font-bold text-[#0D1B2A]">
                    Attendance History Log
                  </h2>
                  <p className="text-xs text-[#3D5A80] mt-0.5">
                    Filter period-by-period attendance logs by subject, date, or status
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <GlassSelect
                    value={historySubjectFilter}
                    onChange={(e) => setHistorySubjectFilter(e.target.value)}
                  >
                    <option value="ALL">All Subjects</option>
                    {summary.subjects.map((s) => (
                      <option key={s.subjectCode} value={s.subjectCode}>
                        {s.subjectCode} — {s.subjectName}
                      </option>
                    ))}
                  </GlassSelect>

                  <GlassSelect
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="od">On-Duty (OD)</option>
                    <option value="medical">Medical</option>
                  </GlassSelect>

                  <GlassInput
                    type="date"
                    value={historyDateFilter}
                    onChange={(e) => setHistoryDateFilter(e.target.value)}
                  />

                  {(historySubjectFilter !== 'ALL' ||
                    historyStatusFilter !== 'ALL' ||
                    historyDateFilter !== '') && (
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setHistorySubjectFilter('ALL');
                        setHistoryStatusFilter('ALL');
                        setHistoryDateFilter('');
                      }}
                    >
                      Reset Filters
                    </GlassButton>
                  )}
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white/50 text-center text-sm text-[#3D5A80]">
                  No attendance log entries match the selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#CDE1F2] text-xs font-semibold text-[#3D5A80]">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#CDE1F2]/60 text-xs">
                      {filteredHistory.map((rec) => (
                        <tr key={rec.id} className="hover:bg-white/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono-num font-semibold text-[#0D1B2A]">
                            {rec.date}
                          </td>
                          <td className="py-3.5 px-4 font-mono-num text-[#3D5A80]">
                            Period {rec.period}{' '}
                            {rec.startTime ? `(${rec.startTime}–${rec.endTime})` : ''}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-[#0D1B2A]">
                              {rec.subjectName}
                            </span>
                            <span className="text-[#3D5A80] ml-2 font-mono-num">
                              ({rec.subjectCode})
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`font-bold uppercase ${
                                rec.status === 'present'
                                  ? 'text-emerald-700'
                                  : rec.status === 'absent'
                                  ? 'text-rose-700'
                                  : 'text-[#1B3A6B]'
                              }`}
                            >
                              {rec.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() =>
                                setAttendanceRecords((prev) =>
                                  prev.filter((item) => item.id !== rec.id)
                                )
                              }
                              className="text-rose-700 hover:underline text-xs cursor-pointer"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          )}

          {/* ========================================================
              TAB 9: ATTENDANCE ADVISOR AI (Sections 21 & 22)
             ======================================================== */}
          {activeTab === 'advisor' && (
            <AttendanceAdvisorChat
              profile={profile}
              timetable={currentTimetable}
              summary={summary}
              settings={settings}
              leaves={currentSectionLeaves}
              mode="page"
            />
          )}

          {/* ========================================================
              SMART CAMPUS ROOM & SPACE FINDER MODULE
             ======================================================== */}
          {activeTab === 'campus_space' && (
            <CampusSpaceFinderView studentProfile={profile} />
          )}

          {/* ========================================================
              TAB 10: PROFILE & SECTION DETAILS (Section 23)
             ======================================================== */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <GlassCard variant="elevated" className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#0D1B2A]">Student Profile</h2>
                    <p className="text-xs text-[#3D5A80]">
                      Manage your student identity and active class section
                    </p>
                  </div>
                  <GlassButton
                    size="sm"
                    variant="danger"
                    onClick={() => setPortalMode('role_selection')}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Log Out
                  </GlassButton>
                </div>

                <GlassInput
                  label="Student Full Name"
                  value={profile.name}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <GlassInput
                  label="Register Number"
                  value={profile.registerNumber}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, registerNumber: e.target.value }))
                  }
                />
                <GlassSelect
                  label="Class Section (Loads Section Timetable)"
                  value={profile.sectionId}
                  onChange={(e) => handleSectionChange(e.target.value)}
                >
                  {SECTIONS_LIST.map((sec) => (
                    <option key={sec.sectionId} value={sec.sectionId}>
                      {sec.sectionName} — {sec.department}
                    </option>
                  ))}
                </GlassSelect>
                <GlassInput
                  label="Department"
                  value={profile.department}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, department: e.target.value }))
                  }
                />
                <GlassInput
                  label="Academic Year"
                  value={profile.year}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, year: e.target.value }))
                  }
                />

                <div className="pt-3 border-t border-[#CDE1F2]">
                  <GlassButton
                    variant="secondary"
                    size="md"
                    className="w-full"
                    onClick={() => setPortalMode('role_selection')}
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out of Student Portal
                  </GlassButton>
                </div>
              </GlassCard>

              <GlassCard className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#0D1B2A]">
                      Class Section & Registered Subjects
                    </h3>
                    <p className="text-xs text-[#3D5A80]">
                      Active timetable overview for {profile.sectionId} ({currentTimetable.length} weekly scheduled periods)
                    </p>
                  </div>
                  <GlassButton
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setAllTimetables(INITIAL_TIMETABLES);
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Timetables
                  </GlassButton>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {SECTIONS_LIST.map((sec) => (
                    <button
                      key={sec.sectionId}
                      onClick={() => handleSectionChange(sec.sectionId)}
                      className={`p-2.5 rounded-xl text-xs font-semibold border text-center cursor-pointer transition-all ${
                        profile.sectionId === sec.sectionId
                          ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                          : 'bg-white/70 text-[#0D1B2A] border-white hover:bg-white'
                      }`}
                    >
                      {sec.sectionName}
                    </button>
                  ))}
                </div>

                <div className="divide-y divide-[#CDE1F2]/70 rounded-2xl bg-white/75 border border-[#CDE1F2] overflow-hidden">
                  {summary.subjects.map((sub) => (
                    <div
                      key={sub.subjectCode}
                      className="p-3.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#0D1B2A]">{sub.subjectName}</div>
                        <div className="text-[#3D5A80] font-mono-num">
                          {sub.subjectCode} · {sub.subjectSlot} · {sub.type.toUpperCase()}
                        </div>
                      </div>
                      <div className="text-right font-mono-num">
                        <div className="font-bold text-[#1B3A6B]">{sub.percentage}%</div>
                        <div className="text-[11px] text-[#3D5A80]">
                          {sub.attended}/{sub.conducted} classes
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Glass Navigation — All 10 Tabs Scrollable (Section 24 & 27) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 liquid-glass-elevated border-t border-white px-2 py-2 flex items-center gap-1.5 overflow-x-auto">
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                active
                  ? 'text-white bg-[#1B3A6B] shadow-xs'
                  : 'text-[#1B3A6B] hover:bg-white/60'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Floating Attendance Advisor Chatbot (on all tabs except dedicated advisor tab) */}
      {activeTab !== 'advisor' && (
        <AttendanceAdvisorChat
          profile={profile}
          timetable={currentTimetable}
          summary={summary}
          settings={settings}
          leaves={currentSectionLeaves}
          mode="floating"
        />
      )}

      {/* Modal: Enter Initial Attendance */}
      <GlassModal
        isOpen={isInitialModalOpen}
        onClose={() => setIsInitialModalOpen(false)}
        title={`Enter Initial Attendance — ${profile.sectionId}`}
        subtitle="Set your baseline conducted and attended classes for each subject in your section"
        maxWidthClass="max-w-3xl"
      >
        <div className="space-y-3">
          {currentInitialSubjects.map((sub) => (
            <div
              key={sub.subjectCode}
              className="p-3.5 rounded-2xl bg-white/80 border border-[#CDE1F2] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="text-sm font-bold text-[#0D1B2A]">{sub.subjectName}</div>
                <div className="text-xs text-[#3D5A80] font-mono-num">
                  {sub.subjectCode} · {sub.subjectSlot}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <GlassInput
                  type="number"
                  min={0}
                  label="Conducted"
                  value={sub.initialConducted}
                  onChange={(e) =>
                    handleUpdateInitialSubject(
                      sub.subjectCode,
                      'initialConducted',
                      Number(e.target.value)
                    )
                  }
                  className="w-24"
                />
                <GlassInput
                  type="number"
                  min={0}
                  max={sub.initialConducted}
                  label="Attended"
                  value={sub.initialAttended}
                  onChange={(e) =>
                    handleUpdateInitialSubject(
                      sub.subjectCode,
                      'initialAttended',
                      Number(e.target.value)
                    )
                  }
                  className="w-24"
                />
              </div>
            </div>
          ))}
          <div className="pt-3 flex justify-end">
            <GlassButton
              variant="primary"
              onClick={() => setIsInitialModalOpen(false)}
            >
              Done & Recalculate
            </GlassButton>
          </div>
        </div>
      </GlassModal>

      {/* Modal: Edit Timetable Slot */}
      <GlassModal
        isOpen={Boolean(editingSlot)}
        onClose={() => setEditingSlot(null)}
        title={
          editingSlot
            ? `Edit Timetable Slot — ${editingSlot.day} Period ${editingSlot.period}`
            : 'Edit Slot'
        }
        subtitle="Customize the structured timetable slot for your section"
      >
        {editingSlot && (
          <div className="space-y-4">
            <GlassInput
              label="Subject Code"
              value={editingSlot.subjectCode}
              onChange={(e) =>
                setEditingSlot({ ...editingSlot, subjectCode: e.target.value })
              }
            />
            <GlassInput
              label="Subject Name"
              value={editingSlot.subjectName}
              onChange={(e) =>
                setEditingSlot({ ...editingSlot, subjectName: e.target.value })
              }
            />
            <GlassSelect
              label="Period Type"
              value={editingSlot.type}
              onChange={(e) =>
                setEditingSlot({
                  ...editingSlot,
                  type: e.target.value as PeriodType,
                })
              }
            >
              <option value="lecture">lecture</option>
              <option value="lab">lab</option>
              <option value="activity">activity</option>
              <option value="break">break</option>
            </GlassSelect>
            <div className="flex justify-end gap-2 pt-3">
              <GlassButton variant="secondary" onClick={() => setEditingSlot(null)}>
                Cancel
              </GlassButton>
              <GlassButton
                variant="primary"
                onClick={() => {
                  setAllTimetables((prev) => {
                    const list = prev[profile.sectionId] || [];
                    const updated = list.map((s) =>
                      s.day === editingSlot.day && s.period === editingSlot.period
                        ? editingSlot
                        : s
                    );
                    return { ...prev, [profile.sectionId]: updated };
                  });
                  setEditingSlot(null);
                }}
              >
                Save Slot
              </GlassButton>
            </div>
          </div>
        )}
      </GlassModal>
        </>
      )}
    </div>
  );
}
