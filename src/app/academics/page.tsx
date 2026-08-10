import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export default function AcademicsPage() {
  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Academic Excellence"
        title="Inspiring a Lifelong Passion for Knowledge and Mastery"
        subtitle="Explore our holistic educational curriculum combining national GES standards with cutting-edge computing, critical reasoning, and moral leadership."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Academics' }
        ]}
        bgImage="/IMG_2191.jpg"
      />

      {/* 1. CURRICULAR PHILOSOPHY */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
              Teaching & Learning Philosophy
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain">
              Nurturing Intellect, Creativity & Character
            </h2>
            <p className="text-brand-textMuted mt-4 text-base sm:text-lg leading-relaxed">
              At Roseland, we believe every child is born with natural curiosity. Our mission is to transform that curiosity into disciplined mastery through experiential learning, personalized coaching, and technology-assisted instruction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-brand-bg border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-brand-violetLight text-brand-violet flex items-center justify-center text-2xl mb-6">
                  <i className="ph-fill ph-book-open"></i>
                </div>
                <h3 className="text-xl font-bold text-brand-textMain mb-3">GES Standards-Based Curriculum</h3>
                <p className="text-sm text-brand-textMuted leading-relaxed">
                  Aligned with the National Council for Curriculum and Assessment (NaCCA) standards, emphasizing core competencies in literacy, arithmetic, civic values, and Ghanaian heritage.
                </p>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-brand-bg border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-brand-yellowLight text-yellow-800 flex items-center justify-center text-2xl mb-6">
                  <i className="ph-fill ph-cpu"></i>
                </div>
                <h3 className="text-xl font-bold text-brand-textMain mb-3">STEAM & Digital Computing</h3>
                <p className="text-sm text-brand-textMuted leading-relaxed">
                  Integrating coding foundations, hands-on science experiments, and Computer-Based Testing (CBT) into the weekly timetable to cultivate future-ready technical literacy.
                </p>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-brand-bg border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-green-50 text-green-700 flex items-center justify-center text-2xl mb-6">
                  <i className="ph-fill ph-chart-line-up"></i>
                </div>
                <h3 className="text-xl font-bold text-brand-textMain mb-3">Continuous Assessment (SBA)</h3>
                <p className="text-sm text-brand-textMuted leading-relaxed">
                  Rigorous termly tracking of class exercises, homework, and practical project work that feeds transparently into parent terminal reports and WAEC candidate profiles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE THREE ACADEMIC DIVISIONS */}
      <section className="py-20 bg-brand-bg border-y border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
              Academic Stages
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain">
              Explore Our Educational Divisions
            </h2>
          </div>

          <div className="space-y-12">
            {/* Division 1 */}
            <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-4 rounded-2xl overflow-hidden shadow-md">
                <img
                  src="/IMG_9446%20(1).jpg"
                  alt="Early Years Crèche"
                  className="w-full h-64 object-cover"
                />
              </div>
              <div className="lg:col-span-8">
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-900 bg-brand-yellow px-3 py-1 rounded-full inline-block mb-3">
                  Ages 6 Months – 5 Years
                </span>
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain mb-3">
                  Early Childhood: Crèche & Nursery
                </h3>
                <p className="text-sm sm:text-base text-brand-textMuted leading-relaxed mb-6">
                  Providing a gentle, secure, and stimulating foundation. Our early years program focuses on phonemic awareness, sensory play, basic counting, social courtesy, and gross motor coordination.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href="/academics/early-years"
                    className="px-6 py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark transition-colors text-sm flex items-center gap-2"
                  >
                    View Early Years Details <i className="ph-bold ph-arrow-right"></i>
                  </Link>
                  <Link
                    href="/admissions/apply"
                    className="px-6 py-3 bg-gray-50 border border-gray-200 text-brand-textMain font-bold rounded-xl hover:bg-gray-100 transition-colors text-sm"
                  >
                    Enroll for Crèche
                  </Link>
                </div>
              </div>
            </div>

            {/* Division 2 */}
            <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-4 rounded-2xl overflow-hidden shadow-md">
                <img
                  src="/IMG_9400.jpg"
                  alt="Primary School Class"
                  className="w-full h-64 object-cover"
                />
              </div>
              <div className="lg:col-span-8">
                <span className="text-xs font-bold uppercase tracking-wider text-white bg-brand-violet px-3 py-1 rounded-full inline-block mb-3">
                  Primary 1 to Primary 6
                </span>
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain mb-3">
                  Primary School: Foundations for Mastery
                </h3>
                <p className="text-sm sm:text-base text-brand-textMuted leading-relaxed mb-6">
                  Structured learning spanning Lower and Upper Primary. Pupils master critical reading comprehension, mathematical problem solving, integrated science, computing fundamentals, and French.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href="/academics/primary"
                    className="px-6 py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark transition-colors text-sm flex items-center gap-2"
                  >
                    View Primary Syllabus <i className="ph-bold ph-arrow-right"></i>
                  </Link>
                  <Link
                    href="/admissions/apply"
                    className="px-6 py-3 bg-gray-50 border border-gray-200 text-brand-textMain font-bold rounded-xl hover:bg-gray-100 transition-colors text-sm"
                  >
                    Enroll in Primary
                  </Link>
                </div>
              </div>
            </div>

            {/* Division 3 */}
            <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-4 rounded-2xl overflow-hidden shadow-md">
                <img
                  src="/IMG_3098.JPG.jpeg"
                  alt="Junior High School"
                  className="w-full h-64 object-cover"
                />
              </div>
              <div className="lg:col-span-8">
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-950 bg-brand-yellow px-3 py-1 rounded-full inline-block mb-3">
                  JHS 1 to JHS 3
                </span>
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain mb-3">
                  Junior High School: BECE Candidates
                </h3>
                <p className="text-sm sm:text-base text-brand-textMuted leading-relaxed mb-6">
                  An intensive pre-secondary phase focusing on deep conceptual subject specialization, science lab experiments, weekly CBT mock series, and mentorship for Senior High School placement.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href="/academics/jhs"
                    className="px-6 py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark transition-colors text-sm flex items-center gap-2"
                  >
                    View JHS Program <i className="ph-bold ph-arrow-right"></i>
                  </Link>
                  <Link
                    href="/academics/calendar"
                    className="px-6 py-3 bg-gray-50 border border-gray-200 text-brand-textMain font-bold rounded-xl hover:bg-gray-100 transition-colors text-sm"
                  >
                    Academic Calendar
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
