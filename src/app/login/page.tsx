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
  const [schoolName, setSchoolName] = useState("Roseland Preparatory School");

  const heroSlides = [
    {
      image: "/IMG_3023.JPG.jpeg",
      headline: "Nurturing Character & Intellectual Brilliance",
      subline: "From Crèche through Junior High School, shaping the next generation of Ghanaian leaders in Ga West, Greater Accra.",
      tag: "Academic Excellence"
    },
    {
      image: "/IMG_3064.JPG.jpeg",
      headline: "Modern STEAM Labs & 40-Node CBT Center",
      subline: "Equipping pupils with computational literacy, robotics, and real-time computer-based examination readiness.",
      tag: "Technological Edge"
    },
    {
      image: "/IMG_2191.jpg",
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

    // Fetch dynamic branding
    import('@/lib/api').then(({ RoselandApi }) => {
      RoselandApi.cms.getLandingContent().then(data => {
        if (data?.institution?.name) {
          setSchoolName(data.institution.name);
        }
      }).catch(() => {});
    });

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
                {schoolName}
              </span>
              <span className="text-[10px] xl:text-[11px] font-semibold text-amber-400 tracking-wider uppercase block">
                Adjen Kotoku • GES Accredited
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

          <span className="text-[11px] text-gray-400 italic">PJ9H+FCX, Adjen Kotoku</span>
        </div>
      </div>

      {/* 2. RIGHT AUTHENTICATION CARD: SIMPLE & PROFESSIONAL (WHITE) */}
      <div className="w-full lg:w-5/12 h-full bg-white relative flex flex-col justify-between p-6 sm:p-8 lg:p-12 xl:p-16 overflow-y-auto shadow-2xl">
        
        {/* Mobile Header with Crest */}
        <div className="relative z-10 flex lg:hidden items-center justify-between pb-4 mb-4 border-b border-gray-100 shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg border border-gray-200 p-1 flex items-center justify-center">
              <img src="/logo.png" alt="Roseland" className="w-full h-full object-contain" />
            </div>
            <span className="font-serif font-bold text-xs sm:text-sm text-gray-900">Roseland</span>
          </Link>
          <Link href="/" className="text-[10px] uppercase tracking-widest text-gray-500 font-bold hover:text-gray-900 transition-colors">
            Return Home
          </Link>
        </div>

        {/* Main Content Container */}
        <div className="w-full max-w-sm mx-auto my-auto space-y-8">
          
          {/* Professional Header */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-xl border border-gray-100 p-2 flex items-center justify-center shadow-sm">
              <img src="/logo.png" alt="Crest" className="w-full h-full object-contain" />
            </div>
            
            <div>
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                Welcome to
              </span>
              <h1 className="font-serif font-bold text-3xl text-gray-900">
                Roseland
              </h1>
            </div>

            <p className="text-sm text-gray-500 leading-relaxed max-w-[260px]">
              Please enter your credentials to access the academic portal.
            </p>
          </div>

          {/* Error Alert Banner */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 flex items-center gap-2.5">
              <i className="ph-fill ph-warning-circle text-lg shrink-0"></i>
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Success Alert Banner */}
          {successUser && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-green-700 flex items-center gap-2.5">
              <i className="ph-fill ph-check-circle text-xl shrink-0"></i>
              <div className="text-sm">
                <p className="font-bold">Welcome back, {successUser.fullName}!</p>
                <p className="text-green-600 text-xs mt-0.5">Redirecting to dashboard...</p>
              </div>
            </div>
          )}

          {/* Main Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Identifier Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Account Identifier</label>
              <input 
                type="text" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g., ROS-2026-001"
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet transition-shadow font-mono"
                required
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">Password</label>
                <Link href="/contact" className="text-xs font-semibold text-brand-violet hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet transition-shadow font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className={`ph-bold ${showPassword ? 'ph-eye-slash' : 'ph-eye'} text-lg`}></i>
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
                  className="w-4 h-4 rounded border-gray-300 text-brand-violet focus:ring-brand-violet"
                />
                <span className="text-sm text-gray-600">Keep me signed in</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-brand-violet hover:bg-brand-violetDark text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <i className="ph-bold ph-spinner animate-spin text-lg"></i>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <i className="ph-bold ph-sign-in text-lg"></i>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Admissions Link */}
          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              New prospective parent?{' '}
              <Link href="/admissions/apply" className="text-brand-violet font-semibold hover:underline">
                Apply for Admission
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom Legal / Security Info */}
        <div className="pt-8 text-center text-xs text-gray-400">
          <p>© {new Date().getFullYear()} The Roseland Preparatory School</p>
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
