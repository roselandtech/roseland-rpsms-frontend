"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { AuthService, RoselandUser } from '@/lib/auth';
import { useClasses } from '@/hooks/useClasses';
import { useSubjects } from '@/hooks/useSubjects';
import { RoselandApi } from '@/lib/api';
import Modal from '@/components/ui/Modal';

interface ActionItem {
  id: string;
  type: string;
  title: string;
  time: string;
  link: string;
  badgeColor?: string;
}

interface AssemblyAgenda {
  moralFocus: string;
  focusDetails: string;
  hymnAndReading: string;
  hymnDetails: string;
  inspectionTopic: string;
  inspectionDetails: string;
  weekNumber: number;
}

function parseTimeToMinutes(timeStr: string): number | null {
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export default function HeadmasterDashboard() {
  const { classes: classList, isLoading: classesLoading } = useClasses();
  const { subjects: subjectList } = useSubjects();

  const [currentUser, setCurrentUser] = useState<RoselandUser | null>(null);
  const [isObservationOpen, setIsObservationOpen] = useState(false);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [isSubmittingWalkthrough, setIsSubmittingWalkthrough] = useState(false);
  const [streamFilter, setStreamFilter] = useState<'ALL' | 'EARLY_YEARS' | 'PRIMARY' | 'JHS'>('ALL');

  // Walkthrough State
  const [obsClass, setObsClass] = useState('');
  const [obsTeacher, setObsTeacher] = useState('');
  const [obsSubject, setObsSubject] = useState('');
  const [obsStrand, setObsStrand] = useState('');
  const [obsRating, setObsRating] = useState(5);
  const [obsNotes, setObsNotes] = useState('');
  const [obsActionPoints, setObsActionPoints] = useState('');

  // Dynamic Live Metrics State
  const [staffCount, setStaffCount] = useState(0);
  const [atRiskCount, setAtRiskCount] = useState(0);
  const [inspectionsList, setInspectionsList] = useState<any[]>([]);
  const [pendingSchemesCount, setPendingSchemesCount] = useState(0);
  const [appraisalsList, setAppraisalsList] = useState<any[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
  const [reportReadyCount, setReportReadyCount] = useState(0);
  const [attendanceSummary, setAttendanceSummary] = useState<{ rate: number; absents: number; pendingClasses: number } | null>(null);
  const [, setIsLoadingDashboard] = useState(true);

  // Calendar State
  const [academicState, setAcademicState] = useState<{
    yearName: string;
    termName: string;
    currentWeek: number;
    totalWeeks: number;
  } | null>(null);

  // Dynamic Weekly Agenda State (persisted locally with institutional defaults)
  const [agenda, setAgenda] = useState<AssemblyAgenda>({
    moralFocus: "Integrity & Academic Honesty",
    focusDetails: "Assembly speech delivered by Headmaster",
    hymnAndReading: "MHHB 511 / Proverbs 3:1–6",
    hymnDetails: "Led by Chapel Prefect",
    inspectionTopic: "Use of Concrete Teaching Aids",
    inspectionDetails: "Focus on Early Years & Lower Primary",
    weekNumber: 8
  });
  const [editAgendaForm, setEditAgendaForm] = useState<AssemblyAgenda>(agenda);

  // Load Saved Agenda
  useEffect(() => {
    try {
      const saved = localStorage.getItem('roseland_headmaster_agenda');
      if (saved) {
        const parsed = JSON.parse(saved);
        setAgenda(parsed);
        setEditAgendaForm(parsed);
      }
    } catch {}
  }, []);

  // Fetch Live Metrics across SIS, Academic, Timetable, Appraisals & Operations
  const loadDashboardData = useCallback(async () => {
    setIsLoadingDashboard(true);
    try {
      setCurrentUser(AuthService.getCurrentUser());

      // 1. Staff Directory
      const staffPromise = RoselandApi.auth.getStaffDirectory()
        .then((staff) => {
          if (staff && Array.isArray(staff)) setStaffCount(staff.length);
        })
        .catch(() => {});

      // 2. SIS & Academic Telemetry (Compute Live At-Risk Scholars from Academic Engine)
      const sisPromise = RoselandApi.academic.getAtRiskStudents()
        .then((res) => {
          const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          setAtRiskCount(list.length);
        })
        .catch(() => {
          // Fallback to sis students
          RoselandApi.sis.getStudents()
            .then((students) => {
              const list = Array.isArray(students?.data) ? students.data : Array.isArray(students) ? students : [];
              const atRisk = list.filter((s: any) => {
                const score = Number(s.avg_score ?? s.avgScore ?? 100);
                const att = Number(s.attendance_pct ?? s.attendancePct ?? 100);
                return score < 50 || att < 75 || s.status === 'AT_RISK' || s.isAtRisk;
              });
              setAtRiskCount(atRisk.length);
            })
            .catch(() => {});
        });

      // 2b. Daily Attendance Telemetry
      const attendancePromise = RoselandApi.sis.getAttendanceLogs()
        .then((res) => {
          if (res?.summary) {
            setAttendanceSummary({
              rate: res.summary.attendance_rate || 0,
              absents: res.summary.absent_count || 0,
              pendingClasses: res.summary.classes_pending || 0,
            });
          }
        })
        .catch(() => {});

      // 3. Operations Inspections (Walkthrough logs)
      const opsPromise = RoselandApi.operations.getInspections()
        .then((inspections) => {
          if (inspections && Array.isArray(inspections)) {
            setInspectionsList(inspections);
          }
        })
        .catch(() => {});

      // 4. Pending Lesson Schemes Awaiting Vetting
      const schemesPromise = RoselandApi.academic.getLessonSchemes({ status: 'Pending' })
        .then((schemes) => {
          const list = Array.isArray(schemes?.data) ? schemes.data : Array.isArray(schemes) ? schemes : [];
          setPendingSchemesCount(list.length);
        })
        .catch(() => {});

      // 5. Faculty Appraisals & Scheduled Walkthroughs
      const appraisalsPromise = RoselandApi.academic.getAppraisals()
        .then((apps) => {
          if (Array.isArray(apps)) {
            setAppraisalsList(apps);
            // Also collect walkthroughs from appraisals if operations service returned empty
            const allWalkthroughs = apps.flatMap((a: any) => Array.isArray(a.walkthroughHistory) ? a.walkthroughHistory : []);
            if (allWalkthroughs.length > 0) {
              setInspectionsList((prev) => (prev.length >= allWalkthroughs.length ? prev : allWalkthroughs));
            }
          }
        })
        .catch(() => {});

      // 6. Master Timetable Slots for Live Classroom Pulse
      const timetablePromise = RoselandApi.academic.getTimetableSlots()
        .then((slots) => {
          const list = Array.isArray(slots?.data) ? slots.data : Array.isArray(slots) ? slots : [];
          setTimetableSlots(list);
        })
        .catch(() => {});

      // 7. Academic Report Card Approvals Status
      const reportsPromise = RoselandApi.academic.getReportStatus()
        .then((statusRes) => {
          const classes = statusRes?.classes || [];
          if (Array.isArray(classes)) {
            const ready = classes.filter((c: any) => !c.isPublished && (c.pupilsIncomplete === 0 || c.missingScores === 0) && (c.totalPupils > 0 || c.totalCards > 0));
            setReportReadyCount(ready.length);
          }
        })
        .catch(() => {});

      // 8. Academic Calendar State
      const calendarPromise = RoselandApi.academic.calendar.getCurrentState()
        .then((calRes) => {
          if (calRes && calRes.academic_year && calRes.academic_term) {
            const termStart = new Date(calRes.academic_term.start_date);
            const termEnd = new Date(calRes.academic_term.end_date);
            const today = new Date();

            const effectiveToday = today < termStart ? termStart : (today > termEnd ? termEnd : today);

            const diffTime = Math.abs(effectiveToday.getTime() - termStart.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const currentWeek = Math.floor(diffDays / 7) + 1;

            const totalDiffTime = Math.abs(termEnd.getTime() - termStart.getTime());
            const totalDiffDays = Math.ceil(totalDiffTime / (1000 * 60 * 60 * 24));
            const totalWeeks = Math.ceil(totalDiffDays / 7);

            setAcademicState({
              yearName: calRes.academic_year.name,
              termName: calRes.academic_term.name,
              currentWeek,
              totalWeeks
            });
            setAgenda(prev => ({ ...prev, weekNumber: currentWeek }));
            setEditAgendaForm(prev => ({ ...prev, weekNumber: currentWeek }));
          }
        })
        .catch(() => {});

      await Promise.allSettled([
        staffPromise,
        sisPromise,
        attendancePromise,
        opsPromise,
        schemesPromise,
        appraisalsPromise,
        timetablePromise,
        reportsPromise,
        calendarPromise
      ]);
    } catch (err) {
      console.warn("Failed to load headmaster cockpit data:", err);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Sync initial walkthrough class, teacher & subject
  useEffect(() => {
    if (classList && classList.length > 0 && !obsClass) {
      setObsClass(classList[0].name);
      setObsTeacher(classList[0].class_teacher_name || 'Form Master');
    }
    if (subjectList && subjectList.length > 0 && !obsSubject) {
      setObsSubject(subjectList[0].name);
    }
  }, [classList, subjectList, obsClass, obsSubject]);

  // Selected Class details for Walkthrough
  const selectedClassObj = useMemo(() => {
    return classList.find((c) => c.name === obsClass) || classList[0] || null;
  }, [classList, obsClass]);

  // Compute Live Pedagogical Action Queue
  const actionQueue = useMemo(() => {
    const queue: ActionItem[] = [];

    if (pendingSchemesCount > 0) {
      queue.push({
        id: 'act-schemes',
        type: 'Curriculum Vetting',
        title: `${pendingSchemesCount} Weekly Lesson Scheme${pendingSchemesCount > 1 ? 's' : ''} Awaiting Approval`,
        time: 'Submitted by Teaching Faculty',
        link: '/headmaster/inspections',
        badgeColor: 'text-amber-800 bg-amber-100'
      });
    }

    if (reportReadyCount > 0) {
      queue.push({
        id: 'act-reports',
        type: 'Terminal Certification',
        title: `${reportReadyCount} Class Gradebook${reportReadyCount > 1 ? 's' : ''} Ready for Digital Seal`,
        time: 'Awaiting Headmaster Sign-Off',
        link: '/headmaster/approvals',
        badgeColor: 'text-green-700 bg-green-50'
      });
    }

    if (atRiskCount > 0) {
      queue.push({
        id: 'act-at-risk',
        type: 'Early Warning Diagnostic',
        title: `${atRiskCount} Scholar${atRiskCount > 1 ? 's' : ''} Flagged with Performance/Attendance Bottlenecks`,
        time: 'Intervention Plan Needed',
        link: '/headmaster/at-risk',
        badgeColor: 'text-red-700 bg-red-50'
      });
    }

    if (attendanceSummary && attendanceSummary.pendingClasses > 0) {
      queue.push({
        id: 'act-attendance-pending',
        type: 'Attendance Compliance',
        title: `${attendanceSummary.pendingClasses} Class Stream${attendanceSummary.pendingClasses > 1 ? 's' : ''} Pending Daily Roll Call`,
        time: 'Form Masters Action Needed',
        link: '/headmaster/attendance',
        badgeColor: 'text-amber-700 bg-amber-50'
      });
    }

    if (attendanceSummary && attendanceSummary.absents > 0) {
      queue.push({
        id: 'act-attendance-absents',
        type: 'Daily Absentee Alert',
        title: `${attendanceSummary.absents} Scholar${attendanceSummary.absents > 1 ? 's' : ''} Marked Absent Today`,
        time: 'Parent Absence SMS Queue Ready',
        link: '/headmaster/attendance',
        badgeColor: 'text-red-700 bg-red-50'
      });
    }

    const scheduledWalkthroughs = appraisalsList.filter((a: any) => Boolean(a.scheduledDate));
    if (scheduledWalkthroughs.length > 0) {
      queue.push({
        id: 'act-scheduled-wt',
        type: 'Supervisory Walkthrough',
        title: `${scheduledWalkthroughs.length} Scheduled Classroom Observation${scheduledWalkthroughs.length > 1 ? 's' : ''} Due`,
        time: `Next: ${scheduledWalkthroughs[0].name} (${scheduledWalkthroughs[0].scheduledDate})`,
        link: '/headmaster/appraisals',
        badgeColor: 'text-brand-violet bg-brand-violetLight'
      });
    }

    const pendingEvaluations = appraisalsList.filter((a: any) => a.status === 'Pending Evaluation' || a.status === 'Needs Support');
    if (pendingEvaluations.length > 0) {
      queue.push({
        id: 'act-pending-appraisals',
        type: 'Faculty Appraisal',
        title: `${pendingEvaluations.length} Educator${pendingEvaluations.length > 1 ? 's' : ''} Awaiting 5-Domain Evaluation / Support`,
        time: 'GES / NaCCA Supervisory Scorecard',
        link: '/headmaster/appraisals',
        badgeColor: 'text-purple-800 bg-purple-100'
      });
    }

    return queue;
  }, [pendingSchemesCount, reportReadyCount, atRiskCount, appraisalsList]);

  // Active Day & Current Live Classrooms cross-referenced with Master Timetable
  const { activeDayLabel, currentLiveClasses } = useMemo(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const todayName = dayNames[now.getDay()];
    const effectiveDay = todayName === 'Saturday' || todayName === 'Sunday' ? 'Monday' : todayName;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const filteredClasses = classList.filter((c) => {
      if (streamFilter === 'ALL') return true;
      const cat = String(c.level_category || c.name || '').toUpperCase();
      if (streamFilter === 'EARLY_YEARS') return cat.includes('EARLY') || cat.includes('CRECHE') || cat.includes('NURSERY') || cat.includes('KG');
      if (streamFilter === 'JHS') return cat.includes('JHS');
      return cat.includes('PRIMARY') || cat.includes('BASIC');
    });

    const mapped = filteredClasses.map((c) => {
      const classSlots = timetableSlots.filter(
        (s: any) =>
          String(s.class_grade || '').toLowerCase() === String(c.name || '').toLowerCase() &&
          String(s.day || '').toLowerCase() === effectiveDay.toLowerCase()
      );

      // Find slot matching current wall-clock time
      let activeSlot: any = null;
      for (const s of classSlots) {
        const parts = String(s.time_range || '').split('-');
        if (parts.length === 2) {
          const startMin = parseTimeToMinutes(parts[0]);
          const endMin = parseTimeToMinutes(parts[1]);
          if (startMin !== null && endMin !== null && nowMinutes >= startMin && nowMinutes <= endMin) {
            activeSlot = s;
            break;
          }
        }
      }

      // Fallback to first academic slot of the day if outside live period hours
      const fallbackSlot =
        activeSlot ||
        classSlots.find((s: any) => String(s.slot_type || 'academic').toLowerCase() === 'academic') ||
        classSlots[0] ||
        null;

      const formMaster = c.class_teacher_name || 'Assigned Form Master';
      const activeTeacher = fallbackSlot?.teacher_name && fallbackSlot.teacher_name !== 'All Staff'
        ? fallbackSlot.teacher_name
        : formMaster;
      const activeSubject = fallbackSlot?.subject || 'Core Curriculum & Homeroom';
      const periodLabel = activeSlot
        ? `Live Now • ${activeSlot.slot_label || `Period ${activeSlot.period_number}`} (${activeSlot.time_range})`
        : fallbackSlot
        ? `${effectiveDay} Schedule • ${fallbackSlot.slot_label || `Period ${fallbackSlot.period_number}`} (${fallbackSlot.time_range})`
        : 'Homeroom Stream Active';

      return {
        room: fallbackSlot?.room_facility && fallbackSlot.room_facility !== 'Standard Homeroom'
          ? fallbackSlot.room_facility
          : c.room_number
          ? `Room ${c.room_number}`
          : `${c.name} Hall`,
        class: c.name,
        level: c.level_category || 'Primary Cohort',
        teacher: activeTeacher,
        formMaster,
        subject: activeSubject,
        periodLabel,
        isLiveSlot: Boolean(activeSlot),
        capacity: c.capacity || 35
      };
    });

    return {
      activeDayLabel: todayName === effectiveDay ? `Live (${todayName})` : `Previewing ${effectiveDay} Schedule`,
      currentLiveClasses: mapped
    };
  }, [classList, timetableSlots, streamFilter]);

  // Handle Walkthrough Observation Submission (Persisted to Operations + Synced with Teacher Appraisal)
  const handleObservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obsClass) {
      toast.error("Please select an active class to observe.");
      return;
    }

    setIsSubmittingWalkthrough(true);
    const toastId = toast.loading(`Logging supervisory walkthrough for ${obsClass}...`);

    try {
      const teacherName = obsTeacher.trim() || selectedClassObj?.class_teacher_name || "Form Master";
      const inspectorName = currentUser?.fullName || currentUser?.username || "Headmaster";
      const subjectName = obsSubject || "Core Curriculum";
      const strandName = obsStrand.trim() || "Live Instructional Delivery";
      const commendationsText = obsNotes.trim() || "Observed effective classroom decorum and learner participation.";
      const actionPointsText = obsActionPoints.trim() || "Continue reinforcing concrete teaching and learning resources (TLR).";

      await RoselandApi.academic.logTeacherWalkthrough({
        teacher_name: teacherName,
        class_grade: obsClass,
        subject: subjectName,
        strand_topic: strandName,
        rating: obsRating,
        commendations: commendationsText,
        action_points: actionPointsText,
        inspector_name: inspectorName
      });

      // Notify teacher via Broadcast Log
      try {
        await RoselandApi.notify.broadcastNotice({
          targetGroup: "FACULTY & STAFF",
          title: `Classroom Walkthrough Logged: ${obsClass} (${subjectName})`,
          message: `${inspectorName} recorded a ${obsRating}/5 ★ supervisory walkthrough for ${teacherName} in ${obsClass}.`
        });
      } catch {}

      toast.dismiss(toastId);
      toast.success(`Walkthrough for ${teacherName} (${obsClass}) saved & synced to Faculty Appraisals!`);

      setIsObservationOpen(false);
      setObsNotes('');
      setObsStrand('');
      setObsActionPoints('');

      await loadDashboardData();
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err?.message || "Failed to persist walkthrough inspection.");
    } finally {
      setIsSubmittingWalkthrough(false);
    }
  };

  // Handle Agenda Update
  const handleSaveAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    setAgenda(editAgendaForm);
    localStorage.setItem('roseland_headmaster_agenda', JSON.stringify(editAgendaForm));
    toast.success("Weekly Assembly & Pedagogical Agenda updated successfully!");
    setIsAgendaModalOpen(false);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* 1. TOP HEADER HERO BANNER (Pixel-matched with design mockup) */}
      <div className="bg-gradient-to-r from-[#2F138E] via-[#4F27D9] to-[#732BE2] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2.5">
            <span className="px-3 py-1 rounded-full bg-[#F59E0B] text-amber-950 font-extrabold text-[10px] uppercase tracking-wider shadow-sm">
              ACADEMIC SUPERVISORY DESK {academicState ? `• ${academicState.termName.toUpperCase()}` : '• TERM 1'}
            </span>
            <span className="text-xs text-indigo-100 font-medium">
              {academicState ? `Week ${academicState.currentWeek} of ${academicState.totalWeeks}` : 'Week 10 of 13'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white leading-tight">
            Academic Leadership Cockpit
          </h1>
          <p className="text-xs sm:text-sm text-indigo-100/90 mt-1 max-w-xl">
            Welcome, {currentUser?.fullName || currentUser?.username || 'Headmaster'}. {classList.length} active class streams registered with instructional delivery in progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={() => setIsObservationOpen(true)}
            className="px-4 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-amber-950 font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="ph-bold ph-eye text-base"></i> Log Walkthrough
          </button>
          <Link
            href="/headmaster/inspections"
            className="px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white font-semibold rounded-xl text-xs backdrop-blur-sm transition-all flex items-center gap-2"
          >
            <i className="ph-bold ph-clipboard-text text-base"></i> Vet Schemes ({pendingSchemesCount})
          </Link>
          <Link
            href="/headmaster/approvals"
            className="px-4 py-2.5 bg-white text-[#3B199E] hover:bg-gray-100 font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2"
          >
            <i className="ph-bold ph-seal-check text-base"></i> Sign-Off Reports ({reportReadyCount})
          </Link>
        </div>

        {/* Graduation cap watermark in background */}
        <div className="absolute -right-6 -bottom-10 opacity-10 text-white pointer-events-none select-none">
          <i className="ph-fill ph-graduation-cap text-[200px]"></i>
        </div>
      </div>

      {/* 2. CORE ACADEMIC STATS (4-COLUMN KPI CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Active Classrooms */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 bg-indigo-50 text-indigo-600">
            <i className="ph-fill ph-chalkboard"></i>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Classrooms</p>
            <h3 className="text-2xl font-serif font-bold text-gray-900 mt-0.5">
              {classesLoading ? '...' : `${classList.length} Classes`}
            </h3>
            <p className="text-[11px] font-semibold text-indigo-600 mt-0.5">{timetableSlots.length} Timetable slots synced</p>
          </div>
        </div>

        {/* Faculty On Duty */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 bg-emerald-50 text-emerald-600">
            <i className="ph-fill ph-check-circle"></i>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Faculty On Duty</p>
            <h3 className="text-2xl font-serif font-bold text-gray-900 mt-0.5">
              {staffCount || appraisalsList.length} Educators
            </h3>
            <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">Active institutional staff</p>
          </div>
        </div>

        {/* Walkthrough Logs */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 bg-amber-50 text-amber-600">
            <i className="ph-fill ph-clipboard-text"></i>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Walkthrough Logs</p>
            <h3 className="text-2xl font-serif font-bold text-gray-900 mt-0.5">
              {inspectionsList.length} Recorded
            </h3>
            <p className="text-[11px] font-semibold text-amber-600 mt-0.5">
              {pendingSchemesCount > 0 ? `${pendingSchemesCount} schemes pending vetting` : 'All schemes vetted'}
            </p>
          </div>
        </div>

        {/* At-Risk Alerts */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 bg-rose-50 text-rose-600">
            <i className="ph-fill ph-warning-circle"></i>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">At-Risk Alerts</p>
            <h3 className="text-2xl font-serif font-bold text-gray-900 mt-0.5">
              {atRiskCount} Pupils
            </h3>
            <p className="text-[11px] font-semibold text-rose-600 mt-0.5">Early-warning sniffer</p>
          </div>
        </div>

      </div>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 cols): Live Classroom Pulse & Assembly Agenda */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Live Classrooms in Session */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-lg text-brand-textMain">Live Classrooms in Session</h3>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> {activeDayLabel}
                  </span>
                </div>
                <p className="text-xs text-brand-textMuted mt-0.5">
                  Synchronized with Master Timetable & Faculty Allocations ({currentLiveClasses.length} classrooms)
                </p>
              </div>

              {/* Stream Filter Pills */}
              <div className="flex items-center gap-1 bg-brand-bg p-1 rounded-xl border border-gray-200/60 text-[11px] font-bold">
                {([
                  { id: 'ALL', label: 'All' },
                  { id: 'EARLY_YEARS', label: 'Early Years' },
                  { id: 'PRIMARY', label: 'Primary' },
                  { id: 'JHS', label: 'JHS' },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStreamFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      streamFilter === tab.id
                        ? 'bg-brand-violet text-white shadow-xs'
                        : 'text-brand-textMuted hover:text-brand-textMain'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {currentLiveClasses.length === 0 ? (
              <div className="text-center py-8 bg-brand-bg rounded-2xl text-xs text-brand-textMuted border border-dashed border-gray-200">
                No active classrooms found in this stream category.
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {currentLiveClasses.map((c, i) => (
                  <div
                    key={`${c.class}-${i}`}
                    className="p-4 rounded-2xl bg-brand-bg border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand-violet/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-brand-violet bg-brand-violetLight px-2 py-0.5 rounded">
                          {c.room}
                        </span>
                        <strong className="text-xs font-bold text-brand-textMain">{c.class}</strong>
                        <span className="text-[10px] text-brand-violet font-bold bg-white px-2 py-0.5 rounded border border-brand-violet/20">
                          {c.subject}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          c.isLiveSlot
                            ? 'bg-green-100 text-green-800'
                            : 'bg-white text-gray-500 border border-gray-100'
                        }`}>
                          {c.periodLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-600 flex flex-wrap items-center gap-3">
                        <span>Instructor: <strong className="text-brand-textMain">{c.teacher}</strong></span>
                        {c.formMaster && c.formMaster !== c.teacher && (
                          <span className="text-gray-400">• Form Master: {c.formMaster}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setObsClass(c.class);
                        setObsTeacher(c.teacher);
                        if (c.subject && c.subject !== 'Core Curriculum & Homeroom') {
                          setObsSubject(c.subject);
                        }
                        setIsObservationOpen(true);
                      }}
                      className="px-3.5 py-2 bg-white hover:bg-brand-violet hover:text-white border border-gray-200 text-brand-textMain font-bold rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <i className="ph-bold ph-eye"></i> Quick Walkthrough
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Assembly & Focus Theme */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif font-bold text-lg text-brand-textMain">Weekly Assembly & Pedagogical Agenda</h3>
                <p className="text-xs text-brand-textMuted">Moral and instructional emphasis for Week {agenda.weekNumber}</p>
              </div>
              <button
                onClick={() => {
                  setEditAgendaForm(agenda);
                  setIsAgendaModalOpen(true);
                }}
                className="px-3 py-1.5 bg-brand-bg hover:bg-brand-violet hover:text-white text-brand-violet font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <i className="ph-bold ph-pencil-simple"></i> Edit Agenda
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 space-y-1">
                <span className="text-gray-400 font-bold uppercase text-[10px] block">Moral Focus of the Week</span>
                <strong className="text-brand-textMain text-sm block">&ldquo;{agenda.moralFocus}&rdquo;</strong>
                <p className="text-brand-textMuted text-[11px]">{agenda.focusDetails}</p>
              </div>

              <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 space-y-1">
                <span className="text-gray-400 font-bold uppercase text-[10px] block">Assembly Hymn & Reading</span>
                <strong className="text-brand-textMain text-sm block">{agenda.hymnAndReading}</strong>
                <p className="text-brand-textMuted text-[11px]">{agenda.hymnDetails}</p>
              </div>

              <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 space-y-1">
                <span className="text-gray-400 font-bold uppercase text-[10px] block">Inspection Focus Topic</span>
                <strong className="text-brand-textMain text-sm block">{agenda.inspectionTopic}</strong>
                <p className="text-brand-textMuted text-[11px]">{agenda.inspectionDetails}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (4 cols): Action Queue & Quick Nav */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Dynamic Action Queue */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-base text-brand-textMain">Pedagogical Action Queue</h3>
              <span className="w-6 h-6 rounded-full bg-brand-bg text-brand-violet text-xs font-bold flex items-center justify-center">
                {actionQueue.length}
              </span>
            </div>

            {actionQueue.length === 0 ? (
              <div className="text-center py-6 text-xs text-brand-textMuted bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <i className="ph ph-check-circle text-2xl text-emerald-500 block mb-1"></i>
                All academic supervisory items cleared.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {actionQueue.map((item) => (
                  <div key={item.id} className="py-3.5 flex items-start justify-between gap-3">
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider block ${item.badgeColor ? 'px-2 py-0.5 rounded w-fit ' + item.badgeColor : 'text-brand-violet'}`}>
                        {item.type}
                      </span>
                      <h4 className="text-xs font-bold text-brand-textMain mt-1">{item.title}</h4>
                      <span className="text-[10px] text-gray-400 block mt-0.5">{item.time}</span>
                    </div>
                    <Link
                      href={item.link}
                      className="px-2.5 py-1.5 bg-brand-bg hover:bg-brand-violet hover:text-white rounded-xl text-[11px] font-bold text-brand-textMain transition-colors shrink-0 mt-1"
                    >
                      Action
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Academic Hubs */}
          <div className="bg-brand-violetLight/40 rounded-3xl p-6 border border-brand-violet/20">
            <h3 className="font-serif font-bold text-base text-brand-textMain mb-3">Academic Management</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <Link href="/headmaster/attendance" className="p-3 bg-white rounded-xl border border-gray-200/60 font-bold text-brand-textMain hover:border-brand-violet hover:text-brand-violet transition-all flex flex-col items-center text-center shadow-xs">
                <i className="ph-fill ph-calendar-check text-xl text-blue-600 mb-1"></i>
                Daily Attendance
              </Link>
              <Link href="/headmaster/at-risk" className="p-3 bg-white rounded-xl border border-gray-200/60 font-bold text-brand-textMain hover:border-brand-violet hover:text-brand-violet transition-all flex flex-col items-center text-center shadow-xs">
                <i className="ph-fill ph-warning-circle text-xl text-red-600 mb-1"></i>
                At-Risk Sniffer
              </Link>
              <Link href="/headmaster/bece-analytics" className="p-3 bg-white rounded-xl border border-gray-200/60 font-bold text-brand-textMain hover:border-brand-violet hover:text-brand-violet transition-all flex flex-col items-center text-center shadow-xs">
                <i className="ph-fill ph-chart-line-up text-xl text-purple-600 mb-1"></i>
                BECE Radar
              </Link>
              <Link href="/headmaster/discipline" className="p-3 bg-white rounded-xl border border-gray-200/60 font-bold text-brand-textMain hover:border-brand-violet hover:text-brand-violet transition-all flex flex-col items-center text-center shadow-xs">
                <i className="ph-fill ph-shield-star text-xl text-amber-600 mb-1"></i>
                Prefects & Conduct
              </Link>
              <Link href="/headmaster/appraisals" className="p-3 bg-white rounded-xl border border-gray-200/60 font-bold text-brand-textMain hover:border-brand-violet hover:text-brand-violet transition-all flex flex-col items-center text-center shadow-xs">
                <i className="ph-fill ph-medal text-xl text-emerald-600 mb-1"></i>
                Staff Appraisals
              </Link>
              <Link href="/headmaster/approvals" className="p-3 bg-white rounded-xl border border-gray-200/60 font-bold text-brand-textMain hover:border-brand-violet hover:text-brand-violet transition-all flex flex-col items-center text-center shadow-xs">
                <i className="ph-fill ph-seal-check text-xl text-indigo-600 mb-1"></i>
                Report Sign-Offs
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* 4. Classroom Walkthrough Logger Modal (PERSISTED TO SUPABASE & APPRAISALS) */}
      <Modal
        isOpen={isObservationOpen}
        onClose={() => setIsObservationOpen(false)}
        title="Classroom Walkthrough Log"
        subtitle="Rapid evaluation of live pedagogy synced with Operations & Faculty Appraisals"
        size="lg"
      >
        <form onSubmit={handleObservationSubmit} className="space-y-4 text-xs pt-2">
          
          {/* Class & Educator */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-brand-textMain uppercase mb-1">Observed Class *</label>
              <select
                value={obsClass}
                onChange={(e) => {
                  const nextCls = e.target.value;
                  setObsClass(nextCls);
                  const found = classList.find((c) => c.name === nextCls);
                  if (found?.class_teacher_name) {
                    setObsTeacher(found.class_teacher_name);
                  }
                }}
                required
                className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 font-semibold text-brand-textMain outline-none focus:border-brand-violet"
              >
                {classList.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} ({c.class_teacher_name || 'No Teacher'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-brand-textMain uppercase mb-1">Educator Observed *</label>
              <input
                type="text"
                required
                value={obsTeacher}
                onChange={(e) => setObsTeacher(e.target.value)}
                placeholder="Teacher full name"
                className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 font-semibold text-brand-textMain outline-none focus:border-brand-violet"
              />
            </div>
          </div>

          {/* Subject & Strand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-brand-textMain uppercase mb-1">Subject Observed *</label>
              <select
                value={obsSubject}
                onChange={(e) => setObsSubject(e.target.value)}
                required
                className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 font-semibold text-brand-textMain outline-none focus:border-brand-violet"
              >
                {subjectList.length === 0 ? (
                  <option value="General Curriculum">General Curriculum</option>
                ) : (
                  subjectList.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.code})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block font-bold text-brand-textMain uppercase mb-1">Curricular Strand / Topic</label>
              <input
                type="text"
                value={obsStrand}
                onChange={(e) => setObsStrand(e.target.value)}
                placeholder="e.g. Number & Numeration, Fractions"
                className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet"
              />
            </div>
          </div>

          {/* Star Rating (1 to 5) */}
          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Pedagogical Delivery Rating (1 to 5) *</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setObsRating(star)}
                  className={`flex-1 py-2 rounded-xl font-bold text-sm flex items-center justify-center border transition-all cursor-pointer ${
                    obsRating >= star
                      ? 'bg-amber-400 text-amber-950 border-amber-400 shadow-xs'
                      : 'bg-brand-bg text-gray-400 border-gray-200'
                  }`}
                >
                  ★ {star}
                </button>
              ))}
            </div>
          </div>

          {/* Supervisory Notes & Commendations */}
          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Supervisory Notes & Commendations *</label>
            <textarea
              rows={3}
              required
              value={obsNotes}
              onChange={(e) => setObsNotes(e.target.value)}
              placeholder="e.g. Excellent use of math flashcards; learners actively engaged. Encouraged equal gender participation."
              className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet"
            ></textarea>
          </div>

          {/* Action Points / Feedback */}
          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Action Points for Teacher Refinement</label>
            <textarea
              rows={2}
              value={obsActionPoints}
              onChange={(e) => setObsActionPoints(e.target.value)}
              placeholder="e.g. Integrate more manipulative TLRs and pace question-and-answer drills."
              className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsObservationOpen(false)}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingWalkthrough}
              className="px-6 py-2.5 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmittingWalkthrough ? (
                <>
                  <i className="ph-bold ph-spinner animate-spin"></i> Saving...
                </>
              ) : (
                <>
                  <i className="ph-bold ph-floppy-disk"></i> Save & Sync Walkthrough
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. Edit Assembly Agenda Modal */}
      <Modal
        isOpen={isAgendaModalOpen}
        onClose={() => setIsAgendaModalOpen(false)}
        title="Edit Weekly Assembly & Pedagogical Agenda"
        subtitle="Configure the institutional focus, assembly readings, and supervisory topics for the week"
        size="lg"
      >
        <form onSubmit={handleSaveAgenda} className="space-y-4 text-xs pt-2">
          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Academic Week Number *</label>
            <input
              type="number"
              min={1}
              max={20}
              required
              value={editAgendaForm.weekNumber}
              onChange={(e) => setEditAgendaForm({ ...editAgendaForm, weekNumber: Number(e.target.value) })}
              className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet"
            />
          </div>

          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Moral Focus of the Week *</label>
            <input
              type="text"
              required
              value={editAgendaForm.moralFocus}
              onChange={(e) => setEditAgendaForm({ ...editAgendaForm, moralFocus: e.target.value })}
              placeholder="e.g. Integrity & Academic Honesty"
              className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet"
            />
          </div>

          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Moral Focus Details</label>
            <input
              type="text"
              value={editAgendaForm.focusDetails}
              onChange={(e) => setEditAgendaForm({ ...editAgendaForm, focusDetails: e.target.value })}
              placeholder="e.g. Assembly speech delivered by Headmaster"
              className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet"
            />
          </div>

          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Assembly Hymn & Scripture Reading *</label>
            <input
              type="text"
              required
              value={editAgendaForm.hymnAndReading}
              onChange={(e) => setEditAgendaForm({ ...editAgendaForm, hymnAndReading: e.target.value })}
              placeholder="e.g. MHHB 511 / Proverbs 3:1–6"
              className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet"
            />
          </div>

          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Hymn & Reading Details</label>
            <input
              type="text"
              value={editAgendaForm.hymnDetails}
              onChange={(e) => setEditAgendaForm({ ...editAgendaForm, hymnDetails: e.target.value })}
              placeholder="e.g. Led by Chapel Prefect"
              className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet"
            />
          </div>

          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Inspection Focus Topic *</label>
            <input
              type="text"
              required
              value={editAgendaForm.inspectionTopic}
              onChange={(e) => setEditAgendaForm({ ...editAgendaForm, inspectionTopic: e.target.value })}
              placeholder="e.g. Use of Concrete Teaching Aids"
              className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet"
            />
          </div>

          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Inspection Focus Target Cohort</label>
            <input
              type="text"
              value={editAgendaForm.inspectionDetails}
              onChange={(e) => setEditAgendaForm({ ...editAgendaForm, inspectionDetails: e.target.value })}
              placeholder="e.g. Focus on Early Years & Lower Primary"
              className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAgendaModalOpen(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <i className="ph-bold ph-check-circle"></i> Save Agenda
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
