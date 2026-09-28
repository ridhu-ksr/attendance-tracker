import React, { useState } from 'react';
import { Calculator, Sliders, Sparkles } from 'lucide-react';
import {
  AttendanceSettings,
  OverallAttendanceSummary,
  TimetableSlot,
} from '../types/attendance';
import {
  addDaysToIso,
  calculateAttendance,
  calculateLeaveImpact,
  calculateMaximumMisses,
  calculateProjectedAttendance,
  calculateRecovery,
  calculateRequiredClasses,
  getTodayIsoDate,
} from '../engine/attendanceEngine';
import {
  GlassButton,
  GlassCard,
  GlassInput,
  GlassProgress,
  GlassSelect,
} from './glass/GlassComponents';

interface WhatIfSimulatorViewProps {
  timetable: TimetableSlot[];
  summary: OverallAttendanceSummary;
  settings: AttendanceSettings;
}

type ScenarioPreset =
  | 'miss_1'
  | 'miss_2'
  | 'miss_day'
  | 'leave_3d'
  | 'attend_all'
  | 'custom';

export const WhatIfSimulatorView: React.FC<WhatIfSimulatorViewProps> = ({
  timetable,
  summary,
  settings,
}) => {
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>(
    summary.subjects[0]?.subjectCode || ''
  );
  const [preset, setPreset] = useState<ScenarioPreset>('miss_2');
  const [customMissCount, setCustomMissCount] = useState<number>(3);
  const [customAttendCount, setCustomAttendCount] = useState<number>(0);

  // Classic Quick Attendance Calculator state (retained & upgraded)
  const [calcConducted, setCalcConducted] = useState<number>(summary.effectiveConducted || 250);
  const [calcAttended, setCalcAttended] = useState<number>(summary.effectiveAttended || 215);
  const [calcRemaining, setCalcRemaining] = useState<number>(summary.remainingUntilDeadline || 45);

  const selectedSubject =
    summary.subjects.find((s) => s.subjectCode === selectedSubjectCode) ||
    summary.subjects[0];

  // Calculate subject-level What-If outcome
  const getSubjectSimulation = () => {
    if (!selectedSubject) return null;

    let futureConducted = 0;
    let futureAttended = 0;
    let scenarioTitle = '';

    if (preset === 'miss_1') {
      futureConducted = 1;
      futureAttended = 0;
      scenarioTitle = `WHAT IF I MISS NEXT 1 ${selectedSubject.subjectName.toUpperCase()} CLASS?`;
    } else if (preset === 'miss_2') {
      futureConducted = 2;
      futureAttended = 0;
      scenarioTitle = `WHAT IF I MISS 2 ${selectedSubject.subjectName.toUpperCase()} CLASSES?`;
    } else if (preset === 'attend_all') {
      futureConducted = selectedSubject.remainingUntilDeadline;
      futureAttended = selectedSubject.remainingUntilDeadline;
      scenarioTitle = `WHAT IF I ATTEND EVERY REMAINING ${selectedSubject.subjectName.toUpperCase()} CLASS (${selectedSubject.remainingUntilDeadline})?`;
    } else if (preset === 'custom') {
      futureConducted = customMissCount + customAttendCount;
      futureAttended = customAttendCount;
      scenarioTitle = `WHAT IF I MISS ${customMissCount} & ATTEND ${customAttendCount} ${selectedSubject.subjectName.toUpperCase()} CLASSES?`;
    } else if (preset === 'miss_day') {
      const tomorrow = addDaysToIso(getTodayIsoDate(), 1);
      const impact = calculateLeaveImpact(
        timetable,
        summary,
        settings,
        tomorrow,
        tomorrow,
        'Personal Leave'
      );
      const subImp = impact.subjectImpacts.find(
        (s) => s.subjectCode === selectedSubject.subjectCode
      );
      futureConducted = Math.max(1, subImp?.classesAffected || 1);
      futureAttended = 0;
      scenarioTitle = `WHAT IF I MISS A FULL DAY (${futureConducted} ${selectedSubject.subjectName} period(s))?`;
    } else if (preset === 'leave_3d') {
      const sDate = addDaysToIso(getTodayIsoDate(), 1);
      const eDate = addDaysToIso(getTodayIsoDate(), 3);
      const impact = calculateLeaveImpact(
        timetable,
        summary,
        settings,
        sDate,
        eDate,
        'Personal Leave'
      );
      const subImp = impact.subjectImpacts.find(
        (s) => s.subjectCode === selectedSubject.subjectCode
      );
      futureConducted = Math.max(2, subImp?.classesAffected || 2);
      futureAttended = 0;
      scenarioTitle = `WHAT IF I TAKE A 3-DAY LEAVE (${futureConducted} ${selectedSubject.subjectName} period(s))?`;
    }

    const projectedPct = calculateProjectedAttendance(
      selectedSubject.effectiveAttended,
      selectedSubject.effectiveConducted,
      futureAttended,
      futureConducted
    );

    const remainingAfter = Math.max(
      0,
      selectedSubject.remainingUntilDeadline - futureConducted
    );

    const recovery90 = calculateRecovery(
      selectedSubject.effectiveAttended + futureAttended,
      selectedSubject.effectiveConducted + futureConducted,
      remainingAfter,
      settings.targetThreshold,
      selectedSubject.subjectName
    );

    const recovery75 = calculateRecovery(
      selectedSubject.effectiveAttended + futureAttended,
      selectedSubject.effectiveConducted + futureConducted,
      remainingAfter,
      settings.dangerThreshold,
      selectedSubject.subjectName
    );

    let statusLabel = 'SAFE';
    if (!recovery75.possible) statusLabel = 'IRREVERSIBLE DETENTION';
    else if (projectedPct < settings.dangerThreshold) statusLabel = 'CRITICAL (BELOW 75%)';
    else if (projectedPct < settings.dangerThreshold + 5) statusLabel = 'WARNING';
    else if (projectedPct >= settings.targetThreshold) statusLabel = 'OPTIMAL (90%+)';

    return {
      scenarioTitle,
      currentPct: selectedSubject.percentage,
      projectedPct,
      delta: Math.round((projectedPct - selectedSubject.percentage) * 10) / 10,
      statusLabel,
      recovery75,
      recovery90,
      futureConducted,
      futureAttended,
      remainingAfter,
    };
  };

  const simResult = getSubjectSimulation();

  // Standalone Calculator Results
  const standalonePct = calculateAttendance(calcAttended, calcConducted);
  const standaloneReq75 = calculateRequiredClasses(
    calcAttended,
    calcConducted,
    calcRemaining,
    settings.dangerThreshold
  );
  const standaloneReq90 = calculateRequiredClasses(
    calcAttended,
    calcConducted,
    calcRemaining,
    settings.targetThreshold
  );
  const standaloneMiss75 = calculateMaximumMisses(
    calcAttended,
    calcConducted,
    calcRemaining,
    settings.dangerThreshold
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: What-If Scenario Controls */}
        <GlassCard variant="elevated" className="lg:col-span-5 space-y-5">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#1B3A6B]" />
            <div>
              <h2 className="text-lg font-bold text-[#0D1B2A]">
                What-If Attendance Simulator
              </h2>
              <p className="text-xs text-[#3D5A80]">
                Test hypothetical absences or streaks before they happen
              </p>
            </div>
          </div>

          <GlassSelect
            label="Select Subject to Simulate"
            value={selectedSubject?.subjectCode || ''}
            onChange={(e) => setSelectedSubjectCode(e.target.value)}
          >
            {summary.subjects.map((s) => (
              <option key={s.subjectCode} value={s.subjectCode}>
                {s.subjectName} ({s.percentage}%)
              </option>
            ))}
          </GlassSelect>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#1B3A6B]">
              Choose Simulation Scenario
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'miss_1', label: 'Miss Next Class' },
                { id: 'miss_2', label: 'Miss Next 2 Classes' },
                { id: 'miss_day', label: 'Miss a Full Day' },
                { id: 'leave_3d', label: 'Take 3-Day Leave' },
                { id: 'attend_all', label: 'Attend Every Remaining' },
                { id: 'custom', label: 'Custom Absence Count' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPreset(item.id as ScenarioPreset)}
                  className={`p-3 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                    preset === item.id
                      ? 'bg-[#1B3A6B] text-white border-[#1B3A6B] shadow-sm'
                      : 'bg-white/70 text-[#0D1B2A] border-white hover:bg-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <GlassInput
                type="number"
                min={0}
                max={50}
                label="Classes to Miss"
                value={customMissCount}
                onChange={(e) => setCustomMissCount(Math.max(0, Number(e.target.value)))}
              />
              <GlassInput
                type="number"
                min={0}
                max={50}
                label="Classes to Attend"
                value={customAttendCount}
                onChange={(e) => setCustomAttendCount(Math.max(0, Number(e.target.value)))}
              />
            </div>
          )}
        </GlassCard>

        {/* Right: Simulation Output Card */}
        <GlassCard variant="elevated" className="lg:col-span-7 flex flex-col justify-between">
          {simResult && selectedSubject ? (
            <div className="space-y-6">
              <div className="pb-4 border-b border-[#CDE1F2]">
                <div className="text-xs font-semibold text-[#1B3A6B] tracking-wide">
                  SIMULATION RESULT
                </div>
                <h3 className="text-lg font-bold text-[#0D1B2A] mt-1">
                  {simResult.scenarioTitle}
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center p-5 rounded-2xl bg-[#E8F1FA]/85 border border-[#A8C5E0]">
                <div>
                  <div className="text-xs text-[#3D5A80]">Current</div>
                  <div className="font-mono-num text-2xl font-bold text-[#0D1B2A] mt-1">
                    {simResult.currentPct}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#3D5A80]">Projected</div>
                  <div className="font-mono-num text-2xl font-bold text-[#1B3A6B] mt-1">
                    {simResult.projectedPct}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#3D5A80]">Net Change</div>
                  <div
                    className={`font-mono-num text-2xl font-bold mt-1 ${
                      simResult.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {simResult.delta >= 0 ? `+${simResult.delta}%` : `${simResult.delta}%`}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#3D5A80]">Projected Progress</span>
                  <span className="font-bold text-[#0D1B2A]">
                    Status: {simResult.statusLabel}
                  </span>
                </div>
                <GlassProgress
                  value={simResult.projectedPct}
                  threshold={settings.dangerThreshold}
                  target={settings.targetThreshold}
                  heightClass="h-3.5"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/75 border border-white">
                  <div className="text-xs font-bold text-[#0D1B2A]">
                    Recovery for {settings.dangerThreshold}% Minimum
                  </div>
                  <p className="text-xs text-[#3D5A80] mt-1 leading-relaxed">
                    {simResult.recovery75.statement}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/75 border border-white">
                  <div className="text-xs font-bold text-[#1B3A6B]">
                    Recovery for {settings.targetThreshold}% Target
                  </div>
                  <p className="text-xs text-[#3D5A80] mt-1 leading-relaxed">
                    {simResult.recovery90.statement}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </GlassCard>
      </div>

      {/* Classic Instant Attendance Calculator (Retained & Integrated) */}
      <GlassCard variant="tint">
        <div className="flex items-center gap-2 mb-5">
          <Calculator className="w-5 h-5 text-[#1B3A6B]" />
          <div>
            <h3 className="text-base font-bold text-[#0D1B2A]">
              Quick Attendance & Bunk Calculator
            </h3>
            <p className="text-xs text-[#3D5A80]">
              Enter any custom conducted, attended, and remaining class numbers for instant math
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5 grid grid-cols-3 gap-3">
            <GlassInput
              type="number"
              min={1}
              label="Conducted"
              value={calcConducted}
              onChange={(e) => setCalcConducted(Math.max(1, Number(e.target.value)))}
            />
            <GlassInput
              type="number"
              min={0}
              max={calcConducted}
              label="Attended"
              value={calcAttended}
              onChange={(e) =>
                setCalcAttended(Math.max(0, Math.min(calcConducted, Number(e.target.value))))
              }
            />
            <GlassInput
              type="number"
              min={0}
              label="Remaining"
              value={calcRemaining}
              onChange={(e) => setCalcRemaining(Math.max(0, Number(e.target.value)))}
            />
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-white/80 border border-white">
              <div className="text-[11px] text-[#3D5A80]">Current %</div>
              <div className="font-mono-num text-lg font-bold text-[#0D1B2A] mt-0.5">
                {standalonePct}%
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/80 border border-white">
              <div className="text-[11px] text-[#3D5A80]">Need for {settings.dangerThreshold}%</div>
              <div className="font-mono-num text-lg font-bold text-[#1B3A6B] mt-0.5">
                {standaloneReq75.achievable
                  ? `${standaloneReq75.requiredToAttend}/${calcRemaining}`
                  : 'Impossible'}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/80 border border-white">
              <div className="text-[11px] text-[#3D5A80]">Need for {settings.targetThreshold}%</div>
              <div className="font-mono-num text-lg font-bold text-[#1B3A6B] mt-0.5">
                {standaloneReq90.achievable
                  ? `${standaloneReq90.requiredToAttend}/${calcRemaining}`
                  : 'Impossible'}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/80 border border-white">
              <div className="text-[11px] text-[#3D5A80]">Safe Misses ({settings.dangerThreshold}%)</div>
              <div className="font-mono-num text-lg font-bold text-emerald-700 mt-0.5">
                {standaloneMiss75} classes
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
