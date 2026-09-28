import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  LogOut,
  Plus,
  QrCode,
  Sliders,
  Users,
} from 'lucide-react';
import {
  AttendanceRecord,
  AttendanceSettings,
  InitialSubjectAttendance,
  LeaveRecord,
  QrAttendanceSession,
  RegisterEntryStatus,
  StaffAssignedClass,
  StaffProfile,
  StudentProfile,
  TimetableSlot,
} from '../types/attendance';
import {
  buildRosterForSection,
  getAllStaffAssignableClasses,
  STAFF_PROFILES,
} from '../data/staffAndRoster';
import {
  addDaysToIso,
  calculateAttendance,
  formatReadableDate,
  getDayOfWeekFromDateString,
  getTodayIsoDate,
} from '../engine/attendanceEngine';
import {
  GlassButton,
  GlassCard,
  GlassInput,
  GlassModal,
  GlassProgress,
  GlassSelect,
} from './glass/GlassComponents';
import { StaffRegisterSheet } from './StaffRegisterSheet';
import { StaffQrModal } from './QrSessionModalAndView';

interface StaffPortalViewProps {
  staff: StaffProfile;
  allTimetables: Record<string, TimetableSlot[]>;
  activeStudent: StudentProfile;
  sectionInitialAttendance: Record<string, InitialSubjectAttendance[]>;
  attendanceRecords: AttendanceRecord[];
  leaveRecords: LeaveRecord[];
  settings: AttendanceSettings;
  rosterOverrides: Record<string, RegisterEntryStatus>;
  activeQrSession: QrAttendanceSession | null;
  onUpdateStaffProfile: (nextStaff: StaffProfile) => void;
  onUpdateSettings: (next: AttendanceSettings) => void;
  onStaffMarkStudent: (
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
  ) => void;
  onStaffBulkMarkPresent: (
    sectionId: string,
    subjectCode: string,
    subjectName: string,
    date: string,
    period: number,
    startTime: string,
    endTime: string,
    studentIds: string[]
  ) => void;
  onCreateQrSession: (session: QrAttendanceSession) => void;
  onExpireQrSession: () => void;
  onSimulateStudentQrScan: (session: QrAttendanceSession) => void;
  onSwitchToRoleSelection: () => void;
  onSwitchToStudentPortal: () => void;
}

export const StaffPortalView: React.FC<StaffPortalViewProps> = ({
  staff,
  allTimetables,
  activeStudent,
  sectionInitialAttendance,
  attendanceRecords,
  leaveRecords,
  settings,
  rosterOverrides,
  activeQrSession,
  onUpdateStaffProfile,
  onUpdateSettings,
  onStaffMarkStudent,
  onStaffBulkMarkPresent,
  onCreateQrSession,
  onExpireQrSession,
  onSimulateStudentQrScan,
  onSwitchToRoleSelection,
  onSwitchToStudentPortal,
}) => {
  const todayIso = getTodayIsoDate();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const dName = getDayOfWeekFromDateString(todayIso);
    if (dName === 'Sunday' || dName === 'Saturday') {
      return addDaysToIso(todayIso, 1);
    }
    return todayIso;
  });

  const [openedClass, setOpenedClass] = useState<{
    assigned: StaffAssignedClass;
    period: number;
    startTime: string;
    endTime: string;
  } | null>(null);

  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState<boolean>(false);
  const [selectedNewClassId, setSelectedNewClassId] = useState<string>('');

  const allAssignable = useMemo(() => getAllStaffAssignableClasses(), []);

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

  // Resolve timetable period & attendance summary for each assigned class on `selectedDate`
  const resolvedClassCards = useMemo(() => {
    const dayName = getDayOfWeekFromDateString(selectedDate);
    return staff.assignedClasses.map((asg, index) => {
      const secTimetable = allTimetables[asg.sectionId] || [];
      const matchingTodaySlot = secTimetable.find(
        (s) => s.day === dayName && s.subjectCode === asg.subjectCode
      );
      const fallbackSlot = secTimetable.find(
        (s) => s.subjectCode === asg.subjectCode
      );

      const period = matchingTodaySlot?.period || fallbackSlot?.period || (index % 6) + 1;
      const startTime = matchingTodaySlot?.startTime || fallbackSlot?.startTime || '09:35';
      const endTime = matchingTodaySlot?.endTime || fallbackSlot?.endTime || '10:25';

      const initials = sectionInitialAttendance[asg.sectionId] || [];
      const roster = buildRosterForSection(asg.sectionId, activeStudent, initials);

      let presentCount = 0;
      let odMedCount = 0;

      roster.forEach((stu, idx) => {
        const isPrimary = stu.studentId === activeStudent.studentId;
        const overrideKey = `${asg.sectionId}|${asg.subjectCode}|${selectedDate}|P${period}|${stu.studentId}`;
        const dbRec = attendanceRecords.find(
          (r) =>
            r.section === asg.sectionId &&
            r.date === selectedDate &&
            r.period === period &&
            (r.studentId === stu.studentId ||
              (isPrimary && r.studentId === activeStudent.studentId))
        );
        const matchingLeave = leaveRecords.find(
          (lv) =>
            lv.section === asg.sectionId &&
            selectedDate >= lv.startDate &&
            selectedDate <= lv.endDate &&
            (lv.studentId === stu.studentId ||
              (isPrimary && lv.studentId === activeStudent.studentId))
        );

        let st: RegisterEntryStatus = 'present';
        if (rosterOverrides[overrideKey]) st = rosterOverrides[overrideKey];
        else if (dbRec) st = dbRec.status;
        else if (matchingLeave) {
          st =
            matchingLeave.leaveType === 'On-Duty'
              ? 'od'
              : matchingLeave.leaveType === 'Medical Leave'
              ? 'medical'
              : 'approved_leave';
        } else if (idx === 5 || idx === 14 || idx === 23 || idx === 38 || idx === 49) {
          st = 'absent';
        } else if (idx === 11) {
          st = 'od';
        } else if (idx === 29) {
          st = 'medical';
        }

        if (st === 'present') presentCount++;
        if (st === 'od' || st === 'medical' || st === 'approved_leave') odMedCount++;
      });

      const pct = calculateAttendance(presentCount, roster.length);

      return {
        assigned: asg,
        period,
        startTime,
        endTime,
        totalStudents: roster.length,
        presentCount,
        odMedCount,
        percentage: pct,
      };
    });
  }, [
    staff.assignedClasses,
    allTimetables,
    selectedDate,
    sectionInitialAttendance,
    activeStudent,
    attendanceRecords,
    leaveRecords,
    rosterOverrides,
  ]);

  const handleGenerateQrForClass = (
    asg: StaffAssignedClass,
    period: number,
    startTime: string,
    endTime: string
  ) => {
    const newSession: QrAttendanceSession = {
      sessionId: `SES-${asg.sectionId}-${asg.subjectCode}-P${period}-${Date.now().toString().slice(-5)}`,
      staffId: staff.staffId,
      staffName: staff.name,
      sectionId: asg.sectionId,
      sectionName: asg.sectionName,
      subjectCode: asg.subjectCode,
      subjectName: asg.subjectName,
      date: selectedDate,
      period,
      startTime,
      endTime,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes expiration
      submittedStudentIds: [],
    };
    onCreateQrSession(newSession);
    setIsQrModalOpen(true);
  };

  return (
    <div className="min-h-screen relative z-10 max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Staff Top Header */}
      <header className="liquid-glass-elevated rounded-[24px] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#1B3A6B] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            IQ
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0D1B2A]">
              {getGreeting()}, {staff.name}
            </h1>
            <p className="text-xs text-[#3D5A80] mt-0.5">
              {formattedTodayHeader} · {staff.designation} ({staff.staffId})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <GlassButton
            size="sm"
            variant="ghost"
            onClick={onSwitchToRoleSelection}
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </GlassButton>
        </div>
      </header>

      {/* Date & College OD/Medical Policy Bar */}
      <GlassCard variant="tint" className="py-4 px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Calendar className="w-4 h-4 text-[#1B3A6B]" />
            <span className="text-xs font-bold text-[#0D1B2A]">
              Attendance Session Date:
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="liquid-glass-input px-3 py-1.5 rounded-xl text-xs font-mono-num text-[#0D1B2A]"
            />
            {leaveRecords.length > 0 && (
              <button
                onClick={() => setSelectedDate(leaveRecords[0].startDate)}
                className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white border border-[#A8C5E0] text-[11px] font-semibold text-[#1B3A6B] cursor-pointer"
              >
                Jump to Student Leave Date ({formatReadableDate(leaveRecords[0].startDate)})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Sliders className="w-4 h-4 text-[#1B3A6B]" />
            <span className="font-semibold text-[#3D5A80]">OD Policy:</span>
            <select
              value={settings.odPolicy}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  odPolicy: e.target.value as AttendanceSettings['odPolicy'],
                })
              }
              className="liquid-glass-input px-2.5 py-1 rounded-lg text-xs"
            >
              <option value="policy_a">Exclude from Denominator</option>
              <option value="policy_b">Count as Attended</option>
              <option value="policy_c">Count as Absent</option>
            </select>

            <span className="font-semibold text-[#3D5A80]">Medical Policy:</span>
            <select
              value={settings.medicalPolicy}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  medicalPolicy: e.target.value as AttendanceSettings['medicalPolicy'],
                })
              }
              className="liquid-glass-input px-2.5 py-1 rounded-lg text-xs"
            >
              <option value="policy_a">Exclude from Denominator</option>
              <option value="policy_b">Count as Attended</option>
              <option value="policy_c">Count as Absent</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Main Content: Either Staff Register Sheet OR "Your Classes" Dashboard */}
      {openedClass ? (
        <StaffRegisterSheet
          assignedClass={openedClass.assigned}
          selectedDate={selectedDate}
          selectedPeriod={openedClass.period}
          startTime={openedClass.startTime}
          endTime={openedClass.endTime}
          activeStudent={activeStudent}
          activeStudentInitials={
            sectionInitialAttendance[openedClass.assigned.sectionId] || []
          }
          attendanceRecords={attendanceRecords}
          leaveRecords={leaveRecords}
          settings={settings}
          rosterOverrides={rosterOverrides}
          onBack={() => setOpenedClass(null)}
          onOpenQrModal={() =>
            handleGenerateQrForClass(
              openedClass.assigned,
              openedClass.period,
              openedClass.startTime,
              openedClass.endTime
            )
          }
          onUpdateStudentStatus={(studentId, isPrimaryStudent, status) =>
            onStaffMarkStudent(
              openedClass.assigned.sectionId,
              openedClass.assigned.subjectCode,
              openedClass.assigned.subjectName,
              selectedDate,
              openedClass.period,
              openedClass.startTime,
              openedClass.endTime,
              studentId,
              isPrimaryStudent,
              status
            )
          }
          onBulkMarkPresent={(studentIds) =>
            onStaffBulkMarkPresent(
              openedClass.assigned.sectionId,
              openedClass.assigned.subjectCode,
              openedClass.assigned.subjectName,
              selectedDate,
              openedClass.period,
              openedClass.startTime,
              openedClass.endTime,
              studentIds
            )
          }
        />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#0D1B2A]">Your Classes</h2>
              <p className="text-xs text-[#3D5A80]">
                Assigned subjects and sections linked directly to the college timetable and central attendance database
              </p>
            </div>
            <GlassButton
              size="sm"
              variant="secondary"
              onClick={() => setIsAddClassModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Assign Timetable Class
            </GlassButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resolvedClassCards.map((card) => (
              <GlassCard
                key={card.assigned.assignmentId}
                variant="elevated"
                hover
                className="flex flex-col justify-between gap-5"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#1B3A6B] tracking-wider">
                        {card.assigned.sectionName} · {card.assigned.subjectCode}
                      </div>
                      <h3 className="text-base font-bold text-[#0D1B2A] mt-1">
                        {card.assigned.subjectName.toUpperCase()}
                      </h3>
                    </div>
                    <span className="font-mono-num text-lg font-bold text-[#1B3A6B]">
                      {card.percentage}%
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-[#3D5A80] font-mono-num">
                    <div>
                      Date: <strong className="text-[#0D1B2A]">{formatReadableDate(selectedDate)}</strong>
                    </div>
                    <div>
                      Today: <strong className="text-[#0D1B2A]">Period {card.period}</strong> ({card.startTime} – {card.endTime})
                    </div>
                    <div>
                      Students: <strong className="text-[#0D1B2A]">{card.totalStudents}</strong>
                    </div>
                    <div>
                      Attendance:{' '}
                      <strong className="text-emerald-800">
                        {card.presentCount} / {card.totalStudents} Present
                      </strong>
                      {card.odMedCount > 0 && (
                        <span className="text-[#1B3A6B] ml-1.5">
                          ({card.odMedCount} OD/Leave)
                        </span>
                      )}
                    </div>
                  </div>

                  <GlassProgress
                    value={card.percentage}
                    threshold={settings.dangerThreshold}
                    target={settings.targetThreshold}
                    heightClass="h-2.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#CDE1F2]/70">
                  <GlassButton
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      setOpenedClass({
                        assigned: card.assigned,
                        period: card.period,
                        startTime: card.startTime,
                        endTime: card.endTime,
                      })
                    }
                  >
                    <Users className="w-3.5 h-3.5" />
                    Open Attendance
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      handleGenerateQrForClass(
                        card.assigned,
                        card.period,
                        card.startTime,
                        card.endTime
                      )
                    }
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Generate QR
                  </GlassButton>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <StaffQrModal
        session={activeQrSession}
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onRegenerateSession={() => {
          if (!activeQrSession) return;
          onCreateQrSession({
            ...activeQrSession,
            sessionId: `SES-${activeQrSession.sectionId}-${activeQrSession.subjectCode}-P${activeQrSession.period}-${Date.now().toString().slice(-5)}`,
            createdAt: Date.now(),
            expiresAt: Date.now() + 5 * 60 * 1000,
            submittedStudentIds: [],
          });
        }}
        onExpireSessionNow={onExpireQrSession}
        onSimulateStudentScan={(ses) => {
          setIsQrModalOpen(false);
          onSimulateStudentQrScan(ses);
        }}
      />

      {/* Modal to Assign Another Section/Subject from the 10-section Timetable */}
      <GlassModal
        isOpen={isAddClassModalOpen}
        onClose={() => setIsAddClassModalOpen(false)}
        title="Assign Timetable Class to Staff"
        subtitle="Select any section and subject from the 10-section college timetable dataset"
      >
        <div className="space-y-4">
          <GlassSelect
            label="Select Section & Subject"
            value={selectedNewClassId}
            onChange={(e) => setSelectedNewClassId(e.target.value)}
          >
            <option value="">-- Choose a class from timetable --</option>
            {allAssignable.map((item) => (
              <option key={item.assignmentId} value={item.assignmentId}>
                {item.sectionName} — {item.subjectCode} ({item.subjectName})
              </option>
            ))}
          </GlassSelect>
          <div className="flex justify-end gap-2">
            <GlassButton
              variant="secondary"
              onClick={() => setIsAddClassModalOpen(false)}
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={() => {
                const chosen = allAssignable.find(
                  (a) => a.assignmentId === selectedNewClassId
                );
                if (
                  chosen &&
                  !staff.assignedClasses.some(
                    (x) => x.assignmentId === chosen.assignmentId
                  )
                ) {
                  onUpdateStaffProfile({
                    ...staff,
                    assignedClasses: [...staff.assignedClasses, chosen],
                  });
                }
                setIsAddClassModalOpen(false);
              }}
            >
              Add to Your Classes
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};
