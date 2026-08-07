"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AuthService, RoselandUser } from '@/lib/auth';
import { RoselandApi } from '@/lib/api';

export default function ParentDashboard() {
  const [user, setUser] = useState<RoselandUser | null>(null);
  const [student, setStudent] = useState<any | null>(null);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    setUser(currentUser);

    RoselandApi.sis.getStudents().then((students) => {
      if (students && Array.isArray(students) && students.length > 0) {
        setStudent(students[0]);
      }
    }).catch(() => {});

    RoselandApi.finance.getInvoices().then((invs) => {
      if (invs && Array.isArray(invs) && invs.length > 0) {
        setInvoice(invs[0]);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const studentName = student?.fullName || student?.full_name || 'Your Scholar';
  const pendingAmount = invoice ? Number(invoice.outstandingBalance ?? invoice.amount ?? 0) : 0;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold font-serif text-brand-textMain">
          Welcome, {user?.fullName || user?.username || 'Parent / Guardian'}
        </h2>
        <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
          Real-time academic telemetry and tuition balance for {studentName}.
        </p>
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
                {pendingAmount > 0 ? 'Pending Term 2 Settlement' : 'Fees Fully Settled'}
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
              <p className="text-xs text-brand-textMain font-medium mt-1">Terminal continuous assessment and progress dossiers.</p>
            </div>
          </div>
          <Link href="/parent/academics" className="w-9 h-9 bg-brand-bg hover:bg-brand-violet hover:text-white text-brand-violet rounded-full transition-colors flex items-center justify-center shrink-0">
            <i className="ph ph-arrow-right font-bold"></i>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h3 className="font-serif font-bold text-brand-textMain text-base mb-3">Today's Attendance Snapshot</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                  <i className="ph-fill ph-check-circle text-lg"></i>
                </div>
                <div>
                  <p className="font-bold text-xs text-brand-textMain">Class Attendance Status</p>
                  <p className="text-[11px] text-brand-textMuted">Class Roll Call Synchronized</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-full">
                Active Session
              </span>
            </div>
            <div className="p-5 bg-gray-50/50">
              <p className="text-xs font-bold text-brand-textMain mb-2 uppercase tracking-wider text-gray-500">Classroom Remarks</p>
              <div className="bg-white p-4 rounded-xl border border-gray-100 text-xs text-brand-textMuted flex items-start gap-3 relative">
                <i className="ph-fill ph-quotes text-gray-300 text-xl shrink-0"></i>
                <p className="leading-relaxed">Form master and pedagogical remarks will be recorded here during routine academic assessments.</p>
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
