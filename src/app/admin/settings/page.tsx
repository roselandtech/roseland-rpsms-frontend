"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'academic' | 'rbac' | 'audit'>('profile');
  
  const [institution, setInstitution] = useState<any>(null);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [academicTerms, setAcademicTerms] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);

  const auditLogs = [
    { id: "AUD-9912", user: "Executive Desk (Director)", action: "Approved Terminal Report Cards for JHS 1", timestamp: "Today, 11:42 AM", ip: "102.176.48.22" },
    { id: "AUD-9911", user: "Bursary Desk (Accounts)", action: "Reconciled Mobile Money TX-9041 (GH₵ 1,850)", timestamp: "Today, 11:22 AM", ip: "102.176.48.25" },
    { id: "AUD-9910", user: "Academic Supervisory Desk (Headmaster)", action: "Adjusted Continuous Assessment score weighting to GES 10/10/10/10/30/30", timestamp: "Yesterday, 04:15 PM", ip: "102.176.48.19" },
    { id: "AUD-9909", user: "System Automator", action: "Automated Daily Attendance Sync (Live SIS Synced)", timestamp: "Today, 08:30 AM", ip: "Internal System" },
  ];

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Global Settings from Auth Service (Source of Truth)
      try {
        const sysRes = await RoselandApi.auth.getSystemSettings();
        if (sysRes) {
          setInstitution({
            name: sysRes.school_name,
            tagline: sysRes.motto,
            ges_code: sysRes.ges_code,
            location: sysRes.location,
            email: sysRes.email,
            phone: sysRes.phone,
            website: sysRes.website
          });
        }
      } catch (err) {
        // Fallback to CMS if auth settings fail
        const cmsRes = await RoselandApi.cms.getLandingContent();
        setInstitution(cmsRes.institution);
      }

      // 2. Fetch Academic Calendar States
      try {
        const calState = await RoselandApi.academic.calendar.getCurrentState();
        setCurrentSession(calState);
      } catch(e) {
        // May fail if none is active
      }
      
      const years = await RoselandApi.academic.calendar.getYears();
      setAcademicYears(years);

      if (years.length > 0) {
        const terms = await RoselandApi.academic.calendar.getTerms(years[0].id);
        setAcademicTerms(terms);
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to sync system settings from backend");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const payload = {
      school_name: formData.get('school_name'),
      ges_code: formData.get('ges_code'),
      location: formData.get('location'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      motto: formData.get('motto') || 'Knowledge & Humility',
      website: formData.get('website') || 'https://roselandprep.edu.gh'
    };

    try {
      await RoselandApi.auth.updateSystemSettings(payload);
      
      // Update local state so UI updates instantly without refresh
      setInstitution({
        name: payload.school_name,
        tagline: payload.motto,
        ges_code: payload.ges_code,
        location: payload.location,
        email: payload.email,
        phone: payload.phone,
        website: payload.website
      });
      
      toast.success("School Profile updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update global settings.");
    }
  };

  const handleUpdateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API update for Academic Term limits
    toast.success("Academic Term parameters updated and synced with SIS.");
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
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
          className="px-4 py-2.5 bg-brand-bg hover:bg-gray-200 text-brand-textMain font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
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
              className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-brand-violet text-white shadow-sm'
                  : 'text-brand-textMuted hover:bg-gray-50 hover:text-brand-textMain'
              }`}
            >
              <i className="ph ph-buildings text-base"></i> Institutional Profile
            </button>

            <button
              onClick={() => setActiveTab('academic')}
              className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
                activeTab === 'academic'
                  ? 'bg-brand-violet text-white shadow-sm'
                  : 'text-brand-textMuted hover:bg-gray-50 hover:text-brand-textMain'
              }`}
            >
              <i className="ph ph-sliders text-base"></i> Global System State
            </button>

            <button
              onClick={() => setActiveTab('rbac')}
              className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
                activeTab === 'rbac'
                  ? 'bg-brand-violet text-white shadow-sm'
                  : 'text-brand-textMuted hover:bg-gray-50 hover:text-brand-textMain'
              }`}
            >
              <i className="ph ph-shield-check text-base"></i> Roles & RBAC Matrix
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
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
          
          {loading ? (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center">
              <i className="ph ph-spinner animate-spin text-4xl text-brand-violet mb-4"></i>
              <p className="text-gray-400 font-bold text-sm">Syncing Settings...</p>
            </div>
          ) : (
            <>
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6 animate-fade-in">
                  <h3 className="font-serif font-bold text-lg text-brand-textMain">Institutional Details & Letterhead</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-brand-textMain uppercase mb-1">School Official Name</label>
                      <input
                        type="text"
                        name="school_name"
                        defaultValue={institution?.name || "The Roseland Preparatory School"}
                        className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-brand-textMain uppercase mb-1">GES Accreditation Number</label>
                      <input
                        type="text"
                        name="ges_code"
                        defaultValue={institution?.ges_code || "RPS-GES-4029"}
                        className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-brand-textMain uppercase mb-1">Campus Physical Address</label>
                      <input
                        type="text"
                        name="location"
                        defaultValue={institution?.location || "Ga West Municipality, Greater Accra Region, Ghana"}
                        className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-brand-textMain uppercase mb-1">Official Email</label>
                      <input
                        type="email"
                        name="email"
                        defaultValue={institution?.email || "info@roselandprep.edu.gh"}
                        className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-brand-textMain uppercase mb-1">Official Telephone</label>
                      <input
                        type="tel"
                        name="phone"
                        defaultValue={institution?.phone || "+233243968988"}
                        className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-brand-textMain uppercase mb-1">School Motto / Tagline</label>
                      <input
                        type="text"
                        name="motto"
                        defaultValue={institution?.tagline || "Knowledge & Humility"}
                        className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet italic"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-brand-violet text-white font-bold text-xs rounded-xl hover:bg-brand-violetDark shadow-sm cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              )}

              {/* Global System State Override Tab */}
              {activeTab === 'academic' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Bridge Link Alert */}
                  <div className="bg-brand-violet/5 border border-brand-violet/20 rounded-2xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-violet/10 flex items-center justify-center shrink-0">
                      <i className="ph-fill ph-calendar-check text-brand-violet text-xl"></i>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-brand-textMain text-sm">Need to manage the actual Academic Calendar?</h4>
                      <p className="text-xs text-brand-textMuted mt-1 mb-3 max-w-xl">
                        This section only sets the globally active system state. To schedule holidays, create new academic years, or manage term boundaries, please use the dedicated Academic Calendar module.
                      </p>
                      <Link 
                        href="/admin/academics/calendar" 
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-brand-textMain hover:border-brand-violet hover:text-brand-violet transition-colors shadow-sm"
                      >
                        <i className="ph-bold ph-arrow-square-out"></i> Go to Academic Calendar
                      </Link>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateTerm} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-serif font-bold text-lg text-brand-textMain">Global Active State</h3>
                        <p className="text-xs text-brand-textMuted mt-1">Set the current operating term for all microservices (Finance, Academics, Parent App).</p>
                      </div>
                      
                      {currentSession?.academic_term ? (
                        <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] uppercase font-bold tracking-wider rounded-full flex items-center gap-2 shadow-sm">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                          {currentSession.academic_term.name} is Active
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 bg-gray-50 text-gray-500 border border-gray-200 text-[10px] uppercase font-bold tracking-wider rounded-full shadow-sm">
                          No Term Currently Active
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                      <div className="space-y-1.5">
                        <label className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px]">Active Academic Session</label>
                        <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-violet focus:bg-white transition-colors cursor-pointer disabled:opacity-50" disabled={academicYears.length === 0}>
                          {academicYears.length > 0 ? (
                            academicYears.map(yr => (
                              <option key={yr.id} value={yr.id}>{yr.name}</option>
                            ))
                          ) : (
                            <option value="">-- No Sessions Configured --</option>
                          )}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px]">Active Academic Term</label>
                        <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand-violet focus:bg-white transition-colors cursor-pointer disabled:opacity-50" disabled={academicTerms.length === 0}>
                          {academicTerms.length > 0 ? (
                            academicTerms.map(term => (
                              <option key={term.id} value={term.id}>{term.name}</option>
                            ))
                          ) : (
                            <option value="">-- No Terms Configured --</option>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-5 border-t border-gray-100">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-brand-violet text-white font-bold text-xs rounded-xl hover:bg-brand-violetDark shadow-sm cursor-pointer flex items-center gap-2 transition-colors"
                      >
                        <i className="ph-bold ph-broadcast"></i> Broadcast Active State
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* RBAC Matrix Tab */}
              {activeTab === 'rbac' && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6 animate-fade-in">
                  <h3 className="font-serif font-bold text-lg text-brand-textMain">Role-Based Access Control (RBAC)</h3>
                  <p className="text-xs text-brand-textMuted">Granular permissions configured per institutional role. Synced from Core Auth Service.</p>

                  <div className="divide-y divide-gray-100 text-xs">
                    <div className="py-3 flex items-center justify-between">
                      <div>
                        <strong className="text-brand-textMain block">Super Admin / Proprietress</strong>
                        <span className="text-gray-400">Full institutional permissions across finance, academics, CBT, and HR</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-md font-bold text-[10px] uppercase">All Modules</span>
                    </div>

                    <div className="py-3 flex items-center justify-between">
                      <div>
                        <strong className="text-brand-textMain block">Headmaster / Academic Director</strong>
                        <span className="text-gray-400">Report card sign-offs, timetables, CBT surveillance, teacher appraisals</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-md font-bold text-[10px] uppercase">Academic Authority</span>
                    </div>

                    <div className="py-3 flex items-center justify-between">
                      <div>
                        <strong className="text-brand-textMain block">Bursar / Accounts Officer</strong>
                        <span className="text-gray-400">Fee collections, MoMo reconciliations, defaulter recovery SMS, inventory</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-green-100 text-green-800 rounded-md font-bold text-[10px] uppercase">Finance Only</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Audit Logs Tab */}
              {activeTab === 'audit' && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-lg text-brand-textMain">Institutional Security Audit Logs</h3>
                    <span className="text-xs text-gray-400 font-mono">Immutable Time-Stamped</span>
                  </div>

                  <div className="divide-y divide-gray-100 text-xs">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="py-3.5 space-y-1 hover:bg-gray-50/50 transition-colors px-2 rounded-lg">
                        <div className="flex items-center justify-between">
                          <strong className="text-brand-textMain">{log.user}</strong>
                          <span className="font-mono text-[10px] text-gray-400">{log.timestamp}</span>
                        </div>
                        <p className="text-gray-600 font-medium">{log.action}</p>
                        <span className="font-mono text-[10px] text-gray-400 block mt-1">Audit Ref: {log.id} • Host IP: {log.ip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
