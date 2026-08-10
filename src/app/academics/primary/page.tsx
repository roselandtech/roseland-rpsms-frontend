import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export default function PrimaryPage() {
  const subjects = [
    { name: "English Language & Literacy", desc: "Reading comprehension, grammar mechanics, creative composition, phonics and public speaking.", icon: "ph-book-open" },
    { name: "Mathematics & Numeracy", desc: "Foundational arithmetic, fractions, geometry, word problem logic, and mental math drills.", icon: "ph-calculator" },
    { name: "Integrated Science", desc: "Hands-on discovery of living things, materials, earth and space, energy, and environmental science.", icon: "ph-flask" },
    { name: "Computing / ICT", desc: "Keyboarding, digital safety, graphical software, Scratch block programming, and basic office tools.", icon: "ph-desktop" },
    { name: "Creative Arts & Design", desc: "Drawing, visual arts, music, rhythm instruments, and local cultural craft design.", icon: "ph-palette" },
    { name: "Our World & Our People (OWOP)", desc: "Civic responsibilities, Ghanaian geography, history, environmental care, and community values.", icon: "ph-globe-hemisphere-west" },
    { name: "French Language", desc: "Conversational French vocabulary, greetings, basic syntax, and cultural appreciation.", icon: "ph-translate" },
    { name: "Ghanaian Language (Twi/Ga)", desc: "Indigenous language literacy, cultural proverbs, idioms, and local oral storytelling.", icon: "ph-chat-circle-text" },
    { name: "Religious & Moral Education (RME)", desc: "Moral character, ethical decision-making, respect for diversity, and religious heritage.", icon: "ph-hand-heart" },
    { name: "Physical & Health Education", desc: "Fitness games, athletics, team sports, hygiene practices, and healthy nutritional habits.", icon: "ph-football" }
  ];

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Primary School (P1–P6)"
        title="Building Inquisitive Minds and Academic Fluency"
        subtitle="Our primary curriculum combines standards-based GES subjects with technology integration, individual coaching, and creative arts."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Academics', href: '/academics' },
          { label: 'Primary School' }
        ]}
        bgImage="/IMG_9376.jpg"
      />

      {/* 1. OVERVIEW & PEDAGOGY */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
                Primary Education Architecture
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain mb-6 leading-tight">
                From Fundamental Skills to Confident Problem-Solving
              </h2>
              <p className="text-brand-textMuted leading-relaxed mb-4 text-base">
                Primary education at The Roseland Preparatory School spans two distinct developmental stages: Lower Primary (P1–P3) and Upper Primary (P4–P6).
              </p>
              <p className="text-brand-textMuted leading-relaxed mb-6 text-base">
                In Lower Primary, we emphasize reading fluency, quantitative confidence, and active curiosity. In Upper Primary, pupils transition to independent project research, analytical reasoning, and specialized computing.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-bg p-4 rounded-2xl border border-gray-100">
                  <span className="text-xs font-bold uppercase text-brand-violet">Lower Primary</span>
                  <h4 className="font-bold text-brand-textMain text-sm mt-0.5">Classes P1, P2 & P3</h4>
                  <p className="text-xs text-brand-textMuted mt-1">Class teacher model with specialist language and computing instructors.</p>
                </div>
                <div className="bg-brand-bg p-4 rounded-2xl border border-gray-100">
                  <span className="text-xs font-bold uppercase text-brand-violet">Upper Primary</span>
                  <h4 className="font-bold text-brand-textMain text-sm mt-0.5">Classes P4, P5 & P6</h4>
                  <p className="text-xs text-brand-textMuted mt-1">Subject-teacher rotation preparing pupils for Junior High School standards.</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
              <img
                src="/IMG_3031.JPG.jpeg"
                alt="Primary Pupils in Class"
                className="w-full h-[450px] object-cover"
              />
            </div>
          </div>

          {/* 2. SUBJECT OFFERINGS */}
          <div className="mb-16">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
                Primary Curriculum
              </span>
              <h3 className="text-3xl font-serif font-bold text-brand-textMain">
                Comprehensive Subject Breakdown
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((sub) => (
                <div key={sub.name} className="p-6 rounded-2xl bg-brand-bg border border-gray-100 hover:border-brand-violet/40 hover:shadow-lg transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-brand-violetLight text-brand-violet flex items-center justify-center text-xl mb-4 group-hover:bg-brand-violet group-hover:text-white transition-colors">
                    <i className={`ph-fill ${sub.icon}`}></i>
                  </div>
                  <h4 className="font-bold text-brand-textMain mb-2">{sub.name}</h4>
                  <p className="text-xs text-brand-textMuted leading-relaxed">{sub.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Continuous Assessment & Homework Strategy */}
          <div className="bg-brand-violet text-white p-8 sm:p-12 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-yellow">Academic Assessment</span>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold mt-1 mb-3">
                Continuous SBA & Terminal Reports
              </h3>
              <p className="text-sm text-brand-violetLight/90 max-w-2xl leading-relaxed">
                We implement a balanced 30% School-Based Assessment (Class tests, homework, and termly project) + 70% Terminal Examination formula. Results are published securely through our Parent Portal.
              </p>
            </div>
            <Link
              href="/admissions/apply"
              className="px-8 py-4 bg-brand-yellow text-yellow-950 font-bold rounded-xl hover:bg-yellow-400 transition-all text-sm shrink-0 shadow-lg"
            >
              Enroll into Primary
            </Link>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
