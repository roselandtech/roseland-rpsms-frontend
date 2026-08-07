"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthService, RoselandUser } from '@/lib/auth';

export default function PortalsGatewayPage() {
  const [currentUser, setCurrentUser] = useState<RoselandUser | null>(null);

  useEffect(() => {
    setCurrentUser(AuthService.getCurrentUser());
  }, []);

  const portals = [
    {
      title: "Parent & Family Portal",
      role: "For Parents & Guardians",
      desc: "Monitor academic progress, continuous assessment scores, attendance logs, bus transit tracking, and mobile money fee payments.",
      href: "/parent",
      icon: "ph-fill ph-users",
      color: "from-blue-600 to-indigo-700",
      btnColor: "bg-blue-600 hover:bg-blue-700",
      badge: "Family Access"
    },
    {
      title: "Teacher Portal",
      role: "For Teaching Faculty",
      desc: "Enter continuous assessment scores (10/10/10/10/30/30), draft weekly lesson plans, and take daily roll calls.",
      href: "/teacher",
      icon: "ph-fill ph-chalkboard-teacher",
      color: "from-amber-600 to-orange-700",
      btnColor: "bg-amber-600 hover:bg-amber-700",
      badge: "Faculty Desk"
    },
    {
      title: "Headmaster Command Center",
      role: "For Headmaster & Academic Directors",
      desc: "Supervise classroom walkthroughs, vet weekly schemes of work, audit at-risk student interventions, and digitally seal report cards.",
      href: "/headmaster",
      icon: "ph-fill ph-graduation-cap",
      color: "from-purple-700 to-brand-violetDark",
      btnColor: "bg-brand-violet hover:bg-brand-violetDark",
      badge: "Academic Leadership"
    },
    {
      title: "Executive Admin & Bursary",
      role: "For Proprietress, Bursar & Admin",
      desc: "Manage school fees, MoMo reconciliations, pupil admissions ATS, fleet logistics, and system audit trails.",
      href: "/admin",
      icon: "ph-fill ph-shield-check",
      color: "from-emerald-700 to-teal-800",
      btnColor: "bg-emerald-700 hover:bg-emerald-800",
      badge: "Super Admin & Bursary"
    },
    {
      title: "CBT & Examination Simulator",
      role: "For Students & Candidates",
      desc: "Practice BECE past questions, take timed classroom assessments, and experience real-time proctored examinations.",
      href: "/cbt",
      icon: "ph-fill ph-laptop",
      color: "from-indigo-600 to-slate-900",
      btnColor: "bg-indigo-600 hover:bg-indigo-700",
      badge: "Student CBT Center"
    }
  ];

  return (
    <div className="min-h-screen bg-brand-bg pt-28 pb-20 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-6xl mx-auto w-full space-y-10">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-white shadow-xl border border-gray-100 p-2 flex items-center justify-center">
            <img src="/logo.png" alt="The Roseland Preparatory School Crest" className="w-full h-full object-contain" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-brand-violet bg-brand-violetLight/60 px-3.5 py-1.5 rounded-full inline-block">
            Institutional Digital Ecosystem
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-brand-textMain tracking-tight">
            Roseland Unified Portals Gateway
          </h1>
          <p className="text-sm sm:text-base text-brand-textMuted leading-relaxed">
            Select your assigned institutional workspace or sign in directly to authenticate with your staff or student credentials.
          </p>

          {/* Quick Sign-in Callout */}
          <div className="pt-2">
            {currentUser ? (
              <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-full text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Signed in as <strong>{currentUser.fullName}</strong> ({currentUser.role})</span>
                <button
                  onClick={() => AuthService.logout('/portals')}
                  className="text-emerald-950 font-bold underline hover:text-emerald-700 cursor-pointer ml-1"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all"
              >
                <i className="ph-bold ph-key text-base"></i>
                <span>Sign In to Your Workspace</span>
              </Link>
            )}
          </div>
        </div>

        {/* Portal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portals.map((p, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl border border-gray-100 p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.color} text-white flex items-center justify-center text-xl shadow-md`}>
                    <i className={p.icon}></i>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    {p.badge}
                  </span>
                </div>

                <span className="text-[11px] font-bold text-brand-violet uppercase tracking-wider block mb-1">
                  {p.role}
                </span>
                <h3 className="font-serif font-bold text-xl text-brand-textMain mb-2.5 group-hover:text-brand-violet transition-colors">
                  {p.title}
                </h3>
                <p className="text-xs text-brand-textMuted leading-relaxed mb-6">
                  {p.desc}
                </p>
              </div>

              <Link
                href={p.href}
                className={`w-full py-3 ${p.btnColor} text-white font-bold rounded-xl text-xs uppercase tracking-wider text-center shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2`}
              >
                <span>Open Portal</span>
                <i className="ph-bold ph-arrow-right text-sm"></i>
              </Link>
            </div>
          ))}
        </div>

        {/* Return to website & Security accreditation */}
        <div className="text-center pt-6 space-y-3">
          <Link
            href="/"
            className="text-xs font-bold text-brand-textMuted hover:text-brand-violet inline-flex items-center gap-1.5 transition-colors"
          >
            <i className="ph ph-arrow-left"></i> Return to The Roseland Prep Public Website
          </Link>
          <p className="text-[11px] text-gray-400">
            GES Ga West Municipal Directorate Accredited • Enterprise RBAC Protected
          </p>
        </div>

      </div>
    </div>
  );
}
