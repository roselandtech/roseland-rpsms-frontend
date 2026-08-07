import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-950 text-gray-300 pt-20 pb-12 border-t border-gray-800 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-violet/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-yellow/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-16">
          
          {/* Brand & Vision (2 Columns on Large Screens) */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 text-white mb-6 group">
              <div className="w-13 h-13 bg-white rounded-2xl flex items-center justify-center p-1.5 shadow-xl shadow-brand-violet/20 group-hover:scale-105 transition-transform shrink-0 overflow-hidden">
                <img src="/logo.png" alt="The Roseland Preparatory School Crest" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-serif font-bold text-2xl tracking-tight block leading-tight">
                  The Roseland Prep
                </span>
                <span className="text-[10px] uppercase tracking-widest text-brand-yellow font-bold block">
                  Building a Foundation for Excellence
                </span>
              </div>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-sm">
              Founded under the vision of Mrs. Rose Boateng, The Roseland Preparatory School provides world-class, GES-accredited basic education from Crèche to Junior High School in the Ga West Municipality, Accra.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://www.tiktok.com/@theroselandprepschool"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center hover:bg-brand-violet hover:border-brand-violet transition-colors text-white text-lg shadow-sm"
                aria-label="TikTok"
              >
                <i className="ph-fill ph-tiktok-logo"></i>
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center hover:bg-brand-violet hover:border-brand-violet transition-colors text-white text-lg shadow-sm"
                aria-label="Facebook"
              >
                <i className="ph-fill ph-facebook-logo"></i>
              </a>
              <a
                href="https://wa.me/233200000000"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center hover:bg-[#25D366] hover:border-[#25D366] transition-colors text-white text-lg shadow-sm"
                aria-label="WhatsApp"
              >
                <i className="ph-fill ph-whatsapp-logo"></i>
              </a>
            </div>
          </div>

          {/* Column 2: Academics */}
          <div>
            <h4 className="text-white font-bold mb-5 uppercase tracking-wider text-xs">
              Academics
            </h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link href="/academics" className="hover:text-brand-yellow transition-colors">Curriculum Overview</Link></li>
              <li><Link href="/academics/early-years" className="hover:text-brand-yellow transition-colors">Crèche & Nursery</Link></li>
              <li><Link href="/academics/primary" className="hover:text-brand-yellow transition-colors">Primary School (P1–P6)</Link></li>
              <li><Link href="/academics/jhs" className="hover:text-brand-yellow transition-colors">Junior High (JHS 1–JHS 3)</Link></li>
              <li><Link href="/academics/calendar" className="hover:text-brand-yellow transition-colors">Academic Calendar</Link></li>
            </ul>
          </div>

          {/* Column 3: Admissions & About */}
          <div>
            <h4 className="text-white font-bold mb-5 uppercase tracking-wider text-xs">
              Admissions
            </h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link href="/admissions" className="hover:text-brand-yellow transition-colors">Enrollment Guide</Link></li>
              <li><Link href="/admissions/apply" className="hover:text-brand-yellow transition-colors font-semibold text-brand-yellow">Apply Online</Link></li>
              <li><Link href="/admissions/fees" className="hover:text-brand-yellow transition-colors">Fee Schedule</Link></li>
              <li><Link href="/admissions/tour" className="hover:text-brand-yellow transition-colors">Book a Campus Tour</Link></li>
              <li><Link href="/admissions/faq" className="hover:text-brand-yellow transition-colors">Admissions FAQs</Link></li>
              <li><Link href="/about/leadership" className="hover:text-brand-yellow transition-colors">Leadership & Faculty</Link></li>
            </ul>
          </div>

          {/* Column 4: Quick Portals & Contact */}
          <div>
            <h4 className="text-white font-bold mb-5 uppercase tracking-wider text-xs">
              Portals & Contact
            </h4>
            <ul className="space-y-3 text-sm text-gray-400 mb-6">
              <li><Link href="/parent" className="hover:text-white text-brand-violetLight font-medium flex items-center gap-1.5"><i className="ph ph-user"></i> Parent Portal</Link></li>
              <li><Link href="/teacher" className="hover:text-white flex items-center gap-1.5"><i className="ph ph-chalkboard-teacher"></i> Teacher Cockpit</Link></li>
              <li><Link href="/admin" className="hover:text-white flex items-center gap-1.5"><i className="ph ph-shield-check"></i> Staff Admin Hub</Link></li>
              <li><Link href="/cbt" className="hover:text-white flex items-center gap-1.5"><i className="ph ph-desktop"></i> Student CBT Portal</Link></li>
            </ul>

            <div className="pt-4 border-t border-gray-800/80 text-xs text-gray-400 space-y-2">
              <p className="flex items-center gap-2">
                <i className="ph-fill ph-map-pin text-brand-violet"></i> Ga West Municipality, Accra
              </p>
              <p className="flex items-center gap-2">
                <i className="ph-fill ph-envelope text-brand-violet"></i> info@roselandprep.edu.gh
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>&copy; {currentYear} The Roseland Preparatory School. All rights reserved. Registered with GES.</p>
          <div className="flex items-center gap-6">
            <Link href="/contact" className="hover:text-gray-300 transition-colors">Contact Us</Link>
            <Link href="/portals" className="hover:text-gray-300 transition-colors">Portals Gateway</Link>
            <Link href="/admissions/faq" className="hover:text-gray-300 transition-colors">FAQs</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
