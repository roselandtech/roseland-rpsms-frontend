"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AuthService, RoselandUser } from '@/lib/auth';

export default function NotFound() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<RoselandUser | null>(null);
  const [targetUrl, setTargetUrl] = useState<string>('/');

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setTargetUrl(AuthService.getPortalUrlForUser(user));
    }
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-6 sm:p-10 font-sans selection:bg-brand-violet selection:text-white">
      
      {/* Top Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="The Roseland Preparatory School"
            width={36}
            height={36}
            className="object-contain"
            priority
          />
          <span className="font-serif font-bold text-sm sm:text-base text-brand-textMain tracking-tight">
            The Roseland Preparatory School
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-md w-full mx-auto my-auto text-center py-12">
        <span className="font-mono text-xs font-bold text-brand-violet uppercase tracking-widest block mb-2">
          404 Error
        </span>

        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain">
          Page Not Found
        </h1>

        <p className="text-sm text-brand-textMuted mt-3 leading-relaxed">
          The page you are looking for doesn’t exist or has been moved to a different location.
        </p>

        <div className="flex items-center justify-center gap-3 mt-8">
          <Link
            href={targetUrl}
            className="px-5 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            {currentUser ? 'Go to Dashboard' : 'Go to Homepage'}
          </Link>

          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-brand-textMain text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center text-xs text-gray-400 py-4 border-t border-gray-100">
        © {new Date().getFullYear()} The Roseland Preparatory School. All rights reserved.
      </footer>

    </div>
  );
}
