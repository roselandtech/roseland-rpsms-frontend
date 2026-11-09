"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AuthService, RoselandUser } from '@/lib/auth';
import { RoselandApi } from '@/lib/api';

function matchParentWards(allStudents: any[], user: RoselandUser | null): any[] {
  if (!Array.isArray(allStudents) || allStudents.length === 0) return [];
  if (!user) return [allStudents[0]];

  const wardIndexes = Array.isArray(user.wardIndexNumbers)
    ? user.wardIndexNumbers.map((w) => String(w).trim().toUpperCase())
    : [];
  const userDigits = String(user.phone || user.username || '').replace(/\D/g, '').slice(-9);
  const userEmail = String(user.email || '').trim().toLowerCase();

  const matched = allStudents.filter((s) => {
    const idx = String(s.index_no || s.indexNo || '').trim().toUpperCase();
    if (wardIndexes.length > 0 && wardIndexes.includes(idx)) return true;

    const sPhoneDigits = String(s.parent_phone || s.parentPhone || '').replace(/\D/g, '').slice(-9);
    if (userDigits.length === 9 && sPhoneDigits === userDigits) return true;

    const sEmail = String(s.parent_email || s.parentEmail || '').trim().toLowerCase();
    if (userEmail && sEmail && sEmail === userEmail) return true;

    return false;
  });

  return matched.length > 0 ? matched : [allStudents[0]];
}

export default function ParentDashboard() {
  const [user, setUser] = useState<RoselandUser | null>(null);
  const [wards, setWards] = useState<any[]>([]);
  const [selectedWardIndex, setSelectedWardIndex] = useState<string>('');
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    setUser(currentUser);

    Promise.all([
      RoselandApi.sis.getStudents().catch(() => []),
      RoselandApi.finance.getInvoices().catch(() => []),
    ])
      .then(([students, invs]) => {
        const myWards = matchParentWards(students, currentUser);
        setWards(myWards);
        if (myWards.length > 0) {
          setSelectedWardIndex(String(myWards[0].index_no || myWards[0].indexNo || ''));
        }
        if (Array.isArray(invs)) {
          setAllInvoices(invs);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const student =
    wards.find((w) => String(w.index_no || w.indexNo) === selectedWardIndex) ||
    wards[0] ||
    null;

  const studentIndex = String(student?.index_no || student?.indexNo || '');
  const studentName = student?.fullName || student?.full_name || 'Your Scholar';
  const studentClass = student?.classGrade || student?.class_grade || '';

  const invoice =
    allInvoices.find(
      (inv) =>
        String(inv.student_index_no || inv.studentIndexNo || '').toUpperCase() ===
        studentIndex.toUpperCase()
    ) || null;

  const pendingAmount = invoice ? Number(invoice.outstandingBalance ?? invoice.balance_due ?? invoice.amount ?? 0) : 0;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-brand-textMain">
            Welcome, {user?.fullName || user?.username || 'Parent / Guardian'}
          </h2>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Real-time academic telemetry and tuition balance for <strong>{studentName}</strong>
            {studentClass ? ` (${studentClass} • ${studentIndex})` : ''}.
          </p>
        </div>

        {wards.length > 1 && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-1.5 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2">
              Switch Child:
            </span>
            {wards.map((w) => {
              const idx = String(w.index_no || w.indexNo);
              const active = idx === studentIndex;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedWardIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    active ? 'bg-brand-violet text-white shadow-xs' : 'text-brand-textMuted hover:bg-gray-100'
                  }`}
                >
                  {w.full_name || w.fullName}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm shrink-0 ${pendingAmount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <i className={`ph ${pendingAmount > 0 ? 'ph-warning-circle' : 'ph-check-circle'} text-xl`}></i>
            </div>
            <div>
              <h4 className="text-xs font-bold text-brand-textMuted uppercase tracking-wider">Tuition & Fee Status</h4>
              <p className="text-lg sm:text-xl font-bold font-serif text-brand-textMain mt-0.5">
                GH₵ {pendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-brand-textMuted mt-0.5">
                {pendingAmount > 0 ? 'Pending Term Settlement' : 'Fees Fully Settled'}
              </p>
            </div>
          </div>
          <Link href="/parent/finance" className="px-4 py-2 bg-brand-violet text-white text-xs font-bold rounded-xl shadow-sm hover:bg-brand-violetDark transition-colors">
            {pendingAmount > 0 ? 'Pay Online' : 'View Ledger'}
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-brand-violetLight text-brand-violet flex items-center justify-center shadow-sm shrink-0">
              <i className="ph ph-exam text-xl"></i>
            </div>
            <div>
              <h4 className="text-xs font-bold text-brand-textMuted uppercase tracking-wider">Academic Report Vault</h4>
              <p className="text-xs text-brand-textMain font-medium mt-1">Terminal continuous assessment and progress dossiers for {studentName}.</p>
            </div>
          </div>
          <Link href="/parent/academics" className="w-9 h-9 bg-brand-bg hover:bg-brand-violet hover:text-white text-brand-violet rounded-full transition-colors flex items-center justify-center shrink-0">
            <i className="ph ph-arrow-right font-bold"></i>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h3 className="font-serif font-bold text-brand-textMain text-base mb-3">Today&apos;s Attendance Snapshot</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                  <i className="ph-fill ph-check-circle text-lg"></i>
                </div>
                <div>
                  <p className="font-bold text-xs text-brand-textMain">
                    {studentName} • {studentClass || 'Enrolled Class'}
                  </p>
                  <p className="text-[11px] text-brand-textMuted">
                    Term Attendance Rate: {student?.attendance_pct ?? student?.attendancePct ?? 100}%
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-full">
                Active Session
              </span>
            </div>
            <div className="p-5 bg-gray-50/50">
              <p className="text-xs font-bold text-brand-textMain mb-2 uppercase tracking-wider text-gray-500">Classroom &amp; Conduct Remarks</p>
              <div className="bg-white p-4 rounded-xl border border-gray-100 text-xs text-brand-textMuted flex items-start gap-3 relative">
                <i className="ph-fill ph-quotes text-gray-300 text-xl shrink-0"></i>
                <p className="leading-relaxed">
                  {student?.conduct_remark || student?.conductRemark || 'Form master and pedagogical remarks will be recorded here during routine academic assessments.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif font-bold text-brand-textMain text-base">School Notices</h3>
            <Link href="/parent/notices" className="text-xs font-bold text-brand-violet hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-brand-violet/50 transition-colors">
              <span className="text-[10px] font-bold text-brand-violet uppercase tracking-wider mb-1 block">Institutional Circular</span>
              <h4 className="text-xs font-bold text-brand-textMain leading-tight mb-1">Official Parent Notice Board</h4>
              <p className="text-[11px] text-brand-textMuted">All official announcements, PTA advisories, and term schedules appear here.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
