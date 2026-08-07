import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export default function CampusPage() {
  const facilities = [
    {
      title: "State-of-the-Art ICT & CBT Center",
      desc: "Our climate-controlled computer laboratory is equipped with high-speed networked desktop workstations, dedicated fiber internet, and specialized educational software for coding, digital literacy, and Computer-Based Testing (CBT).",
      img: "https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&q=80&w=1000",
      features: ["1:1 Student-to-Workstation setup", "Secure CBT Exam Intranet", "Coding & Scratch Robotics Kits"]
    },
    {
      title: "Integrated Science Laboratory",
      desc: "Designed to bridge theoretical science and practical experimentation. Students conduct experiments in biology, physics, and basic chemistry using standard safety apparatus and lab reagents under teacher supervision.",
      img: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=1000",
      features: ["Microscopes & Optical Kits", "Safety Eye-wash & Fire Protocols", "Hands-on Practical Workbench"]
    },
    {
      title: "School Library & Learning Commons",
      desc: "A quiet sanctuary of learning boasting over 3,000 carefully curated titles spanning Ghanaian folklore, African literature, encyclopedias, international fiction, and BECE past questions archives.",
      img: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&q=80&w=1000",
      features: ["Early Readers Section", "Study Carrels for JHS Candidates", "Digital Catalog System"]
    },
    {
      title: "Early Years Sensory Playground",
      desc: "Specially engineered for our Crèche and Nursery pupils with shock-absorbing safety turf, age-appropriate slides, sensory climbing frames, and shaded outdoor learning spaces.",
      img: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&q=80&w=1000",
      features: ["Impact-absorbent padded flooring", "24/7 Caregiver supervision", "Gross motor skill stations"]
    },
    {
      title: "Campus Infirmary & Sick Bay",
      desc: "Staffed by a qualified full-time resident nurse equipped with first-aid essentials, emergency oxygen, observation beds, and direct rapid referral linkages with Ga West Municipal Hospital.",
      img: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1000",
      features: ["Full-time registered nurse", "Secure medical records tracking", "Comfortable observation cubicles"]
    },
    {
      title: "Hygienic Dining Hall & Canteen",
      desc: "A sanitary, spacious dining facility where hot, freshly prepared Ghanaian and continental meals are served daily under strict food safety and nutritional standards.",
      img: "https://images.unsplash.com/photo-1567521464027-f127ff144326?auto=format&fit=crop&q=80&w=1000",
      features: ["FDA compliant kitchen hygiene", "Balanced weekly meal plans", "Filter-purified drinking water"]
    }
  ];

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Campus & Infrastructure"
        title="Modern Spaces Built for Discovery and Safety"
        subtitle="Explore our purpose-built campus in the Ga West Municipality, featuring cutting-edge ICT labs, science rooms, and nurturing recreation grounds."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'About Us', href: '/about' },
          { label: 'Campus & Facilities' }
        ]}
        bgImage="https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=2000"
      />

      {/* 1. CAMPUS HIGHLIGHTS INTRO */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
            A Safe Learning Haven
          </span>
          <h2 className="text-3xl font-serif font-bold text-brand-textMain mb-4">
            Designed for Focus, Exploration & Play
          </h2>
          <p className="text-brand-textMuted text-base sm:text-lg leading-relaxed">
            Every square meter of The Roseland Preparatory School campus has been intentionally developed to safeguard child welfare, promote active engagement, and encourage hands-on discovery.
          </p>
        </div>
      </section>

      {/* 2. DETAILED FACILITY CATALOG */}
      <section className="pb-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {facilities.map((fac, idx) => {
            const isEven = idx % 2 === 0;
            return (
              <div
                key={fac.title}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center ${
                  isEven ? '' : 'lg:flex-row-reverse'
                }`}
              >
                <div className={`lg:col-span-6 ${isEven ? 'order-1' : 'order-1 lg:order-2'}`}>
                  <div className="rounded-3xl overflow-hidden shadow-xl border-4 border-white group">
                    <img
                      src={fac.img}
                      alt={fac.title}
                      className="w-full h-[360px] object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>

                <div className={`lg:col-span-6 ${isEven ? 'order-2' : 'order-2 lg:order-1'}`}>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-yellowLight bg-brand-violet px-3 py-1 rounded-full inline-block mb-3">
                    Facility #{idx + 1}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain mb-4">
                    {fac.title}
                  </h3>
                  <p className="text-brand-textMuted text-base leading-relaxed mb-6">
                    {fac.desc}
                  </p>
                  <div className="space-y-2.5 mb-6">
                    {fac.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2.5 text-sm text-brand-textMain font-medium">
                        <i className="ph-fill ph-check-circle text-green-500 text-lg shrink-0"></i>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. BOOK A PHYSICAL TOUR */}
      <section className="py-20 bg-brand-violet text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4">
            Experience Our Campus in Person
          </h2>
          <p className="text-lg text-brand-violetLight/90 mb-8 max-w-xl mx-auto">
            We welcome prospective parents for guided morning tours to observe live classes, meet teachers, and inspect our facilities.
          </p>
          <Link
            href="/admissions/tour"
            className="px-8 py-4 bg-brand-yellow text-yellow-950 font-bold rounded-full hover:bg-yellow-400 transition-all shadow-xl text-base inline-flex items-center gap-2"
          >
            <i className="ph-bold ph-calendar-plus"></i> Schedule Campus Tour
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
