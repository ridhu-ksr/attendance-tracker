export type PeriodType = 'lecture' | 'lab' | 'activity' | 'break';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface TimetableSlot {
  sectionId: string;
  sectionName: string;
  day: DayOfWeek;
  period: number;
  startTime: string;
  endTime: string;
  subjectCode: string;
  subjectName: string;
  subjectSlot: string;
  type: PeriodType;
}

export interface SectionInfo {
  sectionId: string;
  sectionName: string;
  department: string;
  year: string;
  semester: string;
  room: string;
  classAdvisor: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'od' | 'medical';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  section: string;
  subjectCode: string;
  subjectName: string;
  date: string; // YYYY-MM-DD
  period: number;
  status: AttendanceStatus;
  startTime?: string;
  endTime?: string;
}

export interface InitialSubjectAttendance {
  subjectCode: string;
  subjectName: string;
  subjectSlot: string;
  type: PeriodType;
  initialConducted: number;
  initialAttended: number;
  initialOd?: number;
  initialMedical?: number;
}

export type LeavePolicyMode = 'policy_a' | 'policy_b' | 'policy_c';
// Policy A: Excluded from denominator
// Policy B: Counted as attended
// Policy C: Counted as absent

export interface AttendanceSettings {
  dangerThreshold: number; // default 75
  targetThreshold: number; // default 90
  novemberDeadline: string; // default '2026-11-01'
  odPolicy: LeavePolicyMode;
  medicalPolicy: LeavePolicyMode;
}

export type LeaveType = 'Personal Leave' | 'Medical Leave' | 'On-Duty' | 'Other';

export type LeaveRiskLevel = 'SAFE' | 'LOW RISK' | 'HIGH RISK' | 'RECOVERY IMPOSSIBLE';

export interface LeaveRecord {
  id: string;
  studentId: string;
  section: string;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  totalClassesAffected: number;
  projectedOverallAttendance: number;
  riskLevel: LeaveRiskLevel;
  createdAt: string;
  affectedBySubject: {
    subjectCode: string;
    subjectName: string;
    classesCount: number;
    beforePercentage: number;
    afterPercentage: number;
  }[];
}

export interface StudentProfile {
  studentId: string;
  name: string;
  registerNumber: string;
  department: string;
  year: string;
  sectionId: string;
  email: string;
}

export interface SubjectAttendanceMetrics {
  subjectCode: string;
  subjectName: string;
  subjectSlot: string;
  type: PeriodType;
  conducted: number;
  attended: number;
  absent: number;
  odCount: number;
  medicalCount: number;
  effectiveConducted: number;
  effectiveAttended: number;
  percentage: number;
  remainingUntilDeadline: number;
  requiredFor75: number;
  requiredForTarget: number; // 90%
  canMissFor75: number;
  canMissForTarget: number;
  maxPossiblePercentage: number;
  status: 'OPTIMAL' | 'SAFE' | 'WARNING' | 'CRITICAL' | 'DETENTION';
  irreversibleFor75: boolean;
  irreversibleForTarget: boolean;
}

export interface OverallAttendanceSummary {
  conducted: number;
  attended: number;
  absent: number;
  odCount: number;
  medicalCount: number;
  effectiveConducted: number;
  effectiveAttended: number;
  percentage: number;
  remainingUntilDeadline: number;
  requiredFor75: number;
  requiredForTarget: number;
  canMissFor75: number;
  canMissForTarget: number;
  maxPossiblePercentage: number;
  subjectsAtRisk: number;
  subjectsBelow90: number;
  recoveryStatus: 'Optimal (90%+)' | 'Recoverable' | 'High Vigilance' | 'Irreversible Detention';
  irreversibleDetention: {
    triggered: boolean;
    triggeredForTarget: boolean;
    currentAttendance: number;
    requiredAttendance: number;
    targetAttendance: number;
    remainingClasses: number;
    maxPossibleAttendance: number;
    shortfallPercentage: number;
    detainedSubjects: {
      subjectCode: string;
      subjectName: string;
      currentPercentage: number;
      maxPossiblePercentage: number;
      remainingClasses: number;
      shortfall: number;
    }[];
  };
  subjects: SubjectAttendanceMetrics[];
}

export interface LeavePredictionResult {
  startDate: string;
  endDate: string;
  leaveType: LeaveType;
  totalDays: number;
  workingDaysAffected: number;
  totalClassesAffected: number;
  currentOverallPercentage: number;
  projectedOverallPercentage: number;
  overallChange: number;
  riskLevel: LeaveRiskLevel;
  riskSummary: string;
  entersDangerZone: boolean;
  recovery90Possible: boolean;
  affectedClassesList: {
    date: string;
    day: DayOfWeek;
    period: number;
    startTime: string;
    endTime: string;
    subjectCode: string;
    subjectName: string;
  }[];
  subjectImpacts: {
    subjectCode: string;
    subjectName: string;
    classesAffected: number;
    currentConducted: number;
    currentAttended: number;
    currentPercentage: number;
    projectedConducted: number;
    projectedAttended: number;
    projectedPercentage: number;
    change: number;
    statusAfter: 'OPTIMAL' | 'SAFE' | 'WARNING' | 'CRITICAL' | 'DETENTION';
    remainingAfterLeave: number;
    recoveryTo75: {
      possible: boolean;
      needed: number;
      outOfRemaining: number;
      statement: string;
    };
    recoveryTo90: {
      possible: boolean;
      needed: number;
      outOfRemaining: number;
      statement: string;
    };
  }[];
}

export interface SaferLeaveWindow {
  startDate: string;
  endDate: string;
  daysCount: number;
  dateLabel: string;
  classesAffected: number;
  highRiskSubjectsAffected: number;
  projectedOverallAttendance: number;
  overallDrop: number;
  riskLevel: LeaveRiskLevel;
  affectedSubjectsSummary: {
    subjectCode: string;
    subjectName: string;
    count: number;
  }[];
  reason: string;
}

export type AppPortalMode =
  | 'role_selection'
  | 'student_login'
  | 'staff_login'
  | 'student_portal'
  | 'staff_portal'
  | 'qr_session';

export interface StaffAssignedClass {
  assignmentId: string;
  sectionId: string;
  sectionName: string;
  subjectCode: string;
  subjectName: string;
  subjectSlot: string;
  type: PeriodType;
}

export interface StaffProfile {
  staffId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  assignedClasses: StaffAssignedClass[];
}

export type RegisterEntryStatus =
  | 'present'
  | 'absent'
  | 'od'
  | 'medical'
  | 'approved_leave'
  | 'not_marked';

export interface RosterStudent {
  studentId: string;
  rollNo: string;
  registerNumber: string;
  name: string;
  sectionId: string;
  email: string;
  baseConductedBySubject: Record<string, number>;
  baseAttendedBySubject: Record<string, number>;
  baseOdBySubject: Record<string, number>;
  baseMedicalBySubject: Record<string, number>;
}

export interface QrAttendanceSession {
  sessionId: string;
  staffId: string;
  staffName: string;
  sectionId: string;
  sectionName: string;
  subjectCode: string;
  subjectName: string;
  date: string; // YYYY-MM-DD
  period: number;
  startTime: string;
  endTime: string;
  createdAt: number;
  expiresAt: number;
  submittedStudentIds: string[];
}

