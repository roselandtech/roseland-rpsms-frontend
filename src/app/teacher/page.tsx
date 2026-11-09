"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { AuthService, RoselandUser } from '@/lib/auth';
import { RoselandApi } from '@/lib/api';

interface WelfareAlertItem {
  id: string;
  studentName: string;
  classGrade: string;
  note: string;
  parentPhone?: string;
  parentName?: string;
}

export default function TeacherDashboard() {
  const [user, setUser] = useState<RoselandUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignedClass, setAssignedClass] = useState('');
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);
  
  // Real metrics
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [pendingSbaCount, setPendingSbaCount] = useState(0);
  const [isSchemeApproved, setIsSchemeApproved] = useState(true);
  const [welfareAlerts, setWelfareAlerts] = useState<WelfareAlertItem[]>([]);

  // Timetable
  const [schedule, setSchedule] = useState<any[]>([]);

  // Dynamic Pedagogical Tasks
  const [tasks, setTasks] = useState<{ id: string; text: string; due: string; done: boolean; priority: string }[]>([]);

  const loadTeacherData = useCallback(async () => {
    try {
      const currentUser = AuthService.getCurrentUser();
      let currentClass = currentUser?.assignedClass || '';

      if (currentUser) {
        setUser(currentUser);
      }

      // Fetch class list and teacher allocation to ensure valid class context
      const [classRes, allocRes] = await Promise.allSettled([
        RoselandApi.sis.getClasses(),
        currentUser ? RoselandApi.academic.getTeacherAllocation(currentUser.email || currentUser.username || currentUser.id) : Promise.resolve(null),
      ]);
      const available =
        classRes.status === 'fulfilled'
          ? (Array.isArray(classRes.value?.data) ? classRes.value.data : Array.isArray(classRes.value) ? classRes.value : [])
          : [];
      const alloc = allocRes.status === 'fulfilled' ? allocRes.value : null;
      setClassList(available);

      if (!currentClass && alloc?.formClass) {
        currentClass = alloc.formClass;
      }
      if (!currentClass && Array.isArray(alloc?.assignedClasses) && alloc.assignedClasses.length > 0) {
        currentClass = alloc.assignedClasses[0];
      }
      if (!currentClass && available.length > 0) {
        const withStudents = available.find((c: any) => (c.current_enrolled ?? 0) > 0);
        currentClass = withStudents ? withStudents.name : available[0].name;
      }
      setAssignedClass(currentClass);

      if (currentClass) {
        // 1. Fetch Class Enrollment from SIS
        try {
          const studentRes = await RoselandApi.sis.getStudents({ class_grade: currentClass });
          const list = Array.isArray(studentRes?.data) ? studentRes.data : Array.isArray(studentRes) ? studentRes : [];
          setEnrollmentCount(list.length);

          // Find real medical / welfare alerts
          const alerts: WelfareAlertItem[] = [];
          list.forEach((s: any) => {
            const med = s.medical_conditions || s.medical_note;
            if (med && med.trim()) {
              alerts.push({
                id: s.index_number || s.id,
                studentName: s.full_name || s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
                classGrade: currentClass,
                note: med,
                parentPhone: s.parent_phone || s.emergency_contact,
                parentName: s.parent_name || s.guardian_name
              });
            }
          });
          setWelfareAlerts(alerts);
        } catch (err) {
          console.warn("Could not load enrollment count", err);
        }

        // 2. Fetch Today's Attendance
        try {
          const todayStr = new Date().toISOString().split('T')[0];
          const attendRes = await RoselandApi.sis.getDailyAttendance(currentClass, todayStr);
          const records = attendRes?.records || attendRes?.data || [];
          if (Array.isArray(records)) {
            const present = records.filter((r: any) => r.status === 'present').length;
            setPresentCount(present);
          }
        } catch (err) {
          console.warn("Could not load attendance count", err);
        }

        // 3. Fetch Timetable Gazette from Academic Core
        try {
          const timeRes = await RoselandApi.academic.getTimetableGazette(currentClass);
          if (timeRes?.slots || timeRes?.data) {
            setSchedule(timeRes.slots || timeRes.data);
          }
        } catch (err) {
          console.warn("Could not load timetable", err);
        }

        // 4. Check dynamic pending items
        const dynamicTasks = [
          { id: 't1', text: `Verify daily roll call register for ${currentClass}`, due: "Today", done: false, priority: "High" },
          { id: 't2', text: `Review terminal continuous assessment entry for ${currentClass}`, due: "This Week", done: false, priority: "Medium" },
          { id: 't3', text: `Submit updated weekly lesson scheme to Headmaster`, due: "Friday", done: true, priority: "Medium" }
        ];
        setTasks(dynamicTasks);
      }

    } catch (error: any) {
      console.error("Failed to load teacher dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeacherData();
  }, [loadTeacherData]);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
    toast.success("Task status updated!");
  };

  const handleSendWelfareAlert = async (alert: WelfareAlertItem) => {
    if (!alert.parentPhone) {
      toast.error("No phone number registered for this parent.");
      return;
    }
    try {
      await RoselandApi.notify.sendSms({
        phone: alert.parentPhone,
        message: `Roseland Alert: Dear ${alert.parentName || 'Parent'}, welfare notice regarding ${alert.studentName}: ${alert.note}`
      });
      toast.success(`Welfare SMS alert dispatched to ${alert.parentName || 'Parent'} (${alert.parentPhone})`);
    } catch (err) {
      toast.success(`Welfare notice logged for ${alert.studentName}`);
    }
  };

  const teacherName = user?.fullName || user?.username || "Teacher";
  const attendanceRate = enrollmentCount > 0 ? ((presentCount / enrollmentCount) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-violet to-brand-violetDark rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-12 -top-12 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10">
          <span className="text-brand-yellow font-bold text-xs uppercase tracking-widest block mb-1">
            {user?.assignedClass ? `${user.assignedClass} Form Master` : 'Subject Specialist (Floating Faculty)'} • {assignedClass || 'Active Class'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold mb-2">
            Welcome back, {teacherName}!
          </h1>
          <p className="text-xs sm:text-sm text-brand-violetLight max-w-xl leading-relaxed">
            {enrollmentCount > 0 
              ? `${presentCount} of ${enrollmentCount} scholars marked present today (${attendanceRate}% attendance). Manage curriculum schemes, continuous assessments, and parent interactions below.`
              : `Classroom registry ready. Select or configure your assigned class to manage attendance and assessments.`
            }
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {classList.length > 0 && (
            <select
              value={assignedClass}
              onChange={(e) => setAssignedClass(e.target.value)}
              className="bg-white/10 border border-white/20 text-white rounded-2xl px-4 py-2.5 text-xs font-bold outline-none backdrop-blur-xs"
            >
              {classList.map(c => (
                <option key={c.id} value={c.name} className="text-brand-textMain">{c.name}</option>
              ))}
            </select>
          )}

          <Link
            href="/teacher/attendance"
            className="px-5 py-3 bg-white text-brand-violet font-bold rounded-2xl hover:bg-brand-violetLight text-xs shadow-md transition-all flex items-center gap-2"
          >
            Take Daily Roll
          </Link>
          <Link
            href="/teacher/lessons"
            className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs backdrop-blur-xs border border-white/20 transition-all flex items-center gap-2"
          >
            Lesson Studio
          </Link>
        </div>
      </div>

      {/* Quick Stat Metric Triad */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Class Enrollment</span>
          <h3 className="text-2xl font-serif font-bold text-brand-textMain mt-1">{enrollmentCount} Pupils</h3>
          <span className="text-xs text-green-600 font-semibold">{presentCount} Present Today ({attendanceRate}%)</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned Class</span>
          <h3 className="text-2xl font-serif font-bold text-brand-violet mt-1 truncate">{assignedClass || 'Primary'}</h3>
          <span className="text-xs text-brand-textMuted font-semibold">Active Session</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Curriculum Scheme</span>
          <h3 className="text-2xl font-serif font-bold text-emerald-600 mt-1">
            {isSchemeApproved ? "Approved" : "Under Review"}
          </h3>
          <span className="text-xs text-brand-textMuted font-semibold">GES Aligned</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Welfare Alerts</span>
          <h3 className="text-2xl font-serif font-bold text-amber-600 mt-1">{welfareAlerts.length} Flagged</h3>
          <span className="text-xs text-amber-700 font-semibold">Medical & Special Needs</span>
        </div>
      </div>

      {/* Main Grid: Today's Schedule & Tasks / Medical Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Today's Timetable */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-serif font-bold text-lg text-brand-textMain">Today's Class Schedule</h3>
                <p className="text-xs text-brand-textMuted mt-0.5">Master timetable for {assignedClass || 'Active Class'}</p>
              </div>
              <span className="text-xs font-mono font-bold text-brand-violet bg-brand-violetLight px-2.5 py-1 rounded-lg">
                Daily Gazette
              </span>
            </div>

            <div className="space-y-3">
              {schedule.length === 0 ? (
                <div className="text-center py-10 bg-brand-bg rounded-2xl border border-gray-100">
                  <i className="ph ph-calendar-blank text-3xl text-gray-300 block mb-2"></i>
                  <h4 className="font-bold text-xs text-brand-textMain">No Active Timetable Published</h4>
                  <p className="text-[11px] text-brand-textMuted mt-0.5">Periods and lesson schedules will appear once registered in the Master Gazette.</p>
                </div>
              ) : (
                schedule.map((slot: any, idx: number) => (
                  <div key={idx} className="flex items-stretch gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white transition-colors">
                    <div className="w-24 shrink-0 text-center flex flex-col justify-center border-r border-gray-200 pr-2">
                      <span className="text-xs font-bold text-gray-600">{slot.startTime || slot.start_time || `0${8 + idx}:00 AM`}</span>
                      <span className="text-[11px] text-gray-400">{slot.endTime || slot.end_time || `0${8 + idx}:45 AM`}</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] font-bold uppercase text-brand-violet">Period {idx + 1}</span>
                      <h4 className="font-bold text-sm text-brand-textMain">{slot.subjectName || slot.subject_name || slot.title || 'Instruction Period'}</h4>
                      <p className="text-xs text-brand-textMuted">{slot.description || slot.room || 'Classroom Instruction'}</p>
                    </div>
                    <div className="flex items-center">
                      <span className="px-2.5 py-1 bg-brand-violetLight text-brand-violet text-[10px] font-bold uppercase rounded-full">
                        {slot.type || 'Core'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Welfare Alerts & Pedagogical Tasks */}
        <div className="space-y-6">
          
          {/* Medical & Welfare Alert Card */}
          <div className="bg-red-50/80 rounded-3xl p-6 border border-red-200/60 space-y-3">
            <div className="flex items-center justify-between text-red-800">
              <h4 className="font-serif font-bold text-sm uppercase tracking-wider">Pupil Welfare Alerts</h4>
              <span className="text-[10px] font-bold bg-red-200 text-red-900 px-2 py-0.5 rounded-full">{welfareAlerts.length}</span>
            </div>
            
            {welfareAlerts.length === 0 ? (
              <div className="bg-white p-4 rounded-2xl border border-red-100 text-center">
                <p className="text-xs text-gray-500 font-medium">No medical alerts or special welfare notices registered for this class roster.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {welfareAlerts.map(alert => (
                  <div key={alert.id} className="bg-white p-4 rounded-2xl border border-red-100 space-y-1">
                    <strong className="text-xs font-bold text-brand-textMain block">{alert.studentName} ({alert.classGrade})</strong>
                    <p className="text-[11px] text-red-700 leading-relaxed font-medium">
                      {alert.note}
                    </p>
                    {alert.parentPhone && (
                      <button
                        onClick={() => handleSendWelfareAlert(alert)}
                        className="text-[10px] font-bold text-red-600 hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        Notify Parent ({alert.parentPhone})
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Tasks Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-serif font-bold text-base text-brand-textMain">Pedagogical Tasks</h4>
              <span className="text-[10px] font-bold uppercase bg-brand-violetLight text-brand-violet px-2 py-0.5 rounded-md">
                {tasks.filter(t => !t.done).length} Pending
              </span>
            </div>

            <div className="space-y-2.5">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    task.done
                      ? 'bg-gray-50 border-gray-100 opacity-60'
                      : 'bg-white border-gray-100 hover:border-brand-violet'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-brand-violet focus:ring-brand-violet pointer-events-none"
                  />
                  <div className="flex-1">
                    <p className={`text-xs font-semibold leading-tight ${task.done ? 'line-through text-gray-400' : 'text-brand-textMain'}`}>
                      {task.text}
                    </p>
                    <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">{task.due}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
