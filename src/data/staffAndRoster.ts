import {
  InitialSubjectAttendance,
  RosterStudent,
  StaffProfile,
  StudentProfile,
} from '../types/attendance';
import {
  SECTIONS_LIST,
  getInitialSubjectAttendanceForSection,
} from './timetables';

export const STAFF_PROFILES: StaffProfile[] = [
  {
    staffId: 'STAFF-101',
    name: 'Dr. S. Karthikeyan',
    email: 'karthikeyan@drngpit.ac.in',
    department: 'Electronics & Communication Engineering',
    designation: 'Professor & Class Advisor',
    assignedClasses: [
      {
        assignmentId: 'ASG-1',
        sectionId: 'IV-ECE-A',
        sectionName: 'IV ECE - A',
        subjectCode: '22EC701',
        subjectName: 'High Frequency Communication & RF Systems',
        subjectSlot: 'Slot A',
        type: 'lecture',
      },
      {
        assignmentId: 'ASG-2',
        sectionId: 'IV-ECE-A',
        sectionName: 'IV ECE - A',
        subjectCode: '22EC703',
        subjectName: 'Embedded & Real-Time Operating Systems',
        subjectSlot: 'Slot C',
        type: 'lecture',
      },
      {
        assignmentId: 'ASG-3',
        sectionId: 'II-CSE-A',
        sectionName: 'II CSE - A',
        subjectCode: '22CS301',
        subjectName: 'Data Structures',
        subjectSlot: 'Slot A',
        type: 'lecture',
      },
      {
        assignmentId: 'ASG-4',
        sectionId: 'III-CSE-A',
        sectionName: 'III CSE - A',
        subjectCode: '22CS502',
        subjectName: 'Database Management Systems (DBMS)',
        subjectSlot: 'Slot B',
        type: 'lecture',
      },
      {
        assignmentId: 'ASG-5',
        sectionId: 'III-ECE-A',
        sectionName: 'III ECE - A',
        subjectCode: '22EC501',
        subjectName: 'Digital Signal Processing',
        subjectSlot: 'Slot A',
        type: 'lecture',
      },
      {
        assignmentId: 'ASG-6',
        sectionId: 'IV-ECE-B',
        sectionName: 'IV ECE - B',
        subjectCode: '22EC701',
        subjectName: 'High Frequency Communication & RF Systems',
        subjectSlot: 'Slot A',
        type: 'lecture',
      },
    ],
  },
  {
    staffId: 'STAFF-102',
    name: 'Prof. M. Vijayalakshmi',
    email: 'vijayalakshmi@drngpit.ac.in',
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor',
    assignedClasses: [
      {
        assignmentId: 'ASG-7',
        sectionId: 'II-CSE-A',
        sectionName: 'II CSE - A',
        subjectCode: '22CS301',
        subjectName: 'Data Structures',
        subjectSlot: 'Slot A',
        type: 'lecture',
      },
      {
        assignmentId: 'ASG-8',
        sectionId: 'II-CSE-A',
        sectionName: 'II CSE - A',
        subjectCode: '22CS302',
        subjectName: 'Database Management Systems (DBMS)',
        subjectSlot: 'Slot D',
        type: 'lecture',
      },
      {
        assignmentId: 'ASG-9',
        sectionId: 'III-ECE-DS',
        sectionName: 'III ECE - DS',
        subjectCode: '22DS501',
        subjectName: 'Foundations of Data Science & Analytics',
        subjectSlot: 'Slot B',
        type: 'lecture',
      },
      {
        assignmentId: 'ASG-10',
        sectionId: 'IV-ECE-A',
        sectionName: 'IV ECE - A',
        subjectCode: '22EC702',
        subjectName: 'Optical & Microwave Engineering',
        subjectSlot: 'Slot B',
        type: 'lecture',
      },
    ],
  },
];

const FIRST_NAMES = [
  'Aadhavan', 'Abhinaya', 'Adithya', 'Akshaya', 'Ananya', 'Arjun', 'Ashwin', 'Bhavani',
  'Charan', 'Deepika', 'Dhanush', 'Divya', 'Ezhil', 'Gautham', 'Gayathri', 'Harini',
  'Hariharan', 'Indhuja', 'ishwarya', 'Jagan', 'Janani', 'Karthik', 'Kavya', 'Keerthana',
  'Kishore', 'Lavanya', 'Lokesh', 'Madhavan', 'Meenakshi', 'Mithun', 'Monisha', 'Nandhini',
  'Naveen', 'Nithya', 'Oviya', 'Pavithra', 'Pranav', 'Praveen', 'Priyadharshini', 'Rahul',
  'Rakshitha', 'Ranjith', 'Revathi', 'Rohit', 'Sabari', 'Sahana', 'Sanjay', 'Santhosh',
  'Saranya', 'Sathish', 'Shalini', 'Shruti', 'Siddharth', 'Sneha', 'Sowmiya', 'Srinivasan',
  'Subash', 'Swathi', 'Tharun', 'Varun',
];

const LAST_INITIALS = ['K', 'S', 'R', 'M', 'V', 'P', 'T', 'N', 'B', 'G'];

export function buildRosterForSection(
  sectionId: string,
  activeStudent: StudentProfile,
  activeStudentInitials: InitialSubjectAttendance[]
): RosterStudent[] {
  const sectionSubjects = getInitialSubjectAttendanceForSection(sectionId);
  const totalCount = 60;
  const students: RosterStudent[] = [];

  // Roll 01: If the active student belongs to this section, place them at Roll 01 so any staff/student change is immediately visible!
  const isActiveStudentInSection = activeStudent.sectionId === sectionId;

  for (let i = 0; i < totalCount; i++) {
    const rollNum = String(i + 1).padStart(2, '0');
    if (i === 0 && isActiveStudentInSection) {
      const baseCond: Record<string, number> = {};
      const baseAtt: Record<string, number> = {};
      const baseOd: Record<string, number> = {};
      const baseMed: Record<string, number> = {};

      for (const s of activeStudentInitials) {
        baseCond[s.subjectCode] = s.initialConducted;
        baseAtt[s.subjectCode] = s.initialAttended;
        baseOd[s.subjectCode] = s.initialOd || 0;
        baseMed[s.subjectCode] = s.initialMedical || 0;
      }

      students.push({
        studentId: activeStudent.studentId,
        rollNo: rollNum,
        registerNumber: activeStudent.registerNumber,
        name: `${activeStudent.name} (You)`,
        sectionId,
        email: activeStudent.email,
        baseConductedBySubject: baseCond,
        baseAttendedBySubject: baseAtt,
        baseOdBySubject: baseOd,
        baseMedicalBySubject: baseMed,
      });
      continue;
    }

    const fName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lInit = LAST_INITIALS[(i * 3) % LAST_INITIALS.length];
    const regPrefix = sectionId.includes('CSE') ? '710723104' : '710723106';
    const regNo = `${regPrefix}${String(i + 1).padStart(3, '0')}`;
    const stuId = `STU-${sectionId}-${rollNum}`;

    const baseCond: Record<string, number> = {};
    const baseAtt: Record<string, number> = {};
    const baseOd: Record<string, number> = {};
    const baseMed: Record<string, number> = {};

    // Deterministic variety of attendance levels (SAFE, WARNING, DANGER, CRITICAL)
    for (let sIdx = 0; sIdx < sectionSubjects.length; sIdx++) {
      const sub = sectionSubjects[sIdx];
      const cond = sub.initialConducted;
      let ratio = 0.91;
      if (i % 13 === 4) ratio = 0.59; // CRITICAL (<65%)
      else if (i % 9 === 2) ratio = 0.71; // DANGER (<75%)
      else if (i % 5 === 1) ratio = 0.81; // WARNING (75%-89%)
      else ratio = 0.91 + ((i + sIdx) % 8) * 0.01; // SAFE (90%+)

      const att = Math.min(cond, Math.max(1, Math.round(cond * ratio)));
      baseCond[sub.subjectCode] = cond;
      baseAtt[sub.subjectCode] = att;
      baseOd[sub.subjectCode] = 0;
      baseMed[sub.subjectCode] = 0;
    }

    students.push({
      studentId: stuId,
      rollNo: rollNum,
      registerNumber: regNo,
      name: `${fName} ${lInit}`,
      sectionId,
      email: `${regNo.toLowerCase()}@drngpit.ac.in`,
      baseConductedBySubject: baseCond,
      baseAttendedBySubject: baseAtt,
      baseOdBySubject: baseOd,
      baseMedicalBySubject: baseMed,
    });
  }

  return students;
}

export function getAllStaffAssignableClasses() {
  const all: StaffProfile['assignedClasses'] = [];
  for (const sec of SECTIONS_LIST) {
    const subs = getInitialSubjectAttendanceForSection(sec.sectionId);
    for (const s of subs) {
      all.push({
        assignmentId: `${sec.sectionId}-${s.subjectCode}`,
        sectionId: sec.sectionId,
        sectionName: sec.sectionName,
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        subjectSlot: s.subjectSlot,
        type: s.type,
      });
    }
  }
  return all;
}

const DEFAULT_PRIMARY_STUDENT: StudentProfile = {
  studentId: 'STU-2026-140',
  name: 'Aravind Krishnan',
  registerNumber: '710723106014',
  department: 'Electronics & Communication Engineering',
  year: 'IV Year',
  sectionId: 'IV-ECE-A',
  email: '25cs140@drngpit.ac.in',
};

/**
 * Strictly validates that a student exists in the college database for the given section,
 * matching their Register Number / Student ID / Email and Name.
 */
export function authenticateStudentInDatabase(
  nameInput: string,
  regNoInput: string,
  sectionId: string,
  passwordInput: string,
  currentStudentProfile?: StudentProfile
): { ok: true; student: StudentProfile } | { ok: false; error: string } {
  const cleanName = nameInput.trim().toLowerCase();
  const cleanReg = regNoInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  if (!cleanName || !cleanReg) {
    return {
      ok: false,
      error: 'Please enter both your full Name and Register Number.',
    };
  }

  if (!cleanPass || cleanPass.length < 4) {
    return {
      ok: false,
      error: 'Invalid password. Please enter your registered student password.',
    };
  }

  const secMeta = SECTIONS_LIST.find((s) => s.sectionId === sectionId);
  if (!secMeta) {
    return {
      ok: false,
      error: 'Selected class section does not exist in the college database.',
    };
  }

  // Build the official 60-student database roster for this section
  const primarySeed = currentStudentProfile || DEFAULT_PRIMARY_STUDENT;
  const sectionInitials = getInitialSubjectAttendanceForSection(sectionId);
  const sectionRoster = buildRosterForSection(
    sectionId,
    primarySeed,
    sectionInitials
  );

  // Also ensure the default primary student record is always in the lookup list
  const candidateRecords: {
    studentId: string;
    name: string;
    registerNumber: string;
    email: string;
    sectionId: string;
  }[] = [
    {
      studentId: DEFAULT_PRIMARY_STUDENT.studentId,
      name: DEFAULT_PRIMARY_STUDENT.name,
      registerNumber: DEFAULT_PRIMARY_STUDENT.registerNumber,
      email: DEFAULT_PRIMARY_STUDENT.email,
      sectionId: DEFAULT_PRIMARY_STUDENT.sectionId,
    },
    ...sectionRoster.map((r) => ({
      studentId: r.studentId,
      name: r.name.replace(/\s*\(You\)$/i, '').trim(),
      registerNumber: r.registerNumber,
      email: r.email,
      sectionId: r.sectionId,
    })),
  ];

  // Find a student in the database matching Register Number, Student ID, or Email
  const matchedByReg = candidateRecords.find(
    (rec) =>
      rec.sectionId === sectionId &&
      (rec.registerNumber.toLowerCase() === cleanReg ||
        rec.studentId.toLowerCase() === cleanReg ||
        rec.email.toLowerCase() === cleanReg)
  );

  if (!matchedByReg) {
    // Check if the register number exists in a different section to give a helpful database error
    for (const otherSec of SECTIONS_LIST) {
      if (otherSec.sectionId === sectionId) continue;
      const otherRoster = buildRosterForSection(
        otherSec.sectionId,
        primarySeed,
        getInitialSubjectAttendanceForSection(otherSec.sectionId)
      );
      const foundInOther = otherRoster.find(
        (r) =>
          r.registerNumber.toLowerCase() === cleanReg ||
          r.studentId.toLowerCase() === cleanReg ||
          r.email.toLowerCase() === cleanReg
      );
      if (
        foundInOther ||
        (otherSec.sectionId === DEFAULT_PRIMARY_STUDENT.sectionId &&
          (DEFAULT_PRIMARY_STUDENT.registerNumber.toLowerCase() === cleanReg ||
            DEFAULT_PRIMARY_STUDENT.email.toLowerCase() === cleanReg))
      ) {
        return {
          ok: false,
          error: `Access Denied: Register Number "${regNoInput.trim()}" is registered in section ${otherSec.sectionName}, not ${secMeta.sectionName}.`,
        };
      }
    }

    return {
      ok: false,
      error: `Access Denied: Student with Register Number / ID "${regNoInput.trim()}" was not found in the college database.`,
    };
  }

  // Verify the student's name matches the database record
  const dbNameLower = matchedByReg.name.toLowerCase();
  if (dbNameLower !== cleanName) {
    return {
      ok: false,
      error: `Access Denied: Name "${nameInput.trim()}" does not match the database record for Register Number ${matchedByReg.registerNumber}.`,
    };
  }

  return {
    ok: true,
    student: {
      studentId: matchedByReg.studentId,
      name: matchedByReg.name,
      registerNumber: matchedByReg.registerNumber,
      department: secMeta.department,
      year: secMeta.year,
      sectionId: secMeta.sectionId,
      email: matchedByReg.email,
    },
  };
}

/**
 * Strictly validates that a Staff member exists in the faculty database (`STAFF_PROFILES`)
 * by exact Staff ID or official Email. Never falls back to a default staff profile.
 */
export function authenticateStaffInDatabase(
  staffIdOrEmailInput: string,
  passwordInput: string
): { ok: true; staff: StaffProfile } | { ok: false; error: string } {
  const cleanId = staffIdOrEmailInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  if (!cleanId) {
    return {
      ok: false,
      error: 'Please enter your Staff ID or official Faculty Email.',
    };
  }

  if (!cleanPass || cleanPass.length < 4) {
    return {
      ok: false,
      error: 'Invalid password. Please enter your faculty password.',
    };
  };

  // Exact match on staffId or email only — no fallback!
  const matched = STAFF_PROFILES.find(
    (s) =>
      s.staffId.toLowerCase() === cleanId || s.email.toLowerCase() === cleanId
  );

  if (!matched) {
    return {
      ok: false,
      error: `Access Denied: "${staffIdOrEmailInput.trim()}" is not registered in the faculty database. Only authorized staff members can log in.`,
    };
  }

  return {
    ok: true,
    staff: matched,
  };
}
