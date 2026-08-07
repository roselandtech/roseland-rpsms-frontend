"use client";

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthService, RoselandUser } from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectQuery = searchParams.get('redirect');

  // Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successUser, setSuccessUser] = useState<RoselandUser | null>(null);

  // Active Editorial Carousel Slide
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroSlides = [
    {
      image: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=1600",
      headline: "Nurturing Character & Intellectual Brilliance",
      subline: "From Crèche through Junior High School, shaping the next generation of Ghanaian leaders in Ga West, Greater Accra.",
      tag: "Academic Excellence"
    },
    {
      image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=1600",
      headline: "Modern STEAM Labs & 40-Node CBT Center",
      subline: "Equipping pupils with computational literacy, robotics, and real-time computer-based examination readiness.",
      tag: "Technological Edge"
    },
    {
      image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=1600",
      headline: "Holistic Pupil Care & Safe Fleet Logistics",
      subline: "GPS-monitored student transit, on-campus health clinic, and dedicated faculty-parent communication.",
      tag: "Child Flourishing"
    }
  ];

  // Auto-rotate hero slides every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Please enter your identifier and passkey.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Direct call to Backend Auth Microservice
      const session = await AuthService.login(identifier.trim(), password);
      setSuccessUser(session.user);

      const destination = AuthService.resolveValidRedirect(session.user, redirectQuery);
      
      setTimeout(() => {
        window.location.href = destination;
      }, 700);
    } catch (err: any) {
      setErrorMsg(
        err.message?.includes('fetch') || err.message?.includes('Failed')
          ? 'Unable to connect to authentication server. Please verify the system is online and try again.'
          : (err.message || 'Invalid credentials. Please verify your details.')
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-950 text-slate-100 font-sans">
      
      {/* 1. LEFT EDITORIAL VISUAL HERO PANEL (Desktop) */}
      <div className="hidden lg:flex lg:w-7/12 relative flex-col justify-between p-10 xl:p-12 overflow-hidden h-full">
        {/* Background Image Carousel with Rich Gradient Overlays */}
        {heroSlides.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentSlide ? 'opacity-100 z-0' : 'opacity-0 -z-10'
            }`}
          >
            <img
              src={slide.image}
              alt={slide.headline}
              className="w-full h-full object-cover scale-105 transition-transform duration-10000 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-brand-violetDark/40"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/70"></div>
          </div>
        ))}

        {/* Top Branding Bar */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-white/95 backdrop-blur-md p-1.5 shadow-xl border border-white/30 flex items-center justify-center transition-transform group-hover:scale-105">
              <img src="/logo.png" alt="The Roseland Preparatory School Crest" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-serif font-bold text-base xl:text-lg text-white block leading-tight">
                Roseland Preparatory School
              </span>
              <span className="text-[10px] xl:text-[11px] font-semibold text-amber-400 tracking-wider uppercase block">
                Ga West Municipal • GES Accredited
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="text-xs font-semibold text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 transition-all flex items-center gap-1.5"
          >
            <i className="ph-bold ph-arrow-left text-xs"></i>
            <span>Public Website</span>
          </Link>
        </div>

        {/* Middle Carousel Quotes & Headlines */}
        <div className="relative z-10 max-w-lg my-auto py-6">
          <span className="inline-block py-1 px-3 rounded-full bg-amber-400/90 text-slate-950 text-[10px] font-bold uppercase tracking-widest mb-3 shadow-md">
            {heroSlides[currentSlide].tag}
          </span>
          <h2 className="text-2xl xl:text-4xl font-serif font-bold text-white leading-snug mb-3 drop-shadow-sm">
            {heroSlides[currentSlide].headline}
          </h2>
          <p className="text-sm xl:text-base text-gray-300 font-light leading-relaxed mb-6 line-clamp-3">
            {heroSlides[currentSlide].subline}
          </p>

          {/* Slide Indicators */}
          <div className="flex items-center gap-2">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  idx === currentSlide ? 'w-8 bg-amber-400' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Bottom Editorial Stats & Trust Banner */}
        <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-gray-300">
          <div className="flex items-center gap-5">
            <div>
              <span className="font-bold text-white block text-xs xl:text-sm">2026/2027</span>
              <span className="text-[10px] text-gray-400">Academic Year</span>
            </div>
            <div className="h-5 w-px bg-white/20"></div>
            <div>
              <span className="font-bold text-white block text-xs xl:text-sm">Crèche – JHS 3</span>
              <span className="text-[10px] text-gray-400">All Levels</span>
            </div>
            <div className="h-5 w-px bg-white/20"></div>
            <div>
              <span className="font-bold text-white block text-xs xl:text-sm">256-Bit SSL</span>
              <span className="text-[10px] text-gray-400">Protected</span>
            </div>
          </div>

          <span className="text-[11px] text-gray-400 italic">Pokuase ACP Estates, Accra</span>
        </div>
      </div>

      {/* 2. RIGHT AUTHENTICATION CARD: AUTHENTIC EXERCISE BOOK THEME */}
      <div 
        className="w-full lg:w-5/12 h-full bg-[#0b111e] relative flex flex-col justify-between p-6 sm:p-8 lg:p-7 xl:p-10 overflow-y-auto border-l border-slate-800 shadow-2xl"
        style={{
          // Authentic Feint Exercise Book Ruled Lines + Paper texture gradient
          backgroundImage: `
            repeating-linear-gradient(to bottom, transparent, transparent 25px, rgba(99, 102, 241, 0.08) 26px),
            radial-gradient(ellipse at 85% 10%, rgba(245, 158, 11, 0.05) 0%, transparent 60%)
          `
        }}
      >
        {/* Authentic Exercise Book Red Margin Guide Lines (Left Vertical Rules) */}
        <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-rose-500/25 pointer-events-none z-0"></div>
        <div className="absolute left-[27px] md:left-[35px] top-0 bottom-0 w-px bg-rose-500/15 pointer-events-none z-0"></div>

        {/* Notebook Spiral Spine Binder Holes (Along Left Boundary) */}
        <div className="hidden lg:flex flex-col justify-between absolute left-1 top-6 bottom-6 w-3 pointer-events-none z-10">
          {[...Array(14)].map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800 shadow-inner my-auto"
            />
          ))}
        </div>

        {/* Mobile Header with Crest */}
        <div className="relative z-10 flex lg:hidden items-center justify-between pb-3 mb-2 border-b border-slate-800/80 shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white p-1 shadow-md flex items-center justify-center">
              <img src="/logo.png" alt="The Roseland Preparatory School" className="w-full h-full object-contain" />
            </div>
            <span className="font-serif font-bold text-xs sm:text-sm text-white">Roseland Preparatory</span>
          </Link>
          <Link href="/" className="text-xs text-amber-400 font-semibold hover:underline">
            Home
          </Link>
        </div>

        {/* Main Exercise Book Content Container */}
        <div className="relative z-10 max-w-sm xl:max-w-md w-full mx-auto my-auto space-y-4">
          
          {/* Classic Exercise Book Header & Label Box */}
          <div className="bg-slate-950/85 backdrop-blur-md rounded-2xl p-4 border-2 border-slate-800/90 shadow-xl relative overflow-hidden group">
            {/* Corner Decorative Notches */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400"></div>
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400"></div>
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400"></div>
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400"></div>

            {/* Header info */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white p-1 shadow-md flex items-center justify-center shrink-0">
                  <img src="/logo.png" alt="Crest" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="font-serif font-bold text-base text-white block leading-tight">
                    Roseland Preparatory
                  </h1>
                  <span className="text-[10px] font-mono font-bold text-amber-400 tracking-wider uppercase block">
                    Portal
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
              </span>
            </div>

            {/* Notebook Fillable Meta */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
              <div className="truncate">
                <span className="text-slate-500"> </span>{' '}
                <span className="text-amber-300 font-semibold">RPS</span>
              </div>
              <div className="text-right truncate">
                <span className="text-slate-500">ACADEMIC:</span>{' '}
                <span className="text-slate-300">2026/2027</span>
              </div>
            </div>
          </div>

          {/* Success Alert Banner */}
          {successUser && (
            <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 flex items-center gap-2.5 animate-fade-in shadow-lg">
              <i className="ph-fill ph-check-circle text-xl text-emerald-400 shrink-0"></i>
              <div className="text-xs">
                <p className="font-bold text-white leading-tight">Welcome back, {successUser.fullName}!</p>
                <p className="text-emerald-300 text-[10px] mt-0.5">Redirecting to your dashboard...</p>
              </div>
            </div>
          )}

          {/* Error Alert Banner */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-200 flex items-center gap-2.5 animate-fade-in shadow-lg">
              <i className="ph-fill ph-warning-circle text-lg text-rose-400 shrink-0"></i>
              <p className="text-xs font-medium text-rose-200 leading-snug">{errorMsg}</p>
            </div>
          )}

          {/* Main Login Form */}
          <form onSubmit={handleLogin} className="space-y-3 bg-slate-950/75 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl">
            
            {/* Identifier Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Account Identifier</span>
                <span className="text-[10px] text-slate-500 font-mono">Email / Index No</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <i className="ph-bold ph-user text-sm"></i>
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. admin@roseland.edu.gh or RPS-2024-0012"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 rounded-xl border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-sans"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Secret Passkey / PIN
                </label>
                <Link
                  href="/contact"
                  className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Forgot Passkey?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <i className="ph-bold ph-lock-key text-sm"></i>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your confidential passkey"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 rounded-xl border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
                  aria-label="Toggle password visibility"
                >
                  <i className={`ph-bold ${showPassword ? 'ph-eye-slash' : 'ph-eye'} text-base`}></i>
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-amber-400/20"
                />
                <span className="text-xs text-slate-400">Keep me signed in</span>
              </label>

              <Link href="/portals" className="text-xs text-slate-400 hover:text-amber-400 transition-colors">
                Portals Directory →
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/50 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-black/20 border border-amber-300/40 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              {isLoading ? (
                <>
                  <i className="ph-bold ph-spinner animate-spin text-base"></i>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <i className="ph-bold ph-arrow-right text-sm"></i>
                </>
              )}
            </button>
          </form>

          {/* Admissions Link */}
          <div className="text-center pt-1">
            <p className="text-xs text-slate-400">
              New prospective parent?{' '}
              <Link href="/admissions/apply" className="text-amber-400 font-semibold hover:underline">
                Apply for 2026/2027 Admission
              </Link>
            </p>
          </div>

        </div>

        {/* Bottom Legal / Security Info */}
        <div className="relative z-10 pt-3 border-t border-slate-800/80 text-center text-[10px] text-slate-500 shrink-0 font-mono">
          <p>© {new Date().getFullYear()} The Roseland Preparatory School • Ga West Municipal, Accra</p>
        </div>

      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-amber-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Loading Portal Login...</span>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
