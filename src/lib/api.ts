/**
 * The Roseland Preparatory School OS - Unified API Gateway Client
 * Proxies all requests to the Nginx Path-Based Gateway on Port 8000
 */

const BACKEND_DIRECT_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  'https://roseland-rpsms-backend.onrender.com'
).replace(/\/$/, '');

const API_BASE = (
  typeof window === 'undefined'
    ? process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://roseland-rpsms-backend.onrender.com'
    : process.env.NEXT_PUBLIC_API_URL || 'https://roseland-rpsms-backend.onrender.com'
).replace(/\/$/, '');

let cmsLandingCache: { data: any; expiresAt: number } | null = null;
let cmsLandingInFlight: Promise<any> | null = null;
let wakeUpInFlight: Promise<boolean> | null = null;
let lastWakeUpSuccessAt = 0;

/**
 * Silently pings the backend gateway so a cold-started
 * Free Tier instance begins spinning up immediately when any visitor arrives.
 */
export async function wakeUpBackend(force: boolean = false): Promise<boolean> {
  if (typeof window === 'undefined') return true;

  const now = Date.now();
  if (!force && now - lastWakeUpSuccessAt < 60_000) {
    return true;
  }

  if (wakeUpInFlight) {
    return wakeUpInFlight;
  }

  wakeUpInFlight = (async () => {
    try {
      // 1. Direct no-cors ping to configured backend URL to immediately trigger container wake-up
      if (API_BASE) {
        fetch(`${API_BASE}/health`, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-store',
        }).catch(() => {});
      }

      // 2. Check same-origin /health rewrite
      const res = await fetch('/health', {
        method: 'GET',
        cache: 'no-store',
      }).catch(() => null);

      if (res && res.ok) {
        lastWakeUpSuccessAt = Date.now();
        return true;
      }
      return false;
    } finally {
      wakeUpInFlight = null;
    }
  })();

  return wakeUpInFlight;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export interface SubjectRecord {
  id: string;
  code: string;
  name: string;
  department: string;
  level_categories: string;
  is_core: boolean;
  weekly_periods: number;
  default_room_type: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const COLD_START_STATUS_CODES = new Set([408, 429, 502, 503, 504, 520, 521, 522, 523, 524]);

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const isBrowser = typeof window !== 'undefined';
  const token = isBrowser ? localStorage.getItem('roseland_token') : null;

  const hasBody = options.body !== undefined && options.body !== null;
  const headers: HeadersInit = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const hasNextRevalidate = Boolean((options as any)?.next?.revalidate);
  const maxAttempts = isBrowser ? 5 : 2;
  let lastError: Error | null = null;

  // In the browser, when running on localhost, prefer the local gateway (http://localhost:8000)
  // directly (except for Next.js local route handlers like /api/v1/sis/admissions/apply) so
  // stale Next.js rewrite caches never route local requests to production Render.
  const isLocalhostBrowser =
    isBrowser &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
    !endpoint.startsWith('/api/v1/sis/admissions/apply');

  const getBaseForAttempt = (attempt: number): string => {
    if (!isBrowser) return API_BASE;
    if (isLocalhostBrowser) {
      return attempt % 2 === 0 ? 'http://localhost:8000' : '';
    }
    // Attempt 0, 2, 4 -> same-origin Next.js Route Handlers / rewrites ('')
    // Attempt 1, 3 -> direct configured API_BASE (bypasses proxy timeout during cold start)
    return attempt % 2 === 0 ? '' : API_BASE || BACKEND_DIRECT_URL || '';
  };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const baseUrl = getBaseForAttempt(attempt);
    try {
      const controller = new AbortController();
      const attemptTimeout = setTimeout(() => controller.abort(), 35_000);

      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...(hasNextRevalidate ? {} : { cache: 'no-store' }),
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });

      clearTimeout(attemptTimeout);

      if (response.ok) {
        lastWakeUpSuccessAt = Date.now();
        return response.json();
      }

      if (COLD_START_STATUS_CODES.has(response.status) && attempt < maxAttempts - 1) {
        if (isBrowser && API_BASE) {
          fetch(`${API_BASE}/health`, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
        }
        await new Promise((r) => setTimeout(r, 2500));
        continue;
      }

      const errBody = await response.json().catch(() => ({}));
      const message =
        typeof errBody.detail === 'string'
          ? errBody.detail
          : errBody.message ||
            (Array.isArray(errBody.detail)
              ? errBody.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
              : `API Error ${response.status}: ${response.statusText}`);
      throw new Error(message);
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isNetworkOrAbort =
        err?.name === 'AbortError' ||
        err instanceof TypeError ||
        /fetch|network|aborted|timeout/i.test(String(err?.message || ''));

      if (isNetworkOrAbort && attempt < maxAttempts - 1) {
        if (isBrowser && API_BASE) {
          fetch(`${API_BASE}/health`, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
        }
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Unable to reach server after multiple retries.');
}

export const RoselandApi = {
  // 1. Auth Service (Port 8081 via Gateway)
  auth: {
    login: (credentials: { identifier: string; password: string }) =>
      apiRequest('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    verifyPin: (pin: string, targetResource?: string) =>
      apiRequest('/api/v1/auth/verify-pin', {
        method: 'POST',
        body: JSON.stringify({ pin, targetResource }),
      }),
    me: () => apiRequest('/api/v1/auth/me'),
    provisionStaff: (staffData: {
      email: string;
      username: string;
      fullName: string;
      role: string;
      password: string;
      phone?: string;
      assignedClass?: string;
      avatar?: string;
    }) =>
      apiRequest('/api/v1/auth/provision-staff', {
        method: 'POST',
        body: JSON.stringify(staffData),
      }),
    getStaffDirectory: () => apiRequest('/api/v1/auth/staff-directory'),
    updateStaffAllocation: (userId: string, data: { assignedClass?: string; role?: string; phone?: string }) =>
      apiRequest(`/api/v1/auth/staff/${userId}/allocation`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteStaff: (userId: string) =>
      apiRequest(`/api/v1/auth/staff/${userId}`, {
        method: 'DELETE',
      }),
    deleteAllTeachers: () =>
      apiRequest('/api/v1/auth/teachers', {
        method: 'DELETE',
      }),
    getSystemSettings: () => apiRequest('/api/v1/auth/settings/profile'),
    updateSystemSettings: (settingsData: any) =>
      apiRequest('/api/v1/auth/settings/profile', {
        method: 'PUT',
        body: JSON.stringify(settingsData),
      }),
    getRolePermissions: () => apiRequest('/api/v1/auth/permissions'),
    updateRolePermissions: (role: string, permissions: string[]) =>
      apiRequest(`/api/v1/auth/permissions/${encodeURIComponent(role)}`, {
        method: 'PUT',
        body: JSON.stringify({ permissions }),
      }),
  },

  // 2. Academic Core & SBA Engine (Port 8082 via Gateway)
  academic: {
    curriculum: {
      getForClass: (classGrade: string) => 
        apiRequest(`/api/v1/academic/curriculum/${encodeURIComponent(classGrade)}`),
      bulkAssign: (classGrade: string, subjects: any[]) =>
        apiRequest(`/api/v1/academic/curriculum/${encodeURIComponent(classGrade)}`, {
          method: 'POST',
          body: JSON.stringify(subjects),
        }),
      removeSubject: (id: string) =>
        apiRequest(`/api/v1/academic/curriculum/${id}`, {
          method: 'DELETE',
        }),
    },
    getFacultyAllocations: () => apiRequest('/api/v1/academic/faculty/allocations'),
    getTeacherAllocation: (identifier: string) => apiRequest(`/api/v1/academic/faculty/allocation/${encodeURIComponent(identifier)}`),
    saveFacultyAllocation: (allocationData: {
      teacher_id?: string;
      teacher_name: string;
      teacher_email?: string;
      form_class?: string;
      assigned_classes: string[];
      subjects: string[];
      weekly_periods?: number;
    }) =>
      apiRequest('/api/v1/academic/faculty/allocation', {
        method: 'POST',
        body: JSON.stringify(allocationData),
      }),
    deleteFacultyAllocation: (teacherIdentifier: string) =>
      apiRequest(`/api/v1/academic/faculty/allocation/by-teacher/${encodeURIComponent(teacherIdentifier)}`, {
        method: 'DELETE',
      }),
    deleteClassAllocation: (classGrade: string) =>
      apiRequest(`/api/v1/academic/faculty/allocation/by-class/${encodeURIComponent(classGrade)}`, {
        method: 'DELETE',
      }),
    getScores: (params?: { classGrade?: string; class_grade?: string; subject?: string; studentIndex?: string; student_index?: string }) => {
      const q = new URLSearchParams();
      if (params?.classGrade || params?.class_grade) q.set('class_grade', (params.classGrade || params.class_grade)!);
      if (params?.subject) q.set('subject', params.subject);
      if (params?.studentIndex || params?.student_index) q.set('student_index', (params.studentIndex || params.student_index)!);
      const qs = q.toString();
      return apiRequest(`/api/v1/academic/grading/scores${qs ? `?${qs}` : ''}`);
    },
    saveScore: (scoreData: any) =>
      apiRequest('/api/v1/academic/grading/score', {
        method: 'POST',
        body: JSON.stringify(scoreData),
      }),
    getTimetableGazette: (classGrade = '') =>
      apiRequest(`/api/v1/academic/timetable/gazette${classGrade ? `?class_grade=${encodeURIComponent(classGrade)}` : ''}`),
    getTimetableSlots: (params?: { classGrade?: string; day?: string }) => {
      const q = new URLSearchParams();
      if (params?.classGrade) q.set('class_grade', params.classGrade);
      if (params?.day) q.set('day', params.day);
      const qs = q.toString();
      return apiRequest(`/api/v1/academic/timetable/slots${qs ? `?${qs}` : ''}`);
    },
    createTimetableSlot: (slotData: {
      day: string;
      period_number: number;
      time_range: string;
      class_grade: string;
      subject: string;
      teacher_name: string;
      room_facility?: string;
      slot_label?: string;
      slot_type?: 'academic' | 'break' | 'assembly' | 'activity' | 'closing';
    }) =>
      apiRequest('/api/v1/academic/timetable/slot', {
        method: 'POST',
        body: JSON.stringify(slotData),
      }),
    updateTimetableSlot: (slotId: string, slotData: {
      day?: string;
      period_number?: number;
      time_range?: string;
      class_grade?: string;
      subject?: string;
      teacher_name?: string;
      room_facility?: string;
      slot_label?: string;
      slot_type?: 'academic' | 'break' | 'assembly' | 'activity' | 'closing';
    }) =>
      apiRequest(`/api/v1/academic/timetable/slot/${slotId}`, {
        method: 'PATCH',
        body: JSON.stringify(slotData),
      }),
    deleteTimetableSlot: (slotId: string) =>
      apiRequest(`/api/v1/academic/timetable/slot/${slotId}`, {
        method: 'DELETE',
      }),
    unassignTeacherSlots: (teacherName: string) =>
      apiRequest(`/api/v1/academic/timetable/slots/by-teacher/${encodeURIComponent(teacherName)}`, {
        method: 'DELETE',
      }),
    getTimetableConflicts: (classGrade?: string) => {
      const q = classGrade ? `?class_grade=${encodeURIComponent(classGrade)}` : '';
      return apiRequest(`/api/v1/academic/timetable/conflicts${q}`);
    },
    checkTimetableCollisions: (payload: { slots?: any[]; proposedSlot?: any; excludeSlotId?: string } | any[]) => {
      const body = Array.isArray(payload) ? { slots: payload } : payload;
      return apiRequest('/api/v1/academic/timetable/check-collisions', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    getReportStatus: (term?: string, academicYear?: string) => {
      const p = new URLSearchParams();
      if (term) p.append('term', term);
      if (academicYear) p.append('academic_year', academicYear);
      return apiRequest(`/api/v1/academic/reports/status${p.toString() ? '?' + p.toString() : ''}`);
    },
    signOffReports: (payload: { class_grade: string; term?: string; academic_year?: string; signed_by?: string }) =>
      apiRequest('/api/v1/academic/reports/sign-off', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    reopenReports: (payload: { class_grade: string; term?: string; academic_year?: string }) =>
      apiRequest('/api/v1/academic/reports/reopen', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateReportRemarks: (payload: {
      student_index_no: string;
      term?: string;
      academic_year?: string;
      conduct_rating?: string;
      attitude_rating?: string;
      interest_rating?: string;
      form_master_remark?: string;
      headmaster_remark?: string;
    }) =>
      apiRequest('/api/v1/academic/reports/remarks', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    evaluatePromotion: (students: any[]) =>
      apiRequest('/api/v1/academic/promotion/evaluate', {
        method: 'POST',
        body: JSON.stringify(students),
      }),
    commitPromotion: (cohortData: any) =>
      apiRequest('/api/v1/academic/promotion/commit', {
        method: 'POST',
        body: JSON.stringify(cohortData),
      }),
    getPromotionGazette: (classGrade?: string) =>
      apiRequest(`/api/v1/academic/promotion/gazette${classGrade ? `?class_grade=${encodeURIComponent(classGrade)}` : ''}`),
    getTerminalReportCard: (studentIndexNo: string, term?: string, academicYear?: string) => {
      const p = new URLSearchParams();
      if (term) p.append('term', term);
      if (academicYear) p.append('academic_year', academicYear);
      return apiRequest(`/api/v1/academic/reports/card/${studentIndexNo}${p.toString() ? '?' + p.toString() : ''}`);
    },
    getRosterTemplate: (classGrade: string, academicYear?: string, academicTerm?: string) => {
      const p = new URLSearchParams();
      p.append('class_grade', classGrade);
      if (academicYear) p.append('academic_year', academicYear);
      if (academicTerm) p.append('academic_term', academicTerm);
      return apiRequest(`/api/v1/academic/reports/roster-template?${p.toString()}`);
    },
    bulkImportHistoricalReports: (payload: {
      academic_year: string;
      academic_term: string;
      class_grade: string;
      records: Array<{
        student_index_no: string;
        student_name: string;
        days_present?: number;
        total_attendance?: number;
        overall_avg?: number;
        class_position?: string;
        conduct_rating?: string;
        attitude_rating?: string;
        interest_rating?: string;
        form_master_remark?: string;
        headmaster_remark?: string;
        subject_scores?: Record<string, number>;
      }>;
    }) =>
      apiRequest('/api/v1/academic/reports/bulk-historical', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getCumulativeStudentReports: (studentIndexNo: string) =>
      apiRequest(`/api/v1/academic/reports/student/${encodeURIComponent(studentIndexNo)}/cumulative`),
    getBeceMockAnalytics: () =>
      apiRequest('/api/v1/academic/bece/analytics'),
    getBeceCandidates: () =>
      apiRequest('/api/v1/academic/bece/candidates'),
    createBeceCandidate: (candidateData: any) =>
      apiRequest('/api/v1/academic/bece/candidates', {
        method: 'POST',
        body: JSON.stringify(candidateData),
      }),
    deleteBeceCandidate: (candidateId: string) =>
      apiRequest(`/api/v1/academic/bece/candidates/${encodeURIComponent(candidateId)}`, {
        method: 'DELETE',
      }),
    syncBeceCandidatesFromSis: (students: any[]) =>
      apiRequest('/api/v1/academic/bece/candidates/sync-sis', {
        method: 'POST',
        body: JSON.stringify(students),
      }),
    getBeceMockScores: (params?: { mock_series?: string; subject?: string; student_index?: string }) => {
      const q = new URLSearchParams();
      if (params?.mock_series) q.set('mock_series', params.mock_series);
      if (params?.subject) q.set('subject', params.subject);
      if (params?.student_index) q.set('student_index', params.student_index);
      const qs = q.toString();
      return apiRequest(`/api/v1/academic/bece/scores${qs ? `?${qs}` : ''}`);
    },
    recordBeceMockScore: (scoreData: any) =>
      apiRequest('/api/v1/academic/bece/scores', {
        method: 'POST',
        body: JSON.stringify(scoreData),
      }),
    getBeceMasterclasses: () =>
      apiRequest('/api/v1/academic/bece/masterclasses'),
    createBeceMasterclass: (classData: any) =>
      apiRequest('/api/v1/academic/bece/masterclasses', {
        method: 'POST',
        body: JSON.stringify(classData),
      }),
    deleteBeceMasterclass: (masterclassId: string) =>
      apiRequest(`/api/v1/academic/bece/masterclasses/${encodeURIComponent(masterclassId)}`, {
        method: 'DELETE',
      }),
    getAtRiskStudents: (classGrade?: string) =>
      apiRequest(`/api/v1/academic/remedial/at-risk${classGrade ? `?class_grade=${encodeURIComponent(classGrade)}` : ''}`),
    logRemedialSession: (sessionData: any) =>
      apiRequest('/api/v1/academic/remedial/session', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      }),
    logBehavior: (behaviorData: any) =>
      apiRequest('/api/v1/academic/behavior/log', {
        method: 'POST',
        body: JSON.stringify(behaviorData),
      }),
    getSubjects: (params?: { level_category?: string; department?: string; is_core?: boolean; is_active?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.level_category) q.set('level_category', params.level_category);
      if (params?.department) q.set('department', params.department);
      if (params?.is_core !== undefined) q.set('is_core', String(params.is_core));
      if (params?.is_active !== undefined) q.set('is_active', String(params.is_active));
      const qs = q.toString();
      return apiRequest(`/api/v1/academic/subjects${qs ? `?${qs}` : ''}`);
    },
    getSubjectById: (id: string) =>
      apiRequest(`/api/v1/academic/subjects/${id}`),
    createSubject: (subjectData: {
      code: string;
      name: string;
      department?: string;
      level_categories?: string;
      is_core?: boolean;
      weekly_periods?: number;
      default_room_type?: string;
      description?: string;
      is_active?: boolean;
    }) =>
      apiRequest('/api/v1/academic/subjects', {
        method: 'POST',
        body: JSON.stringify(subjectData),
      }),
    updateSubject: (id: string, subjectData: Partial<{
      code: string;
      name: string;
      department: string;
      level_categories: string;
      is_core: boolean;
      weekly_periods: number;
      default_room_type: string;
      description: string;
      is_active: boolean;
    }>) =>
      apiRequest(`/api/v1/academic/subjects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(subjectData),
      }),
    deleteSubject: (id: string) =>
      apiRequest(`/api/v1/academic/subjects/${id}`, {
        method: 'DELETE',
      }),
    getLessonSchemes: (params?: { class_grade?: string; teacher_name?: string; status?: string; subject?: string; week?: string }) => {
      const q = new URLSearchParams();
      if (params?.class_grade) q.set('class_grade', params.class_grade);
      if (params?.teacher_name) q.set('teacher_name', params.teacher_name);
      if (params?.status && params.status !== 'All') q.set('status', params.status);
      if (params?.subject) q.set('subject', params.subject);
      if (params?.week) q.set('week', params.week);
      const qs = q.toString();
      return apiRequest(`/api/v1/academic/schemes${qs ? `?${qs}` : ''}`);
    },
    getLessonSchemeById: (id: string) =>
      apiRequest(`/api/v1/academic/schemes/${id}`),
    createLessonScheme: (schemeData: {
      teacher_id?: string;
      teacher_name: string;
      class_grade: string;
      subject: string;
      week?: string;
      strand: string;
      sub_strand: string;
      tlr?: string;
      objectives?: string;
      starter?: string;
      main_activity?: string;
      main_duration?: number;
      plenary?: string;
      plenary_duration?: number;
      differentiation?: string;
    }) =>
      apiRequest('/api/v1/academic/schemes', {
        method: 'POST',
        body: JSON.stringify(schemeData),
      }),
    vetLessonScheme: (schemeId: string, vetData: {
      status: 'Approved' | 'Revision Requested';
      headmaster_notes?: string;
      vetted_by?: string;
    }) =>
      apiRequest(`/api/v1/academic/schemes/${schemeId}/vet`, {
        method: 'PATCH',
        body: JSON.stringify(vetData),
      }),
    deleteLessonScheme: (schemeId: string) =>
      apiRequest(`/api/v1/academic/schemes/${schemeId}`, {
        method: 'DELETE',
      }),
    getAppraisals: () =>
      apiRequest('/api/v1/academic/appraisals'),
    getTeacherAppraisal: (teacherIdOrName: string) =>
      apiRequest(`/api/v1/academic/appraisals/teacher/${encodeURIComponent(teacherIdOrName)}`),
    evaluateTeacher: (data: any) =>
      apiRequest('/api/v1/academic/appraisals/evaluate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    scheduleTeacherWalkthrough: (data: any) =>
      apiRequest('/api/v1/academic/appraisals/schedule-walkthrough', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    issueCommendations: () =>
      apiRequest('/api/v1/academic/appraisals/commendations', {
        method: 'POST',
      }),
    calendar: {
      getCurrentState: () => apiRequest('/api/v1/academic/calendar/current'),
      getYears: () => apiRequest('/api/v1/academic/calendar/years'),
      createYear: (data: { name: string; start_date: string; end_date: string }) => 
        apiRequest('/api/v1/academic/calendar/years', { method: 'POST', body: JSON.stringify(data) }),
      getTerms: (yearId?: string) => 
        apiRequest(`/api/v1/academic/calendar/terms${yearId ? `?year_id=${yearId}` : ''}`),
      createTerm: (data: { academic_year_id: string; name: string; start_date: string; end_date: string }) => 
        apiRequest('/api/v1/academic/calendar/terms', { method: 'POST', body: JSON.stringify(data) }),
      getEvents: (termId?: string) => 
        apiRequest(`/api/v1/academic/calendar/events${termId ? `?term_id=${termId}` : ''}`),
      createEvent: (data: { academic_term_id?: string; title: string; start_date: string; end_date: string; event_type: string; description?: string }) => 
        apiRequest('/api/v1/academic/calendar/events', { method: 'POST', body: JSON.stringify(data) }),
    },
    caTracker: {
      getAssessments: (classGrade: string, subject: string) =>
        apiRequest(`/api/v1/academic/ca-tracker/assessments?class_grade=${encodeURIComponent(classGrade)}&subject=${encodeURIComponent(subject)}`),
      getAssessmentScores: (assessmentId: string) =>
        apiRequest(`/api/v1/academic/ca-tracker/assessments/${encodeURIComponent(assessmentId)}/scores`),
      createAssessment: (data: { title: string; class_grade: string; subject: string; category: string; max_score: number }) =>
        apiRequest('/api/v1/academic/ca-tracker/assessments', { method: 'POST', body: JSON.stringify(data) }),
      saveAssessmentScores: (assessmentId: string, scores: Array<{ student_index_no: string; score: number }>) =>
        apiRequest(`/api/v1/academic/ca-tracker/assessments/${encodeURIComponent(assessmentId)}/scores`, {
          method: 'POST',
          body: JSON.stringify({ scores }),
        }),
    },
  },

  // 3. SIS & Admissions (Port 8083 via Gateway)
  sis: {
    getClasses: (params?: { level?: string }) => {
      const q = params?.level ? `?level=${encodeURIComponent(params.level)}` : '';
      return apiRequest(`/api/v1/sis/classes${q}`);
    },
    getClassById: (classId: string) =>
      apiRequest(`/api/v1/sis/classes/${classId}`),
    createClass: (classData: {
      code: string;
      name: string;
      level_category?: string;
      stage: string;
      stream_name: string;
      class_teacher_name?: string;
      room_number?: string;
      capacity?: number;
      base_tuition_fee?: number;
    }) =>
      apiRequest('/api/v1/sis/classes', {
        method: 'POST',
        body: JSON.stringify(classData),
      }),
    updateClass: (classId: string, classData: any) =>
      apiRequest(`/api/v1/sis/classes/${classId}`, {
        method: 'PUT',
        body: JSON.stringify(classData),
      }),
    deleteClass: (classId: string, options?: { reassign_to_class_id?: string; force_archive?: boolean }) => {
      const params = new URLSearchParams();
      if (options?.reassign_to_class_id) params.append('reassign_to_class_id', options.reassign_to_class_id);
      if (options?.force_archive) params.append('force_archive', 'true');
      const q = params.toString() ? `?${params.toString()}` : '';
      return apiRequest(`/api/v1/sis/classes/${classId}${q}`, {
        method: 'DELETE',
      });
    },
    getStudents: (params?: { search?: string; class_grade?: string; house?: string; fee_status?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return apiRequest(`/api/v1/sis/students?${q}`);
    },
    getStudentDossier: (studentId: string) =>
      apiRequest(`/api/v1/sis/students/${studentId}`),
    submitAdmission: (applicationData: any) =>
      apiRequest('/api/v1/sis/admissions/apply', {
        method: 'POST',
        body: JSON.stringify(applicationData),
      }),
    getAdmissions: () =>
      apiRequest('/api/v1/sis/admissions'),
    updateAdmissionStatus: (appId: string, statusData: { status: string; score?: number; review_notes?: string }) =>
      apiRequest(`/api/v1/sis/admissions/${appId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(statusData),
      }),
    approveAdmission: (appId: string) =>
      apiRequest(`/api/v1/sis/admissions/${appId}/approve`, {
        method: 'PATCH',
      }),
    deleteAdmission: (appId: string) =>
      apiRequest(`/api/v1/sis/admissions/${appId}`, {
        method: 'DELETE',
      }),
    deleteAllAdmissions: () =>
      apiRequest('/api/v1/sis/admissions', {
        method: 'DELETE',
      }),
    createStudent: (studentData: any) =>
      apiRequest('/api/v1/sis/students', {
        method: 'POST',
        body: JSON.stringify(studentData),
      }),
    enrollStudent: (studentData: any) =>
      apiRequest('/api/v1/sis/students', {
        method: 'POST',
        body: JSON.stringify(studentData),
      }),
    bulkEnrollStudents: async (students: any[]) => {
      const formatted = students.map((s) => {
        const fullName = (s.fullName || s.full_name || `${s.firstName || s.first_name || ''} ${s.lastName || s.last_name || ''}`).trim();
        const classGrade = (s.class_grade || s.classGrade || s.className || '').trim();
        const parentName = (s.parent_name || s.parentName || '').trim();
        const parentPhone = (s.parent_phone || s.parentPhone || s.emergency_phone || s.emergencyPhone || '').trim();
        const parentEmail = (s.parent_email || s.parentEmail || '').trim() || undefined;
        const dob = s.date_of_birth || s.dateOfBirth || s.dob;
        const house = s.house;
        const gender = s.gender;
        const address = (s.residential_address || s.residentialAddress || s.address || '').trim() || undefined;
        const emergencyPhone = (s.emergency_phone || s.emergencyPhone || parentPhone).trim();

        const enrollmentDate = s.enrollment_date || s.enrollmentDate;
        const entryClass = s.entry_class || s.entryClass || classGrade;
        const admissionNo = s.admission_no || s.admissionNo || s.admissionNumber || s.index_no || s.indexNo;
        const histAvg = s.historical_avg_score !== undefined ? Number(s.historical_avg_score) : (s.avg_score ? Number(s.avg_score) : undefined);
        const histAtt = s.historical_attendance_pct !== undefined ? Number(s.historical_attendance_pct) : (s.attendance_pct ? Number(s.attendance_pct) : undefined);
        const allergy = s.allergy_flag || s.medical_allergies || s.allergies;

        return {
          full_name: fullName,
          fullName: fullName,
          firstName: s.firstName || s.first_name,
          lastName: s.lastName || s.last_name,
          otherNames: s.otherNames,
          gender: gender,
          class_grade: classGrade,
          classGrade: classGrade,
          className: classGrade,
          house: house,
          date_of_birth: dob,
          dateOfBirth: dob,
          dob: dob,
          enrollment_date: enrollmentDate,
          enrollmentDate: enrollmentDate,
          entry_class: entryClass,
          entryClass: entryClass,
          admission_no: admissionNo,
          admissionNo: admissionNo,
          historical_avg_score: histAvg,
          historicalAvgScore: histAvg,
          historical_attendance_pct: histAtt,
          historicalAttendancePct: histAtt,
          allergy_flag: allergy,
          parent_name: parentName,
          parentName: parentName,
          parent_phone: parentPhone,
          parentPhone: parentPhone,
          parent_email: parentEmail,
          parentEmail: parentEmail,
          residential_address: address,
          residentialAddress: address,
          address: address,
          emergency_phone: emergencyPhone,
          emergencyPhone: emergencyPhone,
          auto_generate_invoice: s.autoGenerateInvoice,
          auto_provision_parent: s.autoProvisionParent,
        };
      });

      try {
        return await apiRequest('/api/v1/sis/students/bulk', {
          method: 'POST',
          body: JSON.stringify({ students: formatted }),
        });
      } catch (bulkErr: any) {
        console.warn('Bulk endpoint failed, falling back to concurrent single student enrollment:', bulkErr);
        const results = await Promise.allSettled(
          formatted.map((st) =>
            apiRequest('/api/v1/sis/students', {
              method: 'POST',
              body: JSON.stringify(st),
            })
          )
        );
        const successful = results.filter((r) => r.status === 'fulfilled').map((r: any) => r.value);
        const rejected = results.filter((r) => r.status === 'rejected');
        if (successful.length === 0 && rejected.length > 0) {
          const firstErr: any = (rejected[0] as PromiseRejectedResult).reason;
          throw new Error(firstErr?.message || 'Failed to enroll scholars');
        }
        return { count: successful.length, students: successful };
      }
    },
    updateStudent: (studentId: string, studentData: any) =>
      apiRequest(`/api/v1/sis/students/${studentId}`, {
        method: 'PUT',
        body: JSON.stringify(studentData),
      }),
    deleteStudent: (studentId: string) =>
      apiRequest(`/api/v1/sis/students/${studentId}`, {
        method: 'DELETE',
      }),
    batchPromoteStudents: (payload: { source_cohort: string; target_session: string; candidates: any[] }) =>
      apiRequest('/api/v1/sis/students/batch-promote', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateFeeStatus: (studentId: string, status: string) =>
      apiRequest(`/api/v1/sis/students/${studentId}/fee-status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    getDailyAttendance: (classGrade: string, rollDate?: string) =>
      apiRequest(`/api/v1/sis/attendance/daily?class_grade=${encodeURIComponent(classGrade)}${rollDate ? `&roll_date=${rollDate}` : ''}`),
    submitRollCall: (submission: any) =>
      apiRequest('/api/v1/sis/attendance/batch', {
        method: 'POST',
        body: JSON.stringify(submission),
      }),
  },

  // 4. Finance & Cashless Bursary (Port 8084 via Gateway)
  finance: {
    getInvoices: (studentIndex?: string) =>
      apiRequest(`/api/v1/finance/invoices${studentIndex ? `?studentIndex=${studentIndex}` : ''}`),
    getTransactions: (studentIndex?: string) =>
      apiRequest(`/api/v1/finance/transactions${studentIndex ? `?studentIndex=${studentIndex}` : ''}`),
    getSummary: () =>
      apiRequest('/api/v1/finance/summary'),
    getLedgerSummary: () =>
      apiRequest('/api/v1/finance/summary'),
    createInvoice: (invoiceData: any) =>
      apiRequest('/api/v1/finance/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      }),
    generateBatchInvoices: (batchData: any) =>
      apiRequest('/api/v1/finance/invoices/generate-batch', {
        method: 'POST',
        body: JSON.stringify(batchData),
      }),
    checkoutMoMo: (paymentData: {
      studentIndexNo: string;
      payerName: string;
      payerPhone: string;
      network: 'MTN_MOMO' | 'TELECEL_CASH' | 'AT_MONEY' | 'GCB_BANK' | 'CASH' | string;
      amount: number;
      invoiceNo?: string;
    }) =>
      apiRequest('/api/v1/finance/checkout/momo', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      }),
    processMoMoCheckout: (paymentData: {
      studentIndexNo: string;
      payerName: string;
      payerPhone: string;
      network: 'MTN_MOMO' | 'TELECEL_CASH' | 'AT_MONEY' | 'GCB_BANK' | 'CASH' | string;
      amount: number;
      invoiceNo?: string;
    }) =>
      apiRequest('/api/v1/finance/checkout/momo', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      }),
  },

  // 5. CBT & Examination Simulator (Port 8085 via Gateway)
  cbt: {
    getExams: () => apiRequest('/api/v1/cbt/exams'),
    getExam: (examId: string) => apiRequest(`/api/v1/cbt/exams/${examId}`),
    createExam: (examData: {
      title: string;
      subject: string;
      classGrade: string;
      durationMinutes?: number;
      totalMarks?: number;
      passingScore?: number;
      questions?: any[];
    }) =>
      apiRequest('/api/v1/cbt/exams', {
        method: 'POST',
        body: JSON.stringify(examData),
      }),
    submitExam: (submission: {
      examId: string;
      studentIndexNo: string;
      studentName: string;
      workstationId?: string;
      answers: Record<number, number>;
    }) =>
      apiRequest('/api/v1/cbt/submit', {
        method: 'POST',
        body: JSON.stringify(submission),
      }),
    getProctorNodes: () => apiRequest('/api/v1/cbt/proctor/nodes'),
    sendProctorCommand: (
      cmdOrObj: string | { command: string; workstationId: string; payload?: any },
      workstationId?: string,
      payload?: any
    ) => {
      if (typeof cmdOrObj === 'object') {
        return apiRequest('/api/v1/cbt/proctor/command', {
          method: 'POST',
          body: JSON.stringify(cmdOrObj),
        });
      }
      return apiRequest('/api/v1/cbt/proctor/command', {
        method: 'POST',
        body: JSON.stringify({ command: cmdOrObj, workstationId, payload }),
      });
    },
    getCbtWsUrl: (role: 'proctor' | 'candidate', workstationId?: string) => {
      const explicitWs = process.env.NEXT_PUBLIC_WS_URL;
      if (explicitWs) {
        return `${explicitWs.replace(/\/$/, '')}/ws/cbt/stream?role=${role}${workstationId ? `&workstationId=${workstationId}` : ''}`;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (apiUrl) {
        try {
          const parsed = new URL(apiUrl);
          const proto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
          return `${proto}//${parsed.host}/ws/cbt/stream?role=${role}${workstationId ? `&workstationId=${workstationId}` : ''}`;
        } catch {
          // fallback to browser location
        }
      }

      const wsProto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8000';
      return `${wsProto}//${host}/ws/cbt/stream?role=${role}${workstationId ? `&workstationId=${workstationId}` : ''}`;
    },
  },

  // 6. Operations & Logistics (Port 8086 via Gateway)
  operations: {
    getStaffDirectory: () => apiRequest('/api/v1/operations/staff'),
    getInspections: () => apiRequest('/api/v1/operations/inspections'),
    logInspection: (data: any) =>
      apiRequest('/api/v1/operations/inspections', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getBusRoutes: () => apiRequest('/api/v1/operations/transport/routes'),
    getClinicVisits: () => apiRequest('/api/v1/operations/clinic/visits'),
  },

  // 7. Notification & Communications Hub (Port 8087 via Gateway)
  notify: {
    sendSms: (
      phoneOrData: string | { to?: string; phone?: string; message: string },
      messageText?: string
    ) => {
      let phone = '';
      let msg = '';
      if (typeof phoneOrData === 'object') {
        phone = phoneOrData.phone || phoneOrData.to || '';
        msg = phoneOrData.message || '';
      } else {
        phone = phoneOrData;
        msg = messageText || '';
      }
      return apiRequest('/api/v1/notify/sms/send', {
        method: 'POST',
        body: JSON.stringify({ phone, message: msg }),
      });
    },
    broadcastNotice: (data: { targetGroup: string; title: string; message: string }) =>
      apiRequest('/api/v1/notify/broadcast', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    sendBroadcast: (data: { targetGroup: string; title: string; message: string }) =>
      apiRequest('/api/v1/notify/broadcast', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getLogs: () => apiRequest('/api/v1/notify/logs'),
  },

  // 8. Public CMS & Admissions Engine (Port 8088 via Gateway)
  cms: {
    getLandingContent: async () => {
      const now = Date.now();
      if (cmsLandingCache && cmsLandingCache.expiresAt > now) {
        return cmsLandingCache.data;
      }
      if (cmsLandingInFlight) {
        return cmsLandingInFlight;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 500);
      cmsLandingInFlight = apiRequest('/api/v1/cms/landing', {
        signal: controller.signal,
        next: { revalidate: 60 },
      } as RequestInit)
        .then((res) => {
          cmsLandingCache = { data: res, expiresAt: Date.now() + 60000 };
          return res;
        })
        .catch((err) => {
          cmsLandingCache = { data: null, expiresAt: Date.now() + 30000 };
          throw err;
        })
        .finally(() => {
          clearTimeout(timeout);
          cmsLandingInFlight = null;
        });
      return cmsLandingInFlight;
    },
    getCalendar: () => apiRequest('/api/v1/cms/calendar'),
    getNews: () => apiRequest('/api/v1/cms/news'),
    getGallery: () => apiRequest('/api/v1/cms/gallery'),
    getDownloads: () => apiRequest('/api/v1/cms/downloads'),
    submitInquiry: (inquiry: any) =>
      apiRequest('/api/v1/cms/inquire', {
        method: 'POST',
        body: JSON.stringify(inquiry),
      }),
  },

  // 9. Dedicated PDF & Document Generation Service (Port 8089 via Gateway)
  pdf: {
    downloadReceipt: async (receiptData: any, filename?: string) => {
      return downloadPdfStream('/api/v1/pdf/render/receipt', receiptData, filename || `Receipt_${receiptData.receiptNumber || 'Official'}.pdf`);
    },
    downloadReportCard: async (reportData: any, filename?: string) => {
      return downloadPdfStream('/api/v1/pdf/render/report-card', reportData, filename || `ReportCard_${reportData.studentName || 'Student'}_${reportData.term || 'Term'}.pdf`);
    },
    downloadAdmissionLetter: async (admissionData: any, filename?: string) => {
      return downloadPdfStream('/api/v1/pdf/render/admission-letter', admissionData, filename || `AdmissionLetter_${admissionData.studentName || 'Student'}.pdf`);
    },
    downloadTimetable: async (timetableData: any, filename?: string) => {
      return downloadPdfStream('/api/v1/pdf/render/timetable', timetableData, filename || `Timetable_${timetableData.classGrade || 'Class'}.pdf`);
    },
    queueBatchReportCards: (items: any[], jobTitle?: string) =>
      apiRequest('/api/v1/pdf/batch/report-cards', {
        method: 'POST',
        body: JSON.stringify({ items, jobTitle }),
      }),
    getBatchJobStatus: (jobId: string) =>
      apiRequest(`/api/v1/pdf/batch/jobs/${jobId}`),
  },

  // 10. HR & Payroll Engine (Port 8090 via Gateway)
  hr: {
    getStaff: () => apiRequest('/api/v1/hr/staff'),
    createStaff: (data: any) => apiRequest('/api/v1/hr/staff', { method: 'POST', body: JSON.stringify(data) }),
    updateStaff: (id: string, data: any) => apiRequest(`/api/v1/hr/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    generatePayroll: (monthYear: string) => apiRequest('/api/v1/hr/payroll/generate', { method: 'POST', body: JSON.stringify({ month_year: monthYear }) }),
    getPayroll: (monthYear?: string) => apiRequest(`/api/v1/hr/payroll${monthYear ? `?month_year=${monthYear}` : ''}`),
    createLeave: (data: any) => apiRequest('/api/v1/hr/leave', { method: 'POST', body: JSON.stringify(data) }),
    getLeave: (status?: string) => apiRequest(`/api/v1/hr/leave${status ? `?status=${status}` : ''}`),
    updateLeaveStatus: (id: string, status: string) => apiRequest(`/api/v1/hr/leave/${id}/status?status=${status}`, { method: 'PUT' }),
  },

  // 11. Teacher Copilot AI Service (Port 8082 via Gateway)
  ai: {
    generateLessonScheme: (data: { subject: string; week: string; strand: string; sub_strand: string }) =>
      apiRequest('/api/v1/ai/generate-lesson-scheme', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};

export async function downloadPdfStream(
  endpoint: string,
  payload: any,
  defaultFilename: string = 'document.pdf'
): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('roseland_token') : null;
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.detail || 'Failed to generate PDF document');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

