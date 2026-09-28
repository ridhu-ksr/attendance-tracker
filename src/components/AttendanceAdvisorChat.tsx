import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Sparkles, X, Minimize2, Maximize2 } from 'lucide-react';
import {
  AttendanceSettings,
  LeaveRecord,
  OverallAttendanceSummary,
  StudentProfile,
  TimetableSlot,
} from '../types/attendance';
import {
  addDaysToIso,
  calculateLeaveImpact,
  findSaferLeaveDates,
  formatReadableDate,
  getDayOfWeekFromDateString,
  getTodayIsoDate,
} from '../engine/attendanceEngine';
import { GlassButton, GlassCard } from './glass/GlassComponents';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  timestamp: string;
  calculationBadge?: string;
}

interface AttendanceAdvisorChatProps {
  profile: StudentProfile;
  timetable: TimetableSlot[];
  summary: OverallAttendanceSummary;
  settings: AttendanceSettings;
  leaves: LeaveRecord[];
  mode?: 'floating' | 'page';
}

const SUGGESTED_QUESTIONS = [
  'Can I take leave tomorrow?',
  'Can I take leave next Monday?',
  'How many classes do I need for 90%?',
  'If I take 3 days sick leave, what happens?',
  'Which subject is risky?',
  'Find me a safer 2-day leave window.',
];

/**
 * Deterministic pre-computation engine that extracts exact numbers from `attendanceEngine`
 * for any student query BEFORE passing the verified facts to the AI explanation layer.
 */
function buildDeterministicAdvisorFacts(
  question: string,
  profile: StudentProfile,
  timetable: TimetableSlot[],
  summary: OverallAttendanceSummary,
  settings: AttendanceSettings
): { badge: string; deterministicReport: string } {
  const q = question.toLowerCase();
  const todayIso = getTodayIsoDate();

  // Helper to find next occurrence of a specific weekday
  const findNextWeekdayIso = (targetDay: string): string => {
    for (let i = 1; i <= 7; i++) {
      const candidate = addDaysToIso(todayIso, i);
      const dayName = getDayOfWeekFromDateString(candidate);
      if (dayName.toLowerCase() === targetDay.toLowerCase()) {
        return candidate;
      }
    }
    return addDaysToIso(todayIso, 1);
  };

  // 1. Check if asking about "next monday" or another specific day
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const matchedDay = weekdays.find((d) => q.includes(d));

  if (matchedDay) {
    const targetIso = findNextWeekdayIso(matchedDay);
    const dayLabel = matchedDay.charAt(0).toUpperCase() + matchedDay.slice(1);
    const impact = calculateLeaveImpact(
      timetable,
      summary,
      settings,
      targetIso,
      targetIso,
      'Personal Leave'
    );
    const affectedSubs = impact.subjectImpacts.filter((s) => s.classesAffected > 0);
    const lines = affectedSubs.map(
      (s) =>
        `• ${s.subjectName} (${s.subjectCode}): ${s.currentPercentage}% → ${s.projectedPercentage}% (${s.classesAffected} period${s.classesAffected > 1 ? 's' : ''})`
    );

    return {
      badge: `Engine: ${dayLabel} (${formatReadableDate(targetIso)}) Impact`,
      deterministicReport: `Next ${dayLabel} (${formatReadableDate(
        targetIso
      )}) you have ${impact.totalClassesAffected} scheduled classes in ${
        profile.sectionId
      }.\n\nIf you miss all ${impact.totalClassesAffected}:\n${lines.join(
        '\n'
      )}\n\nOverall attendance changes from ${impact.currentOverallPercentage}% → ${
        impact.projectedOverallPercentage
      }% (Status: ${impact.riskLevel}). ${impact.riskSummary}`,
    };
  }

  // 2. Check if asking about "tomorrow"
  if (q.includes('tomorrow')) {
    let targetIso = addDaysToIso(todayIso, 1);
    let dayName = getDayOfWeekFromDateString(targetIso);
    let notePrefix = `Tomorrow (${formatReadableDate(targetIso)}, ${dayName})`;

    if (dayName === 'Sunday' || dayName === 'Saturday') {
      targetIso = findNextWeekdayIso('Monday');
      dayName = 'Monday';
      notePrefix = `Tomorrow is a weekend off-day. Looking at the next working day (${formatReadableDate(
        targetIso
      )}, Monday)`;
    }

    const impact = calculateLeaveImpact(
      timetable,
      summary,
      settings,
      targetIso,
      targetIso,
      'Personal Leave'
    );
    const affectedSubs = impact.subjectImpacts.filter((s) => s.classesAffected > 0);
    const lines = affectedSubs.map(
      (s) =>
        `• ${s.subjectName}: ${s.currentPercentage}% → ${s.projectedPercentage}% (${s.classesAffected} class${s.classesAffected > 1 ? 'es' : ''})`
    );

    return {
      badge: `Engine: Single-Day Leave (${formatReadableDate(targetIso)})`,
      deterministicReport: `${notePrefix}, you have ${
        impact.totalClassesAffected
      } scheduled classes.\n\nIf you take leave:\n${lines.join(
        '\n'
      )}\n\nOverall attendance: ${impact.currentOverallPercentage}% → ${
        impact.projectedOverallPercentage
      }% (${impact.riskLevel}). ${impact.riskSummary}`,
    };
  }

  // 3. Check if asking about "3 days" or multi-day sick/medical leave
  if (q.includes('3 day') || q.includes('three day') || q.includes('sick') || q.includes('medical')) {
    const startIso = addDaysToIso(todayIso, 1);
    const endIso = addDaysToIso(todayIso, 3);
    const lType = q.includes('sick') || q.includes('medical') ? 'Medical Leave' : 'Personal Leave';
    const impact = calculateLeaveImpact(
      timetable,
      summary,
      settings,
      startIso,
      endIso,
      lType
    );
    const affectedSubs = impact.subjectImpacts.filter((s) => s.classesAffected > 0);
    const lines = affectedSubs.map(
      (s) =>
        `• ${s.subjectName}: ${s.currentPercentage}% → ${s.projectedPercentage}% (${s.classesAffected} classes, ${s.recoveryTo90.statement})`
    );

    return {
      badge: `Engine: 3-Day ${lType} Simulation`,
      deterministicReport: `For a 3-day ${lType} (${formatReadableDate(
        startIso
      )} to ${formatReadableDate(endIso)}) under your configured college policy:\n\n• Total classes affected: ${
        impact.totalClassesAffected
      }\n• Overall attendance: ${impact.currentOverallPercentage}% → ${
        impact.projectedOverallPercentage
      }%\n• Safety Status: ${impact.riskLevel}\n\nSubject Breakdown:\n${lines.join(
        '\n'
      )}\n\n${impact.riskSummary}`,
    };
  }

  // 4. Check if asking about "safer" leave dates
  if (q.includes('safer') || q.includes('recommend') || q.includes('window') || q.includes('2-day') || q.includes('2 day')) {
    const days = q.includes('3') ? 3 : q.includes('1') ? 1 : 2;
    const windows = findSaferLeaveDates(timetable, summary, settings, days, todayIso);
    const top = windows.slice(0, 3);
    const lines = top.map(
      (w, idx) =>
        `${idx + 1}. ${w.dateLabel}: ${w.classesAffected} classes affected, Projected Overall ${w.projectedOverallAttendance}% (${w.riskLevel}) — ${w.reason}`
    );

    return {
      badge: `Engine: Safer ${days}-Day Leave Scan`,
      deterministicReport: `I scanned your ${profile.sectionId} timetable for upcoming ${days}-day leave windows with the lowest attendance impact:\n\n${lines.join(
        '\n\n'
      )}`,
    };
  }

  // 5. Check if asking about "90%" or "how many classes"
  if (q.includes('90%') || q.includes('how many classes') || q.includes('target')) {
    const subLines = summary.subjects.map(
      (s) =>
        `• ${s.subjectName}: currently ${s.percentage}% — need ${s.requiredForTarget} of ${s.remainingUntilDeadline} remaining classes for ${settings.targetThreshold}% (can miss ${s.canMissFor75} for ${settings.dangerThreshold}%)`
    );

    return {
      badge: `Engine: ${settings.targetThreshold}% Target & ${settings.dangerThreshold}% Buffer`,
      deterministicReport: `Your current overall attendance is ${summary.percentage}% (${summary.effectiveAttended}/${summary.effectiveConducted} classes) with ${summary.remainingUntilDeadline} classes remaining until ${settings.novemberDeadline}.\n\n• To reach ${settings.targetThreshold}% overall: Attend ${summary.requiredForTarget} of the next ${summary.remainingUntilDeadline} classes (Max possible: ${summary.maxPossiblePercentage}%).\n• To stay above ${settings.dangerThreshold}% minimum: Attend ${summary.requiredFor75} classes (you can safely miss up to ${summary.canMissFor75} classes).\n\nSubject-wise Requirements:\n${subLines.join(
        '\n'
      )}`,
    };
  }

  // 6. Check if asking about "risky" or "danger" or "detention"
  if (q.includes('risk') || q.includes('danger') || q.includes('detention') || q.includes('low')) {
    const sorted = [...summary.subjects].sort((a, b) => a.percentage - b.percentage);
    const lowestThree = sorted.slice(0, 3);
    const lines = lowestThree.map(
      (s) =>
        `• ${s.subjectName} (${s.subjectCode}): ${s.percentage}% (${s.effectiveAttended}/${s.effectiveConducted}) — Status: ${s.status}. Need ${s.requiredFor75}/${s.remainingUntilDeadline} classes for ${settings.dangerThreshold}%, can miss ${s.canMissFor75}.`
    );

    return {
      badge: 'Engine: Subject Risk Audit',
      deterministicReport: `Here are your highest-vigilance subjects sorted by attendance:\n\n${lines.join(
        '\n'
      )}\n\nOverall Recovery Status: ${summary.recoveryStatus}. ${
        summary.irreversibleDetention.triggered
          ? 'WARNING: Irreversible detention threshold has been triggered!'
          : `All subjects can mathematically reach ${settings.dangerThreshold}% before ${settings.novemberDeadline}.`
      }`,
    };
  }

  // Default comprehensive deterministic snapshot
  return {
    badge: 'Engine: Full Attendance Snapshot',
    deterministicReport: `Current Section: ${profile.sectionId}\nOverall Attendance: ${summary.percentage}% (${summary.effectiveAttended}/${summary.effectiveConducted})\nRemaining Classes until ${settings.novemberDeadline}: ${summary.remainingUntilDeadline}\nRequired for ${settings.targetThreshold}% Target: ${summary.requiredForTarget} classes\nSafe Misses above ${settings.dangerThreshold}%: ${summary.canMissFor75} classes\nSubjects at Risk: ${summary.subjectsAtRisk}\nRecovery Status: ${summary.recoveryStatus}`,
  };
}

export const AttendanceAdvisorChat: React.FC<AttendanceAdvisorChatProps> = ({
  profile,
  timetable,
  summary,
  settings,
  mode = 'floating',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(mode === 'page');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hi ${profile.name.split(' ')[0]}! I know your ${profile.sectionId} timetable and attendance (${summary.percentage}% overall). Ask me anything about future leaves, subject risks, or recovery targets.`,
      timestamp: 'Just now',
      calculationBadge: 'Deterministic Engine Connected',
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Step 1: Deterministic calculation engine computes the exact mathematical result
    const { badge, deterministicReport } = buildDeterministicAdvisorFacts(
      trimmed,
      profile,
      timetable,
      summary,
      settings
    );

    try {
      // Step 2: Send deterministic calculation engine result to server-side Gemini explanation route
      const res = await fetch('/api/advisor/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          deterministicReport,
          studentName: profile.name,
          sectionId: profile.sectionId,
          overallPercentage: summary.percentage,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const replyText = data.answer || deterministicReport;
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: replyText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            calculationBadge: badge,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: deterministicReport,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            calculationBadge: badge,
          },
        ]);
      }
    } catch {
      // Fallback directly to the verified calculation engine output
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: deterministicReport,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          calculationBadge: badge,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderChatBody = () => (
    <div className="flex flex-col h-full">
      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[440px]"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            {m.calculationBadge && (
              <span className="text-[10px] font-semibold text-[#1B3A6B] mb-1 px-1">
                {m.calculationBadge}
              </span>
            )}
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-line ${
                m.role === 'user'
                  ? 'bg-[#1B3A6B] text-white rounded-br-sm'
                  : 'bg-white/85 text-[#0D1B2A] border border-[#CDE1F2] rounded-bl-sm shadow-sm'
              }`}
            >
              {m.text}
            </div>
            <span className="text-[10px] text-[#6B8CAE] mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#3D5A80] px-2">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-[#1B3A6B]" />
            <span>Running calculation engine & preparing advice...</span>
          </div>
        )}
      </div>

      {/* Suggested Questions */}
      <div className="px-4 py-2.5 border-t border-[#CDE1F2]/70 bg-white/40">
        <div className="text-[10px] font-semibold text-[#3D5A80] mb-1.5">
          Suggested Questions:
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleSendQuestion(q)}
              className="px-2.5 py-1 rounded-lg bg-white/80 hover:bg-[#1B3A6B] hover:text-white text-[11px] font-medium text-[#0D1B2A] border border-[#CDE1F2] whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendQuestion(input);
        }}
        className="p-3 border-t border-[#CDE1F2] bg-white/65 flex items-center gap-2 rounded-b-[24px]"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about leave tomorrow, next Monday, or 90% target..."
          className="flex-1 bg-white/80 border border-[#A8C5E0] rounded-xl px-3.5 py-2 text-xs text-[#0D1B2A] placeholder:text-[#6B8CAE] focus:outline-none focus:border-[#1B3A6B]"
        />
        <GlassButton type="submit" size="sm" variant="primary" disabled={isLoading}>
          <Send className="w-3.5 h-3.5" />
          Ask
        </GlassButton>
      </form>
    </div>
  );

  if (mode === 'page') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <GlassCard variant="elevated" className="lg:col-span-8 p-0 overflow-hidden">
          <div className="p-5 border-b border-[#CDE1F2] bg-gradient-to-r from-[#0D1B2A] to-[#1B3A6B] text-white rounded-t-[24px] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">ATTENDANCE ADVISOR</h2>
              <p className="text-xs text-[#CDE1F2] mt-0.5">
                Deterministic Calculation Engine + AI Explanation Layer
              </p>
            </div>
            <span className="text-xs font-mono-num text-[#CDE1F2]">
              Section: {profile.sectionId}
            </span>
          </div>
          {renderChatBody()}
        </GlassCard>

        <GlassCard variant="tint" className="lg:col-span-4 space-y-4">
          <h3 className="text-base font-bold text-[#0D1B2A]">
            How the Attendance Advisor Works
          </h3>
          <p className="text-xs text-[#3D5A80] leading-relaxed">
            Unlike generic chatbots that guess percentages, AttendIQ follows a strict
            three-stage verification pipeline:
          </p>
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-white/80 border border-white">
              <div className="font-bold text-[#0D1B2A]">1. Question Intent Parsing</div>
              <div className="text-[#3D5A80] mt-0.5">
                Identifies dates (e.g. tomorrow, next Monday), leave duration, or target thresholds.
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/80 border border-white">
              <div className="font-bold text-[#1B3A6B]">2. Deterministic Calculation Engine</div>
              <div className="text-[#3D5A80] mt-0.5">
                Queries your {profile.sectionId} timetable and attendance records to compute exact before/after percentages.
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/80 border border-white">
              <div className="font-bold text-[#0D1B2A]">3. Natural Language Advisory</div>
              <div className="text-[#3D5A80] mt-0.5">
                Translates the verified mathematics into clear, actionable advice.
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <>
      {/* Floating Button Bottom-Right */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-5 z-40 flex items-center gap-2.5 px-5 py-3.5 rounded-full liquid-glass-navy text-white shadow-[0_12px_32px_rgba(13,27,42,0.3)] hover:scale-105 transition-all cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-[#CDE1F2]" />
          <span className="text-xs font-bold tracking-wide">💬 Attendance Advisor</span>
        </button>
      )}

      {/* Floating Glass Chat Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-200 ${
            isExpanded
              ? 'inset-4 md:inset-10'
              : 'bottom-4 right-4 left-4 md:left-auto md:w-[420px] max-h-[82vh]'
          } liquid-glass-elevated rounded-[24px] overflow-hidden flex flex-col shadow-[0_20px_60px_rgba(13,27,42,0.25)] border border-white`}
        >
          <div className="px-4 py-3.5 bg-gradient-to-r from-[#0D1B2A] to-[#1B3A6B] text-white flex items-center justify-between">
            <div>
              <div className="text-xs font-bold tracking-wider">ATTENDANCE ADVISOR</div>
              <div className="text-[11px] text-[#CDE1F2]">
                {profile.sectionId} · {summary.percentage}% Overall
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-[#CDE1F2] cursor-pointer"
                aria-label="Toggle size"
              >
                {isExpanded ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-[#CDE1F2] cursor-pointer"
                aria-label="Close advisor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {renderChatBody()}
        </div>
      )}
    </>
  );
};
