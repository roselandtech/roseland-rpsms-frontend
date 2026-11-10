"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AuthService, RoselandUser } from '@/lib/auth';

export default function NotFound() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<RoselandUser | null>(null);
  const [portalUrl, setPortalUrl] = useState<string>('/login');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = AuthService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setPortalUrl(AuthService.getPortalUrlForUser(user));
    }
  }, []);

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(currentUser ? portalUrl : '/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-violetLight/40 via-white to-brand-bg flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans selection:bg-brand-violet selection:text-white">
      
      {/* Top Brand Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-white p-1.5 shadow-md border border-gray-100 flex items-center justify-center transition-transform group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="Roseland Logo"
              width={42}
              height={42}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <span className="font-serif font-bold text-base sm:text-lg text-brand-textMain block leading-tight group-hover:text-brand-violet transition-colors">
              The Roseland Preparatory School
            </span>
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-brand-violet block">
              Knowledge & Humility • Adjen Kotoku
            </span>
          </div>
        </Link>

        {mounted && currentUser ? (
          <Link
            href={portalUrl}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white hover:bg-brand-violet hover:text-white border border-gray-200 rounded-xl text-xs font-bold text-brand-textMain transition-all shadow-xs"
          >
            <i className="ph-bold ph-squares-four text-sm"></i>
            <span>My Cockpit ({currentUser.role})</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-violet hover:bg-brand-violetDark text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <i className="ph-bold ph-sign-in text-sm"></i>
            <span>Portal Sign In</span>
          </Link>
        )}
      </header>

      {/* Main 404 Hero Card */}
      <main className="max-w-2xl w-full mx-auto my-auto py-8">
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-gray-100/80 text-center relative overflow-hidden animate-fade-in">
          
          {/* Decorative Background Blob */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-violetLight/60 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-yellowLight/80 rounded-full blur-3xl pointer-events-none"></div>

          {/* Badge & Visual Icon */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 rounded-3xl bg-brand-violetLight/70 border border-brand-violet/20 flex items-center justify-center text-brand-violet mb-6 shadow-inner">
              <i className="ph-fill ph-compass text-4xl animate-pulse"></i>
            </div>

            <span className="px-3 py-1 rounded-full bg-brand-yellowLight text-yellow-900 border border-brand-yellow/30 font-mono font-bold text-xs uppercase tracking-wider mb-2">
              Error 404 • Resource Relocated
            </span>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-extrabold text-brand-textMain mt-2 leading-tight">
              Classroom Not Found
            </h1>

            <p className="text-xs sm:text-sm text-brand-textMuted max-w-md mt-3 leading-relaxed">
              The page or portal record you are looking for has been archived, moved, or does not exist in the school directory.
            </p>

            {/* Authenticated user badge if signed in */}
            {mounted && currentUser && (
              <div className="mt-4 px-3.5 py-1.5 bg-brand-bg rounded-xl border border-gray-200/80 flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-gray-500">Signed in as</span>
                <strong className="text-brand-textMain">{currentUser.fullName || currentUser.username}</strong>
                <span className="text-[10px] font-mono font-bold text-brand-violet bg-white px-2 py-0.5 rounded border border-gray-200">
                  {currentUser.role}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto mt-8">
              {mounted && currentUser ? (
                <Link
                  href={portalUrl}
                  className="w-full sm:w-auto px-6 py-3.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="ph-bold ph-arrow-arc-left text-base"></i>
                  <span>Return to My Cockpit</span>
                </Link>
              ) : (
                <Link
                  href="/"
                  className="w-full sm:w-auto px-6 py-3.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="ph-bold ph-house text-base"></i>
                  <span>Return to School Home</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleGoBack}
                className="w-full sm:w-auto px-6 py-3.5 bg-brand-bg hover:bg-gray-200 text-brand-textMain font-bold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-gray-200"
              >
                <i className="ph-bold ph-arrow-left text-base"></i>
                <span>Previous Page</span>
              </button>
            </div>

            {/* Institutional Helpdesk Links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full pt-8 mt-8 border-t border-gray-100 text-[11px] font-medium text-gray-500">
              <Link href="/" className="p-2.5 rounded-xl hover:bg-brand-bg hover:text-brand-violet transition-colors">
                <i className="ph-bold ph-buildings block text-base mb-1 text-gray-400"></i>
                Campus Portal
              </Link>
              <Link href="/login" className="p-2.5 rounded-xl hover:bg-brand-bg hover:text-brand-violet transition-colors">
                <i className="ph-bold ph-key block text-base mb-1 text-gray-400"></i>
                Staff / Parent Login
              </Link>
              <a href="mailto:info@roselandprep.edu.gh" className="p-2.5 rounded-xl hover:bg-brand-bg hover:text-brand-violet transition-colors col-span-2 sm:col-span-1">
                <i className="ph-bold ph-envelope block text-base mb-1 text-gray-400"></i>
                Inquiries Desk
              </a>
            </div>

          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="max-w-6xl w-full mx-auto py-4 text-center text-xs text-brand-textMuted border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} The Roseland Preparatory School. All rights reserved.</p>
        <p className="font-mono text-[10px]">GES Registration: RPS-GES-4029 • Ga West Municipal, Accra</p>
      </footer>

    </div>
  );
}
