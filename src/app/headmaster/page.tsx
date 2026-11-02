"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { AuthService, RoselandUser } from '@/lib/auth';
import { useClasses } from '@/hooks/useClasses';
import { useSubjects } from '@/hooks/useSubjects';
import { RoselandApi } from '@/lib/api';

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

export default function HeadmasterDashboard() {
  const { classes: classList, isLoading: classesLoading } = useClasses();
  const { subjects: subjectList } = useSubjects();
  
  const [currentUser, setCurrentUser] = useState<RoselandUser | null>(null);
  const [isObservationOpen, setIsObservationOpen] = useState(false);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [isSubmittingWalkthrough, setIsSubmittingWalkthrough] = useState(false);
  
  // Walkthrough State
  const [obsClass, setObsClass] = useState('');
  const [obsSubject, setObsSubject] = useState('');
  const [obsStrand, setObsStrand] = useState('');
  const [obsRating, setObsRating] = useState(5);
  const [obsNotes, setObsNotes] = useState('');
  const [obsActionPoints, setObsActionPoints] = useState('');
  
  // Dynamic Live Metrics State
  const [staffCount, setStaffCount] = useState(0);
  const [atRiskCount, setAtRiskCount] = useState(0);
  const [inspectionsList, setInspectionsList] = useState<any[]>([]);
  const [reportReadyCount, setReportReadyCount] = useState(0);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

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

  // Fetch Live Metrics across SIS, Academic & Operations
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

      // 2. SIS Students (Compute Live At-Risk Scholars)
      const sisPromise = RoselandApi.sis.getStudents()
        .then((students) => {
          if (students && Array.isArray(students)) {
            const atRisk = students.filter((s: any) => {
              const score = Number(s.avg_score ?? s.avgScore ?? 100);
              const att = Number(s.attendance_pct ?? s.attendancePct ?? 100);
              return score < 50 || att < 75 || s.status === 'AT_RISK' || s.isAtRisk;
            });
            setAtRiskCount(atRisk.length);
          }
        })
        .catch(() => {});

      // 3. Operations Inspections
      const opsPromise = RoselandApi.operations.getInspections()
        .then((inspections) => {
          if (inspections && Array.isArray(inspections)) {
            setInspectionsList(inspections);
          }
        })
        .catch(() => {});

      // 4. Academic Report Card Approvals Status
      const reportsPromise = RoselandApi.academic.getReportStatus()
        .then((statusRes) => {
          const classes = statusRes?.classes || [];
          if (Array.isArray(classes)) {
            const ready = classes.filter((c: any) => !c.isPublished && (c.pupilsIncomplete === 0 || c.missingScores === 0) && (c.totalPupils > 0 || c.totalCards > 0));
            setReportReadyCount(ready.length);
          }
        })
        .catch(() => {});

      // 5. Academic Calendar State
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

      await Promise.allSettled([staffPromise, sisPromise, opsPromise, reportsPromise, calendarPromise]);
    } catch (err) {
      console.warn("Failed to load headmaster cockpit data:", err);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Sync initial walkthrough class & subject
  useEffect(() => {
    if (classList && classList.length > 0 && !obsClass) {
      setObsClass(classList[0].name);
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

    if (inspectionsList.length > 0) {
      queue.push({
        id: 'act-inspections',
        type: 'Curriculum Supervision',
        title: `${inspectionsList.length} Classroom Walkthrough${inspectionsList.length > 1 ? 's' : ''} Logged to Registry`,
        time: 'Vetting History Updated',
        link: '/headmaster/inspections',
        badgeColor: 'text-brand-violet bg-brand-violetLight'
      });
    }

    if (staffCount > 0) {
      queue.push({
        id: 'act-staff',
        type: 'Faculty Evaluation',
        title: `${staffCount} Academic Staff in Active Directory`,
        time: 'GES 5-Domain Rubric Active',
        link: '/headmaster/appraisals',
        badgeColor: 'text-amber-700 bg-amber-50'
      });
    }

    return queue;
  }, [reportReadyCount, atRiskCount, inspectionsList, staffCount]);

  // Current live classrooms mapped directly from Class Registry
  const currentLiveClasses = useMemo(() => {
    return classList.slice(0, 4).map((c) => ({
      room: c.room_number ? `Room ${c.room_number}` : `${c.name} Hall`,
      class: c.name,
      level: c.level_category || 'Primary Cohort',
      teacher: c.class_teacher_name || 'Assigned Form Master',
      capacity: c.capacity || 35
    }));
  }, [classList]);

  // Handle Walkthrough Observation Submission
  const handleObservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obsClass) {
      toast.error("Please select an active class to observe.");
      return;
    }

    setIsSubmittingWalkthrough(true);
    const toastId = toast.loading(`Logging supervisory walkthrough for ${obsClass}...`);

    try {
      const teacherName = selectedClassObj?.class_teacher_name || "Form Master";
      const inspectorName = currentUser?.fullName || currentUser?.username || "Mr. Kwame Asamoah (Headmaster)";

      await RoselandApi.operations.logInspection({
        teacherName,
        classGrade: obsClass,
        subject: obsSubject || "Core Curriculum",
        strandTopic: obsStrand || "Live Instructional Delivery",
        rating: obsRating,
        commendations: obsNotes.trim() || "Observed effective classroom decorum and learner participation.",
        actionPoints: obsActionPoints.trim() || "Continue reinforcing concrete teaching and learning resources (TLR).",
        inspectorName
      });

      toast.dismiss(toastId);
      toast.success(`Classroom walkthrough for ${obsClass} saved to Operations Registry!`);
      
      setIsObservationOpen(false);
      setObsNotes('');
      setObsStrand('');
      setObsActionPoints('');
      
      // Refresh inspections list
      RoselandApi.operations.getInspections().then((res) => {
        if (Array.isArray(res)) setInspectionsList(res);
      }).catch(() => {});
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
      
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-gradient-to-r from-brand-violetDark via-brand-violet to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-3 py-0.5 rounded-full bg-brand-yellow text-yellow-950 font-bold text-[10px] uppercase tracking-wider">
              Academic Supervisory Desk {academicState ? `• ${academicState.termName}` : '• Out of Session'}
            </span>
            <span className="text-xs text-brand-violetLight font-medium">
              {academicState ? `Week ${academicState.currentWeek} of ${academicState.totalWeeks}` : 'System Clock: Inactive'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white leading-tight">
            Academic Leadership Cockpit
          </h1>
          <p className="text-xs sm:text-sm text-gray-200 mt-1 max-w-xl">
            Welcome, {currentUser?.fullName || currentUser?.username || 'Headmaster'}. {classList.length} active class streams registered with morning instructional delivery in progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={() => setIsObservationOpen(true)}
            className="px-4 py-2.5 bg-brand-yellow text-yellow-950 font-bold rounded-xl hover:bg-yellow-400 text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="ph-bold ph-eye text-base"></i> Log Walkthrough
          </button>
          <Link
            href="/headmaster/inspections"
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-xs backdrop-blur-sm transition-all flex items-center gap-2"
          >
            <i className="ph-bold ph-clipboard-text text-base"></i> Vet Schemes ({inspectionsList.length})
          </Link>
          <Link
            href="/headmaster/approvals"
            className="px-4 py-2.5 bg-white text-brand-violet font-bold rounded-xl hover:bg-gray-100 text-xs shadow-md transition-all flex items-center gap-2"
          >
            <i className="ph-bold ph-seal-check text-base"></i> Sign-Off Reports ({reportReadyCount})
          </Link>
        </div>

        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-yellow/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* 2. CORE ACADEMIC STATS (DYNAMIC) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Active Classrooms */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 bg-brand-violetLight text-brand-violet">
            <i className="ph-fill ph-chalkboard"></i>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Classrooms</p>
            <h3 className="text-2xl font-serif font-bold text-brand-textMain mt-0.5">
              {classesLoading ? '...' : `${classList.length} Classes`}
            </h3>
            <p className="text-[11px] font-semibold text-brand-violet mt-0.5">Timetable registry synced</p>
          </div>
        </div>

        {/* Faculty On Duty */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 bg-green-100 text-green-700">
            <i className="ph-fill ph-check-circle"></i>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Faculty On Duty</p>
            <h3 className="text-2xl font-serif font-bold text-brand-textMain mt-0.5">
              {staffCount} Educators
            </h3>
            <p className="text-[11px] font-semibold text-green-700 mt-0.5">Active institutional staff</p>
          </div>
        </div>

        {/* Walkthroughs Logged */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 bg-brand-yellowLight text-yellow-800">
            <i className="ph-fill ph-clipboard-text"></i>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Walkthrough Logs</p>
            <h3 className="text-2xl font-serif font-bold text-brand-textMain mt-0.5">
              {inspectionsList.length} Recorded
            </h3>
            <p className="text-[11px] font-semibold text-amber-700 mt-0.5">Supervisory evaluations</p>
          </div>
        </div>

        {/* At-Risk Interventions */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 bg-red-100 text-red-700">
            <i className="ph-fill ph-warning-circle"></i>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">At-Risk Alerts</p>
            <h3 className="text-2xl font-serif font-bold text-brand-textMain mt-0.5">
              {atRiskCount} Pupils
            </h3>
            <p className="text-[11px] font-semibold text-red-700 mt-0.5">Early-warning sniffer</p>
          </div>
        </div>

      </div>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 cols): Live Classroom Pulse & Assembly Agenda */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Live Classrooms in Session */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-serif font-bold text-lg text-brand-textMain">Live Classrooms in Session</h3>
                <p className="text-xs text-brand-textMuted">Class roster & instructional delivery oversight</p>
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Active Streams
              </span>
            </div>

            {currentLiveClasses.length === 0 ? (
              <div className="text-center py-8 bg-brand-bg rounded-2xl text-xs text-brand-textMuted border border-dashed border-gray-200">
                No active classrooms found in registry.
              </div>
            ) : (
              <div className="space-y-3">
                {currentLiveClasses.map((c, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-brand-bg border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand-violet/40 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] font-bold text-brand-violet bg-brand-violetLight px-2 py-0.5 rounded">
                          {c.room}
                        </span>
                        <strong className="text-xs font-bold text-brand-textMain">{c.class}</strong>
                        <span className="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-100 font-semibold">{c.level}</span>
                      </div>
                      <span className="text-[11px] text-gray-600 block mt-0.5">Form Master: <strong>{c.teacher}</strong></span>
                    </div>

                    <button
                      onClick={() => {
                        setObsClass(c.class);
                        setIsObservationOpen(true);
                      }}
                      className="px-3.5 py-1.5 bg-white hover:bg-brand-violet hover:text-white border border-gray-200 text-brand-textMain font-bold rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
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
                <strong className="text-brand-textMain text-sm block">"{agenda.moralFocus}"</strong>
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
                <i className="ph ph-check-circle text-2xl text-gray-300 block mb-1"></i>
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
            <div className="grid grid-cols-2 gap-2.5 text-xs">
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
            </div>
          </div>

        </div>

      </div>

      {/* 4. Classroom Walkthrough Logger Modal (PERSISTED TO SUPABASE) */}
      {isObservationOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 animate-fade-in relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsObservationOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-base cursor-pointer"
            >
              ✕
            </button>

            <span className="text-xs font-bold uppercase tracking-wider text-brand-violet">Academic Supervisory Rubric</span>
            <h3 className="text-xl font-serif font-bold text-brand-textMain mt-1 mb-1">Classroom Walkthrough Log</h3>
            <p className="text-xs text-brand-textMuted mb-6">Rapid evaluation of live pedagogy and learner engagement stored in Operations Registry.</p>

            <form onSubmit={handleObservationSubmit} className="space-y-4 text-xs">
              
              {/* Class & Subject Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-brand-textMain uppercase mb-1">Observed Class *</label>
                  <select
                    value={obsClass}
                    onChange={(e) => setObsClass(e.target.value)}
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
              </div>

              {/* Strand / Lesson Topic */}
              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Curricular Strand / Topic</label>
                <input
                  type="text"
                  value={obsStrand}
                  onChange={(e) => setObsStrand(e.target.value)}
                  placeholder="e.g. Number & Numeration, Fractions & Decimals"
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet"
                />
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
                  placeholder="e.g. Excellent use of math flashcards; learners actively engaged. Encouraged more equal gender participation."
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

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsObservationOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWalkthrough}
                  className="px-6 py-2 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingWalkthrough ? (
                    <>
                      <i className="ph-bold ph-spinner animate-spin"></i> Saving...
                    </>
                  ) : (
                    <>
                      <i className="ph-bold ph-floppy-disk"></i> Save Walkthrough
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Edit Assembly Agenda Modal */}
      {isAgendaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 animate-fade-in relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsAgendaModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-base cursor-pointer"
            >
              ✕
            </button>

            <span className="text-xs font-bold uppercase tracking-wider text-brand-violet">Supervisory Oversight</span>
            <h3 className="text-xl font-serif font-bold text-brand-textMain mt-1 mb-1">Edit Weekly Assembly & Pedagogical Agenda</h3>
            <p className="text-xs text-brand-textMuted mb-6">Configure the institutional focus, assembly readings, and supervisory topics for the week.</p>

            <form onSubmit={handleSaveAgenda} className="space-y-4 text-xs">
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

              <div className="flex justify-end gap-3 pt-2">
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
          </div>
        </div>
      )}

    </div>
  );
}

