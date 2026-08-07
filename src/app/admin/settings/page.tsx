"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'academic' | 'rbac' | 'audit'>('profile');

  const auditLogs = [
    { id: "AUD-9912", user: "Executive Desk (Director)", action: "Approved Terminal Report Cards for JHS 1", timestamp: "Today, 11:42 AM", ip: "102.176.48.22" },
    { id: "AUD-9911", user: "Bursary Desk (Accounts)", action: "Reconciled Mobile Money TX-9041 (GH₵ 1,850)", timestamp: "Today, 11:22 AM", ip: "102.176.48.25" },
    { id: "AUD-9910", user: "Academic Supervisory Desk (Headmaster)", action: "Adjusted Continuous Assessment score weighting to GES 10/10/10/10/30/30", timestamp: "Yesterday, 04:15 PM", ip: "102.176.48.19" },
    { id: "AUD-9909", user: "System Automator", action: "Automated Daily Attendance Sync (Live SIS Synced)", timestamp: "Today, 08:30 AM", ip: "Internal System" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            System Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Institutional Settings & Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Academic calendar setup, Role-Based Access Control (RBAC), and security event logs.
          </p>
        </div>

        <button
          onClick={() => toast.success("Exported System Audit Log (CSV)")}
          className="px-4 py-2.5 bg-brand-bg hover:bg-gray-200 text-brand-textMain font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
        >
          <i className="ph-bold ph-file-text"></i> Export Audit Log
        </button>
      </div>

      {/* Main Layout: Settings Tabs */}
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Navigation Column */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-3xl p-3 shadow-sm border border-gray-100 flex flex-col gap-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-2xl transition-all ${
                activeTab === 'profile'
                  ? 'bg-brand-violet text-white shadow-sm'
                  : 'text-brand-textMuted hover:bg-gray-50 hover:text-brand-textMain'
              }`}
            >
              <i className="ph ph-buildings text-base"></i> Institutional Profile
            </button>

            <button
              onClick={() => setActiveTab('academic')}
              className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-2xl transition-all ${
                activeTab === 'academic'
                  ? 'bg-brand-violet text-white shadow-sm'
                  : 'text-brand-textMuted hover:bg-gray-50 hover:text-brand-textMain'
              }`}
            >
              <i className="ph ph-calendar-blank text-base"></i> Academic Terms & Dates
            </button>

            <button
              onClick={() => setActiveTab('rbac')}
              className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-2xl transition-all ${
                activeTab === 'rbac'
                  ? 'bg-brand-violet text-white shadow-sm'
                  : 'text-brand-textMuted hover:bg-gray-50 hover:text-brand-textMain'
              }`}
            >
              <i className="ph ph-shield-check text-base"></i> Roles & RBAC Matrix
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-2xl transition-all ${
                activeTab === 'audit'
                  ? 'bg-brand-violet text-white shadow-sm'
                  : 'text-brand-textMuted hover:bg-gray-50 hover:text-brand-textMain'
              }`}
            >
              <i className="ph ph-clock-counter-clockwise text-base"></i> System Audit Trail
            </button>
          </div>
        </div>

        {/* Content Column */}
        <div className="flex-1">
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
              <h3 className="font-serif font-bold text-lg text-brand-textMain">Institutional Details & Letterhead</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-brand-textMain uppercase mb-1">School Official Name</label>
                  <input
                    type="text"
                    defaultValue="The Roseland Preparatory School"
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet"
                  />
                </div>

                <div>
                  <label className="block font-bold text-brand-textMain uppercase mb-1">GES Accreditation Number</label>
                  <input
                    type="text"
                    defaultValue="RPS-GES-4029"
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-brand-textMain uppercase mb-1">Campus Physical Address</label>
                  <input
                    type="text"
                    defaultValue="Ga West Municipality, Greater Accra Region, Ghana"
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet"
                  />
                </div>

                <div>
                  <label className="block font-bold text-brand-textMain uppercase mb-1">Official Email</label>
                  <input
                    type="email"
                    defaultValue="info@roselandprep.edu.gh"
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet"
                  />
                </div>

                <div>
                  <label className="block font-bold text-brand-textMain uppercase mb-1">Official Telephone</label>
                  <input
                    type="tel"
                    defaultValue="+233 24 123 4567"
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  onClick={() => toast.success("School Profile details updated successfully.")}
                  className="px-6 py-2.5 bg-brand-violet text-white font-bold text-xs rounded-xl hover:bg-brand-violetDark shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Academic Terms Tab */}
          {activeTab === 'academic' && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-lg text-brand-textMain">Academic Calendar & Term Boundaries</h3>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                  Term 2 Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-brand-textMain uppercase mb-1">Academic Session</label>
                  <select className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet">
                    <option>2025/2026 Academic Year</option>
                    <option>2026/2027 Academic Year</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-brand-textMain uppercase mb-1">Active Term</label>
                  <select defaultValue="Term 2" className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet">
                    <option>Term 1 (Michaelmas)</option>
                    <option>Term 2 (Lent)</option>
                    <option>Term 3 (Trinity)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  onClick={() => toast.success("Academic Term parameters updated.")}
                  className="px-6 py-2.5 bg-brand-violet text-white font-bold text-xs rounded-xl hover:bg-brand-violetDark shadow-sm"
                >
                  Update Term Dates
                </button>
              </div>
            </div>
          )}

          {/* RBAC Matrix Tab */}
          {activeTab === 'rbac' && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
              <h3 className="font-serif font-bold text-lg text-brand-textMain">Role-Based Access Control (RBAC)</h3>
              <p className="text-xs text-brand-textMuted">Granular permissions configured per institutional role.</p>

              <div className="divide-y divide-gray-100 text-xs">
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <strong className="text-brand-textMain block">Super Admin / Proprietress</strong>
                    <span className="text-gray-400">Full institutional permissions across finance, academics, CBT, and HR</span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full font-bold text-[10px]">All Modules</span>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <strong className="text-brand-textMain block">Headmaster / Academic Director</strong>
                    <span className="text-gray-400">Report card sign-offs, timetables, CBT surveillance, teacher appraisals</span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold text-[10px]">Academic Authority</span>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <strong className="text-brand-textMain block">Bursar / Accounts Officer</strong>
                    <span className="text-gray-400">Fee collections, MoMo reconciliations, defaulter recovery SMS, inventory</span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-green-100 text-green-800 rounded-full font-bold text-[10px]">Finance Only</span>
                </div>
              </div>
            </div>
          )}

          {/* Audit Logs Tab */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-lg text-brand-textMain">Institutional Security Audit Logs</h3>
                <span className="text-xs text-gray-400 font-mono">Immutable Time-Stamped</span>
              </div>

              <div className="divide-y divide-gray-100 text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="py-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-brand-textMain">{log.user}</strong>
                      <span className="font-mono text-[10px] text-gray-400">{log.timestamp}</span>
                    </div>
                    <p className="text-gray-600">{log.action}</p>
                    <span className="font-mono text-[10px] text-gray-400 block">Audit Ref: {log.id} • Host IP: {log.ip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
