"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import Modal from '@/components/ui/Modal';

interface AttendanceSummary {
  total_enrolled: number;
  total_marked: number;
  present_count: number;
  late_count: number;
  absent_count: number;
  excused_count: number;
  attendance_rate: number;
  classes_total: number;
  classes_submitted: number;
  classes_pending: number;
}

interface ClassMatrixItem {
  class_grade: string;
  form_master: string;
  is_submitted: boolean;
  submitted_at?: string | null;
  recorded_by?: string | null;
  total_marked: number;
  present_count: number;
  late_count: number;
  absent_count: number;
  attendance_rate: number;
}

interface AttendanceRecordItem {
  id: string;
  student_id: string;
  index_no: string;
  student_name: string;
  class_grade: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  remarks?: string;
  recorded_by: string;
  recorded_at: string;
  parent_name: string;
  parent_phone: string;
  avatar?: string;
}

export default function HeadmasterDailyAttendancePage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AttendanceSummary>({
    total_enrolled: 0,
    total_marked: 0,
    present_count: 0,
    late_count: 0,
    absent_count: 0,
    excused_count: 0,
    attendance_rate: 0,
    classes_total: 0,
    classes_submitted: 0,
    classes_pending: 0,
  });
  const [classMatrix, setClassMatrix] = useState<ClassMatrixItem[]>([]);
  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);

  // Filtering states
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'ABSENT' | 'LATE' | 'PRESENT'>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Absence SMS modal / dispatch state
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [selectedAbsentScholar, setSelectedAbsentScholar] = useState<AttendanceRecordItem | null>(null);
  const [smsCustomMessage, setSmsCustomMessage] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [dispatchedSmsMap, setDispatchedSmsMap] = useState<Record<string, boolean>>({});

  // Fetch Attendance logs for selectedDate
  const loadAttendanceLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await RoselandApi.sis.getAttendanceLogs({
        rollDate: selectedDate,
      });

      if (res) {
        if (res.summary) {
          setSummary(res.summary);
        }
        if (Array.isArray(res.class_matrix)) {
          setClassMatrix(res.class_matrix);
        }
        if (Array.isArray(res.records)) {
          setRecords(res.records);
        }
      }
    } catch (err: any) {
      console.warn("Failed to load daily attendance logs:", err);
      toast.error("Could not fetch daily attendance logs.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadAttendanceLogs();
  }, [loadAttendanceLogs]);

  // Date jump helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleJumpToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Unique classes for filter dropdown
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    classMatrix.forEach((c) => set.add(c.class_grade));
    records.forEach((r) => set.add(r.class_grade));
    return Array.from(set).sort();
  }, [classMatrix, records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Status tab
      if (selectedTab === 'ABSENT' && r.status !== 'absent') return false;
      if (selectedTab === 'LATE' && r.status !== 'late') return false;
      if (selectedTab === 'PRESENT' && r.status !== 'present') return false;

      // 2. Class filter
      if (selectedClassFilter !== 'ALL' && r.class_grade !== selectedClassFilter) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.student_name.toLowerCase().includes(q);
        const matchesIndex = r.index_no.toLowerCase().includes(q);
        const matchesRemarks = (r.remarks || '').toLowerCase().includes(q);
        if (!matchesName && !matchesIndex && !matchesRemarks) return false;
      }

      return true;
    });
  }, [records, selectedTab, selectedClassFilter, searchQuery]);

  // Open SMS modal
  const openSmsModal = (scholar: AttendanceRecordItem) => {
    setSelectedAbsentScholar(scholar);
    const dateFormatted = new Date(selectedDate).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    setSmsCustomMessage(
      `The Roseland Preparatory School: Dear ${scholar.parent_name}, this is an official notification from the Headmaster's Office that ${scholar.student_name} (${scholar.class_grade}) was marked absent on ${dateFormatted}. If this absence was unexpected, please contact the administration immediately.`
    );
    setIsSmsModalOpen(true);
  };

  // Dispatch absence SMS
  const handleDispatchSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAbsentScholar) return;

    setIsSendingSms(true);
    try {
      const res = await RoselandApi.sis.sendAbsenceNotice({
        indexNo: selectedAbsentScholar.index_no,
        rollDate: selectedDate,
        customMessage: smsCustomMessage,
      });

      toast.success(`Absence alert dispatched to ${res?.parent_phone || selectedAbsentScholar.parent_phone}!`);
      setDispatchedSmsMap((prev) => ({ ...prev, [selectedAbsentScholar.index_no]: true }));
      setIsSmsModalOpen(false);
    } catch (err: any) {
      console.error("Failed to send absence SMS", err);
      toast.error(err?.message || "Failed to dispatch SMS notification.");
    } finally {
      setIsSendingSms(false);
    }
  };

  // Print roll register
  const handlePrint = () => {
    window.print();
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const formattedHeaderDate = new Date(selectedDate).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Executive Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 print:border-none print:shadow-none print:p-0">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            School-Wide Attendance & Roll Call Logs
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Daily Attendance Center
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1 flex items-center gap-2">
            <span>Roll Call Register for <strong>{formattedHeaderDate}</strong></span>
            {isToday && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                TODAY
              </span>
            )}
          </p>
        </div>

        {/* Date Selector & Print Actions (Hidden in Print) */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-white rounded-lg text-gray-600 hover:text-brand-textMain transition-all cursor-pointer"
              title="Previous Day"
            >
              <i className="ph-bold ph-caret-left"></i>
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 bg-transparent text-xs font-bold text-brand-textMain outline-none cursor-pointer"
            />
            <button
              onClick={handleNextDay}
              className="p-1.5 hover:bg-white rounded-lg text-gray-600 hover:text-brand-textMain transition-all cursor-pointer"
              title="Next Day"
            >
              <i className="ph-bold ph-caret-right"></i>
            </button>
          </div>

          {!isToday && (
            <button
              onClick={handleJumpToToday}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-brand-textMain font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Today
            </button>
          )}

          <button
            onClick={loadAttendanceLogs}
            className="p-2.5 bg-gray-50 hover:bg-gray-100 text-brand-textMain font-bold rounded-xl text-xs border border-gray-200 transition-all cursor-pointer"
            title="Refresh Logs"
          >
            <i className={`ph-bold ph-arrows-clockwise ${loading ? 'animate-spin' : ''}`}></i>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <i className="ph-bold ph-printer"></i> Print Register
          </button>
        </div>
      </div>

      {/* School-Wide Attendance KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        {/* Attendance Rate */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-violet">Attendance Rate</span>
            <span className="p-2 bg-purple-50 text-brand-violet rounded-xl text-lg">
              <i className="ph-fill ph-chart-pie-slice"></i>
            </span>
          </div>
          <p className={`text-2xl sm:text-3xl font-bold font-serif mt-2 ${
            summary.attendance_rate >= 90 ? 'text-emerald-600' : summary.attendance_rate >= 75 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {loading ? '...' : `${summary.attendance_rate}%`}
          </p>
          <span className="text-[11px] text-gray-500 font-medium">
            {summary.total_marked} of {summary.total_enrolled} enrolled
          </span>
        </div>

        {/* Present */}
        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Present</span>
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl text-lg">
              <i className="ph-fill ph-check-circle"></i>
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-serif text-emerald-800 mt-2">
            {loading ? '...' : summary.present_count}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Scholars on campus</span>
        </div>

        {/* Late Arrivals */}
        <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Late Arrivals</span>
            <span className="p-2 bg-amber-50 text-amber-700 rounded-xl text-lg">
              <i className="ph-fill ph-clock"></i>
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-serif text-amber-800 mt-2">
            {loading ? '...' : summary.late_count}
          </p>
          <span className="text-[11px] text-amber-600 font-medium">Arrived after morning bell</span>
        </div>

        {/* Absentees */}
        <div className="bg-white p-5 rounded-3xl border border-red-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">Absentees</span>
            <span className="p-2 bg-red-50 text-red-600 rounded-xl text-lg">
              <i className="ph-fill ph-x-circle"></i>
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-serif text-red-700 mt-2">
            {loading ? '...' : summary.absent_count}
          </p>
          <span className="text-[11px] text-red-600 font-medium">
            {summary.excused_count > 0 ? `${summary.excused_count} excused` : 'Unexcused absence'}
          </span>
        </div>

        {/* Class Submissions */}
        <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Roll Submissions</span>
            <span className="p-2 bg-blue-50 text-blue-700 rounded-xl text-lg">
              <i className="ph-fill ph-clipboard-text"></i>
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-serif text-blue-900 mt-2">
            {loading ? '...' : `${summary.classes_submitted}/${summary.classes_total}`}
          </p>
          <div className="w-full bg-blue-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all"
              style={{
                width: `${summary.classes_total > 0 ? (summary.classes_submitted / summary.classes_total) * 100 : 0}%`,
              }}
            ></div>
          </div>
        </div>

      </div>

      {/* Form Master Roll Submission Matrix */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-bold font-serif text-brand-textMain">
              Class Cohort Submission Matrix
            </h2>
            <p className="text-xs text-brand-textMuted">
              Live monitoring of Form Master daily roll call compliance across streams.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              {summary.classes_submitted} Submitted
            </span>
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              {summary.classes_pending} Pending
            </span>
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {classMatrix.map((c) => (
            <div
              key={c.class_grade}
              className={`p-4 rounded-2xl border transition-all ${
                c.is_submitted
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : 'bg-amber-50/40 border-amber-200 border-dashed'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-brand-textMain">{c.class_grade}</h3>
                  <span className="text-[11px] text-gray-500 block truncate max-w-[140px]">
                    {c.form_master}
                  </span>
                </div>
                {c.is_submitted ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-md flex items-center gap-1">
                    <i className="ph-bold ph-check text-[10px]"></i> Done
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-md flex items-center gap-1">
                    <i className="ph-bold ph-clock text-[10px]"></i> Pending
                  </span>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-gray-100/60 flex items-center justify-between text-[11px]">
                {c.is_submitted ? (
                  <>
                    <span className="text-gray-500 font-mono">
                      Rate: <strong className="text-emerald-700">{c.attendance_rate}%</strong>
                    </span>
                    <span className="text-gray-400 text-[10px]">
                      {c.submitted_at || 'Recorded'}
                    </span>
                  </>
                ) : (
                  <span className="text-amber-700 font-medium text-[10px]">
                    Awaiting Form Master submission
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Granular Student Attendance Register */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-6 border-b border-gray-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-serif text-brand-textMain">
                Daily Roll Register & Pupil Log
              </h2>
              <p className="text-xs text-brand-textMuted">
                Granular status of individual scholars with parent notification triggers.
              </p>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setSelectedTab('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedTab === 'ALL' ? 'bg-white text-brand-textMain shadow-sm' : 'text-gray-500 hover:text-brand-textMain'
                }`}
              >
                All Records ({records.length})
              </button>
              <button
                onClick={() => setSelectedTab('ABSENT')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedTab === 'ABSENT' ? 'bg-red-600 text-white shadow-sm' : 'text-red-700 hover:bg-red-50'
                }`}
              >
                Absentees ({summary.absent_count})
              </button>
              <button
                onClick={() => setSelectedTab('LATE')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedTab === 'LATE' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                Late ({summary.late_count})
              </button>
              <button
                onClick={() => setSelectedTab('PRESENT')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedTab === 'PRESENT' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Present ({summary.present_count})
              </button>
            </div>
          </div>

          {/* Search & Class Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <i className="ph ph-magnifying-glass absolute left-3 top-2.5 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Search pupil name, index..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-brand-bg border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-violet w-48 sm:w-64"
                />
              </div>

              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-3 py-2 bg-brand-bg border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-brand-violet"
              >
                <option value="ALL">All Class Cohorts</option>
                {availableClasses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <span className="text-xs text-brand-textMuted font-medium self-center sm:self-auto">
              Displaying <strong>{filteredRecords.length}</strong> pupil records
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-brand-bg text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 text-[10px]">
              <tr>
                <th className="py-4 px-6">Scholar & Class</th>
                <th className="py-4 px-4">Roll Status</th>
                <th className="py-4 px-4">Recorded By / Time</th>
                <th className="py-4 px-4">Form Remarks</th>
                <th className="py-4 px-4">Parent & Contact</th>
                <th className="py-4 px-6 text-right print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-brand-textMuted">
                    <i className="ph ph-spinner animate-spin text-2xl text-brand-violet block mb-2"></i>
                    Fetching roll records from SIS attendance ledger...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-brand-textMuted">
                    <i className="ph ph-calendar-x text-3xl text-gray-400 block mb-2"></i>
                    No attendance logs found matching the filter criteria for this date.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                    
                    {/* Scholar */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-brand-textMain font-bold text-xs flex items-center justify-center border border-gray-200 uppercase shrink-0">
                          {r.student_name ? r.student_name.charAt(0) : 'S'}
                        </div>
                        <div>
                          <strong className="text-sm font-bold text-brand-textMain block">{r.student_name}</strong>
                          <span className="font-mono text-[10px] text-gray-400">{r.index_no} • {r.class_grade}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4">
                      {r.status === 'present' && (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg text-[10px] flex items-center gap-1 w-fit">
                          <i className="ph-fill ph-circle text-[7px] text-emerald-600"></i> Present
                        </span>
                      )}
                      {r.status === 'late' && (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-800 font-bold rounded-lg text-[10px] flex items-center gap-1 w-fit">
                          <i className="ph-fill ph-circle text-[7px] text-amber-600"></i> Late Arrival
                        </span>
                      )}
                      {r.status === 'absent' && (
                        <span className="px-2.5 py-1 bg-red-100 text-red-800 font-bold rounded-lg text-[10px] flex items-center gap-1 w-fit">
                          <i className="ph-fill ph-circle text-[7px] text-red-600 animate-pulse"></i> Absent
                        </span>
                      )}
                      {r.status === 'excused' && (
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-800 font-bold rounded-lg text-[10px] flex items-center gap-1 w-fit">
                          <i className="ph-fill ph-circle text-[7px] text-blue-600"></i> Excused
                        </span>
                      )}
                    </td>

                    {/* Recorded By / Time */}
                    <td className="py-4 px-4">
                      <span className="font-medium text-brand-textMain block">{r.recorded_by}</span>
                      <span className="font-mono text-[10px] text-gray-400">{r.recorded_at}</span>
                    </td>

                    {/* Remarks */}
                    <td className="py-4 px-4 max-w-xs">
                      <span className="text-gray-600 italic block truncate">
                        {r.remarks || '—'}
                      </span>
                    </td>

                    {/* Parent Contact */}
                    <td className="py-4 px-4">
                      <span className="font-semibold text-brand-textMain block">{r.parent_name}</span>
                      <span className="font-mono text-[10px] text-gray-500">{r.parent_phone}</span>
                    </td>

                    {/* Action (SMS) */}
                    <td className="py-4 px-6 text-right print:hidden">
                      {r.status === 'absent' ? (
                        <button
                          onClick={() => openSmsModal(r)}
                          className="px-3 py-1.5 bg-brand-yellowLight hover:bg-brand-yellow text-yellow-950 font-bold rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1 ml-auto"
                          title="Dispatch Absence Notification SMS to Parent"
                        >
                          <i className="ph-bold ph-chat-text"></i>
                          {dispatchedSmsMap[r.index_no] ? 'Resend Notice' : 'Absence Notice'}
                        </button>
                      ) : (
                        <span className="text-gray-300 font-mono text-[11px]">—</span>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Absence SMS Modal */}
      <Modal
        isOpen={isSmsModalOpen}
        onClose={() => setIsSmsModalOpen(false)}
        title={selectedAbsentScholar ? `Absence Alert: ${selectedAbsentScholar.student_name}` : "Dispatch Absence Notice"}
        subtitle="Direct SMS Notification from the Headmaster's Office"
        size="md"
      >
        <form onSubmit={handleDispatchSms} className="space-y-4 text-xs pt-2">
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <i className="ph-bold ph-info"></i>
              Recipient Parent / Guardian:
            </p>
            <p className="font-mono text-[11px]">
              {selectedAbsentScholar?.parent_name} • {selectedAbsentScholar?.parent_phone}
            </p>
          </div>

          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">
              SMS Message Text
            </label>
            <textarea
              rows={4}
              value={smsCustomMessage}
              onChange={(e) => setSmsCustomMessage(e.target.value)}
              required
              className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet text-xs resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsSmsModalOpen(false)}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-brand-textMain font-bold rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSendingSms}
              className="px-5 py-2.5 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSendingSms ? (
                <>
                  <i className="ph ph-spinner animate-spin"></i> Dispatching SMS...
                </>
              ) : (
                <>
                  <i className="ph-bold ph-paper-plane-tilt"></i> Send Absence SMS
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
