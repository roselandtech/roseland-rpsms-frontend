"use client";

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { AuthService, RoselandUser } from '@/lib/auth';

interface SubNavItem {
  name: string;
  href: string;
  desc?: string;
  icon?: string;
}

interface NavGroup {
  title: string;
  href?: string;
  items: SubNavItem[];
}

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [openMobileAccordion, setOpenMobileAccordion] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<RoselandUser | null>(null);
  const pathname = usePathname();
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    setCurrentUser(AuthService.getCurrentUser());
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change & refresh user session
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
    setOpenMobileAccordion(null);
    setCurrentUser(AuthService.getCurrentUser());
  }, [pathname]);

  const navGroups: NavGroup[] = [
    {
      title: "About",
      href: "/about",
      items: [
        { name: "About & Vision", href: "/about", desc: "Our history, mission and core values", icon: "ph-buildings" },
        { name: "Leadership & Faculty", href: "/about/leadership", desc: "Proprietress, Headmaster & Teachers", icon: "ph-users-three" },
        { name: "Campus & Facilities", href: "/about/campus", desc: "ICT labs, science room, library & playgrounds", icon: "ph-tree" },
        { name: "Accreditation & Standards", href: "/about/accreditation", desc: "GES certification & quality standards", icon: "ph-certificate" },
      ]
    },
    {
      title: "Academics",
      href: "/academics",
      items: [
        { name: "Curriculum & Approach", href: "/academics", desc: "Blended GES curriculum & philosophy", icon: "ph-book-open" },
        { name: "Early Years (Crèche & Nursery)", href: "/academics/early-years", desc: "Play-based sensory learning & safety", icon: "ph-baby" },
        { name: "Primary School (P1–P6)", href: "/academics/primary", desc: "Core subjects, literacy, numeracy & arts", icon: "ph-student" },
        { name: "Junior High (JHS 1–JHS 3)", href: "/academics/jhs", desc: "BECE preparation, science & computing", icon: "ph-graduation-cap" },
        { name: "Academic Calendar", href: "/academics/calendar", desc: "Term dates, exams & holidays", icon: "ph-calendar" },
      ]
    },
    {
      title: "Admissions",
      href: "/admissions",
      items: [
        { name: "Admissions Guide", href: "/admissions", desc: "Step-by-step entry process & criteria", icon: "ph-compass" },
        { name: "Apply Online", href: "/admissions/apply", desc: "Digital enrollment & registration form", icon: "ph-file-arrow-up" },
        { name: "Tuition & Fees", href: "/admissions/fees", desc: "Transparent fee schedules & payment modes", icon: "ph-money" },
        { name: "Book a Campus Tour", href: "/admissions/tour", desc: "Schedule a physical visit with our team", icon: "ph-map-pin-line" },
        { name: "Admissions FAQ", href: "/admissions/faq", desc: "Frequently asked enrollment questions", icon: "ph-question" },
      ]
    },
    {
      title: "Student Life",
      href: "/student-life/clubs",
      items: [
        { name: "Clubs & STEAM", href: "/student-life/clubs", desc: "Robotics, Debate, French & Music", icon: "ph-rocket-launch" },
        { name: "Sports & Athletics", href: "/student-life/sports", desc: "Football, track, tennis & sports day", icon: "ph-trophy" },
        { name: "Health & Guidance", href: "/student-life/welfare", desc: "Infirmary, child safety & counseling", icon: "ph-first-aid" },
        { name: "Canteen & Transport", href: "/student-life/services", desc: "Nutritious meals & campus bus routes", icon: "ph-bus" },
      ]
    },
    {
      title: "Community",
      href: "/news",
      items: [
        { name: "Latest News", href: "/news", desc: "School announcements & achievements", icon: "ph-newspaper" },
        { name: "Upcoming Events", href: "/events", desc: "PTA meetings, Speech Day & sports", icon: "ph-calendar-check" },
        { name: "Photo Gallery", href: "/gallery", desc: "High-res campus life & graduation photos", icon: "ph-images" },
      ]
    }
  ];

  const handleMouseEnter = (title: string) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setActiveDropdown(title);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      {/* Top Announcement Bar */}
      <div className="bg-brand-violetDark text-white text-xs py-1.5 px-4 hidden sm:block border-b border-white/10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <strong className="text-brand-yellow font-semibold uppercase tracking-wider text-[10px]">2026/2027 Admissions:</strong> Open for Crèche through JHS
            </span>
            <span className="text-white/40">|</span>
            <span className="text-gray-300 text-xs hidden md:inline">Ga West Municipality, Accra, Ghana</span>
          </div>
          <div className="flex items-center gap-5 font-medium">
            <a href="tel:+233200000000" className="hover:text-brand-yellow transition-colors flex items-center gap-1">
              <i className="ph-fill ph-phone text-sm text-brand-yellow"></i> +233 20 000 0000
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav
        className={`bg-white/95 backdrop-blur-md transition-all duration-300 ${
          isScrolled ? 'shadow-md py-1 border-b border-gray-100' : 'py-2.5 border-b border-gray-100/60'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* School Logo & Brand */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1 shadow-md shadow-brand-violet/10 border border-gray-100 group-hover:scale-105 transition-transform shrink-0 overflow-hidden">
                <img src="/logo.png" alt="The Roseland Preparatory School Crest" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-serif font-bold text-lg sm:text-xl tracking-tight text-brand-textMain block leading-tight group-hover:text-brand-violet transition-colors">
                  The Roseland Prep
                </span>
                <span className="text-[10px] uppercase tracking-widest text-brand-violet font-bold block">
                  Excellence • Integrity
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center space-x-1 xl:space-x-2">
              <Link
                href="/"
                className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  pathname === '/' ? 'text-brand-violet bg-brand-violetLight/50' : 'text-brand-textMain hover:text-brand-violet hover:bg-gray-50'
                }`}
              >
                Home
              </Link>

              {navGroups.map((group) => {
                const isActive = pathname.startsWith(group.href || '');
                const isOpen = activeDropdown === group.title;

                return (
                  <div
                    key={group.title}
                    className="relative"
                    onMouseEnter={() => handleMouseEnter(group.title)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      className={`px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                        isActive || isOpen
                          ? 'text-brand-violet bg-brand-violetLight/50'
                          : 'text-brand-textMain hover:text-brand-violet hover:bg-gray-50'
                      }`}
                    >
                      {group.title}
                      <i className={`ph ph-caret-down text-xs transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-violet' : 'text-gray-400'}`}></i>
                    </button>

                    {/* Dropdown Menu */}
                    {isOpen && (
                      <div className="absolute left-0 mt-1 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 z-50 animate-fade-in divide-y divide-gray-50">
                        <div className="space-y-1">
                          {group.items.map((sub) => (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={`flex items-start gap-3 p-2.5 rounded-xl hover:bg-brand-violetLight/50 transition-all group/item ${
                                pathname === sub.href ? 'bg-brand-violetLight/60' : ''
                              }`}
                            >
                              <div className="w-8 h-8 rounded-lg bg-brand-violetLight text-brand-violet flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-brand-violet group-hover/item:text-white transition-colors">
                                <i className={`ph ${sub.icon || 'ph-arrow-right'} text-base`}></i>
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-brand-textMain group-hover/item:text-brand-violet transition-colors leading-tight">
                                  {sub.name}
                                </h4>
                                {sub.desc && (
                                  <p className="text-[11px] text-brand-textMuted mt-0.5 line-clamp-1 leading-tight font-normal">
                                    {sub.desc}
                                  </p>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                        {group.href && (
                          <div className="pt-2 mt-2">
                            <Link
                              href={group.href}
                              className="text-xs font-bold text-brand-violet hover:text-brand-violetDark flex items-center justify-between px-2 py-1"
                            >
                              <span>Explore all {group.title}</span>
                              <i className="ph-bold ph-arrow-right text-xs"></i>
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <Link
                href="/contact"
                className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  pathname === '/contact' ? 'text-brand-violet bg-brand-violetLight/50' : 'text-brand-textMain hover:text-brand-violet hover:bg-gray-50'
                }`}
              >
                Contact
              </Link>
            </div>

            {/* Desktop Portal Actions */}
            <div className="hidden lg:flex items-center space-x-2.5">
              <Link
                href="/admissions/apply"
                className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 bg-amber-400 rounded-xl hover:bg-amber-300 shadow-sm border border-amber-300/40 transition-all flex items-center gap-1.5"
              >
                <i className="ph-bold ph-pencil-simple text-sm"></i> Apply Now
              </Link>
              
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <Link
                    href={AuthService.getPortalUrlForUser(currentUser)}
                    className="px-4 py-2 text-xs font-bold text-brand-violet bg-brand-violetLight rounded-xl hover:bg-brand-violet hover:text-white transition-all flex items-center gap-2"
                  >
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.fullName} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <i className="ph ph-user-circle text-base"></i>
                    )}
                    <span>{currentUser.fullName.split(' ')[0]} ({currentUser.role.substring(0, 5)})</span>
                  </Link>
                  <button
                    onClick={() => AuthService.logout('/')}
                    title="Sign Out"
                    className="p-2 text-gray-500 hover:text-rose-600 bg-gray-100 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <i className="ph-bold ph-sign-out text-base"></i>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2.5 text-xs font-bold text-white bg-brand-violet rounded-xl hover:bg-brand-violetDark shadow-sm shadow-brand-violet/20 transition-all flex items-center gap-1.5"
                >
                  <i className="ph-bold ph-sign-in text-base"></i> Portal Login
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center gap-2">
              <Link
                href="/admissions/apply"
                className="px-3 py-2 text-xs font-bold text-yellow-900 bg-brand-yellow rounded-lg shadow-sm"
              >
                Apply
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-brand-textMain hover:text-brand-violet p-2 rounded-lg bg-gray-50 border border-gray-200"
                aria-label="Toggle navigation menu"
              >
                <i className={`ph ${isMobileMenuOpen ? 'ph-x' : 'ph-list'} text-2xl`}></i>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 max-h-[85vh] overflow-y-auto px-4 pt-3 pb-8 space-y-2 shadow-2xl animate-fade-in">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between px-4 py-3 text-base font-bold text-brand-textMain hover:bg-gray-50 rounded-xl"
            >
              <span>Home</span>
              <i className="ph ph-house text-lg text-gray-400"></i>
            </Link>

            {navGroups.map((group) => {
              const isAccordionOpen = openMobileAccordion === group.title;
              return (
                <div key={group.title} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenMobileAccordion(isAccordionOpen ? null : group.title)}
                    className="w-full flex items-center justify-between px-4 py-3 text-base font-bold text-brand-textMain hover:bg-gray-50"
                  >
                    <span>{group.title}</span>
                    <i className={`ph ph-caret-down transition-transform duration-200 ${isAccordionOpen ? 'rotate-180 text-brand-violet' : 'text-gray-400'}`}></i>
                  </button>
                  {isAccordionOpen && (
                    <div className="bg-gray-50/70 px-3 py-2 space-y-1 border-t border-gray-100">
                      {group.items.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-brand-textMain hover:text-brand-violet hover:bg-white rounded-lg transition-colors"
                        >
                          <i className={`ph ${sub.icon || 'ph-dot'} text-brand-violet text-base`}></i>
                          <span>{sub.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <Link
              href="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between px-4 py-3 text-base font-bold text-brand-textMain hover:bg-gray-50 rounded-xl"
            >
              <span>Contact Us</span>
              <i className="ph ph-phone text-lg text-gray-400"></i>
            </Link>

            <div className="h-px w-full bg-gray-100 my-4"></div>

            {/* Mobile Portal Buttons */}
            {currentUser ? (
              <div className="space-y-2 pt-1">
                <Link
                  href={AuthService.getPortalUrlForUser(currentUser)}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-white bg-brand-violet rounded-xl shadow-md"
                >
                  <span>Go to My Dashboard ({currentUser.role})</span>
                  <i className="ph-bold ph-arrow-right"></i>
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    AuthService.logout('/');
                  }}
                  className="w-full py-2.5 text-center text-xs font-bold text-rose-600 bg-rose-50 rounded-xl"
                >
                  Sign Out of {currentUser.fullName}
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-brand-violet rounded-xl shadow-sm"
                >
                  <i className="ph-bold ph-sign-in"></i>
                  <span>Sign In to Institutional Portal</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
