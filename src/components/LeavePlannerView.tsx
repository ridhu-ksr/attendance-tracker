import React, { useState, useMemo } from 'react';
import {
  ArrowDown,
  Calendar,
  Check,
  Edit3,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  AttendanceRecord,
  AttendanceSettings,
  LeavePredictionResult,
  LeaveRecord,
  LeaveType,
  OverallAttendanceSummary,
  TimetableSlot,
} from '../types/attendance';
import {
  addDaysToIso,
  calculateLeaveImpact,
  findSaferLeaveDates,
  formatShortDateRange,
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
import { GlassCalendar } from './glass/GlassCalendar';

interface LeavePlannerViewProps {
  timetable: TimetableSlot[];
  summary: OverallAttendanceSummary;
  settings: AttendanceSettings;
  leaves: LeaveRecord[];
  attendanceRecords: AttendanceRecord[];
  studentId: string;
  sectionId: string;
  onSaveLeave: (leave: LeaveRecord) => void;
  onDeleteLeave: (leaveId: string) => void;
  onUpdateSettings: (next: AttendanceSettings) => void;
}

export const LeavePlannerView: React.FC<LeavePlannerViewProps> = ({
  timetable,
  summary,
  settings,
  leaves,
  attendanceRecords,
  studentId,
  sectionId,
  onSaveLeave,
  onDeleteLeave,
  onUpdateSettings,
}) => {
  const todayIso = getTodayIsoDate();
  const defaultStart = addDaysToIso(todayIso, 2);
  const defaultEnd = addDaysToIso(todayIso, 4);

  const [leaveType, setLeaveType] = useState<LeaveType>('Personal Leave');
  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);
  const [reason, setReason] = useState<string>('');
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);

  const [prediction, setPrediction] = useState<LeavePredictionResult | null>(() =>
    calculateLeaveImpact(timetable, summary, settings, defaultStart, defaultEnd, 'Personal Leave')
  );

  // Smart Leave Recommendation state
  const [desiredDays, setDesiredDays] = useState<number>(2);
  const saferWindows = useMemo(
    () => findSaferLeaveDates(timetable, summary, settings, desiredDays, todayIso),
    [timetable, summary, settings, desiredDays, todayIso]
  );

  // Modal to inspect affected classes of a saved leave
  const [inspectingLeave, setInspectingLeave] = useState<LeaveRecord | null>(null);

  const handlePredict = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const safeEnd = endDate < startDate ? startDate : endDate;
    if (safeEnd !== endDate) setEndDate(safeEnd);
    const res = calculateLeaveImpact(
      timetable,
      summary,
      settings,
      startDate,
      safeEnd,
      leaveType
    );
    setPrediction(res);
  };

  const handleConfirmLeave = () => {
    if (!prediction) return;

    const record: LeaveRecord = {
      id: editingLeaveId || `lv-${Date.now()}`,
      studentId,
      section: sectionId,
      leaveType: prediction.leaveType,
      startDate: prediction.startDate,
      endDate: prediction.endDate,
      reason: reason.trim() || `${prediction.leaveType} (${formatShortDateRange(prediction.startDate, prediction.endDate)})`,
      totalClassesAffected: prediction.totalClassesAffected,
      projectedOverallAttendance: prediction.projectedOverallPercentage,
      riskLevel: prediction.riskLevel,
      createdAt: new Date().toISOString(),
      affectedBySubject: prediction.subjectImpacts
        .filter((s) => s.classesAffected > 0)
        .map((s) => ({
          subjectCode: s.subjectCode,
          subjectName: s.subjectName,
          classesCount: s.classesAffected,
          beforePercentage: s.currentPercentage,
          afterPercentage: s.projectedPercentage,
        })),
    };

    onSaveLeave(record);
    setEditingLeaveId(null);
    setReason('');
  };

  const handleEditLeave = (lv: LeaveRecord) => {
    setEditingLeaveId(lv.id);
    setLeaveType(lv.leaveType);
    setStartDate(lv.startDate);
    setEndDate(lv.endDate);
    setReason(lv.reason);
    const res = calculateLeaveImpact(
      timetable,
      summary,
      settings,
      lv.startDate,
      lv.endDate,
      lv.leaveType
    );
    setPrediction(res);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoadSaferWindow = (sDate: string, eDate: string) => {
    setStartDate(sDate);
    setEndDate(eDate);
    const res = calculateLeaveImpact(
      timetable,
      summary,
      settings,
      sDate,
      eDate,
      leaveType
    );
    setPrediction(res);
  };

  const affectedSubjectsInPrediction = prediction
    ? prediction.subjectImpacts.filter((s) => s.classesAffected > 0)
    : [];

  return (
    <div className="space-y-8">
      {/* Top Grid: Leave Planner Form + Leave Prediction Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Schedule Leave & OD/Medical Policy */}
        <div className="lg:col-span-5 space-y-6">
          <GlassCard variant="elevated">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#0D1B2A]">
                  {editingLeaveId ? 'Edit Scheduled Leave' : 'Schedule Future Leave'}
                </h2>
                <p className="text-xs text-[#3D5A80] mt-0.5">
                  Predict exact subject-by-subject impact before confirming
                </p>
              </div>
              {editingLeaveId && (
                <GlassButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingLeaveId(null)}
                >
                  Cancel Edit
                </GlassButton>
              )}
            </div>

            <form onSubmit={handlePredict} className="space-y-4">
              <GlassSelect
                label="Leave Type"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              >
                <option value="Personal Leave">Personal Leave</option>
                <option value="Medical Leave">Medical Leave</option>
                <option value="On-Duty">On-Duty (OD)</option>
                <option value="Other">Other</option>
              </GlassSelect>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <GlassInput
                  type="date"
                  label="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <GlassInput
                  type="date"
                  label="End Date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <GlassInput
                type="text"
                label="Reason (Optional)"
                placeholder="e.g., Family function, Hackathon OD, Medical checkup"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <GlassButton type="submit" variant="primary" className="flex-1">
                  Predict Leave Impact
                </GlassButton>
              </div>
            </form>
          </GlassCard>

          {/* OD / Medical Leave Policy Configuration (Section 17) */}
          <GlassCard variant="tint">
            <h3 className="text-sm font-bold text-[#0D1B2A]">
              College OD & Medical Leave Policy
            </h3>
            <p className="text-xs text-[#3D5A80] mt-0.5 mb-4">
              Configure how your institution treats approved On-Duty and Medical Leave
            </p>

            <div className="space-y-3">
              <GlassSelect
                label="On-Duty (OD) Calculation Policy"
                value={settings.odPolicy}
                onChange={(e) => {
                  const next = {
                    ...settings,
                    odPolicy: e.target.value as AttendanceSettings['odPolicy'],
                  };
                  onUpdateSettings(next);
                  if (prediction) {
                    setPrediction(
                      calculateLeaveImpact(
                        timetable,
                        summary,
                        next,
                        startDate,
                        endDate,
                        leaveType
                      )
                    );
                  }
                }}
              >
                <option value="policy_a">Policy A: Excluded from denominator</option>
                <option value="policy_b">Policy B: Counted as attended</option>
                <option value="policy_c">Policy C: Counted as absent</option>
              </GlassSelect>

              <GlassSelect
                label="Medical Leave Calculation Policy"
                value={settings.medicalPolicy}
                onChange={(e) => {
                  const next = {
                    ...settings,
                    medicalPolicy: e.target.value as AttendanceSettings['medicalPolicy'],
                  };
                  onUpdateSettings(next);
                  if (prediction) {
                    setPrediction(
                      calculateLeaveImpact(
                        timetable,
                        summary,
                        next,
                        startDate,
                        endDate,
                        leaveType
                      )
                    );
                  }
                }}
              >
                <option value="policy_a">Policy A: Excluded from denominator</option>
                <option value="policy_b">Policy B: Counted as attended</option>
                <option value="policy_c">Policy C: Counted as absent</option>
              </GlassSelect>
            </div>
          </GlassCard>
        </div>

        {/* Right: Leave Prediction Engine + Before/After Comparison + Safety Indicator */}
        <div className="lg:col-span-7 space-y-6">
          {prediction ? (
            <GlassCard variant="elevated" className="space-y-6">
              {/* Header & Leave Safety Indicator Box */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#CDE1F2]">
                <div>
                  <div className="text-xs font-medium text-[#3D5A80]">
                    Leave Impact Analysis · {formatShortDateRange(prediction.startDate, prediction.endDate)}
                  </div>
                  <h3 className="text-xl font-bold text-[#0D1B2A] mt-0.5">
                    {prediction.totalClassesAffected} Scheduled Classes Across{' '}
                    {prediction.workingDaysAffected} Working Day(s)
                  </h3>
                </div>

                {/* Safety Indicator Card */}
                <div
                  className={`px-4 py-3 rounded-2xl border text-right shrink-0 ${
                    prediction.riskLevel === 'RECOVERY IMPOSSIBLE' ||
                    prediction.riskLevel === 'HIGH RISK'
                      ? 'bg-red-50/90 border-red-300 text-red-900'
                      : prediction.riskLevel === 'LOW RISK'
                      ? 'bg-amber-50/90 border-amber-300 text-amber-900'
                      : 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center justify-end gap-1.5 text-xs font-bold">
                    {prediction.riskLevel === 'SAFE' ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <ShieldAlert className="w-4 h-4" />
                    )}
                    <span>{prediction.riskLevel}</span>
                  </div>
                  <div className="text-[11px] font-mono-num mt-0.5">
                    Overall: {prediction.currentOverallPercentage}% →{' '}
                    {prediction.projectedOverallPercentage}% (
                    {prediction.overallChange >= 0
                      ? `+${prediction.overallChange}%`
                      : `${prediction.overallChange}%`}
                    )
                  </div>
                </div>
              </div>

              {/* Leave Impact Summary Banner */}
              <div className="p-4 rounded-2xl bg-[#E8F1FA]/85 border border-[#A8C5E0]">
                <div className="grid grid-cols-3 gap-4 text-center pb-3 mb-3 border-b border-[#CDE1F2]">
                  <div>
                    <div className="text-xs text-[#3D5A80]">Current Overall</div>
                    <div className="font-mono-num text-xl font-bold text-[#0D1B2A]">
                      {prediction.currentOverallPercentage}%
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[11px] text-[#3D5A80] font-medium">
                      {prediction.totalDays}-Day {prediction.leaveType}
                    </span>
                    <ArrowDown className="w-4 h-4 text-[#1B3A6B] my-0.5" />
                    <span className="font-mono-num text-xs font-bold text-rose-700">
                      {prediction.overallChange >= 0
                        ? `+${prediction.overallChange}%`
                        : `${prediction.overallChange}%`}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-[#3D5A80]">Projected Overall</div>
                    <div className="font-mono-num text-xl font-bold text-[#1B3A6B]">
                      {prediction.projectedOverallPercentage}%
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[#0D1B2A] text-center font-medium">
                  {prediction.riskSummary}
                </p>
              </div>

              {/* Subject-by-Subject BEFORE vs AFTER Comparison */}
              <div>
                <h4 className="text-xs font-semibold text-[#3D5A80] mb-3">
                  Affected Subjects — Before vs After & Recovery Plan
                </h4>

                {affectedSubjectsInPrediction.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-white/60 text-sm text-[#3D5A80] text-center">
                    No classes are scheduled during the selected dates (Weekend / Off-day).
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {affectedSubjectsInPrediction.map((sub) => (
                      <div
                        key={sub.subjectCode}
                        className="p-4 rounded-2xl bg-white/75 border border-white space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-sm font-bold text-[#0D1B2A]">
                              {sub.subjectName}
                            </span>
                            <span className="text-xs text-[#3D5A80] ml-2 font-mono-num">
                              ({sub.subjectCode} · {sub.classesAffected} class
                              {sub.classesAffected > 1 ? 'es' : ''} affected)
                            </span>
                          </div>
                          <div className="font-mono-num text-xs font-bold">
                            <span className="text-[#3D5A80]">BEFORE {sub.currentPercentage}%</span>
                            <span className="mx-2 text-[#1B3A6B]">→</span>
                            <span
                              className={
                                sub.projectedPercentage < settings.dangerThreshold
                                  ? 'text-red-700'
                                  : 'text-[#0D1B2A]'
                              }
                            >
                              AFTER {sub.projectedPercentage}%
                            </span>
                            <span className="ml-2 text-rose-700">
                              ({sub.change >= 0 ? `+${sub.change}%` : `${sub.change}%`})
                            </span>
                          </div>
                        </div>

                        <GlassProgress
                          value={sub.projectedPercentage}
                          threshold={settings.dangerThreshold}
                          target={settings.targetThreshold}
                          heightClass="h-2.5"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#3D5A80] pt-1">
                          <span>Status: {sub.statusAfter}</span>
                          <span className="font-medium text-[#1B3A6B]">
                            Recovery: {sub.recoveryTo90.possible ? sub.recoveryTo90.statement : sub.recoveryTo75.statement}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm & Save Leave Button */}
              <div className="pt-3 border-t border-[#CDE1F2] flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[#3D5A80]">
                  Review the impact above before adding this leave to your schedule.
                </span>
                <GlassButton
                  variant="primary"
                  onClick={handleConfirmLeave}
                  disabled={prediction.totalClassesAffected === 0}
                >
                  <Check className="w-4 h-4" />
                  {editingLeaveId ? 'Update Scheduled Leave' : 'Confirm & Save Leave'}
                </GlassButton>
              </div>
            </GlassCard>
          ) : null}
        </div>
      </div>

      {/* Section 16: Smart Leave Recommendation ("Find Safer Leave Dates") */}
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1B3A6B]" />
              <h3 className="text-lg font-bold text-[#0D1B2A]">
                Find Safer Leave Dates
              </h3>
            </div>
            <p className="text-xs text-[#3D5A80] mt-0.5">
              Calculation-based timetable scan for upcoming windows with minimal high-risk subject overlap
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#1B3A6B]">Leave Duration:</span>
            {[1, 2, 3, 4].map((d) => (
              <button
                key={d}
                onClick={() => setDesiredDays(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  desiredDays === d
                    ? 'bg-[#1B3A6B] text-white'
                    : 'bg-white/70 text-[#0D1B2A] hover:bg-white'
                }`}
              >
                {d} {d === 1 ? 'Day' : 'Days'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {saferWindows.map((win) => (
            <div
              key={`${win.startDate}-${win.endDate}`}
              className="p-4 rounded-2xl bg-white/70 border border-white flex flex-col justify-between gap-3 glass-hover"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#0D1B2A]">{win.dateLabel}</span>
                  <span className="text-[11px] font-semibold text-[#1B3A6B]">
                    {win.riskLevel}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-[#3D5A80]">
                  <div>
                    Classes affected:{' '}
                    <span className="font-mono-num font-bold text-[#0D1B2A]">
                      {win.classesAffected}
                    </span>
                  </div>
                  <div>
                    Projected overall:{' '}
                    <span className="font-mono-num font-bold text-[#1B3A6B]">
                      {win.projectedOverallAttendance}%
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-[#3D5A80] mt-2 leading-relaxed">
                  {win.reason}
                </p>
              </div>

              <GlassButton
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => handleLoadSaferWindow(win.startDate, win.endDate)}
              >
                Preview Window
              </GlassButton>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Section 14: My Leave Schedule */}
      <GlassCard>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-[#0D1B2A]">My Leave Schedule</h3>
            <p className="text-xs text-[#3D5A80] mt-0.5">
              Manage upcoming and past leaves, inspect affected classes, or modify dates
            </p>
          </div>
          <span className="text-xs font-mono-num text-[#3D5A80]">
            {leaves.length} Recorded Leave(s)
          </span>
        </div>

        {leaves.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white/50 text-center text-sm text-[#3D5A80]">
            No leaves scheduled yet. Use the Leave Planner above to predict and save a leave window.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaves.map((lv) => (
              <div
                key={lv.id}
                className="p-5 rounded-2xl bg-white/75 border border-white flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-[#1B3A6B] uppercase tracking-wider">
                        {formatShortDateRange(lv.startDate, lv.endDate)}
                      </div>
                      <h4 className="text-base font-bold text-[#0D1B2A] mt-0.5">
                        {lv.leaveType}
                      </h4>
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        lv.riskLevel === 'HIGH RISK' || lv.riskLevel === 'RECOVERY IMPOSSIBLE'
                          ? 'text-red-700'
                          : lv.riskLevel === 'LOW RISK'
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {lv.riskLevel}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-[#3D5A80]">
                    <div>
                      <span className="font-mono-num font-bold text-[#0D1B2A]">
                        {lv.totalClassesAffected}
                      </span>{' '}
                      classes affected
                    </div>
                    <div>
                      Projected attendance:{' '}
                      <span className="font-mono-num font-bold text-[#1B3A6B]">
                        {lv.projectedOverallAttendance}%
                      </span>
                    </div>
                    {lv.reason && <div className="truncate">Reason: {lv.reason}</div>}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-[#CDE1F2]/70">
                  <GlassButton
                    size="sm"
                    variant="secondary"
                    onClick={() => setInspectingLeave(lv)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Impact
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="secondary"
                    onClick={() => handleEditLeave(lv)}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-red-700 hover:bg-red-50"
                    onClick={() => onDeleteLeave(lv.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Cancel
                  </GlassButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Section 15: Leave Calendar */}
      <GlassCalendar
        timetable={timetable}
        leaves={leaves}
        attendanceRecords={attendanceRecords}
        onSelectDateForLeave={(dt) => handleLoadSaferWindow(dt, dt)}
      />

      {/* Modal for Inspecting Saved Leave Affected Classes */}
      <GlassModal
        isOpen={Boolean(inspectingLeave)}
        onClose={() => setInspectingLeave(null)}
        title={
          inspectingLeave
            ? `${inspectingLeave.leaveType} (${formatShortDateRange(
                inspectingLeave.startDate,
                inspectingLeave.endDate
              )})`
            : 'Leave Details'
        }
        subtitle="Subject-wise attendance impact and affected classes"
      >
        {inspectingLeave && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#E8F1FA] flex items-center justify-between">
              <div>
                <div className="text-xs text-[#3D5A80]">Status</div>
                <div className="text-sm font-bold text-[#0D1B2A]">
                  {inspectingLeave.riskLevel}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#3D5A80]">Classes Affected</div>
                <div className="font-mono-num text-sm font-bold text-[#0D1B2A]">
                  {inspectingLeave.totalClassesAffected}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#3D5A80]">Projected Overall</div>
                <div className="font-mono-num text-sm font-bold text-[#1B3A6B]">
                  {inspectingLeave.projectedOverallAttendance}%
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {inspectingLeave.affectedBySubject.map((item) => (
                <div
                  key={item.subjectCode}
                  className="p-3 rounded-xl bg-white/80 border border-[#CDE1F2] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[#0D1B2A]">{item.subjectName}</div>
                    <div className="text-[#3D5A80] font-mono-num">
                      {item.subjectCode} · {item.classesCount} period(s)
                    </div>
                  </div>
                  <div className="font-mono-num font-bold text-[#1B3A6B]">
                    {item.beforePercentage}% → {item.afterPercentage}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassModal>
    </div>
  );
};
