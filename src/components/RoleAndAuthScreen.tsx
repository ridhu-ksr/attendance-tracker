import React, { useState } from 'react';
import { ArrowLeft, GraduationCap, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import {
  AppPortalMode,
  StaffProfile,
  StudentProfile,
} from '../types/attendance';
import { SECTIONS_LIST } from '../data/timetables';
import {
  authenticateStaffInDatabase,
  authenticateStudentInDatabase,
  STAFF_PROFILES,
} from '../data/staffAndRoster';
import {
  GlassButton,
  GlassCard,
  GlassInput,
  GlassSelect,
} from './glass/GlassComponents';

interface RoleAndAuthScreenProps {
  mode: AppPortalMode;
  studentProfile: StudentProfile;
  onSelectMode: (next: AppPortalMode) => void;
  onStudentLoginSuccess: (updatedStudent: StudentProfile) => void;
  onStaffLoginSuccess: (staff: StaffProfile) => void;
}

export const RoleAndAuthScreen: React.FC<RoleAndAuthScreenProps> = ({
  mode,
  studentProfile,
  onSelectMode,
  onStudentLoginSuccess,
  onStaffLoginSuccess,
}) => {
  // Student Login State
  const [stuName, setStuName] = useState(studentProfile.name);
  const [stuRegNo, setStuRegNo] = useState(studentProfile.registerNumber);
  const [stuSection, setStuSection] = useState(studentProfile.sectionId);
  const [stuPassword, setStuPassword] = useState('••••••••');
  const [authError, setAuthError] = useState('');

  // Staff Login State
  const [staffIdInput, setStaffIdInput] = useState(STAFF_PROFILES[0].email);
  const [staffPassword, setStaffPassword] = useState('••••••••');

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const result = authenticateStudentInDatabase(
      stuName,
      stuRegNo,
      stuSection,
      stuPassword,
      studentProfile
    );
    if (result.ok === false) {
      setAuthError(result.error);
      return;
    }
    onStudentLoginSuccess(result.student);
  };

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const result = authenticateStaffInDatabase(staffIdInput, staffPassword);
    if (result.ok === false) {
      setAuthError(result.error);
      return;
    }
    onStaffLoginSuccess(result.staff);
  };

  // 1. FIRST SCREEN — ROLE SELECTION
  if (mode === 'role_selection') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-start sm:justify-center px-4 py-8 sm:py-12 relative z-10 overflow-y-auto">
        <div className="max-w-4xl w-full text-center space-y-2.5 mb-6 sm:mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-3xl bg-[#1B3A6B] text-white font-bold text-xl sm:text-2xl shadow-[0_10px_28px_rgba(27,58,107,0.28)] mb-1">
            IQ
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-[#0D1B2A] tracking-tight">
            AttendIQ
          </h1>
          <p className="text-sm sm:text-lg font-medium text-[#1B3A6B]">
            Smart Attendance Management System
          </p>
          <p className="text-xs sm:text-sm text-[#3D5A80] pt-1">
            How would you like to continue?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 max-w-3xl w-full pb-8">
          {/* STUDENT CARD */}
          <GlassCard
            variant="elevated"
            hover
            onClick={() => {
              setAuthError('');
              onSelectMode('student_login');
            }}
            className="flex flex-col items-center text-center p-6 sm:p-10 justify-between"
          >
            <div className="space-y-3 sm:space-y-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-[#E8F1FA] border border-[#A8C5E0] flex items-center justify-center text-3xl sm:text-4xl shadow-inner">
                👨‍🎓
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0D1B2A] tracking-wide">
                STUDENT
              </h2>
              <p className="text-xs sm:text-sm text-[#3D5A80] leading-relaxed max-w-xs mx-auto">
                Manage your attendance, leaves and attendance plan
              </p>
            </div>

            <div className="w-full pt-6 sm:pt-8">
              <GlassButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setAuthError('');
                  onSelectMode('student_login');
                }}
              >
                Continue
              </GlassButton>
            </div>
          </GlassCard>

          {/* STAFF CARD */}
          <GlassCard
            variant="elevated"
            hover
            onClick={() => {
              setAuthError('');
              onSelectMode('staff_login');
            }}
            className="flex flex-col items-center text-center p-6 sm:p-10 justify-between"
          >
            <div className="space-y-3 sm:space-y-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-[#E8F1FA] border border-[#A8C5E0] flex items-center justify-center text-3xl sm:text-4xl shadow-inner">
                👩‍🏫
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0D1B2A] tracking-wide">
                STAFF
              </h2>
              <p className="text-xs sm:text-sm text-[#3D5A80] leading-relaxed max-w-xs mx-auto">
                Manage classes, attendance and student records
              </p>
            </div>

            <div className="w-full pt-6 sm:pt-8">
              <GlassButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setAuthError('');
                  onSelectMode('staff_login');
                }}
              >
                Continue
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // 2. STUDENT LOGIN SCREEN
  if (mode === 'student_login') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-start sm:justify-center px-4 py-8 sm:py-12 relative z-10 overflow-y-auto">
        <div className="max-w-md w-full space-y-5 pb-8">
          <button
            onClick={() => onSelectMode('role_selection')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#1B3A6B] hover:text-[#0D1B2A] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Role Selection
          </button>

          <GlassCard variant="elevated" className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-[#CDE1F2]">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F1FA] border border-[#A8C5E0] flex items-center justify-center text-2xl">
                👨🎓
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#0D1B2A]">Student Login</h2>
                <p className="text-xs text-[#3D5A80]">
                  Sign in to access your Student Attendance & Leave Portal
                </p>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                {authError}
              </div>
            )}

            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <GlassInput
                label="Student Name"
                value={stuName}
                onChange={(e) => setStuName(e.target.value)}
                placeholder="Aravind Krishnan"
              />
              <GlassInput
                label="Register Number / Student ID"
                value={stuRegNo}
                onChange={(e) => setStuRegNo(e.target.value)}
                placeholder="710723106014"
              />
              <GlassSelect
                label="Class Section"
                value={stuSection}
                onChange={(e) => setStuSection(e.target.value)}
              >
                {SECTIONS_LIST.map((sec) => (
                  <option key={sec.sectionId} value={sec.sectionId}>
                    {sec.sectionName} — {sec.department}
                  </option>
                ))}
              </GlassSelect>
              <GlassInput
                type="password"
                label="Password"
                value={stuPassword}
                onChange={(e) => setStuPassword(e.target.value)}
              />

              <GlassButton
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
              >
                <GraduationCap className="w-4 h-4" />
                Login to Student Portal
              </GlassButton>
            </form>
          </GlassCard>
        </div>
      </div>
    );
  }

  // 3. STAFF LOGIN SCREEN
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative z-10">
      <div className="max-w-md w-full space-y-6">
        <button
          onClick={() => onSelectMode('role_selection')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#1B3A6B] hover:text-[#0D1B2A] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Role Selection
        </button>

        <GlassCard variant="elevated" className="p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[#CDE1F2]">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F1FA] border border-[#A8C5E0] flex items-center justify-center text-2xl">
              👩🏫
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0D1B2A]">Staff Login</h2>
              <p className="text-xs text-[#3D5A80]">
                Faculty authentication for class registers & QR sessions
              </p>
            </div>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              {authError}
            </div>
          )}

          <form onSubmit={handleStaffSubmit} className="space-y-4">
            <GlassInput
              label="Staff ID / Email"
              value={staffIdInput}
              onChange={(e) => setStaffIdInput(e.target.value)}
              placeholder="karthikeyan@drngpit.ac.in or STAFF-101"
            />
            <GlassInput
              type="password"
              label="Password"
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
            />

            <GlassButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
            >
              <Lock className="w-4 h-4" />
              Login
            </GlassButton>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};
