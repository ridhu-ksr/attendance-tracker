import { SectionInfo, TimetableSlot, InitialSubjectAttendance, DayOfWeek, PeriodType } from '../types/attendance';

export const PERIOD_TIMINGS: { period: number; startTime: string; endTime: string }[] = [
  { period: 1, startTime: '08:45', endTime: '09:35' },
  { period: 2, startTime: '09:35', endTime: '10:25' },
  // Tea Break 10:25 - 10:40
  { period: 3, startTime: '10:40', endTime: '11:30' },
  { period: 4, startTime: '11:30', endTime: '12:20' },
  // Lunch Break 12:20 - 13:10
  { period: 5, startTime: '13:10', endTime: '14:00' },
  { period: 6, startTime: '14:00', endTime: '14:50' },
  { period: 7, startTime: '14:50', endTime: '15:40' },
  { period: 8, startTime: '15:40', endTime: '16:15' },
  { period: 9, startTime: '16:15', endTime: '16:45' },
];

export const SECTIONS_LIST: SectionInfo[] = [
  {
    sectionId: 'IV-ECE-A',
    sectionName: 'IV ECE - A',
    department: 'Electronics & Communication Engineering',
    year: 'IV Year',
    semester: 'Semester VII',
    room: 'Block C - 401',
    classAdvisor: 'Dr. S. Karthikeyan',
  },
  {
    sectionId: 'IV-ECE-B',
    sectionName: 'IV ECE - B',
    department: 'Electronics & Communication Engineering',
    year: 'IV Year',
    semester: 'Semester VII',
    room: 'Block C - 402',
    classAdvisor: 'Prof. M. Vijayalakshmi',
  },
  {
    sectionId: 'III-ECE-A',
    sectionName: 'III ECE - A',
    department: 'Electronics & Communication Engineering',
    year: 'III Year',
    semester: 'Semester V',
    room: 'Block C - 301',
    classAdvisor: 'Dr. R. Nandakumar',
  },
  {
    sectionId: 'III-ECE-B',
    sectionName: 'III ECE - B',
    department: 'Electronics & Communication Engineering',
    year: 'III Year',
    semester: 'Semester V',
    room: 'Block C - 302',
    classAdvisor: 'Prof. K.Deepa',
  },
  {
    sectionId: 'III-ECE-DS',
    sectionName: 'III ECE - DS',
    department: 'Electronics & Communication Engineering (Data Science)',
    year: 'III Year',
    semester: 'Semester V',
    room: 'Block C - 305',
    classAdvisor: 'Dr. P. Arunachalam',
  },
  {
    sectionId: 'II-ECE-A',
    sectionName: 'II ECE - A',
    department: 'Electronics & Communication Engineering',
    year: 'II Year',
    semester: 'Semester III',
    room: 'Block C - 201',
    classAdvisor: 'Prof. V. Gayathri',
  },
  {
    sectionId: 'II-ECE-B',
    sectionName: 'II ECE - B',
    department: 'Electronics & Communication Engineering',
    year: 'II Year',
    semester: 'Semester III',
    room: 'Block C - 202',
    classAdvisor: 'Prof. T. Senthilkumar',
  },
  {
    sectionId: 'III-CSE-A',
    sectionName: 'III CSE - A',
    department: 'Computer Science & Engineering',
    year: 'III Year',
    semester: 'Semester V',
    room: 'Block A - 304',
    classAdvisor: 'Dr. A.Prakash',
  },
  {
    sectionId: 'III-CSE-B',
    sectionName: 'III CSE - B',
    department: 'Computer Science & Engineering',
    year: 'III Year',
    semester: 'Semester V',
    room: 'Block A - 305',
    classAdvisor: 'Prof. N. Lavanya',
  },
  {
    sectionId: 'II-CSE-A',
    sectionName: 'II CSE - A',
    department: 'Computer Science & Engineering',
    year: 'II Year',
    semester: 'Semester III',
    room: 'Block A - 204',
    classAdvisor: 'Dr. G.Ramesh',
  },
];

interface SubjectDef {
  code: string;
  name: string;
  slot: string;
  type: PeriodType;
  initConducted: number;
  initAttended: number;
}

const SECTION_SUBJECT_CATALOG: Record<string, Record<string, SubjectDef>> = {
  'IV-ECE-A': {
    A: { code: '22EC701', name: 'High Frequency Communication & RF Systems', slot: 'Slot A', type: 'lecture', initConducted: 38, initAttended: 34 },
    B: { code: '22EC702', name: 'Optical & Microwave Engineering', slot: 'Slot B', type: 'lecture', initConducted: 36, initAttended: 31 },
    C: { code: '22EC703', name: 'Embedded & Real-Time Operating Systems', slot: 'Slot C', type: 'lecture', initConducted: 35, initAttended: 27 },
    D: { code: '22EC711', name: 'Satellite Communication & Navigation', slot: 'Slot D', type: 'lecture', initConducted: 32, initAttended: 28 },
    E: { code: '22EC721', name: 'Machine Vision & Deep Learning', slot: 'Slot E', type: 'lecture', initConducted: 34, initAttended: 29 },
    F: { code: '22MG701', name: 'Principles of Management & Engineering Ethics', slot: 'Slot F', type: 'lecture', initConducted: 30, initAttended: 27 },
    L1: { code: '22EC704L', name: 'RF & Optical Communication Laboratory', slot: 'Lab L1', type: 'lab', initConducted: 24, initAttended: 22 },
    L2: { code: '22EC705P', name: 'Project Work Phase-I & Viva', slot: 'Lab L2', type: 'lab', initConducted: 24, initAttended: 21 },
    ACT: { code: '22AC701', name: 'Placement Training / TWM / Library', slot: 'Activity', type: 'activity', initConducted: 14, initAttended: 13 },
  },
  'IV-ECE-B': {
    A: { code: '22EC701', name: 'High Frequency Communication & RF Systems', slot: 'Slot A', type: 'lecture', initConducted: 38, initAttended: 33 },
    B: { code: '22EC702', name: 'Optical & Microwave Engineering', slot: 'Slot B', type: 'lecture', initConducted: 36, initAttended: 30 },
    C: { code: '22EC703', name: 'Embedded & Real-Time Operating Systems', slot: 'Slot C', type: 'lecture', initConducted: 34, initAttended: 31 },
    D: { code: '22EC712', name: '5G Wireless Networks & SDN', slot: 'Slot D', type: 'lecture', initConducted: 32, initAttended: 25 },
    E: { code: '22EC722', name: 'IoT System Design & Cloud', slot: 'Slot E', type: 'lecture', initConducted: 34, initAttended: 29 },
    F: { code: '22MG701', name: 'Principles of Management & Engineering Ethics', slot: 'Slot F', type: 'lecture', initConducted: 30, initAttended: 28 },
    L1: { code: '22EC704L', name: 'RF & Optical Communication Laboratory', slot: 'Lab L1', type: 'lab', initConducted: 24, initAttended: 21 },
    L2: { code: '22EC705P', name: 'Project Work Phase-I & Viva', slot: 'Lab L2', type: 'lab', initConducted: 24, initAttended: 22 },
    ACT: { code: '22AC701', name: 'Placement Training / TWM / Library', slot: 'Activity', type: 'activity', initConducted: 14, initAttended: 12 },
  },
  'III-ECE-A': {
    A: { code: '22EC501', name: 'Digital Signal Processing', slot: 'Slot A', type: 'lecture', initConducted: 40, initAttended: 35 },
    B: { code: '22EC502', name: 'Digital Communication Systems', slot: 'Slot B', type: 'lecture', initConducted: 38, initAttended: 31 },
    C: { code: '22EC503', name: 'VLSI Design & Verilog HDL', slot: 'Slot C', type: 'lecture', initConducted: 36, initAttended: 33 },
    D: { code: '22EC504', name: 'Microcontrollers & Embedded Interfacing', slot: 'Slot D', type: 'lecture', initConducted: 35, initAttended: 27 },
    E: { code: '22EC511', name: 'Antennas & Wave Propagation', slot: 'Slot E', type: 'lecture', initConducted: 32, initAttended: 29 },
    F: { code: '22CS509', name: 'Artificial Intelligence & Machine Learning', slot: 'Slot F', type: 'lecture', initConducted: 34, initAttended: 28 },
    L1: { code: '22EC505L', name: 'DSP & VLSI Design Laboratory', slot: 'Lab L1', type: 'lab', initConducted: 24, initAttended: 22 },
    L2: { code: '22EC506L', name: 'Embedded Systems & Communication Lab', slot: 'Lab L2', type: 'lab', initConducted: 24, initAttended: 21 },
    ACT: { code: '22AC501', name: 'Skill Development / TWM / Library', slot: 'Activity', type: 'activity', initConducted: 14, initAttended: 13 },
  },
  'III-ECE-B': {
    A: { code: '22EC501', name: 'Digital Signal Processing', slot: 'Slot A', type: 'lecture', initConducted: 40, initAttended: 34 },
    B: { code: '22EC502', name: 'Digital Communication Systems', slot: 'Slot B', type: 'lecture', initConducted: 38, initAttended: 33 },
    C: { code: '22EC503', name: 'VLSI Design & Verilog HDL', slot: 'Slot C', type: 'lecture', initConducted: 36, initAttended: 28 },
    D: { code: '22EC504', name: 'Microcontrollers & Embedded Interfacing', slot: 'Slot D', type: 'lecture', initConducted: 35, initAttended: 31 },
    E: { code: '22EC512', name: 'Medical Electronics & Biosensors', slot: 'Slot E', type: 'lecture', initConducted: 32, initAttended: 29 },
    F: { code: '22CS509', name: 'Artificial Intelligence & Machine Learning', slot: 'Slot F', type: 'lecture', initConducted: 34, initAttended: 30 },
    L1: { code: '22EC505L', name: 'DSP & VLSI Design Laboratory', slot: 'Lab L1', type: 'lab', initConducted: 24, initAttended: 21 },
    L2: { code: '22EC506L', name: 'Embedded Systems & Communication Lab', slot: 'Lab L2', type: 'lab', initConducted: 24, initAttended: 22 },
    ACT: { code: '22AC501', name: 'Skill Development / TWM / Library', slot: 'Activity', type: 'activity', initConducted: 14, initAttended: 13 },
  },
  'III-ECE-DS': {
    A: { code: '22EC501', name: 'Digital Signal Processing', slot: 'Slot A', type: 'lecture', initConducted: 40, initAttended: 36 },
    B: { code: '22DS501', name: 'Foundations of Data Science & Analytics', slot: 'Slot B', type: 'lecture', initConducted: 38, initAttended: 31 },
    C: { code: '22CS502', name: 'Database Management Systems (DBMS)', slot: 'Slot C', type: 'lecture', initConducted: 36, initAttended: 33 },
    D: { code: '22AI501', name: 'Artificial Intelligence', slot: 'Slot D', type: 'lecture', initConducted: 34, initAttended: 28 },
    E: { code: '22EC503', name: 'VLSI Design & Hardware Accelerators', slot: 'Slot E', type: 'lecture', initConducted: 32, initAttended: 29 },
    F: { code: '22MA501', name: 'Statistical Methods for Engineers', slot: 'Slot F', type: 'lecture', initConducted: 34, initAttended: 31 },
    L1: { code: '22DS504L', name: 'Data Science & AI Laboratory', slot: 'Lab L1', type: 'lab', initConducted: 24, initAttended: 22 },
    L2: { code: '22CS505L', name: 'DBMS & Signal Processing Lab', slot: 'Lab L2', type: 'lab', initConducted: 24, initAttended: 21 },
    ACT: { code: '22AC502', name: 'Coding Club / TWM / Library', slot: 'Activity', type: 'activity', initConducted: 14, initAttended: 13 },
  },
  'II-ECE-A': {
    A: { code: '22MA301', name: 'Transforms & Partial Differential Equations', slot: 'Slot A', type: 'lecture', initConducted: 38, initAttended: 33 },
    B: { code: '22EC301', name: 'Signals and Systems', slot: 'Slot B', type: 'lecture', initConducted: 36, initAttended: 31 },
    C: { code: '22EC302', name: 'Electronic Devices and Circuits', slot: 'Slot C', type: 'lecture', initConducted: 36, initAttended: 28 },
    D: { code: '22EC303', name: 'Digital System Design', slot: 'Slot D', type: 'lecture', initConducted: 34, initAttended: 31 },
    E: { code: '22EC304', name: 'Control Systems Engineering', slot: 'Slot E', type: 'lecture', initConducted: 32, initAttended: 29 },
    F: { code: '22CS301', name: 'Data Structures & C Programming', slot: 'Slot F', type: 'lecture', initConducted: 34, initAttended: 30 },
    L1: { code: '22EC305L', name: 'Electronic Devices & Digital Lab', slot: 'Lab L1', type: 'lab', initConducted: 24, initAttended: 22 },
    L2: { code: '22CS306L', name: 'Data Structures Laboratory', slot: 'Lab L2', type: 'lab', initConducted: 24, initAttended: 21 },
    ACT: { code: '22AC301', name: 'Aptitude / TWM / Library', slot: 'Activity', type: 'activity', initConducted: 14, initAttended: 13 },
  },
  'II-ECE-B': {
    A: { code: '22MA301', name: 'Transforms & Partial Differential Equations', slot: 'Slot A', type: 'lecture', initConducted: 38, initAttended: 34 },
    B: { code: '22EC301', name: 'Signals and Systems', slot: 'Slot B', type: 'lecture', initConducted: 36, initAttended: 29 },
    C: { code: '22EC302', name: 'Electronic Devices and Circuits', slot: 'Slot C', type: 'lecture', initConducted: 36, initAttended: 32 },
    D: { code: '22EC303', name: 'Digital System Design', slot: 'Slot D', type: 'lecture', initConducted: 34, initAttended: 30 },
    E: { code: '22EC304', name: 'Control Systems Engineering', slot: 'Slot E', type: 'lecture', initConducted: 32, initAttended: 25 },
    F: { code: '22CS301', name: 'Data Structures & C Programming', slot: 'Slot F', type: 'lecture', initConducted: 34, initAttended: 31 },
    L1: { code: '22EC305L', name: 'Electronic Devices & Digital Lab', slot: 'Lab L1', type: 'lab', initConducted: 24, initAttended: 22 },
    L2: { code: '22CS306L', name: 'Data Structures Laboratory', slot: 'Lab L2', type: 'lab', initConducted: 24, initAttended: 21 },
    ACT: { code: '22AC301', name: 'Aptitude / TWM / Library', slot: 'Activity', type: 'activity', initConducted: 14, initAttended: 13 },
  },
  'III-CSE-A': {
    A: { code: '22CS501', name: 'Computer Networks', slot: 'Slot A', type: 'lecture', initConducted: 38, initAttended: 34 },
    B: { code: '22CS502', name: 'Database Management Systems (DBMS)', slot: 'Slot B', type: 'lecture', initConducted: 36, initAttended: 33 },
    C: { code: '22CS503', name: 'Theory of Computation & Compiler Design', slot: 'Slot C', type: 'lecture', initConducted: 36, initAttended: 28 },
    D: { code: '22AI501', name: 'Artificial Intelligence', slot: 'Slot D', type: 'lecture', initConducted: 34, initAttended: 28 },
    E: { code: '22CS504', name: 'Operating Systems', slot: 'Slot E', type: 'lecture', initConducted: 34, initAttended: 31 },
    F: { code: '22CS511', name: 'Full Stack Web Architecture', slot: 'Slot F', type: 'lecture', initConducted: 32, initAttended: 29 },
    L1: { code: '22CS505L', name: 'DBMS & Networks Laboratory', slot: 'Lab L1', type: 'lab', initConducted: 24, initAttended: 22 },
    L2: { code: '22AI506L', name: 'Artificial Intelligence & OS Lab', slot: 'Lab L2', type: 'lab', initConducted: 24, initAttended: 21 },
    ACT: { code: '22AC501', name: 'Competitive Coding / TWM / Library', slot: 'Activity', type: 'activity', initConducted: 14, initAttended: 13 },
  },
  'III-CSE-B': {
    A: { code: '22CS501', name: 'Computer Networks', slot: 'Slot A', type: 'lecture', initConducted: 38, initAttended: 33 },
    B: { code: '22CS502', name: 'Database Management Systems (DBMS)', slot: 'Slot B', type: 'lecture', initConducted: 36, initAttended: 32 },
    C: { code: '22CS503', name: 'Theory of Computation & Compiler Design', slot: 'Slot C', type: 'lecture', initConducted: 36, initAttended: 30 },
    D: { code: '22AI501', name: 'Artificial Intelligence', slot: 'Slot D', type: 'lecture', initConducted: 34, initAttended: 27 },
    E: { code: '22CS504', name: 'Operating Systems', slot: 'Slot E', type: 'lecture', initConducted: 34, initAttended: 30 },
    F: { code: '22CS512', name: 'Cloud Computing & DevOps', slot: 'Slot F', type: 'lecture', initConducted: 32, initAttended: 29 },
    L1: { code: '22CS505L', name: 'DBMS & Networks Laboratory', slot: 'Lab L1', type: 'lab', initConducted: 24, initAttended: 22 },
    L2: { code: '22AI506L', name: 'Artificial Intelligence & OS Lab', slot: 'Lab L2', type: 'lab', initConducted: 24, initAttended: 21 },
    ACT: { code: '22AC501', name: 'Competitive Coding / TWM / Library', slot: 'Activity', type: 'activity', initConducted: 14, initAttended: 13 },
  },
  'II-CSE-A': {
    A: { code: '22CS301', name: 'Data Structures', slot: 'Slot A', type: 'lecture', initConducted: 40, initAttended: 35 },
    B: { code: '22AI301', name: 'Artificial Intelligence', slot: 'Slot B', type: 'lecture', initConducted: 34, initAttended: 28 },
    C: { code: '22MA302', name: 'Discrete Mathematics', slot: 'Slot C', type: 'lecture', initConducted: 36, initAttended: 32 },
    D: { code: '22CS302', name: 'Database Management Systems (DBMS)', slot: 'Slot D', type: 'lecture', initConducted: 36, initAttended: 33 },
    E: { code: '22CS303', name: 'Object Oriented Programming', slot: 'Slot E', type: 'lecture', initConducted: 34, initAttended: 30 },
    F: { code: '22CS304', name: 'Computer Organization & Architecture', slot: 'Slot F', type: 'lecture', initConducted: 32, initAttended: 25 },
    L1: { code: '22CS305L', name: 'Data Structures & OOP Laboratory', slot: 'Lab L1', type: 'lab', initConducted: 24, initAttended: 22 },
    L2: { code: '22CS306L', name: 'DBMS & AI Systems Lab', slot: 'Lab L2', type: 'lab', initConducted: 24, initAttended: 21 },
    ACT: { code: '22AC302', name: 'Technical Seminar / TWM / Library', slot: 'Activity', type: 'activity', initConducted: 14, initAttended: 13 },
  },
};

// Period 1..9 patterns per day for each section (authentic 9-period college schedules)
const SECTION_WEEKLY_PATTERNS: Record<string, Record<DayOfWeek, string[]>> = {
  'IV-ECE-A': {
    Monday:    ['A', 'B', 'C', 'D', 'E', 'F', 'L1', 'L1', 'ACT'],
    Tuesday:   ['B', 'C', 'D', 'A', 'F', 'E', 'A',  'C',  'ACT'],
    Wednesday: ['C', 'D', 'E', 'F', 'L2', 'L2', 'L2', 'B', 'ACT'],
    Thursday:  ['D', 'E', 'F', 'B', 'A', 'C', 'E',  'D',  'ACT'],
    Friday:    ['E', 'F', 'A', 'C', 'L1', 'L1', 'B', 'F', 'ACT'],
    Saturday:  [],
  },
  'IV-ECE-B': {
    Monday:    ['B', 'A', 'D', 'C', 'F', 'E', 'A',  'B',  'ACT'],
    Tuesday:   ['C', 'D', 'A', 'E', 'L1', 'L1', 'L1', 'F', 'ACT'],
    Wednesday: ['D', 'E', 'B', 'F', 'A', 'C', 'E',  'D',  'ACT'],
    Thursday:  ['E', 'F', 'C', 'A', 'L2', 'L2', 'L2', 'B', 'ACT'],
    Friday:    ['A', 'B', 'E', 'D', 'C', 'F', 'B',  'C',  'ACT'],
    Saturday:  [],
  },
  'III-ECE-A': {
    Monday:    ['A', 'B', 'C', 'D', 'E', 'F', 'B',  'A',  'ACT'],
    Tuesday:   ['B', 'C', 'D', 'E', 'L1', 'L1', 'L1', 'F', 'ACT'],
    Wednesday: ['C', 'D', 'E', 'F', 'A', 'B', 'D',  'C',  'ACT'],
    Thursday:  ['D', 'E', 'F', 'A', 'L2', 'L2', 'L2', 'E', 'ACT'],
    Friday:    ['E', 'F', 'A', 'B', 'C', 'D', 'F',  'A',  'ACT'],
    Saturday:  [],
  },
  'III-ECE-B': {
    Monday:    ['C', 'B', 'A', 'F', 'L1', 'L1', 'L1', 'D', 'ACT'],
    Tuesday:   ['D', 'A', 'B', 'C', 'E', 'F', 'A',  'B',  'ACT'],
    Wednesday: ['E', 'F', 'C', 'D', 'L2', 'L2', 'L2', 'A', 'ACT'],
    Thursday:  ['A', 'C', 'D', 'E', 'B', 'F', 'C',  'E',  'ACT'],
    Friday:    ['B', 'D', 'E', 'A', 'F', 'C', 'D',  'F',  'ACT'],
    Saturday:  [],
  },
  'III-ECE-DS': {
    Monday:    ['A', 'D', 'B', 'C', 'F', 'E', 'D',  'B',  'ACT'],
    Tuesday:   ['B', 'C', 'D', 'F', 'L1', 'L1', 'L1', 'A', 'ACT'],
    Wednesday: ['C', 'A', 'E', 'D', 'B', 'F', 'C',  'E',  'ACT'],
    Thursday:  ['D', 'B', 'F', 'A', 'L2', 'L2', 'L2', 'C', 'ACT'],
    Friday:    ['E', 'F', 'A', 'B', 'D', 'C', 'F',  'D',  'ACT'],
    Saturday:  [],
  },
  'II-ECE-A': {
    Monday:    ['A', 'B', 'C', 'D', 'E', 'F', 'A',  'C',  'ACT'],
    Tuesday:   ['B', 'C', 'D', 'E', 'L1', 'L1', 'L1', 'F', 'ACT'],
    Wednesday: ['C', 'D', 'E', 'F', 'A', 'B', 'E',  'D',  'ACT'],
    Thursday:  ['D', 'E', 'F', 'A', 'L2', 'L2', 'L2', 'B', 'ACT'],
    Friday:    ['E', 'F', 'A', 'B', 'C', 'D', 'F',  'A',  'ACT'],
    Saturday:  [],
  },
  'II-ECE-B': {
    Monday:    ['B', 'C', 'A', 'E', 'L1', 'L1', 'L1', 'D', 'ACT'],
    Tuesday:   ['C', 'D', 'B', 'F', 'A', 'E', 'B',  'C',  'ACT'],
    Wednesday: ['D', 'E', 'C', 'A', 'L2', 'L2', 'L2', 'F', 'ACT'],
    Thursday:  ['E', 'F', 'D', 'B', 'C', 'A', 'D',  'E',  'ACT'],
    Friday:    ['A', 'B', 'E', 'C', 'D', 'F', 'A',  'F',  'ACT'],
    Saturday:  [],
  },
  'III-CSE-A': {
    Monday:    ['A', 'D', 'B', 'C', 'E', 'F', 'D',  'B',  'ACT'],
    Tuesday:   ['B', 'E', 'C', 'D', 'L1', 'L1', 'L1', 'A', 'ACT'],
    Wednesday: ['C', 'A', 'D', 'E', 'B', 'F', 'A',  'C',  'ACT'],
    Thursday:  ['D', 'B', 'E', 'F', 'L2', 'L2', 'L2', 'C', 'ACT'],
    Friday:    ['E', 'F', 'A', 'B', 'C', 'D', 'F',  'E',  'ACT'],
    Saturday:  [],
  },
  'III-CSE-B': {
    Monday:    ['B', 'C', 'D', 'A', 'L1', 'L1', 'L1', 'E', 'ACT'],
    Tuesday:   ['C', 'D', 'E', 'B', 'A', 'F', 'D',  'C',  'ACT'],
    Wednesday: ['D', 'E', 'F', 'C', 'L2', 'L2', 'L2', 'B', 'ACT'],
    Thursday:  ['E', 'A', 'B', 'D', 'C', 'F', 'A',  'E',  'ACT'],
    Friday:    ['A', 'B', 'C', 'E', 'D', 'F', 'B',  'F',  'ACT'],
    Saturday:  [],
  },
  'II-CSE-A': {
    Monday:    ['A', 'B', 'C', 'D', 'E', 'F', 'A',  'B',  'ACT'],
    Tuesday:   ['B', 'C', 'D', 'A', 'L1', 'L1', 'L1', 'E', 'ACT'],
    Wednesday: ['C', 'D', 'A', 'B', 'F', 'E', 'D',  'C',  'ACT'],
    Thursday:  ['D', 'A', 'B', 'E', 'L2', 'L2', 'L2', 'F', 'ACT'],
    Friday:    ['E', 'F', 'C', 'A', 'B', 'D', 'C',  'F',  'ACT'],
    Saturday:  [],
  },
};

export function generateAllTimetables(): Record<string, TimetableSlot[]> {
  const result: Record<string, TimetableSlot[]> = {};

  for (const section of SECTIONS_LIST) {
    const slots: TimetableSlot[] = [];
    const catalog = SECTION_SUBJECT_CATALOG[section.sectionId];
    const pattern = SECTION_WEEKLY_PATTERNS[section.sectionId];

    if (!catalog || !pattern) continue;

    const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    for (const day of days) {
      const dayKeys = pattern[day] || [];
      dayKeys.forEach((slotKey, idx) => {
        const periodNum = idx + 1;
        const timing = PERIOD_TIMINGS[idx];
        const subj = catalog[slotKey];
        if (timing && subj) {
          slots.push({
            sectionId: section.sectionId,
            sectionName: section.sectionName,
            day,
            period: periodNum,
            startTime: timing.startTime,
            endTime: timing.endTime,
            subjectCode: subj.code,
            subjectName: subj.name,
            subjectSlot: subj.slot,
            type: subj.type,
          });
        }
      });
    }
    result[section.sectionId] = slots;
  }

  return result;
}

export function getInitialSubjectAttendanceForSection(sectionId: string): InitialSubjectAttendance[] {
  const catalog = SECTION_SUBJECT_CATALOG[sectionId] || SECTION_SUBJECT_CATALOG['IV-ECE-A'];
  return Object.values(catalog).map((subj) => ({
    subjectCode: subj.code,
    subjectName: subj.name,
    subjectSlot: subj.slot,
    type: subj.type,
    initialConducted: subj.initConducted,
    initialAttended: subj.initAttended,
    initialOd: 0,
    initialMedical: 0,
  }));
}

export const INITIAL_TIMETABLES = generateAllTimetables();
