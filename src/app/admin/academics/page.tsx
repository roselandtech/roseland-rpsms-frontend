"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { RoselandApi } from '@/lib/api';
import { useSubjects } from '@/hooks/useSubjects';
import HistoricalReportsImportModal from '@/components/academics/HistoricalReportsImportModal';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
type Weekday = typeof WEEKDAYS[number];

type SlotType = 'academic' | 'break' | 'assembly' | 'activity' | 'closing';

/** Mirrors academic.timetable_slots as returned by GET /academic/timetable/slots. */
interface TimetableSlot {
  id: string;
  day: Weekday;
  period_number: number;
  time_range: string;
  class_grade: string;
  subject: string;
  teacher_name: string;
  room_facility: string;
  slot_label: string;
  slot_type: SlotType;
}

/** Mirrors academic.assessment_scores as returned by GET /academic/grading/scores. */
interface AssessmentScore {
  id: string;
  student_index_no: string;
  student_name: string;
  class_grade: string;
  subject: string;
  classwork_10: number;
  project_10: number;
  midterm_10: number;
  attendance_10: number;
  sba_40: number;
  terminal_exam_60: number;
  final_score_100: number;
  stanine_grade: number;
  grade_descriptor: string;
  teacher_remark?: string | null;
}

interface ClassStream {
  classId?: string;
  classGrade: string;
  levelCategory?: string;
  stage?: string;
  streamName?: string;
  roomNumber?: string;
  capacity?: number;
  baseTuitionFee?: number;
  formMaster: string;
  subjects: string[];
  pupils: number;
  pupilsWithScores: number;
  caSubmissionPct: number | null;
  /** Scored pupils no longer on the SIS roster for this class (data drift). */
  orphanedScorePupils: number;
}

interface ReportClassStatus {
  classGrade: string;
  totalPupils: number;
  pupilsComplete: number;
  pupilsIncomplete: number;
  scoreEntries: number;
  expectedSubjects: number;
  isPublished: boolean;
  status: string;
}

/** A pupil's gradebook, assembled client-side from their per-subject score rows. */
interface RosterEntry {
  indexNo: string;
  name: string;
  classGrade: string;
  scores: AssessmentScore[];
  compositeAvg: number;
  attendanceAvg: number;
  position: number;
  hasMissingScores: boolean;
}

interface ScoreEditorDraft {
  studentIndexNo: string;
  studentName: string;
  classGrade: string;
  subject: string;
  classwork10: number;
  project10: number;
  midterm10: number;
  attendance10: number;
  terminalExam60: number;
  teacherRemark: string;
}

interface TerminalReportCardView {
  loading: boolean;
  error: string | null;
  data: any | null;
  isEditingRemarks: boolean;
  isSavingRemarks: boolean;
  formMasterRemark: string;
  headmasterRemark: string;
  conduct: string;
  attitude: string;
  neatness: string;
  interests: string;
}

function calculateSbaAndFinal(cw: number, pr: number, mt: number, att: number, exam: number) {
  const sba = Math.round((Number(cw || 0) + Number(pr || 0) + Number(mt || 0) + Number(att || 0)) * 10) / 10;
  const final = Math.round((sba + Number(exam || 0)) * 10) / 10;
  let stanine = 9;
  let descriptor = 'Fail';
  if (final >= 80) { stanine = 1; descriptor = 'Highest / Distinction'; }
  else if (final >= 75) { stanine = 2; descriptor = 'Higher / Very Good'; }
  else if (final >= 70) { stanine = 3; descriptor = 'High / Good'; }
  else if (final >= 65) { stanine = 4; descriptor = 'High Average / Credit'; }
  else if (final >= 60) { stanine = 5; descriptor = 'Average / Credit'; }
  else if (final >= 55) { stanine = 6; descriptor = 'Low Average / Pass'; }
  else if (final >= 50) { stanine = 7; descriptor = 'Low / Pass'; }
  else if (final >= 40) { stanine = 8; descriptor = 'Lower / Weak Pass'; }
  else { stanine = 9; descriptor = 'Lowest / Fail'; }
  return { sba, final, stanine, descriptor };
}

const SLOT_TYPE_STYLES: Record<SlotType, string> = {
  academic: 'bg-purple-50 text-purple-900 border-purple-200',
  break: 'bg-amber-50 text-amber-900 border-amber-200',
  assembly: 'bg-slate-100 text-slate-800 border-slate-200',
  activity: 'bg-violet-50 text-violet-950 border-violet-200',
  closing: 'bg-rose-50 text-rose-900 border-rose-200',
};

const SLOT_TYPE_OPTIONS: SlotType[] = ['academic', 'break', 'assembly', 'activity', 'closing'];

/** Standard GES / NaCCA curriculum subjects */
const GES_STANDARD_SUBJECTS = [
  'Mathematics',
  'English Language',
  'Integrated Science',
  'Computing / ICT',
  'Social Studies',
  'Ghanaian Language (Twi)',
  'Ghanaian Language (Ga)',
  'Creative Arts & Design',
  'French Language',
  'Religious & Moral Education (RME)',
  'Physical & Health Education (PHE)',
  'Career Technology',
  'Our World Our People (OWOP)',
  'History of Ghana',
] as const;

const NON_ACADEMIC_ACTIVITIES: Record<SlotType, string[]> = {
  academic: [...GES_STANDARD_SUBJECTS],
  break: [
    'Snack & Morning Recess',
    'Lunch & Midday Break',
    'Short Transition Break',
    'Fruit & Refreshment Break',
  ],
  assembly: [
    'Morning Devotion & Assembly',
    'Worship & Praise Assembly',
    'House Inspection & Roll Call',
    'Moral Guidance & Civic Talk',
  ],
  activity: [
    'Physical & Health Education (PHE)',
    'Clubs & Co-Curricular Societies',
    'Library & Guided Reading',
    'Robotics & Coding Lab',
    'Debate & Literary Club',
    'Music, Drama & Cultural Dance',
    'Homeroom Wrap-up & Mentorship',
  ],
  closing: [
    'Closing Devotion & Dismissal',
    'Pack-up & Cleanliness Inspection',
    'After-School Pick-up & Transit',
    'Extracurricular Boarding Handover',
  ],
};

const PERIOD_TIME_PRESETS: Record<number, string> = {
  1: '08:00 - 08:45',
  2: '08:45 - 09:30',
  3: '09:30 - 10:15',
  4: '10:45 - 11:30',
  5: '11:30 - 12:15',
  6: '13:00 - 13:45',
  7: '13:45 - 14:30',
  8: '14:30 - 15:15',
};

const DEFAULT_FACILITY_BY_SUBJECT: Record<string, string> = {
  'Integrated Science': 'Science STEAM Lab',
  'Computing / ICT': 'ICT Computer Lab',
  'Physical & Health Education (PHE)': 'Sports Field & Court',
  'Creative Arts & Design': 'Art Studio & Workshop',
  'Career Technology': 'Technical Workshop',
};

interface FacultyAllocationRecord {
  id?: string;
  teacherId?: string;
  teacherName: string;
  teacherEmail?: string;
  formClass?: string;
  subjects?: string[];
  weeklyPeriods?: number;
}

interface StaffDirectoryRecord {
  id: string;
  fullName: string;
  email?: string;
  role?: string;
  assignedClass?: string;
}

/** Fallback completeness threshold used before the server reports its own. */
const DEFAULT_EXPECTED_SUBJECTS = 4;

const EMPTY_SLOT_DRAFT = {
  day: 'Monday' as Weekday,
  period_number: 1,
  time_range: '08:00 - 08:45',
  subject: 'Mathematics',
  teacher_name: 'Unassigned',
  room_facility: 'Standard Homeroom',
  slot_label: 'Period 1',
  slot_type: 'academic' as SlotType,
};

export default function AdminAcademicsPage() {
  const [activeTab, setActiveTab] = useState<'streams' | 'subjects' | 'timetable' | 'reports'>('streams');

  // Historical Report Cards & Attendance Digitize Modal State
  const [isHistoricalImportOpen, setIsHistoricalImportOpen] = useState(false);
  const [historicalTargetClass, setHistoricalTargetClass] = useState<string>('Primary 1');

  // Canonical Subject Registry Hook
  const { subjects: registeredSubjects, getSubjectsForLevel, refresh: refreshSubjects } = useSubjects();
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectDeptFilter, setSubjectDeptFilter] = useState('ALL');
  const [isDeletingSubjectId, setIsDeletingSubjectId] = useState<string | null>(null);

  // Reference data
  const [streams, setStreams] = useState<ClassStream[]>([]);
  const [facultyAllocations, setFacultyAllocations] = useState<FacultyAllocationRecord[]>([]);
  const [staffDirectory, setStaffDirectory] = useState<StaffDirectoryRecord[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState(true);
  const [streamsError, setStreamsError] = useState<string | null>(null);

  // New Class Modal State
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isSavingClass, setIsSavingClass] = useState(false);
  const [newClassDraft, setNewClassDraft] = useState({
    level_category: 'LOWER_PRIMARY',
    stage: 'Primary 1',
    stream_name: 'Sapphire',
    class_teacher_name: '',
    room_number: 'Block B Room 101',
    capacity: 35,
    base_tuition_fee: 1850.0,
  });

  // Edit Class Modal State
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isUpdatingClass, setIsUpdatingClass] = useState(false);
  const [editingClass, setEditingClass] = useState<{
    id: string;
    oldName: string;
    stage: string;
    stream_name: string;
    level_category: string;
    class_teacher_name: string;
    room_number: string;
    capacity: number;
    base_tuition_fee: number;
  } | null>(null);

  // Delete / Migrate Class Modal State
  const [isDeleteClassModalOpen, setIsDeleteClassModalOpen] = useState(false);
  const [isDeletingClass, setIsDeletingClass] = useState(false);
  const [deletingClass, setDeletingClass] = useState<ClassStream | null>(null);
  const [migrationTargetClassId, setMigrationTargetClassId] = useState<string>('');
  const [confirmArchiveOnly, setConfirmArchiveOnly] = useState<boolean>(false);

  // New Subject Modal State
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [isSavingSubject, setIsSavingSubject] = useState(false);
  const [newSubjectDraft, setNewSubjectDraft] = useState({
    code: '',
    name: '',
    department: 'STEM',
    level_categories: ['EARLY_YEARS', 'LOWER_PRIMARY', 'UPPER_PRIMARY', 'JHS'],
    is_core: true,
    weekly_periods: 5,
    default_room_type: 'Standard Homeroom',
    description: '',
  });

  // Timetable studio
  const [selectedTimetableClass, setSelectedTimetableClass] = useState<string>('');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [newSlotDraft, setNewSlotDraft] = useState<typeof EMPTY_SLOT_DRAFT | null>(null);
  const [isSavingSlot, setIsSavingSlot] = useState(false);
  const [collisions, setCollisions] = useState<{
    checked: boolean;
    count: number;
    totalSchoolCount: number;
    details: any[];
  }>({
    checked: false,
    count: 0,
    totalSchoolCount: 0,
    details: [],
  });
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  // Custom text toggles for Add / Edit modals
  const [isCustomSubjectNew, setIsCustomSubjectNew] = useState(false);
  const [isCustomTeacherNew, setIsCustomTeacherNew] = useState(false);
  const [isCustomSubjectEdit, setIsCustomSubjectEdit] = useState(false);
  const [isCustomTeacherEdit, setIsCustomTeacherEdit] = useState(false);

  // Report sign-off console
  const [reportStatus, setReportStatus] = useState<ReportClassStatus[]>([]);
  // Read inside loadRoster without making it a dependency: the roster only
  // needs the latest threshold, and depending on reportStatus would refetch
  // the gradebook every time the sign-off console reloads.
  const reportStatusRef = useRef<ReportClassStatus[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [signingOffClass, setSigningOffClass] = useState<string | null>(null);
  const [reopeningClass, setReopeningClass] = useState<string | null>(null);

  // Gradebook studio & CA Score Editor
  const [activeScoreReviewClass, setActiveScoreReviewClass] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [scoreFilter, setScoreFilter] = useState<'all' | 'complete' | 'missing'>('all');
  const [editingScoreDraft, setEditingScoreDraft] = useState<ScoreEditorDraft | null>(null);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [isCustomSubjectScoreEdit, setIsCustomSubjectScoreEdit] = useState(false);

  // Official Terminal Report Card Dossier
  const [reportDossier, setReportDossier] = useState<TerminalReportCardView | null>(null);

  // Gazette
  const [isPrintGazetteOpen, setIsPrintGazetteOpen] = useState(false);
  const [gazette, setGazette] = useState<any | null>(null);
  const [isLoadingGazette, setIsLoadingGazette] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);

  /**
   * Class streams are a composite view: canonical class registry (SIS service)
   * provides stages, streams, rooms, and capacities; faculty allocations
   * supply form masters and subjects; real student rosters supply enrolment counts.
   */
  const loadStreams = useCallback(async () => {
    setIsLoadingStreams(true);
    setStreamsError(null);
    try {
      const [allocationsRes, studentsRes, scoresRes, staffRes, classesRes] = await Promise.allSettled([
        RoselandApi.academic.getFacultyAllocations(),
        RoselandApi.sis.getStudents(),
        RoselandApi.academic.getScores(),
        RoselandApi.auth.getStaffDirectory(),
        RoselandApi.sis.getClasses(),
      ]);

      const allocationList: FacultyAllocationRecord[] =
        allocationsRes.status === 'fulfilled' && Array.isArray(allocationsRes.value) ? allocationsRes.value : [];
      const studentList: any[] =
        studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value) ? studentsRes.value : [];
      const scoreList: AssessmentScore[] =
        scoresRes.status === 'fulfilled' && Array.isArray(scoresRes.value) ? scoresRes.value : [];
      const staffList: StaffDirectoryRecord[] =
        staffRes.status === 'fulfilled' && Array.isArray(staffRes.value) ? staffRes.value : [];
      const registryClasses: any[] =
        classesRes.status === 'fulfilled' && Array.isArray(classesRes.value) ? classesRes.value : [];

      setFacultyAllocations(allocationList);
      setStaffDirectory(staffList);

      // Create a set of normalized active staff names to verify form master assignments
      const activeStaffNames = new Set(
        staffList
          .map((s) => (s.name || s.fullName || '').trim().toLowerCase())
          .filter((n) => n.length > 0)
      );
      const isStaffActive = (name?: string | null) => {
        if (!name || name === 'Unassigned') return false;
        return activeStaffNames.has(name.trim().toLowerCase());
      };

      const enrolledByClass = new Map<string, Set<string>>();
      studentList.forEach((s) => {
        const key = s.class_grade;
        if (!key) return;
        if (!enrolledByClass.has(key)) enrolledByClass.set(key, new Set());
        enrolledByClass.get(key)!.add(s.index_no);
      });

      const scoredPupilsByClass = new Map<string, Set<string>>();
      scoreList.forEach((s) => {
        if (!s.class_grade) return;
        if (!scoredPupilsByClass.has(s.class_grade)) scoredPupilsByClass.set(s.class_grade, new Set());
        scoredPupilsByClass.get(s.class_grade)!.add(s.student_index_no);
      });

      const masterByClass = new Map<string, { name: string; subjects: string[] }>();
      allocationList.forEach((a) => {
        if (a.formClass && isStaffActive(a.teacherName)) {
          masterByClass.set(a.formClass, {
            name: a.teacherName || 'Unassigned',
            subjects: Array.isArray(a.subjects) ? a.subjects : [],
          });
        }
      });

      const registryByClass = new Map<string, any>();
      registryClasses.forEach((rc) => {
        registryByClass.set(rc.name, rc);
      });

      // Union of every canonical class and any additional class from allocations or students
      const allClasses = new Set<string>([
        ...registryByClass.keys(),
        ...enrolledByClass.keys(),
        ...masterByClass.keys(),
        ...scoredPupilsByClass.keys(),
      ]);

      const composed: ClassStream[] = Array.from(allClasses)
        .sort((a, b) => a.localeCompare(b))
        .map((classGrade) => {
          const reg = registryByClass.get(classGrade);
          const enrolled = enrolledByClass.get(classGrade) || new Set<string>();
          const scoredPupils = scoredPupilsByClass.get(classGrade) || new Set<string>();
          const allocation = masterByClass.get(classGrade);

          // Count only pupils who are BOTH enrolled and scored, so a stale
          // score row for a transferred pupil cannot push the rate past 100%.
          let scoredAndEnrolled = 0;
          let orphaned = 0;
          scoredPupils.forEach((indexNo) => {
            if (enrolled.has(indexNo)) scoredAndEnrolled += 1;
            else orphaned += 1;
          });

          // Verify that the assigned class teacher is still an active staff member
          let verifiedFormMaster = 'Unassigned';
          if (reg?.class_teacher_name && isStaffActive(reg.class_teacher_name)) {
            verifiedFormMaster = reg.class_teacher_name;
          } else if (allocation?.name && isStaffActive(allocation.name)) {
            verifiedFormMaster = allocation.name;
          }

          return {
            classId: reg?.id,
            classGrade,
            levelCategory: reg?.level_category,
            stage: reg?.stage,
            streamName: reg?.stream_name,
            roomNumber: reg?.room_number || 'Room 101',
            capacity: reg?.capacity || 35,
            baseTuitionFee: reg?.base_tuition_fee,
            formMaster: verifiedFormMaster,
            subjects: isStaffActive(allocation?.name) ? (allocation?.subjects || []) : [],
            pupils: enrolled.size,
            pupilsWithScores: scoredAndEnrolled,
            caSubmissionPct: enrolled.size > 0
              ? Math.round((scoredAndEnrolled / enrolled.size) * 100)
              : null,
            orphanedScorePupils: orphaned,
          };
        });

      setStreams(composed);

      setSelectedTimetableClass((prev) => {
        if (prev && composed.some((c) => c.classGrade === prev)) return prev;
        return composed[0]?.classGrade || '';
      });
    } catch (err: any) {
      console.error('Failed to load class streams:', err);
      setStreamsError(err?.message || 'Could not load class streams from the academic service.');
      setStreams([]);
    } finally {
      setIsLoadingStreams(false);
    }
  }, []);

  const loadSlots = useCallback(async (classGrade: string) => {
    if (!classGrade) {
      setSlots([]);
      return;
    }
    setIsLoadingSlots(true);
    setSlotsError(null);
    setCollisions({ checked: false, count: 0, totalSchoolCount: 0, details: [] });
    try {
      const res = await RoselandApi.academic.getTimetableSlots({ classGrade });
      const list: TimetableSlot[] = Array.isArray(res) ? res : [];
      setSlots(list);

      // Ask the scheduling engine about real facility/teacher clashes across the institution
      try {
        const check = await RoselandApi.academic.getTimetableConflicts(classGrade);
        setCollisions({
          checked: true,
          count: check?.collisionCount ?? 0,
          totalSchoolCount: check?.totalSchoolCollisions ?? 0,
          details: check?.collisions ?? [],
        });
      } catch (e) {
        console.error('Failed to query timetable conflict engine:', e);
        setCollisions({ checked: false, count: 0, totalSchoolCount: 0, details: [] });
      }
    } catch (err: any) {
      console.error('Failed to load timetable slots:', err);
      setSlotsError(err?.message || 'Could not load the timetable for this cohort.');
      setSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  const loadReportStatus = useCallback(async () => {
    setIsLoadingReports(true);
    setReportsError(null);
    try {
      const [reportsRes, studentsRes] = await Promise.allSettled([
        RoselandApi.academic.getReportStatus(),
        RoselandApi.sis.getStudents(),
      ]);

      const backendClasses: ReportClassStatus[] =
        reportsRes.status === 'fulfilled' && Array.isArray(reportsRes.value?.classes)
          ? reportsRes.value.classes
          : [];

      const students: any[] =
        studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value)
          ? studentsRes.value
          : [];

      // Map pupil counts by class for all active students in SIS
      const pupilsByClass = new Map<string, number>();
      students.forEach((s) => {
        if (s.class_grade && s.is_active !== false) {
          const key = s.class_grade.trim();
          pupilsByClass.set(key, (pupilsByClass.get(key) || 0) + 1);
        }
      });

      const knownClassMap = new Map<string, ReportClassStatus>();
      backendClasses.forEach((bc) => {
        const key = bc.classGrade.trim();
        knownClassMap.set(key, bc);
      });

      // Include strictly classes that have enrolled students
      const finalClasses: ReportClassStatus[] = [];
      pupilsByClass.forEach((pupilCount, classGrade) => {
        if (knownClassMap.has(classGrade)) {
          const existing = knownClassMap.get(classGrade)!;
          finalClasses.push({
            ...existing,
            totalPupils: pupilCount,
          });
        } else {
          finalClasses.push({
            classGrade,
            totalPupils: pupilCount,
            pupilsComplete: 0,
            pupilsIncomplete: pupilCount,
            scoreEntries: 0,
            expectedSubjects: DEFAULT_EXPECTED_SUBJECTS,
            isPublished: false,
            status: 'Pending Continuous Assessment Scores',
          });
        }
      });

      finalClasses.sort((a, b) => a.classGrade.localeCompare(b.classGrade));

      setReportStatus(finalClasses);
      reportStatusRef.current = finalClasses;
    } catch (err: any) {
      console.error('Failed to load report status:', err);
      setReportsError(err?.message || 'Could not load report card readiness from the academic service.');
      setReportStatus([]);
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  const loadRoster = useCallback(async (classGrade: string) => {
    if (!classGrade) {
      setRoster([]);
      return;
    }
    setIsLoadingRoster(true);
    setRosterError(null);
    try {
      const [scoresRes, studentsRes] = await Promise.allSettled([
        RoselandApi.academic.getScores({ classGrade }),
        RoselandApi.sis.getStudents({ class_grade: classGrade }),
      ]);

      const scoreList: AssessmentScore[] =
        scoresRes.status === 'fulfilled' && Array.isArray(scoresRes.value) ? scoresRes.value : [];
      const studentList: any[] =
        studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value) ? studentsRes.value : [];

      const normClass = classGrade.trim().toLowerCase();
      const byPupil = new Map<string, { name: string; classGrade: string; scores: AssessmentScore[] }>();

      // 1. Seed all real enrolled students from SIS for this cohort ONLY
      studentList.forEach((s) => {
        const sClass = (s.class_grade || '').trim().toLowerCase();
        if (s.index_no && (sClass === normClass || !s.class_grade)) {
          byPupil.set(s.index_no, {
            name: s.full_name || s.index_no,
            classGrade: s.class_grade || classGrade,
            scores: [],
          });
        }
      });

      // 2. Populate recorded continuous assessment scores for this cohort ONLY
      scoreList.forEach((s) => {
        const scoreClass = (s.class_grade || '').trim().toLowerCase();
        if (scoreClass === normClass) {
          if (!byPupil.has(s.student_index_no)) {
            byPupil.set(s.student_index_no, {
              name: s.student_name || s.student_index_no,
              classGrade: s.class_grade || classGrade,
              scores: [],
            });
          }
          byPupil.get(s.student_index_no)!.scores.push(s);
        }
      });

      const threshold =
        reportStatusRef.current.find((r) => r.classGrade === classGrade)?.expectedSubjects ??
        DEFAULT_EXPECTED_SUBJECTS;

      const entries: RosterEntry[] = Array.from(byPupil.entries()).map(([indexNo, data]) => {
        const scores = data.scores;
        const compositeAvg = scores.length
          ? Math.round((scores.reduce((sum, s) => sum + s.final_score_100, 0) / scores.length) * 10) / 10
          : 0;
        const attendanceAvg = scores.length
          ? Math.round((scores.reduce((sum, s) => sum + s.attendance_10, 0) / scores.length) * 10) / 10
          : 0;
        return {
          indexNo,
          name: data.name,
          classGrade: data.classGrade,
          scores,
          compositeAvg,
          attendanceAvg,
          position: 0,
          hasMissingScores: scores.length < threshold,
        };
      });

      entries.sort((a, b) => b.compositeAvg - a.compositeAvg);
      entries.forEach((e, i) => {
        e.position = i + 1;
      });

      setRoster(entries);
    } catch (err: any) {
      console.error('Failed to load gradebook:', err);
      setRosterError(err?.message || 'Could not load the continuous assessment gradebook.');
      setRoster([]);
    } finally {
      setIsLoadingRoster(false);
    }
  }, []);

  const loadGazette = useCallback(async (classGrade: string) => {
    if (!classGrade) return;
    setIsLoadingGazette(true);
    try {
      const res = await RoselandApi.academic.getTimetableGazette(classGrade);
      setGazette(res);
    } catch (err: any) {
      console.error('Failed to load timetable gazette:', err);
      toast.error(err?.message || 'Could not load the official timetable gazette.');
      setGazette(null);
    } finally {
      setIsLoadingGazette(false);
    }
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingClass(true);
      const code = `${newClassDraft.stage.toUpperCase().replace(/\s+/g, '')}-${newClassDraft.stream_name.toUpperCase().replace(/\s+/g, '')}`;
      const name = `${newClassDraft.stage} ${newClassDraft.stream_name}`;
      await RoselandApi.sis.createClass({
        code,
        name,
        level_category: newClassDraft.level_category,
        stage: newClassDraft.stage,
        stream_name: newClassDraft.stream_name,
        class_teacher_name: newClassDraft.class_teacher_name || undefined,
        room_number: newClassDraft.room_number,
        capacity: Number(newClassDraft.capacity),
        base_tuition_fee: Number(newClassDraft.base_tuition_fee),
      });
      toast.success(`Class "${name}" registered successfully`);
      setIsAddClassModalOpen(false);
      setNewClassDraft({
        level_category: 'LOWER_PRIMARY',
        stage: 'Primary 1',
        stream_name: 'Sapphire',
        class_teacher_name: '',
        room_number: 'Block B Room 101',
        capacity: 35,
        base_tuition_fee: 1850.0,
      });
      await loadStreams();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create class stream');
    } finally {
      setIsSavingClass(false);
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    try {
      setIsUpdatingClass(true);
      const newName = `${editingClass.stage.trim()} ${editingClass.stream_name.trim()}`;
      await RoselandApi.sis.updateClass(editingClass.id, {
        name: newName,
        stage: editingClass.stage.trim(),
        stream_name: editingClass.stream_name.trim(),
        level_category: editingClass.level_category,
        class_teacher_name: editingClass.class_teacher_name || undefined,
        room_number: editingClass.room_number,
        capacity: Number(editingClass.capacity),
        base_tuition_fee: Number(editingClass.base_tuition_fee),
      });
      toast.success(`Class "${newName}" updated successfully`);
      setIsEditClassModalOpen(false);
      setEditingClass(null);
      await loadStreams();
    } catch (err: any) {
      console.error('Failed to update class:', err);
      toast.error(err?.message || 'Failed to update class');
    } finally {
      setIsUpdatingClass(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!deletingClass || !deletingClass.classId) return;
    try {
      setIsDeletingClass(true);
      if (deletingClass.pupils > 0) {
        if (!migrationTargetClassId && !confirmArchiveOnly) {
          toast.error('Please select a destination class to reassign active pupils, or choose archive.');
          return;
        }
        if (migrationTargetClassId) {
          const res = await RoselandApi.sis.deleteClass(deletingClass.classId, {
            reassign_to_class_id: migrationTargetClassId,
          });
          toast.success(res.message || `Successfully reallocated pupils and removed class.`);
        } else if (confirmArchiveOnly) {
          const res = await RoselandApi.sis.deleteClass(deletingClass.classId, {
            force_archive: true,
          });
          toast.success(res.message || `Class archived successfully.`);
        }
      } else {
        const res = await RoselandApi.sis.deleteClass(deletingClass.classId);
        toast.success(res.message || `Class removed successfully.`);
      }
      setIsDeleteClassModalOpen(false);
      setDeletingClass(null);
      setMigrationTargetClassId('');
      setConfirmArchiveOnly(false);
      await loadStreams();
    } catch (err: any) {
      console.error('Failed to delete class:', err);
      toast.error(err?.message || 'Failed to delete class');
    } finally {
      setIsDeletingClass(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectDraft.code.trim() || !newSubjectDraft.name.trim()) {
      toast.error('Subject code and title are required');
      return;
    }
    try {
      setIsSavingSubject(true);
      await RoselandApi.academic.createSubject({
        code: newSubjectDraft.code.trim().toUpperCase(),
        name: newSubjectDraft.name.trim(),
        department: newSubjectDraft.department,
        level_categories: newSubjectDraft.level_categories.join(','),
        is_core: newSubjectDraft.is_core,
        weekly_periods: Number(newSubjectDraft.weekly_periods) || 5,
        default_room_type: newSubjectDraft.default_room_type,
        description: newSubjectDraft.description.trim() || undefined,
        is_active: true,
      });
      toast.success(`Subject "${newSubjectDraft.name}" registered successfully`);
      setIsAddSubjectModalOpen(false);
      setNewSubjectDraft({
        code: '',
        name: '',
        department: 'STEM',
        level_categories: ['EARLY_YEARS', 'LOWER_PRIMARY', 'UPPER_PRIMARY', 'JHS'],
        is_core: true,
        weekly_periods: 5,
        default_room_type: 'Standard Homeroom',
        description: '',
      });
      refreshSubjects();
    } catch (err: any) {
      toast.error(err.message || 'Failed to register subject');
    } finally {
      setIsSavingSubject(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    if (!confirm(`Are you sure you want to remove the subject "${subjectName}" from the canonical registry?`)) {
      return;
    }
    try {
      setIsDeletingSubjectId(subjectId);
      await RoselandApi.academic.deleteSubject(subjectId);
      toast.success(`Subject "${subjectName}" removed`);
      refreshSubjects();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove subject');
    } finally {
      setIsDeletingSubjectId(null);
    }
  };

  useEffect(() => { loadStreams(); }, [loadStreams]);

  useEffect(() => {
    if (activeTab === 'timetable' && selectedTimetableClass) {
      loadSlots(selectedTimetableClass);
    }
  }, [activeTab, selectedTimetableClass, loadSlots]);

  useEffect(() => {
    if (activeTab === 'reports') loadReportStatus();
  }, [activeTab, loadReportStatus]);

  useEffect(() => {
    if (activeScoreReviewClass) loadRoster(activeScoreReviewClass);
  }, [activeScoreReviewClass, loadRoster]);

  useEffect(() => {
    if (isPrintGazetteOpen && selectedTimetableClass) loadGazette(selectedTimetableClass);
  }, [isPrintGazetteOpen, selectedTimetableClass, loadGazette]);

  const activeClassData = useMemo(
    () => streams.find((s) => s.classGrade === selectedTimetableClass) || null,
    [streams, selectedTimetableClass]
  );

  const slotsByDay = useMemo(() => {
    const grouped = new Map<Weekday, TimetableSlot[]>();
    WEEKDAYS.forEach((d) => grouped.set(d, []));
    slots.forEach((s) => {
      if (grouped.has(s.day)) grouped.get(s.day)!.push(s);
    });
    grouped.forEach((list) => list.sort((a, b) => a.period_number - b.period_number));
    return grouped;
  }, [slots]);

  const visibleDays = useMemo(
    () => WEEKDAYS.filter((d) => selectedDayFilter === 'all' || d === selectedDayFilter),
    [selectedDayFilter]
  );

  const totalPupils = useMemo(() => streams.reduce((sum, s) => sum + s.pupils, 0), [streams]);

  /** Completeness threshold for the cohort currently open in the gradebook. */
  const activeExpectedSubjects = useMemo(() => (
    reportStatus.find((r) => r.classGrade === activeScoreReviewClass)?.expectedSubjects
      ?? DEFAULT_EXPECTED_SUBJECTS
  ), [reportStatus, activeScoreReviewClass]);

  const filteredRoster = useMemo(() => roster.filter((st) => {
    if (scoreFilter === 'complete') return !st.hasMissingScores;
    if (scoreFilter === 'missing') return st.hasMissingScores;
    return true;
  }), [roster, scoreFilter]);

  /**
   * Returns teachers categorized based on their allocated subjects:
   * 1. Teachers explicitly allocated to `subjectName`
   * 2. Other faculty and staff
   * 3. General roles (Form Master, Duty Master, Unassigned)
   */
  const getTeacherOptionsForSubject = useCallback(
    (subjectName: string, targetClass: string, slotType: SlotType) => {
      if (slotType === 'break') {
        return {
          allocatedTeachers: [],
          otherTeachers: [],
          roles: ['Duty Master & Prefects', 'Class Form Master', 'All Faculty On Duty', 'Unassigned'],
        };
      }

      if (slotType === 'assembly') {
        return {
          allocatedTeachers: [],
          otherTeachers: [],
          roles: ['Headmaster & Staff', 'Duty Master & Prefects', 'Class Form Master', 'School Chaplain'],
        };
      }

      if (slotType === 'closing') {
        return {
          allocatedTeachers: [],
          otherTeachers: [],
          roles: ['Duty Master & Prefects', 'Class Form Master', 'Headmaster & Staff', 'All Faculty On Duty', 'Unassigned'],
        };
      }

      const normalizedSub = (subjectName || '').trim().toLowerCase();

      // Find all teachers in facultyAllocations who have this subject
      const allocatedTeachers: Array<{ name: string; detail: string; isClassMaster: boolean; subjects: string[] }> = [];
      const allocatedTeacherNames = new Set<string>();

      facultyAllocations.forEach((a) => {
        const teachesSubject = (a.subjects || []).some((s: string) => {
          const norm = s.trim().toLowerCase();
          return norm === normalizedSub || norm.includes(normalizedSub) || normalizedSub.includes(norm);
        });

        if (teachesSubject && a.teacherName) {
          allocatedTeacherNames.add(a.teacherName.toLowerCase());
          const isClassMaster = a.formClass?.toLowerCase() === targetClass.toLowerCase();
          allocatedTeachers.push({
            name: a.teacherName,
            detail: isClassMaster
              ? `${a.formClass} Form Master`
              : a.formClass
              ? `${a.formClass} Master`
              : 'Subject Specialist',
            isClassMaster,
            subjects: a.subjects || [],
          });
        }
      });

      // Sort: class form master first, then others
      allocatedTeachers.sort((a, b) => (b.isClassMaster ? 1 : 0) - (a.isClassMaster ? 1 : 0));

      // Other teaching staff
      const otherTeachers: Array<{ name: string; role: string }> = [];

      facultyAllocations.forEach((a) => {
        if (a.teacherName && !allocatedTeacherNames.has(a.teacherName.toLowerCase())) {
          allocatedTeacherNames.add(a.teacherName.toLowerCase());
          otherTeachers.push({
            name: a.teacherName,
            role: a.formClass ? `${a.formClass} Form Master` : 'Faculty Member',
          });
        }
      });

      staffDirectory.forEach((s) => {
        if (
          s.fullName &&
          !allocatedTeacherNames.has(s.fullName.toLowerCase()) &&
          (s.role?.toLowerCase().includes('teacher') ||
            s.role?.toLowerCase().includes('faculty') ||
            s.role?.toLowerCase().includes('headmaster') ||
            s.role?.toLowerCase().includes('master'))
        ) {
          allocatedTeacherNames.add(s.fullName.toLowerCase());
          otherTeachers.push({
            name: s.fullName,
            role: s.role || 'Teaching Staff',
          });
        }
      });

      const currentFormMaster = streams.find((s) => s.classGrade === targetClass)?.formMaster;

      return {
        allocatedTeachers,
        otherTeachers,
        roles: [
          currentFormMaster && currentFormMaster !== 'Unassigned'
            ? `Form Master (${currentFormMaster})`
            : 'Class Form Master',
          'Duty Master & Prefects',
          'Unassigned / Self-Study',
        ],
      };
    },
    [facultyAllocations, staffDirectory, streams]
  );

  /**
   * Returns subjects allocated specifically to this class stream
   */
  const getClassAllocatedSubjects = useCallback(
    (targetClass: string) => {
      const classAllocations = facultyAllocations.filter(
        (a) => a.formClass?.toLowerCase() === targetClass?.toLowerCase()
      );
      return Array.from(new Set(classAllocations.flatMap((a) => a.subjects || [])));
    },
    [facultyAllocations]
  );

  /**
   * Helper to open the Add Period Slot draft with smart initial values
   */
  const openNewSlotDraft = useCallback(
    (day: Weekday = 'Monday', periodNumber?: number) => {
      let pNum = periodNumber;
      if (!pNum) {
        const existingForDay = slots.filter((s) => s.day === day);
        pNum = existingForDay.length > 0 ? Math.min(12, Math.max(...existingForDay.map((s) => s.period_number)) + 1) : 1;
      }

      const classSubjects = getClassAllocatedSubjects(selectedTimetableClass);
      const defaultSub = classSubjects[0] || 'Mathematics';

      const teacherMatches = getTeacherOptionsForSubject(defaultSub, selectedTimetableClass, 'academic');
      const defaultTeacher =
        teacherMatches.allocatedTeachers[0]?.name ||
        teacherMatches.otherTeachers[0]?.name ||
        'Unassigned';
      const defaultRoom = DEFAULT_FACILITY_BY_SUBJECT[defaultSub] || 'Standard Homeroom';

      setIsCustomSubjectNew(false);
      setIsCustomTeacherNew(false);

      setNewSlotDraft({
        day,
        period_number: pNum,
        time_range: PERIOD_TIME_PRESETS[pNum] || '08:00 - 08:45',
        subject: defaultSub,
        teacher_name: defaultTeacher,
        room_facility: defaultRoom,
        slot_label: `Period ${pNum}`,
        slot_type: 'academic',
      });
    },
    [slots, selectedTimetableClass, getClassAllocatedSubjects, getTeacherOptionsForSubject]
  );

  /**
   * Helper to start editing a slot with smart detection of custom fields
   */
  const handleStartEditSlot = useCallback(
    (slot: TimetableSlot) => {
      const isCustomSub =
        !GES_STANDARD_SUBJECTS.includes(slot.subject as any) &&
        !NON_ACADEMIC_ACTIVITIES[slot.slot_type]?.includes(slot.subject);
      setIsCustomSubjectEdit(isCustomSub);
      setIsCustomTeacherEdit(false);
      setEditingSlot({ ...slot });
    },
    []
  );

  /**
   * Subject change handler with auto-assignment for new slot draft
   */
  const handleSubjectChangeNew = useCallback(
    (subject: string) => {
      if (!newSlotDraft) return;
      const teacherMatches = getTeacherOptionsForSubject(subject, selectedTimetableClass, newSlotDraft.slot_type);
      const matchingTeacher =
        teacherMatches.allocatedTeachers[0]?.name ||
        (newSlotDraft.teacher_name && newSlotDraft.teacher_name !== 'Unassigned'
          ? newSlotDraft.teacher_name
          : teacherMatches.otherTeachers[0]?.name || 'Unassigned');

      const suggestedRoom = DEFAULT_FACILITY_BY_SUBJECT[subject] || (
        newSlotDraft.room_facility && newSlotDraft.room_facility !== 'Standard Homeroom' && !Object.values(DEFAULT_FACILITY_BY_SUBJECT).includes(newSlotDraft.room_facility)
          ? newSlotDraft.room_facility
          : 'Standard Homeroom'
      );

      setNewSlotDraft({
        ...newSlotDraft,
        subject,
        teacher_name: matchingTeacher,
        room_facility: suggestedRoom,
      });
    },
    [newSlotDraft, selectedTimetableClass, getTeacherOptionsForSubject]
  );

  /**
   * Subject change handler with auto-assignment for edit slot
   */
  const handleSubjectChangeEdit = useCallback(
    (subject: string) => {
      if (!editingSlot) return;
      const teacherMatches = getTeacherOptionsForSubject(subject, editingSlot.class_grade, editingSlot.slot_type);
      const matchingTeacher =
        teacherMatches.allocatedTeachers[0]?.name ||
        (editingSlot.teacher_name && editingSlot.teacher_name !== 'Unassigned'
          ? editingSlot.teacher_name
          : teacherMatches.otherTeachers[0]?.name || 'Unassigned');

      const suggestedRoom = DEFAULT_FACILITY_BY_SUBJECT[subject] || (
        editingSlot.room_facility && editingSlot.room_facility !== 'Standard Homeroom' && !Object.values(DEFAULT_FACILITY_BY_SUBJECT).includes(editingSlot.room_facility)
          ? editingSlot.room_facility
          : 'Standard Homeroom'
      );

      setEditingSlot({
        ...editingSlot,
        subject,
        teacher_name: matchingTeacher,
        room_facility: suggestedRoom,
      });
    },
    [editingSlot, getTeacherOptionsForSubject]
  );

  /**
   * Slot type change handler for new slot draft
   */
  const handleSlotTypeChangeNew = useCallback(
    (slotType: SlotType) => {
      if (!newSlotDraft) return;
      setIsCustomSubjectNew(false);
      setIsCustomTeacherNew(false);

      if (slotType === 'break') {
        setNewSlotDraft({
          ...newSlotDraft,
          slot_type: slotType,
          subject: 'Snack & Morning Recess',
          teacher_name: 'Duty Master & Prefects',
          room_facility: 'Dining Hall & Courtyard',
          slot_label: 'Break',
        });
      } else if (slotType === 'assembly') {
        setNewSlotDraft({
          ...newSlotDraft,
          slot_type: slotType,
          subject: 'Morning Devotion & Assembly',
          teacher_name: 'Headmaster & Staff',
          room_facility: 'Assembly Forecourt',
          slot_label: 'Assembly',
        });
      } else if (slotType === 'activity') {
        setNewSlotDraft({
          ...newSlotDraft,
          slot_type: slotType,
          subject: 'Clubs & Co-Curricular Societies',
          teacher_name: 'Duty Master & Prefects',
          room_facility: 'School Activity Grounds',
          slot_label: 'Activity',
        });
      } else if (slotType === 'closing') {
        setNewSlotDraft({
          ...newSlotDraft,
          slot_type: slotType,
          subject: 'Closing Devotion & Dismissal',
          teacher_name: 'Duty Master & Prefects',
          room_facility: 'Assembly Forecourt & Gates',
          slot_label: 'Closing',
        });
      } else {
        const classSubs = getClassAllocatedSubjects(selectedTimetableClass);
        const sub = classSubs[0] || 'Mathematics';
        const teacherMatches = getTeacherOptionsForSubject(sub, selectedTimetableClass, 'academic');
        setNewSlotDraft({
          ...newSlotDraft,
          slot_type: slotType,
          subject: sub,
          teacher_name: teacherMatches.allocatedTeachers[0]?.name || 'Unassigned',
          room_facility: DEFAULT_FACILITY_BY_SUBJECT[sub] || 'Standard Homeroom',
          slot_label: `Period ${newSlotDraft.period_number}`,
        });
      }
    },
    [newSlotDraft, selectedTimetableClass, getClassAllocatedSubjects, getTeacherOptionsForSubject]
  );

  /**
   * Slot type change handler for edit slot
   */
  const handleSlotTypeChangeEdit = useCallback(
    (slotType: SlotType) => {
      if (!editingSlot) return;
      setIsCustomSubjectEdit(false);
      setIsCustomTeacherEdit(false);

      if (slotType === 'break') {
        setEditingSlot({
          ...editingSlot,
          slot_type: slotType,
          subject: 'Snack & Morning Recess',
          teacher_name: 'Duty Master & Prefects',
          room_facility: 'Dining Hall & Courtyard',
        });
      } else if (slotType === 'assembly') {
        setEditingSlot({
          ...editingSlot,
          slot_type: slotType,
          subject: 'Morning Devotion & Assembly',
          teacher_name: 'Headmaster & Staff',
          room_facility: 'Assembly Forecourt',
        });
      } else if (slotType === 'activity') {
        setEditingSlot({
          ...editingSlot,
          slot_type: slotType,
          subject: 'Clubs & Co-Curricular Societies',
          teacher_name: 'Duty Master & Prefects',
          room_facility: 'School Activity Grounds',
        });
      } else if (slotType === 'closing') {
        setEditingSlot({
          ...editingSlot,
          slot_type: slotType,
          subject: 'Closing Devotion & Dismissal',
          teacher_name: 'Duty Master & Prefects',
          room_facility: 'Assembly Forecourt & Gates',
        });
      } else {
        const classSubs = getClassAllocatedSubjects(editingSlot.class_grade);
        const sub = classSubs[0] || 'Mathematics';
        const teacherMatches = getTeacherOptionsForSubject(sub, editingSlot.class_grade, 'academic');
        setEditingSlot({
          ...editingSlot,
          slot_type: slotType,
          subject: sub,
          teacher_name: teacherMatches.allocatedTeachers[0]?.name || 'Unassigned',
          room_facility: DEFAULT_FACILITY_BY_SUBJECT[sub] || 'Standard Homeroom',
        });
      }
    },
    [editingSlot, getClassAllocatedSubjects, getTeacherOptionsForSubject]
  );

  const handleSaveEditedSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    setIsSavingSlot(true);
    try {
      await RoselandApi.academic.updateTimetableSlot(editingSlot.id, {
        subject: editingSlot.subject,
        teacher_name: editingSlot.teacher_name,
        room_facility: editingSlot.room_facility,
        time_range: editingSlot.time_range,
        slot_label: editingSlot.slot_label,
        slot_type: editingSlot.slot_type,
        period_number: editingSlot.period_number,
        day: editingSlot.day,
      });
      toast.success(`Saved ${editingSlot.slot_label} for ${editingSlot.class_grade}`);
      setEditingSlot(null);
      // Refetch so what is displayed is what the server actually stored.
      await loadSlots(selectedTimetableClass);
    } catch (err: any) {
      console.error('Slot update failed:', err);
      toast.error(err?.message || 'Failed to save the period slot.');
    } finally {
      setIsSavingSlot(false);
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotDraft || !selectedTimetableClass) return;

    setIsSavingSlot(true);
    try {
      await RoselandApi.academic.createTimetableSlot({
        ...newSlotDraft,
        class_grade: selectedTimetableClass,
        slot_label: newSlotDraft.slot_label || `Period ${newSlotDraft.period_number}`,
      });
      toast.success(`Added ${newSlotDraft.slot_label || `Period ${newSlotDraft.period_number}`} to ${selectedTimetableClass}`);
      setNewSlotDraft(null);
      await loadSlots(selectedTimetableClass);
    } catch (err: any) {
      console.error('Slot creation failed:', err);
      toast.error(err?.message || 'Failed to add the period slot.');
    } finally {
      setIsSavingSlot(false);
    }
  };

  const handleDeleteSlot = async (slot: TimetableSlot) => {
    if (!confirm(`Remove "${slot.slot_label} — ${slot.subject}" from the ${slot.day} schedule?`)) return;

    try {
      await RoselandApi.academic.deleteTimetableSlot(slot.id);
      toast.success(`Removed ${slot.slot_label} from ${slot.day}`);
      setEditingSlot(null);
      await loadSlots(selectedTimetableClass);
    } catch (err: any) {
      console.error('Slot deletion failed:', err);
      toast.error(err?.message || 'Failed to remove the period slot.');
    }
  };

  const handleSignOffClassBatch = async (classGrade: string) => {
    setSigningOffClass(classGrade);
    try {
      const res = await RoselandApi.academic.signOffReports({ class_grade: classGrade });
      toast.success(res?.message || `Published terminal reports for ${classGrade}`);
      await loadReportStatus();
    } catch (err: any) {
      console.error('Report sign-off failed:', err);
      toast.error(err?.message || `Failed to sign off ${classGrade} reports.`);
    } finally {
      setSigningOffClass(null);
    }
  };

  const handleReopenClassBatch = async (classGrade: string) => {
    setReopeningClass(classGrade);
    try {
      const res = await RoselandApi.academic.reopenReports({ class_grade: classGrade });
      toast.success(res?.message || `Re-opened gradebook for ${classGrade}. You can now edit scores.`);
      await loadReportStatus();
    } catch (err: any) {
      console.error('Report reopen failed:', err);
      toast.error(err?.message || `Failed to re-open ${classGrade} reports.`);
    } finally {
      setReopeningClass(null);
    }
  };

  const handleOpenScoreEditor = (
    student: { indexNo: string; name: string; classGrade: string },
    score?: AssessmentScore,
    defaultSubject?: string
  ) => {
    const sub = score?.subject || defaultSubject || 'Mathematics';
    setIsCustomSubjectScoreEdit(!GES_STANDARD_SUBJECTS.includes(sub as any));
    setEditingScoreDraft({
      studentIndexNo: student.indexNo,
      studentName: student.name,
      classGrade: student.classGrade,
      subject: sub,
      classwork10: score?.classwork_10 ?? 8.0,
      project10: score?.project_10 ?? 8.0,
      midterm10: score?.midterm_10 ?? 7.5,
      attendance10: score?.attendance_10 ?? 9.0,
      terminalExam60: score?.terminal_exam_60 ?? 45.0,
      teacherRemark: score?.teacher_remark || 'Commendable effort and steady participation.',
    });
  };

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScoreDraft) return;

    setIsSavingScore(true);
    try {
      await RoselandApi.academic.saveScore({
        student_index_no: editingScoreDraft.studentIndexNo,
        student_name: editingScoreDraft.studentName,
        class_grade: editingScoreDraft.classGrade,
        subject: editingScoreDraft.subject,
        classwork_10: Number(editingScoreDraft.classwork10 || 0),
        project_10: Number(editingScoreDraft.project10 || 0),
        midterm_10: Number(editingScoreDraft.midterm10 || 0),
        attendance_10: Number(editingScoreDraft.attendance10 || 0),
        terminal_exam_60: Number(editingScoreDraft.terminalExam60 || 0),
        teacher_remark: editingScoreDraft.teacherRemark,
      });

      toast.success(`Saved continuous assessment score for ${editingScoreDraft.subject}`);
      setEditingScoreDraft(null);

      // Refresh both gradebook roster and overall report status
      if (activeScoreReviewClass) await loadRoster(activeScoreReviewClass);
      await loadReportStatus();
    } catch (err: any) {
      console.error('Failed to save assessment score:', err);
      toast.error(err?.message || 'Could not save the assessment score.');
    } finally {
      setIsSavingScore(false);
    }
  };

  const handleViewOfficialReportCard = async (studentIndexNo: string) => {
    setReportDossier({
      loading: true,
      error: null,
      data: null,
      isEditingRemarks: false,
      isSavingRemarks: false,
      formMasterRemark: '',
      headmasterRemark: '',
      conduct: 'Exemplary',
      attitude: 'Consistent & Studious',
      neatness: 'Very Good',
      interests: 'Science, Robotics & Debating',
    });

    try {
      const res = await RoselandApi.academic.getTerminalReportCard(studentIndexNo);
      setReportDossier({
        loading: false,
        error: null,
        data: res,
        isEditingRemarks: false,
        isSavingRemarks: false,
        formMasterRemark: res?.signOffs?.formMaster?.remark || '',
        headmasterRemark: res?.signOffs?.headmaster?.remark || '',
        conduct: res?.affectiveDomain?.conduct || 'Exemplary',
        attitude: res?.affectiveDomain?.attitude || 'Consistent & Studious',
        neatness: res?.affectiveDomain?.neatness || 'Very Good',
        interests: res?.affectiveDomain?.interests || 'Science, Robotics & Debating',
      });
    } catch (err: any) {
      console.error('Failed to fetch terminal report card:', err);
      setReportDossier({
        loading: false,
        error: err?.message || 'Could not load official terminal report card.',
        data: null,
        isEditingRemarks: false,
        isSavingRemarks: false,
        formMasterRemark: '',
        headmasterRemark: '',
        conduct: '',
        attitude: '',
        neatness: '',
        interests: '',
      });
    }
  };

  const handleSaveReportRemarks = async () => {
    if (!reportDossier || !reportDossier.data?.student?.indexNo) return;

    setReportDossier((prev) => prev ? { ...prev, isSavingRemarks: true } : null);
    try {
      await RoselandApi.academic.updateReportRemarks({
        student_index_no: reportDossier.data.student.indexNo,
        conduct_rating: reportDossier.conduct,
        attitude_rating: reportDossier.attitude,
        interest_rating: reportDossier.interests,
        form_master_remark: reportDossier.formMasterRemark,
        headmaster_remark: reportDossier.headmasterRemark,
      });

      toast.success('Updated remarks and affective domain assessment.');
      // Refetch official report
      await handleViewOfficialReportCard(reportDossier.data.student.indexNo);
    } catch (err: any) {
      console.error('Failed to update remarks:', err);
      toast.error(err?.message || 'Could not update report card remarks.');
      setReportDossier((prev) => prev ? { ...prev, isSavingRemarks: false } : null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Academic Council Operations
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Class Streams, Timetables & Report Cards
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Manage cohort schedules, master bell matrices, continuous assessment schemes, and terminal report card approvals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            className="text-xs px-4 py-2.5 shadow-sm border-purple-200 text-brand-violet hover:bg-purple-50"
            icon={<i className="ph-bold ph-archive-box text-brand-violet"></i>}
            onClick={() => {
              setHistoricalTargetClass('Primary 1');
              setIsHistoricalImportOpen(true);
            }}
          >
            Digitize Paper Records (CSV)
          </Button>
          <Button
            variant="primary"
            className="text-xs px-4 py-2.5 shadow-sm"
            icon={<i className="ph-bold ph-plus-circle"></i>}
            onClick={() => setIsAddClassModalOpen(true)}
          >
            Register Class Stream
          </Button>
          <Button
            variant="secondary"
            className="text-xs px-4 py-2.5 shadow-sm"
            icon={<i className="ph-bold ph-book-bookmark"></i>}
            onClick={() => setIsAddSubjectModalOpen(true)}
          >
            Register Subject
          </Button>
          <Button
            variant="muted"
            className="text-xs px-4 py-2.5"
            icon={<i className="ph-bold ph-sliders"></i>}
            onClick={() => setIsWeightModalOpen(true)}
          >
            CA Weighting Scheme
          </Button>
          <Button
            variant="secondary"
            className="text-xs px-4 py-2.5"
            icon={<i className="ph-bold ph-printer"></i>}
            disabled={!selectedTimetableClass}
            onClick={() => {
              setActiveTab('timetable');
              setIsPrintGazetteOpen(true);
            }}
          >
            Print Timetable Gazette
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {([
          { key: 'streams', icon: 'ph-chalkboard-teacher', label: 'Class Streams & Form Masters' },
          { key: 'subjects', icon: 'ph-book-bookmark', label: 'Curriculum & Subjects Registry' },
          { key: 'timetable', icon: 'ph-calendar-check', label: 'Master Timetable & Period Scheduler' },
          { key: 'reports', icon: 'ph-file-text', label: 'Report Cards Sign-Off Console' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.key ? 'bg-brand-violet text-white shadow-sm' : 'text-brand-textMuted hover:bg-white'
            }`}
          >
            <i className={`ph-bold ${tab.icon} mr-1.5`}></i> {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 1. CLASS STREAMS VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'streams' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif font-bold text-lg text-brand-textMain">Active Class Streams</h2>
              <p className="text-xs text-brand-textMuted">
                Form master assignments from faculty allocations, enrolment from the student roster, and live CA submission rates.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!isLoadingStreams && streams.length > 0 && (
                <div className="text-xs font-bold text-brand-violet bg-brand-violetLight px-3 py-1.5 rounded-xl self-start sm:self-auto">
                  {streams.length} Registered Cohort{streams.length === 1 ? '' : 's'} • {totalPupils} Enrolled Pupil{totalPupils === 1 ? '' : 's'}
                </div>
              )}
              <Button
                variant="primary"
                className="text-xs px-3.5 py-1.5"
                icon={<i className="ph-bold ph-plus"></i>}
                onClick={() => setIsAddClassModalOpen(true)}
              >
                Add Stream
              </Button>
            </div>
          </div>

          {isLoadingStreams ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-xs text-brand-textMuted">
              <div className="w-6 h-6 border-2 border-brand-violet border-t-transparent rounded-full animate-spin"></div>
              Loading class streams from the academic service...
            </div>
          ) : streamsError ? (
            <div className="p-10 flex flex-col items-center justify-center gap-3 text-center">
              <i className="ph-bold ph-warning-circle text-3xl text-red-500"></i>
              <strong className="text-sm font-bold text-brand-textMain">Could not load class streams</strong>
              <p className="text-xs text-brand-textMuted max-w-md">{streamsError}</p>
              <Button variant="secondary" className="text-xs mt-1" onClick={loadStreams}>Retry</Button>
            </div>
          ) : streams.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
              <i className="ph-bold ph-chalkboard text-4xl text-gray-300"></i>
              <strong className="text-sm font-bold text-brand-textMain">No class streams registered yet</strong>
              <p className="text-xs text-brand-textMuted max-w-md">
                Register canonical class streams or enroll students in the SIS module.
              </p>
              <Button
                variant="primary"
                className="text-xs mt-2"
                icon={<i className="ph-bold ph-plus-circle"></i>}
                onClick={() => setIsAddClassModalOpen(true)}
              >
                Register First Stream
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-brand-bg text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 text-[10px]">
                  <tr>
                    <th className="py-4 px-6">Class Stream</th>
                    <th className="py-4 px-4">Room & Capacity</th>
                    <th className="py-4 px-4">Form Master / Tutor</th>
                    <th className="py-4 px-4">Allocated Subjects</th>
                    <th className="py-4 px-4">Enrolled Pupils</th>
                    <th className="py-4 px-4">CA Submission</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {streams.map((st) => {
                    const levelLabel = st.levelCategory ? st.levelCategory.replace('_', ' ') : 'CORE';
                    const isNearCap = st.capacity && st.pupils >= st.capacity * 0.9;
                    return (
                      <tr key={st.classGrade} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <strong className="text-sm font-bold text-brand-textMain block">{st.classGrade}</strong>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-brand-violetLight text-brand-violet border border-purple-200">
                              {levelLabel}
                            </span>
                          </div>
                          {st.baseTuitionFee && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              Tuition: GH₵ {st.baseTuitionFee.toFixed(2)}
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <span className="font-bold text-brand-textMain block font-mono">
                            {st.roomNumber || 'Room 101'}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Max Cap: {st.capacity || 35} seats
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <span className={`font-bold block ${st.formMaster === 'Unassigned' ? 'text-gray-400 italic' : 'text-brand-textMain'}`}>
                            {st.formMaster}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {st.formMaster === 'Unassigned' ? 'No allocation recorded' : 'Class In-Charge'}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          {st.subjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {st.subjects.slice(0, 3).map((sub) => (
                                <span key={sub} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-[9px] font-bold">
                                  {sub}
                                </span>
                              ))}
                              {st.subjects.length > 3 && (
                                <span className="text-[9px] text-gray-400 font-bold self-center">
                                  +{st.subjects.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">None allocated</span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          {st.pupils > 0 ? (
                            <div>
                              <span className={`font-bold px-2.5 py-1 rounded-lg text-xs ${
                                isNearCap ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-brand-violetLight/60 text-brand-violet'
                              }`}>
                                {st.pupils} / {st.capacity || 35} Pupils
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">0 / {st.capacity || 35} enrolled</span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          {st.caSubmissionPct === null ? (
                            <span className="text-gray-400 italic text-[11px]">—</span>
                          ) : (
                            <div>
                              <span className={`font-bold px-2 py-0.5 rounded-md ${
                                st.caSubmissionPct >= 100 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {st.caSubmissionPct}%
                              </span>
                              <span className="text-[10px] text-gray-400 block mt-0.5 font-mono">
                                {st.pupilsWithScores}/{st.pupils} with scores
                              </span>
                              {st.orphanedScorePupils > 0 && (
                                <span
                                  className="text-[10px] text-amber-700 block mt-0.5 font-bold"
                                  title="Assessment scores exist for pupils who are not on this class's SIS roster — likely transferred or renamed records."
                                >
                                  <i className="ph-bold ph-warning"></i> {st.orphanedScorePupils} unrostered
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTimetableClass(st.classGrade);
                                setActiveTab('timetable');
                              }}
                              className="px-2.5 py-1.5 bg-brand-violetLight text-brand-violet rounded-lg hover:bg-brand-violet hover:text-white transition-colors text-[11px] font-bold flex items-center gap-1"
                              title="Open Timetable Studio"
                            >
                              <i className="ph-bold ph-calendar"></i>
                              <span className="hidden sm:inline">Timetable</span>
                            </button>
                            <button
                              type="button"
                              disabled={!st.classId}
                              onClick={() => {
                                if (!st.classId) return;
                                setEditingClass({
                                  id: st.classId,
                                  oldName: st.classGrade,
                                  stage: st.stage || st.classGrade.split(' ').slice(0, -1).join(' ') || st.classGrade,
                                  stream_name: st.streamName || st.classGrade.split(' ').slice(-1)[0] || '',
                                  level_category: st.levelCategory || 'LOWER_PRIMARY',
                                  class_teacher_name: st.formMaster !== 'Unassigned' ? st.formMaster : '',
                                  room_number: st.roomNumber || 'Room 101',
                                  capacity: st.capacity || 35,
                                  base_tuition_fee: st.baseTuitionFee || 1850.0,
                                });
                                setIsEditClassModalOpen(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-brand-textMain hover:bg-gray-100 rounded-lg transition-colors"
                              title="Modify Class Stream"
                            >
                              <i className="ph-bold ph-pencil-simple text-sm"></i>
                            </button>
                            <button
                              type="button"
                              disabled={!st.classId}
                              onClick={() => {
                                if (!st.classId) return;
                                setDeletingClass(st);
                                setMigrationTargetClassId('');
                                setConfirmArchiveOnly(false);
                                setIsDeleteClassModalOpen(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete or Migrate Class"
                            >
                              <i className="ph-bold ph-trash text-sm"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CURRICULUM & SUBJECTS REGISTRY DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'subjects' && (() => {
        const filteredSubjects = registeredSubjects.filter((sub) => {
          const matchesSearch =
            !subjectSearch ||
            sub.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
            sub.code.toLowerCase().includes(subjectSearch.toLowerCase()) ||
            (sub.description && sub.description.toLowerCase().includes(subjectSearch.toLowerCase()));
          const matchesDept = subjectDeptFilter === 'ALL' || sub.department === subjectDeptFilter;
          return matchesSearch && matchesDept;
        });

        const coreCount = registeredSubjects.filter((s) => s.is_core).length;
        const electiveCount = registeredSubjects.filter((s) => !s.is_core).length;
        const departmentsList = Array.from(new Set(registeredSubjects.map((s) => s.department)));

        return (
          <div className="space-y-6">
            {/* Quick KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-violetLight flex items-center justify-center text-brand-violet text-xl font-bold">
                  <i className="ph-bold ph-book-bookmark"></i>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider block">Total Subjects</span>
                  <span className="text-2xl font-serif font-bold text-brand-textMain">{registeredSubjects.length}</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-xl font-bold">
                  <i className="ph-bold ph-seal-check"></i>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider block">Core Curriculum</span>
                  <span className="text-2xl font-serif font-bold text-emerald-600">{coreCount}</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 text-xl font-bold">
                  <i className="ph-bold ph-sparkle"></i>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider block">Elective Tracks</span>
                  <span className="text-2xl font-serif font-bold text-purple-600">{electiveCount}</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 text-xl font-bold">
                  <i className="ph-bold ph-buildings"></i>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider block">Departments</span>
                  <span className="text-2xl font-serif font-bold text-blue-600">{departmentsList.length || 1}</span>
                </div>
              </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif font-bold text-lg text-brand-textMain">Ghana National (GES / NaCCA) & School Curriculum Directory</h2>
                  <p className="text-xs text-brand-textMuted">
                    Single source of truth for academic subjects across Master Timetables, Continuous Assessment (CA) Gradebook, CBT Assessments, and Faculty Allocations.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <i className="ph-bold ph-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                    <input
                      type="text"
                      placeholder="Search code or title..."
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      className="pl-9 pr-3.5 py-2 bg-brand-bg border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-violet w-48 sm:w-60"
                    />
                  </div>

                  <select
                    value={subjectDeptFilter}
                    onChange={(e) => setSubjectDeptFilter(e.target.value)}
                    className="px-3.5 py-2 bg-brand-bg border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-violet font-semibold text-brand-textMain"
                  >
                    <option value="ALL">All Departments</option>
                    <option value="STEM">STEM</option>
                    <option value="LANGUAGES">Languages</option>
                    <option value="HUMANITIES">Humanities</option>
                    <option value="CREATIVE_ARTS">Creative Arts</option>
                    <option value="TECHNICAL_VOCATIONAL">Technical / Vocational</option>
                    <option value="EARLY_CHILDHOOD">Early Childhood</option>
                    <option value="GENERAL">General</option>
                  </select>

                  <Button
                    variant="primary"
                    className="text-xs px-3.5 py-2"
                    icon={<i className="ph-bold ph-plus"></i>}
                    onClick={() => setIsAddSubjectModalOpen(true)}
                  >
                    Register Subject
                  </Button>
                </div>
              </div>

              {registeredSubjects.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-brand-violetLight/50 flex items-center justify-center text-brand-violet text-2xl font-bold">
                    <i className="ph-bold ph-book-open"></i>
                  </div>
                  <strong className="text-sm font-bold text-brand-textMain">No subjects registered yet</strong>
                  <p className="text-xs text-brand-textMuted max-w-md">
                    Register canonical curriculum subjects to populate options for timetable schedules, continuous assessments, and faculty allocations.
                  </p>
                  <Button
                    variant="primary"
                    className="text-xs px-4 py-2 mt-2"
                    icon={<i className="ph-bold ph-plus-circle"></i>}
                    onClick={() => setIsAddSubjectModalOpen(true)}
                  >
                    Register First Subject
                  </Button>
                </div>
              ) : filteredSubjects.length === 0 ? (
                <div className="p-12 text-center text-xs text-brand-textMuted">
                  No subjects found matching your search or department filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-brand-bg text-[10px] font-bold uppercase tracking-wider text-brand-textMuted border-b border-gray-100">
                        <th className="py-3.5 px-6">Code</th>
                        <th className="py-3.5 px-6">Subject Full Title</th>
                        <th className="py-3.5 px-6">Department</th>
                        <th className="py-3.5 px-6">Target Levels</th>
                        <th className="py-3.5 px-6">Classification</th>
                        <th className="py-3.5 px-6 text-center">Weekly Periods</th>
                        <th className="py-3.5 px-6">Default Facility</th>
                        <th className="py-3.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredSubjects.map((sub) => {
                        const levels = (sub.level_categories || '')
                          .split(',')
                          .map((l) => l.trim().replace(/_/g, ' '))
                          .filter(Boolean);

                        return (
                          <tr key={sub.id} className="hover:bg-brand-bg/50 transition-colors">
                            <td className="py-4 px-6 font-mono font-bold text-brand-violet">
                              <span className="bg-brand-violetLight/70 px-2 py-1 rounded-lg">
                                {sub.code}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-bold text-brand-textMain">{sub.name}</div>
                              {sub.description && (
                                <div className="text-[11px] text-brand-textMuted line-clamp-1 mt-0.5">
                                  {sub.description}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 uppercase">
                                {sub.department}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {levels.map((lvl) => (
                                  <span
                                    key={lvl}
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-brand-violet capitalize"
                                  >
                                    {lvl.toLowerCase()}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              {sub.is_core ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                  <i className="ph-bold ph-check"></i> Core
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                                  <i className="ph-bold ph-sparkle"></i> Elective
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center font-mono font-bold text-brand-textMain">
                              {sub.weekly_periods} / wk
                            </td>
                            <td className="py-4 px-6 text-brand-textMuted font-medium">
                              <div className="flex items-center gap-1.5">
                                <i className="ph-bold ph-chalkboard text-gray-400"></i>
                                <span>{sub.default_room_type}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button
                                type="button"
                                disabled={isDeletingSubjectId === sub.id}
                                onClick={() => handleDeleteSubject(sub.id, sub.name)}
                                className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                title="Remove subject from registry"
                              >
                                <i className="ph-bold ph-trash text-sm"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 3. MASTER TIMETABLE & PERIOD SCHEDULER STUDIO */}
      {/* ========================================================================= */}
      {activeTab === 'timetable' && (
        <div className="space-y-6">

          {/* Controls Bar */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label htmlFor="cohort-select" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Active Class Cohort
                </label>
                <select
                  id="cohort-select"
                  value={selectedTimetableClass}
                  onChange={(e) => setSelectedTimetableClass(e.target.value)}
                  disabled={streams.length === 0}
                  className="bg-brand-bg border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet disabled:opacity-60"
                >
                  {streams.length === 0 && <option value="">No cohorts available</option>}
                  {streams.map((s) => (
                    <option key={s.classGrade} value={s.classGrade}>{s.classGrade}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Weekday Filter
                </span>
                <div className="flex items-center gap-1 bg-brand-bg p-1 rounded-xl border border-gray-200 text-xs font-bold">
                  {['all', ...WEEKDAYS].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDayFilter(day)}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        selectedDayFilter === day ? 'bg-brand-violet text-white shadow-xs' : 'text-gray-500 hover:text-brand-textMain'
                      }`}
                    >
                      {day === 'all' ? 'Full Week' : day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {activeClassData && (
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-bold text-brand-textMain block">{activeClassData.classGrade}</span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Form Master: {activeClassData.formMaster} • {activeClassData.pupils} pupils
                  </span>
                </div>
              )}
              <Button
                variant="secondary"
                className="text-xs px-4 py-2 shrink-0"
                icon={<i className="ph-bold ph-plus"></i>}
                disabled={!selectedTimetableClass}
                onClick={() => openNewSlotDraft('Monday')}
              >
                Add Period
              </Button>
              <Button
                variant="primary"
                className="text-xs px-4 py-2 shrink-0"
                icon={<i className="ph-bold ph-printer"></i>}
                disabled={!selectedTimetableClass}
                onClick={() => setIsPrintGazetteOpen(true)}
              >
                Print Weekly Gazette
              </Button>
            </div>
          </div>

          {/* Live Collision Intelligence — driven by the scheduling engine */}
          {collisions.checked && (
            <div className={`border p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs ${
              collisions.count > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center text-lg shrink-0 ${
                  collisions.count > 0 ? 'bg-red-600' : 'bg-emerald-600'
                }`}>
                  <i className={`ph-bold ${collisions.count > 0 ? 'ph-warning' : 'ph-bell-ringing'}`}></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className={`font-bold ${collisions.count > 0 ? 'text-red-950' : 'text-emerald-950'}`}>
                      Schedule Conflict Analysis
                    </strong>
                    {collisions.totalSchoolCount > 0 && collisions.totalSchoolCount !== collisions.count && (
                      <span className="text-[10px] font-mono text-gray-500 bg-white/80 px-2 py-0.5 rounded-md border border-gray-200">
                        {collisions.totalSchoolCount} School-Wide
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] ${collisions.count > 0 ? 'text-red-800' : 'text-emerald-800'}`}>
                    {collisions.count > 0
                      ? `${collisions.count} conflict${collisions.count === 1 ? '' : 's'} detected across teachers or facilities for ${selectedTimetableClass}.`
                      : `No teacher or facility conflicts detected across ${slots.length} scheduled period${slots.length === 1 ? '' : 's'}.`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsConflictModalOpen(true)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 ${
                    collisions.count > 0
                      ? 'bg-red-600 text-white hover:bg-red-700 shadow-xs'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                  }`}
                >
                  <i className={`ph-bold ${collisions.count > 0 ? 'ph-magnifying-glass' : 'ph-check-circle'}`}></i>
                  {collisions.count > 0 ? 'Inspect Conflicts' : 'Verification Details'}
                </button>
                <span className={`px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold uppercase shrink-0 ${
                  collisions.count > 0 ? 'bg-red-100 text-red-900 border border-red-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                }`}>
                  ● {collisions.count > 0 ? 'Action Required' : 'Verified Clear'}
                </span>
              </div>
            </div>
          )}

          {/* Timetable Matrix */}
          {isLoadingSlots ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center gap-3 text-xs text-brand-textMuted">
              <div className="w-6 h-6 border-2 border-brand-violet border-t-transparent rounded-full animate-spin"></div>
              Loading timetable for {selectedTimetableClass}...
            </div>
          ) : slotsError ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 flex flex-col items-center justify-center gap-3 text-center">
              <i className="ph-bold ph-warning-circle text-3xl text-red-500"></i>
              <strong className="text-sm font-bold text-brand-textMain">Could not load timetable</strong>
              <p className="text-xs text-brand-textMuted max-w-md">{slotsError}</p>
              <Button variant="secondary" className="text-xs mt-1" onClick={() => loadSlots(selectedTimetableClass)}>
                Retry
              </Button>
            </div>
          ) : !selectedTimetableClass ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center gap-2 text-center">
              <i className="ph-bold ph-calendar-x text-4xl text-gray-300"></i>
              <strong className="text-sm font-bold text-brand-textMain">No cohort selected</strong>
              <p className="text-xs text-brand-textMuted">Register a class stream first to build its timetable.</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center gap-3 text-center">
              <i className="ph-bold ph-calendar-plus text-4xl text-gray-300"></i>
              <strong className="text-sm font-bold text-brand-textMain">
                No periods scheduled for {selectedTimetableClass}
              </strong>
              <p className="text-xs text-brand-textMuted max-w-md">
                This cohort has no timetable slots yet. Use <strong>Add Period</strong> to build the weekly bell matrix.
              </p>
              <Button
                variant="primary"
                className="text-xs mt-1"
                icon={<i className="ph-bold ph-plus"></i>}
                onClick={() => openNewSlotDraft('Monday')}
              >
                Add First Period
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {visibleDays.map((day) => {
                const daySlots = slotsByDay.get(day) || [];
                return (
                  <div key={day} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-brand-violetLight text-brand-violet flex items-center justify-center font-bold text-xs">
                          {day.slice(0, 2)}
                        </span>
                        <div>
                          <h3 className="font-serif font-bold text-base text-brand-textMain">{day} Schedule</h3>
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                            {daySlots.length} scheduled period{daySlots.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-brand-violet bg-brand-violetLight/50 px-3 py-1 rounded-xl">
                        {selectedTimetableClass}
                      </span>
                    </div>

                    {daySlots.length === 0 ? (
                      <div className="py-6 text-center">
                        <p className="text-xs text-brand-textMuted italic">
                          No periods scheduled for {day}.
                        </p>
                        <Button
                          variant="ghost"
                          className="text-xs mt-2"
                          icon={<i className="ph-bold ph-plus"></i>}
                          onClick={() => openNewSlotDraft(day)}
                        >
                          Add a {day} period
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {daySlots.map((slot) => {
                          const slotConflict = (collisions.details || []).find((c: any) =>
                            c.day === slot.day &&
                            Number(c.period) === Number(slot.period_number) &&
                            (c.firstClass === slot.class_grade || c.secondClass === slot.class_grade)
                          );

                          return (
                            <div
                              key={slot.id}
                              onClick={() => handleStartEditSlot(slot)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleStartEditSlot(slot);
                                }
                              }}
                              className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:scale-[1.01] flex flex-col justify-between relative group ${
                                slotConflict
                                  ? 'bg-red-50/90 border-red-400 ring-2 ring-red-200 text-red-950'
                                  : SLOT_TYPE_STYLES[slot.slot_type] || SLOT_TYPE_STYLES.academic
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-80">
                                    {slot.time_range}
                                  </span>
                                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-white/70 shadow-2xs">
                                    {slot.slot_label}
                                  </span>
                                </div>
                                <h4 className="font-bold text-xs leading-snug line-clamp-2 mb-1">{slot.subject}</h4>
                                {slotConflict && (
                                  <div className="flex items-center gap-1 text-[9px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md border border-red-200 mb-1">
                                    <i className="ph-bold ph-warning text-red-600 shrink-0"></i>
                                    <span className="truncate">
                                      {slotConflict.type === 'TEACHER_COLLISION'
                                        ? `Clash: ${slotConflict.target}`
                                        : slotConflict.type === 'FACILITY_COLLISION'
                                        ? `Facility: ${slotConflict.target}`
                                        : 'Period Overlap'}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-black/5 mt-2 flex items-center justify-between text-[10px] opacity-90">
                                <span className="truncate max-w-[120px]">
                                  <i className="ph-bold ph-user text-[10px] mr-1"></i> {slot.teacher_name}
                                </span>
                                <span className="font-mono text-[9px] truncate">
                                  <i className="ph-bold ph-map-pin text-[9px] mr-0.5"></i> {slot.room_facility}
                                </span>
                              </div>

                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-textMain text-white rounded-md p-1 text-[10px] shadow-sm">
                                <i className="ph-bold ph-pencil-simple"></i>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REPORT CARDS SIGN-OFF CONSOLE */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Historical Data Digitization Banner */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="space-y-2 relative z-10 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-[10px] font-mono font-bold uppercase tracking-wider text-purple-200">
                  Legacy Paper Migration Engine
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-400/20 text-emerald-300 text-[10px] font-bold">
                  ✓ Multi-Term Ingestion
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white">
                Historical Terminal Reports & Attendance Digitizer
              </h3>
              <p className="text-xs text-purple-200 leading-relaxed">
                Clear out physical broadsheets and paper report cards. Download pre-populated student rosters and batch-upload historical marks (SBA & Exam) and attendance rolls for previous academic sessions.
              </p>
            </div>

            <Button
              variant="secondary"
              className="bg-white hover:bg-gray-100 text-purple-950 font-bold text-xs px-5 py-3 rounded-xl shadow-lg shrink-0 relative z-10 flex items-center gap-2 border-0"
              icon={<i className="ph-bold ph-file-arrow-up text-brand-violet text-base"></i>}
              onClick={() => {
                setHistoricalTargetClass('Primary 1');
                setIsHistoricalImportOpen(true);
              }}
            >
              Batch Digitize Historical Reports
            </Button>
          </div>
          {isLoadingReports ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center gap-3 text-xs text-brand-textMuted">
              <div className="w-6 h-6 border-2 border-brand-violet border-t-transparent rounded-full animate-spin"></div>
              Loading report card readiness...
            </div>
          ) : reportsError ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 flex flex-col items-center justify-center gap-3 text-center">
              <i className="ph-bold ph-warning-circle text-3xl text-red-500"></i>
              <strong className="text-sm font-bold text-brand-textMain">Could not load report status</strong>
              <p className="text-xs text-brand-textMuted max-w-md">{reportsError}</p>
              <Button variant="secondary" className="text-xs mt-1" onClick={loadReportStatus}>Retry</Button>
            </div>
          ) : reportStatus.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center gap-2 text-center">
              <i className="ph-bold ph-file-dashed text-4xl text-gray-300"></i>
              <strong className="text-sm font-bold text-brand-textMain">No assessment scores recorded yet</strong>
              <p className="text-xs text-brand-textMuted max-w-md">
                Report cards become available for sign-off once teachers enter continuous assessment scores for a cohort.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reportStatus.map((rc) => {
                const isReady = !rc.isPublished && rc.pupilsIncomplete === 0;
                return (
                  <div key={rc.classGrade} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <span className="text-xs font-bold text-brand-violet uppercase tracking-wider">{rc.classGrade}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold text-center ${
                          rc.isPublished
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : isReady
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {rc.status}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-xl text-brand-textMain mb-1">
                        {rc.totalPupils} Pupil{rc.totalPupils === 1 ? '' : 's'} in Gradebook
                      </h4>
                      <p className="text-xs text-brand-textMuted">
                        <strong>{rc.pupilsComplete}</strong> complete • <strong>{rc.pupilsIncomplete}</strong> incomplete
                        {' '}• {rc.scoreEntries} score entr{rc.scoreEntries === 1 ? 'y' : 'ies'} recorded
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1 font-mono">
                        Completeness threshold: {rc.expectedSubjects} subjects per pupil
                      </p>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                      <Button
                        variant="muted"
                        className="text-xs px-4 py-2"
                        icon={<i className="ph-bold ph-table"></i>}
                        onClick={() => setActiveScoreReviewClass(rc.classGrade)}
                      >
                        Review Scores
                      </Button>

                      <div className="flex items-center gap-2">
                        {rc.isPublished ? (
                          <>
                            <Button
                              variant="muted"
                              className="text-xs px-3 py-2 text-brand-textMuted hover:text-amber-800 hover:bg-amber-50"
                              isLoading={reopeningClass === rc.classGrade}
                              loadingText="Re-opening..."
                              disabled={reopeningClass !== null || signingOffClass !== null}
                              icon={<i className="ph-bold ph-arrow-counter-clockwise"></i>}
                              onClick={() => handleReopenClassBatch(rc.classGrade)}
                            >
                              Re-open Cohort
                            </Button>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold">
                              <i className="ph-bold ph-seal-check"></i> Published
                            </span>
                          </>
                        ) : (
                          <Button
                            variant="primary"
                            className="text-xs px-4 py-2"
                            isLoading={signingOffClass === rc.classGrade}
                            loadingText="Publishing..."
                            disabled={signingOffClass !== null || reopeningClass !== null}
                            icon={<i className="ph-bold ph-check-circle"></i>}
                            onClick={() => handleSignOffClassBatch(rc.classGrade)}
                          >
                            Sign-Off Batch
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* A. PERIOD SLOT EDITOR */}
      {editingSlot && (() => {
        const classAllocated = getClassAllocatedSubjects(editingSlot.class_grade);
        const canonicalSubjectNames = registeredSubjects.length > 0
          ? registeredSubjects.map((s) => s.name)
          : [...GES_STANDARD_SUBJECTS];
        const otherStandardSubjects = canonicalSubjectNames.filter((s) => !classAllocated.includes(s));
        const nonAcademicSubs = NON_ACADEMIC_ACTIVITIES[editingSlot.slot_type] || [];
        const teacherMatch = getTeacherOptionsForSubject(editingSlot.subject, editingSlot.class_grade, editingSlot.slot_type);

        return (
          <Modal
            isOpen={!!editingSlot}
            onClose={() => setEditingSlot(null)}
            title={`Edit ${editingSlot.slot_label || 'Period Slot'}`}
            subtitle={`Period Configuration • ${editingSlot.day} • ${editingSlot.class_grade}`}
            size="lg"
          >
            <form onSubmit={handleSaveEditedSlot} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="edit-label" className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px] mb-1">
                    Slot Label *
                  </label>
                  <input
                    id="edit-label"
                    type="text"
                    required
                    value={editingSlot.slot_label}
                    onChange={(e) => setEditingSlot({ ...editingSlot, slot_label: e.target.value })}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                    placeholder="e.g. Period 1, Break, Science Lab"
                  />
                </div>
                <div>
                  <label htmlFor="edit-type" className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px] mb-1">
                    Slot Type *
                  </label>
                  <select
                    id="edit-type"
                    value={editingSlot.slot_type}
                    onChange={(e) => handleSlotTypeChangeEdit(e.target.value as SlotType)}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet capitalize"
                  >
                    {SLOT_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t} className="capitalize">{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="edit-day" className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px] mb-1">
                    Weekday *
                  </label>
                  <select
                    id="edit-day"
                    value={editingSlot.day}
                    onChange={(e) => setEditingSlot({ ...editingSlot, day: e.target.value as Weekday })}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  >
                    {WEEKDAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-order" className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px] mb-1">
                    Period Order (1–12) *
                  </label>
                  <input
                    id="edit-order"
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={editingSlot.period_number}
                    onChange={(e) => setEditingSlot({ ...editingSlot, period_number: Number(e.target.value) })}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-time" className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px] mb-1">
                  Time Range *
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    id="edit-time"
                    type="text"
                    required
                    placeholder="08:00 - 08:45"
                    value={editingSlot.time_range}
                    onChange={(e) => setEditingSlot({ ...editingSlot, time_range: e.target.value })}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  />
                  {PERIOD_TIME_PRESETS[editingSlot.period_number] && (
                    <button
                      type="button"
                      onClick={() => setEditingSlot({ ...editingSlot, time_range: PERIOD_TIME_PRESETS[editingSlot.period_number] })}
                      className="shrink-0 text-[10px] font-bold text-brand-violet bg-brand-violetLight/50 px-2.5 py-2.5 rounded-xl hover:bg-brand-violetLight transition-colors"
                      title="Use default time for this period"
                    >
                      Use Default ({PERIOD_TIME_PRESETS[editingSlot.period_number]})
                    </button>
                  )}
                </div>
              </div>

              {/* Subject Dropdown / Custom Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="edit-subject" className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px]">
                    Subject / Curricular Title *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomSubjectEdit(!isCustomSubjectEdit)}
                    className="text-[10px] text-brand-violet hover:underline font-medium"
                  >
                    {isCustomSubjectEdit ? 'Choose from standard subjects' : '+ Enter custom title'}
                  </button>
                </div>

                {isCustomSubjectEdit ? (
                  <input
                    id="edit-subject"
                    type="text"
                    required
                    value={editingSlot.subject}
                    onChange={(e) => handleSubjectChangeEdit(e.target.value)}
                    placeholder="e.g. Robotics, French Literature, Remedial Math"
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  />
                ) : (
                  <select
                    id="edit-subject"
                    required
                    value={editingSlot.subject}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomSubjectEdit(true);
                      } else {
                        handleSubjectChangeEdit(e.target.value);
                      }
                    }}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  >
                    {editingSlot.slot_type === 'academic' ? (
                      <>
                        {classAllocated.length > 0 && (
                          <optgroup label={`${editingSlot.class_grade} Allocated Subjects`}>
                            {classAllocated.map((sub) => (
                              <option key={sub} value={sub}>
                                {sub} (Allocated to {editingSlot.class_grade})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="Standard GES / NaCCA Core Curriculum">
                          {otherStandardSubjects.map((sub) => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </optgroup>
                      </>
                    ) : (
                      <optgroup label={`Standard ${editingSlot.slot_type.charAt(0).toUpperCase() + editingSlot.slot_type.slice(1)} Activities`}>
                        {nonAcademicSubs.map((act) => (
                          <option key={act} value={act}>{act}</option>
                        ))}
                      </optgroup>
                    )}
                    <option value="__custom__">+ Enter custom subject title...</option>
                  </select>
                )}
              </div>

              {/* Assigned Teacher Dropdown / Custom Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="edit-teacher" className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px]">
                    Assigned Teacher *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomTeacherEdit(!isCustomTeacherEdit)}
                    className="text-[10px] text-brand-violet hover:underline font-medium"
                  >
                    {isCustomTeacherEdit ? 'Choose from faculty roster' : '+ Enter custom teacher'}
                  </button>
                </div>

                {isCustomTeacherEdit ? (
                  <input
                    id="edit-teacher"
                    type="text"
                    required
                    value={editingSlot.teacher_name}
                    onChange={(e) => setEditingSlot({ ...editingSlot, teacher_name: e.target.value })}
                    placeholder="e.g. Mr. Kwame Appiah, Guest Lecturer"
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  />
                ) : (
                  <select
                    id="edit-teacher"
                    required
                    value={editingSlot.teacher_name}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomTeacherEdit(true);
                      } else {
                        setEditingSlot({ ...editingSlot, teacher_name: e.target.value });
                      }
                    }}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  >
                    {teacherMatch.allocatedTeachers.length > 0 && (
                      <optgroup label={`Teachers Allocated for "${editingSlot.subject}"`}>
                        {teacherMatch.allocatedTeachers.map((t) => (
                          <option key={t.name} value={t.name}>
                            {t.name} ({t.detail})
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {teacherMatch.otherTeachers.length > 0 && (
                      <optgroup label="Other Teaching Faculty">
                        {teacherMatch.otherTeachers.map((t) => (
                          <option key={t.name} value={t.name}>
                            {t.name} ({t.role})
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <optgroup label="Special Assignments & Roles">
                      {teacherMatch.roles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </optgroup>

                    <option value="__custom__">+ Enter custom teacher name...</option>
                  </select>
                )}

                {/* Intelligent allocation hint */}
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-brand-textMuted">
                  {teacherMatch.allocatedTeachers.length > 0 ? (
                    <>
                      <i className="ph-bold ph-check-circle text-emerald-600"></i>
                      <span>
                        Found {teacherMatch.allocatedTeachers.length} allocated teacher{teacherMatch.allocatedTeachers.length === 1 ? '' : 's'} for <strong>{editingSlot.subject}</strong> ({teacherMatch.allocatedTeachers.map(t => t.name).join(', ')}).
                      </span>
                    </>
                  ) : editingSlot.slot_type === 'academic' ? (
                    <>
                      <i className="ph-bold ph-info text-amber-600"></i>
                      <span>
                        No faculty specifically allocated to <strong>{editingSlot.subject}</strong>. You can assign any faculty or unassigned.
                      </span>
                    </>
                  ) : null}
                </div>
              </div>

              <div>
                <label htmlFor="edit-room" className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px] mb-1">
                  Facility / Room *
                </label>
                <input
                  id="edit-room"
                  type="text"
                  required
                  value={editingSlot.room_facility}
                  onChange={(e) => setEditingSlot({ ...editingSlot, room_facility: e.target.value })}
                  placeholder="e.g. Standard Homeroom, Science STEAM Lab"
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                />
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 text-xs"
                  isLoading={isSavingSlot}
                  loadingText="Saving..."
                  icon={<i className="ph-bold ph-check"></i>}
                >
                  Save Period Slot
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="text-xs"
                  disabled={isSavingSlot}
                  icon={<i className="ph-bold ph-trash"></i>}
                  onClick={() => handleDeleteSlot(editingSlot)}
                >
                  Remove
                </Button>
                <Button type="button" variant="muted" className="text-xs" onClick={() => setEditingSlot(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Modal>
        );
      })()}

      {/* B. ADD PERIOD SLOT */}
      {newSlotDraft && (() => {
        const classAllocated = getClassAllocatedSubjects(selectedTimetableClass);
        const canonicalSubjectNames = registeredSubjects.length > 0
          ? registeredSubjects.map((s) => s.name)
          : [...GES_STANDARD_SUBJECTS];
        const otherStandardSubjects = canonicalSubjectNames.filter((s) => !classAllocated.includes(s));
        const nonAcademicSubs = NON_ACADEMIC_ACTIVITIES[newSlotDraft.slot_type] || [];
        const teacherMatch = getTeacherOptionsForSubject(newSlotDraft.subject, selectedTimetableClass, newSlotDraft.slot_type);

        return (
          <Modal
            isOpen={!!newSlotDraft}
            onClose={() => setNewSlotDraft(null)}
            title="Add Period Slot"
            subtitle={`New Entry • ${selectedTimetableClass}`}
            size="lg"
          >
            <form onSubmit={handleCreateSlot} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="new-day" className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px] mb-1">
                    Weekday *
                  </label>
                  <select
                    id="new-day"
                    value={newSlotDraft.day}
                    onChange={(e) => {
                      const day = e.target.value as Weekday;
                      const existingForDay = slots.filter((s) => s.day === day);
                      const nextOrder = existingForDay.length > 0 ? Math.min(12, Math.max(...existingForDay.map((s) => s.period_number)) + 1) : 1;
                      setNewSlotDraft({
                        ...newSlotDraft,
                        day,
                        period_number: nextOrder,
                        time_range: PERIOD_TIME_PRESETS[nextOrder] || newSlotDraft.time_range,
                        slot_label: `Period ${nextOrder}`,
                      });
                    }}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  >
                    {WEEKDAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="new-order" className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px] mb-1">
                    Period Order (1–12) *
                  </label>
                  <input
                    id="new-order"
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={newSlotDraft.period_number}
                    onChange={(e) => {
                      const pNum = Number(e.target.value);
                      setNewSlotDraft({
                        ...newSlotDraft,
                        period_number: pNum,
                        time_range: PERIOD_TIME_PRESETS[pNum] || newSlotDraft.time_range,
                        slot_label: `Period ${pNum}`,
                      });
                    }}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="new-label" className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px] mb-1">
                    Slot Label
                  </label>
                  <input
                    id="new-label"
                    type="text"
                    placeholder={`Period ${newSlotDraft.period_number}`}
                    value={newSlotDraft.slot_label}
                    onChange={(e) => setNewSlotDraft({ ...newSlotDraft, slot_label: e.target.value })}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  />
                </div>
                <div>
                  <label htmlFor="new-type" className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px] mb-1">
                    Slot Type *
                  </label>
                  <select
                    id="new-type"
                    value={newSlotDraft.slot_type}
                    onChange={(e) => handleSlotTypeChangeNew(e.target.value as SlotType)}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet capitalize"
                  >
                    {SLOT_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t} className="capitalize">{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="new-time" className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px] mb-1">
                  Time Range *
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    id="new-time"
                    type="text"
                    required
                    placeholder="08:00 - 08:45"
                    value={newSlotDraft.time_range}
                    onChange={(e) => setNewSlotDraft({ ...newSlotDraft, time_range: e.target.value })}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  />
                  {PERIOD_TIME_PRESETS[newSlotDraft.period_number] && (
                    <button
                      type="button"
                      onClick={() => setNewSlotDraft({ ...newSlotDraft, time_range: PERIOD_TIME_PRESETS[newSlotDraft.period_number] })}
                      className="shrink-0 text-[10px] font-bold text-brand-violet bg-brand-violetLight/50 px-2.5 py-2.5 rounded-xl hover:bg-brand-violetLight transition-colors"
                      title="Use default time for this period"
                    >
                      Use Default ({PERIOD_TIME_PRESETS[newSlotDraft.period_number]})
                    </button>
                  )}
                </div>
              </div>

              {/* Subject Dropdown / Custom Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="new-subject" className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px]">
                    Subject / Curricular Title *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomSubjectNew(!isCustomSubjectNew)}
                    className="text-[10px] text-brand-violet hover:underline font-medium"
                  >
                    {isCustomSubjectNew ? 'Choose from standard subjects' : '+ Enter custom title'}
                  </button>
                </div>

                {isCustomSubjectNew ? (
                  <input
                    id="new-subject"
                    type="text"
                    required
                    value={newSlotDraft.subject}
                    onChange={(e) => handleSubjectChangeNew(e.target.value)}
                    placeholder="e.g. Robotics, French Literature, Remedial Math"
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  />
                ) : (
                  <select
                    id="new-subject"
                    required
                    value={newSlotDraft.subject}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomSubjectNew(true);
                      } else {
                        handleSubjectChangeNew(e.target.value);
                      }
                    }}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  >
                    {newSlotDraft.slot_type === 'academic' ? (
                      <>
                        {classAllocated.length > 0 && (
                          <optgroup label={`${selectedTimetableClass} Allocated Subjects`}>
                            {classAllocated.map((sub) => (
                              <option key={sub} value={sub}>
                                {sub} (Allocated to {selectedTimetableClass})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="Standard GES / NaCCA Core Curriculum">
                          {otherStandardSubjects.map((sub) => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </optgroup>
                      </>
                    ) : (
                      <optgroup label={`Standard ${newSlotDraft.slot_type.charAt(0).toUpperCase() + newSlotDraft.slot_type.slice(1)} Activities`}>
                        {nonAcademicSubs.map((act) => (
                          <option key={act} value={act}>{act}</option>
                        ))}
                      </optgroup>
                    )}
                    <option value="__custom__">+ Enter custom subject title...</option>
                  </select>
                )}
              </div>

              {/* Assigned Teacher Dropdown / Custom Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="new-teacher" className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px]">
                    Assigned Teacher *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomTeacherNew(!isCustomTeacherNew)}
                    className="text-[10px] text-brand-violet hover:underline font-medium"
                  >
                    {isCustomTeacherNew ? 'Choose from faculty roster' : '+ Enter custom teacher'}
                  </button>
                </div>

                {isCustomTeacherNew ? (
                  <input
                    id="new-teacher"
                    type="text"
                    required
                    value={newSlotDraft.teacher_name}
                    onChange={(e) => setNewSlotDraft({ ...newSlotDraft, teacher_name: e.target.value })}
                    placeholder="e.g. Mr. Kwame Appiah, Guest Lecturer"
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  />
                ) : (
                  <select
                    id="new-teacher"
                    required
                    value={newSlotDraft.teacher_name}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomTeacherNew(true);
                      } else {
                        setNewSlotDraft({ ...newSlotDraft, teacher_name: e.target.value });
                      }
                    }}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  >
                    {teacherMatch.allocatedTeachers.length > 0 && (
                      <optgroup label={`Teachers Allocated for "${newSlotDraft.subject}"`}>
                        {teacherMatch.allocatedTeachers.map((t) => (
                          <option key={t.name} value={t.name}>
                            {t.name} ({t.detail})
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {teacherMatch.otherTeachers.length > 0 && (
                      <optgroup label="Other Teaching Faculty">
                        {teacherMatch.otherTeachers.map((t) => (
                          <option key={t.name} value={t.name}>
                            {t.name} ({t.role})
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <optgroup label="Special Assignments & Roles">
                      {teacherMatch.roles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </optgroup>

                    <option value="__custom__">+ Enter custom teacher name...</option>
                  </select>
                )}

                {/* Intelligent allocation hint */}
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-brand-textMuted">
                  {teacherMatch.allocatedTeachers.length > 0 ? (
                    <>
                      <i className="ph-bold ph-check-circle text-emerald-600"></i>
                      <span>
                        Found {teacherMatch.allocatedTeachers.length} allocated teacher{teacherMatch.allocatedTeachers.length === 1 ? '' : 's'} for <strong>{newSlotDraft.subject}</strong> ({teacherMatch.allocatedTeachers.map(t => t.name).join(', ')}).
                      </span>
                    </>
                  ) : newSlotDraft.slot_type === 'academic' ? (
                    <>
                      <i className="ph-bold ph-info text-amber-600"></i>
                      <span>
                        No faculty specifically allocated to <strong>{newSlotDraft.subject}</strong>. You can assign any faculty or unassigned.
                      </span>
                    </>
                  ) : null}
                </div>
              </div>

              <div>
                <label htmlFor="new-room" className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px] mb-1">
                  Facility / Room *
                </label>
                <input
                  id="new-room"
                  type="text"
                  required
                  value={newSlotDraft.room_facility}
                  onChange={(e) => setNewSlotDraft({ ...newSlotDraft, room_facility: e.target.value })}
                  placeholder="e.g. Standard Homeroom, Science STEAM Lab"
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 text-xs"
                  isLoading={isSavingSlot}
                  loadingText="Adding..."
                  icon={<i className="ph-bold ph-plus"></i>}
                >
                  Add Period Slot
                </Button>
                <Button type="button" variant="muted" className="text-xs" onClick={() => setNewSlotDraft(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Modal>
        );
      })()}

      {/* C. SCHEDULE CONFLICT INSPECTOR MODAL */}
      <Modal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        title="Schedule Conflict Analysis"
        subtitle={`Institutional Timetable Verification • ${selectedTimetableClass || 'All Classes'}`}
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {collisions.count === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl mx-auto flex items-center justify-center text-2xl shadow-sm">
                <i className="ph-bold ph-check-circle"></i>
              </div>
              <h4 className="font-bold text-emerald-950 text-sm">No Timetable Collisions Detected</h4>
              <p className="text-emerald-800 text-xs max-w-md mx-auto leading-relaxed">
                The institutional scheduling engine has verified that no teachers, specialized facilities (laboratories/studios), or classroom period slots are double-booked for <strong>{selectedTimetableClass}</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl p-3 text-red-950">
                <div className="flex items-center gap-2">
                  <i className="ph-bold ph-warning text-red-600 text-base"></i>
                  <span className="font-bold">
                    {collisions.count} conflict{collisions.count === 1 ? '' : 's'} requiring administrative resolution
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-red-100 text-red-900 px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              </div>

              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {collisions.details.map((c: any, idx: number) => {
                  const isTeacher = c.type === 'TEACHER_COLLISION';
                  const isFacility = c.type === 'FACILITY_COLLISION';
                  return (
                    <div
                      key={c.id || idx}
                      className="border border-red-200 bg-white rounded-2xl p-4 shadow-xs space-y-2.5 hover:border-red-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider ${
                          isTeacher
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : isFacility
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                        }`}>
                          {isTeacher ? 'Teacher Double-Booking' : isFacility ? 'Facility Clash' : 'Class Period Overlap'}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 font-mono">
                          {c.day} • Period {c.period} {c.timeRange ? `(${c.timeRange})` : ''}
                        </span>
                      </div>

                      <div className="bg-brand-bg rounded-xl p-3 text-xs space-y-1.5 border border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-brand-textMain">Conflicting Entity:</span>
                          <span className="font-mono font-bold text-brand-violet bg-brand-violetLight/50 px-2 py-0.5 rounded-md text-[11px]">
                            {c.target}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-gray-200/60 text-[11px]">
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-bold">Class 1</span>
                            <strong className="text-brand-textMain">{c.firstClass}</strong>
                            {c.firstSubject && <span className="block text-gray-500 text-[10px]">{c.firstSubject}</span>}
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-bold">Class 2</span>
                            <strong className="text-brand-textMain">{c.secondClass}</strong>
                            {c.secondSubject && <span className="block text-gray-500 text-[10px]">{c.secondSubject}</span>}
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-red-900 leading-relaxed font-medium">
                        {c.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button
              variant="secondary"
              className="text-xs"
              onClick={() => setIsConflictModalOpen(false)}
            >
              Close Inspector
            </Button>
          </div>
        </div>
      </Modal>

      {/* D. OFFICIAL TIMETABLE GAZETTE */}
      {isPrintGazetteOpen && (
        <Modal
          isOpen={isPrintGazetteOpen}
          onClose={() => setIsPrintGazetteOpen(false)}
          title="Master Class Weekly Schedule & Bell Gazette"
          subtitle="Official Institutional Gazette"
          size="4xl"
        >
          {isLoadingGazette ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-xs text-brand-textMuted">
              <div className="w-6 h-6 border-2 border-brand-violet border-t-transparent rounded-full animate-spin"></div>
              Loading official gazette...
            </div>
          ) : !gazette ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
              <i className="ph-bold ph-file-x text-4xl text-gray-300"></i>
              <strong className="text-sm font-bold text-brand-textMain">Gazette unavailable</strong>
              <p className="text-xs text-brand-textMuted">Could not retrieve the gazette for this cohort.</p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-brand-bg rounded-2xl border border-gray-100 gap-3">
                <div>
                  <strong className="text-brand-textMain text-sm block">{gazette.classGrade}</strong>
                  <span className="text-[11px] text-gray-500">
                    {gazette.institution} • {gazette.academicYear}
                  </span>
                </div>
                <span className="px-3 py-1 bg-brand-violetLight text-brand-violet rounded-xl font-mono text-[10px] font-bold uppercase shrink-0">
                  {gazette.term} Active
                </span>
              </div>

              {WEEKDAYS.every((d) => (gazette.scheduleGrid?.[d]?.length ?? 0) === 0) ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-center border border-gray-200 rounded-2xl">
                  <i className="ph-bold ph-calendar-dashed text-3xl text-gray-300"></i>
                  <strong className="text-sm font-bold text-brand-textMain">No periods to gazette</strong>
                  <p className="text-xs text-brand-textMuted">Add timetable slots for this cohort first.</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[640px]">
                    <thead className="bg-gray-50 font-bold uppercase text-[10px] text-gray-400 border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3">Day</th>
                        <th className="py-2.5 px-3">Time</th>
                        <th className="py-2.5 px-3">Slot</th>
                        <th className="py-2.5 px-3">Subject</th>
                        <th className="py-2.5 px-3">Teacher</th>
                        <th className="py-2.5 px-3">Facility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {WEEKDAYS.flatMap((day) => {
                        const rows: any[] = gazette.scheduleGrid?.[day] || [];
                        return rows.map((row, idx) => (
                          <tr
                            key={`${day}-${row.period}-${idx}`}
                            className={row.slotType === 'break' || row.slotType === 'assembly'
                              ? 'bg-amber-50/50 font-bold text-amber-950'
                              : 'hover:bg-gray-50/50'}
                          >
                            <td className="py-2.5 px-3 font-bold">{idx === 0 ? day : ''}</td>
                            <td className="py-2.5 px-3 font-mono text-[10px] whitespace-nowrap">{row.timeRange}</td>
                            <td className="py-2.5 px-3">{row.label}</td>
                            <td className="py-2.5 px-3">{row.subject}</td>
                            <td className="py-2.5 px-3">{row.teacher}</td>
                            <td className="py-2.5 px-3 text-[10px]">{row.facility}</td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {gazette.officialGazetteSignOff && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-brand-textMain block">Approved by Academic Directorate:</span>
                    <span className="text-gray-400 text-[10px]">
                      Effective {gazette.officialGazetteSignOff.effectiveDate}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-serif italic font-bold text-brand-violet text-sm">
                      {gazette.officialGazetteSignOff.headmaster}
                    </div>
                    <span className="text-[9px] text-gray-400 uppercase font-mono">Headmaster</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="primary"
                  className="text-xs"
                  icon={<i className="ph-bold ph-printer"></i>}
                  onClick={() => window.print()}
                >
                  Print Official Timetable Sheet
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* D. GRADEBOOK / SCORE REVIEW STUDIO */}
      {activeScoreReviewClass && (
        <Modal
          isOpen={!!activeScoreReviewClass}
          onClose={() => { setActiveScoreReviewClass(null); setRoster([]); }}
          title={`${activeScoreReviewClass} — Continuous Assessment Dossier`}
          subtitle="Academic Directorate • Score Audit Studio"
          size="6xl"
        >
          <div className="space-y-4">
            {isLoadingRoster ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-xs text-brand-textMuted">
                <div className="w-6 h-6 border-2 border-brand-violet border-t-transparent rounded-full animate-spin"></div>
                Loading gradebook for {activeScoreReviewClass}...
              </div>
            ) : rosterError ? (
              <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
                <i className="ph-bold ph-warning-circle text-3xl text-red-500"></i>
                <strong className="text-sm font-bold text-brand-textMain">Could not load gradebook</strong>
                <p className="text-xs text-brand-textMuted max-w-md">{rosterError}</p>
                <Button variant="secondary" className="text-xs mt-1" onClick={() => loadRoster(activeScoreReviewClass)}>
                  Retry
                </Button>
              </div>
            ) : roster.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
                <i className="ph-bold ph-table text-4xl text-gray-300"></i>
                <strong className="text-sm font-bold text-brand-textMain">No scores recorded for this cohort</strong>
                <p className="text-xs text-brand-textMuted max-w-md">
                  Continuous assessment entries appear here once subject teachers submit scores.
                </p>
              </div>
            ) : (
              <>
                {/* Filter Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-brand-bg p-3.5 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-brand-textMain">Filter Roster:</span>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setScoreFilter('all')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          scoreFilter === 'all' ? 'bg-brand-violet text-white shadow-xs' : 'text-gray-500 hover:text-brand-textMain'
                        }`}
                      >
                        All ({roster.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setScoreFilter('complete')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          scoreFilter === 'complete' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500 hover:text-emerald-700'
                        }`}
                      >
                        Complete ({roster.filter((s) => !s.hasMissingScores).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setScoreFilter('missing')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          scoreFilter === 'missing' ? 'bg-red-600 text-white shadow-xs' : 'text-gray-500 hover:text-red-700'
                        }`}
                      >
                        Incomplete ({roster.filter((s) => s.hasMissingScores).length})
                      </button>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="text-xs px-4 py-1.5"
                    isLoading={signingOffClass === activeScoreReviewClass}
                    loadingText="Publishing..."
                    disabled={signingOffClass !== null}
                    icon={<i className="ph-bold ph-stamp"></i>}
                    onClick={() => handleSignOffClassBatch(activeScoreReviewClass)}
                  >
                    Endorse & Sign Off Cohort
                  </Button>
                </div>

                {/* Roster Table */}
                <div className="border border-gray-200 rounded-2xl overflow-x-auto bg-white">
                  <table className="w-full text-left text-xs min-w-[860px]">
                    <thead className="bg-brand-bg text-gray-600 uppercase font-bold text-[10px] border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4">Student Dossier</th>
                        <th className="py-3 px-3">Rank</th>
                        <th className="py-3 px-3">Composite Avg</th>
                        <th className="py-3 px-3">Attendance (SBA)</th>
                        <th className="py-3 px-3">Subject Breakdown (Click to Edit)</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Report Card</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRoster.map((student) => (
                        <tr key={student.indexNo} className="hover:bg-purple-50/40 transition-colors">
                          <td className="py-3 px-4">
                            <strong className="font-bold text-brand-textMain block text-xs">{student.name}</strong>
                            <span className="font-mono text-[10px] text-gray-400">{student.indexNo}</span>
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-brand-violet text-xs bg-brand-violetLight/50 px-2 py-0.5 rounded-md">
                              #{student.position} of {roster.length}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-base text-brand-textMain">{student.compositeAvg}%</span>
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-semibold text-gray-700 font-mono">{student.attendanceAvg} / 10</span>
                            <span className="text-[10px] text-gray-400 block">avg across subjects</span>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex flex-wrap items-center gap-1.5 max-w-[320px]">
                              {student.scores.map((sc) => (
                                <button
                                  key={sc.id}
                                  type="button"
                                  title={`Click to edit ${sc.subject} score`}
                                  onClick={() => handleOpenScoreEditor(student, sc)}
                                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 hover:bg-brand-violetLight hover:text-brand-violet text-gray-700 transition-colors border border-gray-200/60 inline-flex items-center gap-1 group/badge"
                                >
                                  <span>{sc.subject.slice(0, 4)}: {sc.final_score_100}%</span>
                                  <i className="ph-bold ph-pencil-simple text-[8px] opacity-40 group-hover/badge:opacity-100"></i>
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  const classSubs = getClassAllocatedSubjects(student.classGrade);
                                  handleOpenScoreEditor(student, undefined, classSubs[0] || GES_STANDARD_SUBJECTS[0]);
                                }}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors border border-purple-200/80 inline-flex items-center gap-0.5"
                                title="Add continuous assessment score for another subject"
                              >
                                <i className="ph-bold ph-plus text-[9px]"></i> Score
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {student.hasMissingScores ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 inline-flex items-center gap-1">
                                <i className="ph-bold ph-warning"></i> {student.scores.length}/{activeExpectedSubjects} subjects
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                                <i className="ph-bold ph-check"></i> Verified
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="primary"
                              className="text-xs px-3 py-1.5"
                              icon={<i className="ph-bold ph-file-text"></i>}
                              onClick={() => handleViewOfficialReportCard(student.indexNo)}
                            >
                              View Card
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-brand-textMuted">
                  <span>SBA continuous assessment: 10 + 10 + 10 + 10 (40%) plus terminal exam (60%). Click any subject score to edit.</span>
                  <Button variant="muted" className="text-xs" onClick={() => setActiveScoreReviewClass(null)}>
                    Close Studio
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* E. LIVE SCORE EDITOR MODAL */}
      {editingScoreDraft && (() => {
        const liveCalc = calculateSbaAndFinal(
          editingScoreDraft.classwork10,
          editingScoreDraft.project10,
          editingScoreDraft.midterm10,
          editingScoreDraft.attendance10,
          editingScoreDraft.terminalExam60
        );
        const editAllocatedSubs = getClassAllocatedSubjects(editingScoreDraft.classGrade);
        const canonicalSubjectNames = registeredSubjects.length > 0
          ? registeredSubjects.map((s) => s.name)
          : [...GES_STANDARD_SUBJECTS];
        const otherStandardSubs = canonicalSubjectNames.filter((s) => !editAllocatedSubs.includes(s));

        return (
          <Modal
            isOpen={!!editingScoreDraft}
            onClose={() => setEditingScoreDraft(null)}
            title={`Assessment Entry — ${editingScoreDraft.studentName}`}
            subtitle={`${editingScoreDraft.classGrade} • Index: ${editingScoreDraft.studentIndexNo}`}
            size="xl"
          >
            <form onSubmit={handleSaveScore} className="space-y-4 text-xs">
              {/* Subject Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700">Subject / Curricular Title</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomSubjectScoreEdit(!isCustomSubjectScoreEdit)}
                    className="text-[10px] font-bold text-brand-violet hover:underline"
                  >
                    {isCustomSubjectScoreEdit ? 'Choose standard subject' : 'Custom subject'}
                  </button>
                </div>
                {isCustomSubjectScoreEdit ? (
                  <input
                    type="text"
                    required
                    value={editingScoreDraft.subject}
                    onChange={(e) => setEditingScoreDraft({ ...editingScoreDraft, subject: e.target.value })}
                    placeholder="e.g. French, Career Technology"
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3 py-2 text-xs text-brand-textMain focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-violet"
                  />
                ) : (
                  <select
                    value={editingScoreDraft.subject}
                    onChange={(e) => setEditingScoreDraft({ ...editingScoreDraft, subject: e.target.value })}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3 py-2 text-xs text-brand-textMain focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-violet"
                  >
                    {editAllocatedSubs.length > 0 && (
                      <optgroup label={`Allocated in ${editingScoreDraft.classGrade}`}>
                        {editAllocatedSubs.map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Standard GES / NaCCA Subjects">
                      {otherStandardSubs.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </optgroup>
                  </select>
                )}
              </div>

              {/* 4 Continuous Assessment Components */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-brand-bg p-3.5 rounded-2xl border border-gray-100">
                <div>
                  <label className="font-bold text-gray-700 block mb-1 text-[11px]">Classwork (10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    required
                    value={editingScoreDraft.classwork10}
                    onChange={(e) => setEditingScoreDraft({ ...editingScoreDraft, classwork10: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-brand-textMain focus:outline-none focus:ring-1 focus:ring-brand-violet"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1 text-[11px]">Project (10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    required
                    value={editingScoreDraft.project10}
                    onChange={(e) => setEditingScoreDraft({ ...editingScoreDraft, project10: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-brand-textMain focus:outline-none focus:ring-1 focus:ring-brand-violet"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1 text-[11px]">Midterm Test (10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    required
                    value={editingScoreDraft.midterm10}
                    onChange={(e) => setEditingScoreDraft({ ...editingScoreDraft, midterm10: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-brand-textMain focus:outline-none focus:ring-1 focus:ring-brand-violet"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1 text-[11px]">Attendance (10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    required
                    value={editingScoreDraft.attendance10}
                    onChange={(e) => setEditingScoreDraft({ ...editingScoreDraft, attendance10: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-brand-textMain focus:outline-none focus:ring-1 focus:ring-brand-violet"
                  />
                </div>
              </div>

              {/* Terminal Exam */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Terminal Examination (Max 60)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="60"
                  required
                  value={editingScoreDraft.terminalExam60}
                  onChange={(e) => setEditingScoreDraft({ ...editingScoreDraft, terminalExam60: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-brand-textMain focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-violet"
                />
              </div>

              {/* Live GES Math Engine Computation Preview */}
              <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200/80 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-brand-violet tracking-wider block">Live SBA & Grade Computation</span>
                  <div className="flex items-center gap-3 mt-1 font-mono text-xs">
                    <span>SBA Total: <strong>{liveCalc.sba} / 40</strong></span>
                    <span>•</span>
                    <span>Exam: <strong>{editingScoreDraft.terminalExam60} / 60</strong></span>
                    <span>•</span>
                    <span className="text-sm font-bold text-emerald-700">Total: {liveCalc.final} / 100</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-3 py-1 rounded-xl bg-brand-violet text-white font-mono font-bold text-xs inline-block">
                    Grade {liveCalc.stanine}
                  </span>
                  <span className="text-[10px] font-bold text-gray-600 block mt-0.5">{liveCalc.descriptor}</span>
                </div>
              </div>

              {/* Teacher Remark */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Pedagogical / Subject Teacher Remark</label>
                <textarea
                  rows={2}
                  value={editingScoreDraft.teacherRemark}
                  onChange={(e) => setEditingScoreDraft({ ...editingScoreDraft, teacherRemark: e.target.value })}
                  placeholder="e.g. Exceptional grasp of algebra. Participates actively in class activities."
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 text-xs text-brand-textMain focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-violet resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button variant="muted" className="text-xs px-4" onClick={() => setEditingScoreDraft(null)} disabled={isSavingScore}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="text-xs px-5"
                  isLoading={isSavingScore}
                  loadingText="Saving Score..."
                  icon={<i className="ph-bold ph-floppy-disk"></i>}
                >
                  Save Assessment Score
                </Button>
              </div>
            </form>
          </Modal>
        );
      })()}

      {/* F. OFFICIAL TERMINAL REPORT CARD DOSSIER MODAL */}
      {reportDossier && (
        <Modal
          isOpen={!!reportDossier}
          onClose={() => setReportDossier(null)}
          title="Terminal Academic Performance Dossier"
          subtitle="Official Report Card • Ghana Education Service / NaCCA Standard"
          size="4xl"
        >
          <div className="space-y-5 text-xs">
            {reportDossier.loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-xs text-brand-textMuted">
                <div className="w-8 h-8 border-2 border-brand-violet border-t-transparent rounded-full animate-spin"></div>
                Retrieving authenticated terminal report card dossier...
              </div>
            ) : reportDossier.error ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                <i className="ph-bold ph-warning-circle text-3xl text-red-500"></i>
                <strong className="text-sm font-bold text-brand-textMain">Could not load report card</strong>
                <p className="text-xs text-brand-textMuted max-w-md">{reportDossier.error}</p>
                <Button variant="secondary" className="text-xs mt-1" onClick={() => handleViewOfficialReportCard(reportDossier.data?.student?.indexNo || '')}>
                  Retry
                </Button>
              </div>
            ) : reportDossier.data && (
              <>
                {/* Official School Header & Tamper Proof Stamp */}
                <div className="border border-brand-violet/20 rounded-3xl p-5 bg-gradient-to-b from-purple-50/50 via-white to-white space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-brand-violet text-white flex items-center justify-center font-serif font-bold text-xl shadow-md">
                        RP
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-lg text-brand-textMain leading-tight">
                          {reportDossier.data.institution.name}
                        </h3>
                        <p className="text-[10px] text-brand-violet font-semibold italic">
                          &ldquo;{reportDossier.data.institution.motto}&rdquo;
                        </p>
                        <p className="text-[9px] text-gray-500">
                          {reportDossier.data.institution.address} • {reportDossier.data.institution.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="px-3 py-1 rounded-full text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                        <i className="ph-bold ph-shield-check"></i> {reportDossier.data.securityVerification.status}
                      </span>
                      <span className="font-mono text-[9px] text-gray-400">
                        Checksum: {reportDossier.data.securityVerification.tamperProofChecksum}
                      </span>
                    </div>
                  </div>

                  {/* Pupil Profile Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-brand-bg p-4 rounded-2xl border border-gray-100">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Pupil Full Name</span>
                      <strong className="text-brand-textMain font-bold text-xs">{reportDossier.data.student.name}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Index Number</span>
                      <span className="font-mono font-bold text-brand-violet text-xs">{reportDossier.data.student.indexNo}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Class & Term</span>
                      <span className="text-brand-textMain font-bold text-xs">{reportDossier.data.student.classGrade} • {reportDossier.data.student.term}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Academic Year</span>
                      <span className="text-brand-textMain font-bold text-xs">{reportDossier.data.student.academicYear}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Composite Average</span>
                      <span className="font-bold text-emerald-700 text-base font-mono">{reportDossier.data.student.overallAverage}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Class Position</span>
                      <span className="font-bold text-brand-violet text-xs font-mono">{reportDossier.data.student.classPosition}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Term Attendance</span>
                      <span className="font-medium text-gray-700 text-xs">{reportDossier.data.student.attendance}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Next Term Begins</span>
                      <span className="font-medium text-gray-700 text-xs">{reportDossier.data.student.nextTermBegins}</span>
                    </div>
                  </div>

                  {/* 11-Column Academic Assessment Matrix */}
                  <div className="border border-gray-200 rounded-2xl overflow-x-auto bg-white">
                    <table className="w-full text-left min-w-[760px]">
                      <thead className="bg-gray-50 text-gray-600 uppercase font-bold text-[10px] border-b border-gray-200">
                        <tr>
                          <th className="py-2.5 px-3">Subject</th>
                          <th className="py-2.5 px-2">CW (10)</th>
                          <th className="py-2.5 px-2">Proj (10)</th>
                          <th className="py-2.5 px-2">Mid (10)</th>
                          <th className="py-2.5 px-2">Attn (10)</th>
                          <th className="py-2.5 px-2">SBA (40)</th>
                          <th className="py-2.5 px-2">Exam (60)</th>
                          <th className="py-2.5 px-3">Total (100)</th>
                          <th className="py-2.5 px-2">Grade</th>
                          <th className="py-2.5 px-3">Descriptor</th>
                          <th className="py-2.5 px-3">Teacher Remark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {reportDossier.data.subjects.map((sc: any) => (
                          <tr key={sc.id || sc.subject} className="hover:bg-purple-50/30">
                            <td className="py-2.5 px-3 font-bold text-brand-textMain">{sc.subject}</td>
                            <td className="py-2.5 px-2 font-mono">{sc.classwork10}</td>
                            <td className="py-2.5 px-2 font-mono">{sc.project10}</td>
                            <td className="py-2.5 px-2 font-mono">{sc.midterm10}</td>
                            <td className="py-2.5 px-2 font-mono">{sc.attendance10}</td>
                            <td className="py-2.5 px-2 font-mono font-bold text-gray-700">{sc.sba40}</td>
                            <td className="py-2.5 px-2 font-mono font-bold text-brand-violet">{sc.exam60}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{sc.final100}%</td>
                            <td className="py-2.5 px-2 font-bold font-mono">Grade {sc.stanineGrade}</td>
                            <td className="py-2.5 px-3 text-gray-600 text-[11px]">{sc.descriptor}</td>
                            <td className="py-2.5 px-3 text-gray-600 italic text-[10px]">{sc.remark || 'Satisfactory'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Affective Domain & Remarks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Affective Domain */}
                    <div className="bg-brand-bg p-4 rounded-2xl border border-gray-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-brand-textMain uppercase tracking-wider">Affective Domain & Conduct</h4>
                        <button
                          type="button"
                          onClick={() => setReportDossier({ ...reportDossier, isEditingRemarks: !reportDossier.isEditingRemarks })}
                          className="text-[10px] font-bold text-brand-violet hover:underline inline-flex items-center gap-1"
                        >
                          <i className="ph-bold ph-pencil-simple"></i>
                          {reportDossier.isEditingRemarks ? 'Close Edit Mode' : 'Edit Remarks'}
                        </button>
                      </div>

                      {reportDossier.isEditingRemarks ? (
                        <div className="space-y-2 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block">Conduct Rating</label>
                            <input
                              type="text"
                              value={reportDossier.conduct}
                              onChange={(e) => setReportDossier({ ...reportDossier, conduct: e.target.value })}
                              className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1 text-xs focus:ring-1 focus:ring-brand-violet focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block">Attitude to Work</label>
                            <input
                              type="text"
                              value={reportDossier.attitude}
                              onChange={(e) => setReportDossier({ ...reportDossier, attitude: e.target.value })}
                              className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1 text-xs focus:ring-1 focus:ring-brand-violet focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block">Special Interests</label>
                            <input
                              type="text"
                              value={reportDossier.interests}
                              onChange={(e) => setReportDossier({ ...reportDossier, interests: e.target.value })}
                              className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1 text-xs focus:ring-1 focus:ring-brand-violet focus:outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-gray-400 block font-bold">Conduct</span>
                            <span className="font-semibold text-brand-textMain">{reportDossier.data.affectiveDomain.conduct}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block font-bold">Attitude</span>
                            <span className="font-semibold text-brand-textMain">{reportDossier.data.affectiveDomain.attitude}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block font-bold">Neatness</span>
                            <span className="font-semibold text-brand-textMain">{reportDossier.data.affectiveDomain.neatness}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block font-bold">Interests</span>
                            <span className="font-semibold text-brand-textMain truncate block">{reportDossier.data.affectiveDomain.interests}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Form Master & Headmaster Endorsements */}
                    <div className="bg-brand-bg p-4 rounded-2xl border border-gray-100 space-y-3">
                      <h4 className="font-bold text-xs text-brand-textMain uppercase tracking-wider">Institutional Sign-Offs</h4>
                      {reportDossier.isEditingRemarks ? (
                        <div className="space-y-2 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block">Form Master Remark</label>
                            <textarea
                              rows={2}
                              value={reportDossier.formMasterRemark}
                              onChange={(e) => setReportDossier({ ...reportDossier, formMasterRemark: e.target.value })}
                              className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs focus:ring-1 focus:ring-brand-violet focus:outline-none resize-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block">Headmaster Remark</label>
                            <textarea
                              rows={2}
                              value={reportDossier.headmasterRemark}
                              onChange={(e) => setReportDossier({ ...reportDossier, headmasterRemark: e.target.value })}
                              className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs focus:ring-1 focus:ring-brand-violet focus:outline-none resize-none"
                            />
                          </div>
                          <div className="text-right pt-1">
                            <Button
                              variant="primary"
                              className="text-xs px-3 py-1"
                              isLoading={reportDossier.isSavingRemarks}
                              loadingText="Saving..."
                              onClick={handleSaveReportRemarks}
                            >
                              Save Remarks & Domain
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5 text-xs">
                          <div>
                            <span className="text-[10px] text-gray-400 block font-bold">Form Master ({reportDossier.data.signOffs.formMaster.name})</span>
                            <p className="text-brand-textMain italic">&ldquo;{reportDossier.data.signOffs.formMaster.remark}&rdquo;</p>
                          </div>
                          <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-gray-400 block font-bold">Headmaster ({reportDossier.data.signOffs.headmaster.name})</span>
                              <p className="text-brand-textMain italic">&ldquo;{reportDossier.data.signOffs.headmaster.remark}&rdquo;</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="font-serif italic text-brand-violet font-bold text-xs block">Kwame Asamoah</span>
                              <span className="text-[8px] text-gray-400 uppercase font-mono">Official Seal</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400">
                    Compliant with Ministry of Education / Ghana National Association of Private Schools standards.
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      className="text-xs px-4"
                      icon={<i className="ph-bold ph-printer"></i>}
                      onClick={() => window.print()}
                    >
                      Print Official Report Card
                    </Button>
                    <Button variant="muted" className="text-xs" onClick={() => setReportDossier(null)}>
                      Close Dossier
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* H. REGISTER NEW CLASS STREAM MODAL */}
      {isAddClassModalOpen && (
        <Modal
          isOpen={isAddClassModalOpen}
          onClose={() => !isSavingClass && setIsAddClassModalOpen(false)}
          title="Register Canonical Class Stream"
          subtitle="SIS & Timetable Infrastructure Single Source of Truth"
          size="lg"
        >
          <form onSubmit={handleCreateClass} className="space-y-4 text-xs">
            <div className="p-4 bg-brand-violetLight/50 rounded-2xl border border-purple-100 flex items-start gap-3">
              <i className="ph-fill ph-info text-brand-violet text-lg mt-0.5"></i>
              <p className="text-brand-violet font-medium leading-relaxed">
                Registered streams automatically become available across all admissions, student enrolment, fee invoicing, CBT exam assigners, and teacher cockpits.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Level Category *</label>
                <select
                  value={newClassDraft.level_category}
                  onChange={(e) => setNewClassDraft({ ...newClassDraft, level_category: e.target.value })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-semibold"
                  required
                >
                  <option value="EARLY_YEARS">Early Years (Crèche / Nursery / KG)</option>
                  <option value="LOWER_PRIMARY">Lower Primary (P1 - P3)</option>
                  <option value="UPPER_PRIMARY">Upper Primary (P4 - P6)</option>
                  <option value="JHS">Junior High School (JHS 1 - JHS 3)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Stage / Grade Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Primary 4, JHS 1, Kindergarten 2"
                  value={newClassDraft.stage}
                  onChange={(e) => setNewClassDraft({ ...newClassDraft, stage: e.target.value })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Stream / Section Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Red, Yellow, Green, Blue, Alpha"
                  value={newClassDraft.stream_name}
                  onChange={(e) => setNewClassDraft({ ...newClassDraft, stream_name: e.target.value })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Assigned Class Teacher / Form Master</label>
                <select
                  value={newClassDraft.class_teacher_name}
                  onChange={(e) => setNewClassDraft({ ...newClassDraft, class_teacher_name: e.target.value })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-semibold"
                >
                  <option value="">-- Optional / Assign Later --</option>
                  {staffDirectory.map((staff) => (
                    <option key={staff.id} value={staff.fullName}>
                      {staff.fullName} ({staff.role || 'Teacher'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Room / Facility *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block B Room 204"
                  value={newClassDraft.room_number}
                  onChange={(e) => setNewClassDraft({ ...newClassDraft, room_number: e.target.value })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Seating Capacity (Pupils) *</label>
                <input
                  type="number"
                  min={1}
                  max={80}
                  required
                  value={newClassDraft.capacity}
                  onChange={(e) => setNewClassDraft({ ...newClassDraft, capacity: Number(e.target.value) })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Base Term Tuition Fee (GH₵) *</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  required
                  value={newClassDraft.base_tuition_fee}
                  onChange={(e) => setNewClassDraft({ ...newClassDraft, base_tuition_fee: Number(e.target.value) })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Generated Class Full Name</label>
                <div className="w-full bg-gray-100 border border-gray-200 rounded-xl p-2.5 font-bold text-brand-violet font-mono">
                  {newClassDraft.stage} {newClassDraft.stream_name}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="muted"
                disabled={isSavingClass}
                onClick={() => setIsAddClassModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSavingClass || !newClassDraft.stage || !newClassDraft.stream_name}
                icon={isSavingClass ? <i className="ph-bold ph-spinner animate-spin"></i> : <i className="ph-bold ph-check-circle"></i>}
              >
                {isSavingClass ? 'Registering Stream...' : 'Create Class Stream'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* H2. EDIT / MODIFY CLASS STREAM MODAL */}
      {isEditClassModalOpen && editingClass && (
        <Modal
          isOpen={isEditClassModalOpen}
          onClose={() => !isUpdatingClass && setIsEditClassModalOpen(false)}
          title={`Modify Class Stream: ${editingClass.oldName}`}
          subtitle="Updates will automatically cascade across students, timetables, and gradebooks"
          size="lg"
        >
          <form onSubmit={handleUpdateClass} className="space-y-4 text-xs">
            <div className="p-4 bg-brand-violetLight/50 rounded-2xl border border-purple-100 flex items-start gap-3">
              <i className="ph-fill ph-info text-brand-violet text-lg mt-0.5"></i>
              <p className="text-brand-violet font-medium leading-relaxed">
                Renaming a stage or stream will automatically cascade the new class name to all active pupil records, CA gradebook entries, timetable allocations, and staff homeroom assignments.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Level Category *</label>
                <select
                  value={editingClass.level_category}
                  onChange={(e) => setEditingClass({ ...editingClass, level_category: e.target.value })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-semibold"
                  required
                >
                  <option value="EARLY_YEARS">Early Years (Crèche / Nursery / KG)</option>
                  <option value="LOWER_PRIMARY">Lower Primary (P1 - P3)</option>
                  <option value="UPPER_PRIMARY">Upper Primary (P4 - P6)</option>
                  <option value="JHS">Junior High School (JHS 1 - JHS 3)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Stage / Grade Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Primary 4, JHS 1"
                  value={editingClass.stage}
                  onChange={(e) => setEditingClass({ ...editingClass, stage: e.target.value })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Stream / Section Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Red, Yellow, Green, Blue"
                  value={editingClass.stream_name}
                  onChange={(e) => setEditingClass({ ...editingClass, stream_name: e.target.value })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Assigned Class Teacher / Form Master</label>
                <select
                  value={editingClass.class_teacher_name}
                  onChange={(e) => setEditingClass({ ...editingClass, class_teacher_name: e.target.value })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-semibold"
                >
                  <option value="">-- Optional / Assign Later --</option>
                  {staffDirectory.map((staff) => (
                    <option key={staff.id} value={staff.fullName}>
                      {staff.fullName} ({staff.role || 'Teacher'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Room / Facility *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block B Room 204"
                  value={editingClass.room_number}
                  onChange={(e) => setEditingClass({ ...editingClass, room_number: e.target.value })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Seating Capacity (Pupils) *</label>
                <input
                  type="number"
                  min={1}
                  max={80}
                  required
                  value={editingClass.capacity}
                  onChange={(e) => setEditingClass({ ...editingClass, capacity: Number(e.target.value) })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Base Term Tuition Fee (GH₵) *</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  required
                  value={editingClass.base_tuition_fee}
                  onChange={(e) => setEditingClass({ ...editingClass, base_tuition_fee: Number(e.target.value) })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">New Class Display Name</label>
                <div className="w-full bg-gray-100 border border-gray-200 rounded-xl p-2.5 font-bold text-brand-violet font-mono">
                  {editingClass.stage} {editingClass.stream_name}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="muted"
                disabled={isUpdatingClass}
                onClick={() => setIsEditClassModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isUpdatingClass || !editingClass.stage || !editingClass.stream_name}
                icon={isUpdatingClass ? <i className="ph-bold ph-spinner animate-spin"></i> : <i className="ph-bold ph-check-circle"></i>}
              >
                {isUpdatingClass ? 'Saving Changes...' : 'Save Class Stream'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* H3. DELETE / MIGRATE CLASS STREAM MODAL */}
      {isDeleteClassModalOpen && deletingClass && (
        <Modal
          isOpen={isDeleteClassModalOpen}
          onClose={() => !isDeletingClass && setIsDeleteClassModalOpen(false)}
          title={`Delete Class: ${deletingClass.classGrade}`}
          subtitle="Safeguard & Student Migration Protocol"
          size="md"
        >
          <div className="space-y-4 text-xs">
            {deletingClass.pupils > 0 ? (
              <>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
                  <i className="ph-fill ph-warning text-amber-600 text-lg mt-0.5 shrink-0"></i>
                  <div>
                    <strong className="text-amber-900 font-bold block mb-1">
                      Active Pupils Enrolled ({deletingClass.pupils} pupil{deletingClass.pupils === 1 ? '' : 's'})
                    </strong>
                    <p className="text-amber-800 leading-relaxed">
                      This class cannot be removed while pupils are actively enrolled. To safely proceed, select a destination class to migrate them immediately, or archive the class to preserve historical records.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px]">
                    Option 1: Reassign Active Pupils to Destination Class
                  </label>
                  <select
                    value={migrationTargetClassId}
                    disabled={confirmArchiveOnly}
                    onChange={(e) => {
                      setMigrationTargetClassId(e.target.value);
                      if (e.target.value) setConfirmArchiveOnly(false);
                    }}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-semibold disabled:opacity-50"
                  >
                    <option value="">-- Choose destination cohort --</option>
                    {streams
                      .filter((s) => s.classId && s.classId !== deletingClass.classId)
                      .map((dest) => (
                        <option key={dest.classId} value={dest.classId}>
                          {dest.classGrade} ({dest.pupils} enrolled, room {dest.roomNumber})
                        </option>
                      ))}
                  </select>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink mx-4 text-[10px] text-gray-400 font-bold uppercase">Or</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 bg-gray-50/70 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={confirmArchiveOnly}
                      onChange={(e) => {
                        setConfirmArchiveOnly(e.target.checked);
                        if (e.target.checked) setMigrationTargetClassId('');
                      }}
                      className="mt-0.5 rounded text-brand-violet focus:ring-brand-violet"
                    />
                    <div>
                      <span className="font-bold text-brand-textMain block">
                        Option 2: Archive Class Only
                      </span>
                      <span className="text-[10px] text-brand-textMuted">
                        Deactivates the class stream from dropdowns while preserving current student rosters in history.
                      </span>
                    </div>
                  </label>
                </div>
              </>
            ) : (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-200 flex items-start gap-3">
                <i className="ph-fill ph-trash text-red-600 text-lg mt-0.5 shrink-0"></i>
                <div>
                  <strong className="text-red-900 font-bold block mb-1">
                    Confirm Removal
                  </strong>
                  <p className="text-red-800 leading-relaxed">
                    Are you sure you want to delete class <strong className="font-bold">{deletingClass.classGrade}</strong>? There are currently 0 active pupils enrolled.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="muted"
                disabled={isDeletingClass}
                onClick={() => setIsDeleteClassModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={
                  isDeletingClass ||
                  (deletingClass.pupils > 0 && !migrationTargetClassId && !confirmArchiveOnly)
                }
                onClick={handleDeleteClass}
                icon={isDeletingClass ? <i className="ph-bold ph-spinner animate-spin"></i> : <i className="ph-bold ph-trash"></i>}
              >
                {isDeletingClass
                  ? 'Processing...'
                  : deletingClass.pupils > 0
                  ? migrationTargetClassId
                    ? `Migrate Pupils & Delete`
                    : `Archive Class`
                  : `Delete Class`}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* I. REGISTER NEW CANONICAL SUBJECT MODAL */}
      {isAddSubjectModalOpen && (
        <Modal
          isOpen={isAddSubjectModalOpen}
          onClose={() => !isSavingSubject && setIsAddSubjectModalOpen(false)}
          title="Register Canonical Curriculum Subject"
          subtitle="Academic Council & Syllabus Single Source of Truth"
          size="lg"
        >
          <form onSubmit={handleCreateSubject} className="space-y-4 text-xs">
            <div className="p-4 bg-brand-violetLight/50 rounded-2xl border border-purple-100 flex items-start gap-3">
              <i className="ph-fill ph-book-bookmark text-brand-violet text-lg mt-0.5"></i>
              <p className="text-brand-violet font-medium leading-relaxed">
                Registered subjects dynamically synchronize across the Master Bell Timetable, Continuous Assessment Gradebook, Teacher Copilot, CBT Exam Architect, and Staff Faculty Allocations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Subject Code (e.g. MTH, SCI) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MTH"
                  value={newSubjectDraft.code}
                  onChange={(e) => setNewSubjectDraft({ ...newSubjectDraft, code: e.target.value.toUpperCase() })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-mono font-bold uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Subject Full Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics"
                  value={newSubjectDraft.name}
                  onChange={(e) => setNewSubjectDraft({ ...newSubjectDraft, name: e.target.value })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-bold text-brand-textMain"
                />
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Department *</label>
                <select
                  value={newSubjectDraft.department}
                  onChange={(e) => setNewSubjectDraft({ ...newSubjectDraft, department: e.target.value })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-semibold"
                  required
                >
                  <option value="STEM">STEM (Science, Tech, Engineering & Math)</option>
                  <option value="LANGUAGES">Languages (English, Ghanaian Languages, French)</option>
                  <option value="HUMANITIES">Humanities & Social Studies</option>
                  <option value="CREATIVE_ARTS">Creative Arts & Design</option>
                  <option value="TECHNICAL_VOCATIONAL">Technical & Vocational Skills</option>
                  <option value="EARLY_CHILDHOOD">Early Childhood Foundation</option>
                  <option value="GENERAL">General Curriculum</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Subject Classification *</label>
                <select
                  value={newSubjectDraft.is_core ? 'core' : 'elective'}
                  onChange={(e) => setNewSubjectDraft({ ...newSubjectDraft, is_core: e.target.value === 'core' })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-semibold"
                >
                  <option value="core">Core Subject (Mandatory for All Students)</option>
                  <option value="elective">Elective / Specialized Track (Optional)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Weekly Period Allocation *</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  required
                  value={newSubjectDraft.weekly_periods}
                  onChange={(e) => setNewSubjectDraft({ ...newSubjectDraft, weekly_periods: Number(e.target.value) || 5 })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Default Facility / Room Type *</label>
                <select
                  value={newSubjectDraft.default_room_type}
                  onChange={(e) => setNewSubjectDraft({ ...newSubjectDraft, default_room_type: e.target.value })}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet font-semibold"
                  required
                >
                  <option value="Standard Homeroom">Standard Homeroom</option>
                  <option value="Science STEAM Lab">Science STEAM Lab</option>
                  <option value="ICT Computer Lab">ICT Computer Lab</option>
                  <option value="Art Studio & Workshop">Art Studio & Workshop</option>
                  <option value="Sports Field & Court">Sports Field & Court</option>
                  <option value="Technical Workshop">Technical Workshop</option>
                  <option value="Robotics & Coding Lab">Robotics & Coding Lab</option>
                  <option value="Music & Cultural Studio">Music & Cultural Studio</option>
                  <option value="Library & Guided Reading Room">Library & Guided Reading Room</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-brand-textMain uppercase mb-1.5">Applicable Level Categories *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'EARLY_YEARS', label: 'Early Years' },
                  { id: 'LOWER_PRIMARY', label: 'Lower Primary' },
                  { id: 'UPPER_PRIMARY', label: 'Upper Primary' },
                  { id: 'JHS', label: 'Junior High (JHS)' },
                ].map((lvl) => {
                  const isChecked = newSubjectDraft.level_categories.includes(lvl.id);
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => {
                        const updated = isChecked
                          ? newSubjectDraft.level_categories.filter((c) => c !== lvl.id)
                          : [...newSubjectDraft.level_categories, lvl.id];
                        setNewSubjectDraft({ ...newSubjectDraft, level_categories: updated });
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                        isChecked
                          ? 'bg-brand-violetLight/60 border-brand-violet text-brand-violet'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <span>{lvl.label}</span>
                      <i className={`ph-bold ${isChecked ? 'ph-check-square text-brand-violet' : 'ph-square text-gray-300'}`}></i>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-bold text-brand-textMain uppercase mb-1">Curriculum Notes / Syllabus Reference (Optional)</label>
              <textarea
                rows={2}
                placeholder="e.g. Follows NaCCA standards for basic 1-9 curriculum..."
                value={newSubjectDraft.description}
                onChange={(e) => setNewSubjectDraft({ ...newSubjectDraft, description: e.target.value })}
                className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="muted"
                disabled={isSavingSubject}
                onClick={() => setIsAddSubjectModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSavingSubject || !newSubjectDraft.code || !newSubjectDraft.name || newSubjectDraft.level_categories.length === 0}
                icon={isSavingSubject ? <i className="ph-bold ph-spinner animate-spin"></i> : <i className="ph-bold ph-check-circle"></i>}
              >
                {isSavingSubject ? 'Registering Subject...' : 'Register Subject'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* G. CA WEIGHTING SCHEME (READ-ONLY REFERENCE) */}
      {isWeightModalOpen && (
        <Modal
          isOpen={isWeightModalOpen}
          onClose={() => setIsWeightModalOpen(false)}
          title="GES Continuous Assessment (CA) Engine"
          subtitle="Standardized Assessment Schema"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-brand-textMuted">
              These weights are fixed in the academic service&apos;s SBA engine and applied to every
              score submission. This view is read-only reference.
            </p>

            <div className="space-y-2.5">
              {[
                ['Class Exercise / Homework', '10%'],
                ['Class Project / Group Task', '10%'],
                ['Mid-Term Diagnostic Test', '10%'],
                ['Attendance & Class Participation', '10%'],
              ].map(([label, weight]) => (
                <div key={label} className="flex items-center justify-between p-3 bg-brand-bg rounded-xl">
                  <span>{label}:</span>
                  <strong className="font-bold text-brand-violet">{weight}</strong>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 bg-yellow-50 text-yellow-950 rounded-xl font-bold">
                <span>End-of-Term Terminal Exam:</span>
                <span>60%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-brand-violetLight/60 text-brand-violet rounded-xl font-bold border border-purple-200">
                <span>Composite Total:</span>
                <span>100%</span>
              </div>
            </div>

            <Button variant="muted" fullWidth className="text-xs" onClick={() => setIsWeightModalOpen(false)}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* H. HISTORICAL MULTI-TERM ACADEMIC & ATTENDANCE INGESTION MODAL */}
      <HistoricalReportsImportModal
        isOpen={isHistoricalImportOpen}
        onClose={() => setIsHistoricalImportOpen(false)}
        onSuccess={() => {
          loadReportStatus();
        }}
        defaultClass={historicalTargetClass}
      />

    </div>
  );
}
