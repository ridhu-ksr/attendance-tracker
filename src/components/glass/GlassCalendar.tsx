import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import {
  AttendanceRecord,
  LeaveRecord,
  TimetableSlot,
} from '../../types/attendance';
import {
  formatIsoDate,
  formatReadableDate,
  getClassesForDate,
  getTodayIsoDate,
} from '../../engine/attendanceEngine';
import { GlassCard, GlassButton } from './GlassComponents';

interface GlassCalendarProps {
  timetable: TimetableSlot[];
  leaves: LeaveRecord[];
  attendanceRecords: AttendanceRecord[];
  onSelectDateForLeave?: (dateStr: string) => void;
}

export const GlassCalendar: React.FC<GlassCalendarProps> = ({
  timetable,
  leaves,
  attendanceRecords,
  onSelectDateForLeave,
}) => {
  const todayIso = getTodayIsoDate();
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const [y, m] = todayIso.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(formatIsoDate(new Date(year, month, d)));
  }

  const getLeaveForDate = (dateStr: string): LeaveRecord | undefined => {
    return leaves.find((l) => dateStr >= l.startDate && dateStr <= l.endDate);
  };

  const selectedDayInfo = getClassesForDate(timetable, selectedDate);
  const selectedLeave = getLeaveForDate(selectedDate);
  const selectedRecords = attendanceRecords.filter((r) => r.date === selectedDate);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <GlassCard className="lg:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#0D1B2A]">
              Academic & Leave Calendar
            </h3>
            <p className="text-xs text-[#3D5A80] mt-0.5">
              Select any date to inspect scheduled classes, leave impact, and daily logs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl bg-white/70 hover:bg-white text-[#1B3A6B] border border-[#CDE1F2] cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 text-sm font-semibold text-[#0D1B2A] min-w-[140px] text-center">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl bg-white/70 hover:bg-white text-[#1B3A6B] border border-[#CDE1F2] cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#3D5A80] mb-4 pb-3 border-b border-[#CDE1F2]/60">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1B3A6B]" />
            Scheduled Classes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6B8CAE]" />
            Planned Personal Leave
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
            Medical Leave
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            On-Duty (OD)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            Past Leave
          </span>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-semibold text-[#3D5A80]">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {cells.map((dateStr, idx) => {
            if (!dateStr) {
              return <div key={`empty-${idx}`} className="h-20 rounded-2xl bg-white/20" />;
            }

            const dayNum = Number(dateStr.split('-')[2]);
            const { slots } = getClassesForDate(timetable, dateStr);
            const leave = getLeaveForDate(dateStr);
            const isPast = dateStr < todayIso;
            const isToday = dateStr === todayIso;
            const isSelected = dateStr === selectedDate;
            const dayRecords = attendanceRecords.filter((r) => r.date === dateStr);

            let cellStyle = 'bg-white/55 border-white/75 text-[#0D1B2A]';
            let statusTag = '';

            if (leave) {
              if (isPast) {
                cellStyle = 'bg-slate-200/75 border-slate-300 text-slate-800';
                statusTag = 'Past Leave';
              } else if (leave.leaveType === 'Medical Leave') {
                cellStyle = 'bg-teal-100/80 border-teal-300 text-teal-950';
                statusTag = 'Medical';
              } else if (leave.leaveType === 'On-Duty') {
                cellStyle = 'bg-indigo-100/80 border-indigo-300 text-indigo-950';
                statusTag = 'OD';
              } else {
                cellStyle = 'bg-[#CDE1F2]/90 border-[#6B8CAE] text-[#0D1B2A]';
                statusTag = 'Leave';
              }
            } else if (slots.length > 0) {
              cellStyle = 'bg-[#E8F1FA]/80 border-[#A8C5E0]/70 text-[#0D1B2A]';
            }

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`h-20 p-2 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer hover:scale-[1.02] ${cellStyle} ${
                  isSelected ? 'ring-2 ring-[#0D1B2A] shadow-md' : ''
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`font-mono-num text-xs font-bold ${
                      isToday
                        ? 'bg-[#0D1B2A] text-white w-6 h-6 rounded-full flex items-center justify-center'
                        : ''
                    }`}
                  >
                    {dayNum}
                  </span>
                  {slots.length > 0 && (
                    <span className="font-mono-num text-[10px] text-[#3D5A80]">
                      {slots.length}p
                    </span>
                  )}
                </div>

                <div className="w-full truncate">
                  {leave ? (
                    <div className="text-[10px] font-semibold truncate">{statusTag}</div>
                  ) : dayRecords.length > 0 ? (
                    <div className="text-[10px] text-[#1B3A6B] font-medium truncate">
                      {dayRecords.filter((r) => r.status === 'present').length}/{dayRecords.length}{' '}
                      Present
                    </div>
                  ) : slots.length > 0 ? (
                    <div className="w-full h-1.5 rounded-full bg-[#1B3A6B]/25 overflow-hidden">
                      <div className="h-full bg-[#1B3A6B] w-full" />
                    </div>
                  ) : (
                    <span className="text-[10px] text-[#6B8CAE]">Off</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Selected Date Inspector */}
      <GlassCard variant="elevated" className="lg:col-span-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-[#CDE1F2]">
            <div>
              <div className="text-xs font-medium text-[#3D5A80]">{selectedDayInfo.dayName}</div>
              <h4 className="text-lg font-bold text-[#0D1B2A]">
                {formatReadableDate(selectedDate)}
              </h4>
            </div>
            <CalendarIcon className="w-5 h-5 text-[#1B3A6B]" />
          </div>

          {selectedLeave && (
            <div className="mb-4 p-4 rounded-2xl bg-[#E8F1FA] border border-[#A8C5E0]">
              <div className="text-xs font-semibold text-[#1B3A6B]">
                {selectedLeave.leaveType} · {selectedLeave.riskLevel}
              </div>
              <div className="text-xs text-[#0D1B2A] mt-1">
                Projected Overall: <span className="font-mono-num font-bold">{selectedLeave.projectedOverallAttendance}%</span> ·{' '}
                <span className="font-mono-num">{selectedLeave.totalClassesAffected}</span> classes in window
              </div>
              {selectedLeave.reason && (
                <div className="text-xs text-[#3D5A80] mt-1">Note: {selectedLeave.reason}</div>
              )}
            </div>
          )}

          <div className="text-xs font-semibold text-[#3D5A80] mb-2.5">
            Scheduled Timetable ({selectedDayInfo.slots.length} periods)
          </div>

          {selectedDayInfo.slots.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white/50 text-center text-sm text-[#3D5A80]">
              No regular classes scheduled on this day.
            </div>
          ) : (
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {selectedDayInfo.slots.map((slot) => {
                const rec = selectedRecords.find((r) => r.period === slot.period);
                return (
                  <div
                    key={slot.period}
                    className="p-3 rounded-xl bg-white/70 border border-white flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#0D1B2A] truncate">
                        P{slot.period} · {slot.subjectName}
                      </div>
                      <div className="text-[11px] text-[#3D5A80] font-mono-num">
                        {slot.startTime} – {slot.endTime} · {slot.subjectCode}
                      </div>
                    </div>
                    {rec ? (
                      <span className="text-xs font-semibold text-[#1B3A6B] capitalize shrink-0">
                        {rec.status}
                      </span>
                    ) : selectedLeave ? (
                      <span className="text-xs font-medium text-amber-800 shrink-0">
                        On Leave
                      </span>
                    ) : (
                      <span className="text-xs text-[#6B8CAE] shrink-0">Scheduled</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {onSelectDateForLeave && selectedDayInfo.slots.length > 0 && (
          <div className="pt-4 mt-4 border-t border-[#CDE1F2]">
            <GlassButton
              variant="secondary"
              className="w-full"
              onClick={() => onSelectDateForLeave(selectedDate)}
            >
              Simulate Leave on {formatReadableDate(selectedDate)}
            </GlassButton>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
