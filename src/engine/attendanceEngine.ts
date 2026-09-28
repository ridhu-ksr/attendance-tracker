import {
  AttendanceRecord,
  AttendanceSettings,
  DayOfWeek,
  InitialSubjectAttendance,
  LeavePolicyMode,
  LeavePredictionResult,
  LeaveRiskLevel,
  LeaveType,
  OverallAttendanceSummary,
  SaferLeaveWindow,
  SubjectAttendanceMetrics,
  TimetableSlot,
} from '../types/attendance';

const DAY_NAMES: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function getDayOfWeekFromDateString(dateStr: string): DayOfWeek | 'Sunday' {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  const dayIdx = dt.getDay(); // 0 = Sunday, 1 = Monday ...
  if (dayIdx === 0) return 'Sunday';
  return DAY_NAMES[dayIdx - 1];
}

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayIsoDate(): string {
  return formatIsoDate(new Date());
}

export function addDaysToIso(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  dt.setDate(dt.getDate() + days);
  return formatIsoDate(dt);
}

export function formatReadableDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDateRange(startStr: string, endStr: string): string {
  const [y1, m1, d1] = startStr.split('-').map(Number);
  const [y2, m2, d2] = endStr.split('-').map(Number);
  const dt1 = new Date(y1, m1 - 1, d1, 12, 0, 0);
  const dt2 = new Date(y2, m2 - 1, d2, 12, 0, 0);
  const s1 = dt1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const s2 = dt2.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return startStr === endStr ? s1 : `${s1} – ${s2}`;
}

/**
 * Apply OD / Medical Leave Policy to raw counts:
 * Policy A: Excluded from denominator (does not count toward conducted or attended)
 * Policy B: Counted as attended (included in conducted AND attended)
 * Policy C: Counted as absent (included in conducted, NOT in attended)
 */
export function applyLeavePoliciesToCounts(
  baseConducted: number,
  baseAttended: number,
  odCount: number,
  medicalCount: number,
  odPolicy: LeavePolicyMode,
  medicalPolicy: LeavePolicyMode
): { effectiveConducted: number; effectiveAttended: number } {
  let effectiveConducted = baseConducted;
  let effectiveAttended = baseAttended;

  // Apply OD policy
  if (odPolicy === 'policy_b') {
    effectiveConducted += odCount;
    effectiveAttended += odCount;
  } else if (odPolicy === 'policy_c') {
    effectiveConducted += odCount;
  }
  // policy_a excludes from denominator (0 added to conducted, 0 added to attended)

  // Apply Medical policy
  if (medicalPolicy === 'policy_b') {
    effectiveConducted += medicalCount;
    effectiveAttended += medicalCount;
  } else if (medicalPolicy === 'policy_c') {
    effectiveConducted += medicalCount;
  }

  return {
    effectiveConducted: Math.max(0, effectiveConducted),
    effectiveAttended: Math.max(0, Math.min(effectiveConducted, effectiveAttended)),
  };
}

/**
 * 1. calculateAttendance()
 * Formula: attendance = (attended / conducted) * 100
 */
export function calculateAttendance(attended: number, conducted: number): number {
  if (conducted <= 0) return 100;
  const pct = (attended / conducted) * 100;
  return Math.round(pct * 10) / 10;
}

/**
 * 2. calculateRemainingClasses()
 * Uses actual section timetable between startDate (exclusive or inclusive) and endDate (inclusive).
 * Never just counts calendar days!
 */
export function calculateRemainingClasses(
  timetable: TimetableSlot[],
  fromDateStr: string,
  untilDateStr: string,
  includeStartDate = false
): {
  totalRemaining: number;
  workingDays: number;
  bySubject: Record<string, number>;
  scheduledInstances: {
    date: string;
    day: DayOfWeek;
    period: number;
    startTime: string;
    endTime: string;
    subjectCode: string;
    subjectName: string;
  }[];
} {
  const bySubject: Record<string, number> = {};
  const scheduledInstances: {
    date: string;
    day: DayOfWeek;
    period: number;
    startTime: string;
    endTime: string;
    subjectCode: string;
    subjectName: string;
  }[] = [];

  for (const slot of timetable) {
    if (bySubject[slot.subjectCode] === undefined) {
      bySubject[slot.subjectCode] = 0;
    }
  }

  const [y1, m1, d1] = fromDateStr.split('-').map(Number);
  const [y2, m2, d2] = untilDateStr.split('-').map(Number);
  const startDt = new Date(y1, m1 - 1, d1, 12, 0, 0);
  const endDt = new Date(y2, m2 - 1, d2, 12, 0, 0);

  if (endDt < startDt) {
    return { totalRemaining: 0, workingDays: 0, bySubject, scheduledInstances };
  }

  const cursor = new Date(startDt);
  if (!includeStartDate) {
    cursor.setDate(cursor.getDate() + 1);
  }

  let totalRemaining = 0;
  let workingDays = 0;

  while (cursor <= endDt) {
    const iso = formatIsoDate(cursor);
    const dayName = getDayOfWeekFromDateString(iso);
    if (dayName !== 'Sunday') {
      const daySlots = timetable
        .filter((s) => s.day === dayName && s.type !== 'break')
        .sort((a, b) => a.period - b.period);

      if (daySlots.length > 0) {
        workingDays++;
        for (const s of daySlots) {
          totalRemaining++;
          bySubject[s.subjectCode] = (bySubject[s.subjectCode] || 0) + 1;
          scheduledInstances.push({
            date: iso,
            day: dayName,
            period: s.period,
            startTime: s.startTime,
            endTime: s.endTime,
            subjectCode: s.subjectCode,
            subjectName: s.subjectName,
          });
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { totalRemaining, workingDays, bySubject, scheduledInstances };
}

/**
 * 3. calculateRequiredClasses()
 * Given current attended, current conducted, remaining classes, and target percentage (e.g. 75 or 90),
 * returns how many of the remaining classes must be attended so that:
 * (attended + x) / (conducted + remaining) >= target / 100
 */
export function calculateRequiredClasses(
  attended: number,
  conducted: number,
  remaining: number,
  targetPercentage: number
): {
  requiredToAttend: number;
  achievable: boolean;
  shortfallClasses: number;
} {
  const totalFutureConducted = conducted + remaining;
  if (totalFutureConducted <= 0) {
    return { requiredToAttend: 0, achievable: true, shortfallClasses: 0 };
  }

  const neededTotalAttended = Math.ceil((targetPercentage / 100) * totalFutureConducted - 1e-9);
  const additionalNeeded = Math.max(0, neededTotalAttended - attended);

  if (additionalNeeded <= remaining) {
    return {
      requiredToAttend: additionalNeeded,
      achievable: true,
      shortfallClasses: 0,
    };
  } else {
    return {
      requiredToAttend: additionalNeeded,
      achievable: false,
      shortfallClasses: additionalNeeded - remaining,
    };
  }
}

/**
 * 4. calculateMaximumMisses()
 * How many of the remaining classes can be missed while still finishing >= targetPercentage
 */
export function calculateMaximumMisses(
  attended: number,
  conducted: number,
  remaining: number,
  targetPercentage: number
): number {
  const { requiredToAttend, achievable } = calculateRequiredClasses(
    attended,
    conducted,
    remaining,
    targetPercentage
  );
  if (!achievable) return 0;
  return Math.max(0, remaining - requiredToAttend);
}

/**
 * 5. calculateProjectedAttendance()
 */
export function calculateProjectedAttendance(
  attended: number,
  conducted: number,
  futureAttended: number,
  futureConducted: number
): number {
  return calculateAttendance(attended + futureAttended, conducted + futureConducted);
}

/**
 * 6. calculateMaximumPossibleAttendance()
 * Maximum achievable attendance if the student attends 100% of remaining classes
 */
export function calculateMaximumPossibleAttendance(
  attended: number,
  conducted: number,
  remaining: number
): number {
  return calculateAttendance(attended + remaining, conducted + remaining);
}

/**
 * 7. calculateRecovery()
 * Calculates exact consecutive or bounded classes needed to recover to target
 */
export function calculateRecovery(
  attended: number,
  conducted: number,
  remaining: number,
  targetPercentage: number,
  subjectName = 'this subject'
): {
  possible: boolean;
  needed: number;
  outOfRemaining: number;
  maxPossible: number;
  statement: string;
} {
  const currentPct = calculateAttendance(attended, conducted);
  const maxPossible = calculateMaximumPossibleAttendance(attended, conducted, remaining);

  if (currentPct >= targetPercentage) {
    const canMiss = calculateMaximumMisses(attended, conducted, remaining, targetPercentage);
    const keepNeeded = Math.max(0, remaining - canMiss);
    return {
      possible: true,
      needed: keepNeeded,
      outOfRemaining: remaining,
      maxPossible,
      statement: `Maintain target by attending ${keepNeeded} of the next ${remaining} ${subjectName} classes (can miss up to ${canMiss}).`,
    };
  }

  const req = calculateRequiredClasses(attended, conducted, remaining, targetPercentage);
  if (req.achievable) {
    return {
      possible: true,
      needed: req.requiredToAttend,
      outOfRemaining: remaining,
      maxPossible,
      statement: `Attend ${req.requiredToAttend} of the next ${remaining} ${subjectName} classes to reach ${targetPercentage}%.`,
    };
  }

  return {
    possible: false,
    needed: req.requiredToAttend,
    outOfRemaining: remaining,
    maxPossible,
    statement: `Recovery to ${targetPercentage}% requires ${req.requiredToAttend} classes, but only ${remaining} remain (Max possible: ${maxPossible}%).`,
  };
}

/**
 * 8. checkIrreversibleDetention()
 * Triggers if even attending EVERY remaining class before the configured deadline
 * cannot reach the required attendance level.
 */
export function checkIrreversibleDetention(
  attended: number,
  conducted: number,
  remaining: number,
  dangerThreshold: number,
  targetThreshold: number,
  subjectMetrics: SubjectAttendanceMetrics[]
) {
  const currentAttendance = calculateAttendance(attended, conducted);
  const maxPossibleAttendance = calculateMaximumPossibleAttendance(attended, conducted, remaining);

  const detainedSubjects = subjectMetrics
    .filter((s) => s.maxPossiblePercentage < dangerThreshold)
    .map((s) => ({
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      currentPercentage: s.percentage,
      maxPossiblePercentage: s.maxPossiblePercentage,
      remainingClasses: s.remainingUntilDeadline,
      shortfall: Math.round((dangerThreshold - s.maxPossiblePercentage) * 10) / 10,
    }));

  const overallBelowDanger = maxPossibleAttendance < dangerThreshold;
  const triggered = overallBelowDanger || detainedSubjects.length > 0;
  const triggeredForTarget = maxPossibleAttendance < targetThreshold;

  const shortfallPercentage = overallBelowDanger
    ? Math.round((dangerThreshold - maxPossibleAttendance) * 10) / 10
    : detainedSubjects.length > 0
    ? detainedSubjects[0].shortfall
    : triggeredForTarget
    ? Math.round((targetThreshold - maxPossibleAttendance) * 10) / 10
    : 0;

  return {
    triggered,
    triggeredForTarget,
    currentAttendance,
    requiredAttendance: dangerThreshold,
    targetAttendance: targetThreshold,
    remainingClasses: remaining,
    maxPossibleAttendance,
    shortfallPercentage,
    detainedSubjects,
  };
}

/**
 * Build complete OverallAttendanceSummary from initial baselines + daily records + timetable + settings
 */
export function buildCompleteAttendanceSummary(
  timetable: TimetableSlot[],
  initialSubjects: InitialSubjectAttendance[],
  records: AttendanceRecord[],
  settings: AttendanceSettings,
  referenceDateStr: string = getTodayIsoDate(),
  planUntilDateStr?: string
): OverallAttendanceSummary {
  const targetDeadline = planUntilDateStr || settings.novemberDeadline;
  const remainingData = calculateRemainingClasses(timetable, referenceDateStr, targetDeadline, false);

  let totalRawConducted = 0;
  let totalRawAttended = 0;
  let totalRawAbsent = 0;
  let totalOd = 0;
  let totalMedical = 0;
  let totalEffectiveConducted = 0;
  let totalEffectiveAttended = 0;

  const subjectMetrics: SubjectAttendanceMetrics[] = initialSubjects.map((initSub) => {
    const subRecords = records.filter((r) => r.subjectCode === initSub.subjectCode);

    let presentAdded = 0;
    let absentAdded = 0;
    let odAdded = initSub.initialOd || 0;
    let medicalAdded = initSub.initialMedical || 0;

    for (const r of subRecords) {
      if (r.status === 'present') presentAdded++;
      else if (r.status === 'absent') absentAdded++;
      else if (r.status === 'od') odAdded++;
      else if (r.status === 'medical') medicalAdded++;
    }

    const baseConducted = initSub.initialConducted + presentAdded + absentAdded;
    const baseAttended = initSub.initialAttended + presentAdded;
    const rawAbsent = Math.max(0, baseConducted - baseAttended);

    const { effectiveConducted, effectiveAttended } = applyLeavePoliciesToCounts(
      baseConducted,
      baseAttended,
      odAdded,
      medicalAdded,
      settings.odPolicy,
      settings.medicalPolicy
    );

    const totalConductedDisplay = baseConducted + odAdded + medicalAdded;
    const percentage = calculateAttendance(effectiveAttended, effectiveConducted);
    const rem = remainingData.bySubject[initSub.subjectCode] || 0;

    const req75 = calculateRequiredClasses(
      effectiveAttended,
      effectiveConducted,
      rem,
      settings.dangerThreshold
    );
    const reqTarget = calculateRequiredClasses(
      effectiveAttended,
      effectiveConducted,
      rem,
      settings.targetThreshold
    );
    const canMiss75 = calculateMaximumMisses(
      effectiveAttended,
      effectiveConducted,
      rem,
      settings.dangerThreshold
    );
    const canMissTarget = calculateMaximumMisses(
      effectiveAttended,
      effectiveConducted,
      rem,
      settings.targetThreshold
    );
    const maxPossiblePercentage = calculateMaximumPossibleAttendance(
      effectiveAttended,
      effectiveConducted,
      rem
    );

    let status: SubjectAttendanceMetrics['status'] = 'SAFE';
    if (maxPossiblePercentage < settings.dangerThreshold) {
      status = 'DETENTION';
    } else if (percentage < settings.dangerThreshold) {
      status = 'CRITICAL';
    } else if (percentage < settings.dangerThreshold + 5) {
      status = 'WARNING';
    } else if (percentage >= settings.targetThreshold) {
      status = 'OPTIMAL';
    }

    totalRawConducted += totalConductedDisplay;
    totalRawAttended += baseAttended;
    totalRawAbsent += rawAbsent;
    totalOd += odAdded;
    totalMedical += medicalAdded;
    totalEffectiveConducted += effectiveConducted;
    totalEffectiveAttended += effectiveAttended;

    return {
      subjectCode: initSub.subjectCode,
      subjectName: initSub.subjectName,
      subjectSlot: initSub.subjectSlot,
      type: initSub.type,
      conducted: totalConductedDisplay,
      attended: baseAttended,
      absent: rawAbsent,
      odCount: odAdded,
      medicalCount: medicalAdded,
      effectiveConducted,
      effectiveAttended,
      percentage,
      remainingUntilDeadline: rem,
      requiredFor75: req75.requiredToAttend,
      requiredForTarget: reqTarget.requiredToAttend,
      canMissFor75: canMiss75,
      canMissForTarget: canMissTarget,
      maxPossiblePercentage,
      status,
      irreversibleFor75: !req75.achievable,
      irreversibleForTarget: !reqTarget.achievable,
    };
  });

  const overallPct = calculateAttendance(totalEffectiveAttended, totalEffectiveConducted);
  const totalRem = remainingData.totalRemaining;

  const overallReq75 = calculateRequiredClasses(
    totalEffectiveAttended,
    totalEffectiveConducted,
    totalRem,
    settings.dangerThreshold
  );
  const overallReqTarget = calculateRequiredClasses(
    totalEffectiveAttended,
    totalEffectiveConducted,
    totalRem,
    settings.targetThreshold
  );
  const overallCanMiss75 = calculateMaximumMisses(
    totalEffectiveAttended,
    totalEffectiveConducted,
    totalRem,
    settings.dangerThreshold
  );
  const overallCanMissTarget = calculateMaximumMisses(
    totalEffectiveAttended,
    totalEffectiveConducted,
    totalRem,
    settings.targetThreshold
  );
  const overallMaxPossible = calculateMaximumPossibleAttendance(
    totalEffectiveAttended,
    totalEffectiveConducted,
    totalRem
  );

  const subjectsAtRisk = subjectMetrics.filter(
    (s) => s.percentage < settings.dangerThreshold + 3 || s.status === 'DETENTION'
  ).length;
  const subjectsBelow90 = subjectMetrics.filter((s) => s.percentage < settings.targetThreshold).length;

  const irreversibleDetention = checkIrreversibleDetention(
    totalEffectiveAttended,
    totalEffectiveConducted,
    totalRem,
    settings.dangerThreshold,
    settings.targetThreshold,
    subjectMetrics
  );

  let recoveryStatus: OverallAttendanceSummary['recoveryStatus'] = 'Recoverable';
  if (irreversibleDetention.triggered) {
    recoveryStatus = 'Irreversible Detention';
  } else if (overallPct >= settings.targetThreshold && subjectsAtRisk === 0) {
    recoveryStatus = 'Optimal (90%+)';
  } else if (subjectsAtRisk > 0 || overallPct < settings.dangerThreshold + 3) {
    recoveryStatus = 'High Vigilance';
  }

  return {
    conducted: totalRawConducted,
    attended: totalRawAttended,
    absent: totalRawAbsent,
    odCount: totalOd,
    medicalCount: totalMedical,
    effectiveConducted: totalEffectiveConducted,
    effectiveAttended: totalEffectiveAttended,
    percentage: overallPct,
    remainingUntilDeadline: totalRem,
    requiredFor75: overallReq75.requiredToAttend,
    requiredForTarget: overallReqTarget.requiredToAttend,
    canMissFor75: overallCanMiss75,
    canMissForTarget: overallCanMissTarget,
    maxPossiblePercentage: overallMaxPossible,
    subjectsAtRisk,
    subjectsBelow90,
    recoveryStatus,
    irreversibleDetention,
    subjects: subjectMetrics,
  };
}

/**
 * 9. calculateLeaveRisk()
 */
export function calculateLeaveRisk(
  projectedOverall: number,
  subjectImpacts: {
    subjectName: string;
    currentPercentage: number;
    projectedPercentage: number;
    recoveryTo75Possible: boolean;
    recoveryTo90Possible: boolean;
  }[],
  dangerThreshold: number,
  targetThreshold: number
): { riskLevel: LeaveRiskLevel; riskSummary: string } {
  const unrecoverableSub = subjectImpacts.find((s) => !s.recoveryTo75Possible);
  if (unrecoverableSub) {
    return {
      riskLevel: 'RECOVERY IMPOSSIBLE',
      riskSummary: `Taking this leave makes mathematical recovery to ${dangerThreshold}% impossible in ${unrecoverableSub.subjectName}.`,
    };
  }

  const belowDangerSub = subjectImpacts.find((s) => s.projectedPercentage < dangerThreshold);
  if (belowDangerSub || projectedOverall < dangerThreshold) {
    return {
      riskLevel: 'HIGH RISK',
      riskSummary: belowDangerSub
        ? `This leave pushes ${belowDangerSub.subjectName} to ${belowDangerSub.projectedPercentage}%, below the ${dangerThreshold}% threshold.`
        : `This leave pushes overall attendance below ${dangerThreshold}%.`,
    };
  }

  const nearDangerSub = subjectImpacts.find(
    (s) => s.projectedPercentage < dangerThreshold + 4
  );
  if (nearDangerSub) {
    return {
      riskLevel: 'HIGH RISK',
      riskSummary: `This leave pushes ${nearDangerSub.subjectName} to ${nearDangerSub.projectedPercentage}%, close to the ${dangerThreshold}% danger threshold.`,
    };
  }

  const droppedBelow90Sub = subjectImpacts.find(
    (s) => s.currentPercentage >= targetThreshold && s.projectedPercentage < targetThreshold
  );
  if (droppedBelow90Sub || projectedOverall < targetThreshold - 5) {
    return {
      riskLevel: 'LOW RISK',
      riskSummary: droppedBelow90Sub
        ? `You remain safely above ${dangerThreshold}%, though ${droppedBelow90Sub.subjectName} moves below the ${targetThreshold}% excellence target.`
        : `Moderate impact on attendance, with full recovery available before the deadline.`,
    };
  }

  return {
    riskLevel: 'SAFE',
    riskSummary: `All subjects remain well above the ${dangerThreshold}% threshold with comfortable recovery buffers.`,
  };
}

/**
 * 10. calculateLeaveImpact()
 * Predicts the exact subject-by-subject and overall attendance impact of taking leave
 * between startDate and endDate, factoring in leaveType and college policy.
 */
export function calculateLeaveImpact(
  timetable: TimetableSlot[],
  currentSummary: OverallAttendanceSummary,
  settings: AttendanceSettings,
  startDate: string,
  endDate: string,
  leaveType: LeaveType
): LeavePredictionResult {
  const windowClasses = calculateRemainingClasses(timetable, startDate, endDate, true);
  const afterLeaveRemaining = calculateRemainingClasses(
    timetable,
    endDate,
    settings.novemberDeadline,
    false
  );

  // Determine how this leaveType affects effectiveConducted and effectiveAttended
  let countsTowardConducted = true;
  let countsTowardAttended = false;

  if (leaveType === 'On-Duty') {
    if (settings.odPolicy === 'policy_a') {
      countsTowardConducted = false;
      countsTowardAttended = false;
    } else if (settings.odPolicy === 'policy_b') {
      countsTowardConducted = true;
      countsTowardAttended = true;
    }
  } else if (leaveType === 'Medical Leave') {
    if (settings.medicalPolicy === 'policy_a') {
      countsTowardConducted = false;
      countsTowardAttended = false;
    } else if (settings.medicalPolicy === 'policy_b') {
      countsTowardConducted = true;
      countsTowardAttended = true;
    }
  }

  const subjectImpacts = currentSummary.subjects.map((sub) => {
    const affected = windowClasses.bySubject[sub.subjectCode] || 0;
    const remAfter = afterLeaveRemaining.bySubject[sub.subjectCode] || 0;

    const projConducted = sub.effectiveConducted + (countsTowardConducted ? affected : 0);
    const projAttended = sub.effectiveAttended + (countsTowardAttended ? affected : 0);
    const projPct = calculateAttendance(projAttended, projConducted);
    const change = Math.round((projPct - sub.percentage) * 10) / 10;

    const rec75 = calculateRecovery(
      projAttended,
      projConducted,
      remAfter,
      settings.dangerThreshold,
      sub.subjectName
    );
    const rec90 = calculateRecovery(
      projAttended,
      projConducted,
      remAfter,
      settings.targetThreshold,
      sub.subjectName
    );

    let statusAfter: SubjectAttendanceMetrics['status'] = 'SAFE';
    if (!rec75.possible) {
      statusAfter = 'DETENTION';
    } else if (projPct < settings.dangerThreshold) {
      statusAfter = 'CRITICAL';
    } else if (projPct < settings.dangerThreshold + 5) {
      statusAfter = 'WARNING';
    } else if (projPct >= settings.targetThreshold) {
      statusAfter = 'OPTIMAL';
    }

    return {
      subjectCode: sub.subjectCode,
      subjectName: sub.subjectName,
      classesAffected: affected,
      currentConducted: sub.effectiveConducted,
      currentAttended: sub.effectiveAttended,
      currentPercentage: sub.percentage,
      projectedConducted: projConducted,
      projectedAttended: projAttended,
      projectedPercentage: projPct,
      change,
      statusAfter,
      remainingAfterLeave: remAfter,
      recoveryTo75: {
        possible: rec75.possible,
        needed: rec75.needed,
        outOfRemaining: rec75.outOfRemaining,
        statement: rec75.statement,
      },
      recoveryTo90: {
        possible: rec90.possible,
        needed: rec90.needed,
        outOfRemaining: rec90.outOfRemaining,
        statement: rec90.statement,
      },
    };
  });

  const totalAffected = windowClasses.totalRemaining;
  const projOverallConducted =
    currentSummary.effectiveConducted + (countsTowardConducted ? totalAffected : 0);
  const projOverallAttended =
    currentSummary.effectiveAttended + (countsTowardAttended ? totalAffected : 0);
  const projectedOverallPercentage = calculateAttendance(
    projOverallAttended,
    projOverallConducted
  );
  const overallChange =
    Math.round((projectedOverallPercentage - currentSummary.percentage) * 10) / 10;

  const { riskLevel, riskSummary } = calculateLeaveRisk(
    projectedOverallPercentage,
    subjectImpacts
      .filter((s) => s.classesAffected > 0)
      .map((s) => ({
        subjectName: s.subjectName,
        currentPercentage: s.currentPercentage,
        projectedPercentage: s.projectedPercentage,
        recoveryTo75Possible: s.recoveryTo75.possible,
        recoveryTo90Possible: s.recoveryTo90.possible,
      })),
    settings.dangerThreshold,
    settings.targetThreshold
  );

  const entersDangerZone =
    projectedOverallPercentage < settings.dangerThreshold ||
    subjectImpacts.some((s) => s.projectedPercentage < settings.dangerThreshold);

  const recovery90Possible =
    calculateRequiredClasses(
      projOverallAttended,
      projOverallConducted,
      afterLeaveRemaining.totalRemaining,
      settings.targetThreshold
    ).achievable;

  const [y1, m1, d1] = startDate.split('-').map(Number);
  const [y2, m2, d2] = endDate.split('-').map(Number);
  const dt1 = new Date(y1, m1 - 1, d1, 12, 0, 0);
  const dt2 = new Date(y2, m2 - 1, d2, 12, 0, 0);
  const totalDays = Math.max(1, Math.round((dt2.getTime() - dt1.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  return {
    startDate,
    endDate,
    leaveType,
    totalDays,
    workingDaysAffected: windowClasses.workingDays,
    totalClassesAffected: totalAffected,
    currentOverallPercentage: currentSummary.percentage,
    projectedOverallPercentage,
    overallChange,
    riskLevel,
    riskSummary,
    entersDangerZone,
    recovery90Possible,
    affectedClassesList: windowClasses.scheduledInstances,
    subjectImpacts,
  };
}

/**
 * 11. findSaferLeaveDates()
 * Scans upcoming dates over the next 30 days to find windows of `desiredDays` working/calendar days
 * where fewer classes or fewer high-risk subject classes occur.
 */
export function findSaferLeaveDates(
  timetable: TimetableSlot[],
  currentSummary: OverallAttendanceSummary,
  settings: AttendanceSettings,
  desiredDays: number,
  fromDateStr: string = getTodayIsoDate()
): SaferLeaveWindow[] {
  const highRiskCodes = new Set(
    currentSummary.subjects
      .filter((s) => s.percentage < settings.dangerThreshold + 6)
      .map((s) => s.subjectCode)
  );

  const candidates: SaferLeaveWindow[] = [];
  const daysToScan = 28;

  for (let offset = 1; offset <= daysToScan; offset++) {
    const startIso = addDaysToIso(fromDateStr, offset);
    const startDay = getDayOfWeekFromDateString(startIso);
    if (startDay === 'Sunday' || startDay === 'Saturday') continue;

    // Collect `desiredDays` consecutive working days starting from startIso
    let workingFound = 0;
    let cursorOffset = offset;
    let endIso = startIso;

    while (workingFound < desiredDays && cursorOffset <= offset + 10) {
      const candidateIso = addDaysToIso(fromDateStr, cursorOffset);
      const dName = getDayOfWeekFromDateString(candidateIso);
      if (dName !== 'Sunday' && dName !== 'Saturday') {
        workingFound++;
        endIso = candidateIso;
      }
      cursorOffset++;
    }

    if (workingFound < desiredDays) continue;

    const prediction = calculateLeaveImpact(
      timetable,
      currentSummary,
      settings,
      startIso,
      endIso,
      'Personal Leave'
    );

    if (prediction.totalClassesAffected === 0) continue;

    let highRiskHits = 0;
    const affectedSubjectsSummary: { subjectCode: string; subjectName: string; count: number }[] = [];

    for (const s of prediction.subjectImpacts) {
      if (s.classesAffected > 0) {
        affectedSubjectsSummary.push({
          subjectCode: s.subjectCode,
          subjectName: s.subjectName,
          count: s.classesAffected,
        });
        if (highRiskCodes.has(s.subjectCode)) {
          highRiskHits += s.classesAffected;
        }
      }
    }

    let reason = 'Balanced schedule with minimal impact on core subjects.';
    if (highRiskHits === 0) {
      reason = 'Zero high-risk subjects scheduled during this window.';
    } else if (highRiskHits === 1) {
      reason = 'Only 1 period of a watch-list subject affected.';
    }

    candidates.push({
      startDate: startIso,
      endDate: endIso,
      daysCount: desiredDays,
      dateLabel: formatShortDateRange(startIso, endIso),
      classesAffected: prediction.totalClassesAffected,
      highRiskSubjectsAffected: highRiskHits,
      projectedOverallAttendance: prediction.projectedOverallPercentage,
      overallDrop: Math.abs(prediction.overallChange),
      riskLevel: prediction.riskLevel,
      affectedSubjectsSummary,
      reason,
    });
  }

  // Sort by: 1) lowest risk level, 2) fewest high-risk subject hits, 3) highest projected attendance
  const riskScore: Record<LeaveRiskLevel, number> = {
    SAFE: 0,
    'LOW RISK': 1,
    'HIGH RISK': 2,
    'RECOVERY IMPOSSIBLE': 3,
  };

  candidates.sort((a, b) => {
    if (riskScore[a.riskLevel] !== riskScore[b.riskLevel]) {
      return riskScore[a.riskLevel] - riskScore[b.riskLevel];
    }
    if (a.highRiskSubjectsAffected !== b.highRiskSubjectsAffected) {
      return a.highRiskSubjectsAffected - b.highRiskSubjectsAffected;
    }
    return b.projectedOverallAttendance - a.projectedOverallAttendance;
  });

  return candidates.slice(0, 5);
}

/**
 * Get scheduled classes for a single date
 */
export function getClassesForDate(
  timetable: TimetableSlot[],
  dateStr: string
): {
  dayName: DayOfWeek | 'Sunday';
  slots: TimetableSlot[];
} {
  const dayName = getDayOfWeekFromDateString(dateStr);
  if (dayName === 'Sunday') {
    return { dayName, slots: [] };
  }
  const slots = timetable
    .filter((s) => s.day === dayName && s.type !== 'break')
    .sort((a, b) => a.period - b.period);
  return { dayName, slots };
}
