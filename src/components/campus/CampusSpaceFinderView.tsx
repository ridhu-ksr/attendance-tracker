import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  Eye,
  FlaskConical,
  Layers,
  MapPin,
  Maximize2,
  Monitor,
  Navigation,
  Plug,
  Projector,
  Search,
  Sparkles,
  Users,
  Wifi,
  Wind,
  X,
} from 'lucide-react';
import { StudentProfile } from '../../types/attendance';
import {
  ALL_FACILITIES,
  CAMPUS_BUILDINGS,
  DEFAULT_NEXT_ACTIVITIES,
  EvaluatedCampusRoom,
  FacilityType,
  StudentNextActivity,
  evaluateAllCampusRooms,
  formatTime12h,
  getStudentScheduleWithFreeSlots,
  parseNaturalLanguageRoomQuery,
} from '../../data/campusSpaceData';
import { ThreeBuildingViewer } from './ThreeBuildingViewer';

interface CampusSpaceFinderViewProps {
  studentProfile: StudentProfile;
}

export const CampusSpaceFinderView: React.FC<CampusSpaceFinderViewProps> = ({
  studentProfile,
}) => {
  // Natural Language Query & Filter States
  const [queryText, setQueryText] = useState<string>(
    'I need an AC room on the ground floor for me and my team for the next 2 hours.'
  );
  const [selectedFacilities, setSelectedFacilities] = useState<FacilityType[]>([
    'AC',
    'Wi-Fi',
    'Projector',
  ]);
  const [groupSize, setGroupSize] = useState<number>(5);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('MECH');
  const [buildingFilter, setBuildingFilter] = useState<string>('ALL');
  const [selectedFloor, setSelectedFloor] = useState<number | 'ALL'>(0);
  const [durationHours, setDurationHours] = useState<number>(2);

  // Active Next Activity for proximity routing
  const [activeNextActivity, setActiveNextActivity] =
    useState<StudentNextActivity>(DEFAULT_NEXT_ACTIVITIES[1]); // Mechanical Lab 3:00 PM

  // Sub-view mode ('explorer' = full 3-panel layout, 'floor_matrix' = full floor-wise grid, 'schedule_sync' = timetable free-slot finder)
  const [subView, setSubView] = useState<
    'explorer' | 'floor_matrix' | 'schedule_sync'
  >('explorer');

  // Interactive Modals
  const [is3dModalOpen, setIs3dModalOpen] = useState<boolean>(false);
  const [isStreetViewOpen, setIsStreetViewOpen] = useState<boolean>(false);
  const [isNavigateActive, setIsNavigateActive] = useState<boolean>(true);
  const [photoModalRoom, setPhotoModalRoom] =
    useState<EvaluatedCampusRoom | null>(null);
  const [scheduleModalRoom, setScheduleModalRoom] =
    useState<EvaluatedCampusRoom | null>(null);
  const [checkedInRoomIds, setCheckedInRoomIds] = useState<string[]>([]);

  // Live countdown ticker (seconds elapsed)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(120);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Parse query + active filters into structured requirements
  const extractedRequirements = useMemo(() => {
    const parsed = parseNaturalLanguageRoomQuery(
      queryText,
      selectedFacilities,
      groupSize,
      buildingFilter,
      selectedFloor,
      durationHours
    );
    return {
      ...parsed,
      requiredFacilities:
        selectedFacilities.length > 0
          ? selectedFacilities
          : parsed.requiredFacilities,
      groupSize: groupSize || parsed.groupSize,
      preferredBuilding: buildingFilter,
      preferredFloor: selectedFloor,
      nearDestination: activeNextActivity.locationName,
      nearBuildingId: activeNextActivity.locationBuildingId,
    };
  }, [
    queryText,
    selectedFacilities,
    groupSize,
    buildingFilter,
    selectedFloor,
    durationHours,
    activeNextActivity,
  ]);

  // Evaluate and rank all campus rooms using the weighted scoring engine
  const evaluatedRooms = useMemo(
    () => evaluateAllCampusRooms(extractedRequirements, 13 * 60, elapsedSeconds),
    [extractedRequirements, elapsedSeconds]
  );

  // Selected room (defaults to top-ranked match, e.g. M-204)
  const [selectedRoomId, setSelectedRoomId] = useState<string>('M-204');

  const activeRoom: EvaluatedCampusRoom = useMemo(() => {
    return (
      evaluatedRooms.find((r) => r.roomId === selectedRoomId) ||
      evaluatedRooms[0]
    );
  }, [evaluatedRooms, selectedRoomId]);

  const otherGoodOptions = useMemo(() => {
    return evaluatedRooms
      .filter((r) => r.roomId !== activeRoom.roomId)
      .slice(0, 5);
  }, [evaluatedRooms, activeRoom]);

  // Student's real timetable schedule + free slots
  const studentDayTimeline = useMemo(
    () => getStudentScheduleWithFreeSlots(studentProfile.sectionId, 'Tuesday'),
    [studentProfile.sectionId]
  );

  // When user clicks "Find Best Space", sync filters from natural language prompt and select top room
  const handleRunSmartSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseNaturalLanguageRoomQuery(queryText);
    if (parsed.requiredFacilities.length > 0) {
      setSelectedFacilities(parsed.requiredFacilities);
    }
    setGroupSize(parsed.groupSize);
    setDurationHours(parsed.durationHours);
    if (parsed.preferredFloor !== 'ALL') {
      setSelectedFloor(parsed.preferredFloor);
    }
    if (parsed.preferredBuilding !== 'ALL') {
      setSelectedBuildingId(parsed.preferredBuilding);
    }
    const freshEval = evaluateAllCampusRooms(parsed, 13 * 60, elapsedSeconds);
    if (freshEval.length > 0) {
      setSelectedRoomId(freshEval[0].roomId);
      setSelectedBuildingId(freshEval[0].buildingId);
    }
  };

  const toggleFacility = (fac: FacilityType) => {
    setSelectedFacilities((prev) =>
      prev.includes(fac) ? prev.filter((f) => f !== fac) : [...prev, fac]
    );
  };

  const handleSelectRoom = (room: EvaluatedCampusRoom) => {
    setSelectedRoomId(room.roomId);
    setSelectedBuildingId(room.buildingId);
  };

  const renderFacilityIcon = (fac: FacilityType) => {
    switch (fac) {
      case 'AC':
        return <Wind className="w-3.5 h-3.5 text-sky-600" />;
      case 'Wi-Fi':
        return <Wifi className="w-3.5 h-3.5 text-blue-600" />;
      case 'Projector':
        return <Projector className="w-3.5 h-3.5 text-indigo-600" />;
      case 'Computers':
        return <Monitor className="w-3.5 h-3.5 text-purple-600" />;
      case 'Lab Access':
        return <FlaskConical className="w-3.5 h-3.5 text-teal-600" />;
      case 'Charging':
        return <Plug className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const activeBuildingMeta =
    CAMPUS_BUILDINGS.find((b) => b.buildingId === selectedBuildingId) ||
    CAMPUS_BUILDINGS[0];

  const nextActBuildingMeta =
    CAMPUS_BUILDINGS.find(
      (b) => b.buildingId === activeNextActivity.locationBuildingId
    ) || CAMPUS_BUILDINGS[0];

  return (
    <div className="space-y-4">
      {/* Top Sub-Header Bar matching Reference UI */}
      <div className="liquid-glass-elevated rounded-[24px] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border border-white/90">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 text-white flex items-center justify-center shadow-md">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-[#0D1B2A] tracking-tight">
                Smart Campus Room & Space Finder
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Occupancy Sync
              </span>
            </div>
            <p className="text-xs text-[#3D5A80]">
              AI Space Recommendation • 3D Building Inspection • Timetable-Aware Proximity Routing
            </p>
          </div>
        </div>

        {/* Sub-view Switcher + Live Clock */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-[#E8F1FA] p-1 border border-[#CDE1F2]">
            <button
              type="button"
              onClick={() => setSubView('explorer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subView === 'explorer'
                  ? 'bg-[#1B3A6B] text-white shadow-xs'
                  : 'text-[#1B3A6B] hover:bg-white/60'
              }`}
            >
              🗺️ Map & 3D Explorer
            </button>
            <button
              type="button"
              onClick={() => setSubView('floor_matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subView === 'floor_matrix'
                  ? 'bg-[#1B3A6B] text-white shadow-xs'
                  : 'text-[#1B3A6B] hover:bg-white/60'
              }`}
            >
              🏢 Floor Matrix
            </button>
            <button
              type="button"
              onClick={() => setSubView('schedule_sync')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subView === 'schedule_sync'
                  ? 'bg-[#1B3A6B] text-white shadow-xs'
                  : 'text-[#1B3A6B] hover:bg-white/60'
              }`}
            >
              📅 Free-Slot Finder ({studentProfile.sectionId})
            </button>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white/90 border border-[#CDE1F2] text-xs font-mono-num font-bold text-[#0D1B2A] flex items-center gap-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>12:34 PM</span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          VIEW 1: MAIN 3-PANEL SMART CAMPUS EXPLORER (MATCHING REFERENCE DESIGN)
         ===================================================================== */}
      {subView === 'explorer' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          {/* -----------------------------------------------------------------
              LEFT PANEL (3 COLS): Tell Us What You Need + Next Activity + Floor Availability
             ----------------------------------------------------------------- */}
          <div className="xl:col-span-3 space-y-3.5">
            {/* Card 1: Tell Us What You Need */}
            <div className="liquid-glass-elevated rounded-[22px] p-4 space-y-3.5 border border-white">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#0D1B2A]">
                  Tell Us What You Need
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                  AI Parser
                </span>
              </div>

              <form onSubmit={handleRunSmartSearch} className="space-y-2.5">
                <div className="relative">
                  <textarea
                    rows={3}
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    placeholder="e.g., I need an AC room for 5 people near the Mechanical Lab for the next 2 hours..."
                    className="w-full rounded-2xl bg-white/95 border border-blue-200 p-3 pr-9 text-xs font-medium text-slate-800 shadow-inner focus:outline-none focus:border-blue-600 resize-none leading-relaxed"
                  />
                  <Sparkles className="w-4 h-4 text-blue-600 absolute right-3 top-3 pointer-events-none" />
                </div>

                {/* Preset Natural Language Prompts */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      const q =
                        'I need an AC room on the ground floor for me and my team for the next 2 hours.';
                      setQueryText(q);
                      setSelectedFacilities(['AC', 'Wi-Fi', 'Projector']);
                      setGroupSize(5);
                      setSelectedBuildingId('MECH');
                      setSelectedRoomId('M-204');
                    }}
                    className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-[10px] font-semibold text-blue-800 whitespace-nowrap cursor-pointer border border-blue-200/70"
                  >
                    Team AC Room (2h)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const q =
                        'I need a Computer Lab in the CSE Block for 12 people for 2 hours.';
                      setQueryText(q);
                      setSelectedFacilities(['AC', 'Wi-Fi', 'Computers', 'Lab Access']);
                      setGroupSize(12);
                      setSelectedBuildingId('CSE');
                      setSelectedRoomId('C-104');
                    }}
                    className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-[10px] font-semibold text-blue-800 whitespace-nowrap cursor-pointer border border-blue-200/70"
                  >
                    CSE AI Lab (12p)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const q =
                        'Quiet room in Central Library with Wi-Fi and Charging for 3 hours.';
                      setQueryText(q);
                      setSelectedFacilities(['AC', 'Wi-Fi', 'Charging']);
                      setGroupSize(4);
                      setSelectedBuildingId('LIB');
                      setSelectedRoomId('L-102');
                    }}
                    className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-[10px] font-semibold text-blue-800 whitespace-nowrap cursor-pointer border border-blue-200/70"
                  >
                    Quiet Library Pod
                  </button>
                </div>

                {/* Extracted Requirement Chips */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-900">
                    <Users className="w-3 h-3 text-blue-600" />
                    {extractedRequirements.groupSize} Students
                  </span>
                  {extractedRequirements.requiredFacilities.slice(0, 2).map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-[11px] font-bold text-sky-900"
                    >
                      {renderFacilityIcon(f)}
                      {f}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] font-bold text-indigo-900">
                    <Clock className="w-3 h-3 text-indigo-600" />
                    {extractedRequirements.durationHours} Hours
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-900">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    Near {extractedRequirements.nearDestination}
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>Find Best Space</span>
                  <Search className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Facility Filter Grid (AC, Wi-Fi, Projector, Computers, Lab Access, Charging) */}
              <div className="pt-2 border-t border-slate-200/80 space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      'AC',
                      'Wi-Fi',
                      'Projector',
                      'Computers',
                      'Lab Access',
                      'Charging',
                    ] as FacilityType[]
                  ).map((fac) => {
                    const active = selectedFacilities.includes(fac);
                    return (
                      <button
                        key={fac}
                        type="button"
                        onClick={() => toggleFacility(fac)}
                        className={`px-2 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white/80 text-slate-700 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <span className="truncate">{fac}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Group Size & Building Filter Row */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-white/85 rounded-xl px-2.5 py-1.5 border border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">
                      Group:
                    </span>
                    <select
                      value={groupSize}
                      onChange={(e) => setGroupSize(Number(e.target.value))}
                      className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                    >
                      {[2, 4, 5, 8, 10, 15, 25].map((n) => (
                        <option key={n} value={n}>
                          {n} People
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-white/85 rounded-xl px-2.5 py-1.5 border border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">
                      Block:
                    </span>
                    <select
                      value={buildingFilter}
                      onChange={(e) => {
                        setBuildingFilter(e.target.value);
                        if (e.target.value !== 'ALL') {
                          setSelectedBuildingId(e.target.value);
                        }
                      }}
                      className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer max-w-[92px] truncate"
                    >
                      <option value="ALL">All Blocks</option>
                      {CAMPUS_BUILDINGS.map((b) => (
                        <option key={b.buildingId} value={b.buildingId}>
                          {b.shortName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Your Next Activity (Schedule & Proximity Context) */}
            <div className="liquid-glass-elevated rounded-[22px] p-4 space-y-2.5 border border-white">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#0D1B2A]">
                  Your Next Activity
                </h3>
                <span className="text-[10px] font-semibold text-[#3D5A80]">
                  Click to route
                </span>
              </div>

              <div className="space-y-2">
                {DEFAULT_NEXT_ACTIVITIES.map((act) => {
                  const isSelected = activeNextActivity.id === act.id;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setActiveNextActivity(act)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/95 border-blue-400 shadow-xs'
                          : 'bg-white/75 border-slate-200/80 hover:bg-white'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          act.type === 'lab'
                            ? 'bg-amber-100 text-amber-800'
                            : act.type === 'discussion'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold text-slate-600">
                          {act.timeRange}
                        </div>
                        <div className="text-xs font-extrabold text-[#0D1B2A] truncate">
                          {act.title}
                        </div>
                        <div className="text-[10px] font-semibold text-blue-700 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          <span>
                            {act.locationName} ({act.roomCode})
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card 3: Floor-Wise Availability Mini Matrix */}
            <div className="liquid-glass-elevated rounded-[22px] p-4 space-y-2.5 border border-white">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#0D1B2A]">
                  Floor-Wise Availability
                </h3>
                <span className="text-[10px] font-bold text-blue-700">
                  {activeBuildingMeta.shortName}
                </span>
              </div>

              <div className="space-y-2">
                {[
                  {
                    flLabel: 'GF',
                    flNum: 0,
                    pills: [
                      { id: 'M-101', state: 'red' },
                      { id: 'M-102', state: 'green' },
                      { id: 'M-103', state: 'yellow' },
                      { id: 'M-104', state: 'red' },
                    ],
                  },
                  {
                    flLabel: '1F',
                    flNum: 1,
                    pills: [
                      { id: 'M-204', state: 'green' },
                      { id: 'M-201', state: 'green' },
                      { id: 'A-204', state: 'yellow' },
                    ],
                  },
                ].map((row) => (
                  <div
                    key={row.flLabel}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="w-7 font-mono-num font-extrabold text-slate-600 text-[11px]">
                      {row.flLabel}
                    </span>
                    <div className="flex flex-wrap gap-1.5 flex-1">
                      {row.pills.map((p) => {
                        const matchedRoom = evaluatedRooms.find(
                          (r) => r.roomId === p.id
                        );
                        const isSelected = selectedRoomId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              if (matchedRoom) handleSelectRoom(matchedRoom);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold text-white shadow-2xs transition-transform cursor-pointer ${
                              isSelected ? 'ring-2 ring-slate-900 scale-105' : ''
                            } ${
                              p.state === 'green'
                                ? 'bg-emerald-500 hover:bg-emerald-600'
                                : p.state === 'yellow'
                                ? 'bg-amber-500 hover:bg-amber-600'
                                : 'bg-rose-500 hover:bg-rose-600'
                            }`}
                          >
                            {p.id}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              CENTER PANEL (6 COLS): Interactive Isometric Campus Map + Docked 3D Building Viewer
             ----------------------------------------------------------------- */}
          <div className="xl:col-span-6 space-y-3">
            <div className="liquid-glass-elevated rounded-[26px] p-3 border border-white shadow-xl relative overflow-hidden">
              {/* Top Floating Map Action Pills (`Campus Map | 3D Building View | Street View | Navigate`) */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 px-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIs3dModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-[#1B3A6B] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-sky-300" />
                    <span>Campus Map</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIs3dModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-[#0D1B2A] border border-blue-200 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>3D Building View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsStreetViewOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-[#0D1B2A] border border-blue-200 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Street View</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNavigateActive(!isNavigateActive)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-all ${
                    isNavigateActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white/90 text-[#0D1B2A] border border-blue-200'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Navigate</span>
                </button>
              </div>

              {/* ISOMETRIC ARCHITECTURAL CAMPUS MAP CANVAS */}
              <div className="relative w-full h-[640px] sm:h-[670px] rounded-[22px] overflow-hidden border border-emerald-900/15 shadow-inner bg-[#cbe7a6]">
                {/* Isometric Campus SVG Grounds, Roads, Trees, Courtyards, and 3D-Styled Buildings */}
                <svg
                  viewBox="0 0 1000 720"
                  preserveAspectRatio="xMidYMid slice"
                  className="w-full h-full select-none"
                >
                  <defs>
                    <linearGradient id="lawnGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#d9f0b8" />
                      <stop offset="50%" stopColor="#bfe096" />
                      <stop offset="100%" stopColor="#9ec973" />
                    </linearGradient>
                    <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f8fafc" />
                      <stop offset="100%" stopColor="#cbd5e1" />
                    </linearGradient>
                    <linearGradient id="roofBlue" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                    <linearGradient id="wallLight" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#e2e8f0" />
                    </linearGradient>
                    <linearGradient id="wallShade" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#cbd5e1" />
                      <stop offset="100%" stopColor="#94a3b8" />
                    </linearGradient>
                    <filter id="dropShadow" x="-10%" y="-10%" width="130%" height="130%">
                      <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.22" />
                    </filter>
                  </defs>

                  {/* Base Campus Lawn */}
                  <rect width="1000" height="720" fill="url(#lawnGrad)" />

                  {/* Decorative Isometric Campus Quadrangles & Green Zones */}
                  <polygon
                    points="120,160 520,60 880,190 480,340"
                    fill="#b3dc86"
                    stroke="#ecfccb"
                    strokeWidth="3"
                  />
                  <polygon
                    points="80,360 470,220 890,380 460,560"
                    fill="#c5e69e"
                    stroke="#ecfccb"
                    strokeWidth="3"
                  />

                  {/* Campus Paved Walkways & Courtyards */}
                  <path
                    d="M 80 460 Q 310 340 520 260 T 920 150"
                    fill="none"
                    stroke="url(#roadGrad)"
                    strokeWidth="34"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 210 120 Q 390 270 460 440 T 680 680"
                    fill="none"
                    stroke="url(#roadGrad)"
                    strokeWidth="28"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 160 280 L 420 380 L 760 240"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />

                  {/* Running Track / Sports Oval in Top-Right */}
                  <g transform="translate(760, 145) rotate(-14)">
                    <rect
                      x="-95"
                      y="-48"
                      width="190"
                      height="96"
                      rx="48"
                      fill="#ea580c"
                      stroke="#fed7aa"
                      strokeWidth="5"
                    />
                    <rect
                      x="-72"
                      y="-30"
                      width="144"
                      height="60"
                      rx="30"
                      fill="#4ade80"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </g>

                  {/* Isometric 3D Building Blocks */}
                  {/* 1. CENTRAL LIBRARY (Top-Center-Left) */}
                  <g
                    transform="translate(310, 95)"
                    filter="url(#dropShadow)"
                    className="cursor-pointer"
                    onClick={() => setSelectedBuildingId('LIB')}
                  >
                    <polygon points="0,28 75,0 150,28 75,56" fill="url(#roofBlue)" />
                    <polygon points="0,28 75,56 75,105 0,77" fill="url(#wallLight)" />
                    <polygon points="150,28 75,56 75,105 150,77" fill="url(#wallShade)" />
                    <rect x="18" y="48" width="42" height="22" rx="3" fill="#38bdf8" opacity="0.7" />
                    <rect x="88" y="48" width="42" height="22" rx="3" fill="#0284c7" opacity="0.7" />
                  </g>

                  {/* 2. SCIENCE BLOCK (Top-Center-Right) */}
                  <g
                    transform="translate(505, 105)"
                    filter="url(#dropShadow)"
                    className="cursor-pointer"
                    onClick={() => setSelectedBuildingId('SCI')}
                  >
                    <polygon points="0,26 70,0 140,26 70,52" fill="#cbd5e1" />
                    <polygon points="15,24 70,4 125,24 70,44" fill="url(#roofBlue)" />
                    <polygon points="0,26 70,52 70,102 0,76" fill="url(#wallLight)" />
                    <polygon points="140,26 70,52 70,102 140,76" fill="url(#wallShade)" />
                  </g>

                  {/* 3. ACADEMIC BLOCK A (Center) */}
                  <g
                    transform="translate(375, 190)"
                    filter="url(#dropShadow)"
                    className="cursor-pointer"
                    onClick={() => setSelectedBuildingId('ACAD')}
                  >
                    <polygon points="0,34 95,0 190,34 95,68" fill="#e2e8f0" />
                    <polygon points="18,32 95,5 172,32 95,59" fill="url(#roofBlue)" />
                    <polygon points="0,34 95,68 95,132 0,98" fill="url(#wallLight)" />
                    <polygon points="190,34 95,68 95,132 190,98" fill="url(#wallShade)" />
                    {/* Glowing Status Windows */}
                    <rect x="20" y="60" width="22" height="14" rx="2" fill="#10b981" />
                    <rect x="50" y="70" width="22" height="14" rx="2" fill="#f59e0b" />
                    <rect x="112" y="68" width="24" height="14" rx="2" fill="#10b981" />
                    <rect x="144" y="56" width="24" height="14" rx="2" fill="#ef4444" />
                  </g>

                  {/* 4. MECHANICAL / ENGINEERING BLOCK (Center-Left Hero Highlighted Building!) */}
                  <g
                    transform="translate(135, 225)"
                    filter="url(#dropShadow)"
                    className="cursor-pointer"
                    onClick={() => setSelectedBuildingId('MECH')}
                  >
                    {/* Active Building Selection Halo */}
                    {selectedBuildingId === 'MECH' && (
                      <ellipse
                        cx="105"
                        cy="85"
                        rx="118"
                        ry="66"
                        fill="rgba(16, 185, 129, 0.18)"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeDasharray="8 5"
                      />
                    )}
                    <polygon points="0,38 105,0 210,38 105,76" fill="#f1f5f9" />
                    <polygon points="22,36 105,6 188,36 105,66" fill="url(#roofBlue)" />
                    <polygon points="0,38 105,76 105,152 0,114" fill="url(#wallLight)" />
                    <polygon points="210,38 105,76 105,152 210,114" fill="url(#wallShade)" />
                    {/* Highlighted Green Room Windows (M-204 & M-201) */}
                    <rect x="20" y="64" width="28" height="16" rx="3" fill="#10b981" />
                    <rect x="56" y="76" width="28" height="16" rx="3" fill="#10b981" />
                    <rect x="20" y="88" width="28" height="16" rx="3" fill="#ef4444" />
                    <rect x="120" y="78" width="28" height="16" rx="3" fill="#10b981" />
                    <rect x="156" y="65" width="28" height="16" rx="3" fill="#f59e0b" />
                  </g>

                  {/* 5. CSE BLOCK (Bottom-Left) */}
                  <g
                    transform="translate(120, 390)"
                    filter="url(#dropShadow)"
                    className="cursor-pointer"
                    onClick={() => setSelectedBuildingId('CSE')}
                  >
                    <polygon points="0,34 90,0 180,34 90,68" fill="#e2e8f0" />
                    <polygon points="18,32 90,6 162,32 90,58" fill="url(#roofBlue)" />
                    <polygon points="0,34 90,68 90,134 0,100" fill="url(#wallLight)" />
                    <polygon points="180,34 90,68 90,134 180,100" fill="url(#wallShade)" />
                    <rect x="24" y="62" width="25" height="14" rx="2" fill="#f59e0b" />
                    <rect x="115" y="66" width="25" height="14" rx="2" fill="#10b981" />
                  </g>

                  {/* 6. ADMIN BLOCK (Center-Bottom) */}
                  <g
                    transform="translate(365, 345)"
                    filter="url(#dropShadow)"
                    className="cursor-pointer"
                    onClick={() => setSelectedBuildingId('ADMIN')}
                  >
                    <polygon points="0,30 80,0 160,30 80,60" fill="#e2e8f0" />
                    <polygon points="0,30 80,60 80,115 0,85" fill="url(#wallLight)" />
                    <polygon points="160,30 80,60 80,115 160,85" fill="url(#wallShade)" />
                  </g>

                  {/* 7. HOSTEL BLOCK (Center-Right) */}
                  <g
                    transform="translate(590, 200)"
                    filter="url(#dropShadow)"
                    className="cursor-pointer"
                    onClick={() => setSelectedBuildingId('HOSTEL')}
                  >
                    <polygon points="0,28 75,0 150,28 75,56" fill="#fed7aa" />
                    <polygon points="0,28 75,56 75,112 0,84" fill="url(#wallLight)" />
                    <polygon points="150,28 75,56 75,112 150,84" fill="url(#wallShade)" />
                  </g>

                  {/* Campus Trees */}
                  {[
                    [95, 210],
                    [350, 175],
                    [330, 310],
                    [565, 185],
                    [555, 315],
                    [315, 460],
                    [520, 465],
                    [740, 290],
                    [105, 535],
                  ].map(([tx, ty], idx) => (
                    <g key={idx} transform={`translate(${tx}, ${ty})`}>
                      <circle cx="0" cy="0" r="16" fill="#15803d" opacity="0.35" />
                      <circle cx="-3" cy="-4" r="14" fill="#22c55e" />
                      <circle cx="4" cy="-2" r="11" fill="#4ade80" />
                    </g>
                  ))}

                  {/* Animated Walking Path from Selected Room to Next Activity */}
                  {isNavigateActive && (
                    <g>
                      <path
                        d="M 240 310 Q 320 345 365 305 T 455 255"
                        fill="none"
                        stroke="#1d4ed8"
                        strokeWidth="6"
                        strokeDasharray="10 8"
                        strokeLinecap="round"
                      />
                      <circle cx="240" cy="310" r="8" fill="#10b981" stroke="#ffffff" strokeWidth="3" />
                      <circle cx="455" cy="255" r="8" fill="#2563eb" stroke="#ffffff" strokeWidth="3" />
                    </g>
                  )}
                </svg>

                {/* INTERACTIVE HTML OVERLAY PINS & LABELS ON CAMPUS MAP */}
                {/* Building Pill Labels */}
                {CAMPUS_BUILDINGS.map((b) => {
                  const isSelected = selectedBuildingId === b.buildingId;
                  return (
                    <button
                      key={b.buildingId}
                      type="button"
                      onClick={() => setSelectedBuildingId(b.buildingId)}
                      style={{
                        left: `${b.mapPosition.x}%`,
                        top: `${b.mapPosition.y}%`,
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full text-[11px] font-extrabold shadow-md flex items-center gap-1.5 transition-all cursor-pointer z-10 ${
                        isSelected
                          ? 'bg-blue-700 text-white ring-2 ring-white scale-105'
                          : 'bg-slate-900/80 text-white hover:bg-slate-900 backdrop-blur-xs'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      <span>{b.shortName}</span>
                    </button>
                  );
                })}

                {/* Highlighted Room Callout Pins on Map (M-204 96%, M-201 84%, A-112 68%, C-305 62%) */}
                {evaluatedRooms.slice(0, 4).map((rm) => {
                  const isSelected = activeRoom.roomId === rm.roomId;
                  const badgeBg =
                    rm.availabilityState === 'green'
                      ? 'bg-emerald-600 border-emerald-200'
                      : rm.availabilityState === 'yellow'
                      ? 'bg-amber-500 border-amber-200'
                      : 'bg-rose-600 border-rose-200';

                  return (
                    <button
                      key={rm.roomId}
                      type="button"
                      onClick={() => handleSelectRoom(rm)}
                      style={{
                        left: `${rm.mapCoords.x}%`,
                        top: `${rm.mapCoords.y + 7}%`,
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl text-white border-2 shadow-lg flex items-center gap-1.5 cursor-pointer transition-all z-20 ${badgeBg} ${
                        isSelected ? 'scale-110 ring-4 ring-white/80 z-30' : 'hover:scale-105'
                      }`}
                    >
                      <span className="text-xs font-extrabold">{rm.roomId}</span>
                      <span className="text-[10px] font-mono-num bg-black/25 px-1.5 py-0.2 rounded-md font-bold">
                        {rm.matchPercentage}%
                      </span>
                    </button>
                  );
                })}

                {/* Walking Distance Pill Callout on Map (`2 min walk to Mechanical Lab`) */}
                {isNavigateActive && (
                  <div
                    style={{ left: '34%', top: '41%' }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 bg-blue-700/95 text-white px-3 py-1.5 rounded-full shadow-lg border border-blue-300 flex items-center gap-1.5 text-[11px] font-bold pointer-events-none"
                  >
                    <span>🚶 {activeRoom.walkingMinutesToNext} min walk to {activeNextActivity.locationName}</span>
                  </div>
                )}

                {/* Bottom-Left Map Legend + Availability Status Bar matching Reference Image */}
                <div className="absolute bottom-3 left-3 z-20 max-w-[250px] space-y-2">
                  <div className="rounded-2xl bg-white/95 backdrop-blur-md p-3 border border-white shadow-lg space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shrink-0" />
                      <span>Empty + matches your needs</span>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <span className="w-3 h-3 rounded-full bg-amber-400 inline-block shrink-0" />
                      <span>Empty, doesn't match</span>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shrink-0" />
                      <span>Occupied</span>
                    </div>
                  </div>

                  {/* Selected Room Quick Status Strip */}
                  <div className="rounded-2xl bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2.5 border border-slate-700 shadow-lg flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white font-extrabold text-[11px]">
                        {activeRoom.roomId}
                      </span>
                      <span className="font-bold text-emerald-300 text-[11px]">
                        Available Now
                      </span>
                    </div>
                    <span className="text-[11px] font-mono-num text-slate-300">
                      {activeRoom.freeDurationLabel}
                    </span>
                  </div>
                </div>

                {/* DOCKED BOTTOM-RIGHT 3D BUILDING VIEWER OVERLAY (EXACTLY MATCHING REFERENCE IMAGE!) */}
                <div className="hidden sm:block absolute bottom-3 right-3 z-30 w-[355px] h-[315px]">
                  <ThreeBuildingViewer
                    selectedBuildingId={selectedBuildingId}
                    selectedFloor={selectedFloor}
                    selectedRoomId={activeRoom.roomId}
                    rooms={evaluatedRooms}
                    onSelectBuilding={(bId) => setSelectedBuildingId(bId)}
                    onSelectFloor={(fl) => setSelectedFloor(fl)}
                    onSelectRoom={handleSelectRoom}
                    onToggleExpand={() => setIs3dModalOpen(true)}
                  />
                </div>
              </div>

              {/* Mobile-visible 3D Building Viewer (below map on small screens) */}
              <div className="sm:hidden mt-3 h-[320px]">
                <ThreeBuildingViewer
                  selectedBuildingId={selectedBuildingId}
                  selectedFloor={selectedFloor}
                  selectedRoomId={activeRoom.roomId}
                  rooms={evaluatedRooms}
                  onSelectBuilding={(bId) => setSelectedBuildingId(bId)}
                  onSelectFloor={(fl) => setSelectedFloor(fl)}
                  onSelectRoom={handleSelectRoom}
                  onToggleExpand={() => setIs3dModalOpen(true)}
                />
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              RIGHT PANEL (3 COLS): Best Match Hero Card + Why This Room? + Other Good Options
             ----------------------------------------------------------------- */}
          <div className="xl:col-span-3 space-y-3.5">
            {/* Best Match Hero Card */}
            <div className="liquid-glass-elevated rounded-[24px] p-4 space-y-3.5 border border-white shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Best Match
                    </span>
                    {checkedInRoomIds.includes(activeRoom.roomId) && (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                        Checked In ✓
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#0D1B2A] mt-1">
                    {activeRoom.roomId}
                  </h3>
                  <p className="text-xs font-semibold text-[#3D5A80]">
                    {activeRoom.building} • {activeRoom.floorLabel}
                  </p>
                </div>

                {/* Match Percentage Badge */}
                <div
                  className={`px-3 py-1.5 rounded-2xl text-white font-extrabold text-right shadow-sm ${
                    activeRoom.availabilityState === 'green'
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                      : activeRoom.availabilityState === 'yellow'
                      ? 'bg-gradient-to-br from-amber-500 to-orange-500'
                      : 'bg-gradient-to-br from-rose-500 to-red-600'
                  }`}
                >
                  <div className="text-lg font-mono-num leading-tight">
                    {activeRoom.matchPercentage}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wider opacity-95">
                    Match
                  </div>
                </div>
              </div>

              {/* Classroom Photo Preview with Available Now Pill & View Photos Button */}
              <div className="relative h-36 w-full rounded-2xl overflow-hidden border border-slate-200 group">
                <img
                  src={activeRoom.imageUrl}
                  alt={activeRoom.roomName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-slate-950/20" />
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-emerald-500/95 text-white text-[11px] font-extrabold flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>
                    {activeRoom.isCurrentlyFree ? 'Available Now' : 'Occupied'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoModalRoom(activeRoom)}
                  className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-xl bg-white/90 hover:bg-white text-slate-900 text-[11px] font-bold shadow-md cursor-pointer"
                >
                  📷 View Photos
                </button>
              </div>

              {/* Time Window & Walking Distance Summary */}
              <div className="space-y-1.5 text-xs bg-blue-50/70 p-3 rounded-xl border border-blue-200/70">
                <div className="flex items-center gap-1.5 font-bold text-[#0D1B2A]">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    {formatTime12h(activeRoom.availableFrom)} –{' '}
                    {formatTime12h(activeRoom.availableUntil)}
                  </span>
                  <span className="text-emerald-700 font-mono-num text-[11px]">
                    ({activeRoom.freeDurationLabel})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-[#1B3A6B]">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    {activeRoom.walkingMinutesToNext} min walk to{' '}
                    {activeNextActivity.locationName} (
                    {activeRoom.distanceMetersToNext}m)
                  </span>
                </div>
              </div>

              {/* 5-Point Match Checklist (`AC available`, `Wi-Fi available`, etc.) */}
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {activeRoom.matchReasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-1.5 font-semibold ${
                       idx === activeRoom.matchReasons.length - 1
                        ? 'col-span-2'
                        : ''
                    } ${
                      reason.matched ? 'text-slate-800' : 'text-amber-700'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        reason.matched ? 'text-emerald-600' : 'text-amber-500'
                      }`}
                    />
                    <span className="truncate">{reason.label}</span>
                  </div>
                ))}
              </div>

              {/* Navigate & View Schedule Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsNavigateActive(true)}
                  className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Navigate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleModalRoom(activeRoom)}
                  className="py-2.5 px-3 rounded-xl bg-white hover:bg-blue-50 text-[#1B3A6B] border border-blue-200 font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>View Schedule</span>
                </button>
              </div>
            </div>

            {/* Why This Room? Explanation Box */}
            <div className="liquid-glass-elevated rounded-[22px] p-4 space-y-1.5 border border-white">
              <h4 className="text-xs font-extrabold text-[#0D1B2A] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Why This Room?</span>
              </h4>
              <p className="text-xs text-[#3D5A80] leading-relaxed">
                {activeRoom.whyThisRoomText}
              </p>
            </div>

            {/* Other Good Options Ranked List */}
            <div className="liquid-glass-elevated rounded-[22px] p-4 space-y-2.5 border border-white">
              <h4 className="text-xs font-extrabold text-[#0D1B2A]">
                Other Good Options
              </h4>
              <div className="space-y-2">
                {otherGoodOptions.map((opt) => {
                  const badgeClass =
                    opt.availabilityState === 'green'
                      ? 'bg-emerald-500 text-white'
                      : opt.availabilityState === 'yellow'
                      ? 'bg-amber-500 text-white'
                      : 'bg-rose-500 text-white';

                  return (
                    <button
                      key={opt.roomId}
                      type="button"
                      onClick={() => handleSelectRoom(opt)}
                      className="w-full text-left p-2.5 rounded-2xl bg-white/85 hover:bg-white border border-slate-200/90 transition-all flex items-center justify-between gap-2 cursor-pointer shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-extrabold text-[#0D1B2A]">
                            {opt.roomId}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 truncate">
                            {opt.building} • {opt.floorLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                          Free {formatTime12h(opt.availableFrom)} –{' '}
                          {formatTime12h(opt.availableUntil)}
                        </div>
                        <div className="text-[10px] font-semibold text-blue-700 mt-0.5">
                          {opt.facilities.includes('AC') ? 'AC • ' : 'No AC • '}
                          {opt.walkingMinutesToNext} min walk
                        </div>
                      </div>

                      <div
                        className={`px-2.5 py-1 rounded-xl font-mono-num text-xs font-extrabold shrink-0 ${badgeClass}`}
                      >
                        {opt.matchPercentage}%
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 2: FULL FLOOR-WISE AVAILABILITY MATRIX (ALL BUILDINGS & FLOORS)
         ===================================================================== */}
      {subView === 'floor_matrix' && (
        <div className="liquid-glass-elevated rounded-[24px] p-6 space-y-5 border border-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-[#0D1B2A]">
                Campus-Wide Floor Availability Matrix
              </h3>
              <p className="text-xs text-[#3D5A80]">
                Select any building to inspect room-by-room availability across Ground Floor to 3rd Floor
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {CAMPUS_BUILDINGS.map((b) => (
                <button
                  key={b.buildingId}
                  type="button"
                  onClick={() => setSelectedBuildingId(b.buildingId)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    selectedBuildingId === b.buildingId
                      ? 'bg-[#1B3A6B] text-white shadow-sm'
                      : 'bg-white/80 text-[#0D1B2A] border border-[#CDE1F2] hover:bg-white'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {evaluatedRooms
              .filter(
                (r) =>
                  selectedBuildingId === 'ALL' ||
                  r.buildingId === selectedBuildingId
              )
              .map((rm) => (
                <div
                  key={rm.roomId}
                  onClick={() => {
                    handleSelectRoom(rm);
                    setSubView('explorer');
                  }}
                  className="p-4 rounded-2xl bg-white/90 border border-[#CDE1F2] hover:border-blue-500 shadow-xs flex flex-col justify-between gap-3 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                        {rm.building} • {rm.floorLabel}
                      </span>
                      <h4 className="text-base font-extrabold text-[#0D1B2A]">
                        {rm.roomName}
                      </h4>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono-num font-extrabold text-white ${
                        rm.availabilityState === 'green'
                          ? 'bg-emerald-500'
                          : rm.availabilityState === 'yellow'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    >
                      {rm.matchPercentage}%
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {rm.facilities.map((f) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold"
                      >
                        {f}
                      </span>
                    ))}
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[11px] font-semibold">
                      {rm.capacity} seats
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span
                      className={`font-bold ${
                        rm.isCurrentlyFree ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {rm.freeDurationLabel}
                    </span>
                    <span className="text-blue-700 font-semibold">
                      Inspect on Map →
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 3: STUDENT TIMETABLE & AUTO FREE-SLOT SPACE RECOMMENDER
         ===================================================================== */}
      {subView === 'schedule_sync' && (
        <div className="liquid-glass-elevated rounded-[24px] p-6 space-y-5 border border-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-[#0D1B2A]">
                Timetable-Synced Free Period Space Recommender ({studentProfile.sectionId})
              </h3>
              <p className="text-xs text-[#3D5A80]">
                Automatically detects gaps between your scheduled classes and recommends nearby rooms before your next class
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {studentDayTimeline.map((item, index) => (
              <div
                key={index}
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  item.isFree
                    ? 'bg-emerald-50/90 border-emerald-300 shadow-xs'
                    : 'bg-white/85 border-[#CDE1F2]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-num text-xs font-extrabold text-[#1B3A6B]">
                      {item.timeRange}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        item.isFree
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.isFree ? 'Free Study Slot Detected' : item.subjectCode}
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-[#0D1B2A]">
                    {item.title}
                  </div>
                  <div className="text-xs text-[#3D5A80]">
                    Location: <strong>{item.building}</strong>
                  </div>
                </div>

                {item.isFree && (
                  <button
                    type="button"
                    onClick={() => {
                      setQueryText(
                        `I need an AC room for 5 people near ${item.building} from ${item.timeRange}.`
                      );
                      setSubView('explorer');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer shrink-0"
                  >
                    Find Best Room for This Slot →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: EXPANDED FULLSCREEN 3D BUILDING VIEWER
         ===================================================================== */}
      {is3dModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="max-w-4xl w-full">
            <ThreeBuildingViewer
              selectedBuildingId={selectedBuildingId}
              selectedFloor={selectedFloor}
              selectedRoomId={activeRoom.roomId}
              rooms={evaluatedRooms}
              onSelectBuilding={(bId) => setSelectedBuildingId(bId)}
              onSelectFloor={(fl) => setSelectedFloor(fl)}
              onSelectRoom={(rm) => {
                handleSelectRoom(rm);
              }}
              isExpandedModal
              onToggleExpand={() => setIs3dModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: ROOM PHOTO GALLERY & INTERIOR INSPECTION
         ===================================================================== */}
      {photoModalRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-[#0D1B2A]">
                  {photoModalRoom.roomName} — Interior Gallery
                </h3>
                <p className="text-xs text-[#3D5A80]">
                  {photoModalRoom.building} • {photoModalRoom.floorLabel} • Capacity:{' '}
                  {photoModalRoom.capacity} seats
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPhotoModalRoom(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {photoModalRoom.galleryUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${photoModalRoom.roomId} view ${i + 1}`}
                  className="w-full h-44 object-cover rounded-2xl border border-slate-200"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: ROOM DAILY SCHEDULE & INSTANT CHECK-IN
         ===================================================================== */}
      {scheduleModalRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-[#0D1B2A]">
                  Room {scheduleModalRoom.roomId} — Today's Schedule
                </h3>
                <p className="text-xs text-[#3D5A80]">
                  {scheduleModalRoom.building} ({scheduleModalRoom.floorLabel})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModalRoom(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {scheduleModalRoom.baseSchedule.map((slot, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                    slot.isOccupied
                      ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  }`}
                >
                  <div>
                    <div className="font-mono-num font-bold">
                      {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)}
                    </div>
                    <div className="font-extrabold mt-0.5">{slot.title}</div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      slot.isOccupied
                        ? 'bg-rose-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {slot.isOccupied ? 'Occupied' : 'Free Window'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setScheduleModalRoom(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
              {scheduleModalRoom.isCurrentlyFree && (
                <button
                  type="button"
                  onClick={() => {
                    if (!checkedInRoomIds.includes(scheduleModalRoom.roomId)) {
                      setCheckedInRoomIds([
                        ...checkedInRoomIds,
                        scheduleModalRoom.roomId,
                      ]);
                    }
                    setScheduleModalRoom(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Check In to Free Slot</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: CAMPUS STREET VIEW / COURTYARD WALKTHROUGH
         ===================================================================== */}
      {isStreetViewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-[#0D1B2A]">
                  Campus Street View — {activeRoom.building} Walkway
                </h3>
                <p className="text-xs text-[#3D5A80]">
                  Walking route from Main Academic Quad to {activeRoom.roomId} ({activeRoom.distanceMetersToNext}m to {activeNextActivity.locationName})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStreetViewOpen(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative h-72 rounded-2xl overflow-hidden border border-slate-200">
              <img
                src={activeRoom.imageUrl}
                alt="Campus Corridor Street View"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
                <span className="text-xs font-bold text-emerald-300">
                  📍 Entrance: {activeRoom.building} ({activeRoom.floorLabel})
                </span>
                <h4 className="text-lg font-extrabold">
                  Room {activeRoom.roomId} — {activeRoom.matchPercentage}% Match
                </h4>
                <p className="text-xs text-slate-200 mt-0.5">
                  Walk straight 120m along the shaded quad, take the West Atrium stairs to {activeRoom.floorLabel}.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
